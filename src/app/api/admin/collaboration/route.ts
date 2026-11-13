import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server'
import { z } from 'zod'
import { createHmac } from 'crypto'

export const dynamic = 'force-dynamic'
const uuid = z.string().uuid()
const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('heartbeat'), sessionId: uuid }),
  z.object({ action: z.literal('leave'), sessionId: uuid }),
  z.object({ action: z.literal('message'), id: uuid, text: z.string().trim().min(1).max(4000) }),
  z.object({ action: z.literal('read'), ids: z.array(uuid).max(100) }),
  z.object({ action: z.literal('read-all') }),
  z.object({ action: z.literal('activity'), kind: z.enum(['activity','calendar']).default('activity'), detail: z.string().trim().min(1).max(300) }),
  z.object({ action: z.literal('call'), id: uuid, target: uuid, mode: z.enum(['audio', 'video']) }),
  z.object({ action: z.literal('call-status'), id: uuid, status: z.enum(['accepted', 'rejected', 'ended']) }),
  z.object({ action: z.literal('signal'), id: uuid, callId: uuid, kind: z.enum(['offer','answer','ice','record-request','record-accept','record-decline','record-stop']), payload: z.record(z.unknown()) }),
])

class ApiError extends Error { constructor(public status: number, message: string) { super(message) } }
function checked<T extends { error: unknown }>(result: T): Omit<T, 'error'> {
  if (result.error) throw new ApiError(503, 'El servicio de colaboración no está disponible. Revisá la conexión y la migración de la base de datos.')
  return result
}
async function context() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw new ApiError(503, 'La colaboración necesita una conexión de Supabase configurada en el servidor.')
  const auth = createServerSupabase()
  const { data: { user }, error } = await auth.auth.getUser()
  if (error || !user) throw new ApiError(401, 'Iniciá sesión con tu cuenta de Super Admin para conectar la colaboración.')
  const db = createAdminSupabase()
  const { data: profile } = checked(await db.from('profiles').select('id,name,email,role').eq('id', user.id).single())
  const { data: member } = checked(await db.from('admin_collaborators').select('user_id').eq('user_id', user.id).maybeSingle())
  if (!member || profile?.role !== 'superadmin') throw new ApiError(403, 'Acceso exclusivo de Super Admin.')
  // Preserve Alejandro's existing login alias while using the original Auth account ID.
  if (profile.email === 'admin@admin.com') { profile.name = 'Alejandro'; profile.email = 'alejandro.finochietti@yahoo.com.ar' }
  return { db, profile }
}
function failure(error: unknown) {
  return NextResponse.json({ error: error instanceof ApiError ? error.message : 'No se pudo completar la operación.' }, { status: error instanceof ApiError ? error.status : 500, headers: { 'Cache-Control': 'no-store' } })
}
export async function GET(request: NextRequest) {
  try {
    const { db, profile } = await context()
    if (request.nextUrl.searchParams.has('ice')) {
      const iceServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }]
      const urls = process.env.TURN_URLS?.split(',').map(s => s.trim()).filter(Boolean)
      if (urls?.length && process.env.TURN_SHARED_SECRET) {
        const username = `${Math.floor(Date.now()/1000)+3600}:${profile.id}`
        iceServers.push({ urls, username, credential: createHmac('sha1', process.env.TURN_SHARED_SECRET).update(username).digest('base64') })
      } else if (urls?.length && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
        iceServers.push({ urls, username: process.env.TURN_USERNAME, credential: process.env.TURN_CREDENTIAL })
      }
      return NextResponse.json({ iceServers, relayConfigured: iceServers.length > 1 }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const callId = request.nextUrl.searchParams.get('call')
    if (callId) {
      if (!uuid.safeParse(callId).success) throw new ApiError(400, 'Llamada inválida.')
      const { data: call } = checked(await db.from('admin_calls').select('*').eq('id', callId).single())
      if (![call.caller_id, call.callee_id].includes(profile.id)) throw new ApiError(403, 'No sos participante de esta llamada.')
      const { data: signals } = checked(await db.from('admin_call_signals').select('*').eq('call_id', callId).neq('sender_id', profile.id).order('created_at').limit(1000))
      return NextResponse.json({ call, signals }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const before = request.nextUrl.searchParams.get('before')
    if (before && !z.string().datetime({ offset: true }).safeParse(before).success) throw new ApiError(400, 'Fecha inválida.')
    let query = db.from('admin_messages').select('*').order('created_at', { ascending: false }).limit(100)
    if (before) query = query.lt('created_at', before)
    const { data: messages } = checked(await query)
    if (before) return NextResponse.json({ messages }, { headers: { 'Cache-Control': 'no-store' } })
    const results = await Promise.all([
      db.from('admin_collaborators').select('profile:profiles!user_id(id,name,email)'),
      db.from('admin_presence').select('user_id,last_seen').gte('last_seen', new Date(Date.now() - 90000).toISOString()),
      db.from('admin_events').select('*').order('created_at', { ascending: false }).limit(100),
      db.from('admin_calls').select('*').eq('callee_id', profile.id).eq('status', 'ringing').gte('created_at', new Date(Date.now() - 60000).toISOString()).order('created_at', { ascending: false }).limit(1),
    ])
    const [admins, presence, events, calls] = results.map(r => checked(r).data || [])
    const directory = admins.map((entry: any) => entry.profile)
    directory.forEach((admin: any) => { if (admin.email === 'admin@admin.com') { admin.name = 'Alejandro'; admin.email = 'alejandro.finochietti@yahoo.com.ar' } })
    const ids = events.map((e: any) => e.id)
    const reads = ids.length ? checked(await db.from('admin_event_reads').select('event_id').eq('user_id', profile.id).in('event_id', ids)).data || [] : []
    const readIds = new Set(reads.map((r: any) => r.event_id))
    return NextResponse.json({ me: profile, admins: directory, presence, messages, events: events.map((e: any) => ({ ...e, read: readIds.has(e.id) })), incoming: calls[0] || null }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest) {
  try {
    const origin = request.headers.get('origin')
    if (origin && new URL(origin).host !== (request.headers.get('host') || request.nextUrl.host)) throw new ApiError(403, 'Origen no permitido.')
    const raw = await request.text()
    if (raw.length > 64000) throw new ApiError(413, 'Solicitud demasiado grande.')
    let parsed: unknown
    try { parsed = JSON.parse(raw) } catch { throw new ApiError(400, 'Solicitud inválida.') }
    const validation = input.safeParse(parsed)
    if (!validation.success) throw new ApiError(400, 'Datos inválidos.')
    const body = validation.data
    const { db, profile } = await context()
    const event = async (id: string, title: string, detail: string, kind: string) => checked(await db.from('admin_events').upsert({ id, actor_id: profile.id, title, detail, kind }, { onConflict: 'id', ignoreDuplicates: true }))
    if (body.action === 'heartbeat') {
      // Ownership is included in the conflict check; a session belonging to someone else cannot be claimed.
      const { data: existing } = checked(await db.from('admin_presence').select('user_id').eq('session_id', body.sessionId).maybeSingle())
      if (existing && existing.user_id !== profile.id) throw new ApiError(403, 'Sesión inválida.')
      checked(await db.from('admin_presence').upsert({ session_id: body.sessionId, user_id: profile.id, last_seen: new Date().toISOString() }))
    } else if (body.action === 'leave') {
      checked(await db.from('admin_presence').delete().eq('session_id', body.sessionId).eq('user_id', profile.id))
    } else if (body.action === 'message') {
      const { data: existing } = checked(await db.from('admin_messages').select('sender_id').eq('id', body.id).maybeSingle())
      if (existing && existing.sender_id !== profile.id) throw new ApiError(409, 'Identificador duplicado.')
      checked(await db.from('admin_messages').upsert({ id: body.id, sender_id: profile.id, sender_name: profile.name, body: body.text }, { onConflict: 'id', ignoreDuplicates: true }))
      await event(body.id, 'Mensaje de ' + profile.name, 'Nuevo mensaje en el chat de Super Admin.', 'chat')
    } else if (body.action === 'read') {
      if (body.ids.length) checked(await db.from('admin_event_reads').upsert(body.ids.map(event_id => ({ user_id: profile.id, event_id }))))
    } else if (body.action === 'read-all') {
      const { data: events } = checked(await db.from('admin_events').select('id'))
      for (let index = 0; index < (events || []).length; index += 500) {
        const rows = events!.slice(index, index + 500).map(({ id: event_id }) => ({ user_id: profile.id, event_id }))
        if (rows.length) checked(await db.from('admin_event_reads').upsert(rows))
      }
    } else if (body.action === 'activity') {
      await event(crypto.randomUUID(), 'Actividad de ' + profile.name, body.detail, body.kind)
    } else if (body.action === 'call') {
      const { data: target } = checked(await db.from('profiles').select('id').eq('id', body.target).eq('role', 'superadmin').maybeSingle())
      const { data: targetMember } = checked(await db.from('admin_collaborators').select('user_id').eq('user_id', body.target).maybeSingle())
      if (!target || !targetMember || target.id === profile.id) throw new ApiError(400, 'Seleccioná otro Super Admin.')
      checked(await db.from('admin_calls').insert({ id: body.id, caller_id: profile.id, callee_id: target.id, mode: body.mode }))
      await event(body.id, 'Llamada de ' + profile.name, body.mode === 'video' ? 'Videollamada entre Super Admins.' : 'Llamada de voz entre Super Admins.', 'call')
    } else {
      const id = body.action === 'signal' ? body.callId : body.id
      const { data: call } = checked(await db.from('admin_calls').select('*').eq('id', id).single())
      if (![call.caller_id, call.callee_id].includes(profile.id)) throw new ApiError(403, 'No sos participante de esta llamada.')
      if (body.action === 'call-status') {
        if (body.status !== 'ended' && profile.id !== call.callee_id) throw new ApiError(403, 'Sólo el destinatario puede responder.')
        if (body.status !== 'ended' && (call.status !== 'ringing' || Date.now() - Date.parse(call.created_at) > 60000)) throw new ApiError(409, 'La llamada ya terminó.')
        const { data: changed } = checked(await db.from('admin_calls').update({ status: body.status }).eq('id', id).eq('status', call.status).select('id'))
        if (!changed?.length) throw new ApiError(409, 'El estado de la llamada cambió.')
      } else {
        if (!['ringing','accepted'].includes(call.status)) throw new ApiError(409, 'La llamada ya terminó.')
        if ((body.kind === 'offer' && profile.id !== call.caller_id) || (body.kind === 'answer' && profile.id !== call.callee_id)) throw new ApiError(403, 'Señal inválida.')
        checked(await db.from('admin_call_signals').upsert({ id: body.id, call_id: id, sender_id: profile.id, kind: body.kind, payload: body.payload }, { onConflict: 'id', ignoreDuplicates: true }))
      }
    }
    return NextResponse.json({ ok: true })
  } catch (error) { return failure(error) }
}
