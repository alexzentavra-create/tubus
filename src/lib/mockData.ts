// src/lib/mockData.ts
import type { BusLine, BusStop, BusPosition } from '@/types'
import { OFFICIAL_ROUTES } from './officialRoutes'
import type { OfficialRoute, RoutePoint } from './routeTypes'

export const MOCK_LINES: BusLine[] = [
  { id: 'line-1',   line_number: '12',  name: 'Línea 12 - Once / Villa Urquiza',        color: '#EF4444', company: 'Transportes Callao S.A.', total_stops: 10, is_active: true },
  { id: 'line-28',  line_number: '28',  name: 'Línea 28 - Retiro / Puente La Noria',    color: '#16A34A', company: 'DOTA S.A.',        total_stops: 8,  is_active: true },
  { id: 'line-3',   line_number: '37',  name: 'Línea 37 - Aeropuerto / Centro',         color: '#15803D', company: '4 de Septiembre S.A.', total_stops: 8,  is_active: true },
  { id: 'line-60',  line_number: '60',  name: 'Línea 60 - Constitución / Tigre',        color: '#EAB308', company: 'MONSA S.A.',       total_stops: 9,  is_active: true },
  { id: 'line-152', line_number: '152', name: 'Línea 152 - La Boca / Olivos',          color: '#1D4ED8', company: 'Empresa Tandilense S.A.', total_stops: 11, is_active: true },
]

// Real Buenos Aires street coordinates for each line
export const MOCK_STOPS: Record<string, BusStop[]> = {
  // Line 12: Once → Corrientes → Santa Fe → Las Heras → Villa Urquiza
  'line-1': [
    { id: 'l1-s1',  line_id: 'line-1', name: 'Once - Pueyrredón',        street_name: 'Av. Pueyrredón y Corrientes',  stop_number: 1,  latitude: -34.6082, longitude: -58.4093, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 380 },
    { id: 'l1-s2',  line_id: 'line-1', name: 'Corrientes y Agüero',      street_name: 'Av. Corrientes 3400',          stop_number: 2,  latitude: -34.6052, longitude: -58.4050, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 310 },
    { id: 'l1-s3',  line_id: 'line-1', name: 'Corrientes y Callao',      street_name: 'Av. Corrientes 1900',          stop_number: 3,  latitude: -34.6042, longitude: -58.3945, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 290 },
    { id: 'l1-s4',  line_id: 'line-1', name: 'Santa Fe y Pueyrredón',    street_name: 'Av. Santa Fe 2500',            stop_number: 4,  latitude: -34.5990, longitude: -58.4000, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 260 },
    { id: 'l1-s5',  line_id: 'line-1', name: 'Santa Fe y Coronel Díaz',  street_name: 'Av. Santa Fe 3300',            stop_number: 5,  latitude: -34.5960, longitude: -58.4062, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 220 },
    { id: 'l1-s6',  line_id: 'line-1', name: 'Las Heras y Coronel Díaz', street_name: 'Av. Las Heras 3000',           stop_number: 6,  latitude: -34.5890, longitude: -58.4070, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 185 },
    { id: 'l1-s7',  line_id: 'line-1', name: 'Libertador y Olleros',     street_name: 'Av. del Libertador 3500',      stop_number: 7,  latitude: -34.5760, longitude: -58.4330, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 150 },
    { id: 'l1-s8',  line_id: 'line-1', name: 'Cabildo y Juramento',      street_name: 'Av. Cabildo 1500',             stop_number: 8,  latitude: -34.5660, longitude: -58.4530, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 190 },
    { id: 'l1-s9',  line_id: 'line-1', name: 'Triunvirato y Monroe',     street_name: 'Av. Triunvirato 4600',         stop_number: 9,  latitude: -34.5620, longitude: -58.4730, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 140 },
    { id: 'l1-s10', line_id: 'line-1', name: 'Villa Urquiza - Final',    street_name: 'Av. Balbín 4200',              stop_number: 10, latitude: -34.5580, longitude: -58.4890, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 100 },
  ],
  // Line 24: Obelisco → Palermo → Villa del Parque
  'line-2': [
    { id: 'l2-s1',  line_id: 'line-2', name: 'Obelisco',                 street_name: 'Av. 9 de Julio y Corrientes', stop_number: 1,  latitude: -34.6037, longitude: -58.3816, direction: 'ida', avg_wait_minutes: 4, total_daily_users: 450 },
    { id: 'l2-s2',  line_id: 'line-2', name: 'Santa Fe y Callao',        street_name: 'Av. Santa Fe 1600',           stop_number: 2,  latitude: -34.5972, longitude: -58.3930, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 370 },
    { id: 'l2-s3',  line_id: 'line-2', name: 'Palermo - Santa Fe',       street_name: 'Av. Santa Fe 3600',           stop_number: 3,  latitude: -34.5943, longitude: -58.4125, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 310 },
    { id: 'l2-s4',  line_id: 'line-2', name: 'Scalabrini Ortiz',         street_name: 'Av. Santa Fe 4100',           stop_number: 4,  latitude: -34.5925, longitude: -58.4218, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 270 },
    { id: 'l2-s5',  line_id: 'line-2', name: 'Juan B. Justo',            street_name: 'Av. Juan B. Justo 2500',      stop_number: 5,  latitude: -34.5973, longitude: -58.4350, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 240 },
    { id: 'l2-s6',  line_id: 'line-2', name: 'Rivadavia y Nazca',        street_name: 'Av. Rivadavia 6400',          stop_number: 6,  latitude: -34.6072, longitude: -58.4460, direction: 'ida', avg_wait_minutes: 7, total_daily_users: 200 },
    { id: 'l2-s7',  line_id: 'line-2', name: 'San Martín y Gavilán',     street_name: 'Av. San Martín 4500',         stop_number: 7,  latitude: -34.6080, longitude: -58.4530, direction: 'ida', avg_wait_minutes: 8, total_daily_users: 160 },
    { id: 'l2-s8',  line_id: 'line-2', name: 'Villa del Parque Centro',  street_name: 'Av. San Martín 4900',         stop_number: 8,  latitude: -34.6068, longitude: -58.4610, direction: 'ida', avg_wait_minutes: 8, total_daily_users: 130 },
    { id: 'l2-s9',  line_id: 'line-2', name: 'Nogoyá y Barzana',         street_name: 'Nogoyá 3500',                 stop_number: 9,  latitude: -34.6050, longitude: -58.4680, direction: 'ida', avg_wait_minutes: 9, total_daily_users: 100 },
    { id: 'l2-s10', line_id: 'line-2', name: 'Villa del Parque - Final', street_name: 'Avenida de los Constituyentes 3200', stop_number: 10, latitude: -34.6035, longitude: -58.4750, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 80 },
  ],
  // Line 37: Aeroparque → Palermo → Monserrat
  'line-3': [
    { id: 'l3-s1',  line_id: 'line-3', name: 'Aeroparque',               street_name: 'Av. Costanera Rafael Obligado', stop_number: 1, latitude: -34.5593, longitude: -58.4156, direction: 'ida', avg_wait_minutes: 12, total_daily_users: 200 },
    { id: 'l3-s2',  line_id: 'line-3', name: 'Lugones y Libertador',     street_name: 'Av. Lugones 3500',            stop_number: 2,  latitude: -34.5705, longitude: -58.4320, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 160 },
    { id: 'l3-s3',  line_id: 'line-3', name: 'Libertador y Bullrich',    street_name: 'Av. del Libertador 2800',     stop_number: 3,  latitude: -34.5780, longitude: -58.4280, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 180 },
    { id: 'l3-s4',  line_id: 'line-3', name: 'Córdoba y Pueyrredón',     street_name: 'Av. Córdoba 2200',            stop_number: 4,  latitude: -34.5973, longitude: -58.3982, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 230 },
    { id: 'l3-s5',  line_id: 'line-3', name: 'Callao y Corrientes',      street_name: 'Av. Callao 1200',             stop_number: 5,  latitude: -34.6042, longitude: -58.3940, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 280 },
    { id: 'l3-s6',  line_id: 'line-3', name: 'Diagonal Norte',           street_name: 'Av. Roque Sáenz Peña 700',   stop_number: 6,  latitude: -34.6065, longitude: -58.3790, direction: 'ida', avg_wait_minutes: 4,  total_daily_users: 340 },
    { id: 'l3-s7',  line_id: 'line-3', name: 'Perú y Av. de Mayo',       street_name: 'Perú 700',                   stop_number: 7,  latitude: -34.6090, longitude: -58.3740, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 290 },
    { id: 'l3-s8',  line_id: 'line-3', name: 'Monserrat - Final',        street_name: 'Av. Belgrano 1000',           stop_number: 8,  latitude: -34.6130, longitude: -58.3720, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 200 },
  ],
}

// ─── Simulator ────────────────────────────────────────────────────────────────
interface MockBusState {
  bus: BusPosition
  stopIndex: number
  progress: number                 // 0–1 between current and next stop
  direction: 1 | -1
  pauseUntil: number               // ms timestamp; 0 = moving
  speedKmh: number                 // dynamic current speed
  baseSpeedKmh: number             // base target speed
  branchId: string | null          // branch key (e.g. '60' or '60-B' or null)
  trafficLightPauseUntil: number   // ms timestamp for red light
}

// Module-level mutable state — one entry per bus
const STATE: Map<string, MockBusState> = new Map()
let lastTick = 0

function officialRouteForLine(line: BusLine): OfficialRoute | null {
  return OFFICIAL_ROUTES[line.line_number.replace(/^0+/, '')] || null
}

function routeTemplateForLine(line: BusLine): BusStop[] {
  const officialRoute = officialRouteForLine(line)
  if (officialRoute) {
    return officialRoute.stops.map((stop, index) => ({
      id: `${line.id}-official-${stop.id}`,
      line_id: line.id,
      name: stop.name,
      street_name: stop.name,
      stop_number: index + 1,
      latitude: stop.lat,
      longitude: stop.lng,
      direction: 'ida',
      avg_wait_minutes: 6,
      total_daily_users: 120,
    }))
  }

  const directStops = MOCK_STOPS[line.id]
  if (directStops?.length) return directStops

  return MOCK_STOPS[MOCK_LINES[0].id]
}

export function getMockStopsForLine(line: BusLine): BusStop[] {
  if (line.line_number === '60') {
    const routeA = OFFICIAL_ROUTES['60']
    const routeB = OFFICIAL_ROUTES['60-B']
    const stopsA = (routeA?.stops || []).map((stop, index) => ({
      id: `${line.id}-official-${stop.id}`,
      line_id: line.id,
      name: stop.name,
      street_name: 'Recorrido Ramal A (Tigre)',
      stop_number: index + 1,
      latitude: stop.lat,
      longitude: stop.lng,
      direction: 'ida' as const,
      avg_wait_minutes: 5,
      total_daily_users: 150,
    }))
    const stopsB = (routeB?.stops || []).map((stop, index) => ({
      id: `${line.id}-official-${stop.id}`,
      line_id: line.id,
      name: stop.name,
      street_name: 'Recorrido Ramal B (Escobar)',
      stop_number: index + 1,
      latitude: stop.lat,
      longitude: stop.lng,
      direction: 'ida' as const,
      avg_wait_minutes: 7,
      total_daily_users: 100,
    }))
    
    // Merge stops with exact same coordinates
    const uniqueStops: BusStop[] = []
    const coords = new Set<string>()
    ;[...stopsA, ...stopsB].forEach(s => {
      const key = `${s.latitude.toFixed(4)},${s.longitude.toFixed(4)}`
      if (!coords.has(key)) {
        coords.add(key)
        uniqueStops.push(s)
      }
    })
    return uniqueStops
  }
  return routeTemplateForLine(line).map(stop => ({
    ...stop,
    id: `${line.id}-${stop.id}`,
    line_id: line.id,
  }))
}

function getMockStopsForBus(bus: BusPosition): BusStop[] {
  const line = MOCK_LINES.find(l => l.id === bus.line_id) || {
    id: bus.line_id,
    line_number: bus.line_number,
    name: `Linea ${bus.line_number}`,
    color: '#EF4444',
    company: 'Simulacion',
    total_stops: 0,
    is_active: true,
  }

  return getMockStopsForLine(line)
}

function getRoutePathForLine(line: BusLine): RoutePoint[] {
  const officialRoute = officialRouteForLine(line)
  if (officialRoute?.path.length) return officialRoute.path

  return getMockStopsForLine(line).map(stop => ({
    lat: stop.latitude,
    lng: stop.longitude,
  }))
}

export function getMockRoutePathForLine(line: BusLine): RoutePoint[] {
  return getRoutePathForLine(line)
}

// Support multiple paths for branches (like Line 60)
export function getMockRoutePathsForLine(line: BusLine): RoutePoint[][] {
  if (line.line_number === '60') {
    return [
      OFFICIAL_ROUTES['60']?.path || [],
      OFFICIAL_ROUTES['60-B']?.path || []
    ]
  }
  return [getRoutePathForLine(line)]
}

function getRoutePathForBus(bus: BusPosition): RoutePoint[] {
  const line = MOCK_LINES.find(l => l.id === bus.line_id) || {
    id: bus.line_id,
    line_number: bus.line_number,
    name: `Linea ${bus.line_number}`,
    color: '#EF4444',
    company: 'Simulacion',
    total_stops: 0,
    is_active: true,
  }

  return getRoutePathForLine(line)
}

function distanceKm(a: RoutePoint, b: RoutePoint): number {
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const dLat = lat2 - lat1
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

function nearestStopAhead(stops: BusStop[], path: RoutePoint[], pathIndex: number, direction: 1 | -1): BusStop | null {
  if (stops.length === 0) return null

  const projectedStops = stops.map(stop => {
    let bestIndex = 0
    let bestDistance = Infinity
    path.forEach((point, index) => {
      const distance = distanceKm(point, { lat: stop.latitude, lng: stop.longitude })
      if (distance < bestDistance) {
        bestIndex = index
        bestDistance = distance
      }
    })
    return { stop, pathIndex: bestIndex }
  })

  return direction === 1
    ? projectedStops.find(item => item.pathIndex > pathIndex)?.stop || stops[stops.length - 1]
    : [...projectedStops].reverse().find(item => item.pathIndex < pathIndex)?.stop || stops[0]
}

function shouldPauseAtPathIndex(stops: BusStop[], path: RoutePoint[], pathIndex: number): boolean {
  const point = path[pathIndex]
  return stops.some((stop, index) => (
    distanceKm(point, { lat: stop.latitude, lng: stop.longitude }) < 0.035
  ))
}

function makeBus(line: BusLine, unitNum: number, totalBuses: number): MockBusState {
  const isLine60 = line.line_number === '60'
  const branchId = isLine60 ? (unitNum % 2 === 0 ? '60' : '60-B') : null
  
  let path: RoutePoint[] = []
  let stops: BusStop[] = []
  
  if (isLine60 && branchId) {
    const route = OFFICIAL_ROUTES[branchId]
    path = route.path
    stops = route.stops.map((stop, index) => ({
      id: `${line.id}-official-${stop.id}`,
      line_id: line.id,
      name: stop.name,
      street_name: stop.name,
      stop_number: index + 1,
      latitude: stop.lat,
      longitude: stop.lng,
      direction: 'ida',
      avg_wait_minutes: 6,
      total_daily_users: 120,
    }))
  } else {
    stops = getMockStopsForLine(line)
    path = getRoutePathForLine(line)
  }
  
  const fraction = unitNum / totalBuses
  const pathIndex = Math.min(Math.floor(path.length * fraction), path.length - 2)
  const point = path[pathIndex]
  const nextStop = nearestStopAhead(stops, path, pathIndex, 1) || stops[0]
  
  const names = [
    'Carlos Gómez', 'María Torres', 'Roberto Silva', 'Ana Martínez', 
    'Luis Fernández', 'Jorge Rodríguez', 'Laura Gómez', 'Daniel Díaz', 
    'Miguel Angel', 'Gabriela Paz', 'Francisco Solano'
  ]
  const speedKmh = 18 + (unitNum * 5) % 15
  
  const ramal = isLine60 ? (branchId === '60' ? 'A' : 'B') : undefined
  const reports_count = (unitNum % 3 === 0) ? 0 : (unitNum % 3 === 1 ? 1 : 2)

  const bus: BusPosition = {
    id:              `mock-${line.id}-${unitNum}`,
    driver_id:       `mock-driver-${line.id}-${unitNum}`,
    line_id:         line.id,
    line_number:     line.line_number,
    bus_unit:        `${line.line_number}-${String(unitNum).padStart(3, '0')}`,
    driver_name:     names[unitNum % names.length],
    latitude:        point.lat,
    longitude:       point.lng,
    heading:         0,
    speed_kmh:       0,
    next_stop_id:    nextStop.id,
    next_stop_name:  nextStop.name,
    eta_minutes:     2,
    status:          'at_stop',
    passenger_count: Math.floor(Math.random() * 22) + 6,
    timestamp:       new Date().toISOString(),
    ramal,
    reports_count,
  }

  return {
    bus,
    stopIndex:    pathIndex,
    progress:    0,
    direction:   1,
    pauseUntil:  Date.now() + 1000 + unitNum * 1500,
    speedKmh,
    baseSpeedKmh: speedKmh,
    branchId,
    trafficLightPauseUntil: 0,
  }
}

export function initMockBuses(lines: BusLine[] = MOCK_LINES) {
  STATE.clear()
  lastTick = Date.now()

  lines.forEach(line => {
    const path = getRoutePathForLine(line)
    if (!path || path.length < 2) return
    const isLine12 = line.line_number === '12'
    const isLine60 = line.line_number === '60'
    const totalBuses = isLine12 ? 8 : (isLine60 ? 8 : 4)
    for (let i = 0; i < totalBuses; i++) {
      STATE.set(`${line.id}-${i}`, makeBus(line, i, totalBuses))
    }
  })
}

function heading(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dy = lat2 - lat1
  const dx = lng2 - lng1
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
}

export function tickMockBuses(): BusPosition[] {
  if (STATE.size === 0) initMockBuses()

  const now   = Date.now()
  const dt    = Math.min((now - lastTick) / 1000, 1.5) // clamp dt
  lastTick    = now

  const out: BusPosition[] = []

  STATE.forEach(s => {
    let stops: BusStop[] = []
    let path: RoutePoint[] = []

    if (s.branchId) {
      const route = OFFICIAL_ROUTES[s.branchId]
      path = route.path
      stops = route.stops.map((stop, index) => ({
        id: `${s.bus.line_id}-official-${stop.id}`,
        line_id: s.bus.line_id,
        name: stop.name,
        street_name: stop.name,
        stop_number: index + 1,
        latitude: stop.lat,
        longitude: stop.lng,
        direction: 'ida',
        avg_wait_minutes: 6,
        total_daily_users: 120,
      }))
    } else {
      stops = getMockStopsForBus(s.bus)
      path = getRoutePathForBus(s.bus)
    }

    if (!stops || stops.length < 2 || path.length < 2) return

    // ── Paused at stop ──
    if (s.pauseUntil > now) {
      s.bus.status    = 'at_stop'
      s.bus.speed_kmh = 0
      s.bus.timestamp = new Date().toISOString()
      out.push({ ...s.bus })
      return
    }

    // ── Paused at traffic light (red light simulation) ──
    if (s.trafficLightPauseUntil > now) {
      s.bus.status    = 'stopped'
      s.bus.speed_kmh = 0
      s.bus.timestamp = new Date().toISOString()
      out.push({ ...s.bus })
      return
    }

    // Dynamic Traffic Simulation: 0.6% chance per second to get stopped at traffic light
    if (Math.random() < 0.006 * dt) {
      s.trafficLightPauseUntil = now + (3000 + Math.random() * 7000) // stop for 3-10s
      s.bus.status    = 'stopped'
      s.bus.speed_kmh = 0
      s.bus.timestamp = new Date().toISOString()
      out.push({ ...s.bus })
      return
    }

    const curPoint = path[s.stopIndex]
    const nextIdx  = s.stopIndex + s.direction

    // Reached end of route → reverse
    if (nextIdx < 0 || nextIdx >= path.length) {
      s.direction  = s.direction === 1 ? -1 : 1
      s.pauseUntil = now + (3000 + Math.random() * 5000) // stop for 3-8s
      out.push({ ...s.bus })
      return
    }

    const nextPoint = path[nextIdx]
    const dLat   = nextPoint.lat - curPoint.lat
    const dLng   = nextPoint.lng - curPoint.lng
    const segmentKm = distanceKm(curPoint, nextPoint)

    // Dynamic speed variation (fluctuate around base speed)
    const currentSpeedKmh = Math.max(8, s.baseSpeedKmh + Math.sin(now / 3000) * 5 + (Math.random() * 2 - 1))
    s.speedKmh = currentSpeedKmh

    const step = segmentKm > 0 ? ((currentSpeedKmh / 3600) * dt) / segmentKm : 1
    s.progress = Math.min(s.progress + step, 1)

    // Interpolate position
    s.bus.latitude   = curPoint.lat + dLat * s.progress
    s.bus.longitude  = curPoint.lng + dLng * s.progress
    s.bus.heading    = heading(curPoint.lat, curPoint.lng, nextPoint.lat, nextPoint.lng)
    s.bus.speed_kmh  = Math.round(currentSpeedKmh)
    s.bus.status     = 'moving'
    
    const nextStop = nearestStopAhead(stops, path, s.stopIndex, s.direction)
    if (nextStop) {
      s.bus.next_stop_name = nextStop.name
      s.bus.next_stop_id   = nextStop.id
    }
    const remainingDist  = segmentKm * (1 - s.progress)
    s.bus.eta_minutes    = Math.max(1, Math.ceil(remainingDist / (currentSpeedKmh / 60)))
    s.bus.timestamp      = new Date().toISOString()

    if (s.progress >= 1) {
      s.stopIndex  = nextIdx
      s.progress   = 0
      s.bus.latitude   = nextPoint.lat
      s.bus.longitude  = nextPoint.lng

      // Arrived at a stop -> pause (random length up to 10 seconds)
      if (shouldPauseAtPathIndex(stops, path, nextIdx)) {
        s.bus.status     = 'at_stop'
        s.bus.speed_kmh  = 0
        s.bus.passenger_count = Math.max(2, s.bus.passenger_count + Math.floor(Math.random() * 8) - 3)
        s.pauseUntil = now + (3000 + Math.random() * 7000) // stop for 3-10s
      }
    }

    out.push({ ...s.bus })
  })

  return out
}

export function getMockBusesForLine(lineId: string): BusPosition[] {
  if (STATE.size === 0) initMockBuses()
  return Array.from(STATE.values())
    .filter(s => s.bus.line_id === lineId)
    .map(s => ({ ...s.bus }))
}

// Helper: bounding box of a line's stops (for map auto-fit)
export function getLineBounds(line: BusLine): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  const path = getRoutePathForLine(line)
  if (!path || path.length === 0) return null
  return {
    minLat: Math.min(...path.map(s => s.lat)),
    maxLat: Math.max(...path.map(s => s.lat)),
    minLng: Math.min(...path.map(s => s.lng)),
    maxLng: Math.max(...path.map(s => s.lng)),
  }
}

export const MOCK_ROUTES: Record<string, { name: string; direction: 'ida' | 'vuelta' }[]> = Object.fromEntries(
  MOCK_LINES.map(line => [
    line.id,
    (MOCK_STOPS[line.id] || []).map(s => ({ name: s.name, direction: s.direction }))
  ])
)
