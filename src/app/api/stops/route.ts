import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lineId = searchParams.get('line_id')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '500'

  const supabase = createServerSupabase()

  // Nearby stops using PostGIS
  if (lat && lng) {
    const { data, error } = await supabase.rpc('get_nearby_stops', {
      user_lat: parseFloat(lat),
      user_lng: parseFloat(lng),
      radius_meters: parseInt(radius),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  // All stops for a line
  if (lineId) {
    const { data, error } = await supabase
      .from('bus_stops')
      .select('*')
      .eq('line_id', lineId)
      .order('stop_number', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Se requiere line_id o lat+lng' }, { status: 400 })
}