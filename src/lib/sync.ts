/**
 * Global Cross-Device Sync Engine for BienParada / Tubus
 * Bridges localStorage with the global cloud sync API so users, admins,
 * drivers, ads, and reports are instantly shared across all devices and IPs.
 */

const SYNC_KEYS = [
  'bu_registered_users',
  'mock_users',
  'bu_super_admins',
  'registered_line_admins',
  'bu_created_lines',
  'active_line_admin_sessions',
  'mock_active_sessions',
  'bu_submitted_ads',
  'bu_ad_reports',
  'deleted_users',
  'blocked_users',
  'banned_users',
  'deleted_super_admins',
  'deleted_line_admins',
  'deleted_drivers',
  'deleted_ad_ids',
  'bu_super_admin_calendar_events',
  'bu_super_admin_calendar_categories',
  'bu_super_admin_notifications',
  'registered_drivers',
  'bu_active_super_admins',
  'bu_super_admin_incoming_call',
  'bu_super_admin_call_response'
]

let hasPushedInitialBatch = false
let lastSyncTimestamp = 0

export async function syncAllGlobalKeys(force = false): Promise<Record<string, any>> {
  if (typeof window === 'undefined') return {}

  // 1. Skip sync if the browser tab is hidden/backgrounded
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
    return {}
  }

  // 2. Throttle calls so multiple components don't spam the API simultaneously (min 15s between syncs unless forced)
  const now = Date.now()
  if (!force && now - lastSyncTimestamp < 15_000) {
    return {}
  }
  lastSyncTimestamp = now

  try {
    // 3. Gather and push local data ONLY on the first run to initialize server state
    if (!hasPushedInitialBatch) {
      const localBatch: Record<string, any> = {}
      SYNC_KEYS.forEach(key => {
        const raw = localStorage.getItem(key)
        if (raw) {
          try {
            localBatch[key] = JSON.parse(raw)
          } catch (e) {}
        }
      })

      if (Object.keys(localBatch).length > 0) {
        await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ batch: localBatch })
        }).catch(() => {})
      }
      hasPushedInitialBatch = true
    }

    // 4. Fetch canonical global state from server
    const res = await fetch('/api/sync?key=all', { cache: 'no-store' })
    if (!res.ok) return {}

    const json = await res.json()
    if (json.success && json.data) {
      const globalData = json.data
      Object.keys(globalData).forEach(key => {
        const val = globalData[key]
        if (val !== undefined && val !== null) {
          const serialized = typeof val === 'string' ? val : JSON.stringify(val)
          const current = localStorage.getItem(key)
          if (current !== serialized) {
            localStorage.setItem(key, serialized)
          }
        }
      })

      // Dispatch storage events so components update immediately
      window.dispatchEvent(new Event('storage'))
      window.dispatchEvent(new Event('global_sync_completed'))
      return globalData
    }
  } catch (e) {
    console.error('[GlobalSync] Sync error:', e)
  }

  return {}
}

export async function pushGlobalKey(key: string, data: any): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    // Save to local storage
    const serialized = typeof data === 'string' ? data : JSON.stringify(data)
    localStorage.setItem(key, serialized)

    // Push to global cloud sync API
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, data })
    }).catch(() => {})

    window.dispatchEvent(new Event('storage'))
  } catch (e) {
    console.error(`[GlobalSync] Push error for key ${key}:`, e)
  }
}

export function getUserStorageKey(baseKey: string, emailOverride?: string): string {
  if (typeof window === 'undefined') return baseKey
  const email = emailOverride || localStorage.getItem('tu_bus_profile_email') || localStorage.getItem('profile_email') || ''
  if (!email) return baseKey
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')
  return `${baseKey}_${cleanEmail}`
}

export function purgeUserDataForEmail(email: string): void {
  if (typeof window === 'undefined' || !email) return
  const cleanEmail = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_')

  const keysToRemove = [
    `bu_search_history_${cleanEmail}`,
    `user_points_${cleanEmail}`,
    `user_points_history_${cleanEmail}`,
    `bu_submitted_ads_${cleanEmail}`,
    `bu_user_ads_${cleanEmail}`,
    `bu_support_chat_${cleanEmail}`,
    `tu_bus_profile_email_${cleanEmail}`,
    `tu_bus_profile_name_${cleanEmail}`,
    `tu_bus_profile_phone_${cleanEmail}`,
    `tu_bus_profile_password_${cleanEmail}`
  ]

  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key)
    } catch (e) {}
  })

  // Clear legacy global history
  try {
    localStorage.removeItem('bu_search_history')
    localStorage.removeItem('tu_bus_search_history')
  } catch (e) {}
}

export const SESSION_MAX_AGE_MS = 40 * 60 * 60 * 1000 // 40 hours

export function stampActiveSession(user: any): any {
  if (!user || typeof user !== 'object') return user
  const now = Date.now()
  return {
    ...user,
    session_created_at: user.session_created_at || now,
    session_last_active: now
  }
}

export function clearActiveSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('active_user')
  localStorage.removeItem('active_super_admin')
  localStorage.removeItem('active_company_line')
  localStorage.removeItem('mock_driver_identity')
}

export function getValidActiveUser(): any | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('active_user')
  if (!raw) return null

  try {
    const user = JSON.parse(raw)
    const now = Date.now()
    const lastActive = Number(user.session_last_active || user.session_created_at || 0)

    // Expire if session is older than 40 hours or missing timestamp
    if (!lastActive || (now - lastActive > SESSION_MAX_AGE_MS)) {
      clearActiveSession()
      return null
    }

    // Refresh last active timestamp on ongoing usage
    user.session_last_active = now
    localStorage.setItem('active_user', JSON.stringify(user))
    return user
  } catch (e) {
    clearActiveSession()
    return null
  }
}

