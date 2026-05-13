'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Search, ChevronDown, AlertTriangle, Users, Clock, MapPin, X, Star } from 'lucide-react'
import { createClient, subscribeToBusLine } from '@/lib/supabase'
import type { BusPosition, BusLine, BusStop } from '@/types'
import ReportModal from '@/components/user/ReportModal'
import BusInfoSheet from '@/components/user/BusInfoSheet'
import LineSelector from '@/components/user/LineSelector'
import NearbyStops from '@/components/user/NearbyStops'

const BUENOS_AIRES_CENTER = { longitude: -58.4173, latitude: -34.6037 }
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export default function UserMapPage() {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof subscribeToBusLine> | null>(null)

  const [buses, setBuses] = useState<BusPosition[]>([])
  const [lines, setLines] = useState<BusLine[]>([])
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null)
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [showLineSelector, setShowLineSelector] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [nearbyStops, setNearbyStops] = useState<BusStop[]>([])
  const [viewState, setViewState] = useState({
    ...BUENOS_AIRES_CENTER,
    zoom: 13,
    pitch: 30,
    bearing: 0,
  })

  // Load bus lines
  useEffect(() => {
    supabase.from('bus_lines').select('*').eq('is_active', true).then(({ data }) => {
      if (data) setLines(data)
    })
  }, [])

  // Subscribe to selected line
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }
    if (!selectedLine) {
      setBuses([])
      return
    }

    // Initial fetch
    supabase
      .from('bus_positions')
      .select(`*, profiles!driver_id(name)`)
      .eq('line_id', selectedLine.id)
      .neq('status', 'offline')
      .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      .then(({ data }) => {
        if (data) setBuses(data as unknown as BusPosition[])
      })

    // Live subscription
    channelRef.current = subscribeToBusLine(selectedLine.id, setBuses)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [selectedLine])

  const handleBusClick = (bus: BusPosition) => {
    setSelectedBus(bus)
    setViewState(v => ({
      ...v,
      longitude: bus.longitude,
      latitude: bus.latitude,
      zoom: 15,
    }))
  }

  const handleUserLocated = useCallback((e: GeolocationPosition) => {
    const { latitude, longitude } = e.coords
    setUserLocation({ lat: latitude, lng: longitude })
    // Load nearby stops
    supabase.rpc('get_nearby_stops', { user_lat: latitude, user_lng: longitude })
      .then(({ data }) => { if (data) setNearbyStops(data) })
  }, [])

  const getBusColor = (bus: BusPosition) => {
    if (bus.status === 'moving') return '#22C55E'
    if (bus.status === 'at_stop') return '#F59E0B'
    return '#EF4444'
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-night-950">
      {/* ─── MAP ──────────────────────────────────────────────────────── */}
      <Map
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        style={{ width: '100%', height: '100%' }}
        onLoad={e => {
          // Slightly tinted dark map — feel like a transit app
          e.target.setPaintProperty('background', 'background-color', '#1A2327')
        }}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl
          position="bottom-right"
          trackUserLocation
          showUserHeading
          onGeolocate={handleUserLocated as unknown as (e: GeolocationPosition) => void}
        />

        {/* ── Bus markers ── */}
        {buses.map(bus => (
          <Marker
            key={bus.id}
            longitude={bus.longitude}
            latitude={bus.latitude}
            anchor="center"
            rotation={bus.heading}
            rotationAlignment="map"
            onClick={() => handleBusClick(bus)}
          >
            <BusMarker
              bus={bus}
              color={selectedLine?.color || getBusColor(bus)}
              isSelected={selectedBus?.id === bus.id}
            />
          </Marker>
        ))}

        {/* ── Nearby stop markers ── */}
        {nearbyStops.map((stop: BusStop) => (
          <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="bottom">
            <div className="w-3 h-3 rounded-full bg-bus-400 border-2 border-white shadow-lg" />
          </Marker>
        ))}

        {/* ── Selected bus popup ── */}
        {selectedBus && (
          <Popup
            longitude={selectedBus.longitude}
            latitude={selectedBus.latitude}
            anchor="bottom"
            offset={40}
            closeButton={false}
            onClose={() => setSelectedBus(null)}
          >
            <MiniPopup bus={selectedBus} onViewDetails={() => {}} />
          </Popup>
        )}
      </Map>

      {/* ─── TOP BAR ──────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-10 safe-top">
        <div className="mx-4 mt-4">
          <motion.div
            className="glass-panel px-4 py-3 flex items-center gap-3"
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 25 }}
          >
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-bus-500 flex items-center justify-center">
                <Bus size={16} className="text-white" />
              </div>
              <span className="font-bold text-sm text-white hidden sm:block">BusTrack AR</span>
            </div>

            <div className="w-px h-6 bg-white/10" />

            {/* Line selector button */}
            <button
              className="flex-1 flex items-center gap-2 text-left"
              onClick={() => setShowLineSelector(true)}
            >
              {selectedLine ? (
                <>
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ background: selectedLine.color }}
                  />
                  <span className="text-white font-medium text-sm truncate">
                    Línea {selectedLine.line_number}
                  </span>
                  <span className="text-night-300 text-xs truncate hidden sm:block">
                    {selectedLine.name.split(' - ')[1]}
                  </span>
                </>
              ) : (
                <>
                  <Search size={15} className="text-night-300 shrink-0" />
                  <span className="text-night-300 text-sm">Elegí una línea...</span>
                </>
              )}
              <ChevronDown size={15} className="text-night-300 ml-auto shrink-0" />
            </button>

            {/* Live count */}
            {buses.length > 0 && (
              <div className="flex items-center gap-1.5 bg-moving/10 border border-moving/30 rounded-lg px-3 py-1 shrink-0">
                <div className="w-2 h-2 rounded-full bg-moving animate-pulse" />
                <span className="text-moving text-xs font-medium">{buses.length} colectivos</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* ─── BOTTOM: Nearby stops or bus info ──────────────────────────── */}
      <AnimatePresence>
        {selectedBus ? (
          <BusInfoSheet
            key="bus-info"
            bus={selectedBus}
            onClose={() => setSelectedBus(null)}
            onReport={() => setShowReport(true)}
          />
        ) : nearbyStops.length > 0 && !selectedLine ? (
          <NearbyStops key="nearby" stops={nearbyStops} />
        ) : null}
      </AnimatePresence>

      {/* ─── LINE SELECTOR MODAL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showLineSelector && (
          <LineSelector
            lines={lines}
            selectedLine={selectedLine}
            onSelect={line => {
              setSelectedLine(line)
              setShowLineSelector(false)
            }}
            onClose={() => setShowLineSelector(false)}
          />
        )}
      </AnimatePresence>

      {/* ─── REPORT MODAL ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showReport && selectedBus && (
          <ReportModal
            bus={selectedBus}
            onClose={() => setShowReport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Bus Marker SVG Component ───────────────────────────────────────────────

function BusMarker({ bus, color, isSelected }: { bus: BusPosition; color: string; isSelected: boolean }) {
  const isMoving = bus.status === 'moving'

  return (
    <div className={`bus-marker ${isMoving ? 'bus-marker-moving' : ''}`}>
      <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
        {/* Pulse ring */}
        {isMoving && (
          <>
            <circle cx="22" cy="22" r="18" fill={color} opacity="0.15" className="bus-ring" />
            <circle cx="22" cy="22" r="14" fill={color} opacity="0.1" />
          </>
        )}
        {/* Outer ring */}
        <circle cx="22" cy="22" r="16" fill={color} opacity={isSelected ? 1 : 0.2} />
        {/* Main circle */}
        <circle
          cx="22"
          cy="22"
          r={isSelected ? 13 : 11}
          fill={color}
          className="bus-dot"
        />
        {/* Bus icon */}
        <path
          d="M16 17h12v8H16zM16 18h12M16 22h12M18 25v2M26 25v2M17 18v-1c0-.5.5-1 1-1h8c.5 0 1 .5 1 1v1"
          stroke="white"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Direction indicator */}
        <circle cx="22" cy="10" r="2" fill="white" opacity="0.6" />
      </svg>
      {/* Passenger count badge */}
      {bus.passenger_count > 0 && (
        <div
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-night-900 border border-white/20 flex items-center justify-center"
          style={{ fontSize: 9, color: '#90A4AE' }}
        >
          {bus.passenger_count}
        </div>
      )}
    </div>
  )
}

// ─── Mini popup shown when clicking a bus on the map ────────────────────────

function MiniPopup({ bus, onViewDetails }: { bus: BusPosition; onViewDetails: () => void }) {
  const statusLabels: Record<string, string> = {
    moving: 'En movimiento',
    stopped: 'Detenido',
    at_stop: 'En parada',
    offline: 'Sin señal',
  }

  return (
    <div className="p-4 min-w-[220px]">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg bg-bus-500/20 flex items-center justify-center">
          <Bus size={16} className="text-bus-400" />
        </div>
        <div>
          <div className="text-white font-semibold text-sm">Unidad {bus.bus_unit}</div>
          <div className="text-night-300 text-xs">{bus.driver_name}</div>
        </div>
      </div>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            bus.status === 'moving' ? 'bg-moving' : bus.status === 'at_stop' ? 'bg-approaching' : 'bg-stopped'
          }`} />
          <span className="text-night-300">{statusLabels[bus.status]}</span>
        </div>
        {bus.eta_minutes !== undefined && (
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-night-300" />
            <span className="text-night-300">Próxima parada en {bus.eta_minutes} min</span>
          </div>
        )}
        {bus.passenger_count > 0 && (
          <div className="flex items-center gap-2">
            <Users size={12} className="text-night-300" />
            <span className="text-night-300">{bus.passenger_count} usuarios en este colectivo</span>
          </div>
        )}
      </div>
    </div>
  )
}