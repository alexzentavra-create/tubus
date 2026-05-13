'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { BusPosition, BusLine } from '@/types'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseBusTrackingReturn {
  buses: BusPosition[]
  isLoading: boolean
  error: string | null
  lastUpdate: Date | null
  refresh: () => void
}

/**
 * Real-time hook that subscribes to bus positions for a given line.
 * Automatically reconnects and handles stale data cleanup.
 */
export function useBusTracking(line: BusLine | null): UseBusTrackingReturn {
  const supabase = createClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const staleTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [buses, setBuses] = useState<BusPosition[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchBuses = useCallback(async (lineId: string) => {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data, error } = await supabase
      .from('bus_positions')
      .select(`
        id, driver_id, bus_unit, latitude, longitude,
        heading, speed_kmh, status, passenger_count,
        eta_minutes, timestamp,
        profiles!driver_id ( name ),
        bus_lines!line_id ( line_number, color ),
        bus_stops!next_stop_id ( name, street_name )
      `)
      .eq('line_id', lineId)
      .neq('status', 'offline')
      .gte('timestamp', cutoff)

    if (error) {
      setError(error.message)
      return
    }

    const mapped = (data || []).map((b: any) => ({
      ...b,
      driver_name: b.profiles?.name || 'Chofer',
      line_number: b.bus_lines?.line_number || '',
      next_stop_name: b.bus_stops?.name,
    })) as BusPosition[]

    setBuses(mapped)
    setLastUpdate(new Date())
    setError(null)
  }, [])

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (staleTimerRef.current) {
      clearInterval(staleTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!line) {
      setBuses([])
      cleanup()
      return
    }

    setIsLoading(true)
    fetchBuses(line.id).finally(() => setIsLoading(false))

    // Subscribe to realtime changes
    channelRef.current = supabase
      .channel(`buses-line-${line.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bus_positions',
          filter: `line_id=eq.${line.id}`,
        },
        () => fetchBuses(line.id)
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setError('Error de conexión en tiempo real')
        }
      })

    // Cleanup stale buses every 30s (remove buses not updated in 5+ min)
    staleTimerRef.current = setInterval(() => {
      const cutoff = Date.now() - 5 * 60 * 1000
      setBuses(prev => prev.filter(b => new Date(b.timestamp).getTime() > cutoff))
    }, 30_000)

    return cleanup
  }, [line?.id])

  return {
    buses,
    isLoading,
    error,
    lastUpdate,
    refresh: () => line && fetchBuses(line.id),
  }
}

/**
 * Hook for the driver side — publishes GPS position on an interval.
 */
export function useDriverTracking(options: {
  driverId: string
  lineId: string
  busUnit: string
  passengerCount: number
  enabled: boolean
}) {
  const supabase = createClient()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const watchIdRef = useRef<number | null>(null)
  const lastPosRef = useRef<GeolocationCoordinates | null>(null)

  const [position, setPosition] = useState<GeolocationCoordinates | null>(null)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  useEffect(() => {
    if (!options.enabled || !options.driverId) {
      // Stop tracking
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    if (!navigator.geolocation) {
      setPermissionError('Este dispositivo no soporta GPS')
      return
    }

    // Watch GPS position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastPosRef.current = pos.coords
        setPosition(pos.coords)
        setPermissionError(null)
      },
      (err) => setPermissionError(err.message),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    )

    // Publish to Supabase every 5 seconds
    intervalRef.current = setInterval(async () => {
      const coords = lastPosRef.current
      if (!coords) return

      const speed = coords.speed ? Math.round(coords.speed * 3.6) : 0
      await supabase.from('bus_positions').upsert({
        driver_id: options.driverId,
        line_id: options.lineId,
        bus_unit: options.busUnit,
        latitude: coords.latitude,
        longitude: coords.longitude,
        heading: Math.round(coords.heading || 0),
        speed_kmh: speed,
        status: speed > 2 ? 'moving' : 'stopped',
        passenger_count: options.passengerCount,
        timestamp: new Date().toISOString(),
      }, { onConflict: 'driver_id' })
    }, 5000)

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [options.enabled, options.driverId, options.passengerCount])

  return { position, permissionError }
}