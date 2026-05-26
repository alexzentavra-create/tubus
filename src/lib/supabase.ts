// ─── Browser client (use in components/hooks) ─────────────────────────────
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  return createBrowserClient(url, key)
}

// ─── Realtime subscription helpers ────────────────────────────────────────

import { RealtimeChannel } from '@supabase/supabase-js'
import type { BusPosition } from '@/types'

/**
 * Subscribe to live bus positions for a specific line.
 * Uses Supabase Realtime on the bus_positions table.
 */
export function subscribeToBusLine(
  lineId: string,
  onUpdate: (positions: BusPosition[]) => void
): RealtimeChannel {
  const supabase = createClient()

  const channel = supabase
    .channel(`line-${lineId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'bus_positions',
        filter: `line_id=eq.${lineId}`,
      },
      async () => {
        // Re-fetch all active positions for this line
        const { data } = await supabase
          .from('bus_positions')
          .select(`
            *,
            profiles!driver_id(name),
            bus_lines!line_id(line_number, color),
            bus_stops!next_stop_id(name)
          `)
          .eq('line_id', lineId)
          .neq('status', 'offline')
          .gte('timestamp', new Date(Date.now() - 5 * 60 * 1000).toISOString())

        if (data) onUpdate(data as unknown as BusPosition[])
      }
    )
    .subscribe()

  return channel
}

/**
 * Publish driver location — called every 5s from the driver app.
 * Uses an upsert so each driver has only one "current" row.
 */
export async function publishDriverLocation(payload: {
  driverId: string
  lineId: string
  busUnit: string
  lat: number
  lng: number
  heading: number
  speedKmh: number
  status: 'moving' | 'stopped' | 'at_stop'
  nextStopId?: string
  etaMinutes?: number
  passengerCount: number
}) {
  const supabase = createClient()

  const { error } = await supabase.from('bus_positions').upsert(
    {
      driver_id: payload.driverId,
      line_id: payload.lineId,
      bus_unit: payload.busUnit,
      latitude: payload.lat,
      longitude: payload.lng,
      heading: payload.heading,
      speed_kmh: payload.speedKmh,
      status: payload.status,
      next_stop_id: payload.nextStopId,
      eta_minutes: payload.etaMinutes,
      passenger_count: payload.passengerCount,
      timestamp: new Date().toISOString(),
    },
    { onConflict: 'driver_id' }
  )

  return { error }
}