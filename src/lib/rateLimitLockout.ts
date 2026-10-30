/**
 * Exponential Backoff Security Lockout Manager for BienParada
 *
 * Specification:
 * - 3 incorrect attempts -> 10 minutes lockout
 * - If incorrect again after lockout -> 20 minutes
 * - If incorrect again -> 40 minutes, 80 minutes, etc. (10 * 2^level)
 * - Correct attempt -> Resets attempts and lockout level to 0
 */

export interface LockoutRecord {
  failedAttempts: number
  lockoutLevel: number
  lockUntil: number | null
  lastAttemptAt: number
}

// In-memory store (works for both Node.js server and browser memory)
const memoryStore = new Map<string, LockoutRecord>()

// Helper to get persistent storage file path on server (Node/Serverless)
function getServerStoragePath(): string | null {
  if (typeof window !== 'undefined') return null
  try {
    const os = require('os')
    const path = require('path')
    return path.join(os.tmpdir(), 'bienparada_lockout_store.json')
  } catch {
    return null
  }
}

function loadRecord(key: string): LockoutRecord {
  const normalizedKey = key.trim().toLowerCase()

  // 1. Check in-memory store
  if (memoryStore.has(normalizedKey)) {
    return memoryStore.get(normalizedKey)!
  }

  // 2. Client-side localStorage
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(`bp_lockout_${normalizedKey}`)
      if (raw) {
        const parsed: LockoutRecord = JSON.parse(raw)
        // Reset if older than 24 hours
        if (Date.now() - parsed.lastAttemptAt < 24 * 60 * 60 * 1000) {
          memoryStore.set(normalizedKey, parsed)
          return parsed
        }
      }
    } catch {}
  } else {
    // 3. Server-side disk cache
    try {
      const fs = require('fs')
      const filePath = getServerStoragePath()
      if (filePath && fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf8')
        const all: Record<string, LockoutRecord> = JSON.parse(raw)
        if (all[normalizedKey]) {
          const rec = all[normalizedKey]
          if (Date.now() - rec.lastAttemptAt < 24 * 60 * 60 * 1000) {
            memoryStore.set(normalizedKey, rec)
            return rec
          }
        }
      }
    } catch {}
  }

  const defaultRecord: LockoutRecord = {
    failedAttempts: 0,
    lockoutLevel: 0,
    lockUntil: null,
    lastAttemptAt: Date.now()
  }
  memoryStore.set(normalizedKey, defaultRecord)
  return defaultRecord
}

function persistRecord(key: string, record: LockoutRecord): void {
  const normalizedKey = key.trim().toLowerCase()
  memoryStore.set(normalizedKey, record)

  // 1. Client-side
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`bp_lockout_${normalizedKey}`, JSON.stringify(record))
    } catch {}
  } else {
    // 2. Server-side
    try {
      const fs = require('fs')
      const filePath = getServerStoragePath()
      if (filePath) {
        let all: Record<string, LockoutRecord> = {}
        if (fs.existsSync(filePath)) {
          try {
            all = JSON.parse(fs.readFileSync(filePath, 'utf8'))
          } catch {}
        }
        all[normalizedKey] = record
        fs.writeFileSync(filePath, JSON.stringify(all), 'utf8')
      }
    } catch {}
  }
}

/**
 * Checks if a key (e.g. IP address or user email) is currently locked out.
 */
export function getLockoutStatus(key: string): {
  isLocked: boolean
  lockUntil: number | null
  remainingSeconds: number
  lockoutMinutes: number
  failedAttempts: number
  remainingAttempts: number
} {
  const record = loadRecord(key)
  const now = Date.now()

  if (record.lockUntil && record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000)
    const lockoutMinutes = Math.round((record.lockUntil - (record.lockUntil - remainingSeconds * 1000)) / 60000) || 10
    return {
      isLocked: true,
      lockUntil: record.lockUntil,
      remainingSeconds,
      lockoutMinutes,
      failedAttempts: record.failedAttempts,
      remainingAttempts: 0
    }
  }

  // Lock has expired or not set
  const remainingAttempts = Math.max(0, 3 - record.failedAttempts)
  return {
    isLocked: false,
    lockUntil: null,
    remainingSeconds: 0,
    lockoutMinutes: 0,
    failedAttempts: record.failedAttempts,
    remainingAttempts
  }
}

/**
 * Records a failed attempt for a given key.
 * Escalates lockouts exponentially: 10m, 20m, 40m, 80m...
 */
export function recordFailedAttempt(key: string): {
  isLocked: boolean
  failedAttempts: number
  remainingAttempts: number
  lockUntil: number | null
  lockoutMinutes: number
  remainingSeconds: number
  message: string
} {
  const record = loadRecord(key)
  const now = Date.now()

  // If already locked out, do not count further attempts
  if (record.lockUntil && record.lockUntil > now) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000)
    const minutesLeft = Math.ceil(remainingSeconds / 60)
    return {
      isLocked: true,
      failedAttempts: record.failedAttempts,
      remainingAttempts: 0,
      lockUntil: record.lockUntil,
      lockoutMinutes: minutesLeft,
      remainingSeconds,
      message: `Acceso bloqueado por demasiados intentos fallidos. Por favor espera ${minutesLeft} minuto(s) antes de intentar nuevamente.`
    }
  }

  // Increment failed attempts
  const nextAttempts = record.failedAttempts + 1
  record.failedAttempts = nextAttempts
  record.lastAttemptAt = now

  // Check if threshold (3 attempts) is reached
  if (nextAttempts >= 3) {
    // 10 minutes * 2^(lockoutLevel) -> 10, 20, 40, 80, 160...
    const lockoutMinutes = 10 * Math.pow(2, record.lockoutLevel)
    const lockDurationMs = lockoutMinutes * 60 * 1000
    record.lockUntil = now + lockDurationMs
    record.lockoutLevel += 1

    persistRecord(key, record)

    return {
      isLocked: true,
      failedAttempts: nextAttempts,
      remainingAttempts: 0,
      lockUntil: record.lockUntil,
      lockoutMinutes,
      remainingSeconds: lockoutMinutes * 60,
      message: `Has ingresado la clave incorrectamente ${nextAttempts} veces. Por seguridad, el acceso queda bloqueado por ${lockoutMinutes} minutos.`
    }
  }

  // Attempts < 3
  const remainingAttempts = 3 - nextAttempts
  persistRecord(key, record)

  return {
    isLocked: false,
    failedAttempts: nextAttempts,
    remainingAttempts,
    lockUntil: null,
    lockoutMinutes: 0,
    remainingSeconds: 0,
    message: `Código o contraseña incorrecta. Te quedan ${remainingAttempts} intento(s) antes del bloqueo de seguridad (10 minutos).`
  }
}

/**
 * Resets failed attempts and lockout level upon successful entry.
 */
export function recordSuccessfulAttempt(key: string): void {
  const normalizedKey = key.trim().toLowerCase()
  const cleanRecord: LockoutRecord = {
    failedAttempts: 0,
    lockoutLevel: 0,
    lockUntil: null,
    lastAttemptAt: Date.now()
  }
  persistRecord(normalizedKey, cleanRecord)
}

/**
 * Formats seconds into MM:SS for countdown displays.
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  const mStr = m < 10 ? `0${m}` : `${m}`
  const sStr = s < 10 ? `0${s}` : `${s}`
  return `${mStr}:${sStr}`
}
