'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl/maplibre'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus, Search, ChevronDown, X, Star, MapPin, Bell, AlertTriangle,
  LogOut, Heart, ChevronRight, User, Sliders, Moon, Globe,
  Navigation as NavIcon, LayoutDashboard, Menu,
  Locate, Plus, Minus, Sun, Route, Activity
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { OFFICIAL_ROUTES } from '@/lib/officialRoutes'
import type { BusPosition, BusLine, BusStop } from '@/types'
import {
  MOCK_LINES, getLineBounds, getMockStopsForLine, getMockRoutePathsForLine
} from '@/lib/mockData'
import ReportModal from '@/components/user/ReportModal'
import LineSelector, { Tab as LineSelectorTab } from '@/components/user/LineSelector'
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
  favBuses?: string[]
  favDrivers?: string[]
  filterByPassengers?: boolean
  maxPassengers?: number
}

const DEFAULT_PREFS: UserPrefs = {
  favBusLines: [], favStops: [],
  notifyNearbyBus: true, notifyNearbyRadius: 0.5, notifyFavLines: true,
  darkMap: true, language: 'es', fontSize: 'normal',
  showPassengerCount: true, autoZoomOnBus: true,
  favBuses: [], favDrivers: [],
  filterByPassengers: false,
  maxPassengers: 10,
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
  const targetBusesRef = useRef<Record<string, BusPosition>>({})
  const apiPollRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const busSeenStateRef = useRef<Record<string, { bus: BusPosition; missingCycles: number }>>({})
  const busReckoningRef = useRef<Record<string, {
    lastTelemetryReceivedTime: number;
    blendStartCoords: { lat: number; lng: number } | null;
    currentCoords: { lat: number; lng: number };
    pathIndex: number;
  }>>({})

  const [user, setUser]                     = useState<any>(null)
  const [buses, setBuses]                   = useState<BusPosition[]>([])
  const [trafficState, setTrafficState]     = useState<Record<string, { color: string, timestamp: number }>>({})
  
  // Mobile, Onboarding and Desktop-Preview states
  const [isMobile, setIsMobile]             = useState(false)
  const [forceMobilePreview, setForceMobilePreview] = useState(false)
  const [physicalMobile, setPhysicalMobile] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<number>(-1)
  const [showWelcome, setShowWelcome]       = useState(false)

  useEffect(() => {
    const checkViewport = () => {
      const pm = window.innerWidth <= 768
      setPhysicalMobile(pm)
      setIsMobile(pm || forceMobilePreview)
    }
    checkViewport()
    window.addEventListener('resize', checkViewport)

    const completed = localStorage.getItem('tubus_onboarding_completed')
    if (!completed) {
      setShowWelcome(true)
    }

    return () => {
      window.removeEventListener('resize', checkViewport)
    }
  }, [forceMobilePreview])

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
  const [directionFilter, setDirectionFilter] = useState<'all' | 'ida' | 'vuelta'>('all')

  // Travel Planner state
  const [travelPlannerOpen, setTravelPlannerOpen] = useState(false)
  const [originInput, setOriginInput]             = useState('')
  const [destInput, setDestInput]                 = useState('')
  const [originCoord, setOriginCoord]             = useState<{ lat: number; lng: number } | null>(null)
  const [destCoord, setDestCoord]                 = useState<{ lat: number; lng: number } | null>(null)
  const [pinNearbyStopsMode, setPinNearbyStopsMode] = useState(false)
  const [nearbyStopsPinCoord, setNearbyStopsPinCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [travelRoute, setTravelRoute]             = useState<any>(null)
  const [selectedBoardingBusId, setSelectedBoardingBusId] = useState<string | null>(null)
  const [mapSelectionMode, setMapSelectionMode] = useState<'origin' | 'destination' | null>(null)
  const [lineSelectorTab, setLineSelectorTab] = useState<LineSelectorTab>('line')
  const [showTraffic, setShowTraffic] = useState(false)

  // Helper distance function
  const distanceKm = (a: { latitude: number; longitude: number } | BusStop, b: { lat: number; lng: number }) => {
    const lat1 = a.latitude * Math.PI / 180
    const lat2 = b.lat * Math.PI / 180
    const dLat = lat2 - lat1
    const dLng = (b.lng - a.longitude) * Math.PI / 180
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
  }

  const heading = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dy = lat2 - lat1
    const dx = lng2 - lng1
    return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
  }

  const getNearestStreetName = (lat: number, lng: number) => {
    const presets = [
      { name: "Av. 9 de Julio (Obelisco)", lat: -34.6037, lng: -58.3816 },
      { name: "Av. Pueyrredón (Once)", lat: -34.6082, lng: -58.4093 },
      { name: "Plaza Constitución", lat: -34.6268, lng: -58.3808 },
      { name: "Ramos Mejía (Retiro)", lat: -34.5910, lng: -58.3750 },
      { name: "Av. Santa Fe (Plaza Italia)", lat: -34.5810, lng: -58.4210 },
      { name: "Av. Cabildo (Barrancas de Belgrano)", lat: -34.5606, lng: -58.4569 },
      { name: "Av. Maipú (Puente Saavedra)", lat: -34.5390, lng: -58.4760 },
      { name: "Av. Maipú (Quinta de Olivos)", lat: -34.5100, lng: -58.4850 },
      { name: "Av. Entre Ríos (Congreso)", lat: -34.5996, lng: -58.3927 },
      { name: "Tigre Terminal", lat: -34.4251, lng: -58.5796 },
      { name: "Escobar Terminal", lat: -34.3486, lng: -58.7915 }
    ]
    let best = presets[0]
    let minDist = Infinity
    presets.forEach(p => {
      const dist = Math.hypot(p.lat - lat, p.lng - lng)
      if (dist < minDist) {
        minDist = dist
        best = p
      }
    })
    // Reduced matching threshold to 200 meters to prevent false matching to distant landmarks when dragging pins
    if (minDist < 0.002) {
      return best.name
    }
    return `Esquina: ${lat.toFixed(4)}, ${lng.toFixed(4)}`
  }

  const fetchAddressAsync = async (lat: number, lng: number, callback: (addr: string) => void) => {
    // 1. Check if it's very close to a preset landmark first
    const presetName = getNearestStreetName(lat, lng)
    if (presetName && !presetName.startsWith('Esquina:')) {
      callback(presetName)
      return
    }

    // 2. Otherwise fetch the real street and house number from OpenStreetMap Nominatim reverse geocoding
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=es`
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'TuBus Buenos Aires App'
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data && data.address) {
          const road = data.address.road || ''
          const houseNumber = data.address.house_number || ''
          if (road) {
            callback(houseNumber ? `${road} ${houseNumber}` : road)
            return
          }
        }
      }
    } catch (e) {
      console.error('Error fetching Nominatim reverse geocode:', e)
    }

    // Fallback if fetch fails or road is empty
    callback(`Esquina: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
  }

  const resolveStreetToCoords = (text: string) => {
    const lower = text.toLowerCase()
    if (lower.includes('obelisco') || lower.includes('9 de julio') || lower.includes('corrientes')) {
      return { lat: -34.6037, lng: -58.3816 }
    }
    if (lower.includes('once') || lower.includes('miserere') || lower.includes('rivadavia')) {
      return { lat: -34.6082, lng: -58.4093 }
    }
    if (lower.includes('consti') || lower.includes('constitucion') || lower.includes('garay')) {
      return { lat: -34.6268, lng: -58.3808 }
    }
    if (lower.includes('retiro') || lower.includes('ramos mejia')) {
      return { lat: -34.5910, lng: -58.3750 }
    }
    if (lower.includes('plaza italia') || lower.includes('palermo') || lower.includes('santa fe')) {
      return { lat: -34.5810, lng: -58.4210 }
    }
    if (lower.includes('belgrano') || lower.includes('barrancas') || lower.includes('cabildo') || lower.includes('juramento')) {
      return { lat: -34.5606, lng: -58.4569 }
    }
    if (lower.includes('saavedra') || lower.includes('general paz') || lower.includes('maipu')) {
      return { lat: -34.5390, lng: -58.4760 }
    }
    if (lower.includes('olivos') || lower.includes('quinta')) {
      return { lat: -34.5100, lng: -58.4850 }
    }
    if (lower.includes('congreso') || lower.includes('callao') || lower.includes('entre rios')) {
      return { lat: -34.5996, lng: -58.3927 }
    }
    if (lower.includes('tigre')) {
      return { lat: -34.4251, lng: -58.5796 }
    }
    if (lower.includes('escobar')) {
      return { lat: -34.3486, lng: -58.7915 }
    }
    return null
  }

  const getETAString = (bus: BusPosition, stop: BusStop) => {
    const d = distanceKm(bus, { lat: stop.latitude, lng: stop.longitude })
    if (d < 0.04) return "Llegando a la parada / En parada"

    // Check if the bus has already passed the stop using vector math
    const dy = stop.latitude - bus.latitude
    const dx = stop.longitude - bus.longitude
    const angleToStop = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
    const diff = Math.abs(bus.heading - angleToStop)
    const circularDiff = Math.abs(((diff + 180) % 360) - 180)
    const isComing = circularDiff <= 90

    if (!isComing) {
      return `Ya pasó - Alejándose (${(d * 1000).toFixed(0)}m)`
    }

    const speed = bus.speed_kmh > 2 ? bus.speed_kmh : 20
    const hours = d / speed
    const totalSeconds = Math.round(hours * 3600)
    const min = Math.floor(totalSeconds / 60)
    const sec = totalSeconds % 60
    return `${min} min ${sec} seg (${(d * 1000).toFixed(0)}m)`
  }

  // Helper route solver
  const solveRoute = (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
    const activeLines = lines.length > 0 ? lines : MOCK_LINES
    const allStops = activeLines.flatMap(line => 
      getMockStopsForLine(line).map(stop => ({
        ...stop,
        line_number: line.line_number,
        color: line.color,
      }))
    )

    // Using 2.0 km search radius to accommodate distance between geocoded presets and active lines in the simulator
    const nearOrigin = allStops.filter(stop => distanceKm(stop, origin) < 2.0)
    const nearDest = allStops.filter(stop => distanceKm(stop, dest) < 2.0)

    let bestRoute = null
    let minWalkDistance = Infinity

    for (const stopO of nearOrigin) {
      for (const stopD of nearDest) {
        if (stopO.line_id === stopD.line_id) {
          const walkO = distanceKm(stopO, origin)
          const walkD = distanceKm(stopD, dest)
          const totalWalk = walkO + walkD
          if (totalWalk < minWalkDistance) {
            minWalkDistance = totalWalk
            bestRoute = {
              line_id: stopO.line_id,
              line_number: stopO.line_number,
              color: stopO.color,
              originStop: stopO,
              destStop: stopD,
            }
          }
        }
      }
    }
    return bestRoute
  }

  // ── init ──
  useEffect(() => {
    setPrefs(loadPrefs())
    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUser(user) })
    supabase.from('bus_lines').select('*').eq('is_active', true).then(({ data }) => {
      const ALLOWED_LINES = ['12', '28', '37', '39', '59', '60', '102', '152']
      const availableLines = (data && data.length > 0 ? data : MOCK_LINES).filter(l => ALLOWED_LINES.includes(l.line_number))
      setLines(availableLines)
      
      // Default pre-select Line 59 to show active bus markers immediately on map load
      const defaultLine = availableLines.find(l => l.line_number === '59')
      if (defaultLine) {
        setSelectedLines([defaultLine])
      }
    })
  }, [])

  const updatePrefs = useCallback((patch: Partial<UserPrefs>) => {
    setPrefs(prev => { const next = { ...prev, ...patch }; savePrefs(next); return next })
  }, [])

  // Sync theme with document class
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (prefs.darkMap) {
        document.documentElement.classList.add('dark')
        document.documentElement.classList.remove('light')
      } else {
        document.documentElement.classList.remove('dark')
        document.documentElement.classList.add('light')
      }
    }
  }, [prefs.darkMap])

  // Turn off traffic overlay if no lines are selected
  useEffect(() => {
    if (selectedLines.length === 0) {
      setShowTraffic(false)
    }
  }, [selectedLines])

  // ── line subscription + real-time API + smooth LERP animation ──
  useEffect(() => {
    if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
    if (apiPollRef.current) { clearInterval(apiPollRef.current); apiPollRef.current = null }
    setBuses([])
    setLineStops([])
    setUseMockBuses(false)
    targetBusesRef.current = {}
    if (selectedLines.length === 0) return

    // lineStops is updated via a separate useEffect that monitors directionFilter

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
    setDirectionFilter('all')

    // Fetch and poll function
    const fetchBusesRealtime = async () => {
      try {
        const selectedIds = selectedLines.map(l => l.id)
        const allFetched: BusPosition[] = []
        let hasSimulationSource = false

        for (const line of selectedLines) {
          console.log(`[Frontend] Fetching live buses for Line ${line.line_number} (${line.id})...`)
          const res = await fetch(`/api/buses?line_id=${line.id}&line_number=${line.line_number}`)
          if (!res.ok) {
            console.error(`[Frontend ERROR] Fetch failed for Line ${line.line_number} (status: ${res.status})`)
            continue
          }
          const json = await res.json()
          if (json.error) {
            console.error(`[Frontend ERROR] API error reported for Line ${line.line_number}:`, json.error)
          }
          if (json.data && Array.isArray(json.data)) {
            console.log(`[Frontend] Line ${line.line_number}: Received ${json.data.length} buses from ${json.source}`)
            allFetched.push(...json.data)
            if (json.source === 'simulation') {
              hasSimulationSource = true
            }
          } else {
            console.warn(`[Frontend WARNING] Invalid or empty data payload for Line ${line.line_number}:`, json)
          }
        }

        // Filter out buses not in selected lines just in case
        const activeFetched = allFetched.filter(b => selectedIds.includes(b.line_id))
        console.log(`[Frontend] Total active matched buses for selected lines: ${activeFetched.length}`)

        // Set simulated/realtime indicator badge on UI
        setUseMockBuses(hasSimulationSource)

        // Store new positions as targets and implement dynamic vehicle pooling (with distance filtering)
        const pooledBusesList: BusPosition[] = []
        activeFetched.forEach(bus => {
          // Verify if bus coordinate is close to official route path (within 5 km) to filter out depots/false positives
          const routeKey = bus.line_number.replace(/^0+/, '')
          const officialRoute = OFFICIAL_ROUTES[routeKey]
          const busDir = bus.direction || 'ida'
          const dirObj = busDir === 'vuelta' ? officialRoute?.vuelta : officialRoute?.ida
          const path = dirObj?.path || []

          if (path.length > 0) {
            let minDistance = Infinity
            path.forEach(pt => {
              const d = distanceKm({ latitude: bus.latitude, longitude: bus.longitude }, { lat: pt.lat, lng: pt.lng })
              if (d < minDistance) {
                minDistance = d
              }
            })
            if (minDistance > 5.0) {
              console.log(`[Frontend] Skipping bus ID ${bus.id} because it is too far from route (${minDistance.toFixed(1)} km)`)
              return
            }
          }

          pooledBusesList.push(bus)

          const existing = busSeenStateRef.current[bus.id]
          if (existing) {
            busSeenStateRef.current[bus.id] = { bus, missingCycles: 0 }
          } else {
            busSeenStateRef.current[bus.id] = { bus, missingCycles: 0 }
            if (!busReckoningRef.current[bus.id]) {
              busReckoningRef.current[bus.id] = {
                lastTelemetryReceivedTime: Date.now(),
                blendStartCoords: null,
                currentCoords: { lat: bus.latitude, lng: bus.longitude },
                pathIndex: 0
              }
            }
          }
        })

        const fetchedIds = new Set(pooledBusesList.map(b => b.id))

        // Increment missing count for absent vehicles
        Object.keys(busSeenStateRef.current).forEach(id => {
          if (!fetchedIds.has(id)) {
            busSeenStateRef.current[id].missingCycles += 1
          }
        })

        // Purge vehicles missing for more than 3 polling cycles (destruction)
        Object.keys(busSeenStateRef.current).forEach(id => {
          if (busSeenStateRef.current[id].missingCycles > 3) {
            console.log(`[Frontend] Purging inactive bus ID ${id} from circulation`)
            delete busSeenStateRef.current[id]
            delete busReckoningRef.current[id]
          }
        })

        const pooledBuses = Object.values(busSeenStateRef.current).map(item => item.bus)

        // Store new pooled positions as targets
        const newTargets: Record<string, BusPosition> = {}
        pooledBuses.forEach(bus => {
          newTargets[bus.id] = bus
        })
        targetBusesRef.current = newTargets

        // Pre-compute dead reckoning transition details for next coordinates blending
        activeFetched.forEach(bus => {
          const reckoning = busReckoningRef.current[bus.id]
          if (reckoning) {
            const hasChanged = reckoning.currentCoords.lat !== bus.latitude || reckoning.currentCoords.lng !== bus.longitude
            if (hasChanged) {
              reckoning.blendStartCoords = { lat: reckoning.currentCoords.lat, lng: reckoning.currentCoords.lng }
              reckoning.lastTelemetryReceivedTime = Date.now()
            }

            const routeKey = bus.line_number.replace(/^0+/, '')
            const officialRoute = OFFICIAL_ROUTES[routeKey]
            if (officialRoute) {
              const busDir = bus.direction || 'ida'
              const dirObj = busDir === 'vuelta' ? officialRoute.vuelta : officialRoute.ida
              if (dirObj && dirObj.path && dirObj.path.length > 0) {
                let closestIdx = 0
                let minD = Infinity
                dirObj.path.forEach((pt, idx) => {
                  const d = distanceKm({ latitude: bus.latitude, longitude: bus.longitude }, { lat: pt.lat, lng: pt.lng })
                  if (d < minD) {
                    minD = d
                    closestIdx = idx
                  }
                })
                reckoning.pathIndex = closestIdx
              }
            }
          }
        })

        // Persistent Traffic State Engine (Sticky Traffic Memory Segment updates)
        const newSegmentColors: Record<string, { color: string; timestamp: number }> = {}
        activeFetched.forEach(bus => {
          const lineNum = bus.line_number
          const routeKey = lineNum.replace(/^0+/, '')
          const officialRoute = OFFICIAL_ROUTES[routeKey]
          if (!officialRoute) return

          const busDir = bus.direction || 'ida'
          const dirObj = busDir === 'vuelta' ? officialRoute.vuelta : officialRoute.ida
          if (!dirObj || !dirObj.path || !dirObj.stops || dirObj.stops.length < 2) return

          const path = dirObj.path
          const stops = dirObj.stops

          // Find closest coordinate in route shape path
          let closestIdx = 0
          let minDistance = Infinity
          path.forEach((pt, idx) => {
            const d = distanceKm({ latitude: bus.latitude, longitude: bus.longitude }, { lat: pt.lat, lng: pt.lng })
            if (d < minDistance) {
              minDistance = d
              closestIdx = idx
            }
          })

          // Update state if vehicle coordinate aligns with route path within 500 meters
          if (minDistance < 0.5) {
            let segmentIdx = 0
            for (let idx = 0; idx < stops.length - 1; idx++) {
              if (closestIdx <= stops[idx + 1].pathIndex) {
                segmentIdx = idx
                break
              }
              segmentIdx = idx
            }

            let color = '#10B981' // GREEN (Fluid: >= 22 km/h)
            if (bus.speed_kmh < 10) {
              color = '#EF4444' // RED (Heavy: < 10 km/h)
            } else if (bus.speed_kmh < 22) {
              color = '#F59E0B' // YELLOW (Moderate: 10-21 km/h)
            }

            const key = `${lineNum}-${busDir}-${segmentIdx}`
            newSegmentColors[key] = { color, timestamp: Date.now() }
          }
        })

        if (Object.keys(newSegmentColors).length > 0) {
          setTrafficState(prev => {
            const now = Date.now()
            const next = { ...prev }
            Object.entries(newSegmentColors).forEach(([key, val]) => {
              next[key] = val
            })
            // Garbage collect expired items
            Object.keys(next).forEach(key => {
              if (now - next[key].timestamp > 30 * 60 * 1000) {
                delete next[key]
              }
            })
            return next
          })
        }

        // Trigger initial state population: immediately update state to include all pooled buses
        setBuses(prev => {
          const remaining = prev.filter(b => busSeenStateRef.current[b.id] !== undefined)
          const existingIds = new Set(remaining.map(b => b.id))
          const toAdd = pooledBuses.filter(b => !existingIds.has(b.id))
          console.log(`[Frontend] Updating map state. Existing: ${remaining.length}, New added: ${toAdd.length}`)
          return [...remaining, ...toAdd]
        })
      } catch (e: any) {
        console.error('[Frontend ERROR] Error fetching dynamic bus positions:', e)
        toast.error(`Error al obtener posiciones en tiempo real: ${e.message || e}`)
      }
    }

    // Call immediately
    fetchBusesRealtime()

    // Poll every 15 seconds (within 15-30s range requested by user)
    apiPollRef.current = setInterval(fetchBusesRealtime, 15000)

    let lastTick = Date.now()

    // Smooth LERP/Dead Reckoning animation tick (50ms interval)
    mockTickRef.current = setInterval(() => {
      const now = Date.now()
      const dt = Math.min((now - lastTick) / 1000, 0.1) // clamp dt to max 100ms
      lastTick = now

      setBuses(prevBuses => {
        const targets = targetBusesRef.current
        const nextBuses: BusPosition[] = []

        // 1. Smoothly interpolate/extrapolate existing buses
        prevBuses.forEach(bus => {
          const target = targets[bus.id]
          if (target) {
            const reckoning = busReckoningRef.current[bus.id]
            if (!reckoning) {
              busReckoningRef.current[bus.id] = {
                lastTelemetryReceivedTime: now,
                blendStartCoords: null,
                currentCoords: { lat: target.latitude, lng: target.longitude },
                pathIndex: 0
              }
              nextBuses.push({
                ...target,
                passenger_count: 0
              })
              return
            }

            const elapsedMs = now - reckoning.lastTelemetryReceivedTime
            let nextLat = target.latitude
            let nextLng = target.longitude
            let nextHeading = target.heading || 0

            const routeKey = target.line_number.replace(/^0+/, '')
            const officialRoute = OFFICIAL_ROUTES[routeKey]
            const busDir = target.direction || 'ida'
            const dirObj = busDir === 'vuelta' ? officialRoute?.vuelta : officialRoute?.ida
            const path = dirObj?.path || []

            if (elapsedMs <= 1000) {
              // Correction Blending
              const start = reckoning.blendStartCoords || { lat: target.latitude, lng: target.longitude }
              const t = Math.max(0, Math.min(1, elapsedMs / 1000))
              nextLat = start.lat + (target.latitude - start.lat) * t
              nextLng = start.lng + (target.longitude - start.lng) * t
              reckoning.currentCoords = { lat: nextLat, lng: nextLng }

              if (path.length > 0) {
                const idx = reckoning.pathIndex
                const nextPointForHeading = path[idx + 1] || path[idx]
                if (nextPointForHeading && (nextPointForHeading.lat !== nextLat || nextPointForHeading.lng !== nextLng)) {
                  nextHeading = heading(nextLat, nextLng, nextPointForHeading.lat, nextPointForHeading.lng)
                } else if (idx > 0 && path[idx - 1]) {
                  nextHeading = heading(path[idx - 1].lat, path[idx - 1].lng, nextLat, nextLng)
                }
              }
            } else {
              // Dead Reckoning extrapolation along road path
              const speedKmh = Math.max(0, target.speed_kmh - 5)
              if (path.length > 0 && speedKmh > 0) {
                const speedMs = (speedKmh * 1000) / 3600
                const stepDistanceKm = (speedMs * dt) / 1000

                let currLat = reckoning.currentCoords.lat
                let currLng = reckoning.currentCoords.lng
                let idx = reckoning.pathIndex
                let distanceToMove = stepDistanceKm

                while (distanceToMove > 0 && idx < path.length - 1) {
                  const nextPt = path[idx + 1]
                  const distToNext = distanceKm({ latitude: currLat, longitude: currLng }, { lat: nextPt.lat, lng: nextPt.lng })
                  if (distanceToMove >= distToNext) {
                    distanceToMove -= distToNext
                    currLat = nextPt.lat
                    currLng = nextPt.lng
                    idx++
                  } else {
                    const ratio = distanceToMove / distToNext
                    currLat = currLat + (nextPt.lat - currLat) * ratio
                    currLng = currLng + (nextPt.lng - currLng) * ratio
                    distanceToMove = 0
                  }
                }

                nextLat = currLat
                nextLng = currLng
                reckoning.currentCoords = { lat: currLat, lng: currLng }
                reckoning.pathIndex = idx

                const nextPointForHeading = path[idx + 1] || path[idx]
                if (nextPointForHeading && (nextPointForHeading.lat !== currLat || nextPointForHeading.lng !== currLng)) {
                  nextHeading = heading(currLat, currLng, nextPointForHeading.lat, nextPointForHeading.lng)
                } else if (idx > 0 && path[idx - 1]) {
                  nextHeading = heading(path[idx - 1].lat, path[idx - 1].lng, currLat, currLng)
                }
              } else {
                nextLat = reckoning.currentCoords.lat
                nextLng = reckoning.currentCoords.lng
              }
            }

            nextBuses.push({
              ...target,
              latitude: nextLat,
              longitude: nextLng,
              heading: nextHeading,
              passenger_count: 0
            })
          }
        })

        // 2. Add new buses that just appeared in target positions
        Object.keys(targets).forEach(id => {
          const alreadyExists = prevBuses.some(b => b.id === id)
          if (!alreadyExists) {
            const bus = targets[id]
            if (!busReckoningRef.current[id]) {
              busReckoningRef.current[id] = {
                lastTelemetryReceivedTime: now,
                blendStartCoords: null,
                currentCoords: { lat: bus.latitude, lng: bus.longitude },
                pathIndex: 0
              }
            }
            nextBuses.push({
              ...bus,
              passenger_count: 0
            })
          }
        })

        return nextBuses
      })
    }, 50)

    return () => {
      if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
      if (apiPollRef.current) { clearInterval(apiPollRef.current); apiPollRef.current = null }
    }
  }, [selectedLines])

  // Prune expired traffic segments older than 30 minutes on a recurring schedule
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficState(prev => {
        const now = Date.now()
        let changed = false
        const next = { ...prev }
        Object.keys(next).forEach(key => {
          if (now - next[key].timestamp > 30 * 60 * 1000) {
            delete next[key]
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 15000)
    return () => clearInterval(interval)
  }, [])

  // Update lineStops dynamically when selectedLines or directionFilter changes
  useEffect(() => {
    if (selectedLines.length === 0) {
      setLineStops([])
      return
    }
    const combinedStops = selectedLines.flatMap(line => getMockStopsForLine(line, directionFilter))
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
  }, [selectedLines, directionFilter])

  // Center on tracked bus
  useEffect(() => {
    if (!trackedBusId || buses.length === 0) return
    const tracked = buses.find(b => b.id === trackedBusId)
    if (tracked) {
      setViewState(v => ({ ...v, latitude: tracked.latitude, longitude: tracked.longitude }))
    }
  }, [trackedBusId, buses])

  // Close selected bus popup when switching tabs/panels
  useEffect(() => {
    if (activePanel !== 'map') {
      setSelectedBus(null)
    }
  }, [activePanel])

  const handleLocated = useCallback((e: any) => {
    const { latitude, longitude } = e.coords
    supabase.rpc('get_nearby_stops', { user_lat: latitude, user_lng: longitude })
      .then(({ data }) => { if (data) setNearbyStops(data) })
  }, [])

  const handleGeolocate = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setViewState(v => ({ ...v, latitude, longitude, zoom: 14 }))
          supabase.rpc('get_nearby_stops', { user_lat: latitude, user_lng: longitude })
            .then(({ data }) => { if (data) setNearbyStops(data) })
        },
        (error) => {
          console.error('Error getting location:', error)
        }
      )
    }
  }

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

  const getDirectionLabels = () => {
    const lineNum = selectedLines[0]?.line_number
    if (lineNum === '12') return { ida: 'A Palermo', vuelta: 'A Barracas' }
    if (lineNum === '28') return { ida: 'A Puente La Noria', vuelta: 'A Retiro' }
    if (lineNum === '37') return { ida: 'A Plaza Italia', vuelta: 'A Est. Lanús' }
    if (lineNum === '60') return { ida: 'A Tigre/Escobar', vuelta: 'A Constitución' }
    if (lineNum === '152') return { ida: 'A Olivos', vuelta: 'A La Boca' }
    return { ida: 'Ida (Salida)', vuelta: 'Vuelta (Regreso)' }
  }
  const dirLabels = getDirectionLabels()
  // Render paths for all selected lines (supporting multiple branches)
  const routeGeoJsons = selectedLines.map(line => {
    const paths = getMockRoutePathsForLine(line, directionFilter)
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

  // Real-time Traffic GeoJson Generator (Segmented route mapping based on persistent stop-bounded traffic color states)
  const trafficGeoJsons = showTraffic ? selectedLines.map(line => {
    const features: any[] = []
    const lineNum = line.line_number
    const routeKey = lineNum.replace(/^0+/, '')
    const officialRoute = OFFICIAL_ROUTES[routeKey]

    if (officialRoute) {
      // Determine which directions to show based on directionFilter
      const directionsToShow = directionFilter === 'all' ? ['ida', 'vuelta'] : [directionFilter]

      directionsToShow.forEach(dir => {
        const dirObj = dir === 'vuelta' ? officialRoute.vuelta : officialRoute.ida
        if (dirObj && dirObj.path && dirObj.stops && dirObj.stops.length >= 2) {
          const path = dirObj.path
          const stops = dirObj.stops
          const N = stops.length

          for (let k = 0; k < N - 1; k++) {
            const startIndex = (k === 0) ? 0 : stops[k].pathIndex
            const endIndex = (k === N - 2) ? path.length - 1 : stops[k+1].pathIndex
            const slice = path.slice(startIndex, endIndex + 1)
            if (slice.length < 2) continue

            const key = `${lineNum}-${dir}-${k}`
            const state = trafficState[key]
            let trafficColor = 'rgba(107, 114, 128, 0.35)' // Neutral gray solid base route color by default

            if (state) {
              // Confirm cache validity within 30-minute window
              if (Date.now() - state.timestamp <= 30 * 60 * 1000) {
                trafficColor = state.color
              }
            }

            features.push({
              type: 'Feature' as const,
              properties: { color: trafficColor },
              geometry: {
                type: 'LineString' as const,
                coordinates: slice.map(point => [point.lng, point.lat]),
              }
            })
          }
        }
      })
    }

    return {
      id: `traffic-${line.id}`,
      features
    }
  }) : []

  const showTravelPins = travelPlannerOpen || showLineSelector || !!mapSelectionMode

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      overflow: 'hidden',
      background: (!physicalMobile && forceMobilePreview) ? '#0b0f19' : 'var(--void)',
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative'
    }}>
      {/* Ambient background glow for phone mockup */}
      {!physicalMobile && forceMobilePreview && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, rgba(184,200,224,0.06) 0%, rgba(30,27,75,0.08) 50%, rgba(3,7,18,0.3) 100%)',
          zIndex: 1,
          pointerEvents: 'none'
        }} />
      )}

      {/* Desktop Previewer Mode Switcher */}
      {!physicalMobile && (
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          zIndex: 5000,
          background: 'rgba(10, 14, 20, 0.95)',
          border: '1px solid rgba(184, 200, 224, 0.15)',
          borderRadius: '12px',
          padding: '4px',
          display: 'flex',
          gap: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <button
            onClick={() => setForceMobilePreview(false)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: !forceMobilePreview ? 'rgba(184,200,224,0.12)' : 'transparent',
              color: !forceMobilePreview ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            🖥️ Computadora
          </button>
          <button
            onClick={() => setForceMobilePreview(true)}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              border: 'none',
              background: forceMobilePreview ? 'rgba(184,200,224,0.12)' : 'transparent',
              color: forceMobilePreview ? 'var(--text-primary)' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            📱 Celular (Preview)
          </button>
        </div>
      )}

      {/* Inner App Container with conditional Phone Mockup styling */}
      <div style={{
        position: 'relative',
        display: 'flex',
        overflow: 'hidden',
        background: 'var(--void)',
        ...( (!physicalMobile && forceMobilePreview) ? {
          width: '375px',
          height: '812px',
          borderRadius: '40px',
          border: '12px solid #111827',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(255, 255, 255, 0.05)',
          zIndex: 2
        } : {
          width: '100%',
          height: '100%'
        } )
      }}>
        {/* Top Notch / Dynamic Island for mockup mode */}
        {!physicalMobile && forceMobilePreview && (
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '110px',
            height: '28px',
            background: '#111827',
            borderRadius: '16px',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1f2937', marginLeft: '50px' }} />
          </div>
        )}

        {/* Bottom Home Indicator Bar for mockup mode */}
        {!physicalMobile && forceMobilePreview && (
          <div style={{
            position: 'absolute',
            bottom: '6px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            zIndex: 10000,
            pointerEvents: 'none'
          }} />
        )}

      {/* ═══════════════════════════════════════════════════════════════
          LEFT SIDEBAR — permanent, collapsible
      ═══════════════════════════════════════════════════════════════ */}
      {!isMobile && (
        <div
          style={{
            width: sidebarW, flexShrink: 0, height: '100vh',
            background: prefs.darkMap
              ? 'linear-gradient(180deg,rgba(14,20,30,0.99) 0%,rgba(8,12,18,0.99) 100%)'
              : 'linear-gradient(180deg,rgba(255,255,255,0.99) 0%,rgba(243,244,246,0.99) 100%)',
            borderRight: prefs.darkMap
              ? '1px solid rgba(184,200,224,0.08)'
              : '1px solid rgba(0,0,0,0.08)',
            display: 'flex', flexDirection: 'column',
            transition: 'width 220ms ease',
            overflow: 'hidden', zIndex: 20,
          }}
        >
        {/* Logo + collapse */}
        <div style={{ padding: '18px 14px 14px', borderBottom: prefs.darkMap ? '1px solid rgba(184,200,224,0.07)' : '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            border: prefs.darkMap ? '1px solid rgba(184,200,224,0.18)' : '1px solid rgba(0,0,0,0.12)',
            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <img src="/images/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em' }}>TuBus</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email || 'usuario'}</div>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              width: '26px', height: '26px', borderRadius: '8px',
              background: prefs.darkMap ? 'rgba(184,200,224,0.05)' : 'rgba(0,0,0,0.05)',
              border: prefs.darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
            }}
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
                  background: active 
                    ? (prefs.darkMap ? 'rgba(184,200,224,0.1)' : 'rgba(0,0,0,0.06)') 
                    : 'transparent',
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
      )}

      {/* ═══════════════════════════════════════════════════════════════
          RIGHT AREA — map + panels
      ═══════════════════════════════════════════════════════════════ */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

        {/* ── MAP ── */}
        <Map
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          onDragStart={() => setTrackedBusId(null)}
          onZoomStart={() => setTrackedBusId(null)}
          mapStyle={prefs.darkMap ? (CARTODB_DARK as any) : (CARTODB_LIGHT as any)}
          style={{ width: '100%', height: '100%' }}
          onClick={e => {
            if (mapSelectionMode === 'origin') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setOriginCoord({ lat, lng })
              setOriginInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setOriginInput)
              setMapSelectionMode(null)
              setLineSelectorTab('route')
              setShowLineSelector(true)
              if (destCoord) {
                setTravelRoute(solveRoute({ lat, lng }, destCoord))
              }
            } else if (mapSelectionMode === 'destination') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setDestCoord({ lat, lng })
              setDestInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setDestInput)
              setMapSelectionMode(null)
              setLineSelectorTab('route')
              setShowLineSelector(true)
              if (originCoord) {
                setTravelRoute(solveRoute(originCoord, { lat, lng }))
              }
            } else {
              setSelectedBus(null)
            }
          }}
        >

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

          {/* Traffic Overlay Layers */}
          {showTraffic && trafficGeoJsons.map(item => (
            <Source key={item.id} id={item.id} type="geojson" data={{
              type: 'FeatureCollection',
              features: item.features as any
            }}>
              <Layer
                id={`${item.id}-casing`}
                type="line"
                paint={{
                  'line-color': prefs.darkMap ? '#060810' : '#FFFFFF',
                  'line-width': 5,
                  'line-opacity': 0.8
                }}
              />
              <Layer
                id={`${item.id}-lines`}
                type="line"
                paint={{
                  'line-color': ['get', 'color'],
                  'line-width': 3,
                  'line-opacity': 0.95
                }}
              />
            </Source>
          ))}

          {buses
            .filter(bus => {
              if (bus.line_number === '60' && branchFilter !== 'all' && bus.ramal !== branchFilter) return false
              if (trackedBusId && bus.id !== trackedBusId) return false
              if (directionFilter !== 'all' && bus.direction !== directionFilter) return false
              return true
            })
            .map(bus => {
              const line = lines.find(l => l.id === bus.line_id)
              const lineColor = line?.color || '#B8C8E0'
              return (
                 <Marker key={bus.id} longitude={bus.longitude} latitude={bus.latitude} anchor="center" rotation={bus.heading} rotationAlignment="map">
                  <PremiumBusMarker bus={bus} lineColor={lineColor} isSelected={selectedBus?.id === bus.id} showPassengers={prefs.showPassengerCount} onClick={() => handleBusClick(bus)} />
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
                const activeLines = lines.length > 0 ? lines : MOCK_LINES
                const allStops = activeLines.flatMap(line => getMockStopsForLine(line))
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
          {showTravelPins && originCoord && (
            <Marker
              longitude={originCoord.lng}
              latitude={originCoord.lat}
              draggable
              onDragEnd={e => {
                const coord = { lat: e.lngLat.lat, lng: e.lngLat.lng }
                setOriginCoord(coord)
                setOriginInput(getNearestStreetName(coord.lat, coord.lng))
                fetchAddressAsync(coord.lat, coord.lng, setOriginInput)
                setSelectedBoardingBusId(null)
                if (destCoord) setTravelRoute(solveRoute(coord, destCoord))
              }}
              anchor="bottom"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#3B82F6', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', marginBottom: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>Origen</div>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3B82F6', border: '2.5px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
              </div>
            </Marker>
          )}

          {showTravelPins && destCoord && (
            <Marker
              longitude={destCoord.lng}
              latitude={destCoord.lat}
              draggable
              onDragEnd={e => {
                const coord = { lat: e.lngLat.lat, lng: e.lngLat.lng }
                setDestCoord(coord)
                setDestInput(getNearestStreetName(coord.lat, coord.lng))
                fetchAddressAsync(coord.lat, coord.lng, setDestInput)
                setSelectedBoardingBusId(null)
                if (originCoord) setTravelRoute(solveRoute(originCoord, coord))
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
          {showTravelPins && travelRoute && originCoord && destCoord && (
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
              <MiniPopup
                bus={selectedBus}
                onReport={() => setShowReport(true)}
                isFavBus={(prefs.favBuses || []).includes(selectedBus.bus_unit)}
                isFavDriver={(prefs.favDrivers || []).includes(selectedBus.driver_name)}
                onToggleFavBus={() => {
                  const current = prefs.favBuses || []
                  const exists = current.includes(selectedBus.bus_unit)
                  updatePrefs({
                    favBuses: exists
                      ? current.filter(u => u !== selectedBus.bus_unit)
                      : [...current, selectedBus.bus_unit]
                  })
                }}
                onToggleFavDriver={() => {
                  const current = prefs.favDrivers || []
                  const exists = current.includes(selectedBus.driver_name)
                  updatePrefs({
                    favDrivers: exists
                      ? current.filter(d => d !== selectedBus.driver_name)
                      : [...current, selectedBus.driver_name]
                  })
                }}
              />
            </Popup>
          )}
        </Map>

        {/* Map Selection Banner */}
        <AnimatePresence>
          {mapSelectionMode && (
            <motion.div
              initial={{ y: -70, opacity: 0 }}
              animate={{ y: 14, opacity: 1 }}
              exit={{ y: -70, opacity: 0 }}
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 100,
                width: 'calc(100% - 32px)',
                maxWidth: '480px',
                pointerEvents: 'auto'
              }}
            >
              <div
                className="glass-dark"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 18px',
                  borderRadius: 'var(--r-md)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  border: '1px solid rgba(184,200,224,0.15)',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#FF4D6A' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Hacé click en el mapa para marcar tu {mapSelectionMode === 'origin' ? 'Origen' : 'Destino'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setMapSelectionMode(null)
                    setLineSelectorTab('route')
                    setShowLineSelector(true)
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontFamily: 'DM Sans',
                    fontWeight: 600
                  }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── TOP BAR (Multi-selection & Close) ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
          padding: isMobile ? '12px 12px 0' : '14px 14px 0',
          pointerEvents: 'none', display: 'flex', justifyContent: 'center'
        }}>
          <motion.div
            initial={{ y: -50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 26, stiffness: 200 }}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: (isMobile && selectedLines.length === 0)
                ? 'transparent'
                : (prefs.darkMap
                    ? 'linear-gradient(145deg,rgba(19,25,33,0.97),rgba(10,14,20,0.99))'
                    : 'linear-gradient(145deg,rgba(255,255,255,0.97),rgba(243,244,246,0.99))'),
              backdropFilter: (isMobile && selectedLines.length === 0) ? 'none' : 'blur(24px)',
              WebkitBackdropFilter: (isMobile && selectedLines.length === 0) ? 'none' : 'blur(24px)',
              border: (isMobile && selectedLines.length === 0)
                ? 'none'
                : (prefs.darkMap ? '1px solid rgba(184,200,224,0.12)' : '1px solid rgba(0,0,0,0.08)'),
              borderRadius: '14px',
              padding: (isMobile && selectedLines.length === 0) ? '0' : '9px 12px',
              boxShadow: (isMobile && selectedLines.length === 0)
                ? 'none'
                : (prefs.darkMap ? '0 8px 40px rgba(0,0,0,0.7)' : '0 8px 30px rgba(0,0,0,0.06)'),
              pointerEvents: 'auto',
              width: isMobile ? '100%' : 'auto',
              maxWidth: isMobile ? '480px' : 'none',
              justifyContent: (isMobile && selectedLines.length === 0) ? 'space-between' : 'flex-start'
            }}
          >
            {isMobile && selectedLines.length === 0 ? (
              <div style={{ display: 'flex', width: '100%', gap: '8px' }}>
                {/* Recorrido */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setLineSelectorTab('route')
                    setShowLineSelector(true)
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '11px 10px',
                    borderRadius: '12px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: lineSelectorTab === 'route' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    background: lineSelectorTab === 'route'
                      ? (prefs.darkMap ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)')
                      : (prefs.darkMap ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.6)'),
                    color: lineSelectorTab === 'route'
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    border: lineSelectorTab === 'route'
                      ? (prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(0, 0, 0, 0.15)')
                      : (prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)'),
                    boxShadow: prefs.darkMap 
                      ? '0 4px 20px rgba(0,0,0,0.4)' 
                      : '0 4px 12px rgba(0,0,0,0.05)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                  }}
                >
                  <Route size={14} style={{ color: lineSelectorTab === 'route' ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                  <span>Recorrido</span>
                </motion.button>

                {/* Cerca mío */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setLineSelectorTab('nearby')
                    setShowLineSelector(true)
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '11px 10px',
                    borderRadius: '12px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: lineSelectorTab === 'nearby' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    background: lineSelectorTab === 'nearby'
                      ? (prefs.darkMap ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)')
                      : (prefs.darkMap ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.6)'),
                    color: lineSelectorTab === 'nearby'
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    border: lineSelectorTab === 'nearby'
                      ? (prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(0, 0, 0, 0.15)')
                      : (prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)'),
                    boxShadow: prefs.darkMap 
                      ? '0 4px 20px rgba(0,0,0,0.4)' 
                      : '0 4px 12px rgba(0,0,0,0.05)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                  }}
                >
                  <MapPin size={14} style={{ color: lineSelectorTab === 'nearby' ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                  <span>Cerca mío</span>
                </motion.button>

                {/* Por línea */}
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => {
                    setLineSelectorTab('line')
                    setShowLineSelector(true)
                  }}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '11px 10px',
                    borderRadius: '12px',
                    fontFamily: 'DM Sans, sans-serif',
                    fontSize: '13px',
                    fontWeight: lineSelectorTab === 'line' ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    background: lineSelectorTab === 'line'
                      ? (prefs.darkMap ? 'rgba(30, 41, 59, 0.85)' : 'rgba(255, 255, 255, 0.95)')
                      : (prefs.darkMap ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.6)'),
                    color: lineSelectorTab === 'line'
                      ? 'var(--text-primary)'
                      : 'var(--text-muted)',
                    border: lineSelectorTab === 'line'
                      ? (prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.22)' : '1px solid rgba(0, 0, 0, 0.15)')
                      : (prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)'),
                    boxShadow: prefs.darkMap 
                      ? '0 4px 20px rgba(0,0,0,0.4)' 
                      : '0 4px 12px rgba(0,0,0,0.05)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)'
                  }}
                >
                  <Bus size={14} style={{ color: lineSelectorTab === 'line' ? 'var(--text-primary)' : 'var(--text-muted)' }} />
                  <span>Por línea</span>
                </motion.button>
              </div>
            ) : (
              <>
                {selectedLines.length > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', flex: 1, paddingRight: '8px', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                    {selectedLines.map(line => (
                      <div key={line.id} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: prefs.darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.04)',
                        border: prefs.darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)',
                        padding: '4px 8px', borderRadius: '8px', flexShrink: 0
                      }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color }} />
                        <span style={{ color: 'var(--text-primary)', fontSize: '12px', fontWeight: 600 }}>Línea {line.line_number}</span>
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
                      onClick={(e) => { e.stopPropagation(); setLineSelectorTab('line'); setShowLineSelector(true) }}
                      style={{
                        background: prefs.darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                        border: prefs.darkMap ? '1px dashed rgba(255,255,255,0.15)' : '1px dashed rgba(0,0,0,0.15)',
                        color: '#9CA3AF', fontSize: '11px', padding: '4px 8px', borderRadius: '8px', cursor: 'pointer', fontWeight: 500
                      }}
                    >
                      + Agregar línea
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setLineSelectorTab('line'); setShowLineSelector(true); }}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: isMobile ? 'center' : 'left', justifyContent: isMobile ? 'center' : 'flex-start' }}
                  >
                    <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Elegí una línea...</span>
                  </button>
                )}

                {selectedLines.length === 1 && (
                  <button onClick={() => updatePrefs({ favBusLines: prefs.favBusLines.includes(selectedLines[0].id) ? prefs.favBusLines.filter(id => id !== selectedLines[0].id) : [...prefs.favBusLines, selectedLines[0].id] })}
                    style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: prefs.darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.04)',
                      border: prefs.darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                    }}>
                    <Star size={12} style={{ color: prefs.favBusLines.includes(selectedLines[0].id) ? '#F59E0B' : 'var(--text-muted)', fill: prefs.favBusLines.includes(selectedLines[0].id) ? '#F59E0B' : 'none' }} />
                  </button>
                )}

                {buses.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 9px', borderRadius: '999px', background: 'rgba(34,211,160,0.08)', border: '1px solid rgba(34,211,160,0.2)', flexShrink: 0 }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--go)' }} />
                    <span style={{ color: 'var(--go)', fontSize: '11px', fontFamily: 'DM Mono', fontWeight: 600 }}>{buses.length} en ruta</span>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>

        {/* ── FILTER TOOLBAR (Branch & Interno selection) ── */}
        {selectedLines.length > 0 && activePanel === 'map' && (
          <div style={{ position: 'absolute', top: '64px', left: 0, right: 0, zIndex: 9, padding: '0 14px', pointerEvents: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto',
              background: prefs.darkMap ? 'rgba(10,14,20,0.95)' : 'rgba(255,255,255,0.95)',
              border: prefs.darkMap ? '1px solid rgba(184,200,224,0.08)' : '1px solid rgba(0,0,0,0.08)',
              padding: '6px 12px', borderRadius: '10px',
              boxShadow: prefs.darkMap ? '0 4px 20px rgba(0,0,0,0.5)' : '0 4px 15px rgba(0,0,0,0.05)',
              width: 'fit-content'
            }}>
              {selectedLines.some(l => l.line_number === '60') && (
                <>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono' }}>RAMAL:</span>
                  <select
                    value={branchFilter}
                    onChange={e => { setBranchFilter(e.target.value); setTrackedBusId(null) }}
                    style={{
                      background: prefs.darkMap ? 'rgba(184,200,224,0.05)' : 'rgba(0,0,0,0.04)',
                      color: 'var(--text-primary)',
                      border: prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)',
                      borderRadius: '6px', fontSize: '11px', padding: '3px 6px', outline: 'none'
                    }}
                  >
                    <option value="all" style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>Todos</option>
                    <option value="A" style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>Ramal A (Tigre)</option>
                    <option value="B" style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>Ramal B (Escobar)</option>
                  </select>
                  <div style={{ width: '1px', height: '14px', background: 'rgba(184,200,224,0.15)', margin: '0 4px' }} />
                </>
              )}

              {/* Direction Outbound/Inbound Filter */}
              <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono' }}>SENTIDO:</span>
              <select
                value={directionFilter}
                onChange={e => { setDirectionFilter(e.target.value as any); setTrackedBusId(null) }}
                style={{
                  background: prefs.darkMap ? 'rgba(184,200,224,0.05)' : 'rgba(0,0,0,0.04)',
                  color: 'var(--text-primary)',
                  border: prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px', fontSize: '11px', padding: '3px 6px', outline: 'none', marginRight: '4px'
                }}
              >
                <option value="all" style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>Ambos sentidos</option>
                <option value="ida" style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>{dirLabels.ida}</option>
                <option value="vuelta" style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>{dirLabels.vuelta}</option>
              </select>
              <div style={{ width: '1px', height: '14px', background: 'rgba(184,200,224,0.15)', margin: '0 4px' }} />

              <span style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'DM Mono' }}>SEGUIR:</span>
              <select
                value={trackedBusId || 'all'}
                onChange={e => setTrackedBusId(e.target.value === 'all' ? null : e.target.value)}
                style={{
                  background: prefs.darkMap ? 'rgba(184,200,224,0.05)' : 'rgba(0,0,0,0.04)',
                  color: 'var(--text-primary)',
                  border: prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)',
                  borderRadius: '6px', fontSize: '11px', padding: '3px 6px', outline: 'none'
                }}
              >
                <option value="all" style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>Todos los colectivos</option>
                {buses
                  .filter(b => {
                    if (b.line_number === '60' && branchFilter !== 'all' && b.ramal !== branchFilter) return false
                    if (directionFilter !== 'all' && b.direction !== directionFilter) return false
                    return true
                  })
                  .map(b => (
                    <option key={b.id} value={b.id} style={{ background: prefs.darkMap ? '#111827' : '#ffffff', color: 'var(--text-primary)' }}>
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
              style={{
                position: 'absolute',
                top: isMobile ? '64px' : '74px',
                left: isMobile ? '10px' : '14px',
                right: isMobile ? '10px' : 'auto',
                zIndex: 11,
                width: isMobile ? 'auto' : '320px',
                background: prefs.darkMap
                  ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)'
                  : 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(243, 244, 246, 0.98) 100%)',
                border: prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '16px', padding: '14px',
                boxShadow: prefs.darkMap ? '0 10px 30px rgba(0,0,0,0.6)' : '0 10px 30px rgba(0,0,0,0.06)',
                color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: '10px',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Asistente de Viaje</span>
                <button onClick={() => { setTravelPlannerOpen(false); setSelectedBoardingBusId(null); }} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}><X size={14} /></button>
              </div>
              
              {/* Inputs stacked with connecting vertical line */}
              <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Vertical connecting line */}
                <div style={{ position: 'absolute', left: '16px', top: '20px', bottom: '20px', width: '2px', background: prefs.darkMap ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)', zIndex: 1 }} />
                
                {/* Origin Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3B82F6', border: '2px solid white', flexShrink: 0, marginLeft: '12px' }} />
                  <input
                    type="text"
                    value={originInput}
                    onChange={e => {
                      setOriginInput(e.target.value)
                      const coord = resolveStreetToCoords(e.target.value)
                      if (coord) {
                        setOriginCoord(coord)
                        setSelectedBoardingBusId(null)
                        setViewState(v => ({ ...v, latitude: coord.lat, longitude: coord.lng, zoom: 14 }))
                        if (destCoord) setTravelRoute(solveRoute(coord, destCoord))
                      }
                    }}
                    placeholder="Escribí calle de Origen (ej. Cabildo)..."
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: '8px',
                      background: prefs.darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: prefs.darkMap ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                      color: 'var(--text-primary)', fontSize: '11px', outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => {
                      const center = { lat: viewState.latitude, lng: viewState.longitude }
                      setOriginCoord(center)
                      setOriginInput(getNearestStreetName(center.lat, center.lng))
                      setSelectedBoardingBusId(null)
                      if (destCoord) setTravelRoute(solveRoute(center, destCoord))
                    }}
                    title="Marcar centro de mapa como origen"
                    style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', padding: '4px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📍 Pin
                  </button>
                </div>

                {/* Destination Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#111827', border: '2px solid white', flexShrink: 0, marginLeft: '12px' }} />
                  <input
                    type="text"
                    value={destInput}
                    onChange={e => {
                      setDestInput(e.target.value)
                      const coord = resolveStreetToCoords(e.target.value)
                      if (coord) {
                        setDestCoord(coord)
                        setSelectedBoardingBusId(null)
                        setViewState(v => ({ ...v, latitude: coord.lat, longitude: coord.lng, zoom: 14 }))
                        if (originCoord) setTravelRoute(solveRoute(originCoord, coord))
                      }
                    }}
                    placeholder="Escribí calle de Destino (ej. Plaza Italia)..."
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: '8px',
                      background: prefs.darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                      border: prefs.darkMap ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(0,0,0,0.08)',
                      color: 'var(--text-primary)', fontSize: '11px', outline: 'none'
                    }}
                  />
                  <button
                    onClick={() => {
                      const center = { lat: viewState.latitude, lng: viewState.longitude }
                      setDestCoord(center)
                      setDestInput(getNearestStreetName(center.lat, center.lng))
                      setSelectedBoardingBusId(null)
                      if (originCoord) setTravelRoute(solveRoute(originCoord, center))
                    }}
                    title="Marcar centro de mapa como destino"
                    style={{ background: 'rgba(17,24,39,0.15)', color: 'var(--text-primary)', border: '1px solid rgba(184,200,224,0.3)', borderRadius: '6px', padding: '4px 6px', fontSize: '10px', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📍 Pin
                  </button>
                </div>
              </div>

              <div style={{ fontSize: '10px', color: '#9CA3AF', textAlign: 'center', marginTop: '2px' }}>
                💡 Podés buscar por calle o arrastrar los pines en el mapa
              </div>

              {/* Route Result Card */}
              {travelRoute ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '10px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: travelRoute.color }} />
                      <span style={{ fontWeight: 'bold' }}>Línea {travelRoute.line_number} conectada</span>
                    </div>
                    <div>
                      🚶‍♂️ Caminá hasta parada: <strong>{travelRoute.originStop.name}</strong>
                    </div>
                    <div>
                      🚌 Tomá el colectivo y viajá hasta: <strong>{travelRoute.destStop.name}</strong>
                    </div>
                  </div>

                  {/* Incoming Colectivos list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'DM Mono', letterSpacing: '0.04em' }}>Colectivos que se acercan:</span>
                    {(() => {
                      const isBusApproaching = (bus: BusPosition, stop: { latitude: number; longitude: number }) => {
                        const dy = stop.latitude - bus.latitude
                        const dx = stop.longitude - bus.longitude
                        const angleToStop = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
                        const diff = Math.abs(bus.heading - angleToStop)
                        const circularDiff = Math.abs(((diff + 180) % 360) - 180)
                        return circularDiff <= 90
                      }

                      const approaching = buses
                        .filter(b => b.line_id === travelRoute.line_id)
                        .map(b => {
                          const dist = distanceKm(b, { lat: travelRoute.originStop.latitude, lng: travelRoute.originStop.longitude })
                          const isComing = isBusApproaching(b, travelRoute.originStop)
                          return { bus: b, dist, isComing }
                        })
                        .filter(item => {
                          if (item.isComing) {
                            return item.dist <= 1.0 // approaching within 1KM
                          } else {
                            return item.dist <= 0.4 // passed but closer than 400m
                          }
                        })
                        .sort((a, b) => a.dist - b.dist)
                        .slice(0, 3)

                      if (approaching.length === 0) {
                        return <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>El próximo colectivo está a más de 1 km de distancia</span>
                      }

                      return approaching.map(({ bus, dist, isComing }) => {
                        const isSelected = selectedBoardingBusId === bus.id
                        return (
                          <div
                            key={bus.id}
                            onClick={() => setSelectedBoardingBusId(isSelected ? null : bus.id)}
                            style={{
                              padding: '8px 10px', borderRadius: '8px',
                              background: isSelected 
                                ? 'rgba(34,211,160,0.12)' 
                                : 'rgba(255,255,255,0.03)',
                              border: isSelected 
                                ? '1px solid rgba(34,211,160,0.4)' 
                                : '1px solid rgba(255,255,255,0.06)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              transition: 'all 150ms'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSelected ? 'var(--go)' : '#9CA3AF' }} />
                              <span style={{ fontSize: '11px', fontWeight: 600 }}>
                                Interno {bus.bus_unit} {!isComing && <span style={{ fontSize: '9px', fontWeight: 400, color: '#EF4444', marginLeft: '4px' }}>(ya pasó)</span>}
                              </span>
                            </div>
                            <span style={{ fontSize: '10px', fontFamily: 'DM Mono', color: 'var(--text-secondary)' }}>
                              {(dist * 1000).toFixed(0)}m
                            </span>
                          </div>
                        )
                      })
                    })()}
                  </div>

                  {/* Countdown Timer Boarding Box */}
                  {(() => {
                    if (!selectedBoardingBusId) return null
                    const matchingBus = buses.find(b => b.id === selectedBoardingBusId)
                    if (!matchingBus) return null
                    const etaStr = getETAString(matchingBus, travelRoute.originStop)
                    const distMeters = distanceKm(matchingBus, { lat: travelRoute.originStop.latitude, lng: travelRoute.originStop.longitude }) * 1000
                    const isArrived = distMeters < 40
                    return (
                      <div
                        style={{
                          background: isArrived ? 'rgba(34,211,160,0.15)' : 'rgba(59,130,246,0.12)',
                          border: isArrived ? '1px solid rgba(34,211,160,0.3)' : '1px solid rgba(59,130,246,0.3)',
                          borderRadius: '10px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px',
                          alignItems: 'center', justifyContent: 'center', marginTop: '4px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: isArrived ? 'var(--go)' : '#60A5FA', fontFamily: 'DM Mono' }}>
                          ⏰ Cuenta regresiva (Live)
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 800, fontFamily: 'DM Mono', color: isArrived ? 'var(--go)' : 'white', textAlign: 'center' }}>
                          {isArrived ? "¡Colectivo en parada!" : etaStr}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                          Interno {matchingBus.bus_unit} - Vel: {matchingBus.speed_kmh} km/h
                        </span>
                      </div>
                    )
                  })()}

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
                  No se encontró conexión directa. Intentá escribir o arrastrar los pines más cerca de las avenidas principales.
                </div>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Unified Floating Controls right side of map */}
        {activePanel === 'map' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            right: '14px',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {/* Geolocate Button */}
            <button
              onClick={handleGeolocate}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)',
                border: prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 200ms'
              }}
              title="Mi ubicación"
            >
              <Locate size={16} />
            </button>

            {/* Traffic Layer Toggle Button */}
            <button
              onClick={() => {
                if (selectedLines.length === 0) {
                  toast('⚠️ Debés seleccionar una línea antes de poder ver el tránsito', {
                    id: 'traffic-select-line-warning',
                    duration: 3000,
                    style: {
                      background: 'rgba(255, 77, 106, 0.95)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 77, 106, 0.3)',
                      fontWeight: 600,
                    }
                  })
                } else {
                  setShowTraffic(prev => !prev)
                }
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: showTraffic ? '#22D3A0' : (prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)'),
                border: showTraffic ? '1px solid #22D3A0' : (prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)'),
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: showTraffic ? '#060810' : 'var(--text-primary)', transition: 'all 200ms'
              }}
              title="Tránsito en tiempo real"
            >
              <Activity size={16} />
            </button>

            {/* Pin Nearby Stops Button */}
            <button
              onClick={() => {
                setPinNearbyStopsMode(prev => !prev)
                setTravelPlannerOpen(false)
                if (!nearbyStopsPinCoord) {
                  setNearbyStopsPinCoord({ lat: -34.5972, lng: -58.3930 })
                  const activeLines = lines.length > 0 ? lines : MOCK_LINES
                  const allStops = activeLines.flatMap(line => getMockStopsForLine(line))
                  const stops = allStops.filter(stop => {
                    const distance = distanceKm({ latitude: stop.latitude, longitude: stop.longitude }, { lat: -34.5972, lng: -58.3930 })
                    return distance < 0.8
                  })
                  setNearbyStops(stops)
                }
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: pinNearbyStopsMode ? '#FF4D6A' : (prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)'),
                border: pinNearbyStopsMode ? '1px solid #FF4D6A' : (prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)'),
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: pinNearbyStopsMode ? 'white' : 'var(--text-primary)', transition: 'all 200ms',
                position: 'relative',
                zIndex: onboardingStep === 1 ? 2003 : 1,
                transform: onboardingStep === 1 ? 'scale(1.15)' : 'scale(1)',
              }}
              title="Pin de paradas cercanas"
            >
              {onboardingStep === 1 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '-4px',
                    borderRadius: '50%',
                    border: '1.5px dashed #FF4D6A',
                    boxShadow: '0 0 15px rgba(255, 77, 106, 0.4)',
                    animation: 'pulse 2s infinite',
                    pointerEvents: 'none'
                  }}
                />
              )}
              <MapPin size={16} />
            </button>

            {/* Travel Planner Button */}
            <button
              onClick={() => {
                setTravelPlannerOpen(prev => !prev)
                setPinNearbyStopsMode(false)
                if (!originCoord) {
                  const o = { lat: -34.6037, lng: -58.3816 }
                  const d = { lat: -34.5810, lng: -58.4210 }
                  setOriginCoord(o)
                  setDestCoord(d)
                  setOriginInput(getNearestStreetName(o.lat, o.lng))
                  setDestInput(getNearestStreetName(d.lat, d.lng))
                  fetchAddressAsync(o.lat, o.lng, setOriginInput)
                  fetchAddressAsync(d.lat, d.lng, setDestInput)
                  const route = solveRoute(o, d)
                  setTravelRoute(route)
                }
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: travelPlannerOpen ? '#3B82F6' : (prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)'),
                border: travelPlannerOpen ? '1px solid #3B82F6' : (prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)'),
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: travelPlannerOpen ? 'white' : 'var(--text-primary)', transition: 'all 200ms'
              }}
              title="Planificar Viaje (Origen/Destino)"
            >
              <NavIcon size={16} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => updatePrefs({ darkMap: !prefs.darkMap })}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)',
                border: prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)',
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: 'var(--text-primary)', transition: 'all 200ms'
              }}
              title={prefs.darkMap ? "Cambiar a mapa claro" : "Cambiar a mapa oscuro"}
            >
              {prefs.darkMap ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        )}

        {/* ── PANEL CONTENT (rendered INSIDE right area, slides in from top) ── */}
        <AnimatePresence>
          {activePanel !== 'map' && (
            <motion.div
              key={activePanel}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 15,
                overflowY: 'auto',
                paddingTop: isMobile ? '64px' : '72px',
                paddingBottom: isMobile ? '80px' : '20px',
                background: prefs.darkMap ? 'rgba(6,8,16,0.85)' : 'rgba(248,250,252,0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)'
              }}
            >
              <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 16px' }}>
                {activePanel === 'favourites' && (
                  <FavouritesPanel
                    prefs={prefs}
                    lines={allLines}
                    buses={buses}
                    onSelectLine={l => { setSelectedLines([l]); setActivePanel('map') }}
                    onUpdatePrefs={updatePrefs}
                    onSelectBus={bus => {
                      handleBusClick(bus)
                      setActivePanel('map')
                    }}
                  />
                )}
                {activePanel === 'settings' && (
                  <SettingsPanel
                    prefs={prefs}
                    onUpdatePrefs={updatePrefs}
                    onRestartOnboarding={() => {
                      localStorage.removeItem('tubus_onboarding_completed')
                      setOnboardingStep(0)
                      setActivePanel('map')
                    }}
                  />
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
          {(pinNearbyStopsMode || nearbyStops.length > 0) && activePanel === 'map' ? (
            <NearbyStops
              key="stops"
              stops={nearbyStops}
              buses={buses}
              selectedLines={selectedLines}
              centerCoord={nearbyStopsPinCoord}
              onClose={() => {
                setPinNearbyStopsMode(false)
                setNearbyStops([])
              }}
              onToggleLine={(line) => {
                setSelectedLines(prev => {
                  const exists = prev.some(l => l.id === line.id)
                  return exists ? prev.filter(l => l.id !== line.id) : [...prev, line]
                })
              }}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {showLineSelector && (
            <LineSelector
              lines={allLines}
              selectedLines={selectedLines}
              onSelect={line => {
                setSelectedLines(prev => {
                  const exists = prev.some(l => l.id === line.id)
                  return exists ? prev.filter(l => l.id !== line.id) : [...prev, line]
                })
              }}
              onClose={() => setShowLineSelector(false)}
              originInput={originInput}
              setOriginInput={setOriginInput}
              destInput={destInput}
              setDestInput={setDestInput}
              originCoord={originCoord}
              setOriginCoord={setOriginCoord}
              destCoord={destCoord}
              setDestCoord={setDestCoord}
              travelRoute={travelRoute}
              setTravelRoute={setTravelRoute}
              setMapSelectionMode={setMapSelectionMode}
              setShowLineSelector={setShowLineSelector}
              resolveStreetToCoords={resolveStreetToCoords}
              getNearestStreetName={getNearestStreetName}
              fetchAddressAsync={fetchAddressAsync}
              solveRoute={solveRoute}
              setTravelPlannerOpen={setTravelPlannerOpen}
              setViewState={setViewState}
              tab={lineSelectorTab}
              setTab={setLineSelectorTab}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showReport && selectedBus && (
            <ReportModal bus={selectedBus} onClose={() => setShowReport(false)} />
          )}
        </AnimatePresence>

        {/* Mobile Bottom Navigation Bar */}
        {isMobile && (
          <div
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '64px',
              background: prefs.darkMap
                ? 'linear-gradient(0deg, rgba(8,12,18,0.99) 0%, rgba(14,20,30,0.95) 100%)'
                : 'linear-gradient(0deg, rgba(243,244,246,0.99) 0%, rgba(255,255,255,0.95) 100%)',
              borderTop: prefs.darkMap
                ? '1px solid rgba(184,200,224,0.08)'
                : '1px solid rgba(0,0,0,0.08)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              zIndex: onboardingStep !== -1 ? 2002 : 100, // Elevated above backdrop blur but below greeting
              paddingBottom: 'safe-area-inset-bottom'
            }}
          >
            {NAV_ITEMS.map((item, idx) => {
              const Icon = item.icon
              const active = activePanel === item.id
              const isStepHighlight = (onboardingStep === 0 && idx === 0) || (onboardingStep === 2 && idx === 1) || (onboardingStep === 3 && idx === 2) || (onboardingStep === 4 && idx === 3)

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (onboardingStep === -1) {
                      setActivePanel(item.id)
                    }
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '6px 12px',
                    gap: '3px',
                    flex: 1,
                    position: 'relative',
                    zIndex: isStepHighlight ? 2003 : 1,
                    opacity: (onboardingStep === -1 || isStepHighlight) ? 1 : 0.25,
                    transform: isStepHighlight ? 'scale(1.15)' : 'scale(1)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  {isStepHighlight && (
                    <div
                      style={{
                        position: 'absolute',
                        inset: '-4px',
                        borderRadius: '12px',
                        background: 'rgba(184,200,224,0.1)',
                        border: '1.5px dashed rgba(184,200,224,0.4)',
                        boxShadow: '0 0 15px rgba(184,200,224,0.2)',
                        animation: 'pulse 2s infinite',
                        pointerEvents: 'none'
                      }}
                    />
                  )}
                  <Icon
                    size={20}
                    style={{
                      color: active ? 'var(--platinum)' : 'var(--text-muted)',
                      transition: 'color 0.2s'
                    }}
                  />
                  <span
                    style={{
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontSize: '10px',
                      fontWeight: active ? 600 : 400,
                      transition: 'color 0.2s'
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Onboarding Dialogs */}
        <AnimatePresence>
          {showWelcome && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(6, 8, 16, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 3000,
                padding: '20px'
              }}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                style={{
                  background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '24px',
                  padding: '30px 24px',
                  width: '100%',
                  maxWidth: '400px',
                  textAlign: 'center',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  fontFamily: 'DM Sans, sans-serif'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <div style={{
                    width: '72px', height: '72px', borderRadius: '20px',
                    background: 'rgba(184,200,224,0.06)', border: '1.5px solid rgba(184,200,224,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <img src="/images/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', borderRadius: '18px', objectFit: 'cover' }} />
                  </div>
                </div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                  ¡Te damos la bienvenida a Bien Parada!
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.6', marginBottom: '24px' }}>
                  La aplicación definitiva para moverte de forma segura e inteligente por Buenos Aires. Hacé un tour rápido para conocer las funcionalidades principales de tu panel.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => {
                      setShowWelcome(false)
                      setOnboardingStep(0)
                      setActivePanel('map')
                    }}
                    style={{
                      background: 'var(--platinum)',
                      color: 'var(--void)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      fontSize: '14px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(255,255,255,0.1)'
                    }}
                  >
                    Comenzar Recorrido ➔
                  </button>
                  <button
                    onClick={() => {
                      setShowWelcome(false)
                      localStorage.setItem('tubus_onboarding_completed', 'true')
                    }}
                    style={{
                      background: 'transparent',
                      color: 'var(--text-muted)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Saltar Introducción
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {onboardingStep !== -1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(6, 8, 16, 0.7)',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                zIndex: 2000,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '20px'
              }}
            >
              {(() => {
                const descriptions = [
                  "🗺️ **Mapa en Vivo**: Visualizá la ubicación en tiempo real de todos los colectivos en servicio. Hacé click en cualquier unidad para ver su velocidad, ocupación y chofer asignado.",
                  "📍 **Botón de Pin (Paradas Cercanas)**: Presioná este botón con el icono de pin en el mapa para escanear y visualizar al instante todas las paradas de colectivo y horarios en un radio cercano.",
                  "❤️ **Tus Favoritos**: Guardá tus líneas frecuentes, paradas de uso diario, internos y choferes con el botón ★ del mapa para tener acceso instantáneo en esta pestaña.",
                  "⚙️ **Preferencias**: Modificá el estilo del mapa (claro u oscuro), activá alertas dinámicas basadas en la proximidad de los colectivos y personalizá el tamaño de los textos.",
                  "👤 **Tu Perfil**: Visualizá el correo de tu cuenta de pasajero, tu rol en la plataforma, la fecha de registro en el sistema y cerrá tu sesión con total seguridad."
                ]

                const showArrow = onboardingStep !== 1
                const arrowLeft = onboardingStep === 0 
                  ? '12.5%' 
                  : (onboardingStep === 2 
                      ? '37.5%' 
                      : (onboardingStep === 3 
                          ? '62.5%' 
                          : '87.5%'))

                return (
                  <motion.div
                    key={onboardingStep}
                    initial={{ scale: 0.9, y: 10, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    style={{
                      background: 'linear-gradient(135deg, rgba(20, 27, 45, 0.98) 0%, rgba(10, 15, 26, 0.99) 100%)',
                      border: '1px solid rgba(184, 200, 224, 0.15)',
                      boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                      borderRadius: '20px',
                      padding: '20px',
                      width: '100%',
                      maxWidth: '340px',
                      color: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      position: 'absolute',
                      bottom: onboardingStep === 1 ? '160px' : '90px',
                      fontFamily: 'DM Sans, sans-serif'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(184, 200, 224, 0.1)', paddingBottom: '8px' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'DM Mono', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Paso {onboardingStep + 1} de {descriptions.length}
                      </span>
                      <button
                        onClick={() => {
                          setOnboardingStep(-1)
                          localStorage.setItem('tubus_onboarding_completed', 'true')
                        }}
                        style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <p style={{ fontSize: '13px', lineHeight: '1.5', color: '#E5E7EB', margin: 0 }}>
                      {descriptions[onboardingStep].split('**')[0]}
                      <strong>{descriptions[onboardingStep].split('**')[1]}</strong>
                      {descriptions[onboardingStep].split('**')[2]}
                    </p>

                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <button
                        onClick={() => {
                          setOnboardingStep(-1)
                          localStorage.setItem('tubus_onboarding_completed', 'true')
                        }}
                        style={{
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: '1px solid rgba(184,200,224,0.15)',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          flex: 1
                        }}
                      >
                        Saltar
                      </button>
                      <button
                        onClick={() => {
                          const nextStep = onboardingStep + 1
                          if (nextStep < descriptions.length) {
                            setOnboardingStep(nextStep)
                            if (nextStep === 0 || nextStep === 1) {
                              setActivePanel('map')
                            } else if (nextStep === 2) {
                              setActivePanel('favourites')
                            } else if (nextStep === 3) {
                              setActivePanel('settings')
                            } else if (nextStep === 4) {
                              setActivePanel('profile')
                            }
                          } else {
                            setOnboardingStep(-1)
                            localStorage.setItem('tubus_onboarding_completed', 'true')
                          }
                        }}
                        style={{
                          background: 'var(--platinum)',
                          color: 'var(--void)',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flex: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        {onboardingStep === descriptions.length - 1 ? '¡Entendido!' : 'Siguiente ➔'}
                      </button>
                    </div>
                    
                    {showArrow && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '-6px',
                          left: arrowLeft,
                          transform: 'translateX(-50%) rotate(45deg)',
                          width: '12px',
                          height: '12px',
                          background: 'rgba(10, 15, 26, 0.99)',
                          borderRight: '1px solid rgba(184, 200, 224, 0.15)',
                          borderBottom: '1px solid rgba(184, 200, 224, 0.15)'
                        }}
                      />
                    )}
                  </motion.div>
                )
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
    
  )
}

// ─── Favourites Panel ─────────────────────────────────────────────────────────
function FavouritesPanel({ prefs, lines, buses, onSelectLine, onUpdatePrefs, onSelectBus }: {
  prefs: UserPrefs; lines: BusLine[]; buses: BusPosition[]
  onSelectLine: (l: BusLine) => void
  onUpdatePrefs: (p: Partial<UserPrefs>) => void
  onSelectBus: (b: BusPosition) => void
}) {
  const favLines = lines.filter(l => prefs.favBusLines.includes(l.id))
  const allStops = lines.flatMap(line => getMockStopsForLine(line))
  const favStops = allStops.filter(s => prefs.favStops.includes(s.id))
  
  const favBuses = prefs.favBuses || []
  const favDrivers = prefs.favDrivers || []

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

      <SectionHeader icon={<Bus size={13} />} title="Colectivos guardados" style={{ marginTop: '20px' }} />
      {favBuses.length === 0 ? (
        <EmptyHint text="Tocá 'Colectivo' en el popup del mapa para guardar un interno" />
      ) : (
        favBuses.map(busUnit => (
          <FavBusCard
            key={busUnit}
            busUnit={busUnit}
            buses={buses}
            onSelect={onSelectBus}
            onRemove={() => onUpdatePrefs({ favBuses: favBuses.filter(u => u !== busUnit) })}
          />
        ))
      )}

      <SectionHeader icon={<User size={13} />} title="Choferes guardados" style={{ marginTop: '20px' }} />
      {favDrivers.length === 0 ? (
        <EmptyHint text="Tocá 'Chofer' en el popup del mapa para guardar un chofer" />
      ) : (
        favDrivers.map(driverName => (
          <FavDriverCard
            key={driverName}
            driverName={driverName}
            buses={buses}
            onSelect={onSelectBus}
            onRemove={() => onUpdatePrefs({ favDrivers: favDrivers.filter(d => d !== driverName) })}
          />
        ))
      )}

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
        <Divider />
        <ToggleRow label="Filtrar avisos por cantidad de pasajeros" value={prefs.filterByPassengers || false} onChange={v => onUpdatePrefs({ filterByPassengers: v })} />
        {prefs.filterByPassengers && (
          <div style={{ padding: '8px 16px 12px', display: 'flex', alignItems: 'center', gap: '12px', borderTop: '1px solid rgba(184, 200, 224, 0.05)' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '12px', flex: 1 }}>Avisar solo si tiene menos de:</span>
            <input type="number" min="0" max="100" value={prefs.maxPassengers ?? 10}
              onChange={e => {
                const val = parseInt(e.target.value)
                onUpdatePrefs({ maxPassengers: isNaN(val) ? 0 : val })
              }}
              style={{
                width: '65px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(184, 200, 224, 0.15)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                padding: '4px 8px',
                fontSize: '12px',
                outline: 'none',
                textAlign: 'center',
                fontFamily: 'DM Mono, monospace'
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>personas</span>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

// ─── Settings Panel ───────────────────────────────────────────────────────────
function SettingsPanel({
  prefs,
  onUpdatePrefs,
  onRestartOnboarding
}: {
  prefs: UserPrefs
  onUpdatePrefs: (p: Partial<UserPrefs>) => void
  onRestartOnboarding?: () => void
}) {
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

      {onRestartOnboarding && (
        <>
          <SectionHeader icon={<Sliders size={13} />} title="Guía interactiva" style={{ marginTop: '20px' }} />
          <GlassCard>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Tour de la Aplicación</span>
              <button
                onClick={onRestartOnboarding}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(184,200,224,0.2)',
                  background: 'rgba(184,200,224,0.06)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Reiniciar Tutorial
              </button>
            </div>
          </GlassCard>
        </>
      )}

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
        {[
          'Historial de viajes',
          'Incorporación de Línea 39',
          'Incorporación de Línea 59',
          'Incorporación de Línea 102',
          'Alertas de demora por línea',
          'Compartir ubicación'
        ].map((item, i, arr) => (
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
    <div style={{ background: 'var(--base)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden', marginBottom: '6px' }}>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ height: '1px', background: 'var(--border)', margin: '0 16px' }} />
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flex: 1 }}>{label}</span>
      <button onClick={() => onChange(!value)}
        style={{ width: '40px', height: '22px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: value ? 'rgba(34,211,160,0.8)' : 'var(--border)', position: 'relative', transition: 'background 200ms', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: '2px', left: value ? '20px' : '2px', width: '18px', height: '18px', borderRadius: '50%', background: 'white', transition: 'left 200ms', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
      </button>
    </div>
  )
}

function FavLineCard({ line, onSelect, onRemove }: { line: BusLine; onSelect: () => void; onRemove: () => void }) {
  return (
    <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', borderRadius: '13px', background: 'var(--base)', border: '1px solid var(--border)', marginBottom: '5px', cursor: 'pointer' }}>
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', borderRadius: '13px', background: 'var(--base)', border: '1px solid var(--border)', marginBottom: '5px' }}>
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

function FavBusCard({
  busUnit,
  buses,
  onSelect,
  onRemove
}: {
  busUnit: string
  buses: BusPosition[]
  onSelect: (b: BusPosition) => void
  onRemove: () => void
}) {
  const onlineBus = buses.find(b => b.bus_unit === busUnit)
  const isOnline = !!onlineBus

  return (
    <div
      onClick={() => isOnline && onSelect(onlineBus)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        padding: '11px 13px',
        borderRadius: '13px',
        background: 'var(--base)',
        border: '1px solid var(--border)',
        marginBottom: '5px',
        cursor: isOnline ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
    >
      <div
        style={{
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          background: isOnline ? '#10B981' : '#6B7280',
          flexShrink: 0,
          boxShadow: isOnline ? '0 0 8px rgba(16,185,129,0.8)' : 'none'
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
          Interno {busUnit}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isOnline 
            ? `En servicio • Línea ${onlineBus.line_number}${onlineBus.ramal ? ` (${onlineBus.ramal})` : ''} • ${onlineBus.speed_kmh} km/h`
            : 'Desconectado • Fuera de ruta'}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <X size={13} style={{ color: 'var(--text-muted)' }} />
      </button>
    </div>
  )
}

function FavDriverCard({
  driverName,
  buses,
  onSelect,
  onRemove
}: {
  driverName: string
  buses: BusPosition[]
  onSelect: (b: BusPosition) => void
  onRemove: () => void
}) {
  const onlineBus = buses.find(b => b.driver_name === driverName)
  const isOnline = !!onlineBus

  return (
    <div
      onClick={() => isOnline && onSelect(onlineBus)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '11px',
        padding: '11px 13px',
        borderRadius: '13px',
        background: 'var(--base)',
        border: '1px solid var(--border)',
        marginBottom: '5px',
        cursor: isOnline ? 'pointer' : 'default',
        transition: 'all 0.2s'
      }}
    >
      <div
        style={{
          width: '9px',
          height: '9px',
          borderRadius: '50%',
          background: isOnline ? '#EC4899' : '#6B7280',
          flexShrink: 0,
          boxShadow: isOnline ? '0 0 8px rgba(236,72,153,0.8)' : 'none'
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
          Chofer: {driverName}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isOnline 
            ? `En servicio • Línea ${onlineBus.line_number} • Interno ${onlineBus.bus_unit}`
            : 'Fuera de servicio'}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
      >
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
function PremiumBusMarker({
  bus,
  lineColor,
  isSelected,
  showPassengers,
  onClick
}: {
  bus: BusPosition;
  lineColor: string;
  isSelected: boolean;
  showPassengers: boolean;
  onClick?: () => void;
}) {
  const isMoving = bus.status === 'moving'
  const color = isMoving ? lineColor : bus.status === 'at_stop' ? '#F0B429' : '#FF4D6A'
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      style={{ position: 'relative', width: '36px', height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
    >
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
      {showPassengers && (
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
            0
          </span>
        </div>
      )}
    </div>
  );
}


// ─── Mini popup ───────────────────────────────────────────────────────────────
function MiniPopup({
  bus,
  onReport,
  isFavBus,
  isFavDriver,
  onToggleFavBus,
  onToggleFavDriver
}: {
  bus: BusPosition
  onReport: () => void
  isFavBus: boolean
  isFavDriver: boolean
  onToggleFavBus: () => void
  onToggleFavDriver: () => void
}) {
  const busColor = bus.line_number === '12' ? '#EF4444' : 
                   bus.line_number === '28' ? '#16A34A' :
                   bus.line_number === '37' ? '#15803D' :
                   bus.line_number === '60' ? '#EAB308' : '#1D4ED8';

  // Deterministically generate amenities based on bus unit to make them consistent but different
  const getBusAmenities = (busUnit: string) => {
    const digits = busUnit.split('').filter(c => '0123456789'.includes(c)).join('')
    const num = parseInt(digits) || 0
    const hasAC = num % 3 !== 0      // 2 out of 3 have AC (most of them)
    const isNew = num % 4 !== 0      // 3 out of 4 are under 5 years old
    const hasRamp = num % 5 !== 0    // 4 out of 5 have wheelchair ramps (some have no ramp)
    return { hasAC, isNew, hasRamp }
  }

  const amenities = getBusAmenities(bus.bus_unit)

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '16px',
      padding: '12px',
      color: 'white',
      width: '280px',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
      fontFamily: 'DM Sans, sans-serif',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      {/* Bus image header */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '110px',
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
          src={
            bus.line_number === '12' ? '/images/bus-12-real.jpg' :
            bus.line_number === '37' ? '/images/bus-37-real.jpg' :
            `/images/bus-${bus.line_number}.png`
          }
          alt={`Bus ${bus.line_number}`}
          style={{ width: '100%', height: '100%', objectFit: (bus.line_number === '12' || bus.line_number === '37') ? 'cover' : 'contain' }}
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: '#F3F4F6' }}>
          Interno: {bus.bus_unit}
        </div>
        <div style={{ fontSize: '10px', color: '#EAB308', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span>👥 0 a bordo</span>
        </div>
      </div>

      <div style={{ color: '#9CA3AF', fontSize: '11px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>Chofer: <strong>{bus.driver_name}</strong></span>
        <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
      </div>

      {/* Amenities Ticked & Unticked Grid */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '10px',
        padding: '10px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '11px',
        color: '#D1D5DB'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Aire Acondicionado</span>
          <span style={{ color: amenities.hasAC ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '12px' }}>
            {amenities.hasAC ? '✓' : '✗'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Antigüedad &lt; 5 años</span>
          <span style={{ color: amenities.isNew ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '12px' }}>
            {amenities.isNew ? '✓' : '✗'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Rampa para Silla de Ruedas</span>
          <span style={{ color: amenities.hasRamp ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '12px' }}>
            {amenities.hasRamp ? '✓' : '✗'}
          </span>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onReport(); }}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#FCA5A5',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(239,68,68,0.1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'; }}
        >
          <AlertTriangle size={11} />
          Denunciar
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavBus(); }}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: '10px',
            background: isFavBus ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${isFavBus ? 'rgba(234, 179, 8, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
            color: isFavBus ? '#FBBF24' : '#E5E7EB',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isFavBus ? 'rgba(234, 179, 8, 0.22)' : 'rgba(255, 255, 255, 0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isFavBus ? 'rgba(234, 179, 8, 0.15)' : 'rgba(255, 255, 255, 0.03)'; }}
        >
          <Star size={11} style={{ fill: isFavBus ? '#FBBF24' : 'none' }} />
          Colectivo
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavDriver(); }}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: '10px',
            background: isFavDriver ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${isFavDriver ? 'rgba(236, 72, 153, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
            color: isFavDriver ? '#F472B6' : '#E5E7EB',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isFavDriver ? 'rgba(236, 72, 153, 0.22)' : 'rgba(255, 255, 255, 0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isFavDriver ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.03)'; }}
        >
          <Heart size={11} style={{ fill: isFavDriver ? '#F472B6' : 'none' }} />
          Chofer
        </button>
      </div>
    </div>
  )
}
