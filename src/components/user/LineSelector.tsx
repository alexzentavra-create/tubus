'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Bus, Check, Route, MapPin, Navigation, ChevronRight } from 'lucide-react'
import type { BusLine, BusStop } from '@/types'
import { MOCK_LINES, MOCK_STOPS } from '@/lib/mockData'

interface Props {
  lines: BusLine[]
  selectedLine: BusLine | null
  onSelect: (l: BusLine) => void
  onClose: () => void
}

type Tab = 'line' | 'route' | 'nearby'

export default function LineSelector({ lines, selectedLine, onSelect, onClose }: Props) {
  const allLines = lines.length > 0 ? lines : MOCK_LINES

  const [tab, setTab] = useState<Tab>('line')
  const [q, setQ] = useState('')
  const [locating, setLocating] = useState(false)
  const [nearbyLines, setNearbyLines] = useState<BusLine[]>([])
  const [locError, setLocError] = useState<string | null>(null)
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null)

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
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />

      <motion.div
        className="glass-dark"
        style={{ position: 'relative', width: '100%', maxWidth: '440px', margin: '0 16px 16px', overflow: 'hidden', borderRadius: 'var(--r-xl)', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0', flexShrink: 0 }}>
          <h3 className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.01em' }}>
            Elegí una línea
          </h3>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', padding: '14px 16px 0', flexShrink: 0 }}>
          {tabs.map(t => {
            const active = tab === t.id
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                  padding: '8px 6px', borderRadius: '10px', border: `1px solid ${active ? 'rgba(184,200,224,0.22)' : 'rgba(184,200,224,0.07)'}`,
                  background: active ? 'rgba(184,200,224,0.1)' : 'rgba(6,8,16,0.4)',
                  cursor: 'pointer', transition: 'all 200ms',
                }}
              >
                <Icon size={12} style={{ color: active ? 'var(--platinum)' : 'var(--text-muted)' }} />
                <span style={{ fontSize: '11px', fontFamily: 'DM Sans', color: active ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: active ? 600 : 400 }}>{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>
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
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px', background: 'rgba(6,8,16,0.6)', border: '1px solid rgba(184,200,224,0.1)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filtered.map(line => (
                  <LineItem key={line.id} line={line} selected={selectedLine?.id === line.id} onSelect={() => onSelect(line)} />
                ))}
                {filtered.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', fontFamily: 'DM Sans' }}>Sin resultados para "{q}"</p>
                )}
              </div>
            </>
          )}

          {/* ── ROUTE TAB ── */}
          {tab === 'route' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {allLines.map(line => {
                const stops: BusStop[] = MOCK_STOPS[line.id] || []
                const expanded = expandedRoute === line.id
                return (
                  <div key={line.id} style={{ borderRadius: '12px', border: '1px solid rgba(184,200,224,0.08)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedRoute(expanded ? null : line.id)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', background: 'rgba(6,8,16,0.5)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                    >
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: line.color, flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600, fontFamily: 'DM Sans' }}>Línea {line.line_number}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono' }}>{stops.length} paradas</span>
                      <ChevronRight size={13} style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }} />
                    </button>
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '4px 14px 12px', display: 'flex', flexDirection: 'column', gap: '0' }}>
                            {stops.map((stop, i) => (
                              <div key={stop.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                {/* Timeline line */}
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0, paddingTop: '4px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === 0 || i === stops.length - 1 ? line.color : 'rgba(184,200,224,0.3)', border: `1px solid ${line.color}`, flexShrink: 0 }} />
                                  {i < stops.length - 1 && <div style={{ width: '1px', flex: 1, minHeight: '16px', background: 'rgba(184,200,224,0.1)' }} />}
                                </div>
                                <div style={{ paddingBottom: '8px', flex: 1 }}>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontFamily: 'DM Sans' }}>{stop.name}</span>
                                  {stop.street_name && <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono' }}>{stop.street_name}</div>}
                                </div>
                              </div>
                            ))}
                            <button
                              onClick={() => onSelect(line)}
                              style={{ marginTop: '8px', padding: '8px', borderRadius: '8px', border: `1px solid ${line.color}40`, background: `${line.color}10`, color: line.color, fontSize: '12px', cursor: 'pointer', fontFamily: 'DM Sans', fontWeight: 600 }}
                            >
                              Ver en mapa →
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
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
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(184,200,224,0.2)', background: 'rgba(184,200,224,0.06)', color: 'var(--text-primary)', fontSize: '13px', cursor: locating ? 'default' : 'pointer', fontFamily: 'DM Sans' }}
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
                    <LineItem key={line.id} line={line} selected={selectedLine?.id === line.id} onSelect={() => onSelect(line)} />
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

function LineItem({ line, selected, onSelect }: { line: BusLine; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
        borderRadius: '12px', border: `1px solid ${selected ? `${line.color}30` : 'rgba(184,200,224,0.07)'}`,
        background: selected ? `${line.color}08` : 'rgba(6,8,16,0.4)',
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