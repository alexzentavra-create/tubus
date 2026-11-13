'use client'
import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff, Video, VideoOff, PhoneOff, Circle, Download } from 'lucide-react'
import { Admin, AdminCall, collaborationRequest } from '@/lib/admin-collaboration'
import { recordMeeting } from '@/lib/admin-meeting-recording'

type Signal = { id: string; kind: string; payload: any }
export default function SuperAdminMeeting({ call, me, admins, stream, onClose }: { call: AdminCall; me: Admin; admins: Admin[]; stream: MediaStream; onClose: () => void }) {
  const [status, setStatus] = useState('Conectando…')
  const [connected, setConnected] = useState(false)
  const [ended, setEnded] = useState(false)
  const [error, setError] = useState('')
  const [relayWarning, setRelayWarning] = useState(false)
  const [muted, setMuted] = useState(false)
  const [cameraOff, setCameraOff] = useState(call.mode === 'audio')
  const [recording, setRecording] = useState(false)
  const [savingRecording, setSavingRecording] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [consent, setConsent] = useState(false)
  const [downloads, setDownloads] = useState<{ url: string; filename: string }[]>([])
  const localVideo = useRef<HTMLVideoElement>(null)
  const remoteVideo = useRef<HTMLVideoElement>(null)
  const peer = useRef<RTCPeerConnection | null>(null)
  const remote = useRef<MediaStream | null>(null)
  const recorder = useRef<ReturnType<typeof recordMeeting> | null>(null)
  const finished = useRef(false)
  const ownedRequest = useRef(false)
  const urls = useRef<string[]>([])
  const generation = useRef(0)
  const caller = call.caller_id === me.id
  const other = admins.find(a => a.id === (caller ? call.callee_id : call.caller_id))
  const signal = async (kind: string, payload: object = {}) => {
    const body = { action: 'signal', id: crypto.randomUUID(), callId: call.id, kind, payload }
    try { await collaborationRequest(body) } catch { await collaborationRequest(body) }
  }
  const stopRecording = () => { if (recorder.current) setSavingRecording(true); recorder.current?.stop(); recorder.current = null; setRecording(false); setRequesting(false); ownedRequest.current = false }
  const startRecording = () => {
    if (recorder.current || !remote.current || finished.current) return
    recorder.current = recordMeeting(stream, remote.current, caller, blob => {
      const url = URL.createObjectURL(blob); urls.current.push(url)
      const filename = `BienParada-${call.id}-${Date.now()}.${blob.type.includes('mp4') ? 'mp4' : 'webm'}`
      setSavingRecording(false)
      setDownloads(prev => [...prev, { url, filename }])
      const a = document.createElement('a'); a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove()
    }, message => { setSavingRecording(false); setError(message) })
    setRecording(true); setRequesting(false)
  }
  const finish = () => {
    finished.current = true
    stopRecording(); peer.current?.close(); stream.getTracks().forEach(t => t.stop())
    remote.current?.getTracks().forEach(t => t.stop())
    setConnected(false); setEnded(true); setStatus('Llamada finalizada'); setConsent(false)
  }
  const hangup = async () => {
    finish()
    try { await collaborationRequest({ action: 'call-status', id: call.id, status: 'ended' }) }
    catch { setError('La conexión se cerró en este equipo. No se pudo avisar al otro participante.') }
  }
  useEffect(() => {
    const currentGeneration = ++generation.current
    let disposed = false, polling = false
    let pollTimer: ReturnType<typeof setInterval> | undefined
    const seen = new Set<string>()
    const candidates: RTCIceCandidateInit[] = []
    const pcStream = new MediaStream()
    remote.current = pcStream
    if (localVideo.current) localVideo.current.srcObject = stream
    const processSignal = async (s: Signal, pc: RTCPeerConnection) => {
      if (s.kind === 'offer' && !caller) {
        await pc.setRemoteDescription(s.payload)
        await pc.setLocalDescription(await pc.createAnswer())
        await signal('answer', pc.localDescription!.toJSON())
      } else if (s.kind === 'answer' && caller && !pc.currentRemoteDescription) await pc.setRemoteDescription(s.payload)
      else if (s.kind === 'ice') candidates.push(s.payload)
      else if (s.kind === 'record-request') setConsent(true)
      else if (s.kind === 'record-accept' && ownedRequest.current) startRecording()
      else if (s.kind === 'record-decline') { ownedRequest.current = false; setRequesting(false); setStatus('El otro participante no aceptó la grabación.') }
      else if (s.kind === 'record-stop') { stopRecording(); setConsent(false) }
      if (pc.remoteDescription) while(candidates.length) await pc.addIceCandidate(candidates.shift()!)
    }
    const initialize = async () => {
      try {
        const config = await collaborationRequest<{ iceServers: RTCIceServer[]; relayConfigured: boolean }>(undefined, '?ice=1')
        if (disposed) return
        setRelayWarning(!config.relayConfigured)
        const pc = new RTCPeerConnection({ iceServers: config.iceServers })
        peer.current = pc
        stream.getTracks().forEach(t => pc.addTrack(t, stream))
        pc.onicecandidate = e => { if(e.candidate) void signal('ice', e.candidate.toJSON()).catch(e => setError(e.message)) }
        pc.ontrack = e => {
          if (!pcStream.getTracks().some(t => t.id === e.track.id)) pcStream.addTrack(e.track)
          if (remoteVideo.current) { remoteVideo.current.srcObject = pcStream; void remoteVideo.current.play().catch(() => setError('Tocá “Activar sonido” para escuchar la llamada.')) }
        }
        pc.onconnectionstatechange = () => {
          if (finished.current) return
          setConnected(pc.connectionState === 'connected')
          if(pc.connectionState === 'connected') { setStatus('En llamada'); setError('') }
          else if(pc.connectionState === 'failed') { setError('No se pudo establecer la conexión de audio/video. Revisá la red y la configuración TURN.'); finish() }
          else if(pc.connectionState === 'disconnected') setStatus('Conexión interrumpida. Intentando recuperar…')
        }
        if (caller) {
          await pc.setLocalDescription(await pc.createOffer())
          await signal('offer', pc.localDescription!.toJSON())
          setStatus('Llamando a ' + (other?.name || 'Super Admin') + '…')
        }
        const poll = async () => {
          if (polling || disposed || finished.current) return
          polling = true
          try {
            const result = await collaborationRequest<{ call: AdminCall; signals: Signal[] }>(undefined, '?call=' + call.id)
            if (disposed || finished.current) return
            if (['ended','rejected'].includes(result.call.status)) { finish(); if(result.call.status === 'rejected') setStatus('Llamada rechazada'); return }
            if(result.call.status === 'ringing' && Date.now() - Date.parse(call.created_at) > 60000) { await hangup(); setStatus('Sin respuesta'); return }
            for (const s of result.signals) if(!seen.has(s.id)) { await processSignal(s, pc); seen.add(s.id) }
          } catch(e) { if(!disposed) setError((e as Error).message) }
          finally { polling = false }
        }
        if (disposed) { pc.close(); return }
        void poll(); pollTimer = setInterval(() => void poll(), 1500)
      } catch(e) { if(!disposed) { setError((e as Error).message); finish() } }
    }
    void initialize()
    const unload = () => navigator.sendBeacon('/api/admin/collaboration', new Blob([JSON.stringify({ action: 'call-status', id: call.id, status: 'ended' })], {type:'application/json'}))
    window.addEventListener('pagehide', unload)
    return () => {
      disposed = true; clearInterval(pollTimer); window.removeEventListener('pagehide', unload)
      peer.current?.close(); recorder.current?.stop()
      // Media ownership lives in this mounted call. Deferral lets React StrictMode re-run effects safely.
      setTimeout(() => { if(generation.current === currentGeneration) stream.getTracks().forEach(t => t.stop()) }, 0)
    }
    // One peer connection per call; callbacks read mutable media/recording refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id])
  useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)) }, [])
  return <div className="sa-overlay"><section className="sa-dialog sa-meeting" role="dialog" aria-modal="true" aria-label="Reunión de Super Admins">
    <header><div><small>EQUIPO / {call.mode === 'video' ? 'VIDEOLLAMADA' : 'VOZ'}</small><h2>{other?.name || 'Reunión'}</h2><p role="status">{status}{recording && ' · GRABANDO EN AMBOS EQUIPOS'}</p></div>{ended && <button className="sa-button" disabled={savingRecording} onClick={onClose}>{savingRecording ? 'Guardando grabación…' : 'Cerrar'}</button>}</header>
    {error && <div className="sa-error" role="alert">{error}<button className="sa-button" onClick={() => void remoteVideo.current?.play().then(() => setError('')).catch(() => {})}>Activar sonido</button></div>}
    {relayWarning && !ended && <p className="sa-hint">Conexión directa disponible. Algunas redes requieren un servidor TURN para completar la llamada.</p>}
    <div className="sa-video-grid"><div><video ref={localVideo} autoPlay playsInline muted /><span>{me.name} · Vos</span></div><div><video ref={remoteVideo} autoPlay playsInline /><span>{other?.name || 'Participante'}</span></div></div>
    {consent && !ended && <div className="sa-consent"><strong>El otro participante quiere grabar.</strong><p>Se guardarán el audio y el video de ambos. Cada equipo descargará su copia al terminar. Mantené la pestaña abierta hasta que finalice.</p><button className="sa-button sa-primary" onClick={async () => { try { startRecording(); await signal('record-accept'); setConsent(false) } catch(e) { stopRecording(); setError((e as Error).message) } }}>Aceptar grabación</button><button className="sa-button" onClick={async () => { try { await signal('record-decline'); setConsent(false) } catch(e) { setError((e as Error).message) } }}>No grabar</button></div>}
    {!ended && <footer className="sa-call-controls"><button className="sa-button" aria-label={muted ? 'Activar micrófono' : 'Silenciar micrófono'} onClick={() => { stream.getAudioTracks().forEach(t => t.enabled = muted); setMuted(!muted) }}>{muted ? <MicOff /> : <Mic />}</button>{call.mode === 'video' && <button className="sa-button" aria-label={cameraOff ? 'Activar cámara' : 'Apagar cámara'} onClick={() => { stream.getVideoTracks().forEach(t => t.enabled = cameraOff); setCameraOff(!cameraOff) }}>{cameraOff ? <VideoOff /> : <Video />}</button>}
      <button className="sa-button" disabled={!connected || requesting || consent} onClick={async () => {
        try {
          if(recording) { await signal('record-stop'); stopRecording() }
          else { if(!window.MediaRecorder) throw new Error('Tu navegador no admite grabación.'); ownedRequest.current = true; setRequesting(true); await signal('record-request') }
        } catch(e) { ownedRequest.current = false; setRequesting(false); setError((e as Error).message) }
      }}><Circle size={16} />{recording ? 'Detener grabación' : requesting ? 'Esperando consentimiento…' : 'Grabar'}</button>
      <button className="sa-button sa-danger" onClick={() => void hangup()}><PhoneOff size={18} />Finalizar</button>
    </footer>}
    {downloads.map(d => <a className="sa-download" key={d.url} href={d.url} download={d.filename}><Download size={18} />Descargar grabación nuevamente</a>)}
    <p className="sa-hint">La descarga automática depende de los permisos del navegador. También tendrás un enlace de descarga aquí. Las grabaciones se guardan en tu equipo, no en el servidor.</p>
  </section></div>
}
