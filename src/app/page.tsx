'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus, Search, ChevronDown, X, Star, MapPin, Bell,
  LogOut, Heart, ChevronRight, User, Sliders, Moon, Globe,
  Navigation as NavIcon, LayoutDashboard, Menu
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { BusPosition, BusLine, BusStop } from '@/types'
import {
  MOCK_LINES, MOCK_STOPS, initMockBuses, tickMockBuses, getMockBusesForLine, getLineBounds, getMockStopsForLine, getMockRoutePathForLine
} from '@/lib/mockData'
import ReportModal from '@/components/user/ReportModal'
import BusInfoSheet from '@/components/user/BusInfoSheet'
import LineSelector from '@/components/user/LineSelector'
import NearbyStops from '@/components/user/NearbyStops'

const BA = { longitude: -58.4173, latitude: -34.6037 }
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

type Panel = 'map' | 'favourites' | 'settings' | 'profile'

interface UserPrefs {
  favBusLines: string[]
  favStops: string[]
  notifyNearbyBus: boolean
  notifyNearbyRadius: number
  notifyFavLines: boolean
  darkMap: boolean
  language: 'es' | 'en'
  fontSize: 'normal' | 'large'
  showPassengerCount: boolean
  autoZoomOnBus: boolean
}

const DEFAULT_PREFS: UserPrefs = {
  favBusLines: [], favStops: [],
  notifyNearbyBus: true, notifyNearbyRadius: 0.5, notifyFavLines: true,
  darkMap: true, language: 'es', fontSize: 'normal',
  showPassengerCount: true, autoZoomOnBus: true,
}

function loadPrefs(): UserPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem('tubus_user_prefs')
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}
function savePrefs(p: UserPrefs) { localStorage.setItem('tubus_user_prefs', JSON.stringify(p)) }

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Panel; label: string; icon: any }[] = [
  { id: 'map',        label: 'Mapa',        icon: LayoutDashboard },
  { id: 'favourites', label: 'Favoritos',   icon: Heart },
  { id: 'settings',   label: 'Preferencias', icon: Sliders },
  { id: 'profile',    label: 'Mi Perfil',   icon: User },
]

const SIDEBAR_W = 220

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function UserMapPage() {
  const supabase      = createClient()
  const channelRef    = useRef<any>(null)
  const mockTickRef   = useRef<ReturnType<typeof setInterval> | null>(null)

  const [user, setUser]                     = useState<any>(null)
  const [buses, setBuses]                   = useState<BusPosition[]>([])
  const [lines, setLines]                   = useState<BusLine[]>([])
  const [selectedLine, setSelectedLine]     = useState<BusLine | null>(null)
  const [selectedBus, setSelectedBus]       = useState<BusPosition | null>(null)
  const [showReport, setShowReport]         = useState(false)
  const [showLineSelector, setShowLineSelector] = useState(false)
  const [nearbyStops, setNearbyStops]       = useState<BusStop[]>([])
  const [viewState, setViewState]           = useState({ ...BA, zoom: 13, pitch: 30, bearing: 0 })
  const [activePanel, setActivePanel]       = useState<Panel>('map')
  const [prefs, setPrefs]                   = useState<UserPrefs>(DEFAULT_PREFS)
  const [lineStops, setLineStops]           = useState<BusStop[]>([])
  const [useMockBuses, setUseMockBuses]     = useState(false)
  const [collapsed, setCollapsed]           = useState(false)

  // ── init ──
  useEffect(() => {
    setPrefs(loadPrefs())
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUser(user) })
    supabase.from('bus_lines').select('*').eq('is_active', true).then(({ data }) => {
      const availableLines = data && data.length > 0 ? data : MOCK_LINES
      setLines(availableLines)
      setSelectedLine(current => current || availableLines[0] || null)
    })
  }, [])

  const updatePrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; savePrefs(next); return next })
  }, [])

  // ── line subscription + mock fallback ──
  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
    setBuses([])
    setLineStops([])
    setUseMockBuses(false)
    if (!selectedLine) return

    setLineStops(getMockStopsForLine(selectedLine))

    // Reinitialise simulator fresh for this line selection, then start ticking
    initMockBuses([selectedLine])
    const initial = getMockBusesForLine(selectedLine.id)
    setBuses(initial.length > 0 ? initial : [])
    setUseMockBuses(true)

    // Auto-fit map to the line's stops
    const bounds = getLineBounds(selectedLine)
    if (bounds) {
      const centerLat = (bounds.minLat + bounds.maxLat) / 2
      const centerLng = (bounds.minLng + bounds.maxLng) / 2
      setViewState(v => ({ ...v, latitude: centerLat, longitude: centerLng, zoom: 13, pitch: 0 }))
    }

    mockTickRef.current = setInterval(() => {
      const ticked = tickMockBuses().filter(b => b.line_id === selectedLine.id)
      setBuses([...ticked])
    }, 800)

    // Try real data; if found, replace mock
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    supabase.from('bus_positions')
      .select('*,profiles!driver_id(name)')
      .eq('line_id', selectedLine.id)
      .neq('status', 'offline')
      .gte('timestamp', cutoff)
      .then(({ data }) => {
        if (data && data.length > 0) {
          if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
          setUseMockBuses(false)
          setBuses(data as unknown as BusPosition[])
        }
      })

    channelRef.current = supabase
      .channel(`line-${selectedLine.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bus_positions', filter: `line_id=eq.${selectedLine.id}` },
        async () => {
          const { data } = await supabase.from('bus_positions')
            .select('*,profiles!driver_id(name)')
            .eq('line_id', selectedLine.id).neq('status', 'offline')
            .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())
          if (data && data.length > 0) {
            if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
            setUseMockBuses(false)
            setBuses(data as unknown as BusPosition[])
          }
        })
      .subscribe()

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
    }
  }, [selectedLine])

  const handleLocated = useCallback((e: any) => {
    const { latitude, longitude } = e.coords
    supabase.rpc('get_nearby_stops', { user_lat: latitude, user_lng: longitude })
      .then(({ data }) => { if (data) setNearbyStops(data) })
  }, [])

  const handleBusClick = (bus: BusPosition) => {
    setSelectedBus(bus)
    if (prefs.autoZoomOnBus)
      setViewState(v => ({ ...v, longitude: bus.longitude, latitude: bus.latitude, zoom: 15 }))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const allLines = lines.length > 0 ? lines : MOCK_LINES
  const sidebarW = collapsed ? 64 : SIDEBAR_W
  const selectedRoutePath = selectedLine ? getMockRoutePathForLine(selectedLine) : []
  const routeGeoJson = selectedLine && selectedRoutePath.length > 1 ? {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: selectedRoutePath.map(point => [point.lng, point.lat]),
    },
  } : null

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', background: '#060810' }}>

      {/* ═══════════════════════════════════════════════════════════════
          LEFT SIDEBAR — permanent, collapsible
      ═══════════════════════════════════════════════════════════════ */}
      <div
        style={{
          width: sidebarW, flexShrink: 0, height: '100vh',
          background: 'linear-gradient(180deg,rgba(14,20,30,0.99) 0%,rgba(8,12,18,0.99) 100%)',
          borderRight: '1px solid rgba(184,200,224,0.08)',
          display: 'flex', flexDirection: 'column',
          transition: 'width 220ms ease',
          overflow: 'hidden', zIndex: 20,
        }}
      >
        {/* Logo + collapse */}
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid rgba(184,200,224,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(145deg,#1E2638,#131921)', border: '1px solid rgba(184,200,224,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Bus size={16} style={{ color: 'var(--platinum)' }} />
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>TuBus</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'usuario'}</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ width: '26px', height: '26px', borderRadius: '8px', background: 'rgba(184,200,224,0.05)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <Menu size={12} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Mock badge */}
        {useMockBuses && !collapsed && (
          <div style={{ margin: '10px 10px 0', padding: '7px 10px', borderRadius: '9px', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#FB923C', flexShrink: 0 }} />
            <span style={{ color: '#FB923C', fontSize: '10px', fontFamily: 'DM Mono' }}>Buses simulados</span>
          </div>
        )}
        {useMockBuses && collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#FB923C' }} />
          </div>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon
            const active = activePanel === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActivePanel(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : '10px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: collapsed ? '12px 0' : '11px 12px',
                  borderRadius: '11px', border: 'none', cursor: 'pointer',
                  background: active ? 'rgba(184,200,224,0.1)' : 'transparent',
                  transition: 'background 140ms',
                }}
              >
                <Icon size={16} style={{ color: active ? 'var(--platinum)' : 'var(--text-muted)', flexShrink: 0 }} />
                {!collapsed && (
                  <span style={{ color: active ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: active ? 600 : 400, whiteSpace: 'nowrap' }}>
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '8px 8px 20px', borderTop: '1px solid rgba(184,200,224,0.07)' }}>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : '10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '12px 0' : '11px 12px',
              borderRadius: '11px', border: '1px solid rgba(255,77,106,0.15)',
              background: 'rgba(255,77,106,0.05)', cursor: 'pointer',
              transition: 'background 140ms',
            }}
          >
            <LogOut size={16} style={{ color: '#FF4D6A', flexShrink: 0 }} />
            {!collapsed && <span style={{ color: '#FF4D6A', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>Cerrar sesión</span>}
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT AREA — map + panels
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* ── MAP ── */}
        <Map
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          mapboxAccessToken={TOKEN}
          mapStyle={prefs.darkMap ? 'mapbox://styles/mapbox/navigation-night-v1' : 'mapbox://styles/mapbox/navigation-day-v1'}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl position="bottom-right" trackUserLocation showUserHeading onGeolocate={handleLocated as any} />

          {routeGeoJson && selectedLine && (
            <Source id="selected-route" type="geojson" data={routeGeoJson}>
              <Layer
                id="selected-route-glow"
                type="line"
                paint={{ 'line-color': selectedLine.color, 'line-width': 9, 'line-opacity': 0.18, 'line-blur': 2 }}
              />
              <Layer
                id="selected-route-line"
                type="line"
                paint={{ 'line-color': selectedLine.color, 'line-width': 3, 'line-opacity': 0.78 }}
              />
            </Source>
          )}

          {buses.map(bus => (
            <Marker key={bus.id} longitude={bus.longitude} latitude={bus.latitude} anchor="center" rotation={bus.heading} rotationAlignment="map" onClick={() => handleBusClick(bus)}>
              <PremiumBusMarker bus={bus} lineColor={selectedLine?.color || '#B8C8E0'} isSelected={selectedBus?.id === bus.id} showPassengers={prefs.showPassengerCount} />
            </Marker>
          ))}

          {lineStops.map((stop: BusStop) => {
            const isFav = prefs.favStops.includes(stop.id)
            return (
              <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
                <div
                  onClick={() => updatePrefs({ favStops: isFav ? prefs.favStops.filter(id => id !== stop.id) : [...prefs.favStops, stop.id] })}
                  title={stop.name}
                  style={{ width: isFav ? '14px' : '10px', height: isFav ? '14px' : '10px', borderRadius: '50%', background: isFav ? (selectedLine?.color || '#B8C8E0') : 'rgba(184,200,224,0.5)', border: `2px solid ${isFav ? (selectedLine?.color || '#B8C8E0') : 'rgba(184,200,224,0.25)'}`, boxShadow: isFav ? `0 0 10px ${selectedLine?.color || '#B8C8E0'}80` : '0 0 6px rgba(184,200,224,0.3)', cursor: 'pointer' }}
                />
              </Marker>
            )
          })}

          {nearbyStops.map((stop: BusStop) => (
            <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(184,200,224,0.6)', border: '2px solid rgba(184,200,224,0.3)' }} />
            </Marker>
          ))}

          {selectedBus && (
            <Popup longitude={selectedBus.longitude} latitude={selectedBus.latitude} anchor="bottom" offset={44} closeButton={false} onClose={() => setSelectedBus(null)}>
              <MiniPopup bus={selectedBus} />
            </Popup>
          )}
        </Map>

        {/* ── TOP BAR ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '14px 14px 0', pointerEvents: 'none' }}>
          <motion.div
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(145deg,rgba(19,25,33,0.97),rgba(10,14,20,0.99))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(184,200,224,0.12)', borderRadius: '14px', padding: '9px 12px', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}
          >
            <button
              onClick={() => setShowLineSelector(true)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
            >
              {selectedLine ? (
                <>
                  <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: selectedLine.color, flexShrink: 0, boxShadow: `0 0 8px ${selectedLine.color}80` }} />
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '14px' }}>Línea {selectedLine.line_number}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{selectedLine.name.split(' - ')[1]}</span>
                </>
              ) : (
                <>
                  <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Elegí una línea...</span>
                </>
              )}
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }} />
            </button>

            {selectedLine && (
              <>
                <button onClick={() => updatePrefs({ favBusLines: prefs.favBusLines.includes(selectedLine.id) ? prefs.favBusLines.filter(id => id !== selectedLine.id) : [...prefs.favBusLines, selectedLine.id] })}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <Star size={12} style={{ color: prefs.favBusLines.includes(selectedLine.id) ? '#F59E0B' : 'var(--text-muted)', fill: prefs.favBusLines.includes(selectedLine.id) ? '#F59E0B' : 'none' }} />
                </button>
                <button onClick={() => { setSelectedLine(null); setBuses([]) }}
                  style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                  <X size={12} style={{ color: 'var(--text-muted)' }} />
                </button>
              </>
            )}

            {buses.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px', borderRadius: '999px', background: 'rgba(34,211,160,0.08)', border: '1px solid rgba(34,211,160,0.2)', flexShrink: 0 }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--go)' }} />
                <span style={{ color: 'var(--go)', fontSize: '11px', fontFamily: 'DM Mono', fontWeight: 600 }}>{buses.length} en ruta</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── PANEL CONTENT (rendered INSIDE right area, slides in from top) ── */}
        <AnimatePresence>
          {activePanel !== 'map' && (
            <motion.div
              key={activePanel}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'absolute', inset: 0, zIndex: 15, overflowY: 'auto', paddingTop: '72px', paddingBottom: '20px', background: 'rgba(6,8,16,0.85)', backdropFilter: 'blur(12px)' }}
            >
              <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 16px' }}>
                {activePanel === 'favourites' && (
                  <FavouritesPanel prefs={prefs} lines={allLines} onSelectLine={l => { setSelectedLine(l); setActivePanel('map') }} onUpdatePrefs={updatePrefs} />
                )}
                {activePanel === 'settings' && (
                  <SettingsPanel prefs={prefs} onUpdatePrefs={updatePrefs} />
                )}
                {activePanel === 'profile' && (
                  <ProfilePanel user={user} onLogout={handleLogout} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── BOTTOM SHEETS ── */}
        <AnimatePresence>
          {selectedBus && activePanel === 'map' ? (
            <BusInfoSheet key="bus" bus={selectedBus} onClose={() => setSelectedBus(null)} onReport={() => setShowReport(true)} />
          ) : nearbyStops.length > 0 && !selectedLine && activePanel === 'map' ? (
            <NearbyStops key="stops" stops={nearbyStops} />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showLineSelector && (
            <LineSelector lines={allLines} selectedLine={selectedLine} onSelect={l => { setSelectedLine(l); setShowLineSelector(false) }} onClose={() => setShowLineSelector(false)} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReport && selectedBus && (
            <ReportModal bus={selectedBus} onClose={() => setShowReport(false)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// ─── Favourites Panel ─────────────────────────────────────────────────────────
function FavouritesPanel({ prefs, lines, onSelectLine, onUpdatePrefs }: {
  prefs: UserPrefs; lines: BusLine[]
  onSelectLine: (l: BusLine) => void
  onUpdatePrefs: (p: Partial<UserPrefs>) => void
}) {
  const favLines = lines.filter(l => prefs.favBusLines.includes(l.id))
  const allStops = Object.values(MOCK_STOPS).flat()
  const favStops = allStops.filter(s => prefs.favStops.includes(s.id))

  return (
    <div>
      <PanelTitle>Favoritos</PanelTitle>

      <SectionHeader icon={<Bus size={13} />} title="Líneas guardadas" />
      {favLines.length === 0 ? <EmptyHint text="Tocá ★ en el mapa para guardar una línea" /> : favLines.map(line => (
        <FavLineCard key={line.id} line={line} onSelect={() => onSelectLine(line)} onRemove={() => onUpdatePrefs({ favBusLines: prefs.favBusLines.filter(id => id !== line.id) })} />
      ))}

      <SectionHeader icon={<MapPin size={13} />} title="Paradas guardadas" style={{ marginTop: '20px' }} />
      {favStops.length === 0 ? <EmptyHint text="Tocá una parada en el mapa para guardarla" /> : favStops.map(stop => (
        <FavStopCard key={stop.id} stop={stop} onRemove={() => onUpdatePrefs({ favStops: prefs.favStops.filter(id => id !== stop.id) })} />
      ))}

      <SectionHeader icon={<Bell size={13} />} title="Notificaciones" style={{ marginTop: '20px' }} />
      <GlassCard>
        <ToggleRow label="Aviso cuando un bus favorito está cerca" value={prefs.notifyFavLines} onChange={v => onUpdatePrefs({ notifyFavLines: v })} />
        <Divider />
        <ToggleRow label="Aviso cuando hay un bus cercano" value={prefs.notifyNearbyBus} onChange={v => onUpdatePrefs({ notifyNearbyBus: v })} />
        {prefs.notifyNearbyBus && (
          <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', flex: 1 }}>Radio: {prefs.notifyNearbyRadius} km</span>
            <input type="range" min="0.2" max="2" step="0.1" value={prefs.notifyNearbyRadius}
              onChange={e => onUpdatePrefs({ notifyNearbyRadius: parseFloat(e.target.value) })}
              style={{ width: '120px', accentColor: 'var(--platinum)' }} />
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({ prefs, onUpdatePrefs }: { prefs: UserPrefs; onUpdatePrefs: (p: Partial<UserPrefs>) => void }) {
  return (
    <div>
      <PanelTitle>Preferencias</PanelTitle>

      <SectionHeader icon={<Moon size={13} />} title="Apariencia" />
      <GlassCard>
        <ToggleRow label="Mapa oscuro" value={prefs.darkMap} onChange={v => onUpdatePrefs({ darkMap: v })} />
        <Divider />
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Idioma</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['es', 'en'] as const).map(lang => (
              <button key={lang} onClick={() => onUpdatePrefs({ language: lang })} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(184,200,224,0.15)', background: prefs.language === lang ? 'rgba(184,200,224,0.15)' : 'transparent', color: prefs.language === lang ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textTransform: 'uppercase' }}>{lang}</button>
            ))}
          </div>
        </div>
      </GlassCard>

      <SectionHeader icon={<NavIcon size={13} />} title="Mapa y viaje" style={{ marginTop: '20px' }} />
      <GlassCard>
        <ToggleRow label="Zoom automático al tocar bus" value={prefs.autoZoomOnBus} onChange={v => onUpdatePrefs({ autoZoomOnBus: v })} />
        <Divider />
        <ToggleRow label="Mostrar cantidad de pasajeros" value={prefs.showPassengerCount} onChange={v => onUpdatePrefs({ showPassengerCount: v })} />
      </GlassCard>

      <SectionHeader icon={<Globe size={13} />} title="Accesibilidad" style={{ marginTop: '20px' }} />
      <GlassCard>
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Tamaño de texto</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['normal', 'large'] as const).map(sz => (
              <button key={sz} onClick={() => onUpdatePrefs({ fontSize: sz })} style={{ padding: '5px 12px', borderRadius: '8px', border: '1px solid rgba(184,200,224,0.15)', background: prefs.fontSize === sz ? 'rgba(184,200,224,0.15)' : 'transparent', color: prefs.fontSize === sz ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>{sz === 'normal' ? 'Normal' : 'Grande'}</button>
            ))}
          </div>
        </div>
      </GlassCard>

      <SectionHeader icon={<Sliders size={13} />} title="Próximamente" style={{ marginTop: '20px' }} />
      <GlassCard>
        {['Historial de viajes', 'Recargar SUBE desde app', 'Alertas de demora por línea', 'Compartir ubicación'].map((item, i, arr) => (
          <div key={item}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{item}</span>
              <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '999px', background: 'rgba(184,200,224,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(184,200,224,0.1)' }}>pronto</span>
            </div>
            {i < arr.length - 1 && <Divider />}
          </div>
        ))}
      </GlassCard>
    </div>
  )
}

// ─── Profile Panel ────────────────────────────────────────────────────────────
function ProfilePanel({ user, onLogout }: { user: any; onLogout: () => void }) {
  return (
    <div>
      <PanelTitle>Mi Perfil</PanelTitle>
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 20px' }}>
        <div style={{ width: '68px', height: '68px', borderRadius: '50%', background: 'linear-gradient(145deg,#1E2638,#0A0E14)', border: '2px solid rgba(184,200,224,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={28} style={{ color: 'var(--platinum-dim)' }} />
        </div>
      </div>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '17px', marginBottom: '3px' }}>{user?.user_metadata?.name || 'Usuario'}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Mono' }}>{user?.email || '—'}</div>
      </div>

      <GlassCard>
        <ProfileRow label="Correo" value={user?.email || '—'} />
        <Divider />
        <ProfileRow label="Rol" value="Pasajero" />
        <Divider />
        <ProfileRow label="Miembro desde" value={user?.created_at ? new Date(user.created_at).toLocaleDateString('es-AR') : '—'} />
      </GlassCard>

      <button
        onClick={onLogout}
        style={{ marginTop: '20px', width: '100%', padding: '13px', borderRadius: '13px', border: '1px solid rgba(255,77,106,0.3)', background: 'rgba(255,77,106,0.06)', color: '#FF4D6A', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
      >
        <LogOut size={15} />
        Cerrar sesión
      </button>
    </div>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────
function PanelTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '20px', marginBottom: '20px', letterSpacing: '-0.02em' }}>{children}</h2>
}

function SectionHeader({ icon, title, style }: { icon: React.ReactNode; title: string; style?: React.CSSProperties }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px', ...style }}>
      <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</span>
    </div>
  )
}

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: 'linear-gradient(145deg,rgba(19,25,33,0.95),rgba(10,14,20,0.97))', border: '1px solid rgba(184,200,224,0.1)', borderRadius: '14px', overflow: 'hidden', marginBottom: '6px' }}>
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
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flex: 1 }}>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{ width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: value ? 'rgba(34,211,160,0.8)' : 'rgba(184,200,224,0.15)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '2px', left: value ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }} />
      </button>
    </div>
  )
}

function FavLineCard({ line, onSelect, onRemove }: { line: BusLine; onSelect: () => void; onRemove: () => void }) {
  return (
    <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', borderRadius: '13px', background: 'rgba(19,25,33,0.95)', border: '1px solid rgba(184,200,224,0.1)', marginBottom: '5px', cursor: 'pointer' }}>
      <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: line.color, flexShrink: 0, boxShadow: `0 0 8px ${line.color}80` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>Línea {line.line_number}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name}</div>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={13} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  )
}

function FavStopCard({ stop, onRemove }: { stop: BusStop; onRemove: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', borderRadius: '13px', background: 'rgba(19,25,33,0.95)', border: '1px solid rgba(184,200,224,0.1)', marginBottom: '5px' }}>
      <MapPin size={13} style={{ color: 'var(--platinum-dim)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500 }}>{stop.name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono' }}>{stop.street_name}</div>
      </div>
      <button onClick={onRemove} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
        <X size={13} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', borderRadius: '12px', border: '1px dashed rgba(184,200,224,0.12)', marginBottom: '6px' }}>{text}</div>
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{label}</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', fontFamily: 'DM Mono' }}>{value}</span>
    </div>
  )
}

// ─── Bus Marker ───────────────────────────────────────────────────────────────
function PremiumBusMarker({ bus, lineColor, isSelected, showPassengers }: { bus: BusPosition; lineColor: string; isSelected: boolean; showPassengers: boolean }) {
  const isMoving = bus.status === 'moving'
  const color = isMoving ? lineColor : bus.status === 'at_stop' ? '#F0B429' : '#FF4D6A'
  return (
    <div style={{ position: 'relative', width: '54px', height: '54px', cursor: 'pointer', transform: 'translateZ(0)' }}>
      <div style={{ position: 'absolute', left: '12px', top: '34px', width: '31px', height: '10px', borderRadius: '50%', background: 'rgba(0,0,0,0.45)', filter: 'blur(3px)', transform: 'rotate(-12deg)' }} />
      {isMoving && <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', background: color, opacity: 0.09, boxShadow: `0 0 18px ${color}` }} />}
      <div
        style={{
          position: 'absolute',
          left: '13px',
          top: '9px',
          width: '28px',
          height: '37px',
          borderRadius: '9px 9px 7px 7px',
          background: `linear-gradient(145deg, #F7FAFF 0%, #D8E2EE 42%, ${color} 43%, ${color} 100%)`,
          border: `1px solid ${isSelected ? '#fff' : 'rgba(10,14,20,0.55)'}`,
          boxShadow: `0 3px 0 rgba(0,0,0,0.24), 0 0 ${isSelected ? 18 : 10}px ${color}80`,
          transform: 'perspective(90px) rotateX(12deg)',
          transformOrigin: 'center bottom',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'absolute', left: '4px', top: '4px', width: '20px', height: '8px', borderRadius: '4px 4px 2px 2px', background: 'linear-gradient(180deg,#263241,#111827)', border: '1px solid rgba(255,255,255,0.25)' }} />
        <div style={{ position: 'absolute', left: '5px', top: '15px', right: '5px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px' }}>
          {[0, 1, 2].map(i => <span key={i} style={{ height: '5px', borderRadius: '1px', background: 'rgba(15,23,42,0.62)', border: '1px solid rgba(255,255,255,0.18)' }} />)}
        </div>
        <div style={{ position: 'absolute', left: '5px', right: '5px', bottom: '8px', height: '2px', borderRadius: '2px', background: 'rgba(6,8,16,0.38)' }} />
        <div style={{ position: 'absolute', left: '4px', bottom: '3px', width: '6px', height: '6px', borderRadius: '50%', background: '#090D14', border: '1px solid rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', right: '4px', bottom: '3px', width: '6px', height: '6px', borderRadius: '50%', background: '#090D14', border: '1px solid rgba(255,255,255,0.2)' }} />
        <div style={{ position: 'absolute', left: '7px', top: '25px', width: '4px', height: '3px', borderRadius: '3px', background: '#FFF7AD' }} />
        <div style={{ position: 'absolute', right: '7px', top: '25px', width: '4px', height: '3px', borderRadius: '3px', background: '#FFF7AD' }} />
      </div>
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
    <div style={{ padding: '12px 14px', minWidth: '190px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '9px' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Bus size={13} style={{ color: 'var(--platinum)' }} />
        </div>
        <div>
          <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '13px' }}>Unidad {bus.bus_unit}</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono' }}>{bus.driver_name}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: statusColor[bus.status] }} />
        <span style={{ color: statusColor[bus.status], fontSize: '11px', fontFamily: 'DM Mono' }}>{statusLabel[bus.status]}</span>
        {bus.eta_minutes != null && <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', marginLeft: 'auto' }}>· {bus.eta_minutes}m</span>}
      </div>
      {bus.next_stop_name && (
        <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <MapPin size={9} style={{ color: 'var(--text-muted)' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono' }}>{bus.next_stop_name}</span>
        </div>
      )}
    </div>
  )
}
