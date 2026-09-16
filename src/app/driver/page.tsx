'use client'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Navigation, Wifi, WifiOff, Users, Power, AlertCircle, Gauge, Clock, QrCode, CheckCircle, LogOut, Zap, MapPin, Sun, Moon, FileText, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { MOCK_LINES, getMockRoutePathForLine, getMockStopsForLine } from '@/lib/mockData'
import toast from 'react-hot-toast'
import { syncAllGlobalKeys, pushGlobalKey } from '@/lib/sync'
import { CARTODB_DARK, CARTODB_LIGHT } from '@/lib/mapStyles'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import SessionConcurrencyGuard from '@/components/SessionConcurrencyGuard'

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

// CARTODB_DARK, CARTODB_LIGHT are imported from @/lib/mapStyles


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
  const lastTransmittedPosRef = useRef<{ lat: number; lng: number; heading: number; time: number } | null>(null)
  const startRef    = useRef<Date | null>(null)

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
  const [currentTime, setCurrentTime] = useState<string>('')
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      setCurrentTime(timeStr)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 820)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const [driverName, setDriverName]     = useState('')
  const [driverId,   setDriverId]       = useState('')
  const [driverLineNumber, setDriverLineNumber] = useState('')
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
      if (typeof window !== 'undefined') { window.dispatchEvent(new Event('storage')); window.dispatchEvent(new Event('mock_active_sessions_updated')); }
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
      // Read real driver identity saved at login — no auto-mock session
      const rawIdentity = typeof window !== 'undefined' ? localStorage.getItem('mock_driver_identity') : null
      if (!rawIdentity) {
        // No identity found — redirect to login
        window.location.href = '/login'
        return
      }
      try {
        const identity = JSON.parse(rawIdentity)
        setDriverName(identity.name || 'Chofer')
        setDriverId(identity.driverId || `driver-${Date.now()}`)
        setDriverLineNumber(identity.lineNumber || '0')
        // Request GPS permission immediately so the browser dialog appears on panel load
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              // Permission granted — GPS ready for when QR is scanned
              console.log('[BienParada] GPS listo:', pos.coords.latitude, pos.coords.longitude)
            },
            (err) => {
              console.warn('[BienParada] GPS no disponible:', err.message)
            },
            { enableHighAccuracy: true, timeout: 10000 }
          )
        }
        // Do NOT auto-start a session — driver must scan a QR code to begin their shift
      } catch (e) {
        console.error('Error reading driver identity:', e)
        window.location.href = '/login'
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
      const lat = p.coords.latitude
      const lng = p.coords.longitude
      const heading = Math.round(p.coords.heading || 0)
      const status = spd > 2 ? 'moving' : 'stopped'
      const ts = new Date().toISOString()

      // 1. Always update local storage & dispatch event so local map and listeners see real GPS immediately
      try {
        const sessions = JSON.parse(localStorage.getItem('mock_active_sessions') || '[]')
        const idx = sessions.findIndex((s: any) => s.id === sid || s.driverId === uid || s.bus_unit === unit)
        if (idx >= 0) {
          sessions[idx] = { ...sessions[idx], latitude: lat, longitude: lng, speed_kmh: spd, heading, status, last_gps: ts }
        } else {
          sessions.push({ id: sid, driverId: uid, line_id: lid, bus_unit: unit, latitude: lat, longitude: lng, speed_kmh: spd, heading, status, last_gps: ts })
        }
        localStorage.setItem('mock_active_sessions', JSON.stringify(sessions))
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('storage'))
          window.dispatchEvent(new Event('mock_active_sessions_updated'))
        }
      } catch (e) {}

      // 2. Real mode: 3G/4G Cellular Data Saver
      // Broadcast over network to Supabase bus_positions ONLY if:
      // - First transmission, OR
      // - Bus has moved >= 8 meters, OR
      // - Heading changed >= 15 degrees, OR
      // - Heartbeat timeout reached (25 seconds) to maintain online status
      const last = lastTransmittedPosRef.current
      const now = Date.now()
      let shouldTransmit = false

      if (!last) {
        shouldTransmit = true
      } else {
        const distMeters = Math.hypot((lat - last.lat) * 111000, (lng - last.lng) * 111000 * Math.cos(lat * Math.PI / 180))
        const headingDiff = Math.abs(heading - last.heading)
        const timeElapsed = now - last.time
        if (distMeters >= 8 || headingDiff >= 15 || timeElapsed >= 25000) {
          shouldTransmit = true
        }
      }

      if (shouldTransmit) {
        lastTransmittedPosRef.current = { lat, lng, heading, time: now }
        try {
          await supabase.from('bus_positions').upsert({
            driver_id: uid, line_id: lid, bus_unit: unit,
            latitude: lat, longitude: lng,
            heading, speed_kmh: spd,
            status,
            passenger_count: initPass,
            timestamp: ts,
          }, { onConflict: 'driver_id' })
        } catch (e) {
          console.error('Error broadcasting GPS to Supabase bus_positions:', e)
        }
      }
    }, 3000)
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

  // ─── Real GPS stop arrival & punctuality control ───────────────────────────
  useEffect(() => {
    if (!session || !isOnline || !pos) return
    const mockLine = MOCK_LINES.find(l => l.id === session.lineId)
    if (!mockLine) return
    const stops = getMockStopsForLine(mockLine)
    const expectedStop = stops[nextStopIndexRef.current]
    if (!expectedStop) return

    const dLat = (pos.lat - expectedStop.latitude) * 111
    const dLng = (pos.lng - expectedStop.longitude) * 111 * Math.cos(pos.lat * Math.PI / 180)
    const distMeters = Math.hypot(dLat, dLng) * 1000

    if (distMeters < 35) {
      const now = new Date()
      const nowStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const timeframes = JSON.parse(localStorage.getItem(`stops_timeframes_${session.lineNumber}`) || '{}')
      const tf = timeframes[expectedStop.id] || { start: '06:00', end: '23:30' }
      const currentMin = now.getHours() * 60 + now.getMinutes()
      const timeToMin = (t: string) => {
        const [h, m] = t.split(':').map(Number)
        return (h || 0) * 60 + (m || 0)
      }
      const startMin = timeToMin(tf.start)
      const endMin = timeToMin(tf.end)

      let status = 'A tiempo'
      if (currentMin > endMin) status = 'Demorado'
      else if (currentMin < startMin) status = 'Adelantado'

      const newLog = {
        stopId: expectedStop.id,
        stopName: expectedStop.name,
        arrivalTime: nowStr,
        status
      }

      const logsKey = `driver_passage_logs_${session.lineNumber}_${session.busUnit}`
      const logs = JSON.parse(localStorage.getItem(logsKey) || '[]')
      if (!logs.some((l: any) => l.stopId === expectedStop.id)) {
        logs.push(newLog)
        localStorage.setItem(logsKey, JSON.stringify(logs))
        setLastCrossedStop({ name: expectedStop.name, time: nowStr, status })
        setNextStopIndex(nextStopIndexRef.current + 1)
      }
    }
  }, [pos, session, isOnline])

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

    // 1. Check if driver has been deleted by Super Admin
    const activeUserEmail = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('active_user') || '{}')?.email || localStorage.getItem('profile_email') || '') : ''
    const deletedDriversList = JSON.parse(localStorage.getItem('deleted_drivers') || '[]')
    if ((activeUserEmail && deletedDriversList.includes(activeUserEmail.toLowerCase())) || (driverName && deletedDriversList.includes(driverName.toLowerCase()))) {
      toast.error('⚠️ Acceso denegado: Tu cuenta de chofer ha sido eliminada por la administración.')
      localStorage.removeItem('active_user')
      localStorage.removeItem('mock_driver_identity')
      setTimeout(() => { window.location.href = '/login' }, 1500)
      return
    }

    // 2. Check if QR code / Bus unit has been deleted by Super Admin or Line Admin
    const deletedQRsList = JSON.parse(localStorage.getItem('deleted_qr_codes') || '[]')
    if (deletedQRsList.includes(qrToken.trim())) {
      toast.error('⚠️ Error: Este código QR / Unidad fue eliminado permanentemente por la administración.')
      setScanning(false)
      return
    }

    if (!qrToken.trim() || !driverId) return
    setScanning(true)

    const { data: qr, error } = await supabase
      .from('bus_qr_codes')
      .select('*, bus_companies!company_id(company_name), bus_lines!line_id(line_number,name)')
      .eq('qr_token', qrToken.trim())
      .single()
    let matchedQr: any = !error && qr ? qr : null

    // Fallback to local admin-created QRs if table not synced yet
    if (!matchedQr) {
      const localQRs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]') : []
      const localMatch = localQRs.find((q: any) => q.qr_token === qrToken.trim())
      if (localMatch) {
        matchedQr = {
          id: localMatch.id || `qr-${Date.now()}`,
          qr_token: localMatch.qr_token,
          bus_unit: localMatch.bus_unit,
          line_id: localMatch.line_id,
          company_id: localMatch.company_id || 'comp-1',
          is_active: localMatch.is_active !== false,
          bus_lines: { line_number: localMatch.line_number || '0', name: localMatch.line_name || 'Línea' },
          bus_companies: { company_name: localMatch.company_name || 'Empresa' }
        }
      }
    }

    if (!matchedQr) {
      toast.error('Código QR inválido o no encontrado.')
      setScanning(false)
      return
    }

    // Validate that driver scans a QR code belonging to their assigned line
    const qrLineNumber = (matchedQr.bus_lines as any)?.line_number
    if (driverLineNumber && qrLineNumber && driverLineNumber !== qrLineNumber) {
      toast.error(`Acceso denegado: Perteneces a la Línea ${driverLineNumber}. No podés escanear unidades de la Línea ${qrLineNumber}.`)
      setScanning(false)
      return
    }

    if (!matchedQr.is_active) {
      toast.error('El código QR se encuentra inactivo. Contactá a tu administración.')
      setScanning(false)
      return
    }

    try {
      await supabase.from('driver_sessions').update({ is_active: false, ended_at: new Date().toISOString() }).eq('driver_id', driverId).eq('is_active', true)
      await supabase.from('bus_positions').update({ status: 'offline' }).eq('driver_id', driverId)
    } catch (e) {}

    let sessionId = `sess-${Date.now()}`
    try {
      const { data: newS } = await supabase.from('driver_sessions').insert({
        driver_id: driverId,
        qr_code_id: matchedQr.id.startsWith('qr-') ? null : matchedQr.id,
        company_id: matchedQr.company_id === 'comp-1' ? null : matchedQr.company_id,
        line_id: matchedQr.line_id.startsWith('line-') ? null : matchedQr.line_id,
        bus_unit: matchedQr.bus_unit,
        is_active: true,
        started_at: new Date().toISOString(),
      }).select().single()
      if (newS?.id) sessionId = newS.id
    } catch (e) {}

    const sess: ActiveSession = {
      sessionId,
      driverId,
      driverName,
      busUnit: matchedQr.bus_unit,
      lineId: matchedQr.line_id,
      lineName:    (matchedQr.bus_lines as any)?.name || '—',
      lineNumber:  (matchedQr.bus_lines as any)?.line_number || '—',
      companyName: (matchedQr.bus_companies as any)?.company_name || '—',
    }
    setSession(sess)
    setPassengers(0)
    startGPS(driverId, sessionId, matchedQr.line_id, matchedQr.bus_unit, 0)
    setIsOnline(true)
    setShowScanner(false)
    setQrToken('')
    setScanning(false)
    toast.success(`¡Turno iniciado! Unidad ${matchedQr.bus_unit}`)
  }

  const endShift = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    lastTransmittedPosRef.current = null
    
    // Clean up local mock session
    if (typeof window !== 'undefined') {
      const activeSessions = JSON.parse(localStorage.getItem('mock_active_sessions') || '[]')
      const updated = activeSessions.filter((s: any) => s.profiles?.name !== driverName)
      localStorage.setItem('mock_active_sessions', JSON.stringify(updated))
      if (typeof window !== 'undefined') { window.dispatchEvent(new Event('storage')); window.dispatchEvent(new Event('mock_active_sessions_updated')); }
    }

    if (session) {
      try {
        await supabase.from('bus_positions').update({ status: 'offline' }).eq('driver_id', session.driverId)
      } catch (e) {}
      if (!session.sessionId.startsWith('mock-')) {
        try {
          await supabase.from('driver_sessions').update({ is_active: false, ended_at: new Date().toISOString(), total_passengers: passengers }).eq('id', session.sessionId)
        } catch (e) {}
      }
    }
    setIsOnline(false); setSession(null); setPos(null); setDuration(0); setPassengers(0)
    toast('Turno finalizado')
  }, [session, passengers, driverName])

  const logout = async () => {
    if (isOnline) await endShift()
    if (typeof window !== 'undefined') {
      localStorage.removeItem('mock_driver_identity')
    }
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const fmt = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`
  }

  // ── Driver notes (written by admin) ──
  const [showNotes, setShowNotes] = useState(false)
  const [driverNotes, setDriverNotes] = useState<any[]>([])

  const loadDriverNotes = () => {
    if (typeof window === 'undefined') return
    try {
      const id = typeof window !== 'undefined' ? localStorage.getItem('mock_driver_identity') : null
      if (!id) return
      const identity = JSON.parse(id)
      // Search all mock_drivers_* lists to find this driver's ID
      const driverKeys = Object.keys(localStorage).filter(k => k.startsWith('mock_drivers_'))
      for (const key of driverKeys) {
        const drivers = JSON.parse(localStorage.getItem(key) || '[]')
        const d = drivers.find((dr: any) => dr.email?.toLowerCase() === identity.email?.toLowerCase())
        if (d) {
          const notes = JSON.parse(localStorage.getItem(`mock_driver_notes_${d.id}`) || '[]')
          setDriverNotes(notes)
          return
        }
      }
    } catch {}
  }

  const deleteDriverNote = (noteId: string) => {
    if (typeof window === 'undefined') return
    try {
      const id = localStorage.getItem('mock_driver_identity')
      if (!id) return
      const identity = JSON.parse(id)
      const driverKeys = Object.keys(localStorage).filter(k => k.startsWith('mock_drivers_'))
      for (const key of driverKeys) {
        const drivers = JSON.parse(localStorage.getItem(key) || '[]')
        const d = drivers.find((dr: any) => dr.email?.toLowerCase() === identity.email?.toLowerCase())
        if (d) {
          const notesKey = `mock_driver_notes_${d.id}`
          const updated = driverNotes.filter(n => n.id !== noteId)
          localStorage.setItem(notesKey, JSON.stringify(updated))
          setDriverNotes(updated)
          return
        }
      }
    } catch {}
  }

  useEffect(() => { if (showNotes) loadDriverNotes() }, [showNotes])

  const mockLine = useMemo(() => {
    if (session) {
      return MOCK_LINES.find(l => l.id === session.lineId) || null
    }
    if (driverLineNumber) {
      return MOCK_LINES.find(l => l.line_number === driverLineNumber) || null
    }
    return null
  }, [session, driverLineNumber])
  const accentColor = mockLine?.color || '#EF4444'

  // Map route geometries
  const routePath = mockLine ? getMockRoutePathForLine(mockLine) : []
  const stops = mockLine ? getMockStopsForLine(mockLine) : []

  // Load active detour for driver
  const activeDetour = useMemo(() => {
    if (typeof window === 'undefined' || !mockLine) return null
    const stored = localStorage.getItem(`mock_detour_${mockLine.line_number}_ida`)
    if (stored) {
      try {
        return JSON.parse(stored)
      } catch (e) {
        return null
      }
    }
    return null
  }, [mockLine, routeUpdateTick])

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
    <div style={{ display: 'flex', width: '100vw', height: '100vh', flexDirection: isMobile ? 'column' : 'row', overflow: 'hidden', background: 'var(--void)', color: 'var(--text-primary)', fontFamily: 'DM Sans,sans-serif' }}>
      <SessionConcurrencyGuard userEmail={driverId || 'driver@bienparada.ar'} />
      
      {/* ═══════════════════════════════════════════════════════════════
          LEFT CONTROL PANEL
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        width: isMobile ? '100%' : '420px',
        flexShrink: 0,
        height: isMobile ? '42vh' : '100vh',
        order: isMobile ? 2 : 1,
        background: '#0b0f19',
        borderRight: isMobile ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
        borderTop: isMobile ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        zIndex: 10,
        boxShadow: isMobile ? '0 -8px 32px rgba(0,0,0,0.5)' : '8px 0 32px rgba(0,0,0,0.5)',
        padding: isMobile ? '12px 14px' : '24px 20px'
      }}>
        
        {/* Brand Logo Header */}
        {!isMobile && (
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
                  background: accentColor,
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
        )}

        {/* User Card (Chofer Profile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#121527', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px', padding: '12px', marginBottom: '20px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1b1d2e', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '14px', fontFamily: 'Syne,sans-serif' }}>
              {driverName ? driverName.split(' ').map(n => n[0]).join('') : 'CH'}
            </span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{driverName || 'Chofer'}</div>
            <div style={{ color: '#a3a6b8', fontSize: '11px', fontFamily: 'DM Mono', marginTop: '1px' }}>ID: {driverId ? driverId.slice(0, 12) : 'driver'}</div>
            {(driverLineNumber || (session && session.lineNumber)) && (
              <div style={{ color: accentColor, fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Bus size={10} /> LÍNEA {session ? session.lineNumber : driverLineNumber}
              </div>
            )}
          </div>
          {/* Clock Widget */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'flex-end', 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.05)', 
            borderRadius: '6px', 
            padding: '4px 8px',
            fontFamily: 'DM Mono, monospace'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3B82F6', fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '2px' }}>
              <Clock size={10} /> HORA
            </div>
            <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, letterSpacing: '0.02em' }}>
              {currentTime || '00:00:00'}
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <button
                onClick={() => setShowScanner(true)}
                className="btn-platinum action-btn"
                style={{ width: '100%' }}
              >
                <QrCode size={15} /> Escanear QR
              </button>
            </div>
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
                placeholder="Token QR (ej: QR-L12-001)"
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
            <div className="glass" style={{ padding: isMobile ? '10px 12px' : '14px 16px', marginBottom: isMobile ? '8px' : '14px', display: 'flex', flexDirection: 'column', gap: isMobile ? '8px' : '12px' }}>
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

            {/* GPS active coordinates & Data Saver Status */}
            {pos && (
              <div style={{ background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.07)', borderRadius: 'var(--r-md)', padding: '12px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--go)', flexShrink: 0, animation: 'pulseNeon 2s ease-in-out infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '10px', fontFamily: 'DM Mono', color: 'var(--go)', letterSpacing: '0.06em', marginBottom: '2px', fontWeight: 600 }}>
                    GPS EN VIVO · Ahorro de datos 3G/4G activo
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'DM Mono', color: 'var(--text-secondary)' }}>
                    {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} · {pos.speed} km/h
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

        {/* Mis Notas button */}
        <button
          onClick={() => { setShowNotes(true); loadDriverNotes() }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '12px auto 0', padding: '8px 20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'DM Mono', flexShrink: 0, transition: 'all 200ms' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
        >
          <FileText size={13} /> Mis Notas {driverNotes.length > 0 ? `(${driverNotes.length})` : ''}
        </button>

        <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px auto 0', padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Mono', flexShrink: 0 }}>
          <LogOut size={13} /> Cerrar sesión
        </button>

        {/* Notes modal */}
        {showNotes && (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setShowNotes(false)}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#121527', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '24px', width: '100%', maxWidth: '440px', maxHeight: '70vh', display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={16} style={{ color: '#8f94a5' }} />
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'Syne,sans-serif' }}>Notas del administrador</span>
                </div>
                <button onClick={() => setShowNotes(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8f94a5', padding: '4px' }}>
                  <X size={18} />
                </button>
              </div>

              {driverNotes.length === 0 ? (
                <div style={{ color: '#8f94a5', fontSize: '13px', fontFamily: 'DM Mono', textAlign: 'center', padding: '24px 0' }}>
                  No tenés notas del administrador aún.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                  {driverNotes.map(n => (
                    <div key={n.id} style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: '#e2e8f0', fontSize: '13px', lineHeight: 1.5 }}>{n.text}</div>
                        <div style={{ color: '#8f94a5', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '4px' }}>{n.author} · {n.date}</div>
                      </div>
                      <button
                        onClick={() => deleteDriverNote(n.id)}
                        title="Eliminar nota"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4D6A', opacity: 0.6, padding: '2px', flexShrink: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT INTERACTIVE MAP
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, width: '100%', height: isMobile ? '58vh' : '100vh', order: isMobile ? 1 : 2, position: 'relative' }}>
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
              const isOnCurrentTrip = !stop.direction || stop.direction === 'ida'
              return (
                <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} pitchAlignment="map" rotationAlignment="map" anchor="center">
                  <div
                    title={stop.name}
                    style={{
                      width: isBlocked ? '14px' : (isUpcoming ? '11px' : (isOnCurrentTrip ? '9px' : '7px')),
                      height: isBlocked ? '14px' : (isUpcoming ? '11px' : (isOnCurrentTrip ? '9px' : '7px')),
                      borderRadius: '50%',
                      background: isBlocked ? '#FF4D6A' : (isOnCurrentTrip ? accentColor : 'rgba(148, 163, 184, 0.3)'),
                      border: `1.5px solid ${isOnCurrentTrip ? '#ffffff' : 'rgba(148, 163, 184, 0.15)'}`,
                      boxShadow: isBlocked ? '0 0 8px #FF4D6A' : (isOnCurrentTrip ? (isUpcoming ? `0 0 10px ${accentColor}` : `0 0 4px ${accentColor}80`) : 'none'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      transition: 'all 200ms'
                    }}
                  >
                    {isBlocked ? '✕' : ''}
                  </div>
                </Marker>
              )
            })}

            {/* Render detour waypoints on the driver map */}
            {activeDetour?.waypoints?.map((p: any, idx: number) => (
              <Marker
                key={`detour-wp-${idx}`}
                latitude={p.lat}
                longitude={p.lng}
                anchor="center"
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#FF8A00',
                      border: '1.5px solid #fff',
                      boxShadow: '0 0 6px rgba(0,0,0,0.5)'
                    }}
                  />
                  <div
                    style={{
                      background: 'rgba(11,15,25,0.9)',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '9px',
                      fontWeight: 600,
                      marginTop: '4px',
                      whiteSpace: 'nowrap',
                      border: '1px solid rgba(255,255,255,0.1)',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                    }}
                  >
                    {p.name || `Esquina ${idx + 1}`}
                  </div>
                </div>
              </Marker>
            ))}

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