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
  'deleted_ad_ids'
]

export async function syncAllGlobalKeys(): Promise<Record<string, any>> {
  if (typeof window === 'undefined') return {}

  try {
    // 1. Gather local data for initial batch push if server is empty
    const localBatch: Record<string, any> = {}
    SYNC_KEYS.forEach(key => {
      const raw = localStorage.getItem(key)
      if (raw) {
        try {
          localBatch[key] = JSON.parse(raw)
        } catch (e) {}
      }
    })

    // 2. Push local state to server first so local items are merged
    if (Object.keys(localBatch).length > 0) {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch: localBatch })
      }).catch(() => {})
    }

    // 3. Fetch canonical global state from server
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
