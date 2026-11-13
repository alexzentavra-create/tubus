export type Admin = { id: string; name: string; email: string }
export type AdminMessage = { id: string; sender_id: string; sender_name: string; body: string; created_at: string }
export type AdminEvent = { id: string; title: string; detail: string; kind: string; created_at: string; read: boolean }
export type AdminCall = { id: string; caller_id: string; callee_id: string; mode: 'audio' | 'video'; status: string; created_at: string }
export type CollaborationState = { me: Admin; admins: Admin[]; messages: AdminMessage[]; presence: { user_id: string; last_seen: string }[]; events: AdminEvent[]; incoming: AdminCall | null }
export async function collaborationRequest<T = { ok: boolean }>(body?: object, query = ''): Promise<T> {
  const response = await fetch('/api/admin/collaboration' + query, {
    method: body ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'No se pudo conectar con el servidor.')
  return data
}
export function recordAdminActivity(detail: string, kind: 'activity' | 'calendar' = 'activity') {
  return collaborationRequest({ action: 'activity', kind, detail: detail.slice(0, 300) })
}
