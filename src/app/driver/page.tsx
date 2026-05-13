'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bus, Navigation, Wifi, WifiOff, Users, MapPin, Power, AlertCircle } from 'lucide-react'
import { publishDriverLocation } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

const LOCATION_INTERVAL_MS = 5000  // broadcast every 5 seconds

interface DriverSession {
  driverId: string
  driverName: string
  busUnit: string
  lineId: string
  lineName: string
  lineNumber: string
}

export default function DriverPage() {
  const supabase = createClient()
  const watchIdRef = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPositionRef = useRef<GeolocationPosition | null>(null)

  const [session, setSession] = useState<DriverSession | null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [passengerCount, setPassengerCount] = useState(0)
  const [currentPosition, setCurrentPosition] = useState<{lat: number; lng: number; heading: number; speed: number} | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [status, setStatus] = useState<'moving' | 'stopped' | 'at_stop'>('stopped')
  const [tripDuration, setTripDuration] = useState(0)
  const startTimeRef = useRef<Date | null>(null)

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }

      // Load driver profile
      const { data: profile } = await supabase
        .from('driver_profiles')
        .select('*, profiles!id(name), bus_lines!line_id(id, line_number, name)')
        .eq('id', user.id)
        .single()

      if (profile) {
        setSession({
          driverId: user.id,
          driverName: (profile.profiles as { name: string }).name,
          busUnit: profile.bus_unit,
          lineId: profile.line_id,
          lineName: (profile.bus_lines as { name: string }).name,
          lineNumber: (profile.bus_lines as { line_number: string }).line_number,
        })
      }
    })
  }, [])

  // Trip timer
  useEffect(() => {
    if (!isOnline) return
    startTimeRef.current = new Date()
    const t = setInterval(() => {
      if (startTimeRef.current) {
        setTripDuration(Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000))
      }
    }, 1000)
    return () => clearInterval(t)
  }, [isOnline])

  const startTracking = useCallback(() => {
    if (!session) return

    if (!navigator.geolocation) {
      toast.error('Tu dispositivo no soporta GPS')
      return
    }

    // Request persistent background location permission
    navigator.geolocation.getCurrentPosition(
      () => {
        setGpsError(null)

        // Continuous watch
        watchIdRef.current = navigator.geolocation.watchPosition(
          pos => {
            lastPositionRef.current = pos
            const { latitude, longitude, heading, speed, accuracy } = pos.coords
            setCurrentPosition({
              lat: latitude,
              lng: longitude,
              heading: heading || 0,
              speed: speed ? Math.round(speed * 3.6) : 0,  // m/s → km/h
            })
            setStatus(speed && speed > 2 ? 'moving' : 'stopped')
          },
          err => setGpsError(err.message),
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 2000,
          }
        )

        // Broadcast interval (separate from watch — limits Supabase writes)
        intervalRef.current = setInterval(async () => {
          const pos = lastPositionRef.current
          if (!pos || !session) return
          await publishDriverLocation({
            driverId: session.driverId,
            lineId: session.lineId,
            busUnit: session.busUnit,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading || 0,
            speedKmh: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0,
            status: pos.coords.speed && pos.coords.speed > 2 ? 'moving' : 'stopped',
            passengerCount,
          })
        }, LOCATION_INTERVAL_MS)

        setIsOnline(true)
        toast.success('¡GPS activado! Los pasajeros ya pueden verte.')
      },
      err => {
        setGpsError(`No se pudo acceder al GPS: ${err.message}`)
        toast.error('Permiso de ubicación denegado')
      },
      { enableHighAccuracy: true }
    )
  }, [session, passengerCount])

  const stopTracking = useCallback(async () => {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)

    // Mark offline in DB
    if (session) {
      await publishDriverLocation({
        driverId: session.driverId,
        lineId: session.lineId,
        busUnit: session.busUnit,
        lat: lastPositionRef.current?.coords.latitude || 0,
        lng: lastPositionRef.current?.coords.longitude || 0,
        heading: 0,
        speedKmh: 0,
        status: 'stopped',
        passengerCount: 0,
      })
    }

    setIsOnline(false)
    setCurrentPosition(null)
    setTripDuration(0)
    toast('Turno finalizado')
  }, [session])

  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}h ${m}m`
    return `${m}m ${sec}s`
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-night-950 flex items-center justify-center">
        <div className="text-night-400 animate-pulse">Cargando perfil...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night-950 text-white safe-top safe-bottom p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-xl bg-bus-500/20 border border-bus-500/30 flex items-center justify-center">
          <Bus size={24} className="text-bus-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold">BusTrack AR</h1>
          <p className="text-night-400 text-sm">Panel del Chofer</p>
        </div>
        <div className={`ml-auto flex items-center gap-2 px-3 py-1.5 rounded-full border ${
          isOnline
            ? 'bg-moving/10 border-moving/30 text-moving'
            : 'bg-night-800 border-night-700 text-night-400'
        }`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="text-xs font-medium">{isOnline ? 'En línea' : 'Offline'}</span>
        </div>
      </div>

      {/* Driver info card */}
      <div className="glass-panel p-5 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-night-400 text-xs mb-1">Nombre</div>
            <div className="text-white font-semibold">{session.driverName}</div>
          </div>
          <div>
            <div className="text-night-400 text-xs mb-1">Unidad</div>
            <div className="text-white font-semibold">{session.busUnit}</div>
          </div>
          <div>
            <div className="text-night-400 text-xs mb-1">Línea</div>
            <div className="text-white font-semibold">Línea {session.lineNumber}</div>
          </div>
          <div>
            <div className="text-night-400 text-xs mb-1">Recorrido</div>
            <div className="text-white font-semibold text-xs truncate">{session.lineName.split(' - ')[1]}</div>
          </div>
        </div>
      </div>

      {/* GPS Error */}
      {gpsError && (
        <div className="flex items-start gap-3 bg-stopped/10 border border-stopped/30 rounded-xl p-4 mb-4">
          <AlertCircle size={18} className="text-stopped shrink-0 mt-0.5" />
          <div>
            <div className="text-stopped font-medium text-sm">Error de GPS</div>
            <div className="text-stopped/70 text-xs mt-0.5">{gpsError}</div>
          </div>
        </div>
      )}

      {/* Live stats — visible when online */}
      {isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-3 gap-3 mb-4"
        >
          <div className="glass-panel p-4 text-center">
            <div className="text-2xl font-bold text-white">{currentPosition?.speed ?? 0}</div>
            <div className="text-night-400 text-xs">km/h</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-2xl font-bold text-white">{passengerCount}</div>
            <div className="text-night-400 text-xs">pasajeros</div>
          </div>
          <div className="glass-panel p-4 text-center">
            <div className="text-lg font-bold text-white">{formatDuration(tripDuration)}</div>
            <div className="text-night-400 text-xs">en turno</div>
          </div>
        </motion.div>
      )}

      {/* Passenger counter */}
      {isOnline && (
        <div className="glass-panel p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Users size={16} className="text-bus-400" />
            <span className="text-white font-medium">Pasajeros en el colectivo</span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <button
              className="w-12 h-12 rounded-full bg-night-800 border border-night-700 text-white text-2xl font-bold flex items-center justify-center hover:bg-night-700 transition-colors"
              onClick={() => setPassengerCount(p => Math.max(0, p - 1))}
            >
              −
            </button>
            <span className="text-4xl font-bold text-white w-16 text-center">{passengerCount}</span>
            <button
              className="w-12 h-12 rounded-full bg-bus-500 text-white text-2xl font-bold flex items-center justify-center hover:bg-bus-600 transition-colors"
              onClick={() => setPassengerCount(p => p + 1)}
            >
              +
            </button>
          </div>
        </div>
      )}

      {/* GPS position display */}
      {isOnline && currentPosition && (
        <div className="glass-panel p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Navigation size={14} className="text-moving" />
            <span className="text-white text-sm font-medium">Posición actual</span>
            <div className="ml-auto w-2 h-2 rounded-full bg-moving animate-pulse" />
          </div>
          <div className="text-night-300 text-xs font-mono">
            {currentPosition.lat.toFixed(6)}, {currentPosition.lng.toFixed(6)}
          </div>
          <div className="text-night-400 text-xs mt-1">
            Rumbo: {Math.round(currentPosition.heading)}° · {status === 'moving' ? 'En movimiento' : 'Detenido'}
          </div>
        </div>
      )}

      {/* Start/Stop button */}
      <motion.button
        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-colors ${
          isOnline
            ? 'bg-stopped/20 border-2 border-stopped text-stopped hover:bg-stopped/30'
            : 'bg-moving text-white hover:bg-green-600'
        }`}
        onClick={isOnline ? stopTracking : startTracking}
        whileTap={{ scale: 0.97 }}
      >
        <Power size={22} />
        {isOnline ? 'Finalizar turno' : 'Iniciar turno'}
      </motion.button>

      {!isOnline && (
        <p className="text-center text-night-500 text-xs mt-3">
          Al iniciar el turno, tu posición GPS será visible para los pasajeros en tiempo real
        </p>
      )}
    </div>
  )
}