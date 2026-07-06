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
  { id: 'line-tourist-yellow', line_number: 'T-Amarillo', name: 'Bus Turístico Amarillo', color: '#F59E0B', company: 'Buenos Aires City Tour', total_stops: 9, is_active: true, is_tourist: true },
  { id: 'line-tourist-red', line_number: 'T-Rojo', name: 'Bus Turístico Rojo', color: '#EF4444', company: 'Gray Line Argentina', total_stops: 9, is_active: true, is_tourist: true },
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

import stopIntersections from './stops_intersection_map.json'

// Helper to convert stop height names to clean intersections
export function getIntersectionForStopName(stopName: string, lat: number, lng: number): string {
  const coordKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  const mapped = (stopIntersections as any)[coordKey] || (stopIntersections as any)[stopName];
  if (mapped && mapped.includes(' y ')) {
    return mapped;
  }

  const name = stopName.trim().toUpperCase();
  const match = name.match(/^(\d+)\s+(.+)$/);
  if (!match) {
    return stopName;
  }

  const height = parseInt(match[1], 10);
  const street = match[2].replace(/\bAV\b|\bAVENIDA\b/g, '').replace(/\bMANUEL\b|\bGENERAL\b|\bMANUEL AUGUSTO\b/g, '').trim();

  const cleanStr = (s: string) => {
    return s.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Rule-based dictionary for major avenues/streets
  if (street.includes('SANTA FE')) {
    if (height >= 1800 && height < 2000) return 'Av. Santa Fe y Riobamba';
    if (height >= 2000 && height < 2100) return 'Av. Santa Fe y Ayacucho';
    if (height >= 2100 && height < 2200) return 'Av. Santa Fe y Junín';
    if (height >= 2200 && height < 2300) return 'Av. Santa Fe y Uriburu';
    if (height >= 2300 && height < 2400) return 'Av. Santa Fe y Azcuénaga';
    if (height >= 2400 && height < 2600) return 'Av. Santa Fe y Pueyrredón';
    if (height >= 2600 && height < 2700) return 'Av. Santa Fe y Ecuador';
    if (height >= 2700 && height < 2800) return 'Av. Santa Fe y Anchorena';
    if (height >= 2800 && height < 2900) return 'Av. Santa Fe y Laprida';
    if (height >= 2900 && height < 3000) return 'Av. Santa Fe y Agüero';
    if (height >= 3000 && height < 3100) return 'Av. Santa Fe y Austria';
    if (height >= 3100 && height < 3200) return 'Av. Santa Fe y Billinghurst';
    if (height >= 3200 && height < 3400) return 'Av. Santa Fe y Coronel Díaz';
    if (height >= 3400 && height < 3500) return 'Av. Santa Fe y Bulnes';
    if (height >= 3500 && height < 3600) return 'Av. Santa Fe y Salguero';
    if (height >= 3600 && height < 3800) return 'Av. Santa Fe y Scalabrini Ortiz';
    if (height >= 3800 && height < 3900) return 'Av. Santa Fe y Aráoz';
    if (height >= 3900 && height < 4000) return 'Av. Santa Fe y Gurruchaga';
    if (height >= 4000 && height < 4100) return 'Av. Santa Fe y Armenia';
    if (height >= 4100 && height < 4200) return 'Av. Santa Fe y Thames';
    if (height >= 4200 && height < 4300) return 'Av. Santa Fe y Uriarte';
    if (height >= 4300 && height < 4400) return 'Av. Santa Fe y Plaza Italia';
    if (height >= 4400 && height < 4600) return 'Av. Santa Fe y Av. Juan B. Justo';
    return `Av. Santa Fe ${height}`;
  }

  if (street.includes('LAS HERAS')) {
    if (height >= 1600 && height < 1800) return 'Av. Las Heras y Montevideo';
    if (height >= 1800 && height < 1900) return 'Av. Las Heras y Av. Callao';
    if (height >= 1900 && height < 2000) return 'Av. Las Heras y Ayacucho';
    if (height >= 2000 && height < 2100) return 'Av. Las Heras y Junín';
    if (height >= 2100 && height < 2200) return 'Av. Las Heras y Uriburu';
    if (height >= 2200 && height < 2300) return 'Av. Las Heras y Cantilo';
    if (height >= 2300 && height < 2400) return 'Av. Las Heras y Av. Pueyrredón';
    if (height >= 2400 && height < 2600) return 'Av. Las Heras y Laprida';
    if (height >= 2600 && height < 2700) return 'Av. Las Heras y Agüero';
    if (height >= 2700 && height < 2800) return 'Av. Las Heras y Austria';
    if (height >= 2800 && height < 3000) return 'Av. Las Heras y Billinghurst';
    if (height >= 3000 && height < 3300) return 'Av. Las Heras y Av. Coronel Díaz';
    if (height >= 3300 && height < 3500) return 'Av. Las Heras y Av. Scalabrini Ortiz';
    if (height >= 3500 && height < 3700) return 'Av. Las Heras y Lafinur';
    if (height >= 3700) return 'Av. Las Heras y Plaza Italia';
    return `Av. Las Heras ${height}`;
  }

  if (street.includes('PUEYRREDON')) {
    if (height >= 0 && height < 200) return 'Av. Pueyrredón y Bartolomé Mitre';
    if (height >= 200 && height < 400) return 'Av. Pueyrredón y Sarmiento';
    if (height >= 400 && height < 600) return 'Av. Pueyrredón y Av. Corrientes';
    if (height >= 600 && height < 800) return 'Av. Pueyrredón y Av. Córdoba';
    if (height >= 800 && height < 1000) return 'Av. Pueyrredón y Paraguay';
    if (height >= 1000 && height < 1200) return 'Av. Pueyrredón y Av. Santa Fe';
    if (height >= 1200 && height < 1400) return 'Av. Pueyrredón y Juncal';
    if (height >= 1400 && height < 1600) return 'Av. Pueyrredón y French';
    if (height >= 1600) return 'Av. Pueyrredón y Av. Las Heras';
    return `Av. Pueyrredón ${height}`;
  }

  if (street.includes('ENTRE RIOS')) {
    if (height >= 0 && height < 200) return 'Av. Entre Ríos y Alsina';
    if (height >= 200 && height < 400) return 'Av. Entre Ríos y Av. Belgrano';
    if (height >= 400 && height < 600) return 'Av. Entre Ríos y México';
    if (height >= 600 && height < 800) return 'Av. Entre Ríos y Av. Independencia';
    if (height >= 800 && height < 1000) return 'Av. Entre Ríos y Carlos Calvo';
    if (height >= 1000 && height < 1200) return 'Av. Entre Ríos y Humberto I';
    if (height >= 1200 && height < 1400) return 'Av. Entre Ríos y Av. San Juan';
    if (height >= 1400) return 'Av. Entre Ríos y Av. Caseros';
    return `Av. Entre Ríos ${height}`;
  }

  if (street.includes('CALLAO')) {
    if (height >= 0 && height < 200) return 'Av. Callao y Bartolomé Mitre';
    if (height >= 200 && height < 400) return 'Av. Callao y Av. Corrientes';
    if (height >= 400 && height < 600) return 'Av. Callao y Lavalle';
    if (height >= 600 && height < 800) return 'Av. Callao y Tucumán';
    if (height >= 800 && height < 1000) return 'Av. Callao y Av. Córdoba';
    if (height >= 1000 && height < 1200) return 'Av. Callao y Av. Santa Fe';
    if (height >= 1200 && height < 1400) return 'Av. Callao y Juncal';
    if (height >= 1400) return 'Av. Callao y Av. Las Heras';
    return `Av. Callao ${height}`;
  }

  if (street.includes('MONTES DE OCA')) {
    if (height >= 0 && height < 200) return 'Av. Montes de Oca y Bernardo de Irigoyen';
    if (height >= 200 && height < 400) return 'Av. Montes de Oca y Finochietto';
    if (height >= 400 && height < 600) return 'Av. Montes de Oca y Guanahani';
    if (height >= 600 && height < 800) return 'Av. Montes de Oca y Brandsen';
    if (height >= 800 && height < 1000) return 'Av. Montes de Oca y Olavarría';
    if (height >= 1000 && height < 1200) return 'Av. Montes de Oca y Rocha';
    if (height >= 1200 && height < 1400) return 'Av. Montes de Oca y Luján';
    if (height >= 1400 && height < 1600) return 'Av. Montes de Oca y California';
    if (height >= 1600 && height < 1800) return 'Av. Montes de Oca y Av. Iriarte';
    if (height >= 1800) return 'Av. Montes de Oca y Osvaldo Cruz';
    return `Av. Montes de Oca ${height}`;
  }

  if (street.includes('VELEZ SARSFIELD')) {
    if (height >= 200 && height < 400) return 'Av. Vélez Sársfield y Av. Caseros';
    if (height >= 400 && height < 600) return 'Av. Vélez Sársfield y Pepirí';
    if (height >= 600 && height < 800) return 'Av. Vélez Sársfield y Iguazú';
    if (height >= 800 && height < 1000) return 'Av. Vélez Sársfield y Zavaleta';
    if (height >= 1000 && height < 1200) return 'Av. Vélez Sársfield y Lafayette';
    if (height >= 1200 && height < 1400) return 'Av. Vélez Sársfield y Suárez';
    if (height >= 1400 && height < 1600) return 'Av. Vélez Sársfield y Olavarría';
    if (height >= 1600) return 'Av. Vélez Sársfield y Lamadrid';
    return `Av. Vélez Sársfield ${height}`;
  }

  if (street.includes('VIEYTES')) {
    if (height >= 1400 && height < 1600) return 'Vieytes y California';
    if (height >= 1600 && height < 1800) return 'Vieytes y Av. Iriarte';
    if (height >= 1800 && height < 1900) return 'Vieytes y Pedro de Luján';
    if (height >= 1900) return 'Vieytes y Suárez';
    return `Vieytes ${height}`;
  }

  if (street.includes('CALIFORNIA')) {
    if (height >= 1900 && height < 2100) return 'California y Vieytes';
    if (height >= 2100 && height < 2300) return 'California y Av. Montes de Oca';
    if (height >= 2300) return 'California y Herrera';
    return `California ${height}`;
  }

  if (street.includes('CONSTITUCION')) {
    if (height >= 1100 && height < 1300) return 'Constitución y Lima';
    if (height >= 1300 && height < 1500) return 'Constitución y Santiago del Estero';
    if (height >= 1500 && height < 1700) return 'Constitución y Sáenz Peña';
    if (height >= 1700) return 'Constitución y Av. Entre Ríos';
    return `Constitución ${height}`;
  }

  if (street.includes('RIOBAMBA')) {
    if (height >= 200 && height < 400) return 'Riobamba y Av. Corrientes';
    if (height >= 400 && height < 600) return 'Riobamba y Lavalle';
    if (height >= 600 && height < 800) return 'Riobamba y Tucumán';
    if (height >= 800 && height < 1000) return 'Riobamba y Av. Córdoba';
    if (height >= 1000 && height < 1200) return 'Riobamba y Av. Santa Fe';
    if (height >= 1200) return 'Riobamba y Arenales';
    return `Riobamba ${height}`;
  }

  if (street.includes('CABILDO')) {
    if (height >= 1000 && height < 1200) return 'Av. Cabildo y Céspedes';
    if (height >= 1200 && height < 1400) return 'Av. Cabildo y Zabala';
    if (height >= 1400 && height < 1600) return 'Av. Cabildo y Virrey del Pino';
    if (height >= 1600 && height < 1800) return 'Av. Cabildo y Virrey Loreto';
    if (height >= 1800 && height < 2000) return 'Av. Cabildo y La Pampa';
    if (height >= 2000 && height < 2200) return 'Av. Cabildo y Echeverría';
    if (height >= 2200 && height < 2400) return 'Av. Cabildo y Juramento';
    if (height >= 2400 && height < 2600) return 'Av. Cabildo y Blanco Encalada';
    if (height >= 2600 && height < 2800) return 'Av. Cabildo y Av. Monroe';
    if (height >= 2800 && height < 3000) return 'Av. Cabildo y Av. Congreso';
    if (height >= 3000 && height < 3200) return 'Av. Cabildo y Iberá';
    if (height >= 3200 && height < 3400) return 'Av. Cabildo y Quesada';
    if (height >= 3400 && height < 3600) return 'Av. Cabildo y Juana Azurduy';
    if (height >= 3600 && height < 3800) return 'Av. Cabildo y Crisólogo Larralde';
    if (height >= 3800) return 'Av. Cabildo y General Paz';
    return `Av. Cabildo ${height}`;
  }

  const cleanedStreet = cleanStr(street);
  return `${cleanedStreet} ${height}`;
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
      return dirObj.stops.map((stop, index) => {
        const cleanName = getIntersectionForStopName(stop.name, stop.lat, stop.lng);
        return {
          id: `${line.id}-official-${stop.id}-${direction}`,
          line_id: line.id,
          name: cleanName,
          street_name: cleanName,
          stop_number: index + 1,
          latitude: stop.lat,
          longitude: stop.lng,
          direction: direction,
          avg_wait_minutes: 6,
          total_daily_users: 120,
          pathIndex: (stop as any).pathIndex,
        };
      })
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

export interface MockPlace {
  id: string
  name: string
  lat: number
  lng: number
  description: string
  rating: number
  city: 'buenos_aires' | 'santa_cruz'
  type: 'tourist' | 'clubbing' | 'shopping'
  imageUrl?: string
}

export const MOCK_PLACES: MockPlace[] = [
  // Clubs & Bars (Buenos Aires)
  { id: 'c-1', name: 'Niceto Club', lat: -34.5882, lng: -58.4358, rating: 4.6, city: 'buenos_aires', type: 'clubbing', description: 'Club emblemático de Palermo, famoso por sus fiestas y recitales en vivo.', imageUrl: 'https://images.unsplash.com/photo-1543791187-df796fc118b7?w=500&q=80' },
  { id: 'c-2', name: 'Kika Club', lat: -34.5862, lng: -58.4300, rating: 4.2, city: 'buenos_aires', type: 'clubbing', description: 'Popular club nocturno en Palermo con música electrónica y pop.', imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=500&q=80' },
  { id: 'c-3', name: 'Crobar', lat: -34.5721, lng: -58.4230, rating: 4.4, city: 'buenos_aires', type: 'clubbing', description: 'Templo de la música electrónica ubicado en los bosques de Palermo.', imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80' },
  { id: 'c-4', name: 'Rose in Rio', lat: -34.5501, lng: -58.4201, rating: 4.5, city: 'buenos_aires', type: 'clubbing', description: 'Club premium en la Costanera Norte con vista al río y terraza al aire libre.', imageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=500&q=80' },
  { id: 'c-5', name: 'Uptown', lat: -34.5855, lng: -58.4350, rating: 4.7, city: 'buenos_aires', type: 'clubbing', description: 'Bar temático oculto ambientado como una estación de subte de Nueva York.', imageUrl: 'https://images.unsplash.com/photo-1601574901248-9c900ed31014?w=500&q=80' },
  // Clubs & Bars (Santa Cruz)
  { id: 'c-6', name: 'Vintage Club', lat: -17.7712, lng: -63.1812, rating: 4.5, city: 'santa_cruz', type: 'clubbing', description: 'Exclusivo bar/discoteca de música crossover en la zona de Equipetrol.', imageUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=500&q=80' },
  { id: 'c-7', name: 'Duda Pop Bar', lat: -17.7831, lng: -63.1824, rating: 4.6, city: 'santa_cruz', type: 'clubbing', description: 'Bar de tragos con excelente ambiente y música pop/rock.', imageUrl: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=500&q=80' },

  // Malls & Galleries (Buenos Aires)
  { id: 'm-1', name: 'Alto Palermo Shopping', lat: -34.5887, lng: -58.4116, rating: 4.5, city: 'buenos_aires', type: 'shopping', description: 'Uno de los centros comerciales más importantes, ubicado en Palermo.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Alto_Palermo_%28Avenida_Santa_Fe%29.jpg' },
  { id: 'm-2', name: 'Galerías Pacífico', lat: -34.5996, lng: -58.3750, rating: 4.7, city: 'buenos_aires', type: 'shopping', description: 'Centro comercial histórico con arquitectura majestuosa y murales artísticos.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Buenos_Aires_-_Galer%C3%ADas_Pac%C3%ADfico.jpg' },
  { id: 'm-3', name: 'Abasto Shopping', lat: -34.6030, lng: -58.4110, rating: 4.4, city: 'buenos_aires', type: 'shopping', description: 'Gran shopping ubicado en el antiguo mercado de abasto, con cines y entretenimientos.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b2/Abasto_de_Buenos_Aires.jpg' },
  { id: 'm-4', name: 'Recoleta Mall', lat: -34.5880, lng: -58.3930, rating: 4.3, city: 'buenos_aires', type: 'shopping', description: 'Shopping moderno en el corazón de Recoleta frente al cementerio.', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Recoleta_Mall.jpg' },
  // Malls & Galleries (Santa Cruz)
  { id: 'm-5', name: 'Las Brisas Shopping', lat: -17.7511, lng: -63.1750, rating: 4.6, city: 'santa_cruz', type: 'shopping', description: 'Moderno y amplio centro comercial con marcas internacionales.', imageUrl: 'https://images.unsplash.com/photo-1581579438747-1dc8d1e0ca96?w=500&q=80' },
  { id: 'm-6', name: 'Ventura Mall', lat: -17.7700, lng: -63.1930, rating: 4.7, city: 'santa_cruz', type: 'shopping', description: 'El centro comercial más grande de la ciudad con un gran patio de comidas y tiendas.', imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=80' },

  // Tourist Attractions (Buenos Aires)
  { id: 't-1', name: 'Obelisco', lat: -34.6037, lng: -58.3816, rating: 4.8, city: 'buenos_aires', type: 'tourist', description: 'Monumento nacional icónico de Buenos Aires en la Av. 9 de Julio.' },
  { id: 't-2', name: 'Casa Rosada', lat: -34.6081, lng: -58.3703, rating: 4.7, city: 'buenos_aires', type: 'tourist', description: 'Sede del Poder Ejecutivo frente a la histórica Plaza de Mayo.' },
  { id: 't-3', name: 'Teatro Colón', lat: -34.6011, lng: -58.3831, rating: 4.9, city: 'buenos_aires', type: 'tourist', description: 'Reconocido mundialmente por su acústica y belleza arquitectónica.' },
  { id: 't-4', name: 'Caminito (La Boca)', lat: -34.6398, lng: -58.3628, rating: 4.6, city: 'buenos_aires', type: 'tourist', description: 'Calle peatonal famosa por sus casas de colores de chapa y conventillos.' },
  { id: 't-5', name: 'Cementerio de Recoleta', lat: -34.5875, lng: -58.3916, rating: 4.7, city: 'buenos_aires', type: 'tourist', description: 'Museo a cielo abierto con mausoleos históricos y esculturas de mármol.' },
  { id: 't-9', name: 'Café Tortoni', lat: -34.6089, lng: -58.3787, rating: 4.7, city: 'buenos_aires', type: 'tourist', description: 'El café más antiguo y emblemático de Buenos Aires, fundado en 1858. Un templo de la cultura porteña, el tango y la literatura.' },
  { id: 't-10', name: 'Palacio Barolo', lat: -34.6096, lng: -58.3853, rating: 4.8, city: 'buenos_aires', type: 'tourist', description: 'Un imponente edificio de oficinas de 1923 cuya arquitectura está inspirada en la Divina Comedia de Dante Alighieri.' },
  { id: 't-11', name: 'MALBA', lat: -34.5772, lng: -58.4023, rating: 4.8, city: 'buenos_aires', type: 'tourist', description: 'El prestigioso Museo de Arte Latinoamericano de Buenos Aires, hogar de una notable colección de arte del siglo XX y contemporáneo.' },
  { id: 't-12', name: 'Jardín Japonés', lat: -34.5751, lng: -58.4090, rating: 4.7, city: 'buenos_aires', type: 'tourist', description: 'Un oasis de tranquilidad tradicional japonés con un estanque de peces koi, puentes rojos y una casa de té clásica.' },
  { id: 't-13', name: 'Floralis Genérica', lat: -34.5816, lng: -58.3978, rating: 4.7, city: 'buenos_aires', type: 'tourist', description: 'Una escultura metálica gigante de una flor que abre sus pétalos con la luz del día y los cierra de noche.' },
  { id: 't-14', name: 'Usina del Arte', lat: -34.6283, lng: -58.3619, rating: 4.6, city: 'buenos_aires', type: 'tourist', description: 'Centro cultural multidisciplinario ubicado en una antigua usina eléctrica de estilo neorrenacentista florentino en La Boca.' },
  { id: 't-15', name: 'Centro Cultural Kirchner', lat: -34.6033, lng: -58.3698, rating: 4.7, city: 'buenos_aires', type: 'tourist', description: 'El centro cultural más grande de América Latina, instalado en el restaurado Palacio de Correos.' },
  { id: 't-16', name: 'Plaza Dorrego', lat: -34.6203, lng: -58.3718, rating: 4.6, city: 'buenos_aires', type: 'tourist', description: 'Histórica plaza de San Telmo, famosa por su feria dominical de antigüedades y las parejas bailando tango al aire libre.' },
  { id: 't-17', name: 'Monumento a los Dos Congresos', lat: -34.6099, lng: -58.3897, rating: 4.5, city: 'buenos_aires', type: 'tourist', description: 'Monumento escultórico frente al Palacio del Congreso que rinde homenaje a la Asamblea del Año XIII y al Congreso de Tucumán.' },
  // Tourist Attractions (Santa Cruz)
  { id: 't-6', name: 'Plaza 24 de Septiembre', lat: -17.7834, lng: -63.1819, rating: 4.7, city: 'santa_cruz', type: 'tourist', description: 'Plaza de armas histórica rodeada de cafés y la Catedral Metropolitana.' },
  { id: 't-7', name: 'Catedral Metropolitana', lat: -17.7840, lng: -63.1820, rating: 4.8, city: 'santa_cruz', type: 'tourist', description: 'Majestuosa catedral de ladrillo visto con vista panorámica desde el mirador.' },
  { id: 't-8', name: 'Biocentro Güembé', lat: -17.7810, lng: -63.2450, rating: 4.8, city: 'santa_cruz', type: 'tourist', description: 'Gran parque ecológico con mariposario, piscinas naturales y lagunas.' }
]
