import { randomUUID } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server'

async function authorizeLineAdmin() {
  const auth = createServerSupabase()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return null
  const { data: profile } = await auth.from('profiles').select('role').eq('id', user.id).single()
  return ['company_admin', 'company', 'admin', 'superadmin'].includes(String(profile?.role || '').toLowerCase()) ? user : null
}

async function resolveLine(lineNumber: string) {
  const db = createAdminSupabase()
  const { data } = await db.from('bus_lines').select('id,line_number,name,company').eq('line_number', lineNumber).maybeSingle()
  return data
}

function uniqueByUnit(rows: any[]) {
  const byUnit = new Map<string, any>()
  rows.forEach(row => {
    const unit = String(row.bus_unit || '').trim().toLowerCase()
    if (unit && !byUnit.has(unit)) byUnit.set(unit, row)
  })
  return Array.from(byUnit.values())
}

export async function GET(request: NextRequest) {
  if (!await authorizeLineAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const lineNumber = String(request.nextUrl.searchParams.get('line_number') || '').trim()
  const line = await resolveLine(lineNumber)
  if (!line) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })

  const db = createAdminSupabase()
  const { data, error } = await db.from('bus_qr_codes').select('*').eq('line_id', line.id).order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, line, data: uniqueByUnit(data || []) })
}

export async function POST(request: NextRequest) {
  if (!await authorizeLineAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const lineNumber = String(body.lineNumber || '').trim()
  const busUnit = String(body.busUnit || '').trim()
  if (!lineNumber || !busUnit || busUnit.length > 80) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })
  const line = await resolveLine(lineNumber)
  if (!line) return NextResponse.json({ error: 'Línea no encontrada' }, { status: 404 })

  const db = createAdminSupabase()
  const { data: existing } = await db.from('bus_qr_codes').select('*').eq('line_id', line.id).ilike('bus_unit', busUnit).order('created_at', { ascending: false })
  if (existing?.length) {
    const canonical = existing[0]
    if (!canonical.is_active) await db.from('bus_qr_codes').update({ is_active: true }).eq('id', canonical.id)
    return NextResponse.json({ success: true, existing: true, data: { ...canonical, is_active: true } })
  }

  const qrToken = `QR-L${lineNumber}-${busUnit}-${randomUUID().replace(/-/g, '').slice(0, 12)}`
  const { data, error } = await db.from('bus_qr_codes').insert({
    line_id: line.id, bus_unit: busUnit, qr_token: qrToken, is_active: true
  }).select().single()
  if (error || !data) return NextResponse.json({ error: error?.message || 'No se pudo crear el QR' }, { status: 500 })
  return NextResponse.json({ success: true, existing: false, data })
}

export async function DELETE(request: NextRequest) {
  if (!await authorizeLineAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const lineNumber = String(body.lineNumber || '').trim()
  const busUnit = String(body.busUnit || '').trim()
  const line = await resolveLine(lineNumber)
  if (!line || !busUnit) return NextResponse.json({ error: 'Datos inválidos' }, { status: 422 })

  const db = createAdminSupabase()
  const endedAt = new Date().toISOString()
  await db.from('driver_sessions').update({ is_active: false, ended_at: endedAt }).eq('line_id', line.id).ilike('bus_unit', busUnit)
  await db.from('bus_positions').update({ status: 'offline', timestamp: endedAt }).eq('line_id', line.id).ilike('bus_unit', busUnit)
  const { error } = await db.from('bus_qr_codes').delete().eq('line_id', line.id).ilike('bus_unit', busUnit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
