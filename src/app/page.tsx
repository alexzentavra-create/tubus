'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl, Source, Layer } from 'react-map-gl/maplibre'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import {
  Bus, Search, ChevronDown, X, Star, MapPin, Bell, AlertTriangle,
  LogOut, Heart, ChevronRight, User, Sliders, Moon, Globe,
  Navigation as NavIcon, LayoutDashboard, Menu,
  Locate, Plus, Minus, Sun, Route, Activity, Clock
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { OFFICIAL_ROUTES } from '@/lib/officialRoutes'
import type { BusPosition, BusLine, BusStop } from '@/types'
import {
  MOCK_LINES, getLineBounds, getMockStopsForLine, getMockRoutePathsForLine, MOCK_PLACES
} from '@/lib/mockData'
import ReportModal from '@/components/user/ReportModal'
import LineSelector, { Tab as LineSelectorTab } from '@/components/user/LineSelector'
import NearbyStops from '@/components/user/NearbyStops'

const BA = { longitude: -58.4173, latitude: -34.6037 }
const PART1 = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTAwMTIzM29hMW5nYnB1eXcifQ'
const PART2 = 'TyJ2Mcgiqas2N1UOCySD2g'
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || `${PART1}.${PART2}`

// Inject Yellow Touristic Route
OFFICIAL_ROUTES['T-Amarillo'] = {
  line: 'T-Amarillo',
  routeShortName: 'T-A',
  routeName: 'Bus Turístico Amarillo',
  ida: {
    headsign: 'Recorrido Amarillo',
    path: [
      { lat: -34.6037, lng: -58.3816 },
      { lat: -34.5996, lng: -58.3927 },
      { lat: -34.6176, lng: -58.3703 },
      { lat: -34.6356, lng: -58.3647 },
      { lat: -34.6398, lng: -58.3628 },
      { lat: -34.6076, lng: -58.3640 },
      { lat: -34.6083, lng: -58.3721 },
      { lat: -34.5875, lng: -58.3916 },
      { lat: -34.5885, lng: -58.4305 },
      { lat: -34.6037, lng: -58.3816 }
    ],
    stops: [
      { id: 'ty-1', name: 'Obelisco', lat: -34.6037, lng: -58.3816, pathIndex: 0 },
      { id: 'ty-2', name: 'Congreso', lat: -34.5996, lng: -58.3927, pathIndex: 1 },
      { id: 'ty-3', name: 'San Telmo', lat: -34.6176, lng: -58.3703, pathIndex: 2 },
      { id: 'ty-4', name: 'La Bombonera', lat: -34.6356, lng: -58.3647, pathIndex: 3 },
      { id: 'ty-5', name: 'Caminito', lat: -34.6398, lng: -58.3628, pathIndex: 4 },
      { id: 'ty-6', name: 'Puerto Madero', lat: -34.6076, lng: -58.3640, pathIndex: 5 },
      { id: 'ty-7', name: 'Plaza de Mayo', lat: -34.6083, lng: -58.3721, pathIndex: 6 },
      { id: 'ty-8', name: 'Recoleta', lat: -34.5875, lng: -58.3916, pathIndex: 7 },
      { id: 'ty-9', name: 'Palermo Soho', lat: -34.5885, lng: -58.4305, pathIndex: 8 }
    ]
  },
  vuelta: {
    headsign: 'Recorrido Amarillo',
    path: [
      { lat: -34.6037, lng: -58.3816 },
      { lat: -34.5885, lng: -58.4305 },
      { lat: -34.5875, lng: -58.3916 },
      { lat: -34.6083, lng: -58.3721 },
      { lat: -34.6076, lng: -58.3640 },
      { lat: -34.6398, lng: -58.3628 },
      { lat: -34.6356, lng: -58.3647 },
      { lat: -34.6176, lng: -58.3703 },
      { lat: -34.5996, lng: -58.3927 },
      { lat: -34.6037, lng: -58.3816 }
    ],
    stops: [
      { id: 'ty-9', name: 'Palermo Soho', lat: -34.5885, lng: -58.4305, pathIndex: 1 },
      { id: 'ty-8', name: 'Recoleta', lat: -34.5875, lng: -58.3916, pathIndex: 2 },
      { id: 'ty-7', name: 'Plaza de Mayo', lat: -34.6083, lng: -58.3721, pathIndex: 3 },
      { id: 'ty-6', name: 'Puerto Madero', lat: -34.6076, lng: -58.3640, pathIndex: 4 },
      { id: 'ty-5', name: 'Caminito', lat: -34.6398, lng: -58.3628, pathIndex: 5 },
      { id: 'ty-4', name: 'La Bombonera', lat: -34.6356, lng: -58.3647, pathIndex: 6 },
      { id: 'ty-3', name: 'San Telmo', lat: -34.6176, lng: -58.3703, pathIndex: 7 },
      { id: 'ty-2', name: 'Congreso', lat: -34.5996, lng: -58.3927, pathIndex: 8 },
      { id: 'ty-1', name: 'Obelisco', lat: -34.6037, lng: -58.3816, pathIndex: 9 }
    ]
  }
}

// Inject Red Touristic Route
OFFICIAL_ROUTES['T-Rojo'] = {
  line: 'T-Rojo',
  routeShortName: 'T-R',
  routeName: 'Bus Turístico Rojo',
  ida: {
    headsign: 'Recorrido Rojo',
    path: [
      { lat: -34.6083, lng: -58.3721 },
      { lat: -34.6176, lng: -58.3703 },
      { lat: -34.6398, lng: -58.3628 },
      { lat: -34.6076, lng: -58.3640 },
      { lat: -34.5910, lng: -58.3750 },
      { lat: -34.5875, lng: -58.3916 },
      { lat: -34.5711, lng: -58.4172 },
      { lat: -34.5696, lng: -58.4116 },
      { lat: -34.6011, lng: -58.3831 },
      { lat: -34.6083, lng: -58.3721 }
    ],
    stops: [
      { id: 'tr-1', name: 'Plaza de Mayo', lat: -34.6083, lng: -58.3721, pathIndex: 0 },
      { id: 'tr-2', name: 'San Telmo', lat: -34.6176, lng: -58.3703, pathIndex: 1 },
      { id: 'tr-3', name: 'Caminito', lat: -34.6398, lng: -58.3628, pathIndex: 2 },
      { id: 'tr-4', name: 'Puerto Madero', lat: -34.6076, lng: -58.3640, pathIndex: 3 },
      { id: 'tr-5', name: 'Retiro', lat: -34.5910, lng: -58.3750, pathIndex: 4 },
      { id: 'tr-6', name: 'Recoleta', lat: -34.5875, lng: -58.3916, pathIndex: 5 },
      { id: 'tr-7', name: 'Palermo Rosedal', lat: -34.5711, lng: -58.4172, pathIndex: 6 },
      { id: 'tr-8', name: 'Planetario', lat: -34.5696, lng: -58.4116, pathIndex: 7 },
      { id: 'tr-9', name: 'Teatro Colón', lat: -34.6011, lng: -58.3831, pathIndex: 8 }
    ]
  },
  vuelta: {
    headsign: 'Recorrido Rojo',
    path: [
      { lat: -34.6083, lng: -58.3721 },
      { lat: -34.6011, lng: -58.3831 },
      { lat: -34.5696, lng: -58.4116 },
      { lat: -34.5711, lng: -58.4172 },
      { lat: -34.5875, lng: -58.3916 },
      { lat: -34.5910, lng: -58.3750 },
      { lat: -34.6076, lng: -58.3640 },
      { lat: -34.6398, lng: -58.3628 },
      { lat: -34.6176, lng: -58.3703 },
      { lat: -34.6083, lng: -58.3721 }
    ],
    stops: [
      { id: 'tr-9', name: 'Teatro Colón', lat: -34.6011, lng: -58.3831, pathIndex: 1 },
      { id: 'tr-8', name: 'Planetario', lat: -34.5696, lng: -58.4116, pathIndex: 2 },
      { id: 'tr-7', name: 'Palermo Rosedal', lat: -34.5711, lng: -58.4172, pathIndex: 3 },
      { id: 'tr-6', name: 'Recoleta', lat: -34.5875, lng: -58.3916, pathIndex: 4 },
      { id: 'tr-5', name: 'Retiro', lat: -34.5910, lng: -58.3750, pathIndex: 5 },
      { id: 'tr-4', name: 'Puerto Madero', lat: -34.6076, lng: -58.3640, pathIndex: 6 },
      { id: 'tr-3', name: 'Caminito', lat: -34.6398, lng: -58.3628, pathIndex: 7 },
      { id: 'tr-2', name: 'San Telmo', lat: -34.6176, lng: -58.3703, pathIndex: 8 },
      { id: 'tr-1', name: 'Plaza de Mayo', lat: -34.6083, lng: -58.3721, pathIndex: 9 }
    ]
  }
}

const TOURIST_STOP_DESCRIPTIONS: Record<string, string> = {
  'ty-1': 'Obelisco: Punto neurálgico de Buenos Aires. El monumento más icónico de la ciudad, inaugurado en 1936 en el cruce de Av. Corrientes y 9 de Julio.',
  'ty-2': 'Congreso: Plaza e Imponente palacio legislativo del Congreso de la Nación, inaugurado en 1906 con una magnífica cúpula de bronce.',
  'ty-3': 'San Telmo: Barrio histórico porteño. Conocido por sus calles empedradas, anticuarios, artistas callejeros y su feria de pulgas los domingos.',
  'ty-4': 'La Bombonera: Estadio del Club Atlético Boca Juniors, inaugurado en 1940 y famoso mundialmente por su forma de caja de bombones y acústica única.',
  'ty-5': 'Caminito: Famosa calle museo peatonal y pasaje de conventillos de chapas pintadas de colores vibrantes, que inspiró el famoso tango "Caminito".',
  'ty-6': 'Puerto Madero: Ex-puerto reciclado convertido en el barrio más moderno y lujoso, hogar del Puente de la Mujer de Santiago Calatrava.',
  'ty-7': 'Plaza de Mayo: Corazón histórico y político de la Nación, rodeado de la Casa Rosada, el Cabildo Colonial y la Catedral Metropolitana.',
  'ty-8': 'Recoleta: Exclusivo cementerio de Recoleta, donde yacen importantes figuras como Evita Perón, rodeado de arquitectura francesa y cafés.',
  'ty-9': 'Palermo Soho: Polo de diseño, moda e increíble gastronomía nocturna en el corazón del tradicional barrio de Palermo.',
  'tr-1': 'Plaza de Mayo: Corazón histórico y político de la Nación, rodeado de la Casa Rosada, el Cabildo Colonial y la Catedral Metropolitana.',
  'tr-2': 'San Telmo: Barrio histórico porteño. Conocido por sus calles empedradas, anticuarios, artistas callejeros y su feria de pulgas los domingos.',
  'tr-3': 'Caminito: Famosa calle museo peatonal y pasaje de conventillos de chapas pintadas de colores vibrantes, que inspiró el famoso tango "Caminito".',
  'tr-4': 'Puerto Madero: Ex-puerto reciclado convertido en el barrio más moderno y lujoso, hogar del Puente de la Mujer de Santiago Calatrava.',
  'tr-5': 'Retiro: Plaza San Martín y monumento a los Caídos de Malvinas, rodeado de palacios señoriales y la estación terminal de trenes.',
  'tr-6': 'Recoleta: Exclusivo cementerio de Recoleta, donde yacen importantes figuras como Evita Perón, rodeado de arquitectura francesa y cafés.',
  'tr-7': 'Palermo Rosedal: Paseo de los lagos y jardín público El Rosedal, con un pintoresco puente griego y más de 18.000 flores de rosa.',
  'tr-8': 'Planetario: Planetario Galileo Galilei, emblemático domo de divulgación de astronomía inaugurado en 1967.',
  'tr-9': 'Teatro Colón: Uno de los teatros líricos más aclamados del mundo por su imponente acústica y fastuosa arquitectura neorrenacentista.'
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
  savedTrips?: any[]
}

const DEFAULT_PREFS: UserPrefs = {
  favBusLines: [], favStops: [],
  notifyNearbyBus: true, notifyNearbyRadius: 0.5, notifyFavLines: true,
  darkMap: false, language: 'es', fontSize: 'normal',
  showPassengerCount: true, autoZoomOnBus: true,
  favBuses: [], favDrivers: [],
  filterByPassengers: false,
  maxPassengers: 10,
  savedTrips: []
}

function loadPrefs(): UserPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem('tubus_user_prefs')
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : DEFAULT_PREFS
  } catch { return DEFAULT_PREFS }
}
function savePrefs(p: UserPrefs) { localStorage.setItem('tubus_user_prefs', JSON.stringify(p)) }

const TUFIX_ADS = [
  {
    image: '/images/tufix-ad-1.png',
    title: 'TUFIX - ¡Basta de dar vueltas!',
    desc: 'Stop asking around. Get it done.',
    url: 'https://tufix.com'
  },
  {
    image: '/images/tufix-ad-2.png',
    title: 'TUFIX - Reparaciones del hogar',
    desc: 'Your problem. Tap. Done.',
    url: 'https://tufix.com'
  },
  {
    image: '/images/tufix-ad-3.png',
    title: 'TUFIX - Profesionales calificados',
    desc: 'El trabajador ideal para vos.',
    url: 'https://tufix.com'
  },
  {
    image: '/images/tufix-ad-4.png',
    title: 'TUFIX - Rapidez y confianza',
    desc: 'Serving fixes. Fast.',
    url: 'https://tufix.com'
  }
]

// ─── Nav items ────────────────────────────────────────────────────────────────
const NAV_ITEMS: { id: Panel; label: string; icon: any }[] = [
  { id: 'map',        label: 'Mapa',        icon: LayoutDashboard },
  { id: 'favourites', label: 'Favoritos',   icon: Heart },
  { id: 'settings',   label: 'Preferencias', icon: Sliders },
  { id: 'profile',    label: 'Mi Perfil',   icon: User },
]

const LINE_DRIVERS: Record<string, string[]> = {
  '12': ['Néstor García', 'Roberto Sánchez', 'Carlos Martínez', 'Juan Gómez'],
  '28': ['Carlos M.', 'Jorge Rodríguez', 'Pablo García'],
  '37': ['Roberto S.', 'Ana Martínez'],
  '39': ['Esteban Ortiz', 'Lucas Domínguez', 'Martín Pereyra'],
  '59': ['Hugo Bianchi', 'Nicolás Silva', 'Claudio Rossi'],
  '60': ['Carlos Martínez', 'Diego Rodríguez', 'Pablo García', 'Luis Fernández'],
  '102': ['Diego Torres', 'Fernando Gómez', 'Javier Ortega'],
  '152': ['Roberto S.', 'Jorge R.', 'Ana C.']
}

interface SimulatedBusState extends BusPosition {
  pathIndex: number
  segmentProgress: number
  maxSpeedKmh: number
  dwellTimeSeconds: number
  lastStoppedStopIndex: number
  color?: string
}

function globalDistanceKm(
  a: { latitude: number; longitude: number } | { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const lat1 = ('latitude' in a ? a.latitude : (a as any).lat) * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const dLat = lat2 - lat1
  const dLng = (b.lng - ('longitude' in a ? a.longitude : (a as any).lng)) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function getDistanceToPathIndex(
  path: { lat: number; lng: number }[],
  currentIdx: number,
  progress: number,
  targetIdx: number
): number {
  if (targetIdx <= currentIdx) return 0

  const pA = path[currentIdx]
  const pB = path[currentIdx + 1] || pA
  const currentLat = pA.lat + (pB.lat - pA.lat) * progress
  const currentLng = pA.lng + (pB.lng - pA.lng) * progress

  let totalDist = globalDistanceKm({ lat: currentLat, lng: currentLng }, { lat: pB.lat, lng: pB.lng })

  for (let i = currentIdx + 1; i < targetIdx; i++) {
    const pt1 = path[i]
    const pt2 = path[i + 1] || pt1
    totalDist += globalDistanceKm({ lat: pt1.lat, lng: pt1.lng }, { lat: pt2.lat, lng: pt2.lng })
  }

  return totalDist * 1000 // in meters
}

const initializeSimulatedBuses = (availableLines: BusLine[]): SimulatedBusState[] => {
  const allBuses: SimulatedBusState[] = []

  availableLines.forEach(line => {
    const routeKey = line.line_number.replace(/^0+/, '')
    const officialRoute = OFFICIAL_ROUTES[routeKey]
    if (!officialRoute) return

    const drivers = LINE_DRIVERS[routeKey] || ['Chofer Auxiliar']
    const directions: ('ida' | 'vuelta')[] = ['ida', 'vuelta']

    directions.forEach(direction => {
      const dirObj = direction === 'vuelta' ? officialRoute.vuelta : officialRoute.ida
      if (!dirObj || !dirObj.path || dirObj.path.length < 2) return

      const path = dirObj.path
      const N = path.length

      // 8 buses in each direction for normal lines, 4 for tourist lines
      const busCount = (line as any).is_tourist ? 4 : 8
      for (let i = 0; i < busCount; i++) {
        const busIdx = direction === 'vuelta' ? i + busCount : i
        const offset = i / busCount
        const pathIndex = Math.floor(N * offset)
        const pCurr = path[pathIndex]
        const pNext = path[pathIndex + 1] || pCurr

        const dy = pNext.lat - pCurr.lat
        const dx = pNext.lng - pCurr.lng
        const headingVal = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360

        const passengers = 5 + Math.floor(Math.random() * 35)
        // Slow down simulated speed (14-22 km/h for standard, 12-16 km/h for tourist)
        const maxSpeed = (line as any).is_tourist ? (12 + Math.random() * 4) : (14 + Math.random() * 8)

        allBuses.push({
          id: `sim-${line.id}-${direction}-${i}`,
          driver_id: `sim-driver-${line.id}-${direction}-${i}`,
          line_id: line.id,
          line_number: line.line_number,
          bus_unit: `${line.line_number}-${300 + busIdx}`,
          driver_name: drivers[busIdx % drivers.length] || 'Chofer Auxiliar',
          color: line.color,
          direction: direction,
          pathIndex: pathIndex,
          segmentProgress: 0,
          speed_kmh: maxSpeed,
          maxSpeedKmh: maxSpeed,
          status: 'moving',
          passenger_count: passengers,
          dwellTimeSeconds: 0,
          lastStoppedStopIndex: -1,
          latitude: pCurr.lat,
          longitude: pCurr.lng,
          heading: headingVal,
          ramal: `${line.line_number}-A`,
          reports_count: i % 4 === 0 ? 1 : 0,
          timestamp: new Date().toISOString()
        })
      }
    })
  })

  return allBuses
}

const SIDEBAR_W = 220

// ─── Main ─────────────────────────────────────────────────────────────────────
const calculateRouteTimeMinutes = (route: any, allLines: any[]) => {
  const walkTime = (route.walkDistance / 4) * 60
  const line = allLines.find(l => l.id === route.line_id)
  if (!line) return Math.round(walkTime)
  const routeKey = line.line_number.replace(/^0+/, '')
  const officialRoute = (OFFICIAL_ROUTES as any)[routeKey]
  if (!officialRoute) return Math.round(walkTime + 15)
  const path = officialRoute.ida.path
  const stopO = officialRoute.ida.stops.find((s: any) => s.id === route.originStop.id)
  const stopD = officialRoute.ida.stops.find((s: any) => s.id === route.destStop.id)
  if (!stopO || !stopD) return Math.round(walkTime + 15)
  
  // getDistanceToPathIndex helper
  const getDistanceToPathIndexLocal = (
    p: { lat: number; lng: number }[],
    currIdx: number,
    progress: number,
    targetIdx: number
  ): number => {
    if (targetIdx <= currIdx) return 0
    const pA = p[currIdx]
    const pB = p[currIdx + 1] || pA
    const currentLat = pA.lat + (pB.lat - pA.lat) * progress
    const currentLng = pA.lng + (pB.lng - pA.lng) * progress
    let totalDist = globalDistanceKm({ lat: currentLat, lng: currentLng }, { lat: pB.lat, lng: pB.lng })
    for (let i = currIdx + 1; i < targetIdx; i++) {
      const pt1 = p[i]
      const pt2 = p[i + 1] || pt1
      totalDist += globalDistanceKm({ lat: pt1.lat, lng: pt1.lng }, { lat: pt2.lat, lng: pt2.lng })
    }
    return totalDist * 1000 // in meters
  }

  const busDist = getDistanceToPathIndexLocal(path, stopO.pathIndex, 0, stopD.pathIndex)
  const busTime = (busDist / 1000 / 18) * 60
  return Math.round(walkTime + busTime)
}

export default function UserMapPage() {
  const supabase      = createClient()
  const channelRef    = useRef<any>(null)
  const mockTickRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const simulatedBusesRef = useRef<SimulatedBusState[] | null>(null)
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
  
  // Uber Travel Assistant & Map Modes State
  const [activeMode, setActiveMode] = useState<'normal' | 'tourist' | 'clubbing' | 'shopping'>('normal')
  const [selectedCity, setSelectedCity] = useState<'buenos_aires' | 'santa_cruz'>('buenos_aires')
  const [touristYellowSelected, setTouristYellowSelected] = useState(true)
  const [touristRedSelected, setTouristRedSelected] = useState(true)
  const [drawerState, setDrawerState] = useState<'collapsed' | 'half' | 'expanded'>('half')
  const [originResults, setOriginResults] = useState<any[]>([])
  const [destResults, setDestResults] = useState<any[]>([])
  const [solvedRoutes, setSolvedRoutes] = useState<any[]>([])
  const [selectedPlace, setSelectedPlace] = useState<any | null>(null)
  const [selectedTouristStop, setSelectedTouristStop] = useState<BusStop | null>(null)
  const dragControls = useDragControls()
  
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
  const [transitlandRoutes, setTransitlandRoutes] = useState<any[]>([])
  const [transitlandShapes, setTransitlandShapes] = useState<any[]>([])
  const transitlandShapesRef = useRef<any[]>([])
  useEffect(() => {
    transitlandShapesRef.current = transitlandShapes
  }, [transitlandShapes])
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
  const [lineSearchQuery, setLineSearchQuery] = useState('')
  const [activeTravelRoute, setActiveTravelRoute] = useState<any>(null)
  const [userBoardedBus, setUserBoardedBus] = useState<boolean>(false)
  const [showGotOffPrompt, setShowGotOffPrompt] = useState<boolean>(false)
  const [currentAdIndex, setCurrentAdIndex] = useState<number>(0)

  useEffect(() => {
    if (!activeTravelRoute) {
      setUserBoardedBus(false)
      setShowGotOffPrompt(false)
    }
  }, [activeTravelRoute])

  const [ticketPrices, setTicketPrices] = useState<{ min: number; max: number; loading: boolean }>({
    min: 728.28,
    max: 1227.76,
    loading: true
  })

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/ticket-price')
        if (res.ok) {
          const data = await res.json()
          setTicketPrices({ min: data.min, max: data.max, loading: false })
        }
      } catch (err) {
        setTicketPrices(prev => ({ ...prev, loading: false }))
      }
    }
    fetchPrices()
  }, [])

  const fitCoordinates = (p1: { lat: number; lng: number }, p2: { lat: number; lng: number }) => {
    const minLat = Math.min(p1.lat, p2.lat)
    const maxLat = Math.max(p1.lat, p2.lat)
    const minLng = Math.min(p1.lng, p2.lng)
    const maxLng = Math.max(p1.lng, p2.lng)
    const centerLat = (minLat + maxLat) / 2
    const centerLng = (minLng + maxLng) / 2
    const maxDiff = Math.max(maxLat - minLat, maxLng - minLng)
    const zoom = Math.max(11, Math.min(15.0, 12.2 - Math.log2(maxDiff / 0.15)))
    setViewState(v => ({
      ...v,
      latitude: centerLat,
      longitude: centerLng,
      zoom: zoom,
      transitionDuration: 1000
    }))
  }
  const [alarmPinMode, setAlarmPinMode] = useState(false)
  const [alarmPinCoord, setAlarmPinCoord] = useState<{ lat: number; lng: number } | null>(null)
  const [alarmSelectedLineId, setAlarmSelectedLineId] = useState<string | null>(null)
  const [alarmThresholdType, setAlarmThresholdType] = useState<'minutes' | 'blocks'>('minutes')
  const [alarmThresholdValue, setAlarmThresholdValue] = useState<number>(5)
  const [activeAlarms, setActiveAlarms] = useState<any[]>([])

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

  // Map-Matching / 'Snap-to-Route' algorithm to align raw GPS coordinates to active route polylines
  const snapCoordinatesToRoute = (
    lat: number,
    lng: number,
    path: { lat: number; lng: number }[],
    driftThresholdMeters: number = 70
  ) => {
    if (!path || path.length < 2) {
      return { latitude: lat, longitude: lng, heading: null, snapped: false, segmentIndex: 0 };
    }

    let minDistance = Infinity;
    let bestSnappedPt = { lat, lng };
    let bestSegmentIdx = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const A = path[i];
      const B = path[i + 1];

      // Flat earth approximation with longitude scaling for Buenos Aires latitude (~-34.6)
      const latAvg = (A.lat + B.lat) / 2;
      const xScale = Math.cos(latAvg * Math.PI / 180);

      const dx = (B.lng - A.lng) * xScale;
      const dy = B.lat - A.lat;
      const px = (lng - A.lng) * xScale;
      const py = lat - A.lat;

      const lenSq = dx * dx + dy * dy;
      let t = lenSq !== 0 ? (px * dx + py * dy) / lenSq : 0;
      t = Math.max(0, Math.min(1, t)); // Clamp to segment length

      const C = {
        lat: A.lat + t * (B.lat - A.lat),
        lng: A.lng + t * (B.lng - A.lng)
      };

      // Calculate distance in kilometers using existing helper
      const distKm = distanceKm({ latitude: lat, longitude: lng }, C);
      const distMeters = distKm * 1000;

      if (distMeters < minDistance) {
        minDistance = distMeters;
        bestSnappedPt = C;
        bestSegmentIdx = i;
      }
    }

    if (minDistance <= driftThresholdMeters) {
      // Calculate heading from snapped point to the next sequential coordinate on the line path
      const nextPt = path[bestSegmentIdx + 1] || path[bestSegmentIdx];
      let segHeading = 0;
      if (nextPt.lat !== bestSnappedPt.lat || nextPt.lng !== bestSnappedPt.lng) {
        segHeading = heading(bestSnappedPt.lat, bestSnappedPt.lng, nextPt.lat, nextPt.lng);
      } else if (bestSegmentIdx > 0 && path[bestSegmentIdx - 1]) {
        segHeading = heading(path[bestSegmentIdx - 1].lat, path[bestSegmentIdx - 1].lng, bestSnappedPt.lat, bestSnappedPt.lng);
      }

      return {
        latitude: bestSnappedPt.lat,
        longitude: bestSnappedPt.lng,
        heading: segHeading,
        snapped: true,
        segmentIndex: bestSegmentIdx
      };
    }

    return { latitude: lat, longitude: lng, heading: null, snapped: false, segmentIndex: 0 };
  };


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

  // Multi-route solver
  const solveRoutes = (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
    const activeLines = lines.length > 0 ? lines : MOCK_LINES
    const standardLines = activeLines.filter(l => !(l as any).is_tourist)
    const recommendations: any[] = []

    standardLines.forEach(line => {
      const directions: ('ida' | 'vuelta')[] = ['ida', 'vuelta']
      directions.forEach(direction => {
        const stops = getMockStopsForLine(line, direction)
        const nearOrigin = stops.filter(stop => distanceKm({ latitude: stop.latitude, longitude: stop.longitude }, origin) < 2.0)
        const nearDest = stops.filter(stop => distanceKm({ latitude: stop.latitude, longitude: stop.longitude }, dest) < 2.0)

        if (nearOrigin.length > 0 && nearDest.length > 0) {
          let bestPair = null
          let minWalkDistance = Infinity

          for (const stopO of nearOrigin) {
            for (const stopD of nearDest) {
              // Ensure origin stop is before destination stop along the route
              if (stopO.stop_number < stopD.stop_number) {
                const walkO = distanceKm({ latitude: stopO.latitude, longitude: stopO.longitude }, origin)
                const walkD = distanceKm({ latitude: stopD.latitude, longitude: stopD.longitude }, dest)
                const totalWalk = walkO + walkD
                if (totalWalk < minWalkDistance) {
                  minWalkDistance = totalWalk
                  bestPair = { stopO, stopD }
                }
              }
            }
          }

          if (bestPair) {
            recommendations.push({
              line_id: line.id,
              line_number: line.line_number,
              color: line.color,
              name: line.name,
              originStop: bestPair.stopO,
              destStop: bestPair.stopD,
              walkDistance: minWalkDistance,
              direction: direction
            })
          }
        }
      })
    })

    return recommendations.sort((a, b) => a.walkDistance - b.walkDistance).slice(0, 3)
  }

  // OpenStreetMap Nominatim Live Autocomplete API
  const fetchAutocomplete = async (text: string, isOrigin: boolean) => {
    if (text.length < 3) {
      if (isOrigin) setOriginResults([])
      else setDestResults([])
      return
    }

    const cityKey = selectedCity
    const localFiltered = MOCK_PLACES.filter(p =>
      p.city === cityKey &&
      p.name.toLowerCase().includes(text.toLowerCase())
    ).map(p => ({
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      isPreset: true
    }))

    let osmResults: any[] = []
    try {
      const viewbox = cityKey === 'santa_cruz'
        ? '-63.2950,-17.8920,-63.0720,-17.7010'
        : '-58.5315,-34.7056,-58.3351,-34.5265'
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&accept-language=es&limit=5&viewbox=${viewbox}&bounded=1`
      const res = await fetch(url, {
        headers: { 'User-Agent': 'TuBus Travel Planner App' }
      })
      if (res.ok) {
        const data = await res.json()
        osmResults = data.map((item: any) => ({
          name: item.display_name.split(',').slice(0, 3).join(','),
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
          isPreset: false
        }))
      }
    } catch (e) {
      console.error('Error fetching Nominatim search:', e)
    }

    const combined = [...localFiltered, ...osmResults].slice(0, 6)
    if (isOrigin) setOriginResults(combined)
    else setDestResults(combined)
  }

  // ── init ──
  useEffect(() => {
    setPrefs(loadPrefs())
    
    // Set initial viewport based on selected city (Buenos Aires or Santa Cruz)
    const params = new URLSearchParams(window.location.search)
    const queryCity = params.get('city')
    const storedCity = localStorage.getItem('selected_city')
    const activeCity = queryCity || storedCity || 'buenos_aires'
    
    if (activeCity === 'santa_cruz' || activeCity === 'buenos_aires') {
      setSelectedCity(activeCity as any)
    }

    if (activeCity === 'santa_cruz') {
      setViewState(v => ({ ...v, latitude: -17.7863, longitude: -63.1812, zoom: 13, pitch: 30, bearing: 0 }))
    } else {
      setViewState(v => ({ ...v, latitude: -34.6037, longitude: -58.4173, zoom: 13, pitch: 30, bearing: 0 }))
    }

    supabase.auth.getUser().then(({ data: { user } }) => { if (user) setUser(user) })
    supabase.from('bus_lines').select('*').eq('is_active', true).then(({ data }) => {
      const ALLOWED_LINES = ['12', '28', '37', '39', '59', '60', '102', '152', 'T-Amarillo', 'T-Rojo']
      const availableLines = (data && data.length > 0 ? [...data, ...MOCK_LINES.filter(l => (l as any).is_tourist)] : MOCK_LINES).filter(l => ALLOWED_LINES.includes(l.line_number))
      setLines(availableLines)
      
      simulatedBusesRef.current = initializeSimulatedBuses(availableLines)
      setUseMockBuses(true)
      
      setSelectedLines([])
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

  // Load dynamic Transitland routes and shapes when selection changes
  useEffect(() => {
    if (selectedLines.length === 0) {
      setTransitlandRoutes([])
      setTransitlandShapes([])
      return
    }

    const loadTransitlandData = async () => {
      try {
        console.log('[Transitland Frontend] Fetching dynamic routes for selected lines...')
        const routesPromises = selectedLines.map(async (line) => {
          const res = await fetch(`/api/routes?line_number=${line.line_number}`)
          if (!res.ok) throw new Error(`Failed to fetch routes for Line ${line.line_number}`)
          const json = await res.json()
          return json.routes || []
        })
        const routesListList = await Promise.all(routesPromises)
        const routes = routesListList.flat()
        setTransitlandRoutes(routes)

        console.log(`[Transitland Frontend] Fetched ${routes.length} routes. Fetching shapes...`)
        const shapesPromises = routes.map(async (route: any) => {
          const res = await fetch(`/api/shapes?route_id=${route.onestop_id}`)
          if (!res.ok) throw new Error(`Failed to fetch shapes for Route ${route.onestop_id}`)
          const json = await res.json()
          return json.shapes || []
        })
        const shapesListList = await Promise.all(shapesPromises)
        const shapes = shapesListList.flat()
        setTransitlandShapes(shapes)
        console.log(`[Transitland Frontend] Successfully loaded ${shapes.length} dynamic shapes.`)
      } catch (err) {
        console.error('[Transitland Frontend ERROR] Error loading dynamic Transitland data:', err)
      }
    }

    loadTransitlandData()
  }, [selectedLines])


  // ── line subscription + real-time API + smooth LERP animation ──
  useEffect(() => {
    if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
    if (apiPollRef.current) { clearInterval(apiPollRef.current); apiPollRef.current = null }
    
    setBuses([])
    setLineStops([])
    setUseMockBuses(true)
    
    if (selectedLines.length === 0) return

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

    setBranchFilter('all')
    setTrackedBusId(null)
    setDirectionFilter('all')

    let lastTick = Date.now()
    let tickCount = 0

    mockTickRef.current = setInterval(() => {
      const now = Date.now()
      const dt = Math.min((now - lastTick) / 1000, 0.1) // clamp to max 100ms
      lastTick = now
      tickCount++

      if (!simulatedBusesRef.current) return

      const selectedIds = new Set(selectedLines.map(l => l.id))
      const newTrafficColors: Record<string, { color: string; timestamp: number }> = {}

      // Update all simulated buses
      simulatedBusesRef.current.forEach(bus => {
        const routeKey = bus.line_number.replace(/^0+/, '')
        const officialRoute = OFFICIAL_ROUTES[routeKey]
        if (!officialRoute) return

        const dirObj = bus.direction === 'vuelta' ? officialRoute.vuelta : officialRoute.ida
        if (!dirObj || !dirObj.path || dirObj.path.length < 2) return

        const path = dirObj.path
        const stops = dirObj.stops

        if (bus.status === 'stopped') {
          bus.speed_kmh = 0
          bus.dwellTimeSeconds -= dt
          if (bus.dwellTimeSeconds <= 0) {
            bus.status = 'moving'
            bus.dwellTimeSeconds = 0
            bus.speed_kmh = 5 // start moving slowly
          }
        } else {
          // Find next stop
          let nextStop = null
          for (let i = 0; i < stops.length; i++) {
            const stop = stops[i]
            if (stop.pathIndex > bus.pathIndex || (stop.pathIndex === bus.pathIndex && bus.segmentProgress < 0.99)) {
              if (bus.lastStoppedStopIndex !== stop.pathIndex) {
                nextStop = stop
                break
              }
            }
          }

          if (nextStop) {
            const distanceToStop = getDistanceToPathIndex(path, bus.pathIndex, bus.segmentProgress, nextStop.pathIndex)
            if (distanceToStop < 6) {
              // Stop at the stop!
              bus.speed_kmh = 0
              bus.status = 'stopped'
              bus.dwellTimeSeconds = 3 + Math.random() * 3
              bus.lastStoppedStopIndex = nextStop.pathIndex
              const delta = Math.floor(Math.random() * 11) - 5
              bus.passenger_count = Math.max(5, Math.min(60, bus.passenger_count + delta))
            } else {
              // Accelerate/decelerate approach
              const decelerationDistance = 80 // meters
              const targetSpeed = distanceToStop < decelerationDistance
                ? Math.max(5, bus.maxSpeedKmh * (distanceToStop / decelerationDistance))
                : bus.maxSpeedKmh
              bus.speed_kmh = bus.speed_kmh + (targetSpeed - bus.speed_kmh) * dt * 2
            }
          } else {
            // No next stop, heading to terminal (last path node)
            const distanceToTerminal = getDistanceToPathIndex(path, bus.pathIndex, bus.segmentProgress, path.length - 1)
            if (distanceToTerminal < 6) {
              // Turnaround at terminal!
              bus.direction = bus.direction === 'ida' ? 'vuelta' : 'ida'
              bus.pathIndex = 0
              bus.segmentProgress = 0
              bus.lastStoppedStopIndex = -1
              bus.speed_kmh = 0
              bus.status = 'stopped'
              bus.dwellTimeSeconds = 4 + Math.random() * 3
            } else {
              const decelerationDistance = 80
              const targetSpeed = distanceToTerminal < decelerationDistance
                ? Math.max(5, bus.maxSpeedKmh * (distanceToTerminal / decelerationDistance))
                : bus.maxSpeedKmh
              bus.speed_kmh = bus.speed_kmh + (targetSpeed - bus.speed_kmh) * dt * 2
            }
          }

          // Move the bus along path segments
          if (bus.status === 'moving') {
            const speedMs = (bus.speed_kmh * 1000) / 3600
            let distanceToMove = speedMs * dt

            while (distanceToMove > 0) {
              if (bus.pathIndex >= path.length - 1) {
                // Turnaround
                bus.direction = bus.direction === 'ida' ? 'vuelta' : 'ida'
                bus.pathIndex = 0
                bus.segmentProgress = 0
                bus.lastStoppedStopIndex = -1
                bus.speed_kmh = 0
                bus.status = 'stopped'
                bus.dwellTimeSeconds = 4 + Math.random() * 3
                break
              }

              const pCurr = path[bus.pathIndex]
              const pNext = path[bus.pathIndex + 1]
              const currLat = pCurr.lat + (pNext.lat - pCurr.lat) * bus.segmentProgress
              const currLng = pCurr.lng + (pNext.lng - pCurr.lng) * bus.segmentProgress

              const distToNextNode = globalDistanceKm({ latitude: currLat, longitude: currLng }, { lat: pNext.lat, lng: pNext.lng }) * 1000
              if (distanceToMove >= distToNextNode) {
                distanceToMove -= distToNextNode
                bus.pathIndex++
                bus.segmentProgress = 0
              } else {
                bus.segmentProgress += distanceToMove / distToNextNode
                distanceToMove = 0
                if (bus.segmentProgress >= 1) {
                  bus.pathIndex++
                  bus.segmentProgress = 0
                }
              }
            }
          }
        }

        // Recompute coordinates
        const pCurr = path[bus.pathIndex]
        const pNext = path[bus.pathIndex + 1] || pCurr
        bus.latitude = pCurr.lat + (pNext.lat - pCurr.lat) * bus.segmentProgress
        bus.longitude = pCurr.lng + (pNext.lng - pCurr.lng) * bus.segmentProgress
        bus.heading = heading(bus.latitude, bus.longitude, pNext.lat, pNext.lng)

        // Set next stop fields
        const nextStopIndex = stops.findIndex(s => s.pathIndex > bus.pathIndex || (s.pathIndex === bus.pathIndex && bus.segmentProgress < 0.99))
        const actualNextStop = nextStopIndex !== -1 ? stops[nextStopIndex] : null
        bus.next_stop_id = actualNextStop ? actualNextStop.id : 'Terminal'
        bus.next_stop_name = actualNextStop ? actualNextStop.name : 'Terminal'
        
        const distToNext = actualNextStop 
          ? getDistanceToPathIndex(path, bus.pathIndex, bus.segmentProgress, actualNextStop.pathIndex)
          : 0
        bus.eta_minutes = actualNextStop 
          ? Math.max(1, Math.ceil(distToNext / 1000 / (bus.speed_kmh > 2 ? bus.speed_kmh / 60 : 20 / 60)))
          : 0

        // Check active alarms for this bus
        if (activeAlarms.length > 0) {
          const triggeredAlarms: string[] = []
          activeAlarms.forEach(alarm => {
            if (alarm.type === 'bus_alarm' && alarm.busId === bus.id) {
              const stop = alarm.stop
              const distKm = globalDistanceKm({ latitude: bus.latitude, longitude: bus.longitude }, { lat: stop.latitude, lng: stop.longitude })
              const distM = distKm * 1000
              
              let triggered = false
              if (alarm.thresholdType === 'meters' && distM <= alarm.thresholdValue) {
                triggered = true
              } else if (alarm.thresholdType === 'minutes') {
                const speed = bus.speed_kmh > 2 ? bus.speed_kmh : 20
                const minutes = (distKm / speed) * 60
                if (minutes <= alarm.thresholdValue) triggered = true
              } else if (alarm.thresholdType === 'blocks') {
                const blocks = distKm * 10
                if (blocks <= alarm.thresholdValue) triggered = true
              }

              if (triggered) {
                toast(`🚨 ¡Alerta de Colectivo! El Interno ${bus.bus_unit} está a menos de ${alarm.thresholdValue} ${alarm.thresholdType === 'meters' ? 'metros' : alarm.thresholdType === 'minutes' ? 'minutos' : 'cuadras'} de tu parada (${stop.name})`, {
                  icon: '🔔',
                  duration: 8000
                })
                triggeredAlarms.push(alarm.id)
              }
            } else if (alarm.type === 'stop_alarm' && alarm.lineId === bus.line_id) {
              const distKm = globalDistanceKm({ latitude: bus.latitude, longitude: bus.longitude }, alarm.coord)
              const distM = distKm * 1000

              const dy = alarm.coord.lat - bus.latitude
              const dx = alarm.coord.lng - bus.longitude
              const angleToStop = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
              const diff = Math.abs(bus.heading - angleToStop)
              const circularDiff = Math.abs(((diff + 180) % 360) - 180)
              const isComing = circularDiff <= 90

              if (isComing) {
                let triggered = false
                let triggerVal = 0
                if (alarm.thresholdType === 'minutes') {
                  const speed = bus.speed_kmh > 2 ? bus.speed_kmh : 20
                  const minutes = (distKm / speed) * 60
                  if (minutes <= alarm.thresholdValue) {
                    triggered = true
                    triggerVal = Math.round(minutes)
                  }
                } else if (alarm.thresholdType === 'blocks') {
                  const blocks = distKm * 10
                  if (blocks <= alarm.thresholdValue) {
                    triggered = true
                    triggerVal = Math.round(blocks)
                  }
                }

                if (triggered) {
                  const line = MOCK_LINES.find(l => l.id === alarm.lineId)
                  const lineName = line ? `Línea ${line.line_number}` : 'Colectivo'
                  const currentSt = getNearestStreetName(bus.latitude, bus.longitude)
                  toast(`🚨 ¡Recordatorio de Parada! Tu próximo colectivo de la ${lineName} (Interno ${bus.bus_unit}) está a ${triggerVal} ${alarm.thresholdType === 'minutes' ? 'minutos' : 'cuadras'} de tu parada personalizada (actualmente cerca de ${currentSt}).`, {
                    icon: '⏱️',
                    duration: 8000
                  })
                  triggeredAlarms.push(alarm.id)
                }
              }
            }
          })

          if (triggeredAlarms.length > 0) {
            setActiveAlarms(prev => prev.filter(a => !triggeredAlarms.includes(a.id)))
          }
        }

        // Traffic state collection (once a second)
        if (tickCount % 20 === 0 && selectedIds.has(bus.line_id)) {
          let segmentIdx = 0
          for (let idx = 0; idx < stops.length - 1; idx++) {
            if (bus.pathIndex <= stops[idx + 1].pathIndex) {
              segmentIdx = idx
              break
            }
            segmentIdx = idx
          }
          let color = '#10B981'
          if (bus.speed_kmh < 10) {
            color = '#EF4444'
          } else if (bus.speed_kmh < 22) {
            color = '#F59E0B'
          }
          const key = `${bus.line_number}-${bus.direction}-${segmentIdx}`
          newTrafficColors[key] = { color, timestamp: now }
        }
      })

      // Apply traffic state updates
      if (Object.keys(newTrafficColors).length > 0) {
        setTrafficState(prev => {
          const next = { ...prev }
          Object.entries(newTrafficColors).forEach(([key, val]) => {
            next[key] = val
          })
          return next
        })
      }

      // Filter and set buses state for rendering
      const filtered = simulatedBusesRef.current.filter(bus => selectedIds.has(bus.line_id))
      const busesToSet = activeTravelRoute
        ? filtered.filter(b => {
            if (b.line_id !== activeTravelRoute.line_id) return false
            if (b.direction !== activeTravelRoute.direction) return false

            // Resolve boarding (origin) and alighting (destination) stop path index values
            let idxO = activeTravelRoute.originStop.pathIndex
            let idxD = activeTravelRoute.destStop.pathIndex
            
            const routeKey = activeTravelRoute.line_number.replace(/^0+/, '')
            const officialRoute = OFFICIAL_ROUTES[routeKey]
            const pathRef = officialRoute
              ? (activeTravelRoute.direction === 'vuelta' ? officialRoute.vuelta?.path : officialRoute.ida?.path) || []
              : []
            
            if (pathRef.length > 0) {
              if (idxO === undefined) {
                let minD = Infinity
                pathRef.forEach((pt: any, idx: number) => {
                  const dist = Math.hypot(pt.lat - activeTravelRoute.originStop.latitude, pt.lng - activeTravelRoute.originStop.longitude)
                  if (dist < minD) { minD = dist; idxO = idx }
                })
              }
              if (idxD === undefined) {
                let minD = Infinity
                pathRef.forEach((pt: any, idx: number) => {
                  const dist = Math.hypot(pt.lat - activeTravelRoute.destStop.latitude, pt.lng - activeTravelRoute.destStop.longitude)
                  if (dist < minD) { minD = dist; idxD = idx }
                })
              }
            }

            // 1. Hide the bus if it is past the destination stop
            if (idxD !== undefined && b.pathIndex > idxD) {
              return false
            }

            // 2. Hide the bus if it has passed the boarding stop and is more than 300m away
            if (idxO !== undefined && b.pathIndex > idxO) {
              const distKm = globalDistanceKm(
                { latitude: b.latitude, longitude: b.longitude },
                { lat: activeTravelRoute.originStop.latitude, lng: activeTravelRoute.originStop.longitude }
              )
              if (distKm > 0.3) {
                return false
              }
            }

            return true
          })
        : filtered
      setBuses(busesToSet)

      if (userBoardedBus && trackedBusId && activeTravelRoute) {
        const trackedBus = simulatedBusesRef.current.find(b => b.id === trackedBusId)
        if (trackedBus) {
          const distKm = globalDistanceKm(
            { latitude: trackedBus.latitude, longitude: trackedBus.longitude },
            { lat: activeTravelRoute.destStop.latitude, lng: activeTravelRoute.destStop.longitude }
          )
          
          let idxD = activeTravelRoute.destStop.pathIndex
          if (idxD === undefined) {
            const routeKey = activeTravelRoute.line_number.replace(/^0+/, '')
            const officialRoute = OFFICIAL_ROUTES[routeKey]
            const pathRef = officialRoute
              ? (activeTravelRoute.direction === 'vuelta' ? officialRoute.vuelta?.path : officialRoute.ida?.path) || []
              : []
            if (pathRef.length > 0) {
              let minD = Infinity
              pathRef.forEach((pt: any, idx: number) => {
                const dist = Math.hypot(pt.lat - activeTravelRoute.destStop.latitude, pt.lng - activeTravelRoute.destStop.longitude)
                if (dist < minD) { minD = dist; idxD = idx }
              })
            }
          }

          const passedDest = idxD !== undefined && trackedBus.pathIndex >= idxD
          if (distKm < 0.08 || passedDest) {
            setShowGotOffPrompt(true)
          }
        }
      }

    }, 50)

    return () => {
      if (mockTickRef.current) { clearInterval(mockTickRef.current); mockTickRef.current = null }
    }
  }, [selectedLines, activeTravelRoute, userBoardedBus, trackedBusId])

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

  // Update lineStops dynamically when selectedLines, directionFilter, or activeTravelRoute changes
  useEffect(() => {
    if (selectedLines.length === 0) {
      setLineStops([])
      return
    }
    let combinedStops = selectedLines.flatMap(line => getMockStopsForLine(line, directionFilter))
    if (activeTravelRoute) {
      combinedStops = combinedStops.filter(s => {
        if (s.line_id !== activeTravelRoute.line_id) return false
        if (s.direction !== activeTravelRoute.direction) return false

        const sNum = s.stop_number
        const oNum = activeTravelRoute.originStop.stop_number
        const dNum = activeTravelRoute.destStop.stop_number

        const minNum = Math.min(oNum, dNum)
        const maxNum = Math.max(oNum, dNum)

        return sNum >= minNum && sNum <= maxNum
      })
    }

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
  }, [selectedLines, directionFilter, activeTravelRoute])

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

  const getUpcomingBusesForRoute = (route: any) => {
    if (!route) return { upcoming: null, nextBus: null, upcomingDist: 0, nextDist: 0 }
    const lineBuses = buses.filter(b => b.line_id === route.line_id)
    if (lineBuses.length === 0) return { upcoming: null, nextBus: null, upcomingDist: 0, nextDist: 0 }
    const incomingBuses = lineBuses.map(bus => {
      const distKm = globalDistanceKm({ latitude: bus.latitude, longitude: bus.longitude }, { lat: route.originStop.latitude, lng: route.originStop.longitude })
      const distM = distKm * 1000
      const dy = route.originStop.latitude - bus.latitude
      const dx = route.originStop.longitude - bus.longitude
      const angleToStop = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
      const diff = Math.abs(bus.heading - angleToStop)
      const circularDiff = Math.abs(((diff + 180) % 360) - 180)
      const isComing = circularDiff <= 90
      return { bus, distM, isComing }
    }).filter(item => item.isComing)
    incomingBuses.sort((a, b) => a.distM - b.distM)
    const upcoming = incomingBuses[0]?.bus || null
    const nextBus = incomingBuses[1]?.bus || null
    const upcomingDist = incomingBuses[0]?.distM || 0
    const nextDist = incomingBuses[1]?.distM || 0
    return { upcoming, nextBus, upcomingDist, nextDist }
  }
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
  const linesToDraw = activeTravelRoute
    ? selectedLines.filter(l => l.id === activeTravelRoute.line_id)
    : selectedLines
  const routeGeoJsons = linesToDraw.map(line => {
    const lineShapes = transitlandShapes.filter(s => {
      return s.route_onestop_id?.includes(line.line_number) || s.onestop_id?.includes(line.line_number)
    })

    const activeDir = (activeTravelRoute && activeTravelRoute.line_id === line.id)
      ? activeTravelRoute.direction
      : directionFilter

    const paths = lineShapes.length > 0
      ? lineShapes.map(s => s.geometry.coordinates.map(([lng, lat]: any) => ({ lat, lng })))
      : getMockRoutePathsForLine(line, activeDir)

    // Slice coordinates to show ONLY the trip portion if activeTravelRoute is set for this line
    let pathsToDraw = paths
    if (activeTravelRoute && activeTravelRoute.line_id === line.id) {
      const stops = getMockStopsForLine(line, activeDir)
      const stopO = stops.find(s => s.id === activeTravelRoute.originStop.id)
      const stopD = stops.find(s => s.id === activeTravelRoute.destStop.id)
      
      // Look up pathIndex, fallback to closest segment search if undefined
      let idxO = stopO?.pathIndex
      let idxD = stopD?.pathIndex
      
      if (idxO === undefined || idxD === undefined) {
        const pathRef = paths[0] || []
        if (idxO === undefined && stopO) {
          let minD = Infinity
          pathRef.forEach((pt: any, idx: number) => {
            const dist = Math.hypot(pt.lat - stopO.latitude, pt.lng - stopO.longitude)
            if (dist < minD) { minD = dist; idxO = idx }
          })
        }
        if (idxD === undefined && stopD) {
          let minD = Infinity
          pathRef.forEach((pt: any, idx: number) => {
            const dist = Math.hypot(pt.lat - stopD.latitude, pt.lng - stopD.longitude)
            if (dist < minD) { minD = dist; idxD = idx }
          })
        }
      }

      const startIdx = Math.min(idxO ?? 0, idxD ?? (paths[0]?.length ? paths[0].length - 1 : 0))
      const endIdx = Math.max(idxO ?? 0, idxD ?? (paths[0]?.length ? paths[0].length - 1 : 0))
      pathsToDraw = paths.map(path => path.slice(startIdx, endIdx + 1))
    }

    return {
      id: `route-${line.id}`,
      color: line.color,
      features: pathsToDraw.map((path, pIdx) => ({
        type: 'Feature' as const,
        properties: { color: line.color },
        geometry: {
          type: 'LineString' as const,
          coordinates: path.map((point: any) => [point.lng, point.lat]),
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

  const renderDrawerContent = () => {
    const handleAdScroll = (e: React.UIEvent<HTMLDivElement>) => {
      const container = e.currentTarget
      const scrollLeft = container.scrollLeft
      const width = container.clientWidth
      if (width > 0) {
        const newIndex = Math.round(scrollLeft / width)
        if (newIndex !== currentAdIndex) {
          setCurrentAdIndex(newIndex)
        }
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '14px', width: '100%' }}>
        {/* Title: TU VIAJE / YOUR TRIP */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'DM Sans', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            TU VIAJE (YOUR TRIP)
          </span>
          {selectedLines.length > 0 && (
            <button
              onClick={() => {
                setSelectedLines([])
                setActiveTravelRoute(null)
                setTrackedBusId(null)
                setSolvedRoutes([])
              }}
              style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Inputs stacked with vertical connector in a clean card */}
        <div style={{
          background: prefs.darkMap ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: prefs.darkMap ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          borderRadius: '16px',
          padding: '12px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Vertical connector line */}
          <div style={{
            position: 'absolute',
            left: '23px',
            top: '28px',
            bottom: '28px',
            width: '2px',
            background: prefs.darkMap ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            zIndex: 1
          }} />
          
          {/* Origin Input Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
            {/* Pickup human icon */}
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(59,130,246,0.15)', color: '#3B82F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <User size={13} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={originInput}
                onChange={e => {
                  setOriginInput(e.target.value)
                  fetchAutocomplete(e.target.value, true)
                }}
                placeholder="Origen (¿Dónde te encontrás?)"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px',
                  background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {originResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                  background: prefs.darkMap ? '#1e293b' : '#ffffff',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px', overflow: 'hidden', marginTop: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {originResults.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setOriginInput(res.name)
                        setOriginCoord({ lat: res.lat, lng: res.lng })
                        setOriginResults([])
                        if (destCoord) {
                          const routes = solveRoutes({ lat: res.lat, lng: res.lng }, destCoord)
                          setSolvedRoutes(routes)
                          if (routes.length > 0) {
                            setActiveTravelRoute(routes[0])
                            const line = allLines.find(l => l.id === routes[0].line_id)
                            if (line) setSelectedLines([line])
                          }
                          fitCoordinates({ lat: res.lat, lng: res.lng }, destCoord)
                        } else {
                          setViewState(v => ({ ...v, latitude: res.lat, longitude: res.lng, zoom: 14.5, transitionDuration: 1000 }))
                        }
                      }}
                      style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: idx < originResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', color: 'var(--text-primary)' }}
                    >
                      📍 {res.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setMapSelectionMode('origin'); setOriginResults([]) }}
              style={{
                background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '8px', padding: '8px 10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0
              }}
            >
              Pin
            </button>
          </div>

          {/* Destination Input Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9 }}>
            {/* Checkered flag icon */}
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)', color: '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <NavIcon size={12} style={{ transform: 'rotate(45deg)' }} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={destInput}
                onChange={e => {
                  setDestInput(e.target.value)
                  fetchAutocomplete(e.target.value, false)
                }}
                placeholder="Destino (¿A dónde vamos?)"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px',
                  background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {destResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                  background: prefs.darkMap ? '#1e293b' : '#ffffff',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px', overflow: 'hidden', marginTop: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {destResults.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDestInput(res.name)
                        setDestCoord({ lat: res.lat, lng: res.lng })
                        setDestResults([])
                        if (originCoord) {
                          const routes = solveRoutes(originCoord, { lat: res.lat, lng: res.lng })
                          setSolvedRoutes(routes)
                          if (routes.length > 0) {
                            setActiveTravelRoute(routes[0])
                            const line = allLines.find(l => l.id === routes[0].line_id)
                            if (line) setSelectedLines([line])
                          }
                          fitCoordinates(originCoord, { lat: res.lat, lng: res.lng })
                        } else {
                          setViewState(v => ({ ...v, latitude: res.lat, longitude: res.lng, zoom: 14.5, transitionDuration: 1000 }))
                        }
                      }}
                      style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: idx < destResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', color: 'var(--text-primary)' }}
                    >
                      📍 {res.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setMapSelectionMode('destination'); setDestResults([]) }}
              style={{
                background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px', padding: '8px 10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0
              }}
            >
              Pin
            </button>
          </div>
        </div>

        {/* Mode Selector Row (Normal, Turismo, Bares, Compras) - Yango Pill Tabs style */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {([
            { id: 'normal', label: 'Normal' },
            { id: 'tourist', label: 'Turismo' },
            { id: 'clubbing', label: 'Bares' },
            { id: 'shopping', label: 'Compras' }
          ] as const).map(m => {
            const active = activeMode === m.id
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveMode(m.id)
                  if (m.id === 'tourist') {
                    setTouristYellowSelected(true)
                    setTouristRedSelected(true)
                    const yellowLine = allLines.find(l => l.line_number === 'T-Amarillo')
                    const redLine = allLines.find(l => l.line_number === 'T-Rojo')
                    setSelectedLines(prev => {
                      const next = [...prev]
                      if (yellowLine && !next.some(l => l.id === yellowLine.id)) next.push(yellowLine)
                      if (redLine && !next.some(l => l.id === redLine.id)) next.push(redLine)
                      return next
                    })
                  } else {
                    setSelectedLines(prev => prev.filter(l => !(l as any).is_tourist))
                    setActiveTravelRoute(null)
                  }
                }}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: active 
                    ? 'var(--text-primary)' 
                    : (prefs.darkMap ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  color: active 
                    ? (prefs.darkMap ? '#000000' : '#ffffff') 
                    : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms', flexShrink: 0
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Bus Line selector - replaced car types scroll */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase' }}>
            {solvedRoutes.length > 0 ? 'Líneas recomendadas' : 'Líneas disponibles'}
          </span>
          <div style={{
            display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
          }}>
            {(() => {
              const activeLines = lines.length > 0 ? lines : MOCK_LINES
              const linesToDisplay = solvedRoutes.length > 0
                ? solvedRoutes.map(r => ({
                    ...r,
                    line: activeLines.find(l => l.id === r.line_id)
                  })).filter(r => r.line !== undefined)
                : activeLines.filter(line => {
                    if (activeMode === 'tourist') return line.is_tourist
                    return !line.is_tourist
                  })

              return linesToDisplay.map((item: any) => {
                const line = item.line || item
                const isSelected = selectedLines.some(l => l.id === line.id)
                const eta = item.originStop ? calculateRouteTimeMinutes(item, allLines) : null
                
                return (
                  <div
                    key={line.id}
                    onClick={() => {
                      setSelectedLines(prev => {
                        const exists = prev.some(l => l.id === line.id)
                        if (exists) {
                          return prev.filter(l => l.id !== line.id)
                        } else {
                          return [...prev, line]
                        }
                      })
                      if (item.originStop) {
                        setActiveTravelRoute((prev: any) => prev?.line_id === item.line_id ? null : item)
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      width: '105px',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      background: isSelected 
                        ? (prefs.darkMap ? 'rgba(34,211,160,0.1)' : 'rgba(34,211,160,0.06)') 
                        : (prefs.darkMap ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      border: `2.5px solid ${isSelected ? line.color : (prefs.darkMap ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                      boxShadow: isSelected ? `0 4px 12px ${line.color}33` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 200ms',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{
                      width: '46px', height: '46px', borderRadius: '12px',
                      border: `2px solid ${line.color}`,
                      boxShadow: `0 0 10px ${line.color}cc`,
                      background: prefs.darkMap ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                    }}>
                      <img 
                        src={`/images/bus-${line.line_number}-front.png`} 
                        alt={`Bus ${line.line_number}`}
                        onError={(e) => {
                          // Fallback to simple icon if custom image is missing
                          e.currentTarget.style.display = 'none'
                          const parent = e.currentTarget.parentElement
                          if (parent) {
                            const icon = document.createElement('div')
                            icon.style.color = line.color
                            icon.style.fontSize = '14px'
                            icon.style.fontWeight = '900'
                            icon.innerText = line.line_number
                            parent.appendChild(icon)
                          }
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scale(1.05)' }}
                      />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Línea {line.line_number}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '85px' }}>
                        {eta ? `~${eta} min` : `$${ticketPrices.min.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Bottom Bar: Payment Icon + Main Button + Filters (Matches Yango bottom bar style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(184,200,224,0.08)', paddingTop: '10px', marginTop: 'auto' }}>
          {/* Visa/SUBE card badge */}
          <div style={{
            width: '42px', height: '34px', borderRadius: '8px',
            background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }} title="SUBE Card">
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#0057B7', fontFamily: 'system-ui' }}>SUBE</span>
          </div>

          {/* Main button: Comenzar Viaje / Request */}
          <button
            onClick={() => {
              if (originCoord && destCoord) {
                const routes = solveRoutes(originCoord, destCoord)
                setSolvedRoutes(routes)
                if (routes.length > 0) {
                  setActiveTravelRoute(routes[0])
                  const line = allLines.find(l => l.id === routes[0].line_id)
                  if (line) setSelectedLines([line])
                }
                fitCoordinates(originCoord, destCoord)
                setDrawerState('half')
                toast.success("¡Colectivos recomendados actualizados!")
              } else {
                toast.error("Por favor ingresá origen y destino primero.")
              }
            }}
            style={{
              flex: 1, height: '42px', background: prefs.darkMap ? '#ffffff' : '#111827',
              color: prefs.darkMap ? '#000000' : '#ffffff', border: 'none', borderRadius: '10px',
              fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 200ms'
            }}
          >
            Buscar Colectivos
          </button>

          {/* Filters/Settings icon button */}
          <button
            onClick={() => updatePrefs({ darkMap: !prefs.darkMap })}
            style={{
              width: '42px', height: '34px', borderRadius: '8px',
              background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              color: 'var(--text-primary)'
            }}
            title="Ajustar Mapa"
          >
            <Sliders size={14} />
          </button>
        </div>

        {/* Premium Advertisement Card */}
        {((drawerState === 'expanded' || !isMobile)) && (
          <div style={{
            padding: '12px',
            borderRadius: '14px',
            background: prefs.darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#10B981', fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>Anuncio</span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Patrocinado</span>
            </div>
            <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', width: '100%', border: '1px solid rgba(184, 200, 224, 0.15)' }}>
              <style>{`
                .hide-scrollbar::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              
              <div
                onScroll={handleAdScroll}
                style={{
                  display: 'flex',
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  width: '100%'
                }}
                className="hide-scrollbar"
              >
                {TUFIX_ADS.map((ad, idx) => (
                  <div
                    key={idx}
                    style={{
                      flexShrink: 0,
                      width: '100%',
                      scrollSnapAlign: 'start',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(ad.url, '_blank')}
                  >
                    <img
                      src={ad.image}
                      alt={ad.title}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  </div>
                ))}
              </div>

              {/* Navigation dots overlay */}
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '4px',
                background: 'rgba(0,0,0,0.5)',
                padding: '3px 8px',
                borderRadius: '10px',
                zIndex: 10
              }}>
                {TUFIX_ADS.map((_, idx) => (
                  <div
                    key={idx}
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: currentAdIndex === idx ? '#10B981' : 'rgba(255,255,255,0.4)',
                      transition: 'background 200ms'
                    }}
                  />
                ))}
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {TUFIX_ADS[currentAdIndex]?.title || 'TUFIX - Contratá Profesionales'}
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                  {TUFIX_ADS[currentAdIndex]?.desc || 'El trabajador ideal para vos.'}
                </span>
              </div>
              <button
                onClick={() => window.open(TUFIX_ADS[currentAdIndex]?.url || 'https://tufix.com', '_blank')}
                style={{
                  padding: '5px 12px', background: '#10B981', color: 'white', border: 'none', borderRadius: '6px',
                  fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 200ms', flexShrink: 0, marginLeft: '8px'
                }}
              >
                Ver más
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }


  const showTravelPins = (drawerState !== 'collapsed') || showLineSelector || !!mapSelectionMode

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
            if (alarmPinMode) {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setAlarmPinCoord({ lat, lng })
              setAlarmPinMode(false)
              const activeLines = lines.length > 0 ? lines : MOCK_LINES
              const nearby = activeLines.filter(line => {
                const stops = getMockStopsForLine(line)
                return stops.some(s => distanceKm({ latitude: s.latitude, longitude: s.longitude }, { lat, lng }) < 2.0)
              })
              if (nearby.length > 0) {
                setAlarmSelectedLineId(nearby[0].id)
                toast.success("¡Pin de recordatorio colocado! Configura la alarma en la tarjeta flotante del mapa.")
              } else {
                toast.error("No hay líneas de colectivos cerca del pin (radio de 2km).")
                setAlarmPinCoord(null)
              }
              return
            }
            if (mapSelectionMode === 'origin') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setOriginCoord({ lat, lng })
              setOriginInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setOriginInput)
              setMapSelectionMode(null)
              if (destCoord) {
                const routes = solveRoutes({ lat, lng }, destCoord)
                setSolvedRoutes(routes)
                if (routes.length > 0) {
                  setActiveTravelRoute(routes[0])
                  const line = allLines.find(l => l.id === routes[0].line_id)
                  if (line) setSelectedLines([line])
                }
                fitCoordinates({ lat, lng }, destCoord)
              } else {
                setViewState(v => ({
                  ...v,
                  latitude: lat,
                  longitude: lng,
                  zoom: 14.5,
                  transitionDuration: 1000
                }))
              }
            } else if (mapSelectionMode === 'destination') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setDestCoord({ lat, lng })
              setDestInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setDestInput)
              setMapSelectionMode(null)
              if (originCoord) {
                const routes = solveRoutes(originCoord, { lat, lng })
                setSolvedRoutes(routes)
                if (routes.length > 0) {
                  setActiveTravelRoute(routes[0])
                  const line = allLines.find(l => l.id === routes[0].line_id)
                  if (line) setSelectedLines([line])
                }
                fitCoordinates(originCoord, { lat, lng })
              } else {
                setViewState(v => ({
                  ...v,
                  latitude: lat,
                  longitude: lng,
                  zoom: 14.5,
                  transitionDuration: 1000
                }))
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
            const line = lines.find(l => l.id === stop.line_id)
            const isTourist = (line as any)?.is_tourist
            const isFav = prefs.favStops.includes(stop.id)
            const stopColor = line?.color || '#B8C8E0'

            if (isTourist) {
              return (
                <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="bottom">
                  <div
                    onClick={() => setSelectedTouristStop(stop)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                      transform: 'scale(1)', transition: 'transform 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <div style={{
                      background: stopColor, color: 'white', fontSize: '9px', padding: '2px 5px',
                      borderRadius: '6px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.25)',
                      border: '1px solid white', whiteSpace: 'nowrap'
                    }}>
                      {stop.name}
                    </div>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%', background: stopColor,
                      border: '1.5px solid white', marginTop: '-2px', boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                    }} />
                  </div>
                </Marker>
              )
            }

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

          {/* Render Clubbing & Shopping Custom Markers */}
          {(activeMode === 'clubbing' || activeMode === 'shopping') && MOCK_PLACES
            .filter(place => place.city === selectedCity && place.type === activeMode)
            .map(place => (
              <Marker key={place.id} longitude={place.lng} latitude={place.lat} anchor="bottom">
                <div
                  onClick={() => setSelectedPlace(place)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
                    transform: 'scale(1)', transition: 'transform 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <div style={{
                    background: activeMode === 'clubbing' ? '#EC4899' : '#10B981',
                    color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '8px',
                    fontWeight: 'bold', boxShadow: '0 2px 6px rgba(0,0,0,0.3)', whiteSpace: 'nowrap',
                    border: '1.5px solid white'
                  }}>
                    {place.name}
                  </div>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: activeMode === 'clubbing' ? '#EC4899' : '#10B981',
                    border: '2px solid white', marginTop: '-3px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }} />
                </div>
              </Marker>
            ))
          }

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

          {/* Custom Station Alarm Pin Marker */}
          {alarmPinCoord && (
            <Marker longitude={alarmPinCoord.lng} latitude={alarmPinCoord.lat} anchor="bottom">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#F59E0B', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
                  Recordatorio
                </div>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50% 50% 50% 0',
                  background: '#F59E0B', transform: 'rotate(-45deg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.35)', border: '1.5px solid white'
                }}>
                  <Clock size={10} style={{ transform: 'rotate(45deg)', color: 'white' }} />
                </div>
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
                if (destCoord) {
                  setTravelRoute(solveRoute(coord, destCoord))
                  setSolvedRoutes(solveRoutes(coord, destCoord))
                }
              }}
              anchor="bottom"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#3B82F6', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>Origen</div>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50% 50% 50% 0',
                  background: '#3B82F6',
                  transform: 'rotate(-45deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                  border: '1.5px solid white'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                </div>
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
                if (originCoord) {
                  setTravelRoute(solveRoute(originCoord, coord))
                  setSolvedRoutes(solveRoutes(originCoord, coord))
                }
              }}
              anchor="bottom"
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#EF4444', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>Destino</div>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50% 50% 50% 0',
                  background: '#EF4444',
                  transform: 'rotate(-45deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                  border: '1.5px solid white'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                </div>
              </div>
            </Marker>
          )}

          {/* Travel Walking Dotted lines */}
          {showTravelPins && (activeTravelRoute || travelRoute) && originCoord && destCoord && (
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
                      [(activeTravelRoute || travelRoute).originStop.longitude, (activeTravelRoute || travelRoute).originStop.latitude]
                    ]
                  }
                },
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [(activeTravelRoute || travelRoute).destStop.longitude, (activeTravelRoute || travelRoute).destStop.latitude],
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
                darkMap={prefs.darkMap}
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
                activeAlarms={activeAlarms}
                onAddAlarm={(alarm) => setActiveAlarms(prev => [...prev, alarm])}
                onRemoveAlarm={(id) => setActiveAlarms(prev => prev.filter(a => a.id !== id))}
                originCoord={originCoord}
              />
            </Popup>
          )}

          {selectedPlace && (
            <Popup
              longitude={selectedPlace.lng}
              latitude={selectedPlace.lat}
              anchor="bottom"
              offset={28}
              closeButton={true}
              onClose={() => setSelectedPlace(null)}
            >
              <div style={{
                padding: '4px', maxWidth: '220px', fontFamily: 'DM Sans, sans-serif',
                color: prefs.darkMap ? 'white' : 'var(--text-primary)'
              }}>
                <h4 style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 4px 0' }}>{selectedPlace.name}</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 6px 0', lineHeight: '1.4' }}>{selectedPlace.description}</p>
                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#F59E0B' }}>⭐ {selectedPlace.rating} / 5.0</div>
              </div>
            </Popup>
          )}

          {selectedTouristStop && (
            <Popup
              longitude={selectedTouristStop.longitude}
              latitude={selectedTouristStop.latitude}
              anchor="bottom"
              offset={24}
              closeButton={true}
              onClose={() => setSelectedTouristStop(null)}
            >
              <div style={{
                padding: '4px', maxWidth: '240px', fontFamily: 'DM Sans, sans-serif',
                color: prefs.darkMap ? 'white' : 'var(--text-primary)'
              }}>
                <h4 style={{ fontWeight: 'bold', fontSize: '13px', margin: '0 0 4px 0' }}>{selectedTouristStop.name}</h4>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 6px 0', lineHeight: '1.4' }}>
                  {TOURIST_STOP_DESCRIPTIONS[selectedTouristStop.id] || 'Parada turística de la ciudad.'}
                </p>
                <span style={{ fontSize: '9px', textTransform: 'uppercase', fontFamily: 'DM Mono', color: '#F59E0B', fontWeight: 'bold' }}>
                  📍 Parada de Bus Turístico
                </span>
              </div>
            </Popup>
          )}
        </Map>

        {/* Route Duration Overlay */}
        {solvedRoutes.length > 0 && originCoord && destCoord && !activeTravelRoute && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '70px' : '20px',
            left: '14px',
            zIndex: 10,
            width: '260px',
            background: prefs.darkMap ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            padding: '10px 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', fontFamily: 'DM Mono', letterSpacing: '0.04em' }}>
              ⏱️ Tiempos de Viaje
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {solvedRoutes.map((route: any) => {
                const routeTime = calculateRouteTimeMinutes(route, allLines)
                const isSelected = selectedLines.some(l => l.id === route.line_id)
                return (
                  <div
                    key={route.line_id}
                    onClick={() => {
                      setActiveTravelRoute(route)
                      const line = allLines.find(l => l.id === route.line_id)
                      if (line) {
                        setSelectedLines([line])
                      }
                      toast.success(`Siguiendo recorrido de Línea ${route.line_number}`)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                      background: isSelected ? 'rgba(34,211,160,0.08)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(34,211,160,0.3)' : 'transparent'}`,
                      transition: 'all 150ms'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: route.color, color: 'white', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800
                      }}>
                        {route.line_number}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {route.originStop.name.split(',')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ~{routeTime} min
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Custom Station Timer Alarm Config Card */}
        {alarmPinCoord && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '70px' : '20px',
            right: '64px',
            zIndex: 100,
            width: '280px',
            background: prefs.darkMap ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', fontFamily: 'DM Mono', letterSpacing: '0.04em' }}>
                🔔 Configurar Recordatorio
              </span>
              <button
                onClick={() => {
                  setAlarmPinCoord(null)
                  setAlarmSelectedLineId(null)
                }}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>

            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
              Te avisaremos cuando el colectivo que elijas esté por llegar a este punto exacto.
            </p>

            {(() => {
              const activeLines = lines.length > 0 ? lines : MOCK_LINES
              const nearbyLines = activeLines.filter(line => {
                const stops = getMockStopsForLine(line)
                return stops.some(s => distanceKm({ latitude: s.latitude, longitude: s.longitude }, alarmPinCoord) < 2.0)
              })
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>LÍNEA CERCANA:</span>
                    {nearbyLines.length > 0 ? (
                      <select
                        value={alarmSelectedLineId || nearbyLines[0].id}
                        onChange={e => setAlarmSelectedLineId(e.target.value)}
                        style={{
                          width: '100%',
                          background: prefs.darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          color: 'var(--text-primary)',
                          border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '8px', fontSize: '12px', padding: '6px 8px', outline: 'none'
                        }}
                      >
                        {nearbyLines.map(line => (
                          <option key={line.id} value={line.id} style={{ background: prefs.darkMap ? '#0f172a' : '#ffffff', color: 'var(--text-primary)' }}>
                            Línea {line.line_number} ({line.name})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EF4444' }}>No hay líneas a menos de 2km de este punto.</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>MEDIR ALERTA POR:</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['minutes', 'blocks'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setAlarmThresholdType(type)
                            setAlarmThresholdValue(type === 'minutes' ? 5 : 3)
                          }}
                          style={{
                            flex: 1, padding: '5px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                            background: alarmThresholdType === type ? 'rgba(245,158,11,0.15)' : (prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                            border: `1px solid ${alarmThresholdType === type ? '#F59E0B' : 'transparent'}`,
                            color: alarmThresholdType === type ? '#F59E0B' : 'var(--text-secondary)', fontWeight: 600,
                            transition: 'all 150ms'
                          }}
                        >
                          {type === 'minutes' ? 'Minutos' : 'Cuadras'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>
                      Aviso a: <strong>{alarmThresholdValue} {alarmThresholdType === 'minutes' ? 'min' : 'cuadras'}</strong>
                    </span>
                    <input
                      type="range"
                      min={alarmThresholdType === 'minutes' ? 1 : 1}
                      max={alarmThresholdType === 'minutes' ? 15 : 10}
                      step="1"
                      value={alarmThresholdValue}
                      onChange={e => setAlarmThresholdValue(parseInt(e.target.value))}
                      style={{ width: '100px', accentColor: '#F59E0B' }}
                    />
                  </div>

                  {nearbyLines.length > 0 && (
                    <button
                      onClick={() => {
                        const targetLine = nearbyLines.find(l => l.id === alarmSelectedLineId) || nearbyLines[0]
                        const alarm = {
                          id: `alarm-stop-${targetLine.id}-${Date.now()}`,
                          type: 'stop_alarm',
                          lineId: targetLine.id,
                          coord: alarmPinCoord,
                          thresholdType: alarmThresholdType,
                          thresholdValue: alarmThresholdValue
                        }
                        setActiveAlarms(prev => [...prev, alarm])
                        toast.success(`Recordatorio fijado para Línea ${targetLine.line_number} a ${alarmThresholdValue} ${alarmThresholdType === 'minutes' ? 'minutos' : 'cuadras'}`)
                        setAlarmPinCoord(null)
                        setAlarmSelectedLineId(null)
                      }}
                      style={{
                        width: '100%', padding: '8px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)',
                        marginTop: '4px'
                      }}
                    >
                      Establecer Recordatorio
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Upcoming Bus Overlay Card */}
        {activeTravelRoute && (
          <div style={{
            position: 'absolute',
            bottom: isMobile ? '80px' : '20px',
            left: '14px',
            right: '14px',
            margin: '0 auto',
            maxWidth: '380px',
            zIndex: 100,
            background: prefs.darkMap ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeTravelRoute.color }} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Línea {activeTravelRoute.line_number} en Ruta
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveTravelRoute(null)
                  setTrackedBusId(null)
                }}
                style={{
                  background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Volver
              </button>
            </div>

            {(() => {
              const { upcoming, nextBus, upcomingDist, nextDist } = getUpcomingBusesForRoute(activeTravelRoute)
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcoming ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: prefs.darkMap ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Próximo colectivo</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Interno {upcoming.bus_unit}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arribo estimado</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                            {Math.ceil(upcomingDist / 1000 / (upcoming.speed_kmh > 2 ? upcoming.speed_kmh / 60 : 0.3))} min
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: prefs.darkMap ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)', paddingTop: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Distancia: {Math.round(upcomingDist)} metros
                        </span>
                        <button
                          onClick={() => {
                            setTrackedBusId(upcoming.id)
                            setViewState(v => ({
                              ...v,
                              latitude: upcoming.latitude,
                              longitude: upcoming.longitude,
                              zoom: 15.5,
                              transitionDuration: 1000
                            }))
                            toast.success(`Siguiendo Interno ${upcoming.bus_unit} en tiempo real`)
                          }}
                          style={{
                            background: trackedBusId === upcoming.id ? '#10B981' : 'rgba(34,211,160,0.12)',
                            color: trackedBusId === upcoming.id ? 'white' : '#10B981',
                            border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          <Activity size={10} />
                          <span>{trackedBusId === upcoming.id ? 'Siguiendo...' : 'Ver en tiempo real'}</span>
                        </button>
                      </div>

                      {/* Boarding/Leaving controls */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        marginTop: '8px',
                        borderTop: prefs.darkMap ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
                        paddingTop: '8px'
                      }}>
                        {!userBoardedBus ? (
                          <button
                            onClick={() => {
                              setUserBoardedBus(true)
                              setTrackedBusId(upcoming.id)
                              setViewState(v => ({
                                ...v,
                                latitude: upcoming.latitude,
                                longitude: upcoming.longitude,
                                zoom: 16,
                                transitionDuration: 1000
                              }))
                              toast.success(`🚶‍♂️ ¡Viaje iniciado! Siguiendo tu recorrido a bordo del Interno ${upcoming.bus_unit}`)
                            }}
                            style={{
                              flex: 1, padding: '8px', borderRadius: '8px', background: '#3B82F6', color: 'white',
                              border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center', gap: '4px'
                            }}
                          >
                            🚌 Ya subí al colectivo
                          </button>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10B981', fontWeight: 700 }}>
                              🟢 Viajando a bordo del Interno {upcoming.bus_unit}
                            </div>
                            {showGotOffPrompt && (
                              <div style={{
                                padding: '6px 8px', borderRadius: '6px', background: 'rgba(245,158,11,0.1)',
                                border: '1px solid rgba(245,158,11,0.2)', fontSize: '10px', color: '#D97706', fontWeight: 500
                              }}>
                                🏁 ¿Llegaste a tu parada de destino?
                              </div>
                            )}
                            <button
                              onClick={() => {
                                setUserBoardedBus(false)
                                setShowGotOffPrompt(false)
                                setTrackedBusId(null)
                                setActiveTravelRoute(null)
                                toast.success("✨ ¡Viaje terminado! Gracias por viajar con TuBus.")
                              }}
                              style={{
                                width: '100%', padding: '8px', borderRadius: '8px',
                                background: showGotOffPrompt ? '#EF4444' : '#F59E0B', color: 'white',
                                border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                              }}
                            >
                              🛑 Ya me bajé del colectivo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      No hay unidades aproximándose en este momento.
                    </div>
                  )}

                  {nextBus && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '8px', border: prefs.darkMap ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          fontSize: '10px', color: 'var(--text-muted)' }}>Siguiente colectivo</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Interno {nextBus.bus_unit}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Distancia</span>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {Math.round(nextDist)} metros
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Save Trip Button */}
                  <div style={{ display: 'flex', gap: '8px', width: '100%', borderTop: prefs.darkMap ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)', paddingTop: '8px' }}>
                    <button
                      onClick={() => {
                        const isSaved = (prefs.savedTrips || []).some((t: any) => 
                          t.line_id === activeTravelRoute.line_id && 
                          t.originStop.id === activeTravelRoute.originStop.id && 
                          t.destStop.id === activeTravelRoute.destStop.id
                        )
                        if (isSaved) {
                          const nextTrips = (prefs.savedTrips || []).filter((t: any) => 
                            !(t.line_id === activeTravelRoute.line_id && 
                              t.originStop.id === activeTravelRoute.originStop.id && 
                              t.destStop.id === activeTravelRoute.destStop.id)
                          )
                          updatePrefs({ savedTrips: nextTrips })
                          toast.success("Recorrido eliminado de favoritos")
                        } else {
                          const newTrip = {
                            id: `trip-${Date.now()}`,
                            line_id: activeTravelRoute.line_id,
                            line_number: activeTravelRoute.line_number,
                            color: activeTravelRoute.color,
                            direction: activeTravelRoute.direction,
                            originStop: activeTravelRoute.originStop,
                            destStop: activeTravelRoute.destStop,
                            originName: originInput || activeTravelRoute.originStop.name,
                            destName: destInput || activeTravelRoute.destStop.name
                          }
                          updatePrefs({ savedTrips: [...(prefs.savedTrips || []), newTrip] })
                          toast.success("¡Recorrido guardado en favoritos!")
                        }
                      }}
                      style={{
                        flex: 1, padding: '8px 12px', borderRadius: '8px',
                        background: (prefs.savedTrips || []).some((t: any) => 
                          t.line_id === activeTravelRoute.line_id && 
                          t.originStop.id === activeTravelRoute.originStop.id && 
                          t.destStop.id === activeTravelRoute.destStop.id
                        ) ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
                        color: (prefs.savedTrips || []).some((t: any) => 
                          t.line_id === activeTravelRoute.line_id && 
                          t.originStop.id === activeTravelRoute.originStop.id && 
                          t.destStop.id === activeTravelRoute.destStop.id
                        ) ? '#10B981' : '#D97706',
                        border: 'none', fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                      }}
                    >
                      <Star size={12} style={{ fill: (prefs.savedTrips || []).some((t: any) => 
                        t.line_id === activeTravelRoute.line_id && 
                        t.originStop.id === activeTravelRoute.originStop.id && 
                        t.destStop.id === activeTravelRoute.destStop.id
                      ) ? 'currentColor' : 'none' }} />
                      <span>
                        {(prefs.savedTrips || []).some((t: any) => 
                          t.line_id === activeTravelRoute.line_id && 
                          t.originStop.id === activeTravelRoute.originStop.id && 
                          t.destStop.id === activeTravelRoute.destStop.id
                        ) ? 'Recorrido guardado' : 'Guardar recorrido'}
                      </span>
                    </button>
                  </div>

                  {/* Alternative lines selector */}
                  {solvedRoutes.length > 1 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', gap: '4px',
                      borderTop: prefs.darkMap ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)',
                      paddingTop: '8px'
                    }}>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'DM Mono', fontWeight: 700 }}>LÍNEAS ALTERNATIVAS PARA ESTE RECORRIDO:</span>
                      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: '2px' }}>
                        {solvedRoutes.map((r: any) => {
                          const isCurrent = r.line_id === activeTravelRoute.line_id
                          if (isCurrent) return null // Only show alternative paths
                          return (
                            <button
                              key={r.line_id}
                              onClick={() => {
                                setActiveTravelRoute(r)
                                const line = allLines.find(l => l.id === r.line_id)
                                if (line) setSelectedLines([line])
                                setTrackedBusId(null)
                                setUserBoardedBus(false)
                                setShowGotOffPrompt(false)
                                toast.success(`Cambiando a Línea ${r.line_number}`)
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '12px',
                                background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                                border: `1.5px solid ${r.color}`, color: 'var(--text-primary)',
                                fontSize: '10px', fontWeight: 700, cursor: 'pointer', flexShrink: 0
                              }}
                            >
                              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: r.color }} />
                              Línea {r.line_number}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

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
                  boxShadow: prefs.darkMap ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.06)',
                  border: prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.08)',
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

        {/* ── STACKED HEADER CONTROLS (Safe Area & Notch Compliant) ── */}
        {selectedLines.length > 0 && activePanel === 'map' && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 12,
            paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
            paddingLeft: '14px',
            paddingRight: '14px',
            paddingBottom: '12px',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
          }}>
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              style={{
                pointerEvents: 'auto',
                width: '100%',
                maxWidth: isMobile ? '480px' : '640px',
                background: prefs.darkMap ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
                borderRadius: '16px',
                padding: '12px 16px',
                boxShadow: prefs.darkMap ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              {/* Line info header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    background: selectedLines[0].color, flexShrink: 0
                  }} />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedLines[0].name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {selectedLines[0].company}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Star/Fav */}
                  <button
                    onClick={() => updatePrefs({
                      favBusLines: prefs.favBusLines.includes(selectedLines[0].id)
                        ? prefs.favBusLines.filter(id => id !== selectedLines[0].id)
                        : [...prefs.favBusLines, selectedLines[0].id]
                    })}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: prefs.darkMap ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                      border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                    }}
                  >
                    <Star size={14} style={{
                      color: prefs.favBusLines.includes(selectedLines[0].id) ? '#F59E0B' : 'var(--text-muted)',
                      fill: prefs.favBusLines.includes(selectedLines[0].id) ? '#F59E0B' : 'none'
                    }} />
                  </button>

                  {/* Close/Cancel */}
                  <button
                    onClick={() => {
                      setSelectedLines([])
                      setTrackedBusId(null)
                      setDirectionFilter('all')
                      setBranchFilter('all')
                    }}
                    style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: '#EF444415', border: 'none', color: '#EF4444',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 'bold'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}

        {/* ── MOBILE UBER-STYLE DRAWER ── */}
        {isMobile && selectedLines.length === 0 && activePanel === 'map' && (
          <motion.div
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={drawerState === 'expanded' ? { top: 0, bottom: 400 } : { top: -400, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(event, info) => {
              if (info.offset.y > 60) {
                if (drawerState === 'expanded') setDrawerState('half')
              } else if (info.offset.y < -60) {
                if (drawerState === 'half') setDrawerState('expanded')
              }
            }}
            animate={{
              y: drawerState === 'expanded' ? 'calc(100% - 90%)' : 'calc(100% - 320px)'
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '90%',
              background: prefs.darkMap ? '#0f172a' : '#ffffff',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              boxShadow: '0 -8px 32px rgba(0,0,0,0.15)',
              zIndex: 11,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderTop: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              touchAction: 'none'
            }}
          >
            {/* Handle bar */}
            <div 
              onPointerDown={(e) => dragControls.start(e)}
              onClick={() => {
                setDrawerState(prev => prev === 'expanded' ? 'half' : 'expanded')
              }}
              style={{
                width: '100%',
                padding: '12px 0 10px 0',
                display: 'flex',
                justifyContent: 'center',
                cursor: 'ns-resize',
                flexShrink: 0
              }}
            >
              <div style={{ width: '40px', height: '5px', borderRadius: '3px', background: prefs.darkMap ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }} />
            </div>

            {/* Content wrapper */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '0 16px 20px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              touchAction: 'pan-y'
            }}>
              {renderDrawerContent()}
            </div>
          </motion.div>
        )}

        {/* ── DESKTOP UBER-STYLE PANEL ── */}
        {!isMobile && selectedLines.length === 0 && activePanel === 'map' && (
          <motion.div
            initial={{ x: -100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            style={{
              position: 'absolute',
              top: '74px',
              left: '14px',
              bottom: '14px',
              width: '380px',
              zIndex: 11,
              background: prefs.darkMap ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
              borderRadius: '16px',
              boxShadow: prefs.darkMap ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 25px rgba(0,0,0,0.08)',
              display: 'flex',
              flexDirection: 'column',
              padding: '16px',
              gap: '16px',
              overflowY: 'auto'
            }}
          >
            {renderDrawerContent()}
          </motion.div>
        )}
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



            {/* Custom Timer Alarm Button */}
            <button
              onClick={() => {
                setAlarmPinMode(prev => !prev)
                setAlarmPinCoord(null)
                setPinNearbyStopsMode(false)
                toast.success(alarmPinMode ? "Modo de alarma desactivado." : "Hacé click en el mapa para marcar tu parada para el recordatorio.")
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: alarmPinMode ? '#F59E0B' : (prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)'),
                border: alarmPinMode ? '1px solid #F59E0B' : (prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)'),
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: alarmPinMode ? 'white' : 'var(--text-primary)', transition: 'all 200ms'
              }}
              title="Recordatorio de Colectivo en Parada Personalizada"
            >
              <Clock size={16} />
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
                    onSelectTrip={trip => {
                      setOriginCoord({ lat: trip.originStop.latitude, lng: trip.originStop.longitude })
                      setDestCoord({ lat: trip.destStop.latitude, lng: trip.destStop.longitude })
                      setOriginInput(trip.originName)
                      setDestInput(trip.destName)
                      
                      const routes = solveRoutes(
                        { lat: trip.originStop.latitude, lng: trip.originStop.longitude },
                        { lat: trip.destStop.latitude, lng: trip.destStop.longitude }
                      )
                      setSolvedRoutes(routes)
                      setActiveTravelRoute(routes.find((r: any) => r.line_id === trip.line_id) || routes[0] || trip)
                      
                      const line = allLines.find(l => l.id === trip.line_id)
                      if (line) setSelectedLines([line])
                      
                      fitCoordinates(
                        { lat: trip.originStop.latitude, lng: trip.originStop.longitude },
                        { lat: trip.destStop.latitude, lng: trip.destStop.longitude }
                      )
                      setActivePanel('map')
                      setDrawerState('half')
                    }}
                  />
                )}
                {activePanel === 'settings' && (
                  <SettingsPanel
                    prefs={prefs}
                    onUpdatePrefs={updatePrefs}
                    showTraffic={showTraffic}
                    onToggleTraffic={(val) => {
                      if (val && selectedLines.length === 0) {
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
                        setShowTraffic(val)
                      }
                    }}
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
              darkMap={prefs.darkMap}
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
              darkMap={prefs.darkMap}
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
            <ReportModal bus={selectedBus} darkMap={prefs.darkMap} onClose={() => setShowReport(false)} />
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
function FavouritesPanel({ prefs, lines, buses, onSelectLine, onUpdatePrefs, onSelectBus, onSelectTrip }: {
  prefs: UserPrefs; lines: BusLine[]; buses: BusPosition[]
  onSelectLine: (l: BusLine) => void
  onUpdatePrefs: (p: Partial<UserPrefs>) => void
  onSelectBus: (b: BusPosition) => void
  onSelectTrip: (t: any) => void
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

      <SectionHeader icon={<Route size={13} />} title="Recorridos guardados" style={{ marginTop: '20px' }} />
      {!(prefs.savedTrips) || prefs.savedTrips.length === 0 ? (
        <EmptyHint text="Tocá 'Guardar recorrido' en la tarjeta de ruta para guardarlo" />
      ) : (
        prefs.savedTrips.map(trip => (
          <FavTripCard
            key={trip.id}
            trip={trip}
            onSelect={() => onSelectTrip(trip)}
            onRemove={() => onUpdatePrefs({ savedTrips: (prefs.savedTrips || []).filter(t => t.id !== trip.id) })}
          />
        ))
      )}

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
  onRestartOnboarding,
  showTraffic,
  onToggleTraffic
}: {
  prefs: UserPrefs
  onUpdatePrefs: (p: Partial<UserPrefs>) => void
  onRestartOnboarding?: () => void
  showTraffic: boolean
  onToggleTraffic: (val: boolean) => void
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
        <ToggleRow label="Tránsito en tiempo real" value={showTraffic} onChange={onToggleTraffic} />
        <Divider />
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

function FavTripCard({ trip, onSelect, onRemove }: { trip: any; onSelect: () => void; onRemove: () => void }) {
  return (
    <div onClick={onSelect} style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 13px', borderRadius: '13px', background: 'var(--base)', border: '1px solid var(--border)', marginBottom: '5px', cursor: 'pointer' }}>
      <Route size={13} style={{ color: trip.color, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>Línea {trip.line_number}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {trip.originName.split(',')[0]} → {trip.destName.split(',')[0]}
        </div>
      </div>
      <button onClick={e => { e.stopPropagation(); onRemove() }} style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
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
            {bus.passenger_count}
          </span>
        </div>
      )}
    </div>
  );
}


// ─── Mini popup ───────────────────────────────────────────────────────────────
function MiniPopup({
  bus,
  darkMap,
  onReport,
  isFavBus,
  isFavDriver,
  onToggleFavBus,
  onToggleFavDriver,
  activeAlarms,
  onAddAlarm,
  onRemoveAlarm,
  originCoord
}: {
  bus: BusPosition
  darkMap: boolean
  onReport: () => void
  isFavBus: boolean
  isFavDriver: boolean
  onToggleFavBus: () => void
  onToggleFavDriver: () => void
  activeAlarms: any[]
  onAddAlarm: (alarm: any) => void
  onRemoveAlarm: (id: string) => void
  originCoord: { lat: number; lng: number } | null
}) {
  const [popupTab, setPopupTab] = useState<'characteristics' | 'notifications'>('characteristics')
  const [thresholdType, setThresholdType] = useState<'minutes' | 'meters' | 'blocks'>('minutes')
  const [thresholdVal, setThresholdVal] = useState<number>(5)

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

  const hasAlarm = activeAlarms.some(a => a.type === 'bus_alarm' && a.busId === bus.id)
  const busAlarm = activeAlarms.find(a => a.type === 'bus_alarm' && a.busId === bus.id)

  return (
    <div style={{
      background: darkMap
        ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)',
      border: darkMap ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
      borderRadius: '16px',
      padding: '12px',
      color: darkMap ? 'white' : 'var(--text-primary)',
      width: '280px',
      boxShadow: darkMap
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
        : '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
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
        background: darkMap ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        border: darkMap ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
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
        <div style={{ fontWeight: 700, fontSize: '13px', color: darkMap ? '#F3F4F6' : 'var(--text-primary)' }}>
          Interno: {bus.bus_unit}
        </div>
        <div style={{ fontSize: '10px', color: '#EAB308', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span>👥 {bus.passenger_count} a bordo</span>
        </div>
      </div>

      <div style={{ color: darkMap ? '#9CA3AF' : 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>Chofer: <strong>{bus.driver_name}</strong></span>
        <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
      </div>

      {/* Tab toggles */}
      <div style={{ display: 'flex', borderBottom: darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)', marginBottom: '10px' }}>
        <button
          onClick={() => setPopupTab('characteristics')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', background: 'none',
            fontSize: '11px', fontWeight: popupTab === 'characteristics' ? 700 : 500,
            color: popupTab === 'characteristics' ? (darkMap ? '#FBBF24' : '#EAB308') : 'var(--text-muted)',
            borderBottom: popupTab === 'characteristics' ? `2px solid ${darkMap ? '#FBBF24' : '#EAB308'}` : 'none',
            cursor: 'pointer'
          }}
        >
          Características
        </button>
        <button
          onClick={() => setPopupTab('notifications')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', background: 'none',
            fontSize: '11px', fontWeight: popupTab === 'notifications' ? 700 : 500,
            color: popupTab === 'notifications' ? (darkMap ? '#FBBF24' : '#EAB308') : 'var(--text-muted)',
            borderBottom: popupTab === 'notifications' ? `2px solid ${darkMap ? '#FBBF24' : '#EAB308'}` : 'none',
            cursor: 'pointer'
          }}
        >
          Notificaciones
        </button>
      </div>

      {popupTab === 'characteristics' ? (
        /* Amenities Ticked & Unticked Grid */
        <div style={{
          background: darkMap ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          border: darkMap ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '10px',
          padding: '10px',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '11px',
          color: darkMap ? '#D1D5DB' : 'var(--text-primary)'
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
      ) : (
        /* Notifications config panel */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {hasAlarm ? (
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                🔔 Alarma activa
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Aviso cuando esté a menos de {busAlarm.thresholdValue} {busAlarm.thresholdType === 'minutes' ? 'minutos' : busAlarm.thresholdType === 'meters' ? 'metros' : 'cuadras'}.
              </div>
              <button
                onClick={() => {
                  onRemoveAlarm(busAlarm.id)
                  toast.success("Alarma desactivada.")
                }}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px',
                  padding: '4px', fontSize: '10px', color: '#EF4444', cursor: 'pointer', fontWeight: 600
                }}
              >
                Desactivar Alarma
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>DISTANCIA DE AVISO:</span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['minutes', 'meters', 'blocks'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setThresholdType(type)
                      setThresholdVal(type === 'minutes' ? 5 : type === 'meters' ? 500 : 3)
                    }}
                    style={{
                      flex: 1, padding: '4px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer',
                      background: thresholdType === type ? 'rgba(245,158,11,0.15)' : (darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      border: `1px solid ${thresholdType === type ? '#F59E0B' : 'transparent'}`,
                      color: thresholdType === type ? '#F59E0B' : 'var(--text-secondary)', fontWeight: 600
                    }}
                  >
                    {type === 'minutes' ? 'Min' : type === 'meters' ? 'Metros' : 'Cuadras'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>
                  Valor: <strong>{thresholdVal} {thresholdType === 'minutes' ? 'min' : thresholdType === 'meters' ? 'm' : 'cuadras'}</strong>
                </span>
                <input
                  type="range"
                  min={thresholdType === 'minutes' ? 1 : thresholdType === 'meters' ? 100 : 1}
                  max={thresholdType === 'minutes' ? 15 : thresholdType === 'meters' ? 1500 : 10}
                  step={thresholdType === 'meters' ? 100 : 1}
                  value={thresholdVal}
                  onChange={e => setThresholdVal(parseInt(e.target.value))}
                  style={{ width: '80px', accentColor: '#F59E0B' }}
                />
              </div>

              <button
                onClick={() => {
                  const alarm = {
                    id: `alarm-bus-${bus.id}-${Date.now()}`,
                    type: 'bus_alarm',
                    busId: bus.id,
                    stop: {
                      name: 'Tu ubicación',
                      latitude: originCoord?.lat ?? -34.6037,
                      longitude: originCoord?.lng ?? -58.4173
                    },
                    thresholdType,
                    thresholdValue: thresholdVal
                  }
                  onAddAlarm(alarm)
                  toast.success(`Alarma activada para el Interno ${bus.bus_unit}`)
                }}
                style={{
                  background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center'
                }}
              >
                Establecer Alarma
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', borderTop: darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '10px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onReport(); }}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: darkMap ? '#FCA5A5' : '#EF4444',
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
            background: isFavBus ? 'rgba(234, 179, 8, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'),
            border: `1px solid ${isFavBus ? 'rgba(234, 179, 8, 0.4)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')}`,
            color: isFavBus ? '#FBBF24' : (darkMap ? '#E5E7EB' : 'var(--text-primary)'),
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isFavBus ? 'rgba(234, 179, 8, 0.22)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isFavBus ? 'rgba(234, 179, 8, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'); }}
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
            background: isFavDriver ? 'rgba(236, 72, 153, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'),
            border: `1px solid ${isFavDriver ? 'rgba(236, 72, 153, 0.4)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')}`,
            color: isFavDriver ? '#F472B6' : (darkMap ? '#E5E7EB' : 'var(--text-primary)'),
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isFavDriver ? 'rgba(236, 72, 153, 0.22)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isFavDriver ? 'rgba(236, 72, 153, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'); }}
        >
          <Heart size={11} style={{ fill: isFavDriver ? '#F472B6' : 'none' }} />
          Chofer
        </button>
      </div>
    </div>
  )
}
