import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

// POST — create a report
export async function POST(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const body = await request.json()

  const validTypes = ['no_paro','conduccion_peligrosa','mal_trato','vehiculo_defectuoso','no_llego','otro']

  if (!body.driver_id || !body.line_id || !body.type || !body.description) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 422 })
  }

  if (!validTypes.includes(body.type)) {
    return NextResponse.json({ error: 'Tipo de denuncia inválido' }, { status: 422 })
  }

  if (body.description.length < 3 || body.description.length > 500) {
    return NextResponse.json({ error: 'Descripción debe tener entre 3 y 500 caracteres' }, { status: 422 })
  }

  const { error, data } = await supabase.from('reports').insert({
    reporter_id: user.id,
    driver_id:   body.driver_id,
    line_id:     body.line_id,
    stop_id:     body.stop_id || null,
    bus_unit:    body.bus_unit || null,
    type:        body.type,
    description: body.description,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data }, { status: 201 })
}

// GET — list reports (admin only)
export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const lineId = searchParams.get('line_id')
  const page = parseInt(searchParams.get('page') || '1')
  const perPage = 20

  let query = supabase
    .from('reports')
    .select(`
      *,
      profiles!reporter_id ( name, email ),
      driver_profiles!driver_id ( bus_unit, driver_number ),
      bus_lines!line_id ( line_number )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1)

  if (status) query = query.eq('status', status)
  if (lineId) query = query.eq('line_id', lineId)

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    total: count,
    page,
    per_page: perPage,
    total_pages: Math.ceil((count || 0) / perPage),
  })
}