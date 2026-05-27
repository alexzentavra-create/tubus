'use client'
import { motion } from 'framer-motion'
import { MapPin, Clock, X, Navigation, ArrowUpRight, ArrowDownLeft } from 'lucide-react'
import type { BusStop } from '@/types'
import { MOCK_LINES } from '@/lib/mockData'

interface Props {
  stops: BusStop[]
  centerCoord?: { lat: number; lng: number } | null
  onClose: () => void
  onSelectStop?: (stop: BusStop) => void
  onSetOrigin?: (stop: BusStop) => void
  onSetDestination?: (stop: BusStop) => void
}

function getDistanceText(lat1: number, lon1: number, lat2: number, lon2: number): string {
  const R = 6371e3 // meters
  const phi1 = lat1 * Math.PI / 180
  const phi2 = lat2 * Math.PI / 180
  const deltaPhi = (lat2 - lat1) * Math.PI / 180
  const deltaLambda = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  const d = R * c // in meters
  if (d < 1000) {
    return `${Math.round(d)} m`
  }
  return `${(d / 1000).toFixed(1)} km`
}

export default function NearbyStops({ stops, centerCoord, onClose, onSelectStop, onSetOrigin, onSetDestination }: Props) {
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255, 77, 106, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MapPin size={14} style={{ color: '#FF4D6A' }} />
            </div>
            <div>
              <h3 className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.01em', margin: 0 }}>
                Paradas cercanas
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '2px 0 0', fontFamily: 'DM Sans' }}>
                {stops.length > 0 ? `${stops.length} paradas encontradas a menos de 800m` : 'Arrastrá el pin rojo para buscar'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 200ms' }} title="Cerrar">
            <X size={12} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Stops List */}
        <div className="scroll-panel" style={{ flex: 1, padding: '14px 16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {stops.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(184,200,224,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <Navigation size={20} style={{ color: 'var(--text-secondary)', transform: 'rotate(45deg)' }} />
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, margin: 0 }}>No hay paradas cerca de esta ubicación</p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '4px', maxWidth: '280px' }}>Arrastrá el pin de paradas cercanas rojo en el mapa para buscar en otra zona.</p>
            </div>
          ) : (
            stops.slice(0, 8).map((stop: BusStop) => {
              // Extract original line number from the line_id if it starts with mock prefix, or use the line_id to find the mock line
              const stopLine = MOCK_LINES.find(l => l.id === stop.line_id)
              const distanceText = centerCoord ? getDistanceText(centerCoord.lat, centerCoord.lng, stop.latitude, stop.longitude) : null

              return (
                <div
                  key={stop.id}
                  onClick={() => onSelectStop?.(stop)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '12px',
                    background: 'rgba(6,8,16,0.4)',
                    border: '1px solid rgba(184,200,224,0.06)',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  className="stop-card-hover"
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: stopLine ? `${stopLine.color}15` : 'rgba(184,200,224,0.06)', border: `1px solid ${stopLine ? `${stopLine.color}30` : 'rgba(184,200,224,0.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MapPin size={14} style={{ color: stopLine ? stopLine.color : 'var(--platinum-dim)' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {stop.street_name || stop.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontFamily: 'DM Mono' }}>{stop.name}</span>
                        {distanceText && (
                          <>
                            <span style={{ color: 'rgba(184,200,224,0.15)', fontSize: '10px' }}>•</span>
                            <span style={{ color: 'var(--near)', fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 500 }}>a {distanceText}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                      {stopLine && (
                        <span style={{
                          background: stopLine.color,
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontFamily: 'DM Mono',
                          fontWeight: 700,
                          boxShadow: `0 2px 6px ${stopLine.color}40`
                        }}>
                          Línea {stopLine.line_number}
                        </span>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} style={{ color: 'var(--text-secondary)' }} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '10px', fontFamily: 'DM Mono' }}>~{stop.avg_wait_minutes}m</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Travel Assistant Actions */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px', borderTop: '1px solid rgba(184,200,224,0.03)', paddingTop: '8px', pointerEvents: 'auto' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSetOrigin?.(stop)
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(59,130,246,0.15)',
                        background: 'rgba(59,130,246,0.06)',
                        color: '#3B82F6',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: 'DM Sans',
                        fontWeight: 600
                      }}
                      className="action-btn"
                    >
                      <ArrowUpRight size={12} />
                      Desde aquí
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSetDestination?.(stop)
                      }}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: '1px solid rgba(184,200,224,0.15)',
                        background: 'rgba(184,200,224,0.06)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        transition: 'all 150ms',
                        fontFamily: 'DM Sans',
                        fontWeight: 600
                      }}
                      className="action-btn"
                    >
                      <ArrowDownLeft size={12} />
                      Hacia aquí
                    </button>
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