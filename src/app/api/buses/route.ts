import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lineId = searchParams.get('line_id')

  if (!lineId) {
    return NextResponse.json({ error: 'line_id is required' }, { status: 400 })
  }

  const supabase = createServerSupabase()

  // Only return buses active in last 5 minutes
  const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('bus_positions')
    .select(`
      id,
      driver_id,
      bus_unit,
      latitude,
      longitude,
      heading,
      speed_kmh,
      status,
      passenger_count,
      eta_minutes,
      timestamp,
      profiles!driver_id ( name ),
      bus_lines!line_id ( line_number, color ),
      bus_stops!next_stop_id ( name, street_name )
    `)
    .eq('line_id', lineId)
    .neq('status', 'offline')
    .gte('timestamp', cutoff)
    .order('timestamp', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten the joined data
  const buses = (data || []).map((b: any) => ({
    id: b.id,
    driver_id: b.driver_id,
    driver_name: b.profiles?.name || 'Chofer',
    bus_unit: b.bus_unit,
    line_number: b.bus_lines?.line_number,
    latitude: b.latitude,
    longitude: b.longitude,
    heading: b.heading,
    speed_kmh: b.speed_kmh,
    status: b.status,
    passenger_count: b.passenger_count,
    eta_minutes: b.eta_minutes,
    next_stop_name: b.bus_stops?.name,
    timestamp: b.timestamp,
  }))

  return NextResponse.json({ data: buses, count: buses.length })
}