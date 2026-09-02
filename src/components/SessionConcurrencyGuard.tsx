'use client'

import React, { useEffect, useState } from 'react'
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react'

interface Props {
  userEmail: string | null
  onLogout?: () => void
}

export default function SessionConcurrencyGuard({ userEmail, onLogout }: Props) {
  const [isTakenOver, setIsTakenOver] = useState(false)
  const [showSwitchPrompt, setShowSwitchPrompt] = useState(false)
  const [myTabToken, setMyTabToken] = useState<string>('')

  useEffect(() => {
    if (!userEmail || typeof window === 'undefined') return

    const normalizedEmail = userEmail.toLowerCase().trim()
    const storageKey = `active_session_guard_${normalizedEmail}`

    // Get or create unique session token for this browser tab
    let tabToken = sessionStorage.getItem('tab_session_token')
    if (!tabToken) {
      tabToken = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      sessionStorage.setItem('tab_session_token', tabToken)
    }
    setMyTabToken(tabToken)

    // Check if another tab has an active heartbeat
    const rawActive = localStorage.getItem(storageKey)
    if (rawActive) {
      try {
        const parsed = JSON.parse(rawActive)
        if (parsed.token && parsed.token !== tabToken && Date.now() - parsed.lastPing < 15000) {
          // Another tab is actively open!
          setShowSwitchPrompt(true)
        } else {
          // Stale or same tab -> Claim it
          claimSession(normalizedEmail, tabToken)
        }
      } catch (e) {
        claimSession(normalizedEmail, tabToken)
      }
    } else {
      claimSession(normalizedEmail, tabToken)
    }

    // Ping heartbeat every 4 seconds
    const pingInterval = setInterval(() => {
      const activeRaw = localStorage.getItem(storageKey)
      if (activeRaw) {
        try {
          const parsed = JSON.parse(activeRaw)
          if (parsed.token && parsed.token !== tabToken) {
            // Another tab claimed the session!
            setIsTakenOver(true)
            return
          }
        } catch (e) {}
      }
      localStorage.setItem(storageKey, JSON.stringify({ token: tabToken, lastPing: Date.now() }))
    }, 4000)

    // Listen to storage events from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed.token && parsed.token !== tabToken) {
            setIsTakenOver(true)
          } else if (parsed.token === tabToken) {
            setIsTakenOver(false)
            setShowSwitchPrompt(false)
          }
        } catch (err) {}
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => {
      clearInterval(pingInterval)
      window.removeEventListener('storage', handleStorage)
    }
  }, [userEmail])

  const claimSession = (email: string, token: string) => {
    const storageKey = `active_session_guard_${email}`
    localStorage.setItem(storageKey, JSON.stringify({ token, lastPing: Date.now() }))
    setIsTakenOver(false)
    setShowSwitchPrompt(false)
  }

  const handleTakeOver = () => {
    if (!userEmail) return
    const normalizedEmail = userEmail.toLowerCase().trim()
    claimSession(normalizedEmail, myTabToken)
  }

  const handleExit = () => {
    if (onLogout) {
      onLogout()
    } else {
      window.location.href = '/login'
    }
  }

  if (!showSwitchPrompt && !isTakenOver) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 999999,
      background: 'rgba(5, 8, 16, 0.88)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        background: '#121527',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '20px',
        padding: '28px',
        maxWidth: '440px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8)'
      }}>
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'rgba(239, 68, 68, 0.15)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          color: '#EF4444'
        }}>
          <ShieldAlert size={28} />
        </div>

        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 8px' }}>
          {isTakenOver ? 'Sesión transferida' : 'Sesión activa detectada'}
        </h2>

        <p style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5', margin: '0 0 24px' }}>
          {isTakenOver
            ? 'Tu cuenta ha sido abierta en otra ventana o dispositivo. Solo se permite una sesión activa al mismo tiempo por seguridad.'
            : 'Esta cuenta ya se encuentra abierta en otra ventana o dispositivo. ¿Deseas transferir la sesión a esta ventana?'}
        </p>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleTakeOver}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: '#3B82F6',
              border: 'none',
              borderRadius: '10px',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <RefreshCw size={15} /> {isTakenOver ? 'Reanudar aquí' : 'Sí, transferir aquí'}
          </button>

          <button
            type="button"
            onClick={handleExit}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              color: '#94A3B8',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <LogOut size={15} /> Salir
          </button>
        </div>
      </div>
    </div>
  )
}
