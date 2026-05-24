'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus, Search, ChevronDown, X, Star, MapPin, Bell, Settings,
  LogOut, Heart, ChevronRight, User, Sliders, Moon, Globe,
  Navigation as NavIcon, LayoutDashboard
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { BusPosition, BusLine, BusStop } from '@/types'
import {
  MOCK_LINES, MOCK_STOPS, initMockBuses, tickMockBuses, getMockBusesForLine
} from '@/lib/mockData'
import ReportModal from '@/components/user/ReportModal'
import BusInfoSheet from '@/components/user/BusInfoSheet'
import LineSelector from '@/components/user/LineSelector'
import NearbyStops from '@/components/user/NearbyStops'

const BA = { longitude: -58.4173, latitude: -34.6037 }
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// ─── Panels ──────────────────────────────────────────────────────────────────
type Panel = 'map' | 'favourites' | 'settings' | 'profile'

// ─── Persisted preferences ───────────────────────────────────────────────────
interface UserPrefs {
  favBusLines: string[]        // line ids
  favStops: string[]           // stop ids
  notifyNearbyBus: boolean
  notifyNearbyRadius: number   // km
  notifyFavLines: boolean
  darkMap: boolean
  language: 'es' | 'en'
  fontSize: 'normal' | 'large'
  showPassengerCount: boolean
  autoZoomOnBus: boolean
}

const DEFAULT_PREFS: UserPrefs = {
  favBusLines: [],
  favStops: [],
  notifyNearbyBus: true,
  notifyNearbyRadius: 0.5,
  notifyFavLines: true,
  darkMap: true,
  language: 'es',
  fontSize: 'normal',
  showPassengerCount: true,
  autoZoomOnBus: true,
}

function loadPrefs(): UserPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem('tubus_user_prefs')
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}

function savePrefs(p: UserPrefs) {
  localStorage.setItem('tubus_user_prefs', JSON.stringify(p))
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function UserMapPage() {
  const supabase = createClient()
  const channelRef    = useRef<any>(null)
  const mockTickRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const [user, setUser] = useState<any>(null)

  const [buses, setBuses]         = useState<BusPosition[]>([])
  const [lines, setLines]         = useState<BusLine[]>([])
  const [selectedLine, setSelectedLine]       = useState<BusLine | null>(null)
  const [selectedBus, setSelectedBus]         = useState<BusPosition | null>(null)
  const [showReport, setShowReport]           = useState(false)
  const [showLineSelector, setShowLineSelector] = useState(false)
  const [nearbyStops, setNearbyStops]         = useState<BusStop[]>([])
  const [viewState, setViewState]             = useState({ ...BA, zoom: 13, pitch: 30, bearing: 0 })
  const [activePanel, setActivePanel]         = useState<Panel>('map')
  const [sidebarOpen, setSidebarOpen]         = useState(false)
  const [prefs, setPrefs]                     = useState<UserPrefs>(DEFAULT_PREFS)
  const [lineStops, setLineStops]             = useState<BusStop[]>([])
  const [useMockBuses, setUseMockBuses]       = useState(false)

  // Load user + prefs
  useEffect(() => {
    setPrefs(loadPrefs())
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUser(user)
    })
    supabase.from('bus_lines').select('*').eq('is_active', true).then(({ data }) => {
      if (data && data.length > 0) setLines(data)
      else setLines(MOCK_LINES)
    })
    // Initialize mock bus simulator
    initMockBuses()
  }, [])

  const updatePrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs(prev => {
      const next = { ...prev, ...patch }
      savePrefs(next)
      return next
    })
  }, [])

  // Subscribe to real buses; fall back to mock if none come in
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    if (mockTickRef.current) clearInterval(mockTickRef.current)
    setBuses([])
    setLineStops([])
    setUseMockBuses(false)

    if (!selectedLine) return

    // Show stops for selected line from mock data
    setLineStops(MOCK_STOPS[selectedLine.id] || [])

    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    supabase.from('bus_positions')
      .select('*,profiles!driver_id(name)')
      .eq('line_id', selectedLine.id)
      .neq('status', 'offline')
      .gte('timestamp', cutoff)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBuses(data as unknown as BusPosition[])
        } else {
          // No real buses → activate mock simulator
          setUseMockBuses(true)
          const initial = getMockBusesForLine(selectedLine.id)
          setBuses(initial)

          mockTickRef.current = setInterval(() => {
            const ticked = tickMockBuses()
            const forLine = ticked.filter(b => b.line_id === selectedLine.id)
            setBuses([...forLine])
          }, 1000)
        }
      })

    channelRef.current = supabase
      .channel(`line-${selectedLine.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_positions', filter: `line_id=eq.${selectedLine.id}` },
        async () => {
          const { data } = await supabase.from('bus_positions')
            .select('*,profiles!driver_id(name)')
            .eq('line_id', selectedLine.id)
            .neq('status', 'offline')
            .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          if (data && data.length > 0) {
            // Real data came in — stop mock
            if (mockTickRef.current) { clearInterval(mockTickRef.current); setUseMockBuses(false) }
            setBuses(data as unknown as BusPosition[])
          }
        })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (mockTickRef.current) clearInterval(mockTickRef.current)
    }
  }, [selectedLine])

  const handleLocated = useCallback((e: any) => {
    const { latitude, longitude } = e.coords
    supabase.rpc('get_nearby_stops', { user_lat: latitude, user_lng: longitude })
      .then(({ data }) => { if (data) setNearbyStops(data) })
  }, [])

  const handleBusClick = (bus: BusPosition) => {
    setSelectedBus(bus)
    if (prefs.autoZoomOnBus) {
      setViewState(v => ({ ...v, longitude: bus.longitude, latitude: bus.latitude, zoom: 15 }))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const allLines = lines.length > 0 ? lines : MOCK_LINES

  const navItems: { id: Panel; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'map',        label: 'Mapa',         icon: LayoutDashboard },
    { id: 'favourites', label: 'Favoritos',     icon: Heart },
    { id: 'settings',   label: 'Preferencias',  icon: Sliders },
    { id: 'profile',    label: 'Mi Perfil',      icon: User },
  ]

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--void)' }}>

      {/* ── MAP (always rendered) ── */}
      <Map
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapboxAccessToken={TOKEN}
        mapStyle={prefs.darkMap ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/navigation-day-v1'}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" trackUserLocation showUserHeading onGeolocate={handleLocated as any} />

        {/* Bus markers */}
        {buses.map(bus => (
          <Marker key={bus.id} longitude={bus.longitude} latitude={bus.latitude} anchor="center" rotation={bus.heading} rotationAlignment="map" onClick={() => handleBusClick(bus)}>
            <PremiumBusMarker bus={bus} lineColor={selectedLine?.color || '#B8C8E0'} isSelected={selectedBus?.id === bus.id} showPassengers={prefs.showPassengerCount} />
          </Marker>
        ))}

        {/* Line stops */}
        {lineStops.map((stop: BusStop) => {
          const isFav = prefs.favStops.includes(stop.id)
          return (
            <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
              <div
                style={{
                  width: isFav ? '14px' : '10px',
                  height: isFav ? '14px' : '10px',
                  borderRadius: '50%',
                  background: isFav ? (selectedLine?.color || '#B8C8E0') : 'rgba(184,200,224,0.5)',
                  border: `2px solid ${isFav ? (selectedLine?.color || '#B8C8E0') : 'rgba(184,200,224,0.25)'}`,
                  boxShadow: isFav ? `0 0 10px ${selectedLine?.color || '#B8C8E0'}80` : '0 0 6px rgba(184,200,224,0.3)',
                  cursor: 'pointer',
                }}
                onClick={() => updatePrefs({ favStops: prefs.favStops.includes(stop.id) ? prefs.favStops.filter(id => id !== stop.id) : [...prefs.favStops, stop.id] })}
                title={stop.name}
              />
            </Marker>
          )
        })}

        {/* Nearby stops (when no line selected) */}
        {nearbyStops.map((stop: BusStop) => (
          <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(184,200,224,0.6)', border: '2px solid rgba(184,200,224,0.3)', boxShadow: '0 0 8px rgba(184,200,224,0.3)' }} />
          </Marker>
        ))}

        {selectedBus && (
          <Popup longitude={selectedBus.longitude} latitude={selectedBus.latitude} anchor="bottom" offset={44} closeButton={false} onClose={() => setSelectedBus(null)}>
            <MiniPopup bus={selectedBus} />
          </Popup>
        )}
      </Map>

      {/* ── SIDEBAR ── */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 40, backdropFilter: 'blur(4px)' }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              style={{
                position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px', zIndex: 50,
                background: 'linear-gradient(180deg,rgba(14,20,30,0.99),rgba(8,12,18,0.99))',
                border: '0 solid rgba(184,200,224,0.1)', borderRightWidth: '1px',
                display: 'flex', flexDirection: 'column', padding: '0 0 24px',
              }}
            >
              {/* Sidebar header */}
              <div style={{ padding: '24px 20px 16px', borderBottom: '1px solid rgba(184,200,224,0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(145deg,#1E2638,#131921)', border: '1px solid rgba(184,200,224,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Bus size={18} style={{ color: 'var(--platinum)' }} />
                  </div>
                  <div>
                    <div className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '16px' }}>TuBus</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono' }}>{user?.email || 'usuario'}</div>
                  </div>
                  <button onClick={() => setSidebarOpen(false)} style={{ marginLeft: 'auto', width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <X size={13} style={{ color: 'var(--text-muted)' }} />
                  </button>
                </div>
              </div>

              {/* Nav items */}
              <div style={{ flex: 1, padding: '12px 12px 0' }}>
                {navItems.map(item => {
                  const Icon = item.icon
                  const active = activePanel === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActivePanel(item.id); setSidebarOpen(false) }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '12px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                        marginBottom: '4px',
                        background: active ? 'rgba(184,200,224,0.1)' : 'transparent',
                        transition: 'background 150ms',
                      }}
                    >
                      <Icon size={17} style={{ color: active ? 'var(--platinum)' : 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '14px', fontWeight: active ? 600 : 400 }}>{item.label}</span>
                      {active && <ChevronRight size={13} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />}
                    </button>
                  )
                })}
              </div>

              {/* Mock badge */}
              {useMockBuses && (
                <div style={{ margin: '8px 12px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#FB923C', flexShrink: 0 }} />
                  <span style={{ color: '#FB923C', fontSize: '11px', fontFamily: 'DM Mono' }}>Buses simulados activos</span>
                </div>
              )}

              {/* Logout */}
              <div style={{ padding: '0 12px' }}>
                <div style={{ height: '1px', background: 'rgba(184,200,224,0.08)', marginBottom: '12px' }} />
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: 'rgba(255,77,106,0.06)', transition: 'background 150ms' }}
                >
                  <LogOut size={17} style={{ color: '#FF4D6A', flexShrink: 0 }} />
                  <span style={{ color: '#FF4D6A', fontSize: '14px', fontWeight: 500 }}>Cerrar sesión</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── TOP BAR ── */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '16px 16px 0' }}>
        <motion.div
          initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 26, stiffness: 200 }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(145deg,rgba(19,25,33,0.97),rgba(10,14,20,0.99))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(184,200,224,0.12)', borderRadius: '16px', padding: '10px 14px', boxShadow: '0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(184,200,224,0.06) inset', position: 'relative', overflow: 'hidden' }}
        >
          <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '1px', background: 'linear-gradient(90deg,transparent,rgba(184,200,224,0.3),transparent)' }} />

          {/* Menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(145deg,#1E2638,#131921)', border: '1px solid rgba(184,200,224,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Bus size={16} style={{ color: 'var(--platinum)' }} />
          </button>

          <div style={{ width: '1px', height: '24px', background: 'rgba(184,200,224,0.1)', flexShrink: 0 }} />

          {/* Line selector trigger */}
          <button
            onClick={() => setShowLineSelector(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
          >
            {selectedLine ? (
              <>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedLine.color, flexShrink: 0, boxShadow: `0 0 8px ${selectedLine.color}80` }} />
                <span className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px', letterSpacing: '-0.01em' }}>Línea {selectedLine.line_number}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, display: 'none' }} className="sm:block">{selectedLine.name.split(' - ')[1]}</span>
              </>
            ) : (
              <>
                <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', fontFamily: 'DM Sans' }}>Elegí una línea...</span>
              </>
            )}
            <ChevronDown size={14} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
          </button>

          {selectedLine && (
            <button
              onClick={e => { e.stopPropagation(); setSelectedLine(null); setBuses([]) }}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          )}

          {/* Fav toggle for selected line */}
          {selectedLine && (
            <button
              onClick={() => updatePrefs({
                favBusLines: prefs.favBusLines.includes(selectedLine.id)
                  ? prefs.favBusLines.filter(id => id !== selectedLine.id)
                  : [...prefs.favBusLines, selectedLine.id]
              })}
              style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
              title="Guardar como favorita"
            >
              <Star size={12} style={{ color: prefs.favBusLines.includes(selectedLine.id) ? '#F59E0B' : 'var(--text-muted)', fill: prefs.favBusLines.includes(selectedLine.id) ? '#F59E0B' : 'none' }} />
            </button>
          )}

          {buses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '999px', background: 'rgba(34,211,160,0.08)', border: '1px solid rgba(34,211,160,0.2)', flexShrink: 0 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--go)', animation: 'pulseNeon 2s ease-in-out infinite' }} />
              <span style={{ color: 'var(--go)', fontSize: '11px', fontFamily: 'DM Mono', fontWeight: 600 }}>{buses.length} en ruta</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── PANEL OVERLAYS ── */}
      <AnimatePresence>
        {activePanel === 'favourites' && (
          <FavouritesPanel
            prefs={prefs}
            lines={allLines}
            onSelectLine={l => { setSelectedLine(l); setActivePanel('map') }}
            onUpdatePrefs={updatePrefs}
            onClose={() => setActivePanel('map')}
          />
        )}
        {activePanel === 'settings' && (
          <SettingsPanel prefs={prefs} onUpdatePrefs={updatePrefs} onClose={() => setActivePanel('map')} />
        )}
        {activePanel === 'profile' && (
          <ProfilePanel user={user} onLogout={handleLogout} onClose={() => setActivePanel('map')} />
        )}
      </AnimatePresence>

      {/* ── BOTTOM SHEETS ── */}
      <AnimatePresence>
        {selectedBus ? (
          <BusInfoSheet key="bus" bus={selectedBus} onClose={() => setSelectedBus(null)} onReport={() => setShowReport(true)} />
        ) : nearbyStops.length > 0 && !selectedLine ? (
          <NearbyStops key="stops" stops={nearbyStops} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showLineSelector && (
          <LineSelector
            lines={allLines}
            selectedLine={selectedLine}
            onSelect={l => { setSelectedLine(l); setShowLineSelector(false) }}
            onClose={() => setShowLineSelector(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && selectedBus && (
          <ReportModal bus={selectedBus} onClose={() => setShowReport(false)} />
        )}
      </AnimatePresence>

      {/* ── BOTTOM NAV ── */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, padding: '0 16px 20px' }}>
        <motion.div
          initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 26, stiffness: 200, delay: 0.1 }}
          style={{ display: 'flex', gap: '4px', background: 'linear-gradient(145deg,rgba(19,25,33,0.97),rgba(10,14,20,0.99))', backdropFilter: 'blur(24px)', border: '1px solid rgba(184,200,224,0.12)', borderRadius: '16px', padding: '6px', boxShadow: '0 -4px 30px rgba(0,0,0,0.5)' }}
        >
          {navItems.map(item => {
            const Icon = item.icon
            const active = activePanel === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', padding: '10px 4px 8px', borderRadius: '12px', border: 'none', cursor: 'pointer', background: active ? 'rgba(184,200,224,0.1)' : 'transparent', transition: 'background 150ms' }}
              >
                <Icon size={18} style={{ color: active ? 'var(--platinum)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '10px', color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'DM Sans', fontWeight: active ? 600 : 400 }}>{item.label}</span>
              </button>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

// ─── Favourites Panel ─────────────────────────────────────────────────────────
function FavouritesPanel({ prefs, lines, onSelectLine, onUpdatePrefs, onClose }: {
  prefs: UserPrefs
  lines: BusLine[]
  onSelectLine: (l: BusLine) => void
  onUpdatePrefs: (p: Partial<UserPrefs>) => void
  onClose: () => void
}) {
  const favLines = lines.filter(l => prefs.favBusLines.includes(l.id))
  const allStops = Object.values(MOCK_STOPS).flat()
  const favStops = allStops.filter(s => prefs.favStops.includes(s.id))

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', paddingTop: '80px' }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px' }}>
        {/* Fav Lines */}
        <SectionHeader icon={<Bus size={14} />} title="Líneas favoritas" />
        {favLines.length === 0 ? (
          <EmptyHint text="Tocá ★ en el mapa para guardar una línea" />
        ) : favLines.map(line => (
          <FavLineCard key={line.id} line={line} onSelect={() => onSelectLine(line)} onRemove={() => onUpdatePrefs({ favBusLines: prefs.favBusLines.filter(id => id !== line.id) })} />
        ))}

        {/* Fav Stops */}
        <SectionHeader icon={<MapPin size={14} />} title="Paradas favoritas" style={{ marginTop: '20px' }} />
        {favStops.length === 0 ? (
          <EmptyHint text="Tocá una parada en el mapa para guardarla" />
        ) : favStops.map(stop => (
          <FavStopCard key={stop.id} stop={stop} onRemove={() => onUpdatePrefs({ favStops: prefs.favStops.filter(id => id !== stop.id) })} />
        ))}

        {/* Notification toggles */}
        <SectionHeader icon={<Bell size={14} />} title="Notificaciones" style={{ marginTop: '20px' }} />
        <GlassCard>
          <ToggleRow
            label="Aviso cuando un bus favorito está cerca"
            value={prefs.notifyFavLines}
            onChange={v => onUpdatePrefs({ notifyFavLines: v })}
          />
          <Divider />
          <ToggleRow
            label="Aviso cuando hay un bus cercano"
            value={prefs.notifyNearbyBus}
            onChange={v => onUpdatePrefs({ notifyNearbyBus: v })}
          />
          {prefs.notifyNearbyBus && (
            <div style={{ padding: '10px 16px 4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Sans', flex: 1 }}>Radio: {prefs.notifyNearbyRadius} km</span>
              <input
                type="range" min="0.2" max="2" step="0.1"
                value={prefs.notifyNearbyRadius}
                onChange={e => onUpdatePrefs({ notifyNearbyRadius: parseFloat(e.target.value) })}
                style={{ width: '120px', accentColor: 'var(--platinum)' }}
              />
            </div>
          )}
        </GlassCard>
      </div>
    </motion.div>
  )
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ prefs, onUpdatePrefs, onClose }: { prefs: UserPrefs; onUpdatePrefs: (p: Partial<UserPrefs>) => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', paddingTop: '80px' }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px' }}>
        <SectionHeader icon={<Moon size={14} />} title="Apariencia" />
        <GlassCard>
          <ToggleRow label="Mapa oscuro" value={prefs.darkMap} onChange={v => onUpdatePrefs({ darkMap: v })} />
          <Divider />
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'DM Sans' }}>Idioma</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['es', 'en'] as const).map(lang => (
                <button key={lang} onClick={() => onUpdatePrefs({ language: lang })} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(184,200,224,0.15)', background: prefs.language === lang ? 'rgba(184,200,224,0.15)' : 'transparent', color: prefs.language === lang ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Mono', textTransform: 'uppercase' }}>{lang}</button>
              ))}
            </div>
          </div>
        </GlassCard>

        <SectionHeader icon={<NavIcon size={14} />} title="Mapa y viaje" style={{ marginTop: '20px' }} />
        <GlassCard>
          <ToggleRow label="Zoom automático al tocar bus" value={prefs.autoZoomOnBus} onChange={v => onUpdatePrefs({ autoZoomOnBus: v })} />
          <Divider />
          <ToggleRow label="Mostrar cantidad de pasajeros" value={prefs.showPassengerCount} onChange={v => onUpdatePrefs({ showPassengerCount: v })} />
        </GlassCard>

        <SectionHeader icon={<Globe size={14} />} title="Accesibilidad" style={{ marginTop: '20px' }} />
        <GlassCard>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'DM Sans' }}>Tamaño de texto</span>
            <div style={{ display: 'flex', gap: '4px' }}>
              {(['normal', 'large'] as const).map(size => (
                <button key={size} onClick={() => onUpdatePrefs({ fontSize: size })} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(184,200,224,0.15)', background: prefs.fontSize === size ? 'rgba(184,200,224,0.15)' : 'transparent', color: prefs.fontSize === size ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans' }}>{size === 'normal' ? 'Normal' : 'Grande'}</button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Coming soon */}
        <SectionHeader icon={<Sliders size={14} />} title="Próximamente" style={{ marginTop: '20px' }} />
        <GlassCard>
          {['Historial de viajes', 'Recargar SUBE desde app', 'Alertas de demora por línea', 'Compartir ubicación con contactos'].map(item => (
            <div key={item}>
              <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans' }}>{item}</span>
                <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '999px', background: 'rgba(184,200,224,0.06)', color: 'var(--text-muted)', fontFamily: 'DM Mono', border: '1px solid rgba(184,200,224,0.1)' }}>pronto</span>
              </div>
              <Divider />
            </div>
          ))}
        </GlassCard>
      </div>
    </motion.div>
  )
}

// ─── Profile Panel ────────────────────────────────────────────────────────────
function ProfilePanel({ user, onLogout, onClose }: { user: any; onLogout: () => void; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      style={{ position: 'fixed', inset: 0, zIndex: 20, display: 'flex', flexDirection: 'column', paddingTop: '80px' }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 120px' }}>
        {/* Avatar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 24px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'linear-gradient(145deg,#1E2638,#0A0E14)', border: '2px solid rgba(184,200,224,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(184,200,224,0.1)' }}>
            <User size={32} style={{ color: 'var(--platinum-dim)' }} />
          </div>
        </div>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '18px', marginBottom: '4px' }}>{user?.user_metadata?.name || 'Usuario'}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Mono' }}>{user?.email || '—'}</div>
        </div>

        <GlassCard>
          <ProfileRow label="Correo" value={user?.email || '—'} />
          <Divider />
          <ProfileRow label="Rol" value="Pasajero" />
          <Divider />
          <ProfileRow label="Miembro desde" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('es-AR') : '—'} />
        </GlassCard>

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={onLogout}
            style={{ width: '100%', padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,77,106,0.3)', background: 'rgba(255,77,106,0.06)', color: '#FF4D6A', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Small components ─────────────────────────────────────────────────────────
function SectionHeader({ icon, title, style }: { icon: React.ReactNode; title: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', ...style }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
    </div>
  )
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'linear-gradient(145deg,rgba(19,25,33,0.95),rgba(10,14,20,0.97))', border: '1px solid rgba(184,200,224,0.1)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: 'rgba(184,200,224,0.06)', margin: '0 16px' }} />
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'DM Sans', flex: 1 }}>{label}</span>
      <button
        onClick={() => onChange(!value)}
        style={{ width: '42px', height: '24px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: value ? 'rgba(34,211,160,0.8)' : 'rgba(184,200,224,0.15)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}
      >
        <div style={{ position: 'absolute', top: '3px', left: value ? '21px' : '3px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
      </button>
    </div>
  )
}

function FavLineCard({ line, onSelect, onRemove }: { line: BusLine; onSelect: () => void; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'linear-gradient(145deg,rgba(19,25,33,0.95),rgba(10,14,20,0.97))', border: '1px solid rgba(184,200,224,0.1)', marginBottom: '6px', cursor: 'pointer' }} onClick={onSelect}>
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: line.color, flexShrink: 0, boxShadow: `0 0 8px ${line.color}80` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>Línea {line.line_number}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name}</div>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={14} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  )
}

function FavStopCard({ stop, onRemove }: { stop: BusStop; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', borderRadius: '14px', background: 'linear-gradient(145deg,rgba(19,25,33,0.95),rgba(10,14,20,0.97))', border: '1px solid rgba(184,200,224,0.1)', marginBottom: '6px' }}>
      <MapPin size={14} style={{ color: 'var(--platinum-dim)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{stop.name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono' }}>{stop.street_name}</div>
      </div>
      <button onClick={onRemove} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={14} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Sans', borderRadius: '14px', border: '1px dashed rgba(184,200,224,0.12)', marginBottom: '8px' }}>{text}</div>
  )
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'DM Sans' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'DM Mono' }}>{value}</span>
    </div>
  )
}

// ─── Premium Bus Marker ───────────────────────────────────────────────────────
function PremiumBusMarker({ bus, lineColor, isSelected, showPassengers }: { bus: BusPosition; lineColor: string; isSelected: boolean; showPassengers: boolean }) {
  const isMoving = bus.status === 'moving'
  const color = isMoving ? lineColor : bus.status === 'at_stop' ? '#F0B429' : '#FF4D6A'

  return (
    <div className={`bus-marker ${isSelected ? 'selected' : ''}`} style={{ position: 'relative', width: '48px', height: '48px', cursor: 'pointer' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {isMoving && <>
          <circle cx="24" cy="24" r="20" fill={color} fillOpacity="0.06" className="bus-ring-1" />
          <circle cx="24" cy="24" r="16" fill={color} fillOpacity="0.08" className="bus-ring-2" />
        </>}
        <circle cx="24" cy="24" r="14" fill={color} fillOpacity={isSelected ? 0.25 : 0.12} />
        <circle cx="24" cy="24" r="13" fill="none" stroke={color} strokeOpacity={isSelected ? 0.8 : 0.4} strokeWidth="1" />
        <circle cx="24" cy="24" r="10" fill={color} fillOpacity={isMoving ? 0.9 : 0.7} />
        <path d="M18 20h12v7H18zM18 21.5h12M18 24.5h12M20 27v1.5M28 27v1.5M19 20v-1c0-.6.4-1 1-1h8c.6 0 1 .4 1 1v1" stroke="rgba(6,8,16,0.9)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="11" r="2.5" fill={color} fillOpacity="0.5" />
        <circle cx="24" cy="11" r="1.5" fill="white" fillOpacity="0.7" />
      </svg>
      {showPassengers && bus.passenger_count > 0 && (
        <div style={{ position: 'absolute', top: '-2px', right: '-2px', minWidth: '16px', height: '16px', borderRadius: '8px', background: 'rgba(10,14,20,0.95)', border: '1px solid rgba(184,200,224,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px' }}>
          <span style={{ fontSize: '9px', fontFamily: 'DM Mono', fontWeight: 600, color: 'var(--platinum-dim)' }}>{bus.passenger_count}</span>
        </div>
      )}
    </div>
  )
}

// ─── Mini popup ───────────────────────────────────────────────────────────────
function MiniPopup({ bus }: { bus: BusPosition }) {
  const statusLabel: Record<string, string> = { moving: 'En movimiento', stopped: 'Detenido', at_stop: 'En parada', offline: 'Sin señal' }
  const statusColor: Record<string, string> = { moving: 'var(--go)', stopped: 'var(--halt)', at_stop: 'var(--near)', offline: 'var(--text-muted)' }

  return (
    <div style={{ padding: '14px 16px', minWidth: '200px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '9px', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bus size={14} style={{ color: 'var(--platinum)' }} />
        </div>
        <div>
          <div className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '14px' }}>Unidad {bus.bus_unit}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono' }}>{bus.driver_name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statusColor[bus.status] }} />
        <span style={{ color: statusColor[bus.status], fontSize: '11px', fontFamily: 'DM Mono' }}>{statusLabel[bus.status]}</span>
        {bus.eta_minutes != null && (
          <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', marginLeft: 'auto' }}>· {bus.eta_minutes}m</span>
        )}
      </div>
      {bus.next_stop_name && (
        <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MapPin size={10} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono' }}>{bus.next_stop_name}</span>
        </div>
      )}
    </div>
  )
}