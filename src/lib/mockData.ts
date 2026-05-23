// src/lib/mockData.ts
// Replace these with real DB data later

import type { BusLine, BusStop } from '@/types'

export const MOCK_LINES: BusLine[] = [
  { id: 'line-1',  line_number: '12',  name: 'Línea 12 - Terminal / Barrio Norte',     color: '#22D3A0', company: 'TrBus S.A.',       total_stops: 38, is_active: true },
  { id: 'line-2',  line_number: '24',  name: 'Línea 24 - Centro / Villa del Parque',   color: '#60A5FA', company: 'MetroBus S.A.',    total_stops: 42, is_active: true },
  { id: 'line-3',  line_number: '37',  name: 'Línea 37 - Aeropuerto / Centro',         color: '#F59E0B', company: 'AeroBus Ltda.',    total_stops: 29, is_active: true },
  { id: 'line-4',  line_number: '55',  name: 'Línea 55 - Estadio / Zona Sur',          color: '#F87171', company: 'SurBus S.A.',      total_stops: 51, is_active: true },
  { id: 'line-5',  line_number: '71',  name: 'Línea 71 - Universidad / Av. Principal', color: '#A78BFA', company: 'UniTrans S.A.',    total_stops: 33, is_active: true },
  { id: 'line-6',  line_number: '88',  name: 'Línea 88 - Hospital / Mercado Central',  color: '#34D399', company: 'MediTrans Ltda.',  total_stops: 27, is_active: true },
  { id: 'line-7',  line_number: '102', name: 'Línea 102 - Puerto / Zona Oeste',        color: '#FB923C', company: 'PuertoTrans S.A.', total_stops: 44, is_active: true },
  { id: 'line-8',  line_number: '115', name: 'Línea 115 - Shopping / Cementerio',      color: '#E879F9', company: 'TrBus S.A.',       total_stops: 36, is_active: true },
]

// Mock routes: each line has a set of stops (simplified — replace with real coords)
export const MOCK_ROUTES: Record<string, { name: string; direction: 'ida' | 'vuelta' }[]> = {
  'line-1': [
    { name: 'Terminal Central',       direction: 'ida' },
    { name: 'Av. Libertad y Mitre',   direction: 'ida' },
    { name: 'Plaza San Martín',       direction: 'ida' },
    { name: 'Calle Belgrano 450',     direction: 'ida' },
    { name: 'Barrio Norte - Final',   direction: 'ida' },
  ],
  'line-2': [
    { name: 'Centro - Obelisco',      direction: 'ida' },
    { name: 'Av. Corrientes 1200',    direction: 'ida' },
    { name: 'Pque. Centenario',       direction: 'ida' },
    { name: 'Villa del Parque - Fin', direction: 'ida' },
  ],
  'line-3': [
    { name: 'Aeropuerto Intl.',       direction: 'ida' },
    { name: 'Autopista km 12',        direction: 'ida' },
    { name: 'Av. Maipú 800',          direction: 'ida' },
    { name: 'Centro - Catedral',      direction: 'ida' },
  ],
  'line-4': [
    { name: 'Estadio Municipal',      direction: 'ida' },
    { name: 'Av. del Trabajo 500',    direction: 'ida' },
    { name: 'Zona Industrial Sur',    direction: 'ida' },
    { name: 'Zona Sur - Final',       direction: 'ida' },
  ],
  'line-5': [
    { name: 'Universidad Nacional',   direction: 'ida' },
    { name: 'Facultad de Medicina',   direction: 'ida' },
    { name: 'Av. Principal 1500',     direction: 'ida' },
    { name: 'Av. Principal - Final',  direction: 'ida' },
  ],
  'line-6': [
    { name: 'Hospital Público',       direction: 'ida' },
    { name: 'Farmacia Central',       direction: 'ida' },
    { name: 'Mercado Central',        direction: 'ida' },
  ],
  'line-7': [
    { name: 'Puerto Viejo',           direction: 'ida' },
    { name: 'Costanera Norte',        direction: 'ida' },
    { name: 'Av. del Puerto 200',     direction: 'ida' },
    { name: 'Zona Oeste - Final',     direction: 'ida' },
  ],
  'line-8': [
    { name: 'Shopping Plaza',         direction: 'ida' },
    { name: 'Av. Rivadavia 3000',     direction: 'ida' },
    { name: 'Cementerio Municipal',   direction: 'ida' },
  ],
}