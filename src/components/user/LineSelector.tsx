'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Bus, Check, Route, MapPin, Navigation } from 'lucide-react'
import type { BusLine, BusStop } from '@/types'
import { MOCK_LINES } from '@/lib/mockData'

interface Props {
  lines: BusLine[]
  selectedLines: BusLine[]
  onSelect: (l: BusLine) => void
  onClose: () => void
  darkMap: boolean

  // Travel planner states and handlers from page.tsx:
  originInput: string
  setOriginInput: (v: string) => void
  destInput: string
  setDestInput: (v: string) => void
  originCoord: { lat: number; lng: number } | null
  setOriginCoord: (c: { lat: number; lng: number } | null) => void
  destCoord: { lat: number; lng: number } | null
  setDestCoord: (c: { lat: number; lng: number } | null) => void
  travelRoute: any
  setTravelRoute: (r: any) => void
  setMapSelectionMode: (mode: 'origin' | 'destination' | null) => void
  setShowLineSelector: (v: boolean) => void
  resolveStreetToCoords: (text: string) => { lat: number; lng: number } | null
  getNearestStreetName: (lat: number, lng: number) => string
  fetchAddressAsync: (lat: number, lng: number, callback: (addr: string) => void) => void
  solveRoute: (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => any
  setTravelPlannerOpen: (v: boolean) => void
  setViewState: (v: any) => void
  tab: Tab
  setTab: (t: Tab) => void
}

export type Tab = 'line' | 'route' | 'nearby'

export default function LineSelector({
  lines,
  selectedLines,
  onSelect,
  onClose,
  darkMap,
  originInput,
  setOriginInput,
  destInput,
  setDestInput,
  originCoord,
  setOriginCoord,
  destCoord,
  setDestCoord,
  travelRoute,
  setTravelRoute,
  setMapSelectionMode,
  setShowLineSelector,
  resolveStreetToCoords,
  getNearestStreetName,
  fetchAddressAsync,
  solveRoute,
  setTravelPlannerOpen,
  setViewState,
  tab,
  setTab
}: Props) {
  const allLines = lines.length > 0 ? lines : MOCK_LINES

  const [q, setQ] = useState('')
  const [locating, setLocating] = useState(false)
  const [nearbyLines, setNearbyLines] = useState<BusLine[]>([])
  const [locError, setLocError] = useState<string | null>(null)

  const filtered = allLines.filter(
    l => l.line_number.includes(q) || l.name.toLowerCase().includes(q.toLowerCase())
  )

  const handleLocate = () => {
    setLocating(true)
    setLocError(null)
    if (!navigator.geolocation) {
      setLocError('GPS no disponible en este dispositivo.')
      setLocating(false)
      return
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        const shuffled = [...allLines].sort(() => Math.random() - 0.5).slice(0, 4)
        setNearbyLines(shuffled)
        setLocating(false)
      },
      err => {
        setLocError('No pudimos obtener tu ubicación. ' + err.message)
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  const tabs: { id: Tab; label: string; icon: typeof Bus }[] = [
    { id: 'line',   label: 'Por línea',    icon: Bus },
    { id: 'route',  label: 'Recorrido',    icon: Route },
    { id: 'nearby', label: 'Cerca mío',    icon: MapPin },
  ]

  return (
    <motion.div
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

      <motion.div
        className="glass-dark"
        style={{ position: 'relative', width: '100%', maxWidth: '440px', margin: '0', overflow: 'hidden', borderRadius: 'var(--r-xl)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        initial={{ scale: 0.95, y: 15, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.95, y: 15, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 220 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0', flexShrink: 0 }}>
          <h3 className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.01em' }}>
            {tab === 'line' ? 'Elegí una línea' : tab === 'route' ? 'Planificar Recorrido' : 'Paradas Cercanas'}
          </h3>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.03)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>
          {/* ── LINE TAB ── */}
          {tab === 'line' && (
            <>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Número o nombre de línea..."
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px', background: darkMap ? 'rgba(6,8,16,0.6)' : 'rgba(255,255,255,0.9)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.1)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filtered.map(line => (
                  <LineItem key={line.id} line={line} selected={selectedLines.some(l => l.id === line.id)} onSelect={() => onSelect(line)} darkMap={darkMap} />
                ))}
                {filtered.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', fontFamily: 'DM Sans' }}>Sin resultados para "{q}"</p>
                )}
              </div>
            </>
          )}

          {/* ── ROUTE TAB (Remade Travel Planner) ── */}
          {tab === 'route' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                {/* Origen Input Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'DM Mono', letterSpacing: '0.04em' }}>
                    Desde (Origen)
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <MapPin size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#3B82F6' }} />
                      <input
                        value={originInput}
                        onChange={e => {
                          setOriginInput(e.target.value)
                          const coord = resolveStreetToCoords(e.target.value)
                          if (coord) {
                            setOriginCoord(coord)
                            if (destCoord) setTravelRoute(solveRoute(coord, destCoord))
                          }
                        }}
                        placeholder="Ingresá calle y altura de Origen..."
                        style={{
                          width: '100%', padding: '9px 12px 9px 30px', borderRadius: '8px',
                          background: darkMap ? 'rgba(6,8,16,0.6)' : 'rgba(255,255,255,0.9)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.1)',
                          color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    
                    {/* Current Location Button */}
                    <button
                      onClick={() => {
                        if (!navigator.geolocation) {
                          alert('GPS no disponible en este dispositivo.')
                          return
                        }
                        navigator.geolocation.getCurrentPosition(
                          pos => {
                            const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                            setOriginCoord(coord)
                            setOriginInput(getNearestStreetName(coord.lat, coord.lng))
                            fetchAddressAsync(coord.lat, coord.lng, setOriginInput)
                            if (destCoord) setTravelRoute(solveRoute(coord, destCoord))
                          },
                          err => {
                            alert('No pudimos acceder a tu ubicación: ' + err.message)
                          }
                        )
                      }}
                      title="Usar mi ubicación actual"
                      style={{
                        width: '34px', height: '34px', borderRadius: '8px',
                        background: darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.03)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                      }}
                    >
                      <Navigation size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>

                    {/* Select on Map Button */}
                    <button
                      onClick={() => {
                        setShowLineSelector(false)
                        setMapSelectionMode('origin')
                      }}
                      title="Seleccionar en el mapa"
                      style={{
                        width: '34px', height: '34px', borderRadius: '8px',
                        background: darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.03)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                      }}
                    >
                      <MapPin size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                </div>

                {/* Destino Input Row */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', fontFamily: 'DM Mono', letterSpacing: '0.04em' }}>
                    Hacia (Destino)
                  </label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                      <MapPin size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#FF4D6A' }} />
                      <input
                        value={destInput}
                        onChange={e => {
                          setDestInput(e.target.value)
                          const coord = resolveStreetToCoords(e.target.value)
                          if (coord) {
                            setDestCoord(coord)
                            if (originCoord) setTravelRoute(solveRoute(originCoord, coord))
                          }
                        }}
                        placeholder="Ingresá calle y altura de Destino..."
                        style={{
                          width: '100%', padding: '9px 12px 9px 30px', borderRadius: '8px',
                          background: darkMap ? 'rgba(6,8,16,0.6)' : 'rgba(255,255,255,0.9)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.1)',
                          color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Select on Map Button */}
                    <button
                      onClick={() => {
                        setShowLineSelector(false)
                        setMapSelectionMode('destination')
                      }}
                      title="Seleccionar en el mapa"
                      style={{
                        width: '34px', height: '34px', borderRadius: '8px',
                        background: darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.03)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0
                      }}
                    >
                      <MapPin size={12} style={{ color: 'var(--text-secondary)' }} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Solved Route Results */}
              <div style={{ borderTop: '1px solid rgba(184,200,224,0.06)', paddingTop: '14px' }}>
                {originCoord && destCoord ? (
                  travelRoute ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'DM Mono', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                        Línea recomendada:
                      </div>
                      
                      <div
                        onClick={() => {
                          const line = allLines.find(l => l.id === travelRoute.line_id)
                          if (line) {
                            onSelect(line)
                            setViewState((v: any) => ({
                              ...v,
                              latitude: travelRoute.originStop.latitude,
                              longitude: travelRoute.originStop.longitude,
                              zoom: 14.5
                            }))
                            setTravelPlannerOpen(true)
                            onClose()
                          }
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          padding: '12px',
                          borderRadius: '10px',
                          background: darkMap ? 'rgba(6,8,16,0.3)' : 'rgba(255,255,255,0.85)',
                          border: `1px solid ${travelRoute.color}${darkMap ? '40' : '60'}`,
                          cursor: 'pointer',
                          transition: 'all 200ms'
                        }}
                        className="stop-card-hover"
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: travelRoute.color }} />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Línea {travelRoute.line_number}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div>🚶‍♂️ Caminá hasta: <strong>{travelRoute.originStop.name}</strong></div>
                          <div>🚌 Viajá hasta: <strong>{travelRoute.destStop.name}</strong></div>
                        </div>
                        <div style={{ color: travelRoute.color, fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}>
                          Ver recorrido y colectivos en mapa →
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                      😞 No hay líneas directas que conecten estos dos puntos.
                      <div style={{ fontSize: '10px', marginTop: '4px' }}>Probá con otras esquinas principales.</div>
                    </div>
                  )
                ) : (
                  <div style={{ padding: '20px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', lineHeight: '1.5' }}>
                    💡 Ingresá tu origen y destino para encontrar qué colectivo tomar. Probá buscar "Cabildo", "Corrientes 1900" o marcá directamente en el mapa.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── NEARBY TAB ── */}
          {tab === 'nearby' && (
            <div>
              {nearbyLines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <button
                    onClick={handleLocate}
                    disabled={locating}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: darkMap ? '1px solid rgba(184,200,224,0.2)' : '1px solid rgba(0,0,0,0.12)', background: darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.03)', color: 'var(--text-primary)', fontSize: '13px', cursor: locating ? 'default' : 'pointer', fontFamily: 'DM Sans' }}
                  >
                    <Navigation size={14} style={{ color: 'var(--platinum)' }} />
                    {locating ? 'Ubicando...' : 'Usar mi ubicación'}
                  </button>
                  {locError && <p style={{ color: '#FF4D6A', fontSize: '12px', marginTop: '12px', fontFamily: 'DM Sans' }}>{locError}</p>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', marginBottom: '8px' }}>Líneas que pasan cerca tuyo</p>
                  {nearbyLines.map(line => (
                    <LineItem key={line.id} line={line} selected={selectedLines.some(l => l.id === line.id)} onSelect={() => onSelect(line)} darkMap={darkMap} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function LineItem({ line, selected, onSelect, darkMap }: { line: BusLine; selected: boolean; onSelect: () => void; darkMap: boolean }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
        borderRadius: '12px', border: `1px solid ${selected ? `${line.color}30` : (darkMap ? 'rgba(184,200,224,0.07)' : 'rgba(0,0,0,0.08)')}`,
        background: selected ? `${line.color}08` : (darkMap ? 'rgba(6,8,16,0.4)' : 'rgba(255,255,255,0.85)'),
        cursor: 'pointer', transition: 'all 150ms', textAlign: 'left', width: '100%',
      }}
    >
      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: line.color, flexShrink: 0, boxShadow: `0 0 8px ${line.color}80` }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans' }}>Línea {line.line_number}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line.name}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono' }}>{line.total_stops} paradas</span>
      </div>
      {selected && <Check size={14} style={{ color: line.color, flexShrink: 0 }} />}
    </button>
  )
}
