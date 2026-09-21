'use client'

import { useState, useEffect } from 'react'
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react'

import { pushGlobalKey } from '@/lib/sync'

interface IncomingCallData {
  id?: string
  caller: string
  target: string
  meetingTitle?: string
  timestamp: number
}

interface SuperAdminCallNotificationProps {
  currentAdminName: string
  onAcceptCall: (caller: string, meetingTitle?: string) => void
}

export default function SuperAdminCallNotification({
  currentAdminName,
  onAcceptCall
}: SuperAdminCallNotificationProps) {
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null)

  const checkIncomingCall = () => {
    try {
      const stored = localStorage.getItem('bu_super_admin_incoming_call')
      if (stored) {
        const data: IncomingCallData = JSON.parse(stored)
        // Strict matching: only show if target specifically matches this active super admin
        const targetClean = (data.target || '').trim().toLowerCase()
        const myNameClean = (currentAdminName || '').trim().toLowerCase()
        const isTargetMatch = targetClean === 'all' || (targetClean && (targetClean.includes(myNameClean) || myNameClean.includes(targetClean)))
        const isNotSelf = data.caller && !data.caller.toLowerCase().includes(myNameClean) && !myNameClean.includes(data.caller.toLowerCase())
        const isFresh = Date.now() - data.timestamp < 35000

        if (isTargetMatch && isNotSelf && isFresh) {
          setIncomingCall(data)
          return
        }
      }
      setIncomingCall(null)
    } catch (e) {
      setIncomingCall(null)
    }
  }

  useEffect(() => {
    checkIncomingCall()
    const interval = setInterval(checkIncomingCall, 2000)
    window.addEventListener('storage', checkIncomingCall)
    window.addEventListener('super_admin_call_signaled', checkIncomingCall)
    window.addEventListener('super_admin_call_ended', () => setIncomingCall(null))

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', checkIncomingCall)
      window.removeEventListener('super_admin_call_signaled', checkIncomingCall)
      window.removeEventListener('super_admin_call_ended', () => setIncomingCall(null))
    }
  }, [currentAdminName])

  if (!incomingCall) return null

  const handleReject = async () => {
    if (incomingCall) {
      const resp = {
        callId: incomingCall.id || 'call-latest',
        status: 'rejected',
        responder: currentAdminName,
        timestamp: Date.now()
      }
      localStorage.setItem('bu_super_admin_call_response', JSON.stringify(resp))
      await pushGlobalKey('bu_super_admin_call_response', resp)
    }
    localStorage.removeItem('bu_super_admin_incoming_call')
    window.dispatchEvent(new Event('super_admin_call_ended'))
    setIncomingCall(null)
  }

  const handleAccept = async () => {
    const caller = incomingCall.caller
    const title = incomingCall.meetingTitle
    const resp = {
      callId: incomingCall.id || 'call-latest',
      status: 'accepted',
      responder: currentAdminName,
      timestamp: Date.now()
    }
    localStorage.setItem('bu_super_admin_call_response', JSON.stringify(resp))
    await pushGlobalKey('bu_super_admin_call_response', resp)
    localStorage.removeItem('bu_super_admin_incoming_call')
    window.dispatchEvent(new Event('super_admin_call_ended'))
    setIncomingCall(null)
    onAcceptCall(caller, title)
  }

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999999,
      background: '#0e1122', border: '2px solid #10B981', borderRadius: '18px',
      padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: '0 15px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(16, 185, 129, 0.4)',
      animation: 'slideUp 0.3s ease-out'
    }}>
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '50px', height: '50px', borderRadius: '50%', background: '#10B981',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFF',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.6)'
        }}>
          <Video size={24} />
        </div>
        <span style={{
          position: 'absolute', inset: '-6px', borderRadius: '50%', border: '2px solid #10B981',
          animation: 'ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite'
        }} />
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10B981', fontWeight: 800 }}>
          <Volume2 size={12} /> LLAMADA ENTRANTE DE SUPER ADMIN
        </div>
        <div style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
          {incomingCall.caller}
        </div>
        {incomingCall.meetingTitle && (
          <div style={{ fontSize: '12px', color: '#8F94A5', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {incomingCall.meetingTitle}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px' }}>
        <button
          onClick={handleReject}
          style={{
            width: '40px', height: '40px', borderRadius: '50%', background: '#EF4444',
            border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)', transition: 'all 150ms'
          }}
          title="Rechazar"
        >
          <PhoneOff size={18} />
        </button>

        <button
          onClick={handleAccept}
          style={{
            padding: '0 16px', height: '40px', borderRadius: '20px', background: 'linear-gradient(135deg, #10B981, #059669)',
            border: 'none', color: '#FFF', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.5)', transition: 'all 150ms'
          }}
        >
          <Phone size={16} /> Atender
        </button>
      </div>
    </div>
  )
}
