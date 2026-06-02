// src/app/api/buses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MOCK_LINES, tickMockBuses, getDirectionForBus } from '@/lib/mockData'
import type { BusPosition } from '@/types'

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lineId = searchParams.get('line_id')
  const lineNumber = searchParams.get('line_number')

  if (!lineId || !lineNumber) {
    return NextResponse.json({ error: 'line_id and line_number are required' }, { status: 400 })
  }

  const clientId = process.env.GCBA_CLIENT_ID
  const clientSecret = process.env.GCBA_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('GCBA API credentials are not configured in environment variables.')
  }

  // Bypass TLS certificate checks to prevent government server SSL handshake errors
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

  const url = `https://apitransporte.buenosaires.gob.ar/colectivos/vehiclePositionsSimple?client_id=${clientId}&client_secret=${clientSecret}`

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000) // 6s timeout for resilience

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`GCBA API returned status ${response.status}`)
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      throw new Error('GCBA API response is not an array')
    }

    // Match exclusively by route_short_name prefix (e.g. 12A, 12B, 12, but not 123) to avoid agency-internal route_id clashes
    const regex = new RegExp(`^0*${lineNumber}(?![0-9])`, 'i')
    const matchedBuses = data.filter(b => regex.test(b.route_short_name))

    if (matchedBuses.length === 0) {
      console.log(`No active buses found in GCBA API for Line ${lineNumber}. Falling back to simulation.`);
      return returnSimulatedBuses(lineId, lineNumber)
    }

    const drivers = LINE_DRIVERS[lineNumber] || ['Chofer Auxiliar']
    
    // Map GCBA data to our internal BusPosition format
    const mappedBuses: BusPosition[] = matchedBuses.map((b, index) => {
      const driverName = drivers[index % drivers.length]
      const speedKmh = Math.round(b.speed * 3.6) // speed in GCBA is m/s
      const direction = b.direction === 1 ? 'vuelta' : 'ida' // GCBA direction: 0 = Outbound/Ida, 1 = Inbound/Vuelta
      
      return {
        id: `real-${lineId}-${b.id || index}`,
        driver_id: `real-driver-${lineId}-${index}`,
        line_id: lineId,
        line_number: lineNumber,
        bus_unit: `${lineNumber}-${String(100 + (index % 900))}`,
        driver_name: driverName,
        latitude: b.latitude,
        longitude: b.longitude,
        heading: b.bearing || 0,
        speed_kmh: speedKmh,
        next_stop_id: `stop-${lineNumber}-${index}`,
        next_stop_name: b.trip_headsign || 'Siguiente parada',
        eta_minutes: speedKmh > 5 ? Math.max(1, Math.ceil(3 / (speedKmh / 60))) : 5,
        status: speedKmh > 2 ? 'moving' : 'stopped',
        passenger_count: 0,
        timestamp: new Date(b.timestamp * 1000).toISOString(),
        reports_count: index % 4 === 0 ? 1 : 0,
        direction: direction
      }
    })

    return NextResponse.json({ data: mappedBuses, count: mappedBuses.length, source: 'realtime' })
  } catch (error: any) {
    console.error(`GCBA API error for Line ${lineNumber}:`, error.message, '. Falling back to simulation.')
    return returnSimulatedBuses(lineId, lineNumber)
  }
}

function returnSimulatedBuses(lineId: string, lineNumber: string) {
  const ticked = tickMockBuses()
  const simulated = ticked.filter(b => b.line_id === lineId || b.line_number === lineNumber)
  return NextResponse.json({ data: simulated, count: simulated.length, source: 'simulation' })
}