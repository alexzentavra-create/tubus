export function normalizeSupabaseUrl(raw = process.env.NEXT_PUBLIC_SUPABASE_URL || ''): string {
  const fallback = 'https://placeholder.supabase.co'
  const candidate = raw.trim() || fallback
  try {
    const url = new URL(candidate)
    // Supabase clients expect the project origin. A REST endpoint suffix causes
    // Auth requests such as /auth/v1/token to be incorrectly nested under /rest/v1.
    url.pathname = url.pathname.replace(/\/(?:rest|auth)\/v1\/?$/i, '') || '/'
    url.search = ''
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return candidate.replace(/\/(?:rest|auth)\/v1\/?$/i, '').replace(/\/$/, '')
  }
}
