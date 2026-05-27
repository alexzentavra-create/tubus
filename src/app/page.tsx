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
import { OFFICIAL_ROUTES } from '@/lib/officialRoutes'
import type { BusPosition, BusLine, BusStop } from '@/types'
import {
  MOCK_LINES, MOCK_STOPS, initMockBuses, tickMockBuses, getMockBusesForLine, getLineBounds, getMockStopsForLine, getMockRoutePathForLine, getMockRoutePathsForLine
} from '@/lib/mockData'
import ReportModal from '@/components/user/ReportModal'
import BusInfoSheet from '@/components/user/BusInfoSheet'
import LineSelector from '@/components/user/LineSelector'
import NearbyStops from '@/components/user/NearbyStops'

const BA = { longitude: -58.4173, latitude: -34.6037 }
const PART1 = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTAwMTIzM29hMW5nYnB1eXcifQ'
const PART2 = 'TyJ2Mcgiqas2N1UOCySD2g'
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || `${PART1}.${PART2}`

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
        "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
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
  const [selectedLines, setSelectedLines]   = useState<BusLine[]>([])
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

  // Branch & Interno filtering state
  const [branchFilter, setBranchFilter]     = useState<string>('all')
  const [trackedBusId, setTrackedBusId]     = useState<string | null>(null)

  // Travel Planner state
  const [travelPlannerOpen, setTravelPlannerOpen] = useState(false)
  const [originInput, setOriginInput]             = useState('')
  const [destInput, setDestInput]                 = useState('')
  const [originCoord, setOriginCoord]             = useState<{ lat: number; lng: number } | null>(null)
  const [destCoord, setDestCoord]                 = useState<{ lat: number; lng: number } | null>(null)
  const [pinNearbyStopsMode, setPinNearbyStopsMode] = useState(false)
  const [nearbyStopsPinCoord, setNearbyStopsPinCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [travelRoute, setTravelRoute]             = useState<any>(null)

  // Helper distance function
  const distanceKm = (a: { latitude: number; longitude: number } | BusStop, b: { lat: number; lng: number }) => {
    const lat1 = a.latitude * Math.PI / 180
    const lat2 = b.lat * Math.PI / 180
    const dLat = lat2 - lat1
    const dLng = (b.lng - a.longitude) * Math.PI / 180
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  }

  // Helper route solver
  const solveRoute = (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
    const stopsA = Object.values(MOCK_STOPS).flat()
    
    // Also include official routes stops
    const officialStops = Object.keys(OFFICIAL_ROUTES).flatMap(key => {
      const line = MOCK_LINES.find(l => l.line_number === key.split('-')[0])
      if (!line) return []
      return OFFICIAL_ROUTES[key].stops.map(stop => ({
        id: `${line.id}-official-${stop.id}`,
        line_id: line.id,
        name: stop.name,
        street_name: stop.name,
        latitude: stop.lat,
        longitude: stop.lng,
        line_number: line.line_number,
        color: line.color,
      }))
    })

    const allStops = [
      ...stopsA.map(s => ({
        ...s,
        line_number: MOCK_LINES.find(l => l.id === s.line_id)?.line_number || '12',
        color: MOCK_LINES.find(l => l.id === s.line_id)?.color || '#EF4444'
      })),
      ...officialStops
    ]

    const nearOrigin = allStops.filter(stop => distanceKm(stop, origin) < 0.8)
    const nearDest = allStops.filter(stop => distanceKm(stop, dest) < 0.8)

    for (const stopO of nearOrigin) {
      for (const stopD of nearDest) {
        if (stopO.line_id === stopD.line_id) {
          return {
            line_id: stopO.line_id,
            line_number: stopO.line_number,
            color: stopO.color,
            originStop: stopO,
            destStop: stopD,
          }
        }
      }
    }
    return null
  }

  // ── init ──
  useEffect(() => {
    setPrefs(loadPrefs())
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUser(user) })
    supabase.from('bus_lines').select('*').eq('is_active', true).then(({ data }) => {
      const ALLOWED_LINES = ['12', '28', '37', '60', '152']
      const availableLines = (data && data.length > 0 ? data : MOCK_LINES).filter(l => ALLOWED_LINES.includes(l.line_number))
      setLines(availableLines)
      const defaultLine = availableLines.find(l => l.line_number === '12') || availableLines[0]
      if (defaultLine) {
        setSelectedLines([defaultLine])
      }
    })
  }, [])

  const updatePrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; savePrefs(next); return next })
  }, [])

  // ── line subscription + mock fallback ──
  useEffect(() => {
    if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
    setBuses([])
    setLineStops([])
    setUseMockBuses(false)
    if (selectedLines.length === 0) return

    // Combine stops for all selected lines
    const combinedStops = selectedLines.flatMap(line => getMockStopsForLine(line))
    // Merge stops with exact same coordinates to prevent duplicates on map
    const uniqueStops: BusStop[] = []
    const coordsSet = new Set()
    combinedStops.forEach(s => {
      const key = `${s.latitude.toFixed(4)},${s.longitude.toFixed(4)}`
      if (!coordsSet.has(key)) {
        coordsSet.add(key)
        uniqueStops.push(s)
      }
    })
    setLineStops(uniqueStops)

    // Reinitialise simulator fresh for the selected lines, then start ticking
    initMockBuses(selectedLines)
    const initial = selectedLines.flatMap(line => getMockBusesForLine(line.id))
    setBuses(initial.length > 0 ? initial : [])
    setUseMockBuses(true)

    // Fit map bounds to the selected lines
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
    let hasBounds = false
    selectedLines.forEach(line => {
      const bounds = getLineBounds(line)
      if (bounds) {
        minLat = Math.min(minLat, bounds.minLat)
        maxLat = Math.max(maxLat, bounds.maxLat)
        minLng = Math.min(minLng, bounds.minLng)
        maxLng = Math.max(maxLng, bounds.maxLng)
        hasBounds = true
      }
    })
    if (hasBounds) {
      const centerLat = (minLat + maxLat) / 2
      const centerLng = (minLng + maxLng) / 2
      setViewState(v => ({ ...v, latitude: centerLat, longitude: centerLng, zoom: 12.5, pitch: 0 }))
    }

    // Reset branch and tracked bus filters when selection changes
    setBranchFilter('all')
    setTrackedBusId(null)

    mockTickRef.current = setInterval(() => {
      const selectedIds = selectedLines.map(l => l.id)
      const ticked = tickMockBuses().filter(b => selectedIds.includes(b.line_id))
      setBuses(ticked)
    }, 50) // Liquid smooth 50ms tick frequency!

    return () => {
      if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
    }
  }, [selectedLines])

  // Center on tracked bus
  useEffect(() => {
    if (!trackedBusId || buses.length === 0) return
    const tracked = buses.find(b => b.id === trackedBusId)
    if (tracked) {
      setViewState(v => ({ ...v, latitude: tracked.latitude, longitude: tracked.longitude }))
    }
  }, [trackedBusId, buses])

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
  // Render paths for all selected lines (supporting multiple branches)
  const routeGeoJsons = selectedLines.map(line => {
    const paths = getMockRoutePathsForLine(line)
    return {
      id: `route-${line.id}`,
      color: line.color,
      features: paths.map((path, pIdx) => ({
        type: 'Feature' as const,
        properties: { color: line.color },
        geometry: {
          type: 'LineString' as const,
          coordinates: path.map(point => [point.lng, point.lat]),
        }
      }))
    }
  })

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
          mapStyle={prefs.darkMap ? (CARTODB_DARK as any) : (CARTODB_LIGHT as any)}
          style={{ width: '100%', height: '100%' }}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl position="bottom-right" trackUserLocation showUserHeading onGeolocate={handleLocated as any} />

          {/* Custom Floating Theme Toggle */}
          <div style={{ position: 'absolute', right: '10px', bottom: '110px', zIndex: 10 }}>
            <button
              onClick={() => updatePrefs({ darkMap: !prefs.darkMap })}
              style={{
                width: '29px', height: '29px', borderRadius: '4px',
                background: 'rgba(12,16,26,0.92)', border: '1px solid rgba(184,200,224,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                color: 'var(--platinum)'
              }}
              title={prefs.darkMap ? "Cambiar a mapa claro" : "Cambiar a mapa oscuro"}
            >
              {prefs.darkMap ? <Globe size={14} /> : <Moon size={14} />}
            </button>
          </div>

          {routeGeoJsons.map(item => (
            <Source key={item.id} id={item.id} type="geojson" data={{
              type: 'FeatureCollection',
              features: item.features
            }}>
              <Layer
                id={`${item.id}-glow`}
                type="line"
                paint={{ 'line-color': item.color, 'line-width': 8, 'line-opacity': 0.18, 'line-blur': 2 }}
              />
              <Layer
                id={`${item.id}-line`}
                type="line"
                paint={{ 'line-color': item.color, 'line-width': 3, 'line-opacity': 0.75 }}
              />
            </Source>
          ))}

          {buses
            .filter(bus => {
              if (bus.line_number === '60' && branchFilter !== 'all' && bus.ramal !== branchFilter) return false
              if (trackedBusId && bus.id !== trackedBusId) return false
              return true
            })
            .map(bus => {
              const line = lines.find(l => l.id === bus.line_id)
              const lineColor = line?.color || '#B8C8E0'
              return (
                <Marker key={bus.id} longitude={bus.longitude} latitude={bus.latitude} anchor="center" rotation={bus.heading} rotationAlignment="map" onClick={() => handleBusClick(bus)}>
                  <PremiumBusMarker bus={bus} lineColor={lineColor} isSelected={selectedBus?.id === bus.id} showPassengers={prefs.showPassengerCount} />
                </Marker>
              )
            })}

          {lineStops.map((stop: BusStop) => {
            const isFav = prefs.favStops.includes(stop.id)
            const line = lines.find(l => l.id === stop.line_id)
            const stopColor = line?.color || '#B8C8E0'
            return (
              <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
                <div
                  onClick={() => updatePrefs({ favStops: isFav ? prefs.favStops.filter(id => id !== stop.id) : [...prefs.favStops, stop.id] })}
                  title={stop.name}
                  style={{ width: isFav ? '14px' : '10px', height: isFav ? '14px' : '10px', borderRadius: '50%', background: isFav ? stopColor : 'rgba(184,200,224,0.5)', border: `2px solid ${isFav ? stopColor : 'rgba(184,200,224,0.25)'}`, boxShadow: isFav ? `0 0 10px ${stopColor}80` : '0 0 6px rgba(184,200,224,0.3)', cursor: 'pointer' }}
                />
              </Marker>
            )
          })}

          {nearbyStops.map((stop: BusStop) => (
            <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(184,200,224,0.6)', border: '2px solid rgba(184,200,224,0.3)' }} />
            </Marker>
          ))}

          {/* Draggable Nearby Stops Pin */}
          {pinNearbyStopsMode && nearbyStopsPinCoord && (
            <Marker
              longitude={nearbyStopsPinCoord.lng}
              latitude={nearbyStopsPinCoord.lat}
              draggable
              onDragEnd={e => {
                setNearbyStopsPinCoord({ lat: e.lngLat.lat, lng: e.lngLat.lng })
                const stops = Object.values(MOCK_STOPS).flat()
                const officialStops = Object.keys(OFFICIAL_ROUTES).flatMap(key => {
                  const line = MOCK_LINES.find(l => l.line_number === key.split('-')[0])
                  if (!line) return []
                  return OFFICIAL_ROUTES[key].stops.map(stop => ({
                    id: `${line.id}-official-${stop.id}`,
                    line_id: line.id,
                    name: stop.name,
                    street_name: stop.name,
                    stop_number: 1,
                    latitude: stop.lat,
                    longitude: stop.lng,
                    direction: 'ida' as const,
                    avg_wait_minutes: 6,
                    total_daily_users: 120,
                  }))
                })
                const allStops = [...stops, ...officialStops]
                const filteredStops = allStops.filter(stop => {
                  const distance = distanceKm({ latitude: stop.latitude, longitude: stop.longitude }, { lat: e.lngLat.lat, lng: e.lngLat.lng })
                  return distance < 0.8
                })
                setNearbyStops(filteredStops)
              }}
              anchor="bottom"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#FF4D6A', color: 'white', fontSize: '10px', padding: '3px 8px', borderRadius: '10px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', whiteSpace: 'nowrap' }}>Arrastrá el Pin</div>
                <MapPin size={32} style={{ color: '#FF4D6A', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
              </div>
            </Marker>
          )}

          {/* Travel Planner Pins */}
          {travelPlannerOpen && originCoord && (
            <Marker
              longitude={originCoord.lng}
              latitude={originCoord.lat}
              draggable
              onDragEnd={e => {
                setOriginCoord({ lat: e.lngLat.lat, lng: e.lngLat.lng })
                if (destCoord) setTravelRoute(solveRoute({ lat: e.lngLat.lat, lng: e.lngLat.lng }, destCoord))
              }}
              anchor="bottom"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#3B82F6', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', marginBottom: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>Origen</div>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3B82F6', border: '2.5px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
              </div>
            </Marker>
          )}

          {travelPlannerOpen && destCoord && (
            <Marker
              longitude={destCoord.lng}
              latitude={destCoord.lat}
              draggable
              onDragEnd={e => {
                setDestCoord({ lat: e.lngLat.lat, lng: e.lngLat.lng })
                if (originCoord) setTravelRoute(solveRoute(originCoord, { lat: e.lngLat.lat, lng: e.lngLat.lng }))
              }}
              anchor="bottom"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#111827', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', marginBottom: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>Destino</div>
                <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: '#111827', border: '2.5px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
              </div>
            </Marker>
          )}

          {/* Travel Walking Dotted lines */}
          {travelPlannerOpen && travelRoute && originCoord && destCoord && (
            <Source id="travel-route-geojson" type="geojson" data={{
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [originCoord.lng, originCoord.lat],
                      [travelRoute.originStop.longitude, travelRoute.originStop.latitude]
                    ]
                  }
                },
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [travelRoute.destStop.longitude, travelRoute.destStop.latitude],
                      [destCoord.lng, destCoord.lat]
                    ]
                  }
                }
              ]
            }}>
              <Layer
                id="travel-walking"
                type="line"
                paint={{ 'line-color': '#B8C8E0', 'line-width': 3, 'line-dasharray': [2, 2] }}
              />
            </Source>
          )}

          {selectedBus && (
            <Popup longitude={selectedBus.longitude} latitude={selectedBus.latitude} anchor="bottom" offset={44} closeButton={false} onClose={() => setSelectedBus(null)}>
              <MiniPopup bus={selectedBus} />
            </Popup>
          )}
        </Map>

        {/* ── TOP BAR (Multi-selection & Close) ── */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, padding: '14px 14px 0', pointerEvents: 'none' }}>
          <motion.div
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'linear-gradient(145deg,rgba(19,25,33,0.97),rgba(10,14,20,0.99))', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', border: '1px solid rgba(184,200,224,0.12)', borderRadius: '14px', padding: '9px 12px', boxShadow: '0 8px 40px rgba(0,0,0,0.7)', pointerEvents: 'auto' }}
          >
            {selectedLines.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flex: 1, paddingRight: '8px' }}>
                {selectedLines.map(line => (
                  <div key={line.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', padding: '4px 8px', borderRadius: '8px', flexShrink: 0 }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color }} />
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: 600 }}>Línea {line.line_number}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLines(prev => prev.filter(l => l.id !== line.id))
                      }}
                      style={{ background: 'none', border: 'none', color: 'rgba(184,200,224,0.6)', cursor: 'pointer', padding: '0 2px', display: 'flex', alignItems: 'center' }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowLineSelector(true) }}
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: '#9CA3AF', fontSize: '11px', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                >
                  + Agregar línea
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLineSelector(true)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
              >
                <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Elegí una línea...</span>
              </button>
            )}

            {selectedLines.length === 1 && (
              <button onClick={() => updatePrefs({ favBusLines: prefs.favBusLines.includes(selectedLines[0].id) ? prefs.favBusLines.filter(id => id !== selectedLines[0].id) : [...prefs.favBusLines, selectedLines[0].id] })}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <Star size={12} style={{ color: prefs.favBusLines.includes(selectedLines[0].id) ? '#F59E0B' : 'var(--text-muted)', fill: prefs.favBusLines.includes(selectedLines[0].id) ? '#F59E0B' : 'none' }} />
              </button>
            )}

            {buses.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px', borderRadius: '999px', background: 'rgba(34,211,160,0.08)', border: '1px solid rgba(34,211,160,0.2)', flexShrink: 0 }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--go)' }} />
                <span style={{ color: 'var(--go)', fontSize: '11px', fontFamily: 'DM Mono', fontWeight: 600 }}>{buses.length} en ruta</span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── FILTER TOOLBAR (Branch & Interno selection) ── */}
        {selectedLines.length > 0 && activePanel === 'map' && (
          <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, zIndex: 9, padding: '0 14px', pointerEvents: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', background: 'rgba(10,14,20,0.95)', border: '1px solid rgba(184,200,224,0.08)', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', width: 'fit-content' }}>
              {selectedLines.some(l => l.line_number === '60') && (
                <>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono' }}>RAMAL:</span>
                  <select
                    value={branchFilter}
                    onChange={e => { setBranchFilter(e.target.value); setTrackedBusId(null) }}
                    style={{ background: 'rgba(184,200,224,0.05)', color: 'white', border: '1px solid rgba(184,200,224,0.15)', borderRadius: '6px', fontSize: '11px', padding: '3px 6px', outline: 'none' }}
                  >
                    <option value="all" style={{ background: '#111827' }}>Todos</option>
                    <option value="A" style={{ background: '#111827' }}>Ramal A (Tigre)</option>
                    <option value="B" style={{ background: '#111827' }}>Ramal B (Escobar)</option>
                  </select>
                  <div style={{ width: '1px', height: '14px', background: 'rgba(184,200,224,0.15)', margin: '0 4px' }} />
                </>
              )}

              <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono' }}>SEGUIR:</span>
              <select
                value={trackedBusId || 'all'}
                onChange={e => setTrackedBusId(e.target.value === 'all' ? null : e.target.value)}
                style={{ background: 'rgba(184,200,224,0.05)', color: 'white', border: '1px solid rgba(184,200,224,0.15)', borderRadius: '6px', fontSize: '11px', padding: '3px 6px', outline: 'none' }}
              >
                <option value="all" style={{ background: '#111827' }}>Todos los colectivos</option>
                {buses
                  .filter(b => {
                    if (b.line_number === '60' && branchFilter !== 'all' && b.ramal !== branchFilter) return false
                    return true
                  })
                  .map(b => (
                    <option key={b.id} value={b.id} style={{ background: '#111827' }}>
                      Interno {b.bus_unit} {b.ramal ? `(Ramal ${b.ramal})` : ''}
                    </option>
                  ))}
              </select>
            </div>
          </div>
        )}

        {/* ── TRAVEL PLANNER PANEL ── */}
        <AnimatePresence>
          {travelPlannerOpen && activePanel === 'map' && (
            <motion.div
              initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -100, opacity: 0 }}
              style={{ position: 'absolute', top: '74px', left: '14px', zIndex: 11, width: '320px', background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px', padding: '14px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', color: 'white', display: 'flex', flexDirection: 'column', gap: '10px', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>Planificar Recorrido</span>
                <button onClick={() => setTravelPlannerOpen(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={14} /></button>
              </div>
              
              {/* Inputs stacked with connecting vertical line */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Vertical connecting line */}
                <div style={{ position: 'absolute', left: '16px', top: '20px', bottom: '20px', width: '2px', background: 'rgba(255,255,255,0.15)', zIndex: 1 }} />
                
                {/* Origin Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3B82F6', border: '2px solid white', flexShrink: 0, marginLeft: '12px' }} />
                  <select
                    value={originInput}
                    onChange={e => {
                      const val = e.target.value
                      setOriginInput(val)
                      const coords: Record<string, { lat: number; lng: number }> = {
                        'once': { lat: -34.6082, lng: -58.4093 },
                        'consti': { lat: -34.6268, lng: -58.3808 },
                        'retiro': { lat: -34.5910, lng: -58.3750 },
                        'obelisco': { lat: -34.6037, lng: -58.3816 }
                      }
                      if (coords[val]) {
                        setOriginCoord(coords[val])
                        setViewState(v => ({ ...v, latitude: coords[val].lat, longitude: coords[val].lng, zoom: 14 }))
                        if (destCoord) setTravelRoute(solveRoute(coords[val], destCoord))
                      }
                    }}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="" style={{background:'#111827'}}>Desde (Origen)...</option>
                    <option value="obelisco" style={{background:'#111827'}}>Obelisco (Microcentro)</option>
                    <option value="once" style={{background:'#111827'}}>Once (Pza. Miserere)</option>
                    <option value="consti" style={{background:'#111827'}}>Plaza Constitución</option>
                    <option value="retiro" style={{background:'#111827'}}>Retiro Terminal</option>
                  </select>
                </div>

                {/* Destination Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#111827', border: '2px solid white', flexShrink: 0, marginLeft: '12px' }} />
                  <select
                    value={destInput}
                    onChange={e => {
                      const val = e.target.value
                      setDestInput(val)
                      const coords: Record<string, { lat: number; lng: number }> = {
                        'italia': { lat: -34.5810, lng: -58.4210 },
                        'belgrano': { lat: -34.5606, lng: -58.4569 },
                        'saavedra': { lat: -34.5390, lng: -58.4760 },
                        'olivos': { lat: -34.5100, lng: -58.4850 }
                      }
                      if (coords[val]) {
                        setDestCoord(coords[val])
                        setViewState(v => ({ ...v, latitude: coords[val].lat, longitude: coords[val].lng, zoom: 14 }))
                        if (originCoord) setTravelRoute(solveRoute(originCoord, coords[val]))
                      }
                    }}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'white', fontSize: '12px', outline: 'none' }}
                  >
                    <option value="" style={{background:'#111827'}}>Hacia (Destino)...</option>
                    <option value="italia" style={{background:'#111827'}}>Plaza Italia (Palermo)</option>
                    <option value="belgrano" style={{background:'#111827'}}>Barrancas de Belgrano</option>
                    <option value="saavedra" style={{background:'#111827'}}>Puente Saavedra</option>
                    <option value="olivos" style={{background:'#111827'}}>Olivos Terminal</option>
                  </select>
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', marginTop: '2px' }}>
                💡 Podés arrastrar los pines en el mapa para ajustar
              </div>

              {/* Route Result Card */}
              {travelRoute ? (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', marginTop: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: travelRoute.color }} />
                    <span style={{ fontWeight: 'bold' }}>Recomendación: Línea {travelRoute.line_number}</span>
                  </div>
                  <div>
                    🚶‍♂️ Caminá hasta parada: <strong>{travelRoute.originStop.name}</strong>
                  </div>
                  <div>
                    🚌 Tomá el colectivo y viajá hasta: <strong>{travelRoute.destStop.name}</strong>
                  </div>
                  <button
                    onClick={() => {
                      const line = lines.find(l => l.id === travelRoute.line_id)
                      if (line && !selectedLines.some(l => l.id === line.id)) {
                        setSelectedLines(prev => [...prev, line])
                      }
                      setViewState(v => ({ ...v, latitude: travelRoute.originStop.latitude, longitude: travelRoute.originStop.longitude, zoom: 14 }))
                    }}
                    style={{ width: '100%', background: `${travelRoute.color}20`, border: `1px solid ${travelRoute.color}40`, color: travelRoute.color, borderRadius: '6px', padding: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '11px', marginTop: '4px' }}
                  >
                    Seguir esta línea en el mapa →
                  </button>
                </div>
              ) : originCoord && destCoord ? (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', padding: '10px', marginTop: '6px', fontSize: '11px', color: '#FCA5A5', textAlign: 'center' }}>
                  No se encontró conexión directa. Intentá arrastrando los pines más cerca de las avenidas principales.
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating actions right side of map */}
        {activePanel === 'map' && (
          <div style={{ position: 'absolute', bottom: '110px', right: '14px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Travel Planner */}
            <button
              onClick={() => {
                setTravelPlannerOpen(prev => !prev)
                setPinNearbyStopsMode(false)
                if (!originCoord) {
                  setOriginCoord({ lat: -34.6037, lng: -58.3816 })
                  setDestCoord({ lat: -34.5810, lng: -58.4210 })
                  const route = solveRoute({ lat: -34.6037, lng: -58.3816 }, { lat: -34.5810, lng: -58.4210 })
                  setTravelRoute(route)
                }
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: travelPlannerOpen ? '#3B82F6' : 'rgba(10,14,20,0.9)',
                border: '1px solid rgba(184,200,224,0.15)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white', transition: 'all 200ms'
              }}
              title="Planificar Viaje (Origen/Destino)"
            >
              <NavIcon size={16} />
            </button>
            
            {/* Draggable Nearby Stops Pin */}
            <button
              onClick={() => {
                setPinNearbyStopsMode(prev => !prev)
                setTravelPlannerOpen(false)
                if (!nearbyStopsPinCoord) {
                  setNearbyStopsPinCoord({ lat: -34.5972, lng: -58.3930 })
                  const stops = Object.values(MOCK_STOPS).flat().filter(stop => {
                    const distance = distanceKm({ latitude: stop.latitude, longitude: stop.longitude }, { lat: -34.5972, lng: -58.3930 })
                    return distance < 0.8
                  })
                  setNearbyStops(stops)
                }
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: pinNearbyStopsMode ? '#FF4D6A' : 'rgba(10,14,20,0.9)',
                border: '1px solid rgba(184,200,224,0.15)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'white', transition: 'all 200ms'
              }}
              title="Pin de paradas cercanas"
            >
              <MapPin size={16} />
            </button>
          </div>
        )}

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
                  <FavouritesPanel prefs={prefs} lines={allLines} onSelectLine={l => { setSelectedLines([l]); setActivePanel('map') }} onUpdatePrefs={updatePrefs} />
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
          ) : (pinNearbyStopsMode || nearbyStops.length > 0) && selectedLines.length === 0 && activePanel === 'map' ? (
            <NearbyStops key="stops" stops={nearbyStops} />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showLineSelector && (
            <LineSelector lines={allLines} selectedLines={selectedLines} onSelect={line => {
              setSelectedLines(prev => {
                const exists = prev.some(l => l.id === line.id)
                return exists ? prev.filter(l => l.id !== line.id) : [...prev, line]
              })
            }} onClose={() => setShowLineSelector(false)} />
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
    <div style={{ position: 'relative', width: '36px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
      {/* Headlight glow beam (pointing North/Up) */}
      {isMoving && (
        <div style={{
          position: 'absolute',
          bottom: '36px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '24px',
          height: '22px',
          background: 'linear-gradient(0deg, rgba(254, 240, 138, 0.25) 0%, rgba(254, 240, 138, 0) 100%)',
          clipPath: 'polygon(30% 100%, 70% 100%, 100% 0%, 0% 0%)',
          pointerEvents: 'none',
        }} />
      )}
      
      {/* Taillight glow beam (pointing South/Down) */}
      <div style={{
        position: 'absolute',
        top: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '14px',
        height: '10px',
        background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.22) 0%, rgba(239, 68, 68, 0) 100%)',
        clipPath: 'polygon(30% 0%, 70% 0%, 100% 100%, 0% 100%)',
        pointerEvents: 'none',
      }} />
      
      {/* Bus body - slightly smaller (10px x 26px) */}
      <div style={{
        width: '10px',
        height: '26px',
        borderRadius: '2.5px',
        background: color,
        border: '1px solid rgba(255, 255, 255, 0.25)',
        boxShadow: `0 0 10px ${color}bf, 0 1.5px 3px rgba(0,0,0,0.5)`,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '2px 0',
        boxSizing: 'border-box',
      }}>
        {/* Headlights */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 0.8px', boxSizing: 'border-box', position: 'absolute', top: '0.8px' }}>
          <div style={{ width: '1.8px', height: '1.8px', borderRadius: '50%', background: '#FEF08A', boxShadow: '0 0 3px #FEF08A' }} />
          <div style={{ width: '1.8px', height: '1.8px', borderRadius: '50%', background: '#FEF08A', boxShadow: '0 0 3px #FEF08A' }} />
        </div>

        {/* Window Panes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', marginTop: '2.5px', width: '6px', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '6px', height: '4px', borderRadius: '0.8px', background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(255,255,255,0.08)' }} />
          ))}
        </div>

        {/* Taillights */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', padding: '0 0.8px', boxSizing: 'border-box', position: 'absolute', bottom: '0.8px' }}>
          <div style={{ width: '1.8px', height: '1.8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 3px #EF4444' }} />
          <div style={{ width: '1.8px', height: '1.8px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 3px #EF4444' }} />
        </div>
      </div>

      {/* Passenger badge */}
      {showPassengers && bus.passenger_count > 0 && (
        <div style={{
          position: 'absolute',
          top: '2px',
          right: '0px',
          minWidth: '12px',
          height: '12px',
          borderRadius: '6px',
          background: 'rgba(10,14,20,0.95)',
          border: '1px solid rgba(184,200,224,0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 1.5px',
          boxShadow: '0 1.5px 4px rgba(0,0,0,0.5)',
          zIndex: 5,
        }}>
          <span style={{ fontSize: '7px', fontFamily: 'DM Mono', fontWeight: 600, color: 'var(--platinum-dim)' }}>
            {bus.passenger_count}
          </span>
        </div>
      )}
    </div>
  );
}


// ─── Mini popup ───────────────────────────────────────────────────────────────
function MiniPopup({ bus }: { bus: BusPosition }) {
  const reportsCount = bus.reports_count ?? 0
  const busColor = bus.line_number === '12' ? '#EF4444' : 
                   bus.line_number === '28' ? '#16A34A' :
                   bus.line_number === '37' ? '#15803D' :
                   bus.line_number === '60' ? '#EAB308' : '#1D4ED8';
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '12px',
      color: 'white',
      width: '230px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      fontFamily: 'DM Sans, sans-serif',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      {/* Bus image header */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '90px',
        borderRadius: '10px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: '10px'
      }}>
        <img
          src={`/images/bus-${bus.line_number}.png`}
          alt={`Bus ${bus.line_number}`}
          style={{ width: 'auto', height: '100%', objectFit: 'contain' }}
        />
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          background: busColor,
          color: busColor === '#EAB308' ? 'black' : 'white',
          fontWeight: 'bold',
          fontSize: '10px',
          padding: '2px 8px',
          borderRadius: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}>
          Línea {bus.line_number}
          {bus.ramal && ` - Ramal ${bus.ramal}`}
        </div>
      </div>

      <div style={{ fontWeight: 700, fontSize: '13px', marginBottom: '2px', color: '#F3F4F6' }}>
        Interno: {bus.bus_unit}
      </div>
      <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>Chofer: <strong>{bus.driver_name}</strong></span>
        <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
      </div>

      {/* Reports badge */}
      <div style={{
        background: reportsCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.08)',
        border: `1px solid ${reportsCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`,
        borderRadius: '8px',
        padding: '5px 8px',
        fontSize: '11px',
        color: reportsCount > 0 ? '#FCA5A5' : '#D1FAE5',
        marginBottom: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ fontSize: '12px' }}>{reportsCount > 0 ? '⚠' : '🛡'}</span>
        <span>
          {reportsCount > 0 
            ? `${reportsCount} ${reportsCount === 1 ? 'denuncia activa' : 'denuncias activas'}`
            : 'Sin denuncias activas'}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '8px', fontSize: '11px', color: '#9CA3AF' }}>
        <div>
          Velocidad: <strong style={{ color: 'white', fontFamily: 'DM Mono' }}>{bus.speed_kmh} km/h</strong>
        </div>
        <div>
          Pasajeros: <strong style={{ color: '#EAB308', fontFamily: 'DM Mono' }}>{bus.passenger_count}</strong>
        </div>
      </div>
    </div>
  )
}
