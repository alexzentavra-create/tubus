import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata: Metadata = {
  title: 'BusTrack AR — Seguí tu colectivo en tiempo real',
  description: 'Rastreá colectivos de Buenos Aires en tiempo real.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'BusTrack AR' },
}

export const viewport: Viewport = {
  themeColor: '#060810',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body style={{ background:'#060810' }}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'rgba(19,25,33,0.97)',
              color: '#E8ECF2',
              border: '1px solid rgba(184,200,224,0.15)',
              borderRadius: '12px',
              fontFamily: 'DM Sans, sans-serif',
              fontSize: '13px',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 1px 0 rgba(184,200,224,0.06) inset',
            },
            success: { iconTheme: { primary: '#22D3A0', secondary: '#060810' } },
            error:   { iconTheme: { primary: '#FF4D6A', secondary: '#060810' } },
          }}
        />
      </body>
    </html>
  )
}