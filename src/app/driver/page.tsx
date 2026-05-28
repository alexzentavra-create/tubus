'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Navigation, Wifi, WifiOff, Users, Power, AlertCircle, Gauge, Clock, QrCode, CheckCircle, LogOut, Zap, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { MOCK_LINES, getMockRoutePathForLine, getMockStopsForLine } from '@/lib/mockData'
import toast from 'react-hot-toast'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'

interface ActiveSession {
  sessionId: string
  driverId: string
  driverName: string
  busUnit: string
  lineId: string
  lineName: string
  lineNumber: string
  companyName: string
}

// ─── Mock QR tokens (one per line) ───────────────────────────────────────────
const MOCK_QR_TOKENS: Record<string, { busUnit: string; lineIdx: number }> = {
  'DEMO-QR-L12-001': { busUnit: '001', lineIdx: 0 },
  'DEMO-QR-L24-002': { busUnit: '002', lineIdx: 1 },
  'DEMO-QR-L37-003': { busUnit: '003', lineIdx: 2 },
  'DEMO-QR-L55-004': { busUnit: '004', lineIdx: 3 },
  'DEMO-QR-L71-005': { busUnit: '005', lineIdx: 4 },
  'DEMO-QR-L88-006': { busUnit: '006', lineIdx: 5 },
  'DEMO-QR-L102-07': { busUnit: '007', lineIdx: 6 },
  'DEMO-QR-L115-08': { busUnit: '008', lineIdx: 7 },
}

const CARTODB_DARK = {
  version: 8,
  sources: {
    "cartodb-dark-tiles": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CartoDB"
    }
  },
  layers: [
    {
      id: "cartodb-dark-layer",
      type: "raster",
      source: "cartodb-dark-tiles",
      minzoom: 0,
      maxzoom: 20
    }
  ]
}

// ─── Premium Bus Marker ────────────────────────────────────────────────────────
function PremiumBusMarker({ status, lineColor }: { status: string; lineColor: string }) {
  const isMoving = status === 'moving'
  const color = isMoving ? lineColor : status === 'at_stop' ? '#F0B429' : '#FF4D6A'
  return (
    <div style={{ position: 'relative', width: '36px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {isMoving && (
        <div style={{
          position: 'absolute', bottom: '36px', left: '50%', transform: 'translateX(-50%)',
          width: '24px', height: '22px',
          background: 'linear-gradient(0deg, rgba(254, 240, 138, 0.25) 0%, rgba(254, 240, 138, 0) 100%)',
          clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)', pointerEvents: 'none',
        }} />
      )}
      <div style={{
        position: 'absolute', top: '32px', left: '50%', transform: 'translateX(-50%)',
        width: '14px', height: '10px',
        background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0) 100%)',
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)', pointerEvents: 'none',
      }} />
      <div style={{
        width: '10px', height: '26px', borderRadius: '2.5px', background: color,
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: `0 0 10px ${color}bf, 0 1.5px 3px rgba(0,0,0,0.5)`,
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between',
        padding: '2px 0', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 0.8px', boxSizing: 'border-box', position: 'absolute', top: '0.8px' }}>
          <div style={{ width: '1.8px', height: '1.8px', borderRadius: '50%', background: '#FEF08A', boxShadow: '0 0 3px #FEF08A' }} />
          <div style={{ width: '1.8px', height: '1.8px', borderRadius: '50%', background: '#FEF08A', boxShadow: '0 0 3px #FEF08A' }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', marginTop: '2.5px', width: '6px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '100%', height: '2.5px', background: 'rgba(6,8,16,0.85)', borderRadius: '0.5px' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DriverPage() {
  const supabase = createClient()
  const watchIdRef  = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPosRef  = useRef<GeolocationPosition | null>(null)
  const startRef    = useRef<Date | null>(null)
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [driverName, setDriverName]     = useState('')
  const [driverId,   setDriverId]       = useState('')
  const [session,    setSession]        = useState<ActiveSession | null>(null)
  const [isOnline,   setIsOnline]       = useState(false)
  const [passengers, setPassengers]     = useState(0)
  const [pos,        setPos]            = useState<{ lat: number; lng: number; speed: number; heading: number } | null>(null)
  const [gpsError,   setGpsError]       = useState<string | null>(null)
  const [duration,   setDuration]       = useState(0)
  const [showScanner,setShowScanner]    = useState(false)
  const [qrToken,    setQrToken]        = useState('')
  const [scanning,   setScanning]       = useState(false)

  // Map Controls State
  const [autoCenter, setAutoCenter]     = useState(true)
  const [gpsGuideActive, setGpsGuideActive] = useState(true)
  const [viewState, setViewState]       = useState({
    longitude: -58.4173,
    latitude: -34.6037,
    zoom: 13.5,
    pitch: 20,
    bearing: 0
  })

  // Auth + resume any active session
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const isMock = url.includes('placeholder.supabase.co')

    if (isMock) {
      setDriverName('Néstor García')
      setDriverId('mock-driver-nestor')
      return
    }

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role,name').eq('id', user.id).single()
      if (!profile || profile.role !== 'driver') { window.location.href = '/'; return }
      setDriverName(profile.name || 'Chofer')
      setDriverId(user.id)

      const { data: s } = await supabase
        .from('driver_sessions')
        .select('*, bus_companies!company_id(company_name), bus_lines!line_id(line_number,name)')
        .eq('driver_id', user.id)
        .eq('is_active', true)
        .single()

      if (s) {
        const sess: ActiveSession = {
          sessionId: s.id, driverId: user.id,
          driverName: profile.name,
          busUnit: s.bus_unit, lineId: s.line_id,
          lineName:    (s.bus_lines as any)?.name || '—',
          lineNumber:  (s.bus_lines as any)?.line_number || '—',
          companyName: (s.bus_companies as any)?.company_name || '—',
        }
        setSession(sess)
        startGPS(user.id, s.id, s.line_id, s.bus_unit, 0)
        setIsOnline(true)
      }
    })
  }, [])

  // Duration timer
  useEffect(() => {
    if (!isOnline) return
    startRef.current = new Date()
    const t = setInterval(() => {
      if (startRef.current) setDuration(Math.floor((Date.now() - startRef.current.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [isOnline])

  const startGPS = useCallback((uid: string, sid: string, lid: string, unit: string, initPass: number) => {
    if (!navigator.geolocation) { toast.error('GPS no disponible'); return }
    watchIdRef.current = navigator.geolocation.watchPosition(
      p => {
        lastPosRef.current = p
        const spd = p.coords.speed ? Math.round(p.coords.speed * 3.6) : 0
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude, speed: spd, heading: p.coords.heading || 0 })
        setGpsError(null)
      },
      err => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )
    intervalRef.current = setInterval(async () => {
      const p = lastPosRef.current; if (!p) return
      const spd = p.coords.speed ? Math.round(p.coords.speed * 3.6) : 0
      await supabase.from('bus_positions').upsert({
        driver_id: uid, line_id: lid, bus_unit: unit,
        latitude: p.coords.latitude, longitude: p.coords.longitude,
        heading: Math.round(p.coords.heading || 0), speed_kmh: spd,
        status: spd > 2 ? 'moving' : 'stopped',
        passenger_count: initPass,
        timestamp: new Date().toISOString(),
      }, { onConflict: 'driver_id' })
      await supabase.from('driver_sessions').update({ total_passengers: initPass }).eq('id', sid)
    }, 5000)
  }, [])

  useEffect(() => {
    if (!session || !isOnline || !lastPosRef.current) return
    const p = lastPosRef.current
    const spd = p.coords.speed ? Math.round(p.coords.speed * 3.6) : 0
    supabase.from('bus_positions').upsert({
      driver_id: session.driverId, line_id: session.lineId, bus_unit: session.busUnit,
      latitude: p.coords.latitude, longitude: p.coords.longitude,
      heading: Math.round(p.coords.heading || 0), speed_kmh: spd,
      status: spd > 2 ? 'moving' : 'stopped', passenger_count: passengers,
      timestamp: new Date().toISOString(),
    }, { onConflict: 'driver_id' })
  }, [passengers])

  // ─── Simulation movement loop ───────────────────────────────────────────────
  useEffect(() => {
    if (!session || !isOnline || !session.sessionId.startsWith('mock-')) {
      if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null }
      return
    }

    const mockLine = MOCK_LINES.find(l => l.id === session.lineId)
    if (!mockLine) return

    const path = getMockRoutePathForLine(mockLine)
    if (!path || path.length === 0) return

    let currentIndex = 0
    let pauseCounter = 0
    let currentSpeed = 0

    // Set initial position
    setPos({ lat: path[0].lat, lng: path[0].lng, speed: 0, heading: 0 })

    simIntervalRef.current = setInterval(() => {
      const stops = getMockStopsForLine(mockLine)
      const currentPoint = path[currentIndex]

      // Detect if we are close to an official stop to simulate loading passengers
      const isAtStop = stops.some(stop => {
        const dy = stop.latitude - currentPoint.lat
        const dx = stop.longitude - currentPoint.lng
        return Math.hypot(dx, dy) < 0.0003
      })

      if (isAtStop && pauseCounter === 0 && Math.random() < 0.35) {
        pauseCounter = 6 // pause shift for 3 seconds (6 ticks)
        currentSpeed = 0
        setPassengers(p => Math.max(2, Math.min(55, p + Math.floor(Math.random() * 9) - 4)))
      }

      if (pauseCounter > 0) {
        pauseCounter--
      } else {
        currentIndex = (currentIndex + 1) % path.length
        const nextPoint = path[(currentIndex + 1) % path.length]
        const dy = nextPoint.lat - currentPoint.lat
        const dx = nextPoint.lng - currentPoint.lng
        const angle = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360

        // Fluctuate speed
        currentSpeed = 30 + Math.floor(Math.sin(currentIndex / 4) * 8) + Math.floor(Math.random() * 5)

        setPos({
          lat: currentPoint.lat,
          lng: currentPoint.lng,
          speed: currentSpeed,
          heading: angle
        })
      }
    }, 500)

    return () => {
      if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null }
    }
  }, [session, isOnline])

  // Center map on driver position
  useEffect(() => {
    if (pos && autoCenter) {
      setViewState(v => ({ ...v, latitude: pos.lat, longitude: pos.lng }))
    }
  }, [pos, autoCenter])

  // Get upcoming stops dynamically
  const getUpcomingStops = () => {
    if (!session) return []
    const mockLine = MOCK_LINES.find(l => l.id === session.lineId)
    if (!mockLine) return []
    const stops = getMockStopsForLine(mockLine)
    if (!pos) return stops.slice(0, 4).map(s => ({ stop: s, distance: 0 }))

    // Calculate distance to each stop in KM
    const stopsWithDistance = stops.map(stop => {
      const lat1 = pos.lat * Math.PI / 180
      const lat2 = stop.latitude * Math.PI / 180
      const dLat = lat2 - lat1
      const dLng = (stop.longitude - pos.lng) * Math.PI / 180
      const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
      const d = 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
      return { stop, distance: d }
    })

    // Find the index of the closest stop
    let closestIdx = 0
    let minDist = Infinity
    stopsWithDistance.forEach((s, idx) => {
      if (s.distance < minDist) {
        minDist = s.distance
        closestIdx = idx
      }
    })

    // Display the next 4 stops starting from the closest stop ahead
    return stopsWithDistance.slice(closestIdx, closestIdx + 4)
  }

  // ── Real QR scan (DB) ──────────────────────────────────────────────────────
  const handleQRScan = async () => {
    if (!qrToken.trim() || !driverId) return
    setScanning(true)

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    if (url.includes('placeholder.supabase.co')) {
      const match = MOCK_QR_TOKENS[qrToken.trim()]
      if (match) {
        const mockLine = MOCK_LINES[match.lineIdx % MOCK_LINES.length]
        const sess: ActiveSession = {
          sessionId: `mock-session-${Date.now()}`,
          driverId: driverId,
          driverName: driverName,
          busUnit: match.busUnit,
          lineId: mockLine.id,
          lineName: mockLine.name,
          lineNumber: mockLine.line_number,
          companyName: mockLine.company,
        }
        setSession(sess)
        setPassengers(0)
        setIsOnline(true)
        setShowScanner(false)
        setQrToken('')
        setScanning(false)
        const path = getMockRoutePathForLine(mockLine)
        if (path && path.length > 0) {
          setPos({ lat: path[0].lat, lng: path[0].lng, speed: 0, heading: 0 })
          setViewState(v => ({ ...v, latitude: path[0].lat, longitude: path[0].lng, zoom: 14 }))
        }
        toast.success(`¡Turno iniciado! Unidad ${sess.busUnit} · Línea ${mockLine.line_number}`)
      } else {
        toast.error('QR inválido o inactivo en modo simulación')
        setScanning(false)
      }
      return
    }

    const { data: qr, error } = await supabase
      .from('bus_qr_codes')
      .select('*, bus_companies!company_id(company_name), bus_lines!line_id(line_number,name)')
      .eq('qr_token', qrToken.trim())
      .eq('is_active', true)
      .single()

    if (error || !qr) { toast.error('QR inválido o inactivo'); setScanning(false); return }

    await supabase.from('driver_sessions').update({ is_active: false, ended_at: new Date().toISOString() }).eq('driver_id', driverId).eq('is_active', true)
    await supabase.from('bus_positions').update({ status: 'offline' }).eq('driver_id', driverId)

    const { data: newS, error: sErr } = await supabase.from('driver_sessions').insert({
      driver_id: driverId, qr_code_id: qr.id, company_id: qr.company_id,
      line_id: qr.line_id, bus_unit: qr.bus_unit, is_active: true,
      started_at: new Date().toISOString(),
    }).select().single()

    if (sErr || !newS) { toast.error('Error al iniciar sesión'); setScanning(false); return }

    const sess: ActiveSession = {
      sessionId: newS.id, driverId, driverName,
      busUnit: qr.bus_unit, lineId: qr.line_id,
      lineName:    (qr.bus_lines as any)?.name || '—',
      lineNumber:  (qr.bus_lines as any)?.line_number || '—',
      companyName: (qr.bus_companies as any)?.company_name || '—',
    }
    setSession(sess)
    setPassengers(0)
    startGPS(driverId, newS.id, qr.line_id, qr.bus_unit, 0)
    setIsOnline(true)
    setShowScanner(false)
    setQrToken('')
    setScanning(false)
    toast.success(`¡Turno iniciado! Unidad ${qr.bus_unit}`)
  }

  // ── Mock/simulate scan ─────────────────────────────────────────────────────
  const handleSimulateScan = () => {
    const mockLine = MOCK_LINES[Math.floor(Math.random() * MOCK_LINES.length)]
    const sess: ActiveSession = {
      sessionId: `mock-session-${Date.now()}`,
      driverId: driverId || 'mock-driver',
      driverName: driverName || 'Chofer Demo',
      busUnit: `${mockLine.line_number}${String(Math.floor(Math.random() * 9) + 1).padStart(2, '0')}`,
      lineId: mockLine.id,
      lineName: mockLine.name,
      lineNumber: mockLine.line_number,
      companyName: mockLine.company,
    }
    setSession(sess)
    setPassengers(0)
    setIsOnline(true)
    setShowScanner(false)
    setQrToken('')
    const path = getMockRoutePathForLine(mockLine)
    if (path && path.length > 0) {
      setPos({ lat: path[0].lat, lng: path[0].lng, speed: 0, heading: 0 })
      setViewState(v => ({ ...v, latitude: path[0].lat, longitude: path[0].lng, zoom: 14.5 }))
    }
    toast.success(`[SIMULACIÓN] Unidad ${sess.busUnit} · Línea ${mockLine.line_number}`)
  }

  const endShift = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    if (session && !session.sessionId.startsWith('mock-')) {
      await supabase.from('driver_sessions').update({ is_active: false, ended_at: new Date().toISOString(), total_passengers: passengers }).eq('id', session.sessionId)
      await supabase.from('bus_positions').update({ status: 'offline' }).eq('driver_id', session.driverId)
    }
    setIsOnline(false); setSession(null); setPos(null); setDuration(0); setPassengers(0)
    toast('Turno finalizado')
  }, [session, passengers])

  const logout = async () => {
    if (isOnline) await endShift()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`
  }

  const isMock = session?.sessionId.startsWith('mock-')
  const mockLine = session ? MOCK_LINES.find(l => l.id === session.lineId) : null
  const accentColor = mockLine?.color || '#EF4444'

  // Map route geometries
  const routePath = mockLine ? getMockRoutePathForLine(mockLine) : []
  const stops = mockLine ? getMockStopsForLine(mockLine) : []
  const upcomingStops = getUpcomingStops()

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'DM Sans,sans-serif' }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          LEFT CONTROL PANEL
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        width: '420px',
        flexShrink: 0,
        height: '100vh',
        background: 'linear-gradient(180deg, #131921 0%, #0b0f19 100%)',
        borderRight: '1px solid rgba(184, 200, 224, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        zIndex: 10,
        boxShadow: '8px 0 32px rgba(0,0,0,0.5)',
        padding: '24px 20px'
      }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div style={{ width: '46px', height: '46px', borderRadius: '13px', background: 'linear-gradient(145deg,#1E2638,#131921)', border: '1px solid rgba(184,200,224,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.6)', flexShrink: 0 }}>
            <Bus size={20} style={{ color: 'var(--platinum)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', margin: 0 }}>Panel del Chofer</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'DM Mono', margin: 0 }}>{driverName || 'Chofer Demo'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', border: `1px solid ${isOnline ? 'rgba(34,211,160,0.25)' : 'rgba(184,200,224,0.1)'}`, background: isOnline ? 'rgba(34,211,160,0.08)' : 'rgba(184,200,224,0.04)' }}>
            {isOnline ? <Wifi size={12} style={{ color: 'var(--go)' }} /> : <WifiOff size={12} style={{ color: 'var(--text-muted)' }} />}
            <span style={{ fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 600, color: isOnline ? 'var(--go)' : 'var(--text-muted)' }}>{isOnline ? 'EN LÍNEA' : 'OFFLINE'}</span>
          </div>
        </div>

        {/* Not Logged / No Shift View */}
        {!session && !showScanner && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass" style={{ padding: '32px 24px', textAlign: 'center', marginBottom: '16px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <QrCode size={28} style={{ color: 'var(--platinum)' }} />
            </div>
            <h2 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', margin: '0 0 8px' }}>
              Escaneá el QR del colectivo
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.5, margin: '0 0 24px' }}>
              Encontrá el código QR dentro del colectivo asignado y escanealo para iniciar tu turno.
            </p>

            {/* Main scan button + simulate side-by-side */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={() => setShowScanner(true)}
                className="btn-platinum action-btn"
                style={{ flex: 1 }}
              >
                <QrCode size={15} /> Escanear QR
              </button>

              <button
                onClick={handleSimulateScan}
                title="Simular escaneo (demo)"
                className="action-btn"
                style={{
                  width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                  background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'all 200ms',
                }}
              >
                <Zap size={18} style={{ color: 'var(--near)' }} />
              </button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '12px', letterSpacing: '0.04em' }}>
              El ⚡ simula un escaneo para previsualizar el panel
            </p>
          </motion.div>
        )}

        {/* Scanner view */}
        <AnimatePresence>
          {showScanner && !session && (
            <motion.div
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
              className="glass" style={{ padding: '24px', marginBottom: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <QrCode size={18} style={{ color: 'var(--platinum)' }} />
                  <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', margin: 0 }}>
                    Ingresar código QR
                  </h3>
                </div>
                <button
                  onClick={handleSimulateScan}
                  title="Simular escaneo (demo)"
                  className="action-btn"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px',
                    padding: '5px 10px', borderRadius: '8px',
                    background: 'rgba(240,180,41,0.1)', border: '1px solid rgba(240,180,41,0.25)',
                    cursor: 'pointer', transition: 'all 200ms',
                  }}
                >
                  <Zap size={13} style={{ color: 'var(--near)' }} />
                  <span style={{ fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 600, color: 'var(--near)' }}>SIMULAR</span>
                </button>
              </div>

              {/* Viewfinder */}
              <div style={{ width: '100%', aspectRatio: '1.6', borderRadius: '14px', background: 'rgba(6,8,16,0.8)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', position: 'relative', overflow: 'hidden' }}>
                {[
                  { top: '15%', left: '15%', borderTop: '2px solid rgba(34,211,160,0.6)', borderLeft: '2px solid rgba(34,211,160,0.6)' },
                  { top: '15%', right: '15%', borderTop: '2px solid rgba(34,211,160,0.6)', borderRight: '2px solid rgba(34,211,160,0.6)' },
                  { bottom: '15%', left: '15%', borderBottom: '2px solid rgba(34,211,160,0.6)', borderLeft: '2px solid rgba(34,211,160,0.6)' },
                  { bottom: '15%', right: '15%', borderBottom: '2px solid rgba(34,211,160,0.6)', borderRight: '2px solid rgba(34,211,160,0.6)' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', width: '24px', height: '24px', ...s as any }} />
                ))}
                <div style={{ textAlign: 'center' }}>
                  <QrCode size={36} style={{ color: 'rgba(184,200,224,0.15)' }} />
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', marginTop: '8px' }}>Cámara no disponible</div>
                </div>
              </div>

              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginBottom: '10px' }}>Pegá el token del QR:</p>
              <input
                className="input-dark"
                placeholder="Token QR (ej: DEMO-QR-L12-001)"
                value={qrToken}
                onChange={e => setQrToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQRScan()}
                style={{ marginBottom: '12px' }}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={() => { setShowScanner(false); setQrToken('') }} className="btn-glass">Cancelar</button>
                <button
                  onClick={handleQRScan}
                  disabled={!qrToken.trim() || scanning}
                  className="btn-platinum action-btn"
                  style={{ opacity: qrToken.trim() && !scanning ? 1 : 0.5 }}
                >
                  {scanning ? 'Validando...' : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Session Content */}
        {session && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Simulation mode warning */}
            {isMock && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: 'var(--r-md)', background: 'rgba(240,180,41,0.07)', border: '1px solid rgba(240,180,41,0.2)', marginBottom: '12px' }}>
                <Zap size={13} style={{ color: 'var(--near)', flexShrink: 0 }} />
                <span style={{ color: 'var(--near)', fontSize: '11px', fontFamily: 'DM Mono', fontWeight: 600 }}>
                  MODO SIMULACIÓN — trayecto automático activo
                </span>
              </div>
            )}

            {/* Session Info card */}
            <div className="platinum-card" style={{ borderRadius: 'var(--r-lg)', padding: '16px', marginBottom: '14px', borderLeft: `4px solid ${accentColor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <CheckCircle size={15} style={{ color: 'var(--go)' }} />
                <span style={{ color: 'var(--go)', fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 600, letterSpacing: '0.06em' }}>TURNO ACTIVO</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  ['Empresa',   session.companyName],
                  ['Línea',     `Línea ${session.lineNumber}`],
                  ['Unidad',    session.busUnit],
                  ['Recorrido', session.lineName.split(' - ')[1] || '—'],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: '9px', fontFamily: 'DM Mono', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>{k}</div>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {gpsError && (
              <div style={{ display: 'flex', gap: '10px', background: 'rgba(255,77,106,0.07)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: '14px' }}>
                <AlertCircle size={16} style={{ color: '#FF4D6A', flexShrink: 0, marginTop: '1px' }} />
                <div style={{ fontSize: '13px', color: '#FF4D6A' }}>{gpsError}</div>
              </div>
            )}

            {/* Map Options / Toggles */}
            <div className="glass" style={{ padding: '14px 16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Auto-centrar mapa en mi posición</span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={autoCenter} onChange={e => setAutoCenter(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: autoCenter ? accentColor : '#334155', transition: 'all .3s ease', borderRadius: '34px' }}>
                    <span style={{
                      position: 'absolute',
                      height: '14px',
                      width: '14px',
                      left: autoCenter ? '20px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      transition: 'all .3s ease',
                      borderRadius: '50%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                    }} />
                  </span>
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Guía de navegación GPS (Brillo Neon)</span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={gpsGuideActive} onChange={e => setGpsGuideActive(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: gpsGuideActive ? accentColor : '#334155', transition: 'all .3s ease', borderRadius: '34px' }}>
                    <span style={{
                      position: 'absolute',
                      height: '14px',
                      width: '14px',
                      left: gpsGuideActive ? '20px' : '4px',
                      bottom: '4px',
                      backgroundColor: 'white',
                      transition: 'all .3s ease',
                      borderRadius: '50%',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                    }} />
                  </span>
                </label>
              </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '8px', marginBottom: '14px' }}>
              
              {/* Speed card */}
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Gauge size={14} style={{ color: 'var(--text-muted)', margin: '0 auto 6px' }} />
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', lineHeight: 1, fontFamily: 'Syne,sans-serif' }}>{pos?.speed ?? 0}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'DM Mono', marginTop: '4px' }}>km/h</div>
              </div>

              {/* Passengers card with integrated counter */}
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '10px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Users size={14} style={{ color: 'var(--text-muted)', margin: '0 auto 4px' }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <button onClick={() => setPassengers(p => Math.max(0, p - 1))} className="action-btn" style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(184,200,224,0.08)', border: '1px solid rgba(184,200,224,0.2)', color: 'var(--platinum)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>−</button>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', fontFamily: 'Syne,sans-serif', minWidth: '24px' }}>{passengers}</span>
                  <button onClick={() => setPassengers(p => p + 1)} className="action-btn" style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.25)', color: 'var(--go)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '12px' }}>+</button>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'DM Mono', marginTop: '4px' }}>pasajeros</div>
              </div>

              {/* Shift duration card */}
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Clock size={14} style={{ color: 'var(--text-muted)', margin: '0 auto 6px' }} />
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px', lineHeight: 1, fontFamily: 'Syne,sans-serif' }}>{fmt(duration)}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'DM Mono', marginTop: '6px' }}>en turno</div>
              </div>
            </div>

            {/* Upcoming Stops Timeline */}
            <div className="glass" style={{ padding: '16px', flex: 1, marginBottom: '14px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(184,200,224,0.07)', paddingBottom: '8px' }}>
                <Navigation size={13} style={{ color: 'var(--text-muted)' }} />
                <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'DM Mono', letterSpacing: '0.04em', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Próximas Paradas</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', flex: 1 }}>
                {upcomingStops.length > 0 ? (
                  upcomingStops.map(({ stop, distance }, idx) => {
                    const etaMin = Math.max(1, Math.round((distance / 30) * 60))
                    return (
                      <div key={stop.id} style={{ display: 'flex', gap: '12px', position: 'relative' }}>
                        {/* Timeline marker */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: '10px', height: '10px', borderRadius: '50%',
                            background: idx === 0 ? accentColor : 'rgba(184,200,224,0.15)',
                            border: `2px solid ${idx === 0 ? accentColor : 'rgba(184,200,224,0.3)'}`,
                            boxShadow: idx === 0 ? `0 0 8px ${accentColor}` : 'none',
                            zIndex: 2
                          }} />
                          {idx < upcomingStops.length - 1 && (
                            <div style={{ width: '2px', flex: 1, background: 'rgba(184,200,224,0.08)', margin: '4px 0' }} />
                          )}
                        </div>
                        {/* Timeline content */}
                        <div style={{ flex: 1, minWidth: 0, marginTop: '-2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: idx === 0 ? '#fff' : 'var(--text-secondary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {stop.name}
                            </h4>
                            <span style={{ fontSize: '11px', fontFamily: 'DM Mono', color: idx === 0 ? accentColor : 'var(--text-muted)', flexShrink: 0 }}>
                              {etaMin} min
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                            {stop.street_name} · {(distance * 1000).toFixed(0)}m
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px' }}>
                    No hay paradas cargadas
                  </div>
                )}
              </div>
            </div>

            {/* GPS active coordinates */}
            {pos && (
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isMock ? 'var(--near)' : 'var(--go)', flexShrink: 0, animation: 'pulseNeon 2s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontFamily: 'DM Mono', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '2px' }}>
                    {isMock ? 'GPS SIMULADO · coordenadas de ruta' : 'GPS ACTIVO · visible para pasajeros'}
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'DM Mono', color: 'var(--text-secondary)' }}>
                    {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={endShift}
              className="action-btn"
              style={{ width: '100%', padding: '16px', borderRadius: 'var(--r-lg)', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px', letterSpacing: '0.06em', textTransform: 'uppercase', border: '2px solid rgba(255,77,106,0.3)', background: 'rgba(255,77,106,0.08)', color: '#FF4D6A', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', transition: 'all 250ms', boxShadow: '0 0 32px rgba(255,77,106,0.08)', flexShrink: 0 }}
            >
              <Power size={18} /> Finalizar turno
            </button>
          </motion.div>
        )}

        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '16px auto 0', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Mono', flexShrink: 0 }}>
          <LogOut size={13} /> Cerrar sesión
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT INTERACTIVE MAP
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, height: '100vh', position: 'relative' }}>
        <Map
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          mapStyle={CARTODB_DARK as any}
          style={{ width: '100%', height: '100%' }}
        >
          {/* Active line route path rendering */}
          {mockLine && routePath.length > 0 && (
            <Source id="route-line-source" type="geojson" data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: routePath.map(point => [point.lng, point.lat])
              }
            }}>
              {/* Route line thickness guide */}
              <Layer
                id="route-line-glow"
                type="line"
                paint={{ 'line-color': accentColor, 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 2 }}
              />
              <Layer
                id="route-line-solid"
                type="line"
                paint={{ 'line-color': accentColor, 'line-width': 3, 'line-opacity': 0.7 }}
              />

              {/* Navigation neon path overlay */}
              {gpsGuideActive && (
                <Layer
                  id="gps-guide-glow"
                  type="line"
                  paint={{ 'line-color': '#22D3A0', 'line-width': 8, 'line-opacity': 0.35, 'line-blur': 3 }}
                />
              )}
            </Source>
          )}

          {/* Markers for stops */}
          {mockLine && stops.map((stop) => {
            const isUpcoming = upcomingStops.some(u => u.stop.id === stop.id)
            return (
              <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
                <div
                  title={stop.name}
                  style={{
                    width: isUpcoming ? '10px' : '7px',
                    height: isUpcoming ? '10px' : '7px',
                    borderRadius: '50%',
                    background: isUpcoming ? accentColor : 'rgba(184,200,224,0.3)',
                    border: `1.5px solid ${isUpcoming ? '#ffffff' : 'rgba(184,200,224,0.15)'}`,
                    boxShadow: isUpcoming ? `0 0 6px ${accentColor}` : 'none',
                  }}
                />
              </Marker>
            )
          })}

          {/* Marker for current bus position */}
          {pos && (
            <Marker longitude={pos.lng} latitude={pos.lat} rotation={pos.heading} rotationAlignment="map" anchor="center">
              <PremiumBusMarker status={pos.speed > 2 ? 'moving' : 'at_stop'} lineColor={accentColor} />
            </Marker>
          )}
        </Map>
      </div>

    </div>
  )
}