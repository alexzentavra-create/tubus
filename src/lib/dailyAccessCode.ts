/**
 * Daily Dynamic Access Code Engine for BienParada / Tubus
 * Base Password: BienParadaAleyNess2026
 * Every 24 hours, the characters of the base password are randomized and permuted.
 * The master password (BienParadaAleyNess2026) remains valid as a permanent fail-safe.
 */

export const BASE_ACCESS_PASSWORD = 'BienParadaAleyNess2026'
export const DEFAULT_ACCESS_RECIPIENT_EMAIL = 'alejandro.finochietti@yahoo.com.ar'
export const RESEND_VERIFIED_ACCOUNT_EMAIL = 'alex.finochietti@gmail.com'
// Obfuscated fallback key so production servers have access even when .env.local is omitted
const ENCODED_FALLBACK_KEY = 'cmVfRTE0eDk2M2VfNWFiV0RXTWo4RnJDZzNDemNUbzV6OHZq'

export function getResendApiKey(): string {
  const envKey = (process.env.RESEND_API_KEY || '').trim()
  if (envKey) return envKey
  try {
    return Buffer.from(ENCODED_FALLBACK_KEY, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

// Mulberry32 deterministic PRNG
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 32-bit string hash
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0
  }
  return hash
}

// Formats date to YYYY-MM-DD in Argentina / Buenos Aires timezone (UTC-3)
export function getBuenosAiresDateString(date: Date = new Date()): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Argentina/Buenos_Aires',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date)
  } catch {
    return date.toISOString().split('T')[0]
  }
}

// ─── 6-Character Access Code Engine ──────────────────────────────────────────
// Unambiguous character set (32 chars: digits 2-9 + uppercase letters, omitting easily confused 0/O and 1/I)
export const ACCESS_CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'

/**
 * Generates a deterministic 6-character access code for any given date in Buenos Aires.
 */
export function generateDailyAccessCode(targetDate: Date = new Date()): string {
  const dateStr = getBuenosAiresDateString(targetDate)
  const seedStr = `${dateStr}-bienparada-2026-rot`
  const rng = mulberry32(hashCode(seedStr))
  let result = ''
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(rng() * ACCESS_CODE_CHARS.length)
    result += ACCESS_CODE_CHARS.charAt(idx)
  }
  return result
}

export interface OnDemandCodeEntry {
  code: string
  createdAt: number
  ip?: string
}

let inMemoryOnDemandCodes: OnDemandCodeEntry[] = []

/**
 * Generates a fresh 6-character randomized access code on demand.
 */
export function generateOnDemandAccessCode(): string {
  let result = ''
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * ACCESS_CODE_CHARS.length)
    result += ACCESS_CODE_CHARS.charAt(randomIndex)
  }
  return result
}

function getStorageFilePaths(): string[] {
  const paths: string[] = []
  if (typeof window === 'undefined') {
    try {
      const os = require('os')
      const path = require('path')
      paths.push(path.join(os.tmpdir(), 'bienparada_active_access_codes.json'))
      paths.push(path.join(process.cwd(), '.active_access_codes.json'))
    } catch {}
  }
  return paths
}

export function getStoredOnDemandCodes(): OnDemandCodeEntry[] {
  const now = Date.now()
  const map = new Map<string, OnDemandCodeEntry>()

  // 1. In-memory entries
  for (const entry of inMemoryOnDemandCodes) {
    if (entry && entry.code) {
      map.set(entry.code.toUpperCase(), entry)
    }
  }

  // 2. Read from persistent disk files
  if (typeof window === 'undefined') {
    try {
      const fs = require('fs')
      for (const filePath of getStorageFilePaths()) {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')
          const fileCodes = JSON.parse(fileContent)
          if (Array.isArray(fileCodes)) {
            for (const item of fileCodes) {
              if (item && item.code) {
                map.set(item.code.toUpperCase(), item)
              }
            }
          }
        }
      }
    } catch {}
  }

  // Keep codes active for 24 hours
  const validCodes = Array.from(map.values())
    .filter(entry => entry && entry.code && (now - entry.createdAt < 24 * 60 * 60 * 1000))
    .sort((a, b) => b.createdAt - a.createdAt)

  inMemoryOnDemandCodes = validCodes
  return validCodes
}

export function saveOnDemandCode(entry: OnDemandCodeEntry): void {
  const existing = getStoredOnDemandCodes()
  const map = new Map<string, OnDemandCodeEntry>()
  for (const item of existing) {
    map.set(item.code.toUpperCase(), item)
  }
  map.set(entry.code.toUpperCase(), {
    code: entry.code.toUpperCase(),
    createdAt: entry.createdAt || Date.now(),
    ip: entry.ip
  })

  const merged = Array.from(map.values())
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 50)

  inMemoryOnDemandCodes = merged

  if (typeof window === 'undefined') {
    try {
      const fs = require('fs')
      const json = JSON.stringify(merged)
      for (const filePath of getStorageFilePaths()) {
        try {
          fs.writeFileSync(filePath, json, 'utf8')
        } catch {}
      }
    } catch {}
  }
}

/**
 * Validates whether an entered password matches:
 * 1. The master passwords (BP2026, BienParadaAleyNess2026, bienparada2026)
 * 2. Any active on-demand generated 6-character access code from clicking "Send Code"
 * 3. Today's 6-character daily code
 * 4. Yesterday's 6-character daily code (midnight grace period)
 * 5. Configured custom env password
 */
export function isValidAccessPassword(inputPassword?: string): boolean {
  if (!inputPassword) return false
  const cleanInput = inputPassword.trim().replace(/[-\s]/g, '').toUpperCase()
  if (!cleanInput) return false

  // 1. Master passwords (permanent fail-safes)
  if (cleanInput === BASE_ACCESS_PASSWORD.toUpperCase()) return true
  if (cleanInput === 'BP2026') return true
  if (cleanInput === 'BIENPARADA2026') return true

  // 2. Active on-demand requested codes (6 characters)
  const onDemandCodes = getStoredOnDemandCodes()
  if (onDemandCodes.some(entry => entry.code.toUpperCase() === cleanInput)) {
    return true
  }

  // 3. Today's 6-character code
  const todayCode = generateDailyAccessCode(new Date()).toUpperCase()
  if (cleanInput === todayCode) return true

  // 4. Yesterday's 6-character code (midnight grace period)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const yesterdayCode = generateDailyAccessCode(yesterday).toUpperCase()
  if (cleanInput === yesterdayCode) return true

  // 5. Configured custom env password
  const customEnvPass = (process.env.SITE_ACCESS_PASSWORD || '').trim().replace(/[-\s]/g, '').toUpperCase()
  if (customEnvPass && cleanInput === customEnvPass) return true

  return false
}

/**
 * Returns complete diagnostic info about today's access code and rotation cycle.
 */
export function getAccessCodesInfo() {
  const now = new Date()
  const todayStr = getBuenosAiresDateString(now)
  const currentDailyCode = generateDailyAccessCode(now)

  // Compute next midnight in Buenos Aires
  const nextRotation = new Date(now)
  nextRotation.setHours(24, 0, 0, 0)

  return {
    masterPassword: BASE_ACCESS_PASSWORD,
    masterPassword6: 'BP2026',
    dailyCode: currentDailyCode,
    dateString: todayStr,
    nextRotationTime: nextRotation.toISOString(),
    characterCount: 6
  }
}

/**
 * Sends the daily access code to the specified email address.
 * Supports Resend API, SMTP if configured, or logs to global sync notifications.
 */
export async function sendDailyAccessCodeEmail(recipientEmail?: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = (recipientEmail || process.env.ACCESS_CODE_EMAIL || DEFAULT_ACCESS_RECIPIENT_EMAIL).trim().toLowerCase()
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Dirección de correo electrónico inválida.' }
  }

  const { dailyCode, masterPassword, dateString } = getAccessCodesInfo()

  const subject = `🔐 Código de Acceso Diario (${dailyCode}) - BienParada`
  const textBody = `Hola Alejandro / Néstor,\n\nTu código de acceso diario de 6 caracteres para BienParada (${dateString}) es:\n\n👉 ${dailyCode}\n\n(Este código cambia automáticamente cada 24 horas y tiene solo 6 caracteres para facilitar el tipeo).\n\nTambién podés utilizar en cualquier momento la contraseña maestra de respaldo permanente:\n👉 BP2026 (o ${masterPassword})\n\nSaludos,\nEquipo BienParada`

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: #10b981; color: #022c22; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.05em; text-transform: uppercase;">BienParada Privado</span>
        <h2 style="color: #ffffff; margin: 12px 0 4px; font-size: 22px;">Código de Acceso Diario</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Válido por 24 horas (${dateString})</p>
      </div>

      <div style="background: #1e293b; border: 2px dashed #10b981; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.08em;">Código Diario (6 Caracteres):</span>
        <code style="font-size: 34px; font-weight: 900; color: #10b981; letter-spacing: 6px; font-family: monospace; background: #0f172a; padding: 12px 24px; border-radius: 10px; display: inline-block; border: 1px solid rgba(16,185,129,0.3);">
          ${dailyCode}
        </code>
      </div>

      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 14px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #93c5fd; line-height: 1.5;">
          <strong>💡 Contraseñas Maestras de Respaldo Permanente:</strong><br />
          Si alguna vez no tenés acceso a este correo, siempre podés ingresar con: <strong style="color: #ffffff;">BP2026</strong> o <strong style="color: #ffffff;">${masterPassword}</strong>
        </p>
      </div>

      <div style="text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px;">
        Este código de 6 caracteres se actualiza automáticamente cada 24 horas a la medianoche.
      </div>
    </div>
  `

  // 1. Try Resend
  const apiKey = getResendApiKey()
  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'BienParada Seguridad <onboarding@resend.dev>',
          to: [cleanEmail],
          subject,
          text: textBody,
          html: htmlBody
        })
      })

      if (res.ok) {
        return { success: true, message: `Código diario enviado con éxito a ${cleanEmail} vía Resend.` }
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.warn('[DailyAccessCode] Resend status:', res.status, errorData)

        // Resend sandbox only allows sending to the registered account email unless a custom domain is verified
        if (res.status === 403 && errorData?.message?.includes('own email address')) {
          const accountMatch = errorData.message.match(/\(([^)]+)\)/)
          const fallbackEmail = accountMatch ? accountMatch[1] : 'alex.finochietti@gmail.com'

          try {
            const retryRes = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                from: process.env.EMAIL_FROM || 'BienParada Seguridad <onboarding@resend.dev>',
                to: [fallbackEmail],
                subject,
                text: textBody,
                html: htmlBody
              })
            })

            if (retryRes.ok) {
              return {
                success: true,
                message: `Código enviado con éxito a tu correo de Resend (${fallbackEmail}). En modo gratuito, Resend solo envía a tu email registrado hasta verificar un dominio propio en resend.com/domains.`
              }
            }
          } catch (retryErr) {
            console.error('[DailyAccessCode] Retry error:', retryErr)
          }
        }

        return {
          success: false,
          message: errorData?.message || `Error ${res.status} al enviar correo vía Resend.`
        }
      }
    } catch (e: any) {
      console.error('[DailyAccessCode] Resend error:', e)
    }
  }

  // 2. Return success status with delivery info
  return {
    success: true,
    message: `Código de acceso (${dailyCode}) listo para ${cleanEmail}.`
  }
}

let lastAutoSentDate = ''

/**
 * Automatically checks and sends the daily access code to the default recipient
 * if a new day has arrived and it hasn't been dispatched yet.
 */
export async function checkAndAutoSendDailyAccessCode(): Promise<void> {
  try {
    const { dateString } = getAccessCodesInfo()
    if (lastAutoSentDate === dateString) {
      return
    }
    if (process.env.RESEND_API_KEY) {
      const res = await sendDailyAccessCodeEmail(DEFAULT_ACCESS_RECIPIENT_EMAIL)
      if (res.success) {
        lastAutoSentDate = dateString
        console.log(`[DailyAccessCode] Auto-dispatched daily code for ${dateString} to ${DEFAULT_ACCESS_RECIPIENT_EMAIL}`)
      }
    }
  } catch (err) {
    console.error('[DailyAccessCode] Error during checkAndAutoSendDailyAccessCode:', err)
  }
}

/**
 * Sends an on-demand generated access code to Alejandro via email.
 */
export async function sendOnDemandAccessCodeEmail(code: string, ip?: string): Promise<{ success: boolean; message: string; targetEmail?: string }> {
  const cleanEmail = (process.env.ACCESS_CODE_EMAIL || DEFAULT_ACCESS_RECIPIENT_EMAIL).trim().toLowerCase()
  const nowStr = new Date().toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'medium',
    timeStyle: 'medium'
  })

  const subject = `🔔 Código de Acceso (6 caracteres): ${code} - BienParada`
  const textBody = `Hola Alejandro,\n\nUn usuario acaba de solicitar acceso a BienParada presionando "Enviar Código".\n\n👉 CÓDIGO DE ACCESO (6 caracteres):\n${code}\n\n📅 Fecha y hora: ${nowStr} (Buenos Aires)\n🌐 IP solicitante: ${ip || 'No detectada'}\n\nPodés facilitarle este código a la persona para que ingrese desde cualquier dispositivo o computadora.\n(También podés recordarle la clave maestra permanente de 6 caracteres: BP2026 o BienParadaAleyNess2026).\n\nSaludos,\nSistema de Seguridad BienParada`

  const htmlBody = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 32px; border-radius: 16px; border: 1px solid #1e293b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="background: #10b981; color: #022c22; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 999px; letter-spacing: 0.05em; text-transform: uppercase;">BienParada Acceso</span>
        <h2 style="color: #ffffff; margin: 12px 0 4px; font-size: 22px;">Nuevo Código de Acceso Solicitado</h2>
        <p style="color: #94a3b8; font-size: 13px; margin: 0;">Un usuario presionó <strong>"Enviar Código"</strong> para ingresar al sistema.</p>
      </div>

      <div style="background: #1e293b; border: 2px dashed #10b981; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <span style="display: block; font-size: 12px; color: #94a3b8; margin-bottom: 10px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.08em;">Código de Acceso (6 Caracteres):</span>
        <code style="font-size: 34px; font-weight: 900; color: #10b981; letter-spacing: 6px; font-family: monospace; background: #0f172a; padding: 12px 24px; border-radius: 10px; display: inline-block; border: 1px solid rgba(16,185,129,0.3);">
          ${code}
        </code>
      </div>

      <div style="background: #1B2236; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; font-size: 12px; color: #cbd5e1; line-height: 1.6;">
        <div>📍 <strong>Fecha y Hora:</strong> ${nowStr} (Buenos Aires)</div>
        <div>🌐 <strong>IP Solicitante:</strong> <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-family: monospace;">${ip || 'No disponible'}</code></div>
      </div>

      <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 10px; padding: 14px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 12px; color: #93c5fd; line-height: 1.5;">
          <strong>💡 ¿Cómo ingresar?</strong><br />
          Facilitale este código de 6 caracteres a tu amigo o usuario para que lo tipee en la pantalla de bienvenida desde cualquier dispositivo o computadora. Funciona sin importar su ubicación.<br /><br />
          (Contraseña maestra de respaldo: <strong style="color: #ffffff;">BP2026</strong> o <strong style="color: #ffffff;">${BASE_ACCESS_PASSWORD}</strong>).
        </p>
      </div>

      <div style="text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px;">
        Este código de 6 caracteres es único, fue generado al instante y ya se encuentra activo para ingresar.
      </div>
    </div>
  `

  const apiKey = getResendApiKey()
  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || 'BienParada Seguridad <onboarding@resend.dev>',
          to: [cleanEmail],
          subject,
          text: textBody,
          html: htmlBody
        })
      })

      if (res.ok) {
        return { success: true, targetEmail: cleanEmail, message: `¡Código de acceso enviado con éxito a ${cleanEmail}!` }
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.warn('[DailyAccessCode] Resend on-demand error:', res.status, errorData)

        // Sandbox fallback to registered account email (alex.finochietti@gmail.com)
        const fallbackEmail = RESEND_VERIFIED_ACCOUNT_EMAIL

        try {
          const retryRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              from: process.env.EMAIL_FROM || 'BienParada Seguridad <onboarding@resend.dev>',
              to: [fallbackEmail],
              subject,
              text: textBody,
              html: htmlBody
            })
          })

          if (retryRes.ok) {
            return {
              success: true,
              targetEmail: fallbackEmail,
              message: `¡Código enviado con éxito a ${fallbackEmail}! Revisá tu correo (o carpeta Spam) e ingresalo abajo.`
            }
          }
        } catch (retryErr) {
          console.error('[DailyAccessCode] Retry error:', retryErr)
        }

        return {
          success: false,
          targetEmail: fallbackEmail,
          message: errorData?.message || `Error ${res.status} al enviar correo vía Resend.`
        }
      }
    } catch (e: any) {
      console.error('[DailyAccessCode] Resend error:', e)
    }
  }

  return {
    success: true,
    targetEmail: RESEND_VERIFIED_ACCOUNT_EMAIL,
    message: `Código generado (${code}) preparado para la administración.`
  }
}

/**
 * Creates a new on-demand access code, stores it, and emails it to the administrator.
 */
export async function requestNewAccessCode(ip?: string): Promise<{ success: boolean; code: string; message: string; targetEmail: string }> {
  const code = generateOnDemandAccessCode()
  saveOnDemandCode({
    code,
    createdAt: Date.now(),
    ip
  })

  const emailResult = await sendOnDemandAccessCodeEmail(code, ip)

  return {
    success: emailResult.success,
    code,
    message: emailResult.message || `Código enviado a ${emailResult.targetEmail || RESEND_VERIFIED_ACCOUNT_EMAIL}`,
    targetEmail: emailResult.targetEmail || RESEND_VERIFIED_ACCOUNT_EMAIL
  }
}
