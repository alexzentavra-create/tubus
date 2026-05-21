'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus, Search, MapPin, Navigation, ChevronUp, ChevronDown,
  X, Clock, Users, Gauge, AlertTriangle, Star, LogOut, Menu
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { BusPosition, BusLine } from '@/types'
import toast from 'react-hot-toast'

const BA_CENTER = { longitude: -58.4173, latitude: -34.6037 }
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// ─── Bus marker SVG ───────────────────────────────────────────────────────────
function BusMarker({ color, selected, moving }: { color: string; selected: boolean; moving: boolean }) {
  return (
    <div style={{ cursor: 'pointer', filter: selected ? `drop-shadow(0 0 10px ${color})` : 'drop-shadow(0 3px 8px rgba(0,0,0,0.8))', transition: 'filter 300ms', transform: selected ? 'scale(1.2)' : 'scale(1)', transformOrigin: 'center' }}>
      <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
        {moving && <>
          <circle cx="20" cy="20" r="18" fill={color} fillOpacity="0.1" style={{ animation: 'busRingPulse 2s ease-out infinite' }} />
          <circle cx="20" cy="20" r="14" fill={color} fillOpacity="0.08" style={{ animation: 'busRingPulse 2s ease-out 0.7s infinite' }} />
        </>}
        <circle cx="20" cy="20" r="11" fill={color} fillOpacity={selected ? 0.9 : 0.75} />
        <circle cx="20" cy="20" r="12" fill="none" stroke={color} strokeOpacity={0.9} strokeWidth="1.5" />
        <path d="M14 17h12v7H14zM14 18.5h12M14 21.5h12M16 24v2M24 24v2M15 17v-1c0-.5.4-1 1-1h8c.5 0 1 .5 1 1v1" stroke="rgba(0,0,0,0.8)" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

export default function UserMapPage() {
  const supabase = createClient()
  const channelRef = useRef<any>(null)

  const [user, setUser] = useState<any>(null)
  const [buses, setBuses] = useState<BusPosition[]>([])
  const [lines, setLines] = useState<BusLine[]>([])
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null)
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null)
  const [showLineSearch, setShowLineSearch] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [reportType, setReportType] = useState('')
  const [reportDesc, setReportDesc] = useState('')
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [viewState, setViewState] = useState({ ...BA_CENTER, zoom: 13, pitch: 0 })
  const [mapLoaded, setMapLoaded] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      setUser(user)
    })
    // Load bus lines
    supabase.from('bus_lines').select('*').eq('is_active', true)
      .then(({ data }) => { if (data) setLines(data) })
  }, [])

  // Subscribe to buses on selected line
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    setBuses([])
    if (!selectedLine) return

    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    supabase.from('bus_positions')
      .select('*, profiles!driver_id(name)')
      .eq('line_id', selectedLine.id)
      .neq('status', 'offline')
      .gte('timestamp', cutoff)
      .then(({ data }) => { if (data) setBuses(data as any) })

    channelRef.current = supabase
      .channel(`line-${selectedLine.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_positions', filter: `line_id=eq.${selectedLine.id}` },
        async () => {
          const cutoff2 = new Date(Date.now() - 5 * 60 * 1000).toISOString()
          const { data } = await supabase.from('bus_positions')
            .select('*, profiles!driver_id(name)')
            .eq('line_id', selectedLine.id)
            .neq('status', 'offline')
            .gte('timestamp', cutoff2)
          if (data) setBuses(data as any)
        })
      .subscribe()

    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [selectedLine?.id])

  const handleBusClick = (bus: BusPosition) => {
    setSelectedBus(bus)
    setViewState(v => ({ ...v, longitude: bus.longitude, latitude: bus.latitude, zoom: 15 }))
  }

  const handleLocated = (e: any) => {
    setUserLocation({ lat: e.coords.latitude, lng: e.coords.longitude })
  }

  const submitReport = async () => {
    if (!reportType || !selectedBus) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Tenés que estar logueado'); return }
    await supabase.from('reports').insert({
      reporter_id: user.id,
      driver_id: selectedBus.driver_id,
      line_id: selectedBus.line_id,
      bus_unit: selectedBus.bus_unit,
      type: reportType,
      description: reportDesc || reportType,
    })
    toast.success('Denuncia enviada')
    setShowReportModal(false)
    setReportType(''); setReportDesc('')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const filteredLines = lines.filter(l =>
    l.line_number.includes(searchQuery) ||
    l.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const statusLabel: Record<string, string> = { moving: 'En movimiento', stopped: 'Detenido', at_stop: 'En parada', offline: 'Sin señal' }
  const statusColor: Record<string, string> = { moving: '#22D3A0', stopped: '#FF4D6A', at_stop: '#F0B429', offline: '#4A5568' }

  const REPORT_TYPES = [
    { id: 'no_paro', label: 'No paró', emoji: '🚌' },
    { id: 'conduccion_peligrosa', label: 'Conducción peligrosa', emoji: '⚠️' },
    { id: 'mal_trato', label: 'Mal trato', emoji: '😤' },
    { id: 'vehiculo_defectuoso', label: 'Vehículo defectuoso', emoji: '🔧' },
    { id: 'no_llego', label: 'No llegó', emoji: '❓' },
    { id: 'otro', label: 'Otro', emoji: '📋' },
  ]

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#07090F' }}>

      {/* MAP */}
      <Map
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapboxAccessToken={TOKEN}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        style={{ width: '100%', height: '100%' }}
        onLoad={() => setMapLoaded(true)}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl
          position="bottom-right"
          trackUserLocation
          showUserHeading
          onGeolocate={handleLocated as any}
        />

        {buses.map(bus => (
          <Marker
            key={bus.id}
            longitude={bus.longitude}
            latitude={bus.latitude}
            anchor="center"
            rotation={bus.heading}
            rotationAlignment="map"
            onClick={e => { e.originalEvent.stopPropagation(); handleBusClick(bus) }}
          >
            <BusMarker
              color={selectedLine?.color || '#22D3A0'}
              selected={selectedBus?.id === bus.id}
              moving={bus.status === 'moving'}
            />
          </Marker>
        ))}
      </Map>

      {/* TOP BAR */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20, padding: '12px 14px 0' }}>
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 24 }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(12,16,26,0.92)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '10px 12px', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', position: 'relative' }}
        >
          {/* Top shine */}
          <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)' }} />

          {/* Logo */}
          <button onClick={() => setMenuOpen(m => !m)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(145deg,rgba(34,211,160,0.2),rgba(34,211,160,0.05))', border: '1px solid rgba(34,211,160,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
            <Bus size={16} style={{ color: '#22D3A0' }} />
          </button>

          <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />

          {/* Line selector */}
          <button
            onClick={() => setShowLineSearch(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            {selectedLine ? (
              <>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedLine.color, flexShrink: 0, boxShadow: `0 0 8px ${selectedLine.color}80` }} />
                <div>
                  <div style={{ color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px' }}>Línea {selectedLine.line_number}</div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontFamily: 'DM Mono' }}>{selectedLine.name.split(' - ')[1]?.slice(0,30)}</div>
                </div>
              </>
            ) : (
              <>
                <Search size={14} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontFamily: 'DM Sans' }}>Elegí una línea...</span>
              </>
            )}
          </button>

          {selectedLine && (
            <button onClick={() => { setSelectedLine(null); setSelectedBus(null) }} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <X size={13} style={{ color: 'rgba(255,255,255,0.5)' }} />
            </button>
          )}

          {buses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 9px', borderRadius: '999px', background: 'rgba(34,211,160,0.1)', border: '1px solid rgba(34,211,160,0.25)', flexShrink: 0 }}>
              <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22D3A0', animation: 'pulseNeon 2s ease-in-out infinite' }} />
              <span style={{ color: '#22D3A0', fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 600 }}>{buses.length}</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* MENU DROPDOWN */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 25 }} onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              style={{ position: 'absolute', top: '76px', left: '14px', zIndex: 30, background: 'rgba(12,16,26,0.97)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', padding: '8px', width: '200px', boxShadow: '0 8px 32px rgba(0,0,0,0.7)' }}
            >
              {user && <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid rgba(255,255,255,0.07)', marginBottom: '6px' }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>SESIÓN INICIADA</div>
                <div style={{ color: '#fff', fontSize: '12px', fontFamily: 'DM Sans', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
              </div>}
              <button onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 10px', borderRadius: '9px', background: 'rgba(255,77,106,0.06)', border: '1px solid rgba(255,77,106,0.15)', color: '#FF4D6A', fontSize: '13px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                <LogOut size={14} /> Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* LINE SEARCH MODAL */}
      <AnimatePresence>
        {showLineSearch && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)', zIndex: 40 }}
              onClick={() => setShowLineSearch(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 200 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: 'rgba(12,16,26,0.98)', backdropFilter: 'blur(32px)', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 -8px 48px rgba(0,0,0,0.8)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 6px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div style={{ padding: '0 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', margin: 0 }}>Elegí una línea</h3>
                <button onClick={() => setShowLineSearch(false)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>
              <div style={{ padding: '0 16px 12px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    autoFocus
                    placeholder="Buscar por número o recorrido..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: '100%', padding: '12px 14px 12px 36px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              <div style={{ overflowY: 'auto', padding: '0 12px 24px', flex: 1 }}>
                {filteredLines.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Mono', fontSize: '13px' }}>Sin resultados</div>
                ) : filteredLines.map(line => (
                  <button key={line.id} onClick={() => { setSelectedLine(line); setShowLineSearch(false); setSearchQuery('') }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px', border: `1px solid ${selectedLine?.id === line.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`, background: selectedLine?.id === line.id ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.02)', marginBottom: '6px', cursor: 'pointer', textAlign: 'left', transition: 'all 180ms' }}
                  >
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: line.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${line.color}50` }}>
                      <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '13px', color: '#fff' }}>{line.line_number}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: '#fff', fontWeight: 500, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name.split(' - ')[1] || line.name}</div>
                      <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', fontFamily: 'DM Mono', marginTop: '2px' }}>{line.company}</div>
                    </div>
                    {selectedLine?.id === line.id && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22D3A0', flexShrink: 0 }} />}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* BUS INFO BOTTOM SHEET */}
      <AnimatePresence>
        {selectedBus && !showLineSearch && (
          <motion.div
            key="bus-sheet"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 200 }}
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'rgba(12,16,26,0.98)', backdropFilter: 'blur(32px)', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', boxShadow: '0 -8px 48px rgba(0,0,0,0.8)', paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
            </div>

            <div style={{ padding: '10px 20px 22px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '13px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bus size={22} style={{ color: selectedLine?.color || '#22D3A0' }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff' }}>Unidad {selectedBus.bus_unit}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor[selectedBus.status] || '#4A5568' }} />
                      <span style={{ color: statusColor[selectedBus.status], fontSize: '12px', fontFamily: 'DM Mono' }}>{statusLabel[selectedBus.status]}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedBus(null)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                </button>
              </div>

              {/* Driver info */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '12px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: 'DM Mono', letterSpacing: '0.06em', marginBottom: '3px' }}>CHOFER</div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{(selectedBus as any).profiles?.name || (selectedBus as any).driver_name || 'Chofer'}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', padding: '6px 10px' }}>
                  <Star size={12} style={{ color: '#F0B429', fill: '#F0B429' }} />
                  <span style={{ color: '#fff', fontFamily: 'DM Mono', fontWeight: 700, fontSize: '13px' }}>4.8</span>
                </div>
              </div>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {[
                  { icon: Gauge, label: 'km/h', value: selectedBus.speed_kmh ?? 0 },
                  { icon: Clock, label: 'prox. parada', value: selectedBus.eta_minutes != null ? `${selectedBus.eta_minutes}m` : '—' },
                  { icon: Users, label: 'a bordo', value: selectedBus.passenger_count },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '20px', color: '#fff', lineHeight: 1 }}>{value}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '3px' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button onClick={() => setShowReportModal(true)} style={{ padding: '13px', borderRadius: '12px', background: 'rgba(255,77,106,0.08)', border: '1px solid rgba(255,77,106,0.2)', color: '#FF4D6A', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'DM Sans' }}>
                  <AlertTriangle size={14} /> Denunciar
                </button>
                <button style={{ padding: '13px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontFamily: 'DM Sans' }}>
                  <Users size={14} /> Estoy a bordo
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EMPTY STATE — no line selected */}
      {!selectedLine && !showLineSearch && mapLoaded && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 20, padding: '0 16px', paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}
        >
          <button
            onClick={() => setShowLineSearch(true)}
            style={{ width: '100%', padding: '16px 20px', background: 'rgba(12,16,26,0.95)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', boxShadow: '0 -4px 32px rgba(0,0,0,0.6)', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.15),transparent)' }} />
            <div style={{ width: '40px', height: '40px', borderRadius: '11px', background: 'linear-gradient(145deg,rgba(34,211,160,0.15),rgba(34,211,160,0.05))', border: '1px solid rgba(34,211,160,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Bus size={18} style={{ color: '#22D3A0' }} />
            </div>
            <div style={{ flex: 1, textAlign: 'left' }}>
              <div style={{ color: '#fff', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '15px' }}>Seleccioná una línea</div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', fontFamily: 'DM Sans', marginTop: '2px' }}>Ver colectivos en tiempo real</div>
            </div>
            <ChevronUp size={18} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
          </button>
        </motion.div>
      )}

      {/* REPORT MODAL */}
      <AnimatePresence>
        {showReportModal && selectedBus && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 60 }}
              onClick={() => setShowReportModal(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28 }}
              style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70, background: 'rgba(12,16,26,0.99)', backdropFilter: 'blur(32px)', borderRadius: '24px 24px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none', padding: '0 0 max(env(safe-area-inset-bottom),20px)', boxShadow: '0 -8px 48px rgba(0,0,0,0.8)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.15)' }} />
              </div>
              <div style={{ padding: '10px 20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                  <h3 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '18px', color: '#fff', margin: 0 }}>Denunciar colectivo</h3>
                  <button onClick={() => setShowReportModal(false)} style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {REPORT_TYPES.map(rt => (
                    <button key={rt.id} onClick={() => setReportType(rt.id)}
                      style={{ padding: '12px', borderRadius: '12px', border: `1px solid ${reportType === rt.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.07)'}`, background: reportType === rt.id ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)', textAlign: 'left', cursor: 'pointer', transition: 'all 180ms' }}>
                      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{rt.emoji}</div>
                      <div style={{ color: reportType === rt.id ? '#fff' : 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: 500, fontFamily: 'DM Sans' }}>{rt.label}</div>
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Descripción opcional..."
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#fff', fontSize: '14px', fontFamily: 'DM Sans', outline: 'none', resize: 'none', boxSizing: 'border-box', marginBottom: '12px' }}
                />
                <button onClick={submitReport} disabled={!reportType}
                  style={{ width: '100%', padding: '14px', borderRadius: '12px', background: reportType ? '#ffffff' : 'rgba(255,255,255,0.2)', color: '#07090F', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '14px', border: 'none', cursor: reportType ? 'pointer' : 'not-allowed', transition: 'all 200ms' }}>
                  Enviar denuncia
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}