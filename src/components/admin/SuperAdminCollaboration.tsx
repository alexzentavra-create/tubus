'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Bell, MessageSquare, Phone, Video, X, Send, CheckCheck, RefreshCw } from 'lucide-react'
import { AdminCall, AdminMessage, CollaborationState, collaborationRequest } from '@/lib/admin-collaboration'
import SuperAdminMeeting from './SuperAdminMeeting'
import toast from 'react-hot-toast'

const date = (value: string) => new Date(value).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
export default function SuperAdminCollaboration({ data, error, refresh, openCall, onCallOpened, initialTarget, onOpenCalendar }: {
  data: CollaborationState | null; error: string; refresh: () => Promise<void>; openCall?: boolean; onCallOpened?: () => void; initialTarget?: string; onOpenCalendar?: () => void
}) {
  const [panel, setPanel] = useState<'chat' | 'notifications' | 'call' | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [pending, setPending] = useState<{ id: string; text: string } | null>(null)
  const [older, setOlder] = useState<AdminMessage[]>([])
  const [more, setMore] = useState(true)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [call, setCall] = useState<AdminCall | null>(null)
  const [target, setTarget] = useState('')
  const [mode, setMode] = useState<'audio' | 'video'>('video')
  const [starting, setStarting] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const bottom = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const modal = useRef<HTMLElement>(null)
  const follow = useRef(true)
  useEffect(() => { const failed = () => toast.error('El cambio se guardó, pero no su notificación.'); window.addEventListener('admin_activity_save_failed', failed); return () => window.removeEventListener('admin_activity_save_failed', failed) }, [])
  const unread = data?.events.filter(e => !e.read).length || 0
  const messages = [...new Map([...older, ...(data?.messages || [])].map(m => [m.id, m])).values()].sort((a,b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
  useEffect(() => { if (openCall) { setPanel('call'); const person = data?.admins.find(a => a.name === initialTarget || a.email === initialTarget); if (person) setTarget(person.id); onCallOpened?.() } }, [openCall, onCallOpened, initialTarget, data?.admins])
  useEffect(() => {
    if (follow.current) bottom.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, panel])
  useEffect(() => {
    if (!panel) return
    const previous = document.activeElement as HTMLElement | null
    modal.current?.focus()
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !starting) setPanel(null)
      if (e.key === 'Tab') {
        const elements = modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,textarea,a[href]')
        if (!elements?.length) return
        const first = elements[0], last = elements[elements.length - 1]
        if (e.shiftKey && (document.activeElement === first || document.activeElement === modal.current)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', key)
    return () => { document.removeEventListener('keydown', key); previous?.focus() }
  }, [panel, starting])
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || sending) return
    const item = pending?.text === draft.trim() ? pending : { id: crypto.randomUUID(), text: draft.trim() }
    setPending(item); setSending(true); setSendError('')
    try {
      await collaborationRequest({ action: 'message', ...item })
      setDraft(''); setPending(null); follow.current = true
      await refresh()
    } catch (e) { setSendError((e as Error).message + ' Tu mensaje se conserva aquí para reintentar.') }
    finally { setSending(false) }
  }
  const start = async (incoming?: AdminCall) => {
    if (!data || starting || (!incoming && !target)) return
    setStarting(true)
    let media: MediaStream | undefined
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Este navegador necesita HTTPS y permisos de micrófono para llamar.')
      media = await navigator.mediaDevices.getUserMedia({ audio: true, video: (incoming?.mode || mode) === 'video' })
      const next = incoming || { id: crypto.randomUUID(), caller_id: data.me.id, callee_id: target, mode, status: 'ringing', created_at: new Date().toISOString() }
      if (incoming) await collaborationRequest({ action: 'call-status', id: next.id, status: 'accepted' })
      else await collaborationRequest({ action: 'call', id: next.id, target, mode })
      setStream(media); setCall(next); setPanel(null)
    } catch (e) { media?.getTracks().forEach(t => t.stop()); toast.error((e as Error).message) }
    finally { setStarting(false) }
  }
  const markRead = async (ids: string[]) => {
    try { await collaborationRequest({ action: 'read', ids }); await refresh() }
    catch (e) { toast.error((e as Error).message) }
  }
  return <div className="sa-collaboration">
    <span className={'sa-connection ' + (error ? 'is-offline' : data ? 'is-online' : '')} title={error || 'Sincronización entre dispositivos'} role="status">{error ? 'Sin conexión' : data ? 'Conectado' : 'Conectando…'}</span>
    <button className="sa-button" onClick={() => setPanel('chat')}><MessageSquare size={16} /><span>Chat interno</span></button>
    <button className="sa-button sa-accent" onClick={() => setPanel('call')}><Video size={16} /><span>Llamar</span></button>
    <button className="sa-button sa-bell" aria-label={`Notificaciones, ${unread} sin leer`} onClick={() => setPanel('notifications')}><Bell size={17} />{unread > 0 && <b>{unread > 99 ? '99+' : unread}</b>}</button>
    {data?.incoming && !call && !error && createPortal(<aside className="sa-incoming" role="alert">
      <Phone size={22} /><div><strong>{data.admins.find(a => a.id === data.incoming?.caller_id)?.name || 'Super Admin'}</strong><p>{data.incoming.mode === 'video' ? 'Videollamada entrante' : 'Llamada de voz entrante'}</p></div>
      <button className="sa-button sa-accent" disabled={starting} onClick={() => void start(data.incoming!)}>Atender</button>
      <button className="sa-button sa-danger" disabled={starting} onClick={async () => { try { await collaborationRequest({ action: 'call-status', id: data.incoming!.id, status: 'rejected' }); await refresh() } catch(e) { toast.error((e as Error).message) } }}>Rechazar</button>
    </aside>, document.body)}
    {panel && createPortal(<div className="sa-overlay"><section className="sa-dialog" role="dialog" aria-modal="true" aria-labelledby="sa-dialog-title" tabIndex={-1} ref={modal}>
      <header><div><small>BIEN PARADA / EQUIPO</small><h2 id="sa-dialog-title">{panel === 'chat' ? 'Chat entre Super Admins' : panel === 'call' ? 'Conectar con el equipo' : 'Centro de notificaciones'}</h2><p>{data ? `Conectado como ${data.me.name}` : 'La identidad se verifica con tu cuenta.'}</p></div><button className="sa-button" aria-label="Cerrar" disabled={starting} onClick={() => setPanel(null)}><X size={18} /></button></header>
      {error && <div className="sa-error" role="alert">{error}<button className="sa-button" onClick={() => void refresh()}><RefreshCw size={14} />Reintentar</button></div>}
      {panel === 'chat' && <>
        <div className="sa-messages" ref={box} role="log" aria-label="Mensajes del equipo" onScroll={() => { const el=box.current; if(el) follow.current=el.scrollHeight-el.scrollTop-el.clientHeight<100 }}>
          {more && messages.length >= 100 && <button className="sa-button" disabled={loadingOlder} onClick={async () => {
            setLoadingOlder(true)
            try { const result = await collaborationRequest<{ messages: AdminMessage[] }>(undefined, '?before=' + encodeURIComponent(messages[0].created_at)); setOlder(prev => [...result.messages, ...prev]); setMore(result.messages.length === 100) }
            catch(e) { toast.error((e as Error).message) } finally { setLoadingOlder(false) }
          }}>Cargar mensajes anteriores</button>}
          {!messages.length && <div className="sa-empty"><MessageSquare size={32} /><h3>Un espacio para coordinar</h3><p>Los mensajes confirmados se guardan para todo el equipo.</p></div>}
          {messages.map(m => <article className={'sa-message ' + (m.sender_id === data?.me.id ? 'is-mine' : '')} key={m.id}><div><strong>{m.sender_name}</strong><time dateTime={m.created_at}>{date(m.created_at)}</time></div><p>{m.body}</p><small><CheckCheck size={12} />Guardado</small></article>)}
          <div ref={bottom} />
        </div>
        {sendError && <div role="alert" className="sa-error">{sendError}</div>}
        <form className="sa-compose" onSubmit={send}><input aria-label="Mensaje" placeholder="Escribí un mensaje para el equipo…" maxLength={4000} value={draft} disabled={sending} onChange={e => setDraft(e.target.value)} /><button className="sa-button sa-primary" disabled={sending || !draft.trim() || !!error || !data}><Send size={16} />{sending ? 'Guardando…' : 'Enviar'}</button></form>
      </>}
      {panel === 'notifications' && <div className="sa-notifications"><div className="sa-row"><span>{unread} sin leer</span><button className="sa-button" disabled={!unread} onClick={() => void markRead(data!.events.filter(e => !e.read).map(e => e.id))}>Marcar leídas</button></div>
        {!data?.events.length && <div className="sa-empty"><Bell size={32} /><h3>Todo al día</h3><p>Acá aparecerán mensajes, llamadas y actividad del panel.</p></div>}
        {data?.events.map(e => <button key={e.id} className={'sa-notification ' + (!e.read ? 'is-unread' : '')} onClick={() => { void markRead([e.id]); if (e.kind === 'chat') setPanel('chat'); else if (e.kind === 'calendar') { setPanel(null); onOpenCalendar?.() } }}><strong>{e.title}</strong><p>{e.detail}</p><time>{date(e.created_at)}</time></button>)}
      </div>}
      {panel === 'call' && <div className="sa-call-setup"><label>Participante<select value={target} onChange={e => setTarget(e.target.value)}><option value="">Seleccioná un Super Admin</option>{data?.admins.filter(a => a.id !== data.me.id).map(a => <option key={a.id} value={a.id}>{a.name} — {data.presence.some(p => p.user_id === a.id) ? 'En línea' : 'Desconectado'}</option>)}</select></label><div className="sa-row"><button className={'sa-button ' + (mode === 'audio' ? 'sa-primary' : '')} aria-pressed={mode === 'audio'} onClick={() => setMode('audio')}><Phone size={18} />Sólo voz</button><button className={'sa-button ' + (mode === 'video' ? 'sa-primary' : '')} aria-pressed={mode === 'video'} onClick={() => setMode('video')}><Video size={18} />Videollamada</button></div><p>El navegador te pedirá acceso al micrófono{mode === 'video' ? ' y a la cámara' : ''}. El otro participante debe tener abierto su panel.</p><button className="sa-button sa-accent" disabled={!target || !data || !!error || starting} onClick={() => void start()}>{starting ? 'Conectando…' : 'Iniciar llamada'}</button></div>}
    </section></div>, document.body)}
    {call && stream && data && createPortal(<SuperAdminMeeting call={call} me={data.me} admins={data.admins} stream={stream} onClose={() => { setCall(null); setStream(null); void refresh() }} />, document.body)}
  </div>
}
