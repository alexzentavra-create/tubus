// src/app/api/buses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import type { BusPosition } from '@/types'
import { OFFICIAL_ROUTES } from '@/lib/officialRoutes'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)

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

function getHeading(pt1: { lat: number; lng: number }, pt2: { lat: number; lng: number }): number {
  const dy = pt2.lat - pt1.lat
  const dx = pt2.lng - pt1.lng
  return Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360)
}

function generateFallbackSimulatedBuses(lineId: string, lineNumber: string): BusPosition[] {
  return []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lineId = searchParams.get('line_id')
  const lineNumber = searchParams.get('line_number')

  if (!lineId || !lineNumber) {
    return NextResponse.json({ error: 'line_id and line_number are required' }, { status: 400 })
  }

  // 1. Fetch active buses from Supabase
  let activeDbBuses: BusPosition[] = []
  try {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data: dbBuses, error: dbError } = await supabase
      .from('bus_positions')
      .select(`
        id, driver_id, line_id, bus_unit, latitude, longitude,
        heading, speed_kmh, status, passenger_count,
        eta_minutes, timestamp,
        profiles!driver_id ( name )
      `)
      .eq('line_id', lineId)
      .neq('status', 'offline')
      .gte('timestamp', cutoff)

    if (!dbError && dbBuses) {
      activeDbBuses = dbBuses.map((b: any) => ({
        id: b.id,
        driver_id: b.driver_id,
        line_id: b.line_id,
        line_number: lineNumber,
        bus_unit: b.bus_unit,
        driver_name: b.profiles?.name || 'Chofer Real',
        latitude: Number(b.latitude),
        longitude: Number(b.longitude),
        heading: Number(b.heading || 0),
        speed_kmh: Number(b.speed_kmh || 0),
        next_stop_id: `stop-${lineNumber}-active`,
        next_stop_name: 'Recorrido Activo',
        eta_minutes: Number(b.eta_minutes || 5),
        status: b.status || 'stopped',
        passenger_count: Number(b.passenger_count || 0),
        timestamp: b.timestamp,
        reports_count: 0,
        direction: 'ida',
        ramal: `${lineNumber}-A`
      }))
    }
  } catch (err) {
    console.error('[API Buses] Error querying Supabase active buses:', err)
  }

  const apiKey = process.env.TRANSITLAND_API_KEY || 'dummy_transitland_key'
  const url = `https://transit.land/api/v2/rest/vehicles?apikey=${apiKey}`

  try {
    console.log(`[Transitland API] Fetching real-time vehicles for Line ${lineNumber} from URL: ${url}`)
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BienParada Buenos Aires'
      }
    })

    console.log(`[Transitland API] Response status code: ${response.status} for Line ${lineNumber}`)
    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Transitland API returned status ${response.status}: ${errText}`)
    }

    const data = await response.json()
    const vehiclesList = data.vehicles || []
    console.log(`[Transitland API] Successfully parsed JSON. Received ${vehiclesList.length} items from Transitland.`)

    // Filter vehicles by matching the requested route / line number
    const regex = new RegExp(`^0*${lineNumber}(?![0-9])`, 'i')
    const matchedVehicles = vehiclesList.filter((v: any) => {
      const rsn = (v.route_short_name || '').toString().trim()
      const rid = (v.route_id || '').toString().trim()
      const roid = (v.route_onestop_id || '').toString().trim()
      return regex.test(rsn) || regex.test(rid) || regex.test(roid) || 
             rsn.replace(/^0+/, '') === lineNumber || 
             rid.replace(/^0+/, '') === lineNumber ||
             roid.replace(/^0+/, '') === lineNumber
    })

    console.log(`[Transitland API] Line ${lineNumber}: Filtered ${matchedVehicles.length} matching buses out of ${vehiclesList.length} total.`)

    if (matchedVehicles.length === 0) {
      console.warn(`[Transitland API] Line ${lineNumber}: No matching vehicles found in Transitland payload. Generating fallback simulation...`)
      const fallbackBuses = generateFallbackSimulatedBuses(lineId, lineNumber)
      
      // Merge active drivers from DB and filter out simulated versions of the same units
      const activeUnits = new Set(activeDbBuses.map(b => b.bus_unit))
      const filteredFallback = fallbackBuses.filter(b => !activeUnits.has(b.bus_unit))
      const combined = [...activeDbBuses, ...filteredFallback]
      
      return NextResponse.json({ data: combined, count: combined.length, source: 'simulation' })
    }

    const drivers = LINE_DRIVERS[lineNumber] || ['Chofer Auxiliar']

    // Map Transitland vehicle telemetry to our internal BusPosition format
    const mappedBuses: BusPosition[] = matchedVehicles.map((v: any, index: number) => {
      const driverName = drivers[index % drivers.length]
      const speedKmh = v.speed_kmh !== undefined ? Math.round(v.speed_kmh) : (v.speed !== undefined ? Math.round(v.speed * 3.6) : 25)
      
      const dirVal = v.direction_id !== undefined ? v.direction_id : (v.direction !== undefined ? v.direction : 0)
      const direction = (dirVal === 1 || dirVal === 'vuelta' || dirVal === '1') ? 'vuelta' : 'ida'

      const lat = v.latitude !== undefined ? v.latitude : (v.geometry?.coordinates?.[1] !== undefined ? v.geometry.coordinates[1] : 0)
      const lng = v.longitude !== undefined ? v.longitude : (v.geometry?.coordinates?.[0] !== undefined ? v.geometry.coordinates[0] : 0)

      return {
        id: `real-${lineId}-${v.id || v.vehicle_id || index}`,
        driver_id: `real-driver-${lineId}-${index}`,
        line_id: lineId,
        line_number: lineNumber,
        bus_unit: `${lineNumber}-${String(100 + (index % 900))}`,
        driver_name: driverName,
        latitude: lat,
        longitude: lng,
        heading: v.bearing || v.heading || 0,
        speed_kmh: speedKmh,
        next_stop_id: `stop-${lineNumber}-${index}`,
        next_stop_name: v.trip_headsign || v.headsign || 'Siguiente parada',
        eta_minutes: speedKmh > 5 ? Math.max(1, Math.ceil(3 / (speedKmh / 60))) : 5,
        status: speedKmh > 2 ? 'moving' : 'stopped',
        passenger_count: 0,
        timestamp: v.timestamp ? new Date(v.timestamp).toISOString() : new Date().toISOString(),
        reports_count: index % 4 === 0 ? 1 : 0,
        direction: direction,
        ramal: v.route_onestop_id || v.route_id || v.shape_id || `${lineNumber}-A`
      }
    })

    // Merge active drivers from DB and filter out real-time versions of the same units
    const activeUnits = new Set(activeDbBuses.map(b => b.bus_unit))
    const filteredRealtime = mappedBuses.filter(b => !activeUnits.has(b.bus_unit))
    const combined = [...activeDbBuses, ...filteredRealtime]

    return NextResponse.json({ data: combined, count: combined.length, source: 'realtime' })
  } catch (error: any) {
    console.error(`[Transitland API ERROR] Error processing vehicle positions for Line ${lineNumber}:`, error)
    console.log(`[Transitland API] Generating fallback simulated buses...`)
    const fallbackBuses = generateFallbackSimulatedBuses(lineId, lineNumber)
    
    // Merge active drivers from DB and filter out simulated versions of the same units
    const activeUnits = new Set(activeDbBuses.map(b => b.bus_unit))
    const filteredFallback = fallbackBuses.filter(b => !activeUnits.has(b.bus_unit))
    const combined = [...activeDbBuses, ...filteredFallback]
    
    return NextResponse.json({ data: combined, count: combined.length, source: 'simulation' })
  }
}