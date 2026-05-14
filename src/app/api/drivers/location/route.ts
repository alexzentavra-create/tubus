import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'driver') {
    return NextResponse.json({ error: 'Solo choferes pueden enviar ubicación' }, { status: 403 })
  }

  const body = await request.json()

  if (!body.line_id || !body.bus_unit || body.latitude == null || body.longitude == null) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  const validStatuses = ['moving', 'stopped', 'at_stop', 'offline']
  const status = validStatuses.includes(body.status) ? body.status : 'moving'

  const { error } = await supabase
    .from('bus_positions')
    .upsert({
      driver_id:       user.id,
      line_id:         body.line_id,
      bus_unit:        body.bus_unit,
      latitude:        body.latitude,
      longitude:       body.longitude,
      heading:         body.heading    || 0,
      speed_kmh:       body.speed_kmh  || 0,
      status,
      next_stop_id:    body.next_stop_id  || null,
      eta_minutes:     body.eta_minutes   || null,
      passenger_count: body.passenger_count || 0,
      timestamp:       new Date().toISOString(),
    }, { onConflict: 'driver_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Keep is_online in sync
  await supabase
    .from('driver_profiles')
    .update({ is_online: status !== 'offline' })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}