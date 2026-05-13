'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Search, ChevronDown, Users, X } from 'lucide-react'
import { createClient, subscribeToBusLine } from '@/lib/supabase'
import type { BusPosition, BusLine, BusStop } from '@/types'
import ReportModal from '@/components/user/ReportModal'
import BusInfoSheet from '@/components/user/BusInfoSheet'
import LineSelector from '@/components/user/LineSelector'
import NearbyStops from '@/components/user/NearbyStops'

const BA = { longitude: -58.4173, latitude: -34.6037 }
const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

export default function UserMapPage() {
  const supabase = createClient()
  const channelRef = useRef<ReturnType<typeof subscribeToBusLine> | null>(null)

  const [buses, setBuses] = useState<BusPosition[]>([])
  const [lines, setLines] = useState<BusLine[]>([])
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null)
  const [selectedBus, setSelectedBus] = useState<BusPosition | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [showLineSelector, setShowLineSelector] = useState(false)
  const [nearbyStops, setNearbyStops] = useState<BusStop[]>([])
  const [viewState, setViewState] = useState({ ...BA, zoom: 13, pitch: 30, bearing: 0 })

  useEffect(() => {
    supabase.from('bus_lines').select('*').eq('is_active', true).then(({ data }) => { if (data) setLines(data) })
  }, [])

  useEffect(() => {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    if (!selectedLine) { setBuses([]); return }
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    supabase.from('bus_positions').select('*,profiles!driver_id(name)').eq('line_id', selectedLine.id).neq('status','offline').gte('timestamp', cutoff)
      .then(({ data }) => { if (data) setBuses(data as unknown as BusPosition[]) })
    channelRef.current = subscribeToBusLine(selectedLine.id, setBuses)
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current) }
  }, [selectedLine])

  const handleLocated = useCallback((e: any) => {
    const { latitude, longitude } = e.coords
    supabase.rpc('get_nearby_stops', { user_lat: latitude, user_lng: longitude })
      .then(({ data }) => { if (data) setNearbyStops(data) })
  }, [])

  const handleBusClick = (bus: BusPosition) => {
    setSelectedBus(bus)
    setViewState(v => ({ ...v, longitude: bus.longitude, latitude: bus.latitude, zoom: 15 }))
  }

  return (
    <div style={{ position:'relative', width:'100vw', height:'100vh', overflow:'hidden', background:'var(--void)' }}>

      {/* MAP */}
      <Map
        {...viewState}
        onMove={e => setViewState(e.viewState)}
        mapboxAccessToken={TOKEN}
        mapStyle="mapbox://styles/mapbox/navigation-night-v1"
        style={{ width:'100%', height:'100%' }}
      >
        <NavigationControl position="bottom-right" />
        <GeolocateControl position="bottom-right" trackUserLocation showUserHeading onGeolocate={handleLocated as any} />

        {buses.map(bus => (
          <Marker key={bus.id} longitude={bus.longitude} latitude={bus.latitude} anchor="center" rotation={bus.heading} rotationAlignment="map" onClick={() => handleBusClick(bus)}>
            <PremiumBusMarker bus={bus} lineColor={selectedLine?.color || '#B8C8E0'} isSelected={selectedBus?.id === bus.id} />
          </Marker>
        ))}

        {nearbyStops.map((stop: BusStop) => (
          <Marker key={stop.id} longitude={stop.longitude} latitude={stop.latitude} anchor="center">
            <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'rgba(184,200,224,0.6)', border:'2px solid rgba(184,200,224,0.3)', boxShadow:'0 0 8px rgba(184,200,224,0.3)' }} />
          </Marker>
        ))}

        {selectedBus && (
          <Popup longitude={selectedBus.longitude} latitude={selectedBus.latitude} anchor="bottom" offset={44} closeButton={false} onClose={() => setSelectedBus(null)}>
            <MiniPopup bus={selectedBus} />
          </Popup>
        )}
      </Map>

      {/* TOP BAR */}
      <div style={{ position:'absolute', top:0, left:0, right:0, zIndex:10, padding:'16px 16px 0' }}>
        <motion.div
          initial={{ y:-60, opacity:0 }}
          animate={{ y:0, opacity:1 }}
          transition={{ type:'spring', damping:26, stiffness:200 }}
          style={{ display:'flex', alignItems:'center', gap:'12px', background:'linear-gradient(145deg,rgba(19,25,33,0.97),rgba(10,14,20,0.99))', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)', border:'1px solid rgba(184,200,224,0.12)', borderRadius:'16px', padding:'10px 14px', boxShadow:'0 8px 40px rgba(0,0,0,0.7), 0 1px 0 rgba(184,200,224,0.06) inset', position:'relative', overflow:'hidden' }}
        >
          {/* Top shine */}
          <div style={{ position:'absolute', top:0, left:'15%', right:'15%', height:'1px', background:'linear-gradient(90deg,transparent,rgba(184,200,224,0.3),transparent)' }} />

          {/* Logo */}
          <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'linear-gradient(145deg,#1E2638,#131921)', border:'1px solid rgba(184,200,224,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 2px 8px rgba(0,0,0,0.5)' }}>
            <Bus size={16} style={{ color:'var(--platinum)' }} />
          </div>

          <div style={{ width:'1px', height:'24px', background:'rgba(184,200,224,0.1)', flexShrink:0 }} />

          {/* Line selector trigger */}
          <button onClick={() => setShowLineSelector(true)} style={{ flex:1, display:'flex', alignItems:'center', gap:'10px', background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left' }}>
            {selectedLine ? (
              <>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:selectedLine.color, flexShrink:0, boxShadow:`0 0 8px ${selectedLine.color}80` }} />
                <span className="font-display" style={{ color:'var(--text-primary)', fontWeight:600, fontSize:'14px', letterSpacing:'-0.01em' }}>Línea {selectedLine.line_number}</span>
                <span style={{ color:'var(--text-muted)', fontSize:'12px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, display:'none' }} className="sm:block">
                  {selectedLine.name.split(' - ')[1]}
                </span>
              </>
            ) : (
              <>
                <Search size={14} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                <span style={{ color:'var(--text-muted)', fontSize:'14px', fontFamily:'DM Sans' }}>Elegí una línea...</span>
              </>
            )}
            <ChevronDown size={14} style={{ color:'var(--text-muted)', marginLeft:'auto', flexShrink:0 }} />
          </button>

          {/* Live count pill */}
          {buses.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'5px 10px', borderRadius:'999px', background:'rgba(34,211,160,0.08)', border:'1px solid rgba(34,211,160,0.2)', flexShrink:0 }}>
              <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--go)', animation:'pulseNeon 2s ease-in-out infinite' }} />
              <span style={{ color:'var(--go)', fontSize:'11px', fontFamily:'DM Mono', fontWeight:600 }}>{buses.length} en ruta</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* BOTTOM SHEETS */}
      <AnimatePresence>
        {selectedBus ? (
          <BusInfoSheet key="bus" bus={selectedBus} onClose={() => setSelectedBus(null)} onReport={() => setShowReport(true)} />
        ) : nearbyStops.length > 0 && !selectedLine ? (
          <NearbyStops key="stops" stops={nearbyStops} />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showLineSelector && (
          <LineSelector lines={lines} selectedLine={selectedLine} onSelect={l => { setSelectedLine(l); setShowLineSelector(false) }} onClose={() => setShowLineSelector(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReport && selectedBus && (
          <ReportModal bus={selectedBus} onClose={() => { setShowReport(false) }} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ─── Premium Bus Marker ──────────────────────────────────────────────────── */
function PremiumBusMarker({ bus, lineColor, isSelected }: { bus: BusPosition; lineColor: string; isSelected: boolean }) {
  const isMoving = bus.status === 'moving'
  const color = isMoving ? lineColor : bus.status === 'at_stop' ? '#F0B429' : '#FF4D6A'

  return (
    <div className={`bus-marker ${isSelected ? 'selected' : ''}`} style={{ position:'relative', width:'48px', height:'48px' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        {/* Outer pulse rings — only when moving */}
        {isMoving && <>
          <circle cx="24" cy="24" r="20" fill={color} fillOpacity="0.06" className="bus-ring-1" />
          <circle cx="24" cy="24" r="16" fill={color} fillOpacity="0.08" className="bus-ring-2" />
        </>}
        {/* Outer ring */}
        <circle cx="24" cy="24" r="14" fill={color} fillOpacity={isSelected ? 0.25 : 0.12} />
        {/* Border circle */}
        <circle cx="24" cy="24" r="13" fill="none" stroke={color} strokeOpacity={isSelected ? 0.8 : 0.4} strokeWidth="1" />
        {/* Inner fill */}
        <circle cx="24" cy="24" r="10" fill={color} fillOpacity={isMoving ? 0.9 : 0.7} />
        {/* Bus icon — simplified */}
        <path d="M18 20h12v7H18zM18 21.5h12M18 24.5h12M20 27v1.5M28 27v1.5M19 20v-1c0-.6.4-1 1-1h8c.6 0 1 .4 1 1v1" stroke="rgba(6,8,16,0.9)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Direction dot */}
        <circle cx="24" cy="11" r="2.5" fill={color} fillOpacity="0.5" />
        <circle cx="24" cy="11" r="1.5" fill="white" fillOpacity="0.7" />
      </svg>
      {/* Passenger badge */}
      {bus.passenger_count > 0 && (
        <div style={{ position:'absolute', top:'-2px', right:'-2px', minWidth:'16px', height:'16px', borderRadius:'8px', background:'rgba(10,14,20,0.95)', border:'1px solid rgba(184,200,224,0.2)', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px' }}>
          <span style={{ fontSize:'9px', fontFamily:'DM Mono', fontWeight:600, color:'var(--platinum-dim)' }}>{bus.passenger_count}</span>
        </div>
      )}
    </div>
  )
}

/* ─── Mini popup ─────────────────────────────────────────────────────────── */
function MiniPopup({ bus }: { bus: BusPosition }) {
  const statusLabel: Record<string, string> = { moving:'En movimiento', stopped:'Detenido', at_stop:'En parada', offline:'Sin señal' }
  const statusColor: Record<string, string> = { moving:'var(--go)', stopped:'var(--halt)', at_stop:'var(--near)', offline:'var(--text-muted)' }

  return (
    <div style={{ padding:'14px 16px', minWidth:'200px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
        <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'rgba(184,200,224,0.06)', border:'1px solid rgba(184,200,224,0.12)', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Bus size={14} style={{ color:'var(--platinum)' }} />
        </div>
        <div>
          <div className="font-display" style={{ color:'var(--text-primary)', fontWeight:700, fontSize:'14px' }}>Unidad {bus.bus_unit}</div>
          <div style={{ color:'var(--text-muted)', fontSize:'11px', fontFamily:'DM Mono' }}>{bus.driver_name}</div>
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
        <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:statusColor[bus.status] }} />
        <span style={{ color:statusColor[bus.status], fontSize:'11px', fontFamily:'DM Mono' }}>{statusLabel[bus.status]}</span>
        {bus.eta_minutes != null && (
          <span style={{ color:'var(--text-muted)', fontSize:'11px', fontFamily:'DM Mono', marginLeft:'auto' }}>· {bus.eta_minutes}m</span>
        )}
      </div>
    </div>
  )
}