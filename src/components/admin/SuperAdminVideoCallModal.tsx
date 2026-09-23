'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, Phone, ScreenShare,
  Copy, Check, MessageSquare, Sparkles, Volume2, ShieldCheck,
  AlertCircle, RefreshCw, Radio
} from 'lucide-react'
import toast from 'react-hot-toast'
import { pushGlobalKey } from '@/lib/sync'

interface TranscriptEntry {
  id: string
  speaker: string
  text: string
  time: string
}

interface SuperAdminVideoCallModalProps {
  onClose: () => void
  initialTarget?: string
  meetingTitle?: string
  currentAdminName?: string
  isIncoming?: boolean
}

export default function SuperAdminVideoCallModal({
  onClose,
  initialTarget,
  meetingTitle,
  currentAdminName,
  isIncoming = false
}: SuperAdminVideoCallModalProps) {
  // Registered Super Admins list
  const [registeredAdmins, setRegisteredAdmins] = useState<any[]>([])
  const [targetAdmin, setTargetAdmin] = useState<string>(initialTarget || '')
  const [activeCaller, setActiveCaller] = useState<string>(() => {
    if (currentAdminName) return currentAdminName
    if (typeof window !== 'undefined') {
      const storedId = sessionStorage.getItem('super_admin_identity') || localStorage.getItem('super_admin_identity')
      if (storedId) return storedId
    }
    return 'Alejandro'
  })

  // Call Lifecycle: 'select' | 'ringing' | 'connected' | 'offline' | 'ended'
  const [callStatus, setCallStatus] = useState<'select' | 'ringing' | 'connected' | 'offline' | 'ended'>(
    isIncoming ? 'connected' : initialTarget ? 'ringing' : 'select'
  )

  // Presence map of all active Super Admins
  const [onlinePresence, setOnlinePresence] = useState<Record<string, number>>({})
  const [ringingSecondsLeft, setRingingSecondsLeft] = useState(14)
  const currentCallIdRef = useRef<string>(`call-${Date.now()}`)

  // Media Controls & Permissions
  const [hasMediaPermission, setHasMediaPermission] = useState(false)
  const [mediaMode, setMediaMode] = useState<'video_and_audio' | 'audio_only' | 'none'>('none')
  const [isMicMuted, setIsMicMuted] = useState(false)
  const [isCamOff, setIsCamOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [callDuration, setCallDuration] = useState(0)
  const [audioVolume, setAudioVolume] = useState(0)

  // Transcription
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [interimText, setInterimText] = useState('')
  const [isSpeechSupported, setIsSpeechSupported] = useState(true)
  const [isCopied, setIsCopied] = useState(false)

  // Stream Refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const ringAudioCtxRef = useRef<AudioContext | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const animFrameRef = useRef<number | null>(null)

  // Load super admins and active presence
  useEffect(() => {
    const updateAdminsAndPresence = () => {
      try {
        const stored = localStorage.getItem('bu_super_admins')
        const deletedSuperAdmins = JSON.parse(localStorage.getItem('deleted_super_admins') || '["admin@admin.com"]').map((e: string) => e.toLowerCase().trim())
        let admins: any[] = []
        if (stored) admins = JSON.parse(stored)

        const defaults = [
          { id: 'sa-1', name: 'Alejandro', email: 'alejandro.finochietti@yahoo.com.ar', role: 'Super Admin Principal' },
          { id: 'sa-2', name: 'Nestor Admin', email: 'nestoradmin@nestoradmin.com', role: 'Super Admin Completo' }
        ]

        defaults.forEach(d => {
          if (deletedSuperAdmins.includes(d.email.toLowerCase())) return
          if (!admins.some(a => (a.email && a.email.toLowerCase() === d.email.toLowerCase()) || (a.name && a.name.toLowerCase() === d.name.toLowerCase()))) {
            admins.unshift(d)
          }
        })
        admins = admins.filter(a => !deletedSuperAdmins.includes((a.email || '').toLowerCase().trim()))
        setRegisteredAdmins(admins)

        // Read presence map
        const presence = JSON.parse(localStorage.getItem('bu_super_admin_presence_map') || '{}')
        setOnlinePresence(presence)
      } catch (e) {
        setRegisteredAdmins([
          { id: 'sa-1', name: 'Alejandro', role: 'Super Admin Principal' },
          { id: 'sa-2', name: 'Nestor Admin', role: 'Super Admin Completo' }
        ])
      }
    }

    updateAdminsAndPresence()
    const pInterval = setInterval(updateAdminsAndPresence, 3000)
    window.addEventListener('storage', updateAdminsAndPresence)
    return () => {
      clearInterval(pInterval)
      window.removeEventListener('storage', updateAdminsAndPresence)
    }
  }, [])

  // Call duration counter
  useEffect(() => {
    let interval: any = null
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1)
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [callStatus])

  // Ringtone generator using Web Audio API
  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      ringAudioCtxRef.current = ctx

      let osc = ctx.createOscillator()
      let gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(440, ctx.currentTime)
      gain.gain.setValueAtTime(0.08, ctx.currentTime)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()

      // Pulse ringtone pattern
      const interval = setInterval(() => {
        if (gain && ctx.state === 'running') {
          gain.gain.setValueAtTime(0.08, ctx.currentTime)
          setTimeout(() => {
            try { gain.gain.setValueAtTime(0, ctx.currentTime) } catch (e) {}
          }, 700)
        }
      }, 2000)

      return () => {
        clearInterval(interval)
        try { osc.stop(); ctx.close() } catch (e) {}
      }
    } catch (e) {}
  }

  // Ringing Phase Logic (Strict Real Response Checking)
  useEffect(() => {
    if (callStatus === 'ringing') {
      const stopTone = playRingtone()
      const callId = `call-${Date.now()}`
      currentCallIdRef.current = callId
      setRingingSecondsLeft(14)

      // Publish outgoing call signal so the other admin sees incoming call
      const callSignal = {
        id: callId,
        caller: activeCaller,
        target: targetAdmin,
        meetingTitle: meetingTitle || 'Videollamada Directa Super Admin',
        timestamp: Date.now(),
        status: 'ringing'
      }
      localStorage.setItem('bu_super_admin_incoming_call', JSON.stringify(callSignal))
      pushGlobalKey('bu_super_admin_incoming_call', callSignal)
      window.dispatchEvent(new Event('super_admin_call_signaled'))

      // Listen for acceptance or rejection from the target Super Admin
      const checkResponse = () => {
        try {
          const respRaw = localStorage.getItem('bu_super_admin_call_response')
          if (respRaw) {
            const resp = JSON.parse(respRaw)
            if (resp && resp.callId === callId) {
              if (resp.status === 'accepted') {
                if (stopTone) stopTone()
                setCallStatus('connected')
                toast.success(`¡${targetAdmin} atendió la videollamada!`)
                return true
              } else if (resp.status === 'rejected') {
                if (stopTone) stopTone()
                setCallStatus('offline')
                toast.error(`${targetAdmin} no puede atender en este momento.`)
                return true
              }
            }
          }
        } catch (e) {}
        return false
      }

      // Check every 1 second
      const pollInterval = setInterval(() => {
        const handled = checkResponse()
        if (handled) {
          clearInterval(pollInterval)
          return
        }

        setRingingSecondsLeft(prev => {
          if (prev <= 1) {
            // Target did not answer or is not online!
            clearInterval(pollInterval)
            if (stopTone) stopTone()
            setCallStatus('offline')
            return 0
          }
          return prev - 1
        })
      }, 1000)

      const handleResponseEvent = () => checkResponse()
      window.addEventListener('storage', handleResponseEvent)
      window.addEventListener('super_admin_call_responded', handleResponseEvent)

      return () => {
        clearInterval(pollInterval)
        if (stopTone) stopTone()
        window.removeEventListener('storage', handleResponseEvent)
        window.removeEventListener('super_admin_call_responded', handleResponseEvent)
      }
    }
  }, [callStatus, targetAdmin])

  // Request Real Camera & Microphone with Graceful Fallback
  const requestMediaAccess = async (forceAudioOnly = false) => {
    setCameraError(null)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Navegador incompatible con getUserMedia.')
      }

      let stream: MediaStream | null = null

      if (!forceAudioOnly) {
        try {
          // Attempt Video + Audio first
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 } },
            audio: true
          })
          setMediaMode('video_and_audio')
        } catch (camErr: any) {
          console.warn('Camera failed or not present, falling back to audio only:', camErr)
        }
      }

      // If video failed or audio only requested, attempt Audio Only
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false
        })
        setMediaMode('audio_only')
      }

      localStreamRef.current = stream
      setHasMediaPermission(true)
      setCameraError(null)

      if (localVideoRef.current && stream.getVideoTracks().length > 0) {
        localVideoRef.current.srcObject = stream
      }

      // Connect Audio Visualizer (Live VU Meter)
      setupAudioVisualizer(stream)

      // Start Real Speech-to-Text Transcription
      startLiveTranscription()
      toast.success(stream.getVideoTracks().length > 0 ? '🎙️ Cámara y Micrófono conectados' : '🎙️ Micrófono conectado (Modo Audio)')
    } catch (err: any) {
      console.warn('Webcam/Mic permission error:', err)
      setHasMediaPermission(false)
      setMediaMode('none')
      setCameraError('Permiso de micrófono/cámara denegado o no disponible en este dispositivo.')
    }
  }

  // Audio Analyzer for Real Voice Level Indicator
  const setupAudioVisualizer = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      audioContextRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 64
      source.connect(analyser)

      const bufferLength = analyser.frequencyBinCount
      const dataArray = new Uint8Array(bufferLength)

      const analyzeVolume = () => {
        if (analyser && ctx.state === 'running') {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
          }
          const avg = sum / bufferLength
          setAudioVolume(Math.min(100, Math.round((avg / 128) * 100)))
        }
        animFrameRef.current = requestAnimationFrame(analyzeVolume)
      }
      analyzeVolume()
    } catch (e) {}
  }

  // Camera & Microphone Stream Initialization on Call Connection
  useEffect(() => {
    if (callStatus === 'connected') {
      requestMediaAccess()
    }

    return () => {
      stopMedia()
      stopLiveTranscription()
    }
  }, [callStatus])

  const stopMedia = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = null
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close() } catch (e) {}
      audioContextRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
    }
  }

  // Toggle Microphone
  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks()
      audioTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsMicMuted(!isMicMuted)
    } else {
      setIsMicMuted(prev => !prev)
    }
  }

  // Toggle Camera
  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks()
      videoTracks.forEach(track => {
        track.enabled = !track.enabled
      })
      setIsCamOff(!isCamOff)
    } else {
      setIsCamOff(prev => !prev)
    }
  }

  // Screen Share Toggle
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true })
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = screenStream
          }
          screenStream.getVideoTracks()[0].onended = () => {
            if (localStreamRef.current && localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current
            }
            setIsScreenSharing(false)
          }
          setIsScreenSharing(true)
          toast.success('Pantalla compartida con los participantes')
        }
      } catch (err) {
        toast.error('No se pudo compartir pantalla')
      }
    } else {
      if (localStreamRef.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current
      }
      setIsScreenSharing(false)
    }
  }

  // Web Speech API Live Transcription
  const startLiveTranscription = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        setIsSpeechSupported(false)
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'es-AR'

      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptPiece = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            setTranscript(prev => [
              ...prev,
              {
                id: `tr-${Date.now()}-${Math.random()}`,
                speaker: activeCaller,
                text: transcriptPiece.trim(),
                time: timeStr
              }
            ])
            setInterimText('')
          } else {
            interim += transcriptPiece
          }
        }
        setInterimText(interim)
      }

      recognition.onerror = (e: any) => {
        console.warn('Speech recognition status/error:', e)
      }

      recognition.onend = () => {
        if (callStatus === 'connected' && recognitionRef.current) {
          try { recognition.start() } catch (err) {}
        }
      }

      recognition.start()
      recognitionRef.current = recognition
    } catch (e) {
      setIsSpeechSupported(false)
    }
  }

  const stopLiveTranscription = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch (e) {}
      recognitionRef.current = null
    }
  }

  // End Call
  const handleEndCall = () => {
    stopMedia()
    stopLiveTranscription()
    localStorage.removeItem('bu_super_admin_incoming_call')
    window.dispatchEvent(new Event('super_admin_call_ended'))
    setCallStatus('ended')
    toast.success('Videollamada finalizada')
  }

  // Copy Transcription
  const handleCopyTranscription = () => {
    if (transcript.length === 0) {
      toast('No hay transcripción disponible aún')
      return
    }
    const textFormatted = transcript.map(t => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n')
    navigator.clipboard.writeText(textFormatted)
    setIsCopied(true)
    toast.success('Transcripción copiada al portapapeles')
    setTimeout(() => setIsCopied(false), 2500)
  }

  // Save Transcription to Super Admin Internal Chat
  const handleSaveToChat = () => {
    if (transcript.length === 0) {
      toast('No hay transcripción para exportar')
      return
    }
    try {
      const stored = localStorage.getItem('mock_super_admin_internal_chat')
      const currentChat = stored ? JSON.parse(stored) : []
      const textFormatted = `📝 Minutas de Videollamada (${meetingTitle || 'Reunión Super Admin'}):\n` +
        transcript.map(t => `• [${t.time}] ${t.speaker}: ${t.text}`).join('\n')

      currentChat.push({
        id: `msg-transcript-${Date.now()}`,
        sender: 'Sistema (Videollamada)',
        text: textFormatted,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        role: 'Transcripción Oficial'
      })

      localStorage.setItem('mock_super_admin_internal_chat', JSON.stringify(currentChat))
      window.dispatchEvent(new Event('super_internal_chat_updated'))
      toast.success('Transcripción guardada en el Chat Interno')
    } catch (e) {
      toast.error('Error al guardar transcripción en el chat')
    }
  }

  // Format Duration string MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remSecs = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`
  }

  const isTargetAdminOnline = (adminName: string) => {
    const now = Date.now()
    return Object.entries(onlinePresence).some(([name, timestamp]) => {
      return name.toLowerCase().includes(adminName.toLowerCase()) && (now - timestamp < 40000)
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(6, 8, 16, 0.88)',
      backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#0e1122', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '20px',
        width: '100%', maxWidth: callStatus === 'connected' ? '1120px' : '520px',
        maxHeight: '94vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(16, 185, 129, 0.15)',
        transition: 'all 300ms ease'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '16px 22px', background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.15), rgba(59, 130, 246, 0.1))',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px', background: '#10B981',
              display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 15px rgba(16, 185, 129, 0.5)'
            }}>
              <Video size={20} color="#FFFFFF" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#FFFFFF' }}>
                  {meetingTitle || 'Videollamada entre Super Administradores'}
                </h3>
                {callStatus === 'connected' && (
                  <span style={{
                    background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10B981', color: '#10B981',
                    borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
                    EN VIVO • {formatDuration(callDuration)}
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#8f94a5' }}>
                Canal exclusivo para Super Administradores con transcripción en vivo
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              handleEndCall()
              onClose()
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.06)', border: 'none', borderRadius: '8px', color: '#8f94a5',
              width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', transition: 'all 150ms'
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FFFFFF')}
            onMouseLeave={e => (e.currentTarget.style.color = '#8f94a5')}
          >
            ✕
          </button>
        </div>

        {/* STEP 1: Select Admin to Call */}
        {callStatus === 'select' && (
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF', display: 'block', marginBottom: '8px' }}>
                Seleccioná al Super Administrador con quien deseas comunicarte:
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {registeredAdmins.map((admin: any) => {
                  const adminDisplayName = admin.name || admin.email
                  const isSelected = targetAdmin === adminDisplayName
                  const isOnline = isTargetAdminOnline(adminDisplayName)

                  return (
                    <div
                      key={admin.id || admin.email}
                      onClick={() => setTargetAdmin(adminDisplayName)}
                      style={{
                        padding: '12px 16px', borderRadius: '12px',
                        background: isSelected ? 'rgba(16, 185, 129, 0.15)' : '#15182a',
                        border: `1.5px solid ${isSelected ? '#10B981' : 'rgba(255, 255, 255, 0.08)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
                        transition: 'all 200ms'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ position: 'relative' }}>
                          <div style={{
                            width: '38px', height: '38px', borderRadius: '50%', background: '#3B82F6',
                            color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '13px'
                          }}>
                            {adminDisplayName.slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{
                            position: 'absolute', bottom: '0', right: '0', width: '10px', height: '10px', borderRadius: '50%',
                            background: isOnline ? '#10B981' : '#64748b', border: '2px solid #0e1122'
                          }} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>{adminDisplayName}</span>
                            <span style={{
                              fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '8px',
                              background: isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)',
                              color: isOnline ? '#10B981' : '#8F94A5'
                            }}>
                              {isOnline ? '🟢 En Línea' : '⚪ Desconectado'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#8F94A5' }}>{admin.role || 'Super Admin'}</div>
                        </div>
                      </div>
                      <div style={{
                        width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${isSelected ? '#10B981' : 'rgba(255,255,255,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', color: '#8F94A5', fontWeight: 600, fontSize: '13px', cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (!targetAdmin) {
                    toast.error('Por favor, selecciona un Super Administrador')
                    return
                  }
                  setCallStatus('ringing')
                }}
                disabled={!targetAdmin}
                style={{
                  flex: 2, padding: '12px', borderRadius: '10px',
                  background: targetAdmin ? 'linear-gradient(135deg, #10B981, #059669)' : '#1f2438',
                  border: 'none', color: '#FFFFFF', fontWeight: 800, fontSize: '13px', cursor: targetAdmin ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  boxShadow: targetAdmin ? '0 4px 16px rgba(16, 185, 129, 0.4)' : 'none'
                }}
              >
                <Phone size={16} /> Llamar a {targetAdmin || 'Super Admin'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Ringing Phase (Waits for Real Answer) */}
        {callStatus === 'ringing' && (
          <div style={{ padding: '44px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '94px', height: '94px', borderRadius: '50%', background: '#10B981',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '32px', fontWeight: 900,
                boxShadow: '0 0 40px rgba(16, 185, 129, 0.7)'
              }}>
                {targetAdmin.slice(0, 2).toUpperCase()}
              </div>
              <span style={{
                position: 'absolute', inset: '-12px', borderRadius: '50%', border: '2px solid rgba(16, 185, 129, 0.5)',
                animation: 'pulse 1.5s infinite'
              }} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#FFFFFF' }}>Llamando a {targetAdmin}...</h4>
              <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#10B981', fontWeight: 600 }}>
                Esperando que el Super Administrador atienda ({ringingSecondsLeft}s)
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#8F94A5' }}>
                La llamada solo conectará cuando {targetAdmin} presione &quot;Atender&quot; desde su consola.
              </p>
            </div>

            <button
              onClick={() => {
                handleEndCall()
                setCallStatus('select')
              }}
              style={{
                padding: '10px 24px', borderRadius: '10px', background: '#EF4444',
                border: 'none', color: '#FFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}
            >
              <PhoneOff size={16} /> Cancelar Llamada
            </button>
          </div>
        )}

        {/* STEP 2.5: Target is Offline or Did Not Answer */}
        {callStatus === 'offline' && (
          <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', textAlign: 'center' }}>
            <div style={{
              width: '74px', height: '74px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.12)',
              border: '2px solid #EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444'
            }}>
              <PhoneOff size={34} />
            </div>

            <div>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF' }}>
                {targetAdmin} no se encuentra en línea
              </h4>
              <p style={{ margin: '8px auto 0', fontSize: '13px', color: '#8F94A5', maxWidth: '380px', lineHeight: 1.5 }}>
                El Super Administrador no ha iniciado sesión o no se encuentra activo para atender la llamada en este momento.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
              <button
                onClick={() => setCallStatus('select')}
                style={{
                  padding: '10px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)', color: '#FFF', fontWeight: 700, fontSize: '13px', cursor: 'pointer'
                }}
              >
                Llamar a Otro Admin
              </button>
              <button
                onClick={() => setCallStatus('ringing')}
                style={{
                  padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                }}
              >
                <RefreshCw size={14} /> Reintentar
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Connected Video Call & Live Transcription */}
        {callStatus === 'connected' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', flex: 1, minHeight: '540px', overflow: 'hidden' }}>
            {/* Left: Video & Audio Area */}
            <div style={{ display: 'flex', flexDirection: 'column', background: '#070913', padding: '16px', gap: '12px' }}>
              
              {/* Permissions Prompt Banner if needed */}
              {!hasMediaPermission && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3B82F6', borderRadius: '12px',
                  padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={20} color="#60A5FA" />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>Habilitar Cámara y Micrófono</div>
                      <div style={{ fontSize: '11px', color: '#93C5FD' }}>
                        Permití el acceso para que el sistema escuche y transcriba la conversación en vivo.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => requestMediaAccess()}
                    style={{
                      padding: '8px 14px', borderRadius: '8px', background: '#10B981', border: 'none',
                      color: '#FFF', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Mic size={14} /> Conectar Audio / Video
                  </button>
                </div>
              )}

              {cameraError && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: '10px', fontSize: '12px', color: '#FCA5A5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>ℹ️ {cameraError}</span>
                  <button
                    onClick={() => requestMediaAccess(true)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#FFF', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Reintentar solo Micrófono
                  </button>
                </div>
              )}

              {/* Video Tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
                {/* Remote Participant Tile */}
                <div style={{
                  background: '#15182a', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: '84px', height: '84px', borderRadius: '50%', background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '28px', fontWeight: 900,
                    boxShadow: '0 0 25px rgba(59, 130, 246, 0.5)'
                  }}>
                    {targetAdmin.slice(0, 2).toUpperCase() || 'SA'}
                  </div>
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFF' }}>{targetAdmin}</div>
                    <div style={{ fontSize: '11px', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center', marginTop: '4px' }}>
                      <Volume2 size={12} /> Audio conectado • Participante Remoto
                    </div>
                  </div>

                  {/* Remote Badge */}
                  <div style={{
                    position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#FFF', fontWeight: 600
                  }}>
                    {targetAdmin}
                  </div>
                </div>

                {/* Local Camera / Audio Tile */}
                <div style={{
                  background: '#15182a', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden'
                }}>
                  {mediaMode === 'video_and_audio' && !isCamOff ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <div style={{
                        width: '76px', height: '76px', borderRadius: '50%', background: '#10B981',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF', fontSize: '26px', fontWeight: 800,
                        boxShadow: audioVolume > 15 ? `0 0 ${audioVolume / 2}px #10B981` : 'none',
                        transition: 'box-shadow 100ms ease'
                      }}>
                        {activeCaller.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '12px', color: hasMediaPermission ? '#10B981' : '#8F94A5', fontWeight: 700 }}>
                          {hasMediaPermission ? '🎙️ Micrófono Activo' : 'Cámara / Micrófono Desactivado'}
                        </span>
                      </div>
                      {/* Audio Level Indicator */}
                      {hasMediaPermission && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                          <span style={{ fontSize: '10px', color: '#8F94A5' }}>Voz:</span>
                          <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${audioVolume}%`, height: '100%', background: audioVolume > 60 ? '#EF4444' : '#10B981', transition: 'width 80ms ease' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Local Badge */}
                  <div style={{
                    position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', color: '#10B981', fontWeight: 700
                  }}>
                    Tú ({activeCaller}) {isMicMuted && '• 🔇 Muteado'}
                  </div>
                </div>
              </div>

              {/* In-Call Controls Dock */}
              <div style={{
                background: '#121527', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '14px',
                padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px'
              }}>
                <button
                  onClick={toggleMic}
                  style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: isMicMuted ? '#EF4444' : 'rgba(255,255,255,0.08)',
                    border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 150ms'
                  }}
                  title={isMicMuted ? 'Activar Micrófono' : 'Silenciar'}
                >
                  {isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>

                <button
                  onClick={toggleCam}
                  style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: isCamOff ? '#EF4444' : 'rgba(255,255,255,0.08)',
                    border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 150ms'
                  }}
                  title={isCamOff ? 'Encender Cámara' : 'Apagar Cámara'}
                >
                  {isCamOff ? <VideoOff size={18} /> : <Video size={18} />}
                </button>

                <button
                  onClick={toggleScreenShare}
                  style={{
                    width: '42px', height: '42px', borderRadius: '50%',
                    background: isScreenSharing ? '#3B82F6' : 'rgba(255,255,255,0.08)',
                    border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 150ms'
                  }}
                  title="Compartir Pantalla"
                >
                  <ScreenShare size={18} />
                </button>

                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />

                <button
                  onClick={handleEndCall}
                  style={{
                    padding: '0 20px', height: '42px', borderRadius: '21px', background: '#EF4444',
                    border: 'none', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <PhoneOff size={16} /> Finalizar
                </button>
              </div>
            </div>

            {/* Right: Live Audio Transcription Panel */}
            <div style={{
              background: '#0e1122', borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
              {/* Panel Header */}
              <div style={{
                padding: '14px 16px', background: 'rgba(16, 185, 129, 0.08)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} color="#10B981" />
                  <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFF' }}>Transcripción en Vivo</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={handleCopyTranscription}
                    style={{
                      background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px',
                      color: '#60A5FA', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                    title="Copiar Transcripción"
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {isCopied ? 'Copiado' : 'Copiar'}
                  </button>
                  <button
                    onClick={handleSaveToChat}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '6px',
                      color: '#10B981', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                    title="Exportar a Chat Interno"
                  >
                    <MessageSquare size={12} /> Guardar
                  </button>
                </div>
              </div>

              {/* Transcription Stream Body */}
              <div style={{ flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {transcript.length === 0 && !interimText ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: '#64748b' }}>
                    <Mic size={28} style={{ color: '#10B981', marginBottom: '8px', opacity: 0.8 }} />
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>Escuchando conversación...</div>
                    <div style={{ fontSize: '11px', color: '#8F94A5', marginTop: '4px', maxWidth: '240px', lineHeight: 1.4 }}>
                      Hablá al micrófono y tus palabras aparecerán transcritas en tiempo real palabra por palabra.
                    </div>
                  </div>
                ) : (
                  <>
                    {transcript.map((item) => (
                      <div key={item.id} style={{
                        background: '#15182a', border: '1px solid rgba(255, 255, 255, 0.05)',
                        borderRadius: '10px', padding: '8px 12px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#10B981' }}>{item.speaker}</span>
                          <span style={{ fontSize: '10px', color: '#64748b' }}>{item.time}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#FFFFFF', lineHeight: 1.4 }}>{item.text}</div>
                      </div>
                    ))}
                    {interimText && (
                      <div style={{
                        background: 'rgba(16, 185, 129, 0.08)', border: '1px dashed rgba(16, 185, 129, 0.4)',
                        borderRadius: '10px', padding: '8px 12px', color: '#86efac', fontSize: '12px', fontStyle: 'italic'
                      }}>
                        {interimText}...
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Status footer */}
              <div style={{ padding: '10px 14px', background: '#080a14', borderTop: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '10px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981' }} />
                Motor de Transcripción Continuo en Español (es-AR)
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Call Ended Summary */}
        {callStatus === 'ended' && (
          <div style={{ padding: '36px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#EF4444'
            }}>
              <PhoneOff size={28} />
            </div>

            <div style={{ textAlign: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>Videollamada Finalizada</h4>
              <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#8F94A5' }}>
                Duración: <strong>{formatDuration(callDuration)}</strong> • Participantes: <strong>{activeCaller}</strong> y <strong>{targetAdmin}</strong>
              </p>
            </div>

            {transcript.length > 0 && (
              <div style={{ width: '100%', background: '#15182a', borderRadius: '12px', padding: '14px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#10B981' }}>Minutas generadas ({transcript.length} intervenciones):</span>
                  <button
                    onClick={handleCopyTranscription}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.2)',
                      border: 'none', color: '#10B981', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Copiar Minutas
                  </button>
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '11px', color: '#CBD5E1', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {transcript.map((t, i) => (
                    <div key={i}>[{t.time}] <strong>{t.speaker}:</strong> {t.text}</div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              style={{
                padding: '12px 32px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)',
                border: 'none', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer'
              }}
            >
              Cerrar y Volver a la Consola
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
