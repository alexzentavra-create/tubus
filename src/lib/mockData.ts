// src/lib/mockData.ts
import type { BusLine, BusStop, BusPosition } from '@/types'

export const MOCK_LINES: BusLine[] = [
  { id: 'line-1', line_number: '12',  name: 'Línea 12 - Once / Villa Urquiza',        color: '#22D3A0', company: 'TrBus S.A.',       total_stops: 10, is_active: true },
  { id: 'line-2', line_number: '24',  name: 'Línea 24 - Centro / Villa del Parque',   color: '#60A5FA', company: 'MetroBus S.A.',    total_stops: 10, is_active: true },
  { id: 'line-3', line_number: '37',  name: 'Línea 37 - Aeropuerto / Centro',         color: '#F59E0B', company: 'AeroBus Ltda.',    total_stops: 8,  is_active: true },
  { id: 'line-4', line_number: '55',  name: 'Línea 55 - Estadio / Zona Sur',          color: '#F87171', company: 'SurBus S.A.',      total_stops: 9,  is_active: true },
  { id: 'line-5', line_number: '71',  name: 'Línea 71 - UBA / Constitución',          color: '#A78BFA', company: 'UniTrans S.A.',    total_stops: 9,  is_active: true },
  { id: 'line-6', line_number: '88',  name: 'Línea 88 - Hospital / San Telmo',        color: '#34D399', company: 'MediTrans Ltda.',  total_stops: 8,  is_active: true },
  { id: 'line-7', line_number: '102', name: 'Línea 102 - Retiro / Zona Oeste',        color: '#FB923C', company: 'PuertoTrans S.A.', total_stops: 9,  is_active: true },
  { id: 'line-8', line_number: '115', name: 'Línea 115 - Belgrano / Caballito',       color: '#E879F9', company: 'TrBus S.A.',       total_stops: 8,  is_active: true },
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
  // Line 55: Estadio Vélez → Flores → Constitución
  'line-4': [
    { id: 'l4-s1',  line_id: 'line-4', name: 'Estadio Vélez',            street_name: 'Av. Juan B. Justo 9200',      stop_number: 1, latitude: -34.6382, longitude: -58.4815, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 240 },
    { id: 'l4-s2',  line_id: 'line-4', name: 'Directorio y Nazca',       street_name: 'Av. Directorio 3100',         stop_number: 2, latitude: -34.6342, longitude: -58.4660, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 190 },
    { id: 'l4-s3',  line_id: 'line-4', name: 'Rivadavia y Nazca',        street_name: 'Av. Rivadavia 7000',          stop_number: 3, latitude: -34.6285, longitude: -58.4580, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 210 },
    { id: 'l4-s4',  line_id: 'line-4', name: 'Flores - Rivadavia',       street_name: 'Av. Rivadavia 6200',          stop_number: 4, latitude: -34.6230, longitude: -58.4420, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 260 },
    { id: 'l4-s5',  line_id: 'line-4', name: 'Almagro - Corrientes',     street_name: 'Av. Corrientes 4500',         stop_number: 5, latitude: -34.6068, longitude: -58.4185, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 300 },
    { id: 'l4-s6',  line_id: 'line-4', name: '9 de Julio y Corrientes',  street_name: 'Av. 9 de Julio 1300',         stop_number: 6, latitude: -34.6037, longitude: -58.3816, direction: 'ida', avg_wait_minutes: 4,  total_daily_users: 380 },
    { id: 'l4-s7',  line_id: 'line-4', name: 'San Juan y Lima',          street_name: 'Av. San Juan 1200',           stop_number: 7, latitude: -34.6180, longitude: -58.3760, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 220 },
    { id: 'l4-s8',  line_id: 'line-4', name: 'Independencia y Lima',     street_name: 'Av. Independencia 1500',      stop_number: 8, latitude: -34.6228, longitude: -58.3742, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 180 },
    { id: 'l4-s9',  line_id: 'line-4', name: 'Constitución - Final',     street_name: 'Av. Brasil 1800',             stop_number: 9, latitude: -34.6268, longitude: -58.3808, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 300 },
  ],
  // Line 71: Ciudad Universitaria → Palermo → Constitución
  'line-5': [
    { id: 'l5-s1',  line_id: 'line-5', name: 'Ciudad Universitaria',     street_name: 'Int. Güiraldes 2160',         stop_number: 1, latitude: -34.5428, longitude: -58.4453, direction: 'ida', avg_wait_minutes: 10, total_daily_users: 320 },
    { id: 'l5-s2',  line_id: 'line-5', name: 'Lugones y Salgero',        street_name: 'Av. Lugones 2600',            stop_number: 2, latitude: -34.5680, longitude: -58.4290, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 260 },
    { id: 'l5-s3',  line_id: 'line-5', name: 'Libertador y Salgero',     street_name: 'Av. del Libertador 3200',     stop_number: 3, latitude: -34.5760, longitude: -58.4250, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 240 },
    { id: 'l5-s4',  line_id: 'line-5', name: 'Santa Fe y Medrano',       street_name: 'Av. Santa Fe 4600',           stop_number: 4, latitude: -34.5908, longitude: -58.4280, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 280 },
    { id: 'l5-s5',  line_id: 'line-5', name: 'Corrientes y Medrano',     street_name: 'Av. Corrientes 4300',         stop_number: 5, latitude: -34.6057, longitude: -58.4172, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 320 },
    { id: 'l5-s6',  line_id: 'line-5', name: 'Rivadavia y Medrano',      street_name: 'Av. Rivadavia 4300',          stop_number: 6, latitude: -34.6165, longitude: -58.4150, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 290 },
    { id: 'l5-s7',  line_id: 'line-5', name: 'Boedo y San Juan',         street_name: 'Av. Boedo 1100',              stop_number: 7, latitude: -34.6253, longitude: -58.4090, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 200 },
    { id: 'l5-s8',  line_id: 'line-5', name: 'Av. Caseros y Boedo',      street_name: 'Av. Caseros 2200',            stop_number: 8, latitude: -34.6308, longitude: -58.4030, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 170 },
    { id: 'l5-s9',  line_id: 'line-5', name: 'Constitución - Final',     street_name: 'Av. Brasil 1400',             stop_number: 9, latitude: -34.6268, longitude: -58.3808, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 290 },
  ],
  // Line 88: Hospital Italiano → San Telmo
  'line-6': [
    { id: 'l6-s1',  line_id: 'line-6', name: 'Hospital Italiano',        street_name: 'Av. Juan D. Perón 4190',      stop_number: 1, latitude: -34.6060, longitude: -58.4300, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 230 },
    { id: 'l6-s2',  line_id: 'line-6', name: 'Rivadavia y Medrano',      street_name: 'Av. Rivadavia 4200',          stop_number: 2, latitude: -34.6165, longitude: -58.4150, direction: 'ida', avg_wait_minutes: 6,  total_daily_users: 200 },
    { id: 'l6-s3',  line_id: 'line-6', name: 'Av. Callao y Corrientes',  street_name: 'Av. Callao 1200',             stop_number: 3, latitude: -34.6042, longitude: -58.3940, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 270 },
    { id: 'l6-s4',  line_id: 'line-6', name: 'Florida y Corrientes',     street_name: 'Florida 800',                 stop_number: 4, latitude: -34.6040, longitude: -58.3745, direction: 'ida', avg_wait_minutes: 4,  total_daily_users: 410 },
    { id: 'l6-s5',  line_id: 'line-6', name: 'Av. de Mayo y Lima',       street_name: 'Av. de Mayo 1200',            stop_number: 5, latitude: -34.6087, longitude: -58.3760, direction: 'ida', avg_wait_minutes: 5,  total_daily_users: 340 },
    { id: 'l6-s6',  line_id: 'line-6', name: 'Chile y Defensa',          street_name: 'Chile 500',                   stop_number: 6, latitude: -34.6155, longitude: -58.3710, direction: 'ida', avg_wait_minutes: 7,  total_daily_users: 200 },
    { id: 'l6-s7',  line_id: 'line-6', name: 'Independencia y Defensa',  street_name: 'Independencia 600',           stop_number: 7, latitude: -34.6195, longitude: -58.3700, direction: 'ida', avg_wait_minutes: 8,  total_daily_users: 160 },
    { id: 'l6-s8',  line_id: 'line-6', name: 'San Telmo - Final',        street_name: 'Av. San Juan 400',            stop_number: 8, latitude: -34.6228, longitude: -58.3700, direction: 'ida', avg_wait_minutes: 9,  total_daily_users: 130 },
  ],
  // Line 102: Retiro → Palermo → Flores → Liniers
  'line-7': [
    { id: 'l7-s1',  line_id: 'line-7', name: 'Retiro',                   street_name: 'Av. del Libertador 100',      stop_number: 1, latitude: -34.5924, longitude: -58.3740, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 350 },
    { id: 'l7-s2',  line_id: 'line-7', name: 'Santa Fe y Callao',        street_name: 'Av. Santa Fe 1500',           stop_number: 2, latitude: -34.5972, longitude: -58.3930, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 300 },
    { id: 'l7-s3',  line_id: 'line-7', name: 'Córdoba y Pueyrredón',     street_name: 'Av. Córdoba 2500',            stop_number: 3, latitude: -34.5968, longitude: -58.4010, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 270 },
    { id: 'l7-s4',  line_id: 'line-7', name: 'Corrientes y Pueyrredón',  street_name: 'Av. Corrientes 3300',         stop_number: 4, latitude: -34.6052, longitude: -58.4050, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 310 },
    { id: 'l7-s5',  line_id: 'line-7', name: 'Rivadavia y Pueyrredón',   street_name: 'Av. Rivadavia 3300',          stop_number: 5, latitude: -34.6150, longitude: -58.4040, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 340 },
    { id: 'l7-s6',  line_id: 'line-7', name: 'Carabobo y Rivadavia',     street_name: 'Av. Rivadavia 4900',          stop_number: 6, latitude: -34.6200, longitude: -58.4340, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 240 },
    { id: 'l7-s7',  line_id: 'line-7', name: 'Juan B. Justo y Fragata',  street_name: 'Av. Juan B. Justo 6500',      stop_number: 7, latitude: -34.6275, longitude: -58.4570, direction: 'ida', avg_wait_minutes: 7, total_daily_users: 180 },
    { id: 'l7-s8',  line_id: 'line-8', name: 'General Paz y Rivadavia',  street_name: 'Av. Gral. Paz 5000',          stop_number: 8, latitude: -34.6348, longitude: -58.4780, direction: 'ida', avg_wait_minutes: 9, total_daily_users: 140 },
    { id: 'l7-s9',  line_id: 'line-7', name: 'Liniers - Final',          street_name: 'Av. Rivadavia 11000',         stop_number: 9, latitude: -34.6380, longitude: -58.5210, direction: 'ida', avg_wait_minutes: 12, total_daily_users: 110 },
  ],
  // Line 115: Belgrano → Palermo → Caballito
  'line-8': [
    { id: 'l8-s1',  line_id: 'line-8', name: 'Belgrano - Cabildo',       street_name: 'Av. Cabildo 2800',            stop_number: 1, latitude: -34.5606, longitude: -58.4569, direction: 'ida', avg_wait_minutes: 7, total_daily_users: 280 },
    { id: 'l8-s2',  line_id: 'line-8', name: 'Cabildo y Monroe',         street_name: 'Av. Cabildo 2200',            stop_number: 2, latitude: -34.5660, longitude: -58.4500, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 240 },
    { id: 'l8-s3',  line_id: 'line-8', name: 'Libertador y Salgero',     street_name: 'Av. del Libertador 3200',     stop_number: 3, latitude: -34.5760, longitude: -58.4250, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 200 },
    { id: 'l8-s4',  line_id: 'line-8', name: 'Santa Fe y Scalabrini',    street_name: 'Av. Santa Fe 4000',           stop_number: 4, latitude: -34.5930, longitude: -58.4200, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 270 },
    { id: 'l8-s5',  line_id: 'line-8', name: 'Corrientes y Scalabrini',  street_name: 'Av. Corrientes 4800',         stop_number: 5, latitude: -34.6060, longitude: -58.4250, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 310 },
    { id: 'l8-s6',  line_id: 'line-8', name: 'Rivadavia y Scalabrini',   street_name: 'Av. Rivadavia 4700',          stop_number: 6, latitude: -34.6170, longitude: -58.4230, direction: 'ida', avg_wait_minutes: 5, total_daily_users: 280 },
    { id: 'l8-s7',  line_id: 'line-8', name: 'Caballito - Rivadavia',    street_name: 'Av. Rivadavia 5400',          stop_number: 7, latitude: -34.6205, longitude: -58.4350, direction: 'ida', avg_wait_minutes: 6, total_daily_users: 220 },
    { id: 'l8-s8',  line_id: 'line-8', name: 'Caballito - Final',        street_name: 'Av. Directorio 1500',         stop_number: 8, latitude: -34.6270, longitude: -58.4320, direction: 'ida', avg_wait_minutes: 8, total_daily_users: 160 },
  ],
}

// ─── Simulator ────────────────────────────────────────────────────────────────
interface MockBusState {
  bus: BusPosition
  stopIndex: number
  progress: number      // 0–1 between current and next stop
  direction: 1 | -1
  pauseUntil: number    // ms timestamp; 0 = moving
}

// Module-level mutable state — one entry per bus
const STATE: Map<string, MockBusState> = new Map()
let lastTick = 0

function makeBus(lineId: string, unitNum: number, stopIndex: number): MockBusState {
  const stops = MOCK_STOPS[lineId]
  const line  = MOCK_LINES.find(l => l.id === lineId)!
  const stop  = stops[stopIndex]
  const names = ['Carlos Gómez', 'María Torres', 'Roberto Silva', 'Ana Martínez', 'Luis Fernández']
  const bus: BusPosition = {
    id:              `mock-${lineId}-${unitNum}`,
    driver_id:       `mock-driver-${lineId}-${unitNum}`,
    line_id:         lineId,
    line_number:     line.line_number,
    bus_unit:        `${line.line_number}-${String(unitNum).padStart(3, '0')}`,
    driver_name:     names[unitNum % names.length],
    latitude:        stop.latitude,
    longitude:       stop.longitude,
    heading:         0,
    speed_kmh:       0,
    next_stop_id:    stops[Math.min(stopIndex + 1, stops.length - 1)].id,
    next_stop_name:  stops[Math.min(stopIndex + 1, stops.length - 1)].name,
    eta_minutes:     2,
    status:          'at_stop',
    passenger_count: Math.floor(Math.random() * 25) + 5,
    timestamp:       new Date().toISOString(),
  }
  return {
    bus,
    stopIndex,
    progress:    0,
    direction:   1,
    // Stagger departure: first bus leaves in 2s, second in 5s
    pauseUntil:  Date.now() + 2000 + unitNum * 3000,
  }
}

export function initMockBuses() {
  // Always reinitialise so switching lines always gets fresh buses
  STATE.clear()
  lastTick = Date.now()

  MOCK_LINES.forEach(line => {
    const stops = MOCK_STOPS[line.id]
    if (!stops || stops.length < 2) return
    // Place 2 buses at different points on the route
    const a = Math.floor(stops.length * 0.15)
    const b = Math.floor(stops.length * 0.55)
    STATE.set(`${line.id}-0`, makeBus(line.id, 0, a))
    STATE.set(`${line.id}-1`, makeBus(line.id, 1, b))
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
  // dt in seconds since last tick, clamped to 2s max to avoid huge jumps
  const dt    = Math.min((now - lastTick) / 1000, 2)
  lastTick    = now

  const out: BusPosition[] = []

  STATE.forEach(s => {
    const stops = MOCK_STOPS[s.bus.line_id]
    if (!stops || stops.length < 2) return

    // ── Paused at stop ──
    if (s.pauseUntil > now) {
      s.bus.status    = 'at_stop'
      s.bus.speed_kmh = 0
      s.bus.timestamp = new Date().toISOString()
      out.push({ ...s.bus })
      return
    }

    const curStop  = stops[s.stopIndex]
    const nextIdx  = s.stopIndex + s.direction

    // Reached end of route → reverse
    if (nextIdx < 0 || nextIdx >= stops.length) {
      s.direction  = s.direction === 1 ? -1 : 1
      s.pauseUntil = now + 4000
      out.push({ ...s.bus })
      return
    }

    const nextStop = stops[nextIdx]

    // Distance between stops in degrees; 1° ≈ 111 km
    const dLat   = nextStop.latitude  - curStop.latitude
    const dLng   = nextStop.longitude - curStop.longitude
    const distDeg = Math.sqrt(dLat * dLat + dLng * dLng)
    const distKm  = distDeg * 111

    // Speed in degrees/second (avg 28 km/h in city)
    const speedKmh    = 28
    const speedDegSec = speedKmh / 111 / 3600

    // How much progress to add this tick
    const step = distDeg > 0 ? (speedDegSec * dt) / distDeg : 1
    s.progress = Math.min(s.progress + step, 1)

    // Interpolate position
    s.bus.latitude   = curStop.latitude  + dLat * s.progress
    s.bus.longitude  = curStop.longitude + dLng * s.progress
    s.bus.heading    = heading(curStop.latitude, curStop.longitude, nextStop.latitude, nextStop.longitude)
    s.bus.speed_kmh  = Math.round(speedKmh)
    s.bus.status     = 'moving'
    s.bus.next_stop_name = nextStop.name
    s.bus.next_stop_id   = nextStop.id
    const remainingDist  = distKm * (1 - s.progress)
    s.bus.eta_minutes    = Math.max(1, Math.ceil(remainingDist / (speedKmh / 60)))
    s.bus.timestamp      = new Date().toISOString()

    // Arrived
    if (s.progress >= 1) {
      s.stopIndex  = nextIdx
      s.progress   = 0
      s.bus.status     = 'at_stop'
      s.bus.latitude   = nextStop.latitude
      s.bus.longitude  = nextStop.longitude
      s.bus.speed_kmh  = 0
      s.bus.passenger_count = Math.max(0, s.bus.passenger_count + Math.floor(Math.random() * 8) - 3)
      s.pauseUntil = now + 3000 + Math.random() * 5000
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
export function getLineBounds(lineId: string): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
  const stops = MOCK_STOPS[lineId]
  if (!stops || stops.length === 0) return null
  return {
    minLat: Math.min(...stops.map(s => s.latitude)),
    maxLat: Math.max(...stops.map(s => s.latitude)),
    minLng: Math.min(...stops.map(s => s.longitude)),
    maxLng: Math.max(...stops.map(s => s.longitude)),
  }
}

export const MOCK_ROUTES: Record<string, { name: string; direction: 'ida' | 'vuelta' }[]> = Object.fromEntries(
  MOCK_LINES.map(line => [
    line.id,
    (MOCK_STOPS[line.id] || []).map(s => ({ name: s.name, direction: s.direction }))
  ])
)