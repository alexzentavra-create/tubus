import { createServerSupabase } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { format, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const lineId = searchParams.get('line_id')
  const range = searchParams.get('range') || '7d'

  const days = range === '30d' ? 30 : range === '7d' ? 7 : 1
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')

  // Active buses right now
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

  // Daily passenger counts
  const { data: dailyData } = await supabase
    .from('passenger_events')
    .select('date, event_type')
    .eq('line_id', lineId || '')
    .eq('event_type', 'board')
    .gte('date', startDate)

  const dailyCounts: Record<string, number> = {}
  ;(dailyData || []).forEach((e: { date: string }) => {
    dailyCounts[e.date] = (dailyCounts[e.date] || 0) + 1
  })

  // Hourly breakdown for today
  const { data: hourlyData } = await supabase
    .from('passenger_events')
    .select('hour')
    .eq('line_id', lineId || '')
    .eq('event_type', 'board')
    .eq('date', format(new Date(), 'yyyy-MM-dd'))

  const hourlyCounts: Record<number, number> = {}
  ;(hourlyData || []).forEach((e: { hour: number }) => {
    hourlyCounts[e.hour] = (hourlyCounts[e.hour] || 0) + 1
  })

  const hourly = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${h.toString().padStart(2, '0')}:00`,
    passengers: hourlyCounts[h] || 0,
  }))

  // Peak hour
  const peakHour = hourly.reduce((max, h) => h.passengers > max.passengers ? h : max, hourly[0])

  // Top stops
  const { data: topStopsData } = await supabase
    .from('passenger_events')
    .select('stop_id, bus_stops!stop_id(name, street_name)')
    .eq('line_id', lineId || '')
    .eq('event_type', 'board')
    .eq('date', format(new Date(), 'yyyy-MM-dd'))

  const stopCounts: Record<string, { name: string; street: string; count: number }> = {}
  ;(topStopsData || []).forEach((e: any) => {
    const id = e.stop_id
    if (!stopCounts[id]) stopCounts[id] = { name: e.bus_stops?.name, street: e.bus_stops?.street_name, count: 0 }
    stopCounts[id].count++
  })

  const topStops = Object.values(stopCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return NextResponse.json({
    activeBuses: activeBuses || 0,
    onlineDrivers: onlineDrivers || 0,
    totalAppUsers: totalAppUsers || 0,
    pendingReports: pendingReports || 0,
    todayPassengers: Object.values(hourlyCounts).reduce((a, b) => a + b, 0),
    peakHour: peakHour.hour,
    hourly,
    daily: Object.entries(dailyCounts).map(([date, count]) => ({ date, count })),
    topStops,
  })
}