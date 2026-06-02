// src/lib/mockData.ts
import type { BusLine, BusStop, BusPosition } from '@/types'
import { OFFICIAL_ROUTES } from './officialRoutes'
import type { OfficialRoute, RoutePoint } from './routeTypes'

export const MOCK_LINES: BusLine[] = [
  { id: 'line-1',   line_number: '12',  name: 'Línea 12 - Once / Villa Urquiza',        color: '#EF4444', company: 'Transportes Callao S.A.', total_stops: 10, is_active: true },
  { id: 'line-28',  line_number: '28',  name: 'Línea 28 - Retiro / Puente La Noria',    color: '#16A34A', company: 'DOTA S.A.',        total_stops: 8,  is_active: true },
  { id: 'line-3',   line_number: '37',  name: 'Línea 37 - Aeropuerto / Centro',         color: '#15803D', company: '4 de Septiembre S.A.', total_stops: 8,  is_active: true },
  { id: 'line-39',  line_number: '39',  name: 'Línea 39 - Chacarita / Barracas',        color: '#F97316', company: 'Transportes Santa Fe S.A.C.I.', total_stops: 10, is_active: true },
  { id: 'line-59',  line_number: '59',  name: 'Línea 59 - Estación Buenos Aires / San Isidro', color: '#10B981', company: 'Microomnibus Ciudad de Buenos Aires S.A.T.C.I.', total_stops: 12, is_active: true },
  { id: 'line-60',  line_number: '60',  name: 'Línea 60 - Constitución / Tigre',        color: '#EAB308', company: 'MONSA S.A.',       total_stops: 9,  is_active: true },
  { id: 'line-102', line_number: '102', name: 'Línea 102 - Palermo / Barracas',         color: '#3B82F6', company: 'Transportes Sargento Cabral S.C.', total_stops: 11, is_active: true },
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

export function getMockStopsForLine(line: BusLine, direction: 'all' | 'ida' | 'vuelta' = 'all'): BusStop[] {
  const getOutboundStops = () => {
    if (line.line_number === '60') {
      const routeA = OFFICIAL_ROUTES['60']
      const routeB = OFFICIAL_ROUTES['60-B']
      const stopsA = (routeA?.stops || []).map((stop, index) => ({
        id: `${line.id}-official-${stop.id}-ida`,
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
        id: `${line.id}-official-${stop.id}-ida`,
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
    const dir = (line.line_number === '37' || line.line_number === '28') ? 'vuelta' : 'ida'
    return routeTemplateForLine(line).map(stop => ({
      ...stop,
      id: `${line.id}-${stop.id}-ida`,
      line_id: line.id,
      direction: dir as 'ida' | 'vuelta',
    }))
  }

  const getInboundStops = () => {
    const outbound = getOutboundStops()
    return [...outbound].reverse().map((stop, index) => {
      let name = stop.name
      let lat = stop.latitude
      let lng = stop.longitude

      if (line.line_number === '12') {
        if (name.includes('CALLAO AV.')) {
          name = name.replace('CALLAO AV.', 'RIOBAMBA')
          lat = lat - 0.0008
          lng = lng - 0.0013
        } else if (name.includes('ENTRE RIOS AV.')) {
          name = name.replace('ENTRE RIOS AV.', 'COMBATE DE LOS POZOS')
          lat = lat - 0.0008
          lng = lng - 0.0013
        }
      }

      if (line.line_number === '37') {
        if (name.includes('RODRIGUEZ PE') || name.includes('RODRIGUEZ PE?A')) {
          name = name.replace(/RODRIGUEZ PE\?A|RODRIGUEZ PEÑA/, 'CALLAO AV.')
          lat = lat - 0.0008
          lng = lng - 0.0013
        } else if (name.includes('LAS HERAS')) {
          name = name.replace('LAS HERAS GENERAL AV.', 'SANTA FE AV.').replace('LAS HERAS', 'SANTA FE AV.')
          lat = lat - 0.0046
          lng = lng - 0.0045
        }
      }

      const dir = (line.line_number === '37' || line.line_number === '28') ? 'ida' : 'vuelta'
      return {
        ...stop,
        id: stop.id.replace('-ida', '-vuelta'),
        name,
        street_name: name,
        stop_number: index + 1,
        latitude: lat,
        longitude: lng,
        direction: dir as 'ida' | 'vuelta',
      }
    })
  }

  const isLine37or28 = line.line_number === '37' || line.line_number === '28'
  if (direction === 'ida') {
    return isLine37or28 ? getInboundStops() : getOutboundStops()
  } else if (direction === 'vuelta') {
    return isLine37or28 ? getOutboundStops() : getInboundStops()
  } else {
    return [...getOutboundStops(), ...getInboundStops()]
  }
}

function getMockStopsForBus(bus: BusPosition, direction?: 'ida' | 'vuelta'): BusStop[] {
  const line = MOCK_LINES.find(l => l.id === bus.line_id) || {
    id: bus.line_id,
    line_number: bus.line_number,
    name: `Linea ${bus.line_number}`,
    color: '#EF4444',
    company: 'Simulacion',
    total_stops: 0,
    is_active: true,
  }

  return getMockStopsForLine(line, direction)
}

function getRoutePathForLine(line: BusLine, direction: 'ida' | 'vuelta' = 'ida'): RoutePoint[] {
  const officialRoute = officialRouteForLine(line)
  let path: RoutePoint[] = []

  if (officialRoute?.path.length) {
    path = officialRoute.path
  } else {
    path = getMockStopsForLine(line, 'ida').map(stop => ({
      lat: stop.latitude,
      lng: stop.longitude,
    }))
  }

  const isLine37or28 = line.line_number === '37' || line.line_number === '28'
  const shouldReverse = isLine37or28 ? (direction === 'ida') : (direction === 'vuelta')

  if (shouldReverse) {
    const reversed = [...path].reverse()
    if (line.line_number === '12') {
      return reversed.map(p => {
        if (p.lat > -34.6240 && p.lat < -34.5950 && p.lng > -58.3950 && p.lng < -58.3910) {
          return {
            lat: p.lat - 0.0008,
            lng: p.lng - 0.0013
          }
        }
        return p
      })
    }
    if (line.line_number === '37') {
      return reversed.map(p => {
        if (p.lat > -34.6110 && p.lat < -34.5930 && p.lng > -58.3930 && p.lng < -58.3900) {
          return {
            lat: p.lat - 0.0008,
            lng: p.lng - 0.0013
          }
        }
        if (p.lat > -34.5930 && p.lat < -34.5800 && p.lng > -58.4220 && p.lng < -58.3910) {
          return {
            lat: p.lat - 0.0046,
            lng: p.lng - 0.0045
          }
        }
        return p
      })
    }
    return reversed
  }

  return path
}

export function getMockRoutePathForLine(line: BusLine, direction: 'ida' | 'vuelta' = 'ida'): RoutePoint[] {
  return getRoutePathForLine(line, direction)
}

// Support multiple paths for branches (like Line 60)
export function getMockRoutePathsForLine(line: BusLine, direction: 'all' | 'ida' | 'vuelta' = 'all'): RoutePoint[][] {
  if (line.line_number === '60') {
    return [
      OFFICIAL_ROUTES['60']?.path || [],
      OFFICIAL_ROUTES['60-B']?.path || []
    ]
  }
  if (direction === 'all') {
    return [
      getRoutePathForLine(line, 'ida'),
      getRoutePathForLine(line, 'vuelta')
    ]
  } else {
    return [getRoutePathForLine(line, direction)]
  }
}

function getRoutePathForBus(bus: BusPosition, direction: 'ida' | 'vuelta' = 'ida'): RoutePoint[] {
  const line = MOCK_LINES.find(l => l.id === bus.line_id) || {
    id: bus.line_id,
    line_number: bus.line_number,
    name: `Linea ${bus.line_number}`,
    color: '#EF4444',
    company: 'Simulacion',
    total_stops: 0,
    is_active: true,
  }

  return getRoutePathForLine(line, direction)
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

function shouldPauseAtPathIndex(stops: BusStop[], path: RoutePoint[], pathIndex: number, direction: 1 | -1 = 1, line_number?: string): boolean {
  let point = path[pathIndex]
  if (line_number === '12' && direction === -1) {
    if (point.lat > -34.6240 && point.lat < -34.5950 && point.lng > -58.3950 && point.lng < -58.3910) {
      point = {
        lat: point.lat - 0.0008,
        lng: point.lng - 0.0013
      }
    }
  }
  if (line_number === '37' && direction === -1) {
    if (point.lat > -34.6110 && point.lat < -34.5930 && point.lng > -58.3930 && point.lng < -58.3900) {
      point = {
        lat: point.lat - 0.0008,
        lng: point.lng - 0.0013
      }
    }
    if (point.lat > -34.5930 && point.lat < -34.5800 && point.lng > -58.4220 && point.lng < -58.3910) {
      point = {
        lat: point.lat - 0.0046,
        lng: point.lng - 0.0045
      }
    }
  }
  return stops.some((stop, index) => (
    distanceKm(point, { lat: stop.latitude, lng: stop.longitude }) < 0.035
  ))
}

const LINE_DRIVERS: Record<string, { name: string; unit: string; online: boolean; rating: number; email: string }[]> = {
  '12': [
    { name: 'Néstor García', unit: '001', online: true, rating: 4.8, email: 'nestor@nestor.ar' },
    { name: 'Roberto Sánchez', unit: '003', online: true, rating: 4.9, email: 'roberto@demo.ar' },
    { name: 'Carlos Martínez', unit: '002', online: false, rating: 4.6, email: 'carlos@demo.ar' },
    { name: 'Juan Gómez', unit: '005', online: true, rating: 4.5, email: 'juan@demo.ar' },
  ],
  '28': [
    { name: 'Carlos M.', unit: '002', online: true, rating: 4.6, email: 'carlos@demo.ar' },
    { name: 'Jorge Rodríguez', unit: '004', online: true, rating: 4.7, email: 'jorge@demo.ar' },
    { name: 'Pablo García', unit: '006', online: false, rating: 4.9, email: 'pablo@demo.ar' },
  ],
  '37': [
    { name: 'Roberto S.', unit: '003', online: true, rating: 4.9, email: 'roberto@demo.ar' },
    { name: 'Ana Martínez', unit: '008', online: false, rating: 4.5, email: 'ana@demo.ar' },
  ],
  '39': [
    { name: 'Esteban Ortiz', unit: '001', online: true, rating: 4.8, email: 'esteban@demo.ar' },
    { name: 'Lucas Domínguez', unit: '003', online: true, rating: 4.9, email: 'lucas@demo.ar' },
    { name: 'Martín Pereyra', unit: '002', online: false, rating: 4.6, email: 'martin@demo.ar' },
  ],
  '59': [
    { name: 'Hugo Bianchi', unit: '010', online: true, rating: 4.9, email: 'hugo@demo.ar' },
    { name: 'Nicolás Silva', unit: '012', online: false, rating: 4.7, email: 'nicolas@demo.ar' },
    { name: 'Claudio Rossi', unit: '014', online: true, rating: 4.8, email: 'claudio@demo.ar' },
  ],
  '60': [
    { name: 'Carlos Martínez', unit: '020', online: true, rating: 4.6, email: 'carlos@demo.ar' },
    { name: 'Diego Rodríguez', unit: '022', online: false, rating: 4.2, email: 'diego@demo.ar' },
    { name: 'Pablo García', unit: '024', online: true, rating: 5.0, email: 'pablo@demo.ar' },
    { name: 'Luis Fernández', unit: '026', online: true, rating: 4.7, email: 'luis@demo.ar' },
  ],
  '102': [
    { name: 'Diego Torres', unit: '001', online: true, rating: 4.8, email: 'diego@demo.ar' },
    { name: 'Fernando Gómez', unit: '003', online: true, rating: 4.9, email: 'fernando@demo.ar' },
    { name: 'Javier Ortega', unit: '002', online: false, rating: 4.6, email: 'javier@demo.ar' },
  ],
  '152': [
    { name: 'Roberto S.', unit: '010', online: true, rating: 4.9, email: 'roberto@demo.ar' },
    { name: 'Jorge R.', unit: '012', online: false, rating: 4.7, email: 'jorge@demo.ar' },
    { name: 'Ana C.', unit: '014', online: true, rating: 4.8, email: 'ana@demo.ar' },
  ],
}

export function getDirectionForBus(line_number: string, simDirection: 1 | -1): 'ida' | 'vuelta' {
  const isInverted = line_number === '28' || line_number === '37'
  if (isInverted) {
    return simDirection === 1 ? 'vuelta' : 'ida'
  }
  return simDirection === 1 ? 'ida' : 'vuelta'
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
  
  const initialDirection = unitNum % 2 === 0 ? 1 : -1
  const fraction = unitNum / totalBuses
  const pathIndex = Math.min(Math.floor(path.length * fraction), path.length - 2)
  const point = path[pathIndex]
  const nextStop = nearestStopAhead(stops, path, pathIndex, initialDirection) || stops[0]
  
  const lineDrivers = LINE_DRIVERS[line.line_number] || []
  const driverInfo = lineDrivers[unitNum % lineDrivers.length] || {
    name: 'Chofer Auxiliar',
    unit: String(100 + unitNum),
    online: true,
    rating: 4.5,
    email: 'auxiliar@demo.ar'
  }
  
  const speedKmh = 18 + (unitNum * 5) % 15
  
  const ramal = isLine60 ? (branchId === '60' ? 'A' : 'B') : undefined
  const reports_count = (unitNum % 3 === 0) ? 0 : (unitNum % 3 === 1 ? 1 : 2)

  let initialLat = point.lat
  let initialLng = point.lng
  if (line.line_number === '12' && initialDirection === -1) {
    if (initialLat > -34.6240 && initialLat < -34.5950 && initialLng > -58.3950 && initialLng < -58.3910) {
      initialLat -= 0.0008
      initialLng -= 0.0013
    }
  }
  if (line.line_number === '37' && initialDirection === -1) {
    if (initialLat > -34.6110 && initialLat < -34.5930 && initialLng > -58.3930 && initialLng < -58.3900) {
      initialLat -= 0.0008
      initialLng -= 0.0013
    }
    if (initialLat > -34.5930 && initialLat < -34.5800 && initialLng > -58.4220 && initialLng < -58.3910) {
      initialLat -= 0.0046
      initialLng -= 0.0045
    }
  }

  const busDirection = getDirectionForBus(line.line_number, initialDirection)

  const bus: BusPosition = {
    id:              `mock-${line.id}-${unitNum}`,
    driver_id:       `mock-driver-${line.id}-${unitNum}`,
    line_id:         line.id,
    line_number:     line.line_number,
    bus_unit:        `${line.line_number}-${driverInfo.unit}`,
    driver_name:     driverInfo.name,
    latitude:        initialLat,
    longitude:       initialLng,
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
    direction:       busDirection
  }

  return {
    bus,
    stopIndex:    pathIndex,
    progress:    0,
    direction:   initialDirection,
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
    const totalBuses = isLine12 ? 14 : (isLine60 ? 14 : 8)
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

    const currentDirection = getDirectionForBus(s.bus.line_number, s.direction)
    s.bus.direction = currentDirection

    if (s.branchId) {
      const route = OFFICIAL_ROUTES[s.branchId]
      path = route.path
      stops = route.stops.map((stop, index) => ({
        id: `${s.bus.line_id}-official-${stop.id}-${currentDirection}`,
        line_id: s.bus.line_id,
        name: stop.name,
        street_name: stop.name,
        stop_number: index + 1,
        latitude: stop.lat,
        longitude: stop.lng,
        direction: currentDirection,
        avg_wait_minutes: 6,
        total_daily_users: 120,
      }))
    } else {
      stops = getMockStopsForBus(s.bus, currentDirection)
      path = getRoutePathForBus(s.bus, 'ida') // Always outbound path to index correctly
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
    let finalLat = curPoint.lat + dLat * s.progress
    let finalLng = curPoint.lng + dLng * s.progress
    if (s.bus.line_number === '12' && s.direction === -1) {
      if (finalLat > -34.6240 && finalLat < -34.5950 && finalLng > -58.3950 && finalLng < -58.3910) {
        finalLat -= 0.0008
        finalLng -= 0.0013
      }
    }
    if (s.bus.line_number === '37' && s.direction === -1) {
      if (finalLat > -34.6110 && finalLat < -34.5930 && finalLng > -58.3930 && finalLng < -58.3900) {
        finalLat -= 0.0008
        finalLng -= 0.0013
      }
      if (finalLat > -34.5930 && finalLat < -34.5800 && finalLng > -58.4220 && finalLng < -58.3910) {
        finalLat -= 0.0046
        finalLng -= 0.0045
      }
    }

    s.bus.latitude   = finalLat
    s.bus.longitude  = finalLng
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
      
      let nextLat = nextPoint.lat
      let nextLng = nextPoint.lng
      if (s.bus.line_number === '12' && s.direction === -1) {
        if (nextLat > -34.6240 && nextLat < -34.5950 && nextLng > -58.3950 && nextLng < -58.3910) {
          nextLat -= 0.0008
          nextLng -= 0.0013
        }
      }
      if (s.bus.line_number === '37' && s.direction === -1) {
        if (nextLat > -34.6110 && nextLat < -34.5930 && nextLng > -58.3930 && nextLng < -58.3900) {
          nextLat -= 0.0008
          nextLng -= 0.0013
        }
        if (nextLat > -34.5930 && nextLat < -34.5800 && nextLng > -58.4220 && nextLng < -58.3910) {
          nextLat -= 0.0046
          nextLng -= 0.0045
        }
      }
      s.bus.latitude   = nextLat
      s.bus.longitude  = nextLng

      // Arrived at a stop -> pause (random length up to 10 seconds)
      if (shouldPauseAtPathIndex(stops, path, nextIdx, s.direction, s.bus.line_number)) {
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
