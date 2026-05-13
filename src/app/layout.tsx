import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import './globals.css'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'BusTrack AR — Seguí tu colectivo en tiempo real',
  description: 'Rastreá colectivos de Buenos Aires en tiempo real. Sabé cuándo llega tu línea, dónde está el chofer y cuánto tenés que esperar.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BusTrack AR',
  },
  openGraph: {
    title: 'BusTrack AR',
    description: 'Seguí tu colectivo en tiempo real',
    type: 'website',
    locale: 'es_AR',
  },
}

export const viewport: Viewport = {
  themeColor: '#1A2327',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className="dark">
      <head>
        {/* Mapbox CSS */}
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.4.0/mapbox-gl.css" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} bg-night-950 text-white antialiased`}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#263238',
              color: '#fff',
              border: '1px solid rgba(255,152,0,0.3)',
              borderRadius: '12px',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#fff' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
          }}
        />
      </body>
    </html>
  )
}