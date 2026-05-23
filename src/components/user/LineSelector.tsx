'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Bus, Check, Route, MapPin, Navigation, ChevronRight } from 'lucide-react'
import type { BusLine } from '@/types'
import { MOCK_LINES, MOCK_ROUTES } from '@/lib/mockData'

interface Props {
  lines: BusLine[]
  selectedLine: BusLine | null
  onSelect: (l: BusLine) => void
  onClose: () => void
}

type Tab = 'line' | 'route' | 'nearby'

export default function LineSelector({ lines, selectedLine, onSelect, onClose }: Props) {
  // Fall back to mock data if DB hasn't loaded yet
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
        // Mock: return a random subset of lines as "nearby"
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
    { id: 'route',  label: 'Por recorrido', icon: Route },
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
        style={{ position: 'relative', width: '100%', maxWidth: '440px', margin: '0 16px 16px', overflow: 'hidden', borderRadius: 'var(--r-xl)' }}
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 28 }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 20px 0' }}>
          <h3 className="font-display" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '17px', letterSpacing: '-0.01em' }}>
            Elegí una línea
          </h3>
          <button onClick={onClose} style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(184,200,224,0.06)', border: '1px solid rgba(184,200,224,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={14} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '6px', padding: '14px 16px 0' }}>
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
                <span style={{ fontSize: '11px', fontFamily: 'DM Sans', fontWeight: active ? 600 : 400, color: active ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">

          {/* ── BY LINE ── */}
          {tab === 'line' && (
            <motion.div key="line" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div style={{ padding: '12px 16px 10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input autoFocus className="input-dark" style={{ paddingLeft: '38px', fontSize: '13px' }} placeholder="Buscar por número..." value={q} onChange={e => setQ(e.target.value)} />
                </div>
              </div>
              <div className="scroll-panel" style={{ maxHeight: '50vh', padding: '0 12px 16px' }}>
                {filtered.length === 0 ? (
                  <EmptyState label="Sin resultados" />
                ) : filtered.map(line => (
                  <LineRow key={line.id} line={line} selected={selectedLine?.id === line.id} onSelect={onSelect} />
                ))}
              </div>
            </motion.div>
          )}

          {/* ── BY ROUTE ── */}
          {tab === 'route' && (
            <motion.div key="route" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div style={{ padding: '12px 16px 10px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input autoFocus className="input-dark" style={{ paddingLeft: '38px', fontSize: '13px' }} placeholder="Buscar parada o calle..." value={q} onChange={e => setQ(e.target.value)} />
                </div>
              </div>
              <div className="scroll-panel" style={{ maxHeight: '50vh', padding: '0 12px 16px' }}>
                {allLines
                  .filter(l => {
                    if (!q) return true
                    const stops = MOCK_ROUTES[l.id] || []
                    return stops.some(s => s.name.toLowerCase().includes(q.toLowerCase())) ||
                      l.line_number.includes(q)
                  })
                  .map(line => {
                    const stops = MOCK_ROUTES[line.id] || []
                    const isOpen = expandedRoute === line.id
                    const matchingStops = q
                      ? stops.filter(s => s.name.toLowerCase().includes(q.toLowerCase()))
                      : stops
                    return (
                      <div key={line.id} style={{ marginBottom: '6px' }}>
                        {/* Line header */}
                        <button
                          onClick={() => setExpandedRoute(isOpen ? null : line.id)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', borderRadius: isOpen ? '12px 12px 0 0' : '12px', border: `1px solid ${isOpen ? 'rgba(184,200,224,0.18)' : 'rgba(184,200,224,0.06)'}`, background: isOpen ? 'rgba(184,200,224,0.06)' : 'rgba(6,8,16,0.4)', cursor: 'pointer', transition: 'all 200ms', textAlign: 'left' }}
                        >
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: line.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 8px ${line.color}40` }}>
                            <span className="font-display" style={{ color: '#fff', fontWeight: 800, fontSize: '11px' }}>{line.line_number}</span>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {line.name.split(' - ')[1] || line.name}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '1px' }}>
                              {stops.length} paradas
                            </div>
                          </div>
                          <ChevronRight size={13} style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }} />
                        </button>

                        {/* Stops list */}
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              style={{ overflow: 'hidden', border: '1px solid rgba(184,200,224,0.1)', borderTop: 'none', borderRadius: '0 0 12px 12px', background: 'rgba(6,8,16,0.5)' }}
                            >
                              {matchingStops.map((stop, i) => (
                                <button
                                  key={i}
                                  onClick={() => onSelect(line)}
                                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: i < matchingStops.length - 1 ? '1px solid rgba(184,200,224,0.04)' : 'none' }}
                                >
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: i === 0 || i === matchingStops.length - 1 ? line.color : 'rgba(184,200,224,0.2)', border: `1px solid ${line.color}60` }} />
                                    {i < matchingStops.length - 1 && <div style={{ width: '1px', height: '14px', background: 'rgba(184,200,224,0.1)' }} />}
                                  </div>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{stop.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )
                  })}
              </div>
            </motion.div>
          )}

          {/* ── NEARBY ── */}
          {tab === 'nearby' && (
            <motion.div key="nearby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
              <div style={{ padding: '16px 16px 0' }}>
                {nearbyLines.length === 0 && !locating && !locError && (
                  <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(184,200,224,0.05)', border: '1px solid rgba(184,200,224,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                      <Navigation size={22} style={{ color: 'var(--platinum)' }} />
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.5 }}>
                      Detectamos las líneas que pasan cerca de vos ahora mismo.
                    </p>
                    <motion.button
                      onClick={handleLocate}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      className="btn-platinum"
                      style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <MapPin size={14} /> Usar mi ubicación
                    </motion.button>
                  </div>
                )}

                {locating && (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '2px solid rgba(34,211,160,0.3)', borderTopColor: 'var(--go)', margin: '0 auto 14px', animation: 'spin 1s linear infinite' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'DM Mono' }}>Obteniendo ubicación...</p>
                  </div>
                )}

                {locError && (
                  <div style={{ padding: '14px', background: 'rgba(255,77,106,0.07)', border: '1px solid rgba(255,77,106,0.2)', borderRadius: 'var(--r-md)', marginBottom: '14px', fontSize: '13px', color: '#FF4D6A' }}>
                    {locError}
                  </div>
                )}

                {nearbyLines.length > 0 && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--go)', animation: 'pulseNeon 2s ease-in-out infinite' }} />
                      <span style={{ color: 'var(--go)', fontSize: '10px', fontFamily: 'DM Mono', fontWeight: 600, letterSpacing: '0.06em' }}>
                        {nearbyLines.length} LÍNEAS CERCA
                      </span>
                    </div>
                  </>
                )}
              </div>

              {nearbyLines.length > 0 && (
                <div className="scroll-panel" style={{ maxHeight: '45vh', padding: '0 12px 16px' }}>
                  {nearbyLines.map(line => (
                    <LineRow key={line.id} line={line} selected={selectedLine?.id === line.id} onSelect={onSelect} showDistance />
                  ))}
                  <button
                    onClick={() => { setNearbyLines([]); setLocError(null) }}
                    style={{ width: '100%', marginTop: '6px', padding: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '11px', fontFamily: 'DM Mono' }}
                  >
                    Actualizar ubicación
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  )
}

/* ─── Shared sub-components ──────────────────────────────────────────────── */

function LineRow({ line, selected, onSelect, showDistance }: { line: BusLine; selected: boolean; onSelect: (l: BusLine) => void; showDistance?: boolean }) {
  const mockDist = showDistance ? `${(Math.random() * 400 + 50).toFixed(0)}m` : null
  return (
    <button
      onClick={() => onSelect(line)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '11px 12px', borderRadius: 'var(--r-md)', border: `1px solid ${selected ? 'rgba(184,200,224,0.2)' : 'rgba(184,200,224,0.05)'}`, background: selected ? 'rgba(184,200,224,0.06)' : 'rgba(6,8,16,0.4)', marginBottom: '6px', cursor: 'pointer', transition: 'all 200ms', textAlign: 'left' }}
    >
      <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: line.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 4px 12px ${line.color}40` }}>
        <span className="font-display" style={{ color: '#fff', fontWeight: 800, fontSize: '12px' }}>{line.line_number}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {line.name.split(' - ')[1] || line.name}
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '2px', display: 'flex', gap: '8px' }}>
          <span>{line.company}</span>
          {mockDist && <span style={{ color: 'var(--go)' }}>· {mockDist}</span>}
        </div>
      </div>
      {selected && (
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(184,200,224,0.15)', border: '1px solid rgba(184,200,224,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Check size={11} style={{ color: 'var(--platinum)' }} />
        </div>
      )}
    </button>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '36px 20px' }}>
      <Bus size={26} style={{ color: 'var(--text-muted)', margin: '0 auto 8px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{label}</p>
    </div>
  )
}