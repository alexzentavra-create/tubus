'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Navigation, Wifi, WifiOff, Users, Power, AlertCircle, Gauge, Clock, QrCode, CheckCircle, LogOut, Zap, MapPin, Sun, Moon } from 'lucide-react'
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

const CARTODB_LIGHT = {
  version: 8,
  sources: {
    "cartodb-light-tiles": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png"
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CartoDB"
    }
  },
  layers: [
    {
      id: "cartodb-light-layer",
      type: "raster",
      source: "cartodb-light-tiles",
      minzoom: 0,
      maxzoom: 20
    }
  ]
}

// Helper to offset coordinates forward along a given bearing/heading (in degrees)
const offsetCoords = (lat: number, lng: number, heading: number, distanceMeters: number) => {
  const R = 6371000 // Earth's radius in meters
  const headingRad = (heading * Math.PI) / 180
  const dLat = (distanceMeters * Math.cos(headingRad)) / R * (180 / Math.PI)
  const dLng = (distanceMeters * Math.sin(headingRad)) / (R * Math.cos((lat * Math.PI) / 180)) * (180 / Math.PI)
  return { lat: lat + dLat, lng: lng + dLng }
}

// ─── Premium Bus Marker ────────────────────────────────────────────────────────
function PremiumBusMarker({ status, lineColor }: { status: string; lineColor: string }) {
  const isMoving = status === 'moving'
  const color = lineColor || '#EF4444' // Respective Line 12 color (Red)
  
  // Sleek 3D coach dimensions matching the login menu and user dashboard aesthetic
  const W = 16
  const L = 36
  const H = 14

  return (
    <div style={{
      position: 'relative',
      width: `${W}px`,
      height: `${L}px`,
      transformStyle: 'preserve-3d',
      transition: 'transform 0.15s ease-out',
    }}>
      {/* Soft drop shadow on map surface */}
      <div style={{
        position: 'absolute',
        width: `${W}px`,
        height: `${L + 2}px`,
        left: 0,
        top: '-1px',
        background: 'rgba(0, 0, 0, 0.45)',
        filter: 'blur(3px)',
        borderRadius: '3px',
        transform: 'translateZ(-1px)',
        pointerEvents: 'none'
      }} />

      {/* Glowing Front Headlights sticking out / visible from top & 3D */}
      <div style={{
        position: 'absolute',
        left: '1px',
        top: '-2px',
        width: '3.5px',
        height: '3.5px',
        borderRadius: '50%',
        background: '#FEF08A',
        boxShadow: '0 0 6px #FEF08A, 0 0 12px #FEF08A',
        transform: 'translateZ(6px)',
        zIndex: 15,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        right: '1px',
        top: '-2px',
        width: '3.5px',
        height: '3.5px',
        borderRadius: '50%',
        background: '#FEF08A',
        boxShadow: '0 0 6px #FEF08A, 0 0 12px #FEF08A',
        transform: 'translateZ(6px)',
        zIndex: 15,
        pointerEvents: 'none'
      }} />

      {/* Glowing Rear Taillights sticking out / visible from top & 3D */}
      <div style={{
        position: 'absolute',
        left: '1px',
        bottom: '-2px',
        width: '3.5px',
        height: '3.5px',
        borderRadius: '50%',
        background: '#EF4444',
        boxShadow: '0 0 6px #EF4444, 0 0 12px #EF4444',
        transform: 'translateZ(6px)',
        zIndex: 15,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        right: '1px',
        bottom: '-2px',
        width: '3.5px',
        height: '3.5px',
        borderRadius: '50%',
        background: '#EF4444',
        boxShadow: '0 0 6px #EF4444, 0 0 12px #EF4444',
        transform: 'translateZ(6px)',
        zIndex: 15,
        pointerEvents: 'none'
      }} />

      {/* Futuristic headlight glow beam (pointing North/Up) */}
      {isMoving && (
        <div style={{
          position: 'absolute',
          bottom: `${L + 2}px`,
          left: '50%',
          transform: 'translateX(-50%) translateZ(2px)',
          width: '20px',
          height: '24px',
          background: 'linear-gradient(0deg, rgba(254, 240, 138, 0.25) 0%, rgba(254, 240, 138, 0) 100%)',
          clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)',
          pointerEvents: 'none',
        }} />
      )}
      
      {/* Futuristic red taillight glow beam (pointing South/Down) */}
      <div style={{
        position: 'absolute',
        top: `${L}px`,
        left: '50%',
        transform: 'translateX(-50%) translateZ(2px)',
        width: '12px',
        height: '10px',
        background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0) 100%)',
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
        pointerEvents: 'none',
      }} />
      
      {/* Roof Face (Top) - Sleek red body matching login menu */}
      <div style={{
        position: 'absolute',
        width: `${W}px`,
        height: `${L}px`,
        background: color,
        border: '0.8px solid rgba(255, 255, 255, 0.3)',
        borderRadius: '2.5px',
        transform: `translateZ(${H}px)`,
        boxShadow: `0 0 10px ${color}bf, 0 2px 6px rgba(0,0,0,0.5)`,
        boxSizing: 'border-box'
      }} />

      {/* Front Face (Windshield & Headlights) */}
      <div style={{
        position: 'absolute',
        width: `${W}px`,
        height: `${H}px`,
        left: 0,
        top: 0,
        background: '#0c111d',
        border: '0.8px solid rgba(255,255,255,0.2)',
        transform: 'rotateX(-90deg)',
        transformOrigin: 'top center',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1px 1px'
      }}>
        {/* Windshield */}
        <div style={{ flex: 1, background: 'rgba(15,23,42,0.92)', borderRadius: '0.5px' }} />
        {/* Headlights */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '3px', padding: '0 0.8px' }}>
          <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#FEF08A', boxShadow: '0 0 4px #FEF08A' }} />
          <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#FEF08A', boxShadow: '0 0 4px #FEF08A' }} />
        </div>
      </div>

      {/* Back Face (taillights & rear windshield facing camera in 3D view) */}
      <div style={{
        position: 'absolute',
        width: `${W}px`,
        height: `${H}px`,
        left: 0,
        bottom: 0,
        background: color,
        border: '0.8px solid rgba(255,255,255,0.25)',
        transform: 'rotateX(90deg)',
        transformOrigin: 'bottom center',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '1px 1px'
      }}>
        {/* Rear Windshield */}
        <div style={{ height: '4px', background: 'rgba(15,23,42,0.95)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '1px' }} />
        {/* Taillights */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 0.8px', boxSizing: 'border-box' }}>
          <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 4px #EF4444' }} />
          <div style={{ width: '2px', height: '2px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 4px #EF4444' }} />
        </div>
      </div>

      {/* Left Face (Left side of the bus) */}
      <div style={{
        position: 'absolute',
        width: `${H}px`,
        height: `${L}px`,
        left: 0,
        top: 0,
        background: color,
        border: '0.8px solid rgba(255,255,255,0.2)',
        transform: 'rotateY(90deg)',
        transformOrigin: 'left center',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        alignItems: 'flex-end',
        padding: '2px 1px'
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', // along H (height of the bus)
            height: '6px',  // along L (length of the bus)
            background: 'rgba(15,23,42,0.92)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '1px'
          }} />
        ))}
        {/* Wheels */}
        <div style={{ position: 'absolute', left: '1.5px', top: '6px', width: '5px', height: '5px', borderRadius: '50%', background: '#0e1118', border: '0.8px solid #4a5568', zIndex: 10 }} />
        <div style={{ position: 'absolute', left: '1.5px', bottom: '6px', width: '5px', height: '5px', borderRadius: '50%', background: '#0e1118', border: '0.8px solid #4a5568', zIndex: 10 }} />
      </div>

      {/* Right Face (Right side of the bus) */}
      <div style={{
        position: 'absolute',
        width: `${H}px`,
        height: `${L}px`,
        right: 0,
        top: 0,
        background: color,
        border: '0.8px solid rgba(255,255,255,0.2)',
        transform: 'rotateY(-90deg)',
        transformOrigin: 'right center',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-evenly',
        alignItems: 'flex-start',
        padding: '2px 1px'
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', // along H (height of the bus)
            height: '6px',  // along L (length of the bus)
            background: 'rgba(15,23,42,0.92)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '1px'
          }} />
        ))}
        {/* Wheels */}
        <div style={{ position: 'absolute', right: '1.5px', top: '6px', width: '5px', height: '5px', borderRadius: '50%', background: '#0e1118', border: '0.8px solid #4a5568', zIndex: 10 }} />
        <div style={{ position: 'absolute', right: '1.5px', bottom: '6px', width: '5px', height: '5px', borderRadius: '50%', background: '#0e1118', border: '0.8px solid #4a5568', zIndex: 10 }} />
      </div>
    </div>
  )
}

const hexToRgba = (hex: string, alpha: number) => {
  const cleanHex = hex.replace('#', '')
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function DriverPage() {
  const supabase = createClient()
  const watchIdRef  = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPosRef  = useRef<GeolocationPosition | null>(null)
  const startRef    = useRef<Date | null>(null)
  const simIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const [mounted, setMounted]           = useState(false)
  const [routeUpdateTick, setRouteUpdateTick] = useState(0)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && (e.key.startsWith('mock_route_path_') || e.key.startsWith('mock_custom_stops_') || e.key.startsWith('mock_blocked_stops_'))) {
        setRouteUpdateTick(prev => prev + 1)
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])
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
  const [firstPersonView, setFirstPersonView] = useState(false)
  const [dayMode, setDayMode]           = useState(false)
  // Control de Puntualidad States
  const [nextStopIndex, _setNextStopIndex] = useState(0)
  const nextStopIndexRef = useRef(0)
  const setNextStopIndex = (val: number) => {
    nextStopIndexRef.current = val
    _setNextStopIndex(val)
  }
  const [lastCrossedStop, setLastCrossedStop] = useState<{ name: string; time: string; status: string } | null>(null)
  const [stopsTimeframes, setStopsTimeframes] = useState<Record<string, { start: string; end: string }>>({})
  const [boardingStatus, setBoardingStatus] = useState<{ on: number; off: number; stopName: string } | null>(null)

  // Sync driver position to local mock active sessions for passenger map to fetch in real time
  useEffect(() => {
    if (!session || !pos) return
    try {
      const activeSessions = JSON.parse(localStorage.getItem('mock_active_sessions') || '[]')
      const updated = activeSessions.map((s: any) => {
        if (s.id === session.sessionId || s.bus_unit === session.busUnit) {
          return {
            ...s,
            latitude: pos.lat,
            longitude: pos.lng,
            speed_kmh: pos.speed,
            heading: pos.heading,
            total_passengers: passengers,
            status: pos.speed > 2 ? 'moving' : 'stopped',
            timestamp: new Date().toISOString()
          }
        }
        return s
      })
      localStorage.setItem('mock_active_sessions', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }
  }, [pos, passengers, session])

  const [viewState, setViewState]       = useState({
    longitude: -58.4173,
    latitude: -34.6037,
    zoom: 13.5,
    pitch: 20,
    bearing: 0
  })

  // Mount effect for Next.js SSR hydration guard
  useEffect(() => {
    setMounted(true)
  }, [])

  // Auth + resume any active session
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    const isMock = url.includes('placeholder.supabase.co')

    if (isMock) {
      setDriverName('Néstor García')
      setDriverId('mock-driver-nestor')
      // Automatically load the Line 12 session
      const mockLine = MOCK_LINES.find(l => l.line_number === '12') || MOCK_LINES[0]
      const sess: ActiveSession = {
        sessionId: `mock-session-12`,
        driverId: 'mock-driver-nestor',
        driverName: 'Néstor García',
        busUnit: '001',
        lineId: mockLine.id,
        lineName: mockLine.name,
        lineNumber: mockLine.line_number,
        companyName: mockLine.company,
      }
      setSession(sess)
      setPassengers(12)
      setIsOnline(true)
      const path = getMockRoutePathForLine(mockLine)
      if (path && path.length > 0) {
        setPos({ lat: path[0].lat, lng: path[0].lng, speed: 0, heading: 0 })
        setViewState(v => ({ ...v, latitude: path[0].lat, longitude: path[0].lng, zoom: 16, pitch: 20, bearing: 0 }))
      }
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

  // Synchronize stopsTimeframes from localStorage (updating in real time if admin changes scheduled times)
  useEffect(() => {
    if (!session) return
    const loadTimeframes = () => {
      const stored = localStorage.getItem(`stops_timeframes_${session.lineNumber}`)
      if (stored) {
        setStopsTimeframes(JSON.parse(stored))
      }
    }
    loadTimeframes()
    const interval = setInterval(loadTimeframes, 2000)
    return () => clearInterval(interval)
  }, [session])

  // Restore nextStopIndex and lastCrossedStop from localStorage if logs exist for this bus unit
  useEffect(() => {
    if (!session) return
    try {
      const logsKey = `driver_passage_logs_${session.lineNumber}_${session.busUnit}`
      const logs = JSON.parse(localStorage.getItem(logsKey) || '[]')
      const mockLine = MOCK_LINES.find(l => l.id === session.lineId)
      if (mockLine) {
        const stops = getMockStopsForLine(mockLine)
        if (logs.length > 0) {
          const lastLog = logs[logs.length - 1]
          setLastCrossedStop({ name: lastLog.stopName, time: lastLog.arrivalTime, status: lastLog.status })
          
          // Find next uncrossed stop index
          let foundIdx = 0
          for (let i = 0; i < stops.length; i++) {
            if (logs.some((l: any) => l.stopId === stops[i].id)) {
              foundIdx = i + 1
            }
          }
          setNextStopIndex(Math.min(stops.length, foundIdx))
        } else {
          setNextStopIndex(0)
          setLastCrossedStop(null)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [session])

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
    let progress = 0
    let pauseCounter = 0
    let currentSpeed = 0
    let lastStoppedStopId = ''

    // Set initial position
    setPos({ lat: path[0].lat, lng: path[0].lng, speed: 0, heading: 0 })

    simIntervalRef.current = setInterval(() => {
      const stops = getMockStopsForLine(mockLine)
      const currentPoint = path[currentIndex]
      const nextIdx = (currentIndex + 1) % path.length
      const nextPoint = path[nextIdx]

      // Interpolated position for current tick
      const currentLat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * progress
      const currentLng = currentPoint.lng + (nextPoint.lng - currentPoint.lng) * progress

      // Find closest stop based on interpolated position
      let minDistToStop = Infinity
      let targetStop = stops[0]
      stops.forEach(stop => {
        const dist = Math.hypot(stop.longitude - currentLng, stop.latitude - currentLat)
        if (dist < minDistToStop) {
          minDistToStop = dist
          targetStop = stop
        }
      })

      // Check if we should trigger a stop pause
      if (minDistToStop < 0.00018 && targetStop.id !== lastStoppedStopId && pauseCounter === 0) {
        lastStoppedStopId = targetStop.id
        pauseCounter = 80 // pause for 4 seconds (80 ticks of 50ms)
        currentSpeed = 0

        // Control de Puntualidad: Log crossing event if it matches the current expected stop
        try {
          const expectedStop = stops[nextStopIndexRef.current]
          if (expectedStop && targetStop.id === expectedStop.id) {
            const now = new Date()
            const nowStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            
            // Calculate delay status by checking current stopsTimeframes from localStorage
            const timeframes = JSON.parse(localStorage.getItem(`stops_timeframes_${session.lineNumber}`) || '{}')
            const tf = timeframes[targetStop.id] || { start: '06:00', end: '23:30' }
            const currentMin = now.getHours() * 60 + now.getMinutes()
            
            const timeToMin = (t: string) => {
              const [h, m] = t.split(':').map(Number)
              return h * 60 + m
            }
            
            const startMin = timeToMin(tf.start)
            const endMin = timeToMin(tf.end)
            
            let status = 'A tiempo'
            if (currentMin > endMin) status = 'Demorado'
            else if (currentMin < startMin) status = 'Adelantado'
            
            const newLog = {
              stopId: targetStop.id,
              stopName: targetStop.name,
              arrivalTime: nowStr,
              status
            }
            
            const logsKey = `driver_passage_logs_${session.lineNumber}_${session.busUnit}`
            const logs = JSON.parse(localStorage.getItem(logsKey) || '[]')
            if (!logs.some((l: any) => l.stopId === targetStop.id)) {
              logs.push(newLog)
              localStorage.setItem(logsKey, JSON.stringify(logs))
            }
            
            setLastCrossedStop({ name: targetStop.name, time: nowStr, status })
            setNextStopIndex(nextStopIndexRef.current + 1)
          }
        } catch (e) {
          console.error('Error logging passage:', e)
        }
        
        // Snap simulation progress to the stop's path location to prevent jump upon resuming
        if (typeof (targetStop as any).pathIndex === 'number') {
          currentIndex = (targetStop as any).pathIndex
        } else {
          let closestIdx = currentIndex
          let minDist = Infinity
          path.forEach((pt, idx) => {
            const dist = Math.hypot(pt.lng - targetStop.longitude, pt.lat - targetStop.latitude)
            if (dist < minDist) {
              minDist = dist
              closestIdx = idx
            }
          })
          currentIndex = closestIdx
        }
        progress = 0
        
        const on = Math.floor(Math.random() * 6) + 1
        setPassengers(p => {
          const off = Math.min(p, Math.floor(Math.random() * 4) + 1)
          setBoardingStatus({ on, off, stopName: targetStop.name })
          return Math.max(2, Math.min(55, p + on - off))
        })
        setTimeout(() => setBoardingStatus(null), 3000)
        
        // Snap position exactly to targetStop coordinates so it overlaps perfectly on map!
        setPos({
          lat: targetStop.latitude,
          lng: targetStop.longitude,
          speed: 0,
          heading: pos?.heading ?? 0
        })
        return
      }

      if (pauseCounter > 0) {
        pauseCounter--
      } else {
        // Calculate heading difference ahead (turns)
        let maxTurnDiff = 0
        const lookahead = 6
        for (let i = 1; i <= lookahead; i++) {
          const pA = path[(currentIndex + i - 1) % path.length]
          const pB = path[(currentIndex + i) % path.length]
          const pC = path[(currentIndex + i + 1) % path.length]
          const h1 = ((Math.atan2(pB.lng - pA.lng, pB.lat - pA.lat) * 180) / Math.PI + 360) % 360
          const h2 = ((Math.atan2(pC.lng - pB.lng, pC.lat - pB.lat) * 180) / Math.PI + 360) % 360
          let diff = Math.abs(h1 - h2)
          if (diff > 180) diff = 360 - diff
          if (diff > maxTurnDiff) maxTurnDiff = diff
        }

        // Determine target speed from turns (urban speeds with traffic)
        let targetSpeed = 22 // base straight stretch speed (raised from 18)
        
        // Add dynamic traffic fluctuation (fluctuate by +/- 3 km/h every 12s)
        const trafficFactor = Math.sin(Date.now() / 12000) * 3
        targetSpeed = targetSpeed + trafficFactor

        if (maxTurnDiff > 45) {
          targetSpeed = 12 // sharp turn (raised from 6)
        } else if (maxTurnDiff > 25) {
          targetSpeed = 15 // moderate turn (raised from 9)
        } else if (maxTurnDiff > 10) {
          targetSpeed = 18 // gentle turn (raised from 12)
        }

        // Decelerate if approaching a stop
        if (minDistToStop < 0.0008) {
          const stopSpeed = Math.max(10, 22 * (minDistToStop / 0.0008)) // stop approach limit (minimum 10 km/h before snapping)
          targetSpeed = Math.min(targetSpeed, stopSpeed)
        }

        // Smoothly interpolate speed (accelFactor: 0.075 for quick start, 0.035 for natural deceleration)
        const accelFactor = (targetSpeed > currentSpeed) ? 0.075 : 0.035
        currentSpeed = currentSpeed + (targetSpeed - currentSpeed) * accelFactor

        // Calculate segment length in km
        const lat1 = currentPoint.lat * Math.PI / 180
        const lat2 = nextPoint.lat * Math.PI / 180
        const dLatRad = lat2 - lat1
        const dLngRad = (nextPoint.lng - currentPoint.lng) * Math.PI / 180
        const s = Math.sin(dLatRad / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLngRad / 2) ** 2
        const segmentKm = 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))

        // Advance progress
        const step = segmentKm > 0 ? ((currentSpeed / 3600) * 0.05) / segmentKm : 1
        progress = progress + step

        if (progress >= 1) {
          currentIndex = (currentIndex + 1) % path.length
          progress = 0
        }

        const dy = nextPoint.lat - currentPoint.lat
        const dx = nextPoint.lng - currentPoint.lng
        const angle = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360

        setPos({
          lat: currentLat,
          lng: currentLng,
          speed: Math.round(currentSpeed),
          heading: angle
        })
      }
    }, 50)

    return () => {
      if (simIntervalRef.current) { clearInterval(simIntervalRef.current); simIntervalRef.current = null }
    }
  }, [session, isOnline])

  // Center map on driver position and handle 3D camera toggling
  useEffect(() => {
    if (pos && autoCenter) {
      if (firstPersonView) {
        setViewState(v => ({
          ...v,
          latitude: pos.lat,
          longitude: pos.lng,
          zoom: 17.5,
          pitch: 60,
          bearing: pos.heading
        }))
      } else {
        setViewState(v => ({
          ...v,
          latitude: pos.lat,
          longitude: pos.lng,
          // When 3D is toggled off, force it back to flat, original position immediately
          zoom: 14.5,
          pitch: 20,
          bearing: 0
        }))
      }
    }
  }, [pos, autoCenter, firstPersonView])

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
      const localQRs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]') : []
      const localMatch = localQRs.find((q: any) => q.qr_token === qrToken.trim())

      if (match || localMatch) {
        if (localMatch && !localMatch.is_active) {
          const warning = {
            id: `warning-${Date.now()}`,
            qrId: localMatch.id,
            qrToken: localMatch.qr_token,
            busUnit: localMatch.bus_unit,
            driverName: driverName || 'Chofer Demo',
            timestamp: new Date().toISOString(),
            message: `Intento de escaneo inactivo: Chofer ${driverName || 'Demo'} intentó ingresar en la Unidad ${localMatch.bus_unit}.`
          }
          try {
            const prev = JSON.parse(localStorage.getItem('mock_qr_warnings') || '[]')
            localStorage.setItem('mock_qr_warnings', JSON.stringify([...prev, warning]))
          } catch (e) {
            console.error(e)
          }
          toast.error('El código QR se encuentra inactivo. Se envió una advertencia al administrador.')
          setScanning(false)
          return
        }

        let busUnit = ''
        let lineId = ''
        let lineName = ''
        let lineNumber = ''
        let companyName = ''
        let companyId = 'comp-1'
        
        if (match) {
          const mockLine = MOCK_LINES[match.lineIdx % MOCK_LINES.length]
          busUnit = match.busUnit
          lineId = mockLine.id
          lineName = mockLine.name
          lineNumber = mockLine.line_number
          companyName = mockLine.company
        } else {
          const mockLine = MOCK_LINES.find(l => l.id === localMatch.line_id) || MOCK_LINES[0]
          busUnit = localMatch.bus_unit
          lineId = localMatch.line_id
          lineName = mockLine.name
          lineNumber = mockLine.line_number
          companyName = mockLine.company
          companyId = localMatch.company_id
        }

        const sess: ActiveSession = {
          sessionId: `mock-session-${Date.now()}`,
          driverId: driverId || 'mock-driver',
          driverName: driverName || 'Chofer Demo',
          busUnit: busUnit,
          lineId: lineId,
          lineName: lineName,
          lineNumber: lineNumber,
          companyName: companyName,
        }
        localStorage.removeItem(`driver_passage_logs_${sess.lineNumber}_${sess.busUnit}`)
        setNextStopIndex(0)
        setLastCrossedStop(null)
        setSession(sess)
        setPassengers(0)
        setIsOnline(true)
        setShowScanner(false)
        setQrToken('')
        setScanning(false)

        // Save session to localStorage so admin page can retrieve it
        const activeSessions = JSON.parse(localStorage.getItem('mock_active_sessions') || '[]')
        // Filter out any older session for this driver to avoid duplicates
        const updatedSessions = activeSessions.filter((s: any) => s.profiles?.name !== sess.driverName)
        updatedSessions.push({
          id: sess.sessionId,
          bus_unit: sess.busUnit,
          started_at: new Date().toISOString(),
          total_passengers: 0,
          profiles: { name: sess.driverName },
          company_id: companyId
        })
        localStorage.setItem('mock_active_sessions', JSON.stringify(updatedSessions))

        const path = getMockRoutePathForLine(MOCK_LINES.find(l => l.id === lineId) || MOCK_LINES[0])
        if (path && path.length > 0) {
          setPos({ lat: path[0].lat, lng: path[0].lng, speed: 0, heading: 0 })
          setViewState(v => ({ ...v, latitude: path[0].lat, longitude: path[0].lng, zoom: 14 }))
        }
        toast.success(`¡Turno iniciado! Unidad ${sess.busUnit} · Línea ${lineNumber}`)
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
      .single()

    if (error || !qr) { toast.error('Código QR inválido'); setScanning(false); return }

    if (!qr.is_active) {
      const warning = {
        id: `warning-${Date.now()}`,
        qrId: qr.id,
        qrToken: qr.qr_token,
        busUnit: qr.bus_unit,
        driverName: driverName || 'Chofer Demo',
        timestamp: new Date().toISOString(),
        message: `Intento de escaneo inactivo: Chofer ${driverName || 'Demo'} intentó ingresar en la Unidad ${qr.bus_unit}.`
      }
      try {
        const prev = JSON.parse(localStorage.getItem('mock_qr_warnings') || '[]')
        localStorage.setItem('mock_qr_warnings', JSON.stringify([...prev, warning]))
      } catch (e) {
        console.error(e)
      }
      toast.error('El código QR se encuentra inactivo. Se envió una advertencia al administrador.')
      setScanning(false)
      return
    }

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
    const mockLine = MOCK_LINES.find(l => l.line_number === '12') || MOCK_LINES[0]
    const sess: ActiveSession = {
      sessionId: `mock-session-${Date.now()}`,
      driverId: driverId || 'mock-driver',
      driverName: driverName || 'Chofer Demo',
      busUnit: `12${String(Math.floor(Math.random() * 9) + 1).padStart(2, '0')}`,
      lineId: mockLine.id,
      lineName: mockLine.name,
      lineNumber: mockLine.line_number,
      companyName: mockLine.company,
    }
    localStorage.removeItem(`driver_passage_logs_${mockLine.line_number}_${sess.busUnit}`)
    setNextStopIndex(0)
    setLastCrossedStop(null)
    setSession(sess)
    setPassengers(12)
    setIsOnline(true)
    setShowScanner(false)
    setQrToken('')
    const path = getMockRoutePathForLine(mockLine)
    if (path && path.length > 0) {
      setPos({ lat: path[0].lat, lng: path[0].lng, speed: 0, heading: 0 })
      setViewState(v => ({ ...v, latitude: path[0].lat, longitude: path[0].lng, zoom: 16, pitch: 20, bearing: 0 }))
    }
    toast.success(`[SIMULACIÓN] Unidad ${sess.busUnit} · Línea ${mockLine.line_number}`)
  }

  const endShift = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (simIntervalRef.current) clearInterval(simIntervalRef.current)
    
    // Clean up local mock session
    if (typeof window !== 'undefined') {
      const activeSessions = JSON.parse(localStorage.getItem('mock_active_sessions') || '[]')
      const updated = activeSessions.filter((s: any) => s.profiles?.name !== driverName)
      localStorage.setItem('mock_active_sessions', JSON.stringify(updated))
    }

    if (session && !session.sessionId.startsWith('mock-')) {
      await supabase.from('driver_sessions').update({ is_active: false, ended_at: new Date().toISOString(), total_passengers: passengers }).eq('id', session.sessionId)
      await supabase.from('bus_positions').update({ status: 'offline' }).eq('driver_id', session.driverId)
    }
    setIsOnline(false); setSession(null); setPos(null); setDuration(0); setPassengers(0)
    toast('Turno finalizado')
  }, [session, passengers, driverName])

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

  const nextStop = stops[nextStopIndex]
  const nextTf = nextStop ? (stopsTimeframes[nextStop.id] || { start: '06:00', end: '23:30' }) : null
  const isTripFinished = nextStopIndex >= stops.length && stops.length > 0

  const handleResetTrip = () => {
    if (!session) return
    const logsKey = `driver_passage_logs_${session.lineNumber}_${session.busUnit}`
    localStorage.removeItem(logsKey)
    setNextStopIndex(0)
    setLastCrossedStop(null)
    toast.success('¡Recorrido reiniciado para una nueva vuelta!')
  }

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'DM Sans,sans-serif' }}>
      
      {/* ═══════════════════════════════════════════════════════════════
          LEFT CONTROL PANEL
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        width: '420px',
        flexShrink: 0,
        height: '100vh',
        background: '#0b0f19',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        zIndex: 10,
        boxShadow: '8px 0 32px rgba(0,0,0,0.5)',
        padding: '24px 20px'
      }}>
        
        {/* Brand Logo Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src="/images/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em', fontFamily: 'DM Sans,sans-serif' }}>
                Bien<span style={{ color: '#8f94a5', fontWeight: 400 }}>Parada</span>
              </span>
              <span style={{
                fontSize: '9px',
                color: '#fff',
                background: '#EF4444',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                fontFamily: 'DM Sans,sans-serif'
              }}>
                Chofer
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', borderRadius: '999px', border: `1px solid ${isOnline ? 'rgba(34,211,160,0.25)' : 'rgba(184,200,224,0.1)'}`, background: isOnline ? 'rgba(34,211,160,0.08)' : 'rgba(184,200,224,0.04)' }}>
            {isOnline ? <Wifi size={12} style={{ color: 'var(--go)' }} /> : <WifiOff size={12} style={{ color: 'var(--text-muted)' }} />}
            <span style={{ fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 600, color: isOnline ? 'var(--go)' : 'var(--text-muted)' }}>{isOnline ? 'EN LÍNEA' : 'OFFLINE'}</span>
          </div>
        </div>

        {/* User Card (Chofer Profile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#121527', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1b1d2e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', fontFamily: 'Syne,sans-serif' }}>
              {driverName ? driverName.split(' ').map(n => n[0]).join('') : 'CD'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{driverName || 'Chofer Demo'}</div>
            <div style={{ color: '#a3a6b8', fontSize: '11px', fontFamily: 'DM Mono', marginTop: '1px' }}>ID: {driverId ? driverId.slice(0, 12) : 'mock-driver'}</div>
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

            {/* Boarding Notification Alert */}
            <AnimatePresence>
              {boardingStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    background: 'rgba(34,211,160,0.1)',
                    border: '1px solid rgba(34,211,160,0.25)',
                    borderRadius: 'var(--r-md)',
                    padding: '10px 14px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: '0 0 16px rgba(34,211,160,0.1)'
                  }}
                >
                  <Users size={16} style={{ color: 'var(--go)', flexShrink: 0 }} />
                  <div style={{ fontSize: '12px', color: 'var(--go)', fontWeight: 500 }}>
                    {`En parada ${boardingStatus.stopName}: +${boardingStatus.on} / -${boardingStatus.off} pasajeros`}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Map Options / Toggles */}
            <div className="glass" style={{ padding: '14px 16px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Mapa: Modo de Luz Diurna</span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={dayMode} onChange={e => setDayMode(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                  <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: dayMode ? accentColor : '#334155', transition: 'all .3s ease', borderRadius: '34px' }}>
                    <span style={{
                      position: 'absolute',
                      height: '14px',
                      width: '14px',
                      left: dayMode ? '20px' : '4px',
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
                <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-secondary)' }}>Vista de Conducción 3D (GPS)</span>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={firstPersonView}
                    onChange={e => {
                      const val = e.target.checked
                      setFirstPersonView(val)
                      if (val) {
                        setAutoCenter(true)
                      } else {
                        // Smoothly return viewState to flat view
                        setViewState(v => ({
                          ...v,
                          zoom: 14.5,
                          pitch: 20,
                          bearing: 0
                        }))
                      }
                    }}
                    style={{ opacity: 0, width: 0, height: 0 }}
                  />
                  <span className="slider round" style={{ position: 'absolute', cursor: 'pointer', inset: 0, background: firstPersonView ? accentColor : '#334155', transition: 'all .3s ease', borderRadius: '34px' }}>
                    <span style={{
                      position: 'absolute',
                      height: '14px',
                      width: '14px',
                      left: firstPersonView ? '20px' : '4px',
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
              
              {/* Speed card */}
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Gauge size={14} style={{ color: 'var(--text-muted)', margin: '0 auto 6px' }} />
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', lineHeight: 1, fontFamily: 'Syne,sans-serif' }}>{pos?.speed ?? 0}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'DM Mono', marginTop: '4px' }}>km/h</div>
              </div>

              {/* Passengers card (read-only) */}
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Users size={14} style={{ color: 'var(--text-muted)', margin: '0 auto 6px' }} />
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', lineHeight: 1, fontFamily: 'Syne,sans-serif' }}>{passengers}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'DM Mono', marginTop: '4px' }}>pasajeros</div>
              </div>

              {/* Shift duration card */}
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '12px 8px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Clock size={14} style={{ color: 'var(--text-muted)', margin: '0 auto 6px' }} />
                <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px', lineHeight: 1, fontFamily: 'Syne,sans-serif' }}>{fmt(duration)}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '9px', fontFamily: 'DM Mono', marginTop: '6px' }}>en turno</div>
              </div>
            </div>

            {/* Control de Puntualidad y Paradas Card */}
            <div className="glass" style={{ padding: '16px', marginBottom: '14px', border: `1px solid ${hexToRgba(accentColor, 0.15)}`, boxShadow: `0 0 15px ${hexToRgba(accentColor, 0.05)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid rgba(184,200,224,0.07)', paddingBottom: '8px' }}>
                <Clock size={13} style={{ color: accentColor }} />
                <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'DM Mono', letterSpacing: '0.04em', color: accentColor, textTransform: 'uppercase' }}>Control de Puntualidad</span>
              </div>

              {isTripFinished ? (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#10B981', marginBottom: '4px' }}>
                    🎉 ¡Fin de Recorrido!
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Todas las paradas han sido completadas con éxito.
                  </div>
                  <button
                    onClick={handleResetTrip}
                    style={{
                      background: accentColor,
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontFamily: 'DM Sans,sans-serif'
                    }}
                  >
                    Iniciar Nueva Vuelta
                  </button>
                </div>
              ) : (
                <div>
                  {nextStop ? (
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Próxima Estación Programada
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginTop: '3px' }}>
                        {nextStopIndex + 1}. {nextStop.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Paso Programado:</span>
                        <span style={{ fontSize: '12px', color: accentColor, fontWeight: 700, fontFamily: 'DM Mono' }}>
                          {nextTf?.start} a {nextTf?.end} hs
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                      Esperando inicio de recorrido...
                    </div>
                  )}

                  {lastCrossedStop && (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(184,200,224,0.07)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Último cruce registrado por GPS
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                          {lastCrossedStop.name}
                        </span>
                        <span style={{
                          fontSize: '10px',
                          color: lastCrossedStop.status === 'A tiempo' ? '#10B981' : (lastCrossedStop.status === 'Demorado' ? '#EF4444' : '#F59E0B'),
                          fontWeight: 700,
                          fontFamily: 'DM Mono'
                        }}>
                          {lastCrossedStop.time} ({lastCrossedStop.status})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                    const speedKmh = pos && pos.speed > 2 ? pos.speed : 20
                    const etaSeconds = Math.max(5, Math.round((distance / speedKmh) * 3600))
                    
                    const formatEta = (seconds: number) => {
                      if (seconds < 60) {
                        return `${seconds}s`
                      }
                      const mins = Math.floor(seconds / 60)
                      const secs = seconds % 60
                      if (secs === 0) return `${mins} min`
                      return `${mins}m ${secs}s`
                    }
                    
                    const etaStr = formatEta(etaSeconds)

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
                              {etaStr}
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
        {/* Floating Sun/Moon dayMode switch */}
        <button
          onClick={() => setDayMode(!dayMode)}
          className="action-btn"
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: dayMode ? '#ffffff' : 'rgba(19,25,33,0.85)',
            border: `1px solid ${dayMode ? 'rgba(0,0,0,0.1)' : 'rgba(184,200,224,0.15)'}`,
            color: dayMode ? '#1e293b' : '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            cursor: 'pointer',
            zIndex: 10,
            transition: 'all 200ms'
          }}
          title={dayMode ? 'Cambiar a Modo Noche' : 'Cambiar a Modo Día'}
        >
          {dayMode ? <Moon size={20} /> : <Sun size={20} />}
        </button>

        {mounted ? (
          <Map
            {...viewState}
            maxZoom={17.8}
            onMove={e => {
              setViewState(e.viewState)
              if (e.originalEvent) {
                setAutoCenter(false)
              }
            }}
            onDragStart={() => setAutoCenter(false)}
            onZoomStart={() => setAutoCenter(false)}
            mapStyle={(dayMode ? CARTODB_LIGHT : CARTODB_DARK) as any}
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
              const isBlocked = (stop as any).isBlocked || stop.name.includes('[BLOQUEADA]')
              const isUpcoming = upcomingStops.some(u => u.stop.id === stop.id)
              return (
                <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} pitchAlignment="map" rotationAlignment="map" anchor="center">
                  <div
                    title={stop.name}
                    style={{
                      width: isBlocked ? '14px' : (isUpcoming ? '10px' : '7px'),
                      height: isBlocked ? '14px' : (isUpcoming ? '10px' : '7px'),
                      borderRadius: '50%',
                      background: isBlocked ? '#FF4D6A' : (isUpcoming ? accentColor : 'rgba(184,200,224,0.3)'),
                      border: `1.5px solid ${isBlocked ? '#ffffff' : (isUpcoming ? '#ffffff' : 'rgba(184,200,224,0.15)')}`,
                      boxShadow: isBlocked ? '0 0 8px #FF4D6A' : (isUpcoming ? `0 0 6px ${accentColor}` : 'none'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '8px',
                      fontWeight: 'bold'
                    }}
                  >
                    {isBlocked ? '✕' : ''}
                  </div>
                </Marker>
              )
            })}

            {/* Marker for current bus position with 3D perspective shift correction */}
            {pos && (() => {
              const markerCoords = firstPersonView 
                ? offsetCoords(pos.lat, pos.lng, pos.heading, 3.8)
                : { lat: pos.lat, lng: pos.lng }
              return (
                <Marker longitude={markerCoords.lng} latitude={markerCoords.lat} rotation={pos.heading} rotationAlignment="map" pitchAlignment="map" anchor="center">
                  <PremiumBusMarker status={pos.speed > 2 ? 'moving' : 'at_stop'} lineColor={accentColor} />
                </Marker>
              )
            })()}
          </Map>
        ) : (
          <div style={{ width: '100%', height: '100%', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontFamily: 'DM Mono' }}>Cargando mapa...</span>
          </div>
        )}
      </div>

    </div>
    
  )
}