'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Bus, Smartphone, ExternalLink } from 'lucide-react'

function JoinContent() {
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref') || ''
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'desktop'>('desktop')
  const [redirectUrl, setRedirectUrl] = useState('')

  const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=ar.bienparada.tubus'
  const APP_STORE_URL = 'https://apps.apple.com/app/bienparada-colectivos/id6470000000'

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera || ''
    if (/android/i.test(userAgent)) {
      setDeviceType('android')
      setRedirectUrl(PLAY_STORE_URL)
      const timer = setTimeout(() => {
        window.location.href = PLAY_STORE_URL
      }, 1500)
      return () => clearTimeout(timer)
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
      setDeviceType('ios')
      setRedirectUrl(APP_STORE_URL)
      const timer = setTimeout(() => {
        window.location.href = APP_STORE_URL
      }, 1500)
      return () => clearTimeout(timer)
    } else {
      setDeviceType('desktop')
      setRedirectUrl('/')
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0B0F19 0%, #111827 100%)',
      color: '#FFFFFF',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        width: '64px',
        height: '64px',
        borderRadius: '16px',
        background: 'linear-gradient(135deg, #10B981, #059669)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '20px',
        boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)'
      }}>
        <Bus size={32} color="#FFFFFF" />
      </div>

      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
        BienParada — Colectivos en Vivo
      </h1>
      <p style={{ color: '#9CA3AF', fontSize: '14px', maxWidth: '380px', marginBottom: '24px' }}>
        Fuiste invitado a sumarte a BienParada con el código exclusivo:
      </p>

      {refCode && (
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px dashed #10B981',
          padding: '12px 24px',
          borderRadius: '12px',
          fontFamily: 'monospace',
          fontSize: '18px',
          fontWeight: 700,
          color: '#10B981',
          marginBottom: '24px',
          letterSpacing: '1px'
        }}>
          {refCode.toUpperCase()}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '320px' }}>
        <a
          href={PLAY_STORE_URL}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: '#10B981',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none'
          }}
        >
          <Smartphone size={16} /> Descargar en Google Play
        </a>

        <a
          href={APP_STORE_URL}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none'
          }}
        >
          <Smartphone size={16} /> Descargar en App Store
        </a>

        <a
          href={`/?ref=${refCode}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#9CA3AF',
            fontSize: '13px',
            textDecoration: 'none',
            marginTop: '8px'
          }}
        >
          Continuar en versión Web <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

export default function JoinPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0B0F19' }} />}>
      <JoinContent />
    </Suspense>
  )
}
