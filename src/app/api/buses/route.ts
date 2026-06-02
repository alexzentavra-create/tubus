// src/app/api/buses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { MOCK_LINES } from '@/lib/mockData'
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
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout for resilience

    console.log(`[GCBA API] Fetching vehicle positions for Line ${lineNumber} from URL: ${url}`)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    console.log(`[GCBA API] Response status code: ${response.status} for Line ${lineNumber}`)
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`GCBA API returned status ${response.status}: ${errText}`)
    }

    const data = await response.json()
    console.log(`[GCBA API] Successfully parsed JSON. Received ${Array.isArray(data) ? data.length : 'non-array'} items from GCBA.`)

    if (!Array.isArray(data)) {
      throw new Error('GCBA API response is not an array')
    }

    // Match by route_short_name or route_id with loose matching and stripping of leading zeros
    const regex = new RegExp(`^0*${lineNumber}(?![0-9])`, 'i')
    const matchedBuses = data.filter(b => {
      const rsn = (b.route_short_name || '').toString().trim()
      const rid = (b.route_id || '').toString().trim()
      return regex.test(rsn) || regex.test(rid) || rsn.replace(/^0+/, '') === lineNumber || rid.replace(/^0+/, '') === lineNumber
    })

    console.log(`[GCBA API] Line ${lineNumber}: Filtered ${matchedBuses.length} matching buses out of ${data.length} total.`)

    if (matchedBuses.length === 0) {
      console.warn(`[GCBA API] Line ${lineNumber}: No matching vehicles found in GCBA payload.`)
      return NextResponse.json({ data: [], count: 0, source: 'realtime' })
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
    console.error(`[GCBA API ERROR] Error processing vehicle positions for Line ${lineNumber}:`, error)
    return NextResponse.json({ data: [], count: 0, source: 'realtime', error: error.message })
  }
}