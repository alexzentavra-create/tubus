// src/lib/mockData.ts
import type { BusLine, BusStop, BusPosition } from '@/types'
import { OFFICIAL_ROUTES } from './officialRoutes'
import type { OfficialRoute, RoutePoint } from './routeTypes'

export const MOCK_LINES: BusLine[] = [
  { id: 'line-1',   line_number: '12',  name: 'Línea 12 - Once / Villa Urquiza',        color: '#EF4444', company: 'Transportes Callao S.A.', total_stops: 69, is_active: true },
  { id: 'line-28',  line_number: '28',  name: 'Línea 28 - Retiro / Puente La Noria',    color: '#16A34A', company: 'DOTA S.A.',        total_stops: 95,  is_active: true },
  { id: 'line-3',   line_number: '37',  name: 'Línea 37 - Aeropuerto / Centro',         color: '#15803D', company: '4 de Septiembre S.A.', total_stops: 142, is_active: true },
  { id: 'line-39',  line_number: '39',  name: 'Línea 39 - Chacarita / Barracas',        color: '#F97316', company: 'Transportes Santa Fe S.A.C.I.', total_stops: 97, is_active: true },
  { id: 'line-59',  line_number: '59',  name: 'Línea 59 - Estación Buenos Aires / San Isidro', color: '#10B981', company: 'Microomnibus Ciudad de Buenos Aires S.A.T.C.I.', total_stops: 172, is_active: true },
  { id: 'line-60',  line_number: '60',  name: 'Línea 60 - Constitución / Tigre',        color: '#EAB308', company: 'MONSA S.A.',       total_stops: 81,  is_active: true },
  { id: 'line-102', line_number: '102', name: 'Línea 102 - Palermo / Barracas',         color: '#3B82F6', company: 'Transportes Sargento Cabral S.C.', total_stops: 65, is_active: true },
  { id: 'line-152', line_number: '152', name: 'Línea 152 - La Boca / Olivos',          color: '#1D4ED8', company: 'Empresa Tandilense S.A.', total_stops: 129, is_active: true },
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

// ─── GTFS Route Processing ──────────────────────────────────────────────────

function officialRouteForLine(line: BusLine): OfficialRoute | null {
  return OFFICIAL_ROUTES[line.line_number.replace(/^0+/, '')] || null
}

function routeTemplateForLine(line: BusLine, direction: 'ida' | 'vuelta' = 'ida'): BusStop[] {
  const officialRoute = officialRouteForLine(line)
  if (officialRoute) {
    const dirObj = direction === 'vuelta' ? officialRoute.vuelta : officialRoute.ida
    if (dirObj?.stops) {
      return dirObj.stops.map((stop, index) => ({
        id: `${line.id}-official-${stop.id}-${direction}`,
        line_id: line.id,
        name: stop.name,
        street_name: stop.name,
        stop_number: index + 1,
        latitude: stop.lat,
        longitude: stop.lng,
        direction: direction,
        avg_wait_minutes: 6,
        total_daily_users: 120,
      }))
    }
  }

  const directStops = MOCK_STOPS[line.id] || MOCK_STOPS[MOCK_LINES[0].id]
  return directStops.filter(s => s.direction === direction)
}

export function getMockStopsForLine(line: BusLine, direction: 'all' | 'ida' | 'vuelta' = 'all'): BusStop[] {
  if (direction === 'ida') {
    return routeTemplateForLine(line, 'ida')
  } else if (direction === 'vuelta') {
    return routeTemplateForLine(line, 'vuelta')
  } else {
    return [...routeTemplateForLine(line, 'ida'), ...routeTemplateForLine(line, 'vuelta')]
  }
}

function getRoutePathForLine(line: BusLine, direction: 'ida' | 'vuelta' = 'ida'): RoutePoint[] {
  const officialRoute = OFFICIAL_ROUTES[line.line_number.replace(/^0+/, '')]
  if (officialRoute) {
    const dirObj = direction === 'vuelta' ? officialRoute.vuelta : officialRoute.ida
    if (dirObj?.path) {
      return dirObj.path
    }
  }

  // Fallback to stops if no path exists
  const stops = getMockStopsForLine(line, direction)
  return stops.map(stop => ({
    lat: stop.latitude,
    lng: stop.longitude,
  }))
}

export function getMockRoutePathForLine(line: BusLine, direction: 'ida' | 'vuelta' = 'ida'): RoutePoint[] {
  return getRoutePathForLine(line, direction)
}

export function getMockRoutePathsForLine(line: BusLine, direction: 'all' | 'ida' | 'vuelta' = 'all'): RoutePoint[][] {
  if (direction === 'all') {
    return [
      getRoutePathForLine(line, 'ida'),
      getRoutePathForLine(line, 'vuelta')
    ]
  } else {
    return [getRoutePathForLine(line, direction)]
  }
}

function distanceKm(a: RoutePoint, b: RoutePoint): number {
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const dLat = lat2 - lat1
  const dLng = (b.lng - a.lng) * Math.PI / 180
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}

// Helper: bounding box of a line's stops (for map auto-fit)
export function getLineBounds(line: BusLine): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  const path = getRoutePathForLine(line, 'ida')
  if (!path || path.length === 0) return null
  return {
    minLat: Math.min(...path.map(s => s.lat)),
    maxLat: Math.max(...path.map(s => s.lat)),
    minLng: Math.min(...path.map(s => s.lng)),
    maxLng: Math.max(...path.map(s => s.lng)),
  }
}
