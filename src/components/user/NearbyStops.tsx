'use client'
import { motion } from 'framer-motion'
import { X, Bus, Clock, Wifi, Activity } from 'lucide-react'
import type { BusStop, BusPosition, BusLine } from '@/types'
import { MOCK_LINES } from '@/lib/mockData'

interface Props {
  stops: BusStop[]
  buses: BusPosition[]
  selectedLines: BusLine[]
  centerCoord?: { lat: number; lng: number } | null
  onClose: () => void
  onToggleLine: (line: BusLine) => void
  darkMap: boolean
}

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // meters
  const phi1 = lat1 * Math.PI / 180
  const phi2 = lat2 * Math.PI / 180
  const deltaPhi = (lat2 - lat1) * Math.PI / 180
  const deltaLambda = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

function getDistanceText(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

export default function NearbyStops({ stops, buses, selectedLines, centerCoord, onClose, onToggleLine, darkMap }: Props) {
  // Extract unique lines passing through the nearby stops
  const lineIds = Array.from(new Set(stops.map(s => s.line_id)))
  const nearbyLines = MOCK_LINES.filter(l => lineIds.includes(l.id))

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 40, padding: '16px' }}>
      <motion.div
        className="glass-dark"
        style={{
          pointerEvents: 'auto',
          width: '100%',
          maxWidth: '440px',
          borderRadius: 'var(--r-xl)',
          maxHeight: '52vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)'
        }}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 200 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(184,200,224,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(34, 211, 160, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bus size={15} style={{ color: 'var(--go)' }} />
            </div>
            <div>
              <h3 className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em', margin: 0 }}>
                Líneas de colectivos cercanas
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '2px 0 0', fontFamily: 'DM Sans' }}>
                {nearbyLines.length > 0 ? `${nearbyLines.length} líneas pasan cerca de tu pin` : 'Arrastrá el pin para buscar líneas'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: darkMap ? 'rgba(184,200,224,0.06)' : 'rgba(0,0,0,0.03)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 200ms' }} title="Cerrar">
            <X size={12} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Lines List */}
        <div className="scroll-panel" style={{ flex: 1, padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {nearbyLines.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(184,200,224,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Bus size={20} style={{ color: 'var(--text-secondary)' }} />
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, margin: 0 }}>No hay líneas cerca de este punto</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', maxWidth: '280px' }}>Arrastrá el pin de paradas cercanas en el mapa para escanear colectivos en otro lugar.</p>
            </div>
          ) : (
            nearbyLines.map((line: BusLine) => {
              const isSelected = selectedLines.some(l => l.id === line.id)
              const lineStops = stops.filter(s => s.line_id === line.id)
              const avgWait = lineStops.length > 0 ? lineStops[0].avg_wait_minutes : 6

              // Get active buses on this line
              const lineBuses = buses.filter(b => b.line_id === line.id)
              
              // Find the closest active bus to the pin coordinate
              let closestBus: BusPosition | null = null
              let minDistance = Infinity
              if (centerCoord && lineBuses.length > 0) {
                for (const b of lineBuses) {
                  const d = getDistanceInMeters(b.latitude, b.longitude, centerCoord.lat, centerCoord.lng)
                  if (d < minDistance) {
                    minDistance = d
                    closestBus = b
                  }
                }
              }

              return (
                <div
                  key={line.id}
                  onClick={() => onToggleLine(line)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    background: isSelected ? (darkMap ? 'rgba(184,200,224,0.05)' : 'rgba(0,0,0,0.02)') : (darkMap ? 'rgba(6,8,16,0.4)' : 'rgba(255,255,255,0.85)'),
                    border: isSelected ? `1px solid ${line.color}40` : (darkMap ? '1px solid rgba(184,200,224,0.06)' : '1px solid rgba(0,0,0,0.08)'),
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  className="stop-card-hover"
                >
                  {/* Line Number Circle Badge */}
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: line.color,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '14px',
                    fontFamily: 'DM Mono',
                    flexShrink: 0,
                    boxShadow: `0 3px 10px ${line.color}40`
                  }}>
                    {line.line_number}
                  </div>

                  {/* Line Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {line.name.replace(/^Línea \d+ - /, '')}
                    </div>
                    
                    {/* Live status label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                      {isSelected ? (
                        closestBus ? (
                          <>
                            <Wifi size={10} style={{ color: 'var(--go)' }} />
                            <span style={{ color: 'var(--go)', fontSize: '11px', fontWeight: 600, fontFamily: 'DM Mono' }}>
                              Interno {closestBus.bus_unit} a {getDistanceText(minDistance)}
                            </span>
                          </>
                        ) : (
                          <>
                            <Activity size={10} style={{ color: 'var(--near)' }} className="animate-pulse" />
                            <span style={{ color: 'var(--near)', fontSize: '11px', fontWeight: 500, fontFamily: 'DM Mono' }}>
                              Conectando GPS...
                            </span>
                          </>
                        )
                      ) : (
                        <>
                          <Clock size={10} style={{ color: 'var(--text-secondary)' }} />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'DM Mono' }}>
                            Espera prom: ~{avgWait}m
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Premium iOS-Style Toggle Switch */}
                  <div style={{
                    width: '38px',
                    height: '20px',
                    borderRadius: '10px',
                    background: isSelected ? 'var(--go)' : (darkMap ? 'rgba(184,200,224,0.15)' : 'rgba(0,0,0,0.12)'),
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    flexShrink: 0
                  }}>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '50%',
                      background: 'white',
                      position: 'absolute',
                      top: '2px',
                      left: isSelected ? '20px' : '2px',
                      transition: 'all 200ms cubic-bezier(0.22, 1, 0.36, 1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                    }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </motion.div>
    </div>
  )
}