'use client'
import React, { useEffect, useState } from 'react'
import QRCode from 'qrcode'

interface QRCodeDisplayProps {
  token: string
  busUnit: string
  size?: number
  moduleColor?: string
  backgroundColor?: string
  showLabel?: boolean
}

export function QRCodeDisplay({
  token,
  busUnit,
  size = 180,
  moduleColor = '#000000',
  backgroundColor = '#FFFFFF',
  showLabel = true
}: QRCodeDisplayProps) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    let active = true
    QRCode.toDataURL(token || busUnit, {
      width: size,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: moduleColor, light: backgroundColor }
    }).then(value => { if (active) setSrc(value) }).catch(() => { if (active) setSrc('') })
    return () => { active = false }
  }, [token, busUnit, size, moduleColor, backgroundColor])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{
        padding: '16px',
        background: backgroundColor,
        borderRadius: '14px',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        display: 'inline-block'
      }}>
        {src ? <img src={src} width={size} height={size} alt={`QR de la unidad ${busUnit}`} style={{ display: 'block' }} /> : <div style={{ width: size, height: size }} />}
      </div>

      {showLabel && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans, sans-serif' }}>
            Unidad {busUnit}
          </div>
          {token && (
            <div style={{ color: '#8f94a5', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '2px', letterSpacing: '0.04em' }}>
              {token.length > 28 ? `${token.slice(0, 26)}...` : token}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
