import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'

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
  const lineId = searchParams.get('line_id')
  const range  = searchParams.get('range') || '7d'
  const days   = range === '30d' ? 30 : range === '7d' ? 7 : 1
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')

  // Active buses
  const { count: activeBuses } = await supabase
    .from('bus_positions')
    .select('*', { count: 'exact', head: true })
    .eq('line_id', lineId || '')
    .neq('status', 'offline')
    .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())

  // Online drivers
  const { count: onlineDrivers } = await supabase
    .from('driver_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('line_id', lineId || '')
    .eq('is_online', true)

  // Total app users
  const { count: totalAppUsers } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })

  // Pending reports
  const { count: pendingReports } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    .eq('line_id', lineId || '')

  // Hourly for today
  const { data: hourlyData } = await supabase
    .from('passenger_events')
    .select('event_hour')
    .eq('line_id', lineId || '')
    .eq('event_type', 'board')
    .eq('event_date', format(new Date(), 'yyyy-MM-dd'))

  const hourlyCounts: Record<number, number> = {}
  ;(hourlyData || []).forEach((e: { event_hour: number }) => {
    hourlyCounts[e.event_hour] = (hourlyCounts[e.event_hour] || 0) + 1
  })

  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, '0')}:00`,
    passengers: hourlyCounts[h] || 0,
  }))

  const peakHour = hourly.reduce(
    (max, h) => h.passengers > max.passengers ? h : max,
    hourly[0]
  )

  return NextResponse.json({
    activeBuses:    activeBuses    || 0,
    onlineDrivers:  onlineDrivers  || 0,
    totalAppUsers:  totalAppUsers  || 0,
    pendingReports: pendingReports || 0,
    todayPassengers: Object.values(hourlyCounts).reduce((a, b) => a + b, 0),
    peakHour: peakHour.hour,
    hourly,
  })
}