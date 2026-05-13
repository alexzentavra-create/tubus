import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const LocationSchema = z.object({
  line_id: z.string().uuid(),
  bus_unit: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  heading: z.number().min(0).max(360).default(0),
  speed_kmh: z.number().min(0).default(0),
  status: z.enum(['moving', 'stopped', 'at_stop', 'offline']).default('moving'),
  next_stop_id: z.string().uuid().optional(),
  eta_minutes: z.number().optional(),
  passenger_count: z.number().min(0).default(0),
})

export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Verify driver role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'driver') return NextResponse.json({ error: 'Solo choferes pueden enviar ubicación' }, { status: 403 })

  const body = await request.json()
  const parsed = LocationSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 422 })

  const payload = {
    driver_id: user.id,
    ...parsed.data,
    timestamp: new Date().toISOString(),
  }

  // Upsert: one row per driver (their "current" position)
  const { error } = await supabase
    .from('bus_positions')
    .upsert(payload, { onConflict: 'driver_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Keep driver_profiles.is_online in sync
  await supabase
    .from('driver_profiles')
    .update({ is_online: parsed.data.status !== 'offline' })
    .eq('id', user.id)

  return NextResponse.json({ success: true })
}