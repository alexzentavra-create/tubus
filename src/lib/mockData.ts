// src/lib/mockData.ts

import type { BusLine, BusStop, BusPosition } from '@/types'

export const MOCK_LINES: BusLine[] = [
  { id: 'line-1',  line_number: '12',  name: 'Línea 12 - Terminal / Barrio Norte',     color: '#22D3A0', company: 'TrBus S.A.',       total_stops: 10, is_active: true },
  { id: 'line-2',  line_number: '24',  name: 'Línea 24 - Centro / Villa del Parque',   color: '#60A5FA', company: 'MetroBus S.A.',    total_stops: 10, is_active: true },
  { id: 'line-3',  line_number: '37',  name: 'Línea 37 - Aeropuerto / Centro',         color: '#F59E0B', company: 'AeroBus Ltda.',    total_stops: 8,  is_active: true },
  { id: 'line-4',  line_number: '55',  name: 'Línea 55 - Estadio / Zona Sur',          color: '#F87171', company: 'SurBus S.A.',      total_stops: 9,  is_active: true },
  { id: 'line-5',  line_number: '71',  name: 'Línea 71 - Universidad / Av. Principal', color: '#A78BFA', company: 'UniTrans S.A.',    total_stops: 9,  is_active: true },
  { id: 'line-6',  line_number: '88',  name: 'Línea 88 - Hospital / Mercado Central',  color: '#34D399', company: 'MediTrans Ltda.',  total_stops: 8,  is_active: true },
  { id: 'line-7',  line_number: '102', name: 'Línea 102 - Puerto / Zona Oeste',        color: '#FB923C', company: 'PuertoTrans S.A.', total_stops: 9,  is_active: true },
  { id: 'line-8',  line_number: '115', name: 'Línea 115 - Shopping / Cementerio',      color: '#E879F9', company: 'TrBus S.A.',       total_stops: 8,  is_active: true },
]

// Full stop coordinates for each line (Buenos Aires area)
export const MOCK_STOPS: Record<string, BusStop[]> = {
  'line-1': [
    { id: 'l1-s1',  line_id: 'line-1', name: 'Terminal Central',       street_name: 'Av. Roca 1',           stop_number: 1,  latitude: -34.6200, longitude: -58.4300, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 320 },
    { id: 'l1-s2',  line_id: 'line-1', name: 'Av. Libertad y Mitre',   street_name: 'Av. Libertad 500',     stop_number: 2,  latitude: -34.6180, longitude: -58.4260, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 210 },
    { id: 'l1-s3',  line_id: 'line-1', name: 'Plaza San Martín',       street_name: 'San Martín y Rivadavia', stop_number: 3, latitude: -34.6155, longitude: -58.4220, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 280 },
    { id: 'l1-s4',  line_id: 'line-1', name: 'Calle Belgrano 450',     street_name: 'Belgrano 450',         stop_number: 4,  latitude: -34.6130, longitude: -58.4180, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 150 },
    { id: 'l1-s5',  line_id: 'line-1', name: 'Corrientes y Callao',    street_name: 'Av. Corrientes 1800',  stop_number: 5,  latitude: -34.6100, longitude: -58.4140, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 190 },
    { id: 'l1-s6',  line_id: 'line-1', name: 'Av. Santa Fe 2000',      street_name: 'Santa Fe 2000',        stop_number: 6,  latitude: -34.6070, longitude: -58.4100, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 170 },
    { id: 'l1-s7',  line_id: 'line-1', name: 'Palermo Chico',          street_name: 'Av. del Libertador 1800', stop_number: 7, latitude: -34.6040, longitude: -58.4060, direction: 'ida', avg_wait_minutes: 8, total_daily_users: 130 },
    { id: 'l1-s8',  line_id: 'line-1', name: 'Coronel Díaz y Charcas', street_name: 'Coronel Díaz 2200',   stop_number: 8,  latitude: -34.6010, longitude: -58.4020, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 110 },
    { id: 'l1-s9',  line_id: 'line-1', name: 'Barrio Norte - Pringles', street_name: 'Pringles 1100',       stop_number: 9,  latitude: -34.5985, longitude: -58.3985, direction: 'ida', avg_wait_minutes: 9,  total_daily_users: 90  },
    { id: 'l1-s10', line_id: 'line-1', name: 'Barrio Norte - Final',   street_name: 'Av. Las Heras 4200',  stop_number: 10, latitude: -34.5960, longitude: -58.3950, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 75  },
  ],
  'line-2': [
    { id: 'l2-s1',  line_id: 'line-2', name: 'Centro - Obelisco',      street_name: 'Av. 9 de Julio y Corrientes', stop_number: 1, latitude: -34.6037, longitude: -58.3816, direction: 'ida', avg_wait_minutes: 4, total_daily_users: 400 },
    { id: 'l2-s2',  line_id: 'line-2', name: 'Av. Corrientes 1200',    street_name: 'Corrientes 1200',      stop_number: 2,  latitude: -34.6045, longitude: -58.3860, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 350 },
    { id: 'l2-s3',  line_id: 'line-2', name: 'Av. Pueyrredón',         street_name: 'Corrientes y Pueyrredón', stop_number: 3, latitude: -34.6052, longitude: -58.3920, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 300 },
    { id: 'l2-s4',  line_id: 'line-2', name: 'Pque. Centenario',       street_name: 'Av. Díaz Vélez 5000', stop_number: 4,  latitude: -34.6060, longitude: -58.4000, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 250 },
    { id: 'l2-s5',  line_id: 'line-2', name: 'Rivadavia y Rojas',      street_name: 'Av. Rivadavia 4900',  stop_number: 5,  latitude: -34.6070, longitude: -58.4060, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 200 },
    { id: 'l2-s6',  line_id: 'line-2', name: 'José María Moreno',      street_name: 'José M. Moreno 800',  stop_number: 6,  latitude: -34.6080, longitude: -58.4130, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 170 },
    { id: 'l2-s7',  line_id: 'line-2', name: 'San Pedrito',            street_name: 'Av. Rivadavia 5800',  stop_number: 7,  latitude: -34.6090, longitude: -58.4200, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 140 },
    { id: 'l2-s8',  line_id: 'line-2', name: 'Quirno y Gavilán',       street_name: 'Gavilán 300',          stop_number: 8,  latitude: -34.6100, longitude: -58.4270, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 120 },
    { id: 'l2-s9',  line_id: 'line-2', name: 'Villa del Parque Centro', street_name: 'Av. San Martín 4400', stop_number: 9, latitude: -34.6110, longitude: -58.4330, direction: 'ida', avg_wait_minutes: 9,  total_daily_users: 100 },
    { id: 'l2-s10', line_id: 'line-2', name: 'Villa del Parque - Fin', street_name: 'Nogoyá 3200',          stop_number: 10, latitude: -34.6120, longitude: -58.4390, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 80  },
  ],
  'line-3': [
    { id: 'l3-s1',  line_id: 'line-3', name: 'Aeropuerto Intl.',       street_name: 'Av. Costanera Rafael Obligado', stop_number: 1, latitude: -34.5590, longitude: -58.4160, direction: 'ida', avg_wait_minutes: 12, total_daily_users: 180 },
    { id: 'l3-s2',  line_id: 'line-3', name: 'Autopista km 12',        street_name: 'Autopista 25 de Mayo',  stop_number: 2, latitude: -34.5700, longitude: -58.4150, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 130 },
    { id: 'l3-s3',  line_id: 'line-3', name: 'Av. Maipú 800',          street_name: 'Maipú 800',             stop_number: 3, latitude: -34.5820, longitude: -58.4140, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 160 },
    { id: 'l3-s4',  line_id: 'line-3', name: 'Lugones y Pampa',        street_name: 'Av. Lugones 3000',      stop_number: 4, latitude: -34.5900, longitude: -58.4130, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 140 },
    { id: 'l3-s5',  line_id: 'line-3', name: 'Palermo Soho',           street_name: 'Thames 1600',           stop_number: 5, latitude: -34.5960, longitude: -58.4100, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 200 },
    { id: 'l3-s6',  line_id: 'line-3', name: 'Av. Córdoba 4500',       street_name: 'Av. Córdoba 4500',      stop_number: 6, latitude: -34.5995, longitude: -58.4030, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 220 },
    { id: 'l3-s7',  line_id: 'line-3', name: 'Recoleta - Pueyrredón',  street_name: 'Av. Santa Fe 2900',     stop_number: 7, latitude: -34.5960, longitude: -58.3930, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 260 },
    { id: 'l3-s8',  line_id: 'line-3', name: 'Centro - Catedral',      street_name: 'Av. de Mayo 500',       stop_number: 8, latitude: -34.6083, longitude: -58.3713, direction: 'ida', avg_wait_minutes: 4,  total_daily_users: 320 },
  ],
  'line-4': [
    { id: 'l4-s1',  line_id: 'line-4', name: 'Estadio Municipal',      street_name: 'Av. del Trabajo 1',     stop_number: 1, latitude: -34.6450, longitude: -58.3700, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 250 },
    { id: 'l4-s2',  line_id: 'line-4', name: 'Av. del Trabajo 500',    street_name: 'Av. del Trabajo 500',   stop_number: 2, latitude: -34.6410, longitude: -58.3760, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 190 },
    { id: 'l4-s3',  line_id: 'line-4', name: 'Juan B. Justo Sur',      street_name: 'Juan B. Justo 5000',    stop_number: 3, latitude: -34.6370, longitude: -58.3820, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 170 },
    { id: 'l4-s4',  line_id: 'line-4', name: 'Av. Directorio',         street_name: 'Av. Directorio 3000',   stop_number: 4, latitude: -34.6330, longitude: -58.3870, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 150 },
    { id: 'l4-s5',  line_id: 'line-4', name: 'Pompeya - Eva Perón',    street_name: 'Av. Eva Perón 2800',    stop_number: 5, latitude: -34.6290, longitude: -58.3920, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 140 },
    { id: 'l4-s6',  line_id: 'line-4', name: 'Zona Industrial Sur',    street_name: 'Av. Amancio Alcorta 800', stop_number: 6, latitude: -34.6250, longitude: -58.3960, direction: 'ida', avg_wait_minutes: 9,  total_daily_users: 110 },
    { id: 'l4-s7',  line_id: 'line-4', name: 'Av. Sáenz 1200',         street_name: 'Av. Sáenz 1200',        stop_number: 7, latitude: -34.6210, longitude: -58.4000, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 100 },
    { id: 'l4-s8',  line_id: 'line-4', name: 'Villa Soldati',          street_name: 'Av. Cruz 5000',          stop_number: 8, latitude: -34.6175, longitude: -58.4050, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 85  },
    { id: 'l4-s9',  line_id: 'line-4', name: 'Zona Sur - Final',       street_name: 'Av. Fernández de la Cruz 4200', stop_number: 9, latitude: -34.6140, longitude: -58.4100, direction: 'ida', avg_wait_minutes: 12, total_daily_users: 70 },
  ],
  'line-5': [
    { id: 'l5-s1',  line_id: 'line-5', name: 'Universidad Nacional',   street_name: 'Pabellones UBA',         stop_number: 1, latitude: -34.5458, longitude: -58.4453, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 350 },
    { id: 'l5-s2',  line_id: 'line-5', name: 'Facultad de Medicina',   street_name: 'Paraguay 2155',          stop_number: 2, latitude: -34.5970, longitude: -58.3995, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 290 },
    { id: 'l5-s3',  line_id: 'line-5', name: 'Av. Las Heras',          street_name: 'Av. Las Heras 3000',     stop_number: 3, latitude: -34.5910, longitude: -58.4020, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 240 },
    { id: 'l5-s4',  line_id: 'line-5', name: 'Julián Álvarez y Charcas', street_name: 'Julián Álvarez 1800',  stop_number: 4, latitude: -34.5950, longitude: -58.4070, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 200 },
    { id: 'l5-s5',  line_id: 'line-5', name: 'Av. Principal 1000',     street_name: 'Av. Rivadavia 1000',     stop_number: 5, latitude: -34.6000, longitude: -58.3850, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 310 },
    { id: 'l5-s6',  line_id: 'line-5', name: 'Av. Principal 1500',     street_name: 'Av. Rivadavia 1500',     stop_number: 6, latitude: -34.6010, longitude: -58.3760, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 270 },
    { id: 'l5-s7',  line_id: 'line-5', name: 'Montserrat',             street_name: 'Av. Belgrano 1200',      stop_number: 7, latitude: -34.6100, longitude: -58.3760, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 220 },
    { id: 'l5-s8',  line_id: 'line-5', name: 'Constitución',           street_name: 'Av. Brasil 1200',        stop_number: 8, latitude: -34.6268, longitude: -58.3808, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 300 },
    { id: 'l5-s9',  line_id: 'line-5', name: 'Av. Principal - Final',  street_name: 'Av. Hipólito Yrigoyen 3900', stop_number: 9, latitude: -34.6150, longitude: -58.3780, direction: 'ida', avg_wait_minutes: 9, total_daily_users: 160 },
  ],
  'line-6': [
    { id: 'l6-s1',  line_id: 'line-6', name: 'Hospital Público',       street_name: 'Av. Córdoba 2351',       stop_number: 1, latitude: -34.5984, longitude: -58.4048, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 220 },
    { id: 'l6-s2',  line_id: 'line-6', name: 'Farmacia Central',       street_name: 'Corrientes 3200',        stop_number: 2, latitude: -34.6020, longitude: -58.4010, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 180 },
    { id: 'l6-s3',  line_id: 'line-6', name: 'Av. Callao y Corrientes', street_name: 'Av. Callao 1200',       stop_number: 3, latitude: -34.6040, longitude: -58.3930, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 260 },
    { id: 'l6-s4',  line_id: 'line-6', name: 'San Nicolás',            street_name: 'Av. Corrientes 1100',    stop_number: 4, latitude: -34.6038, longitude: -58.3870, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 300 },
    { id: 'l6-s5',  line_id: 'line-6', name: 'Diagonal Norte',         street_name: 'Av. Roque Sáenz Peña 700', stop_number: 5, latitude: -34.6065, longitude: -58.3790, direction: 'ida', avg_wait_minutes: 4, total_daily_users: 340 },
    { id: 'l6-s6',  line_id: 'line-6', name: 'San Telmo',              street_name: 'Defensa 900',             stop_number: 6, latitude: -34.6155, longitude: -58.3704, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 190 },
    { id: 'l6-s7',  line_id: 'line-6', name: 'La Boca - Caminito',     street_name: 'Av. Pedro de Mendoza 1900', stop_number: 7, latitude: -34.6345, longitude: -58.3632, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 150 },
    { id: 'l6-s8',  line_id: 'line-6', name: 'Mercado Central',        street_name: 'Av. General Paz y Ruta 3', stop_number: 8, latitude: -34.6900, longitude: -58.5300, direction: 'ida', avg_wait_minutes: 12, total_daily_users: 200 },
  ],
  'line-7': [
    { id: 'l7-s1',  line_id: 'line-7', name: 'Puerto Viejo',           street_name: 'Av. de los Inmigrantes 1950', stop_number: 1, latitude: -34.6090, longitude: -58.3630, direction: 'ida', avg_wait_minutes: 9, total_daily_users: 170 },
    { id: 'l7-s2',  line_id: 'line-7', name: 'Costanera Norte',        street_name: 'Av. Costanera Norte 4500', stop_number: 2, latitude: -34.5870, longitude: -58.3960, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 130 },
    { id: 'l7-s3',  line_id: 'line-7', name: 'Av. del Puerto 200',     street_name: 'Av. Antártida Argentina 500', stop_number: 3, latitude: -34.5990, longitude: -58.3690, direction: 'ida', avg_wait_minutes: 7, total_daily_users: 160 },
    { id: 'l7-s4',  line_id: 'line-7', name: 'Retiro',                 street_name: 'Av. del Libertador 100',  stop_number: 4, latitude: -34.5924, longitude: -58.3740, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 320 },
    { id: 'l7-s5',  line_id: 'line-7', name: 'Once de Septiembre',     street_name: 'Av. Rivadavia 3100',      stop_number: 5, latitude: -34.6080, longitude: -58.4060, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 280 },
    { id: 'l7-s6',  line_id: 'line-7', name: 'Caballito Norte',        street_name: 'Av. Directorio 1800',     stop_number: 6, latitude: -34.6150, longitude: -58.4220, direction: 'ida', avg_wait_minutes: 7, total_daily_users: 200 },
    { id: 'l7-s7',  line_id: 'line-7', name: 'Flores Sur',             street_name: 'Av. Nazca 1400',          stop_number: 7, latitude: -34.6210, longitude: -58.4380, direction: 'ida', avg_wait_minutes: 8, total_daily_users: 160 },
    { id: 'l7-s8',  line_id: 'line-7', name: 'Villa Luro',             street_name: 'Av. Juan B. Justo 7000',  stop_number: 8, latitude: -34.6260, longitude: -58.4500, direction: 'ida', avg_wait_minutes: 9, total_daily_users: 120 },
    { id: 'l7-s9',  line_id: 'line-7', name: 'Zona Oeste - Final',     street_name: 'Av. General Paz 5000',    stop_number: 9, latitude: -34.6320, longitude: -58.4640, direction: 'ida', avg_wait_minutes: 12, total_daily_users: 90 },
  ],
  'line-8': [
    { id: 'l8-s1',  line_id: 'line-8', name: 'Shopping Plaza',         street_name: 'Av. Cabildo 3200',        stop_number: 1, latitude: -34.5606, longitude: -58.4569, direction: 'ida', avg_wait_minutes: 8, total_daily_users: 280 },
    { id: 'l8-s2',  line_id: 'line-8', name: 'Av. Triunvirato',        street_name: 'Av. Triunvirato 5000',    stop_number: 2, latitude: -34.5680, longitude: -58.4500, direction: 'ida', avg_wait_minutes: 7, total_daily_users: 230 },
    { id: 'l8-s3',  line_id: 'line-8', name: 'Villa del Parque',       street_name: 'Av. San Martín 4200',     stop_number: 3, latitude: -34.5780, longitude: -58.4450, direction: 'ida', avg_wait_minutes: 7, total_daily_users: 180 },
    { id: 'l8-s4',  line_id: 'line-8', name: 'Flores Norte',           street_name: 'Av. Rivadavia 6500',      stop_number: 4, latitude: -34.6090, longitude: -58.4500, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 220 },
    { id: 'l8-s5',  line_id: 'line-8', name: 'Av. Rivadavia 3000',     street_name: 'Av. Rivadavia 3000',      stop_number: 5, latitude: -34.6080, longitude: -58.4000, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 300 },
    { id: 'l8-s6',  line_id: 'line-8', name: 'Almagro Centro',         street_name: 'Av. Corrientes 3900',     stop_number: 6, latitude: -34.6050, longitude: -58.4120, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 260 },
    { id: 'l8-s7',  line_id: 'line-8', name: 'Parque Patricios',       street_name: 'Av. Caseros 2500',        stop_number: 7, latitude: -34.6320, longitude: -58.3980, direction: 'ida', avg_wait_minutes: 8, total_daily_users: 180 },
    { id: 'l8-s8',  line_id: 'line-8', name: 'Cementerio Municipal',   street_name: 'Av. Lacarra 2500',        stop_number: 8, latitude: -34.6420, longitude: -58.4200, direction: 'ida', avg_wait_minutes: 12, total_daily_users: 110 },
  ],
}

// ─── Mock Bus Simulator ───────────────────────────────────────────────────────
// Creates 1-2 fake buses per line that travel along the route stops
// Each bus moves between stops with realistic timing

interface MockBusState {
  bus: BusPosition
  stopIndex: number
  progress: number      // 0-1 between current stop and next
  speed: number         // km/h
  direction: 1 | -1    // forward or backward along route
  pauseAt: number       // timestamp when to leave current stop (0 = moving)
}

const MOCK_BUS_STATES: Map<string, MockBusState> = new Map()

function createMockBus(lineId: string, unitNum: number, startStopIndex: number): MockBusState {
  const stops = MOCK_STOPS[lineId]
  const line  = MOCK_LINES.find(l => l.id === lineId)!
  const stop  = stops[startStopIndex]

  const bus: BusPosition = {
    id:              `mock-${lineId}-${unitNum}`,
    driver_id:       `mock-driver-${lineId}-${unitNum}`,
    line_id:         lineId,
    line_number:     line.line_number,
    bus_unit:        `${line.line_number}${String(unitNum).padStart(3, '0')}`,
    driver_name:     ['Carlos Gómez', 'María Torres', 'Roberto Silva', 'Ana Martínez', 'Luis Fernández'][unitNum % 5],
    latitude:        stop.latitude,
    longitude:       stop.longitude,
    heading:         0,
    speed_kmh:       0,
    next_stop_id:    stops[Math.min(startStopIndex + 1, stops.length - 1)].id,
    next_stop_name:  stops[Math.min(startStopIndex + 1, stops.length - 1)].name,
    eta_minutes:     Math.floor(Math.random() * 5) + 1,
    status:          'at_stop',
    passenger_count: Math.floor(Math.random() * 20) + 5,
    timestamp:       new Date().toISOString(),
  }

  return {
    bus,
    stopIndex:   startStopIndex,
    progress:    0,
    speed:       30 + Math.random() * 20,
    direction:   1,
    pauseAt:     Date.now() + 3000 + Math.random() * 4000,
  }
}

export function initMockBuses() {
  if (MOCK_BUS_STATES.size > 0) return // already initialized

  MOCK_LINES.forEach(line => {
    const stops = MOCK_STOPS[line.id]
    if (!stops || stops.length < 2) return

    // 2 buses per line, spread across route
    const offset1 = Math.floor(stops.length * 0.2)
    const offset2 = Math.floor(stops.length * 0.6)

    MOCK_BUS_STATES.set(`${line.id}-0`, createMockBus(line.id, 1, offset1))
    MOCK_BUS_STATES.set(`${line.id}-1`, createMockBus(line.id, 2, offset2))
  })
}

function calcHeading(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
  const dLng = toLng - fromLng
  const dLat = toLat - fromLat
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI)
  return (angle + 360) % 360
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function tickMockBuses(): BusPosition[] {
  if (MOCK_BUS_STATES.size === 0) initMockBuses()

  const now = Date.now()
  const results: BusPosition[] = []

  MOCK_BUS_STATES.forEach((state, key) => {
    const stops = MOCK_STOPS[state.bus.line_id]
    if (!stops || stops.length < 2) return

    if (state.pauseAt > 0) {
      // Bus is paused at a stop
      if (now < state.pauseAt) {
        state.bus.status    = 'at_stop'
        state.bus.speed_kmh = 0
        state.bus.timestamp = new Date().toISOString()
        results.push({ ...state.bus })
        return
      }
      state.pauseAt = 0
      state.progress = 0
    }

    // Move between stops
    const currentStop = stops[state.stopIndex]
    const nextIdx     = state.stopIndex + state.direction
    if (nextIdx < 0 || nextIdx >= stops.length) {
      // Reverse direction
      state.direction   = state.direction === 1 ? -1 : 1
      state.pauseAt     = now + 5000
      results.push({ ...state.bus })
      return
    }
    const nextStop = stops[nextIdx]

    // Approx distance in degrees ≈ km * 0.009
    const distLat  = Math.abs(nextStop.latitude  - currentStop.latitude)
    const distLng  = Math.abs(nextStop.longitude - currentStop.longitude)
    const distKm   = Math.sqrt(distLat * distLat + distLng * distLng) / 0.009

    // progress per tick (called ~every 1s): speed(km/h) / 3600(s/h) / distKm
    const step = (state.speed / 3600) / Math.max(distKm, 0.01)
    state.progress = Math.min(state.progress + step * 1.5, 1)

    const lat = lerp(currentStop.latitude,  nextStop.latitude,  state.progress)
    const lng = lerp(currentStop.longitude, nextStop.longitude, state.progress)

    state.bus.latitude   = lat
    state.bus.longitude  = lng
    state.bus.heading    = calcHeading(currentStop.latitude, currentStop.longitude, nextStop.latitude, nextStop.longitude)
    state.bus.speed_kmh  = Math.round(state.speed)
    state.bus.status     = 'moving'
    state.bus.next_stop_name = nextStop.name
    state.bus.next_stop_id   = nextStop.id
    state.bus.eta_minutes    = Math.max(1, Math.ceil((1 - state.progress) * distKm / (state.speed / 60)))
    state.bus.timestamp  = new Date().toISOString()

    if (state.progress >= 1) {
      // Arrived at next stop
      state.stopIndex = nextIdx
      state.progress  = 0
      state.bus.status    = 'at_stop'
      state.bus.latitude  = nextStop.latitude
      state.bus.longitude = nextStop.longitude
      state.bus.speed_kmh = 0
      state.bus.passenger_count = Math.max(0, state.bus.passenger_count + Math.floor(Math.random() * 6) - 2)
      state.pauseAt = now + 3000 + Math.random() * 5000
    }

    results.push({ ...state.bus })
  })

  return results
}

export function getMockBusesForLine(lineId: string): BusPosition[] {
  return Array.from(MOCK_BUS_STATES.values())
    .filter(s => s.bus.line_id === lineId)
    .map(s => ({ ...s.bus }))
}

// Legacy route names (kept for LineSelector route tab)
export const MOCK_ROUTES: Record<string, { name: string; direction: 'ida' | 'vuelta' }[]> = Object.fromEntries(
  MOCK_LINES.map(line => [
    line.id,
    (MOCK_STOPS[line.id] || []).map(stop => ({ name: stop.name, direction: stop.direction }))
  ])
)