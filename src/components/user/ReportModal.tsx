'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { BusPosition, ReportType } from '@/types'
import toast from 'react-hot-toast'

const REPORT_TYPES: { value: ReportType; label: string; emoji: string }[] = [
  { value: 'no_paro',               label: 'No paró en la parada',      emoji: '🚌' },
  { value: 'conduccion_peligrosa',  label: 'Conducción peligrosa',       emoji: '⚠️' },
  { value: 'mal_trato',             label: 'Mal trato al pasajero',      emoji: '😤' },
  { value: 'vehiculo_defectuoso',   label: 'Vehículo en mal estado',     emoji: '🔧' },
  { value: 'no_llego',              label: 'No llegó / se saltó el turno', emoji: '❓' },
  { value: 'otro',                  label: 'Otro problema',              emoji: '📋' },
]

interface Props {
  bus: BusPosition
  onClose: () => void
}

export default function ReportModal({ bus, onClose }: Props) {
  const supabase = createClient()
  const [type, setType] = useState<ReportType | null>(null)
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (!type) return
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Tenés que estar logueado para denunciar'); setLoading(false); return }

    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id,
      driver_id: bus.driver_id,
      line_id: bus.line_id,
      bus_unit: bus.bus_unit,
      type,
      description: description || REPORT_TYPES.find(r => r.value === type)!.label,
    })

    setLoading(false)
    if (error) { toast.error('No se pudo enviar la denuncia'); return }
    setDone(true)
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-md glass-panel mx-4 mb-4 sm:mb-0 overflow-hidden"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28 }}
      >
        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-moving/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-moving" />
            </div>
            <h3 className="text-white font-bold text-xl mb-2">¡Denuncia enviada!</h3>
            <p className="text-night-300 text-sm mb-6">
              Gracias por reportar. El equipo de administración va a revisar tu denuncia.
            </p>
            <button className="btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between p-5 border-b border-night-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-stopped/15 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-stopped" />
                </div>
                <div>
                  <h3 className="text-white font-bold">Denunciar colectivo</h3>
                  <p className="text-night-400 text-xs">Unidad {bus.bus_unit} · {bus.driver_name}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-night-700 flex items-center justify-center">
                <X size={16} className="text-night-300" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-night-400 uppercase tracking-wider mb-3 block">
                  ¿Cuál es el problema?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_TYPES.map(rt => (
                    <button
                      key={rt.value}
                      onClick={() => setType(rt.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        type === rt.value
                          ? 'border-bus-500 bg-bus-500/15 text-white'
                          : 'border-night-700 bg-night-900/60 text-night-300 hover:border-night-500'
                      }`}
                    >
                      <div className="text-lg mb-1">{rt.emoji}</div>
                      <div className="text-xs font-medium leading-tight">{rt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-night-400 uppercase tracking-wider mb-2 block">
                  Descripción (opcional)
                </label>
                <textarea
                  className="bus-input resize-none"
                  rows={3}
                  placeholder="Contanos más detalles sobre lo que pasó..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <button
                className="btn-primary"
                onClick={submit}
                disabled={!type || loading}
              >
                {loading ? 'Enviando...' : 'Enviar denuncia'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}