'use client'

import { motion } from 'framer-motion'
import { Bus, AlertTriangle, Users, Clock, MapPin, Star, X, ChevronRight } from 'lucide-react'
import type { BusPosition } from '@/types'

interface Props {
  bus: BusPosition
  onClose: () => void
  onReport: () => void
}

export default function BusInfoSheet({ bus, onClose, onReport }: Props) {
  const statusConfig = {
    moving:   { label: 'En movimiento',  color: 'text-moving',     dot: 'bg-moving' },
    stopped:  { label: 'Detenido',       color: 'text-stopped',    dot: 'bg-stopped' },
    at_stop:  { label: 'En parada',      color: 'text-approaching', dot: 'bg-approaching' },
    offline:  { label: 'Sin señal',      color: 'text-night-400',  dot: 'bg-night-400' },
  }
  const status = statusConfig[bus.status] || statusConfig.offline

  return (
    <motion.div
      className="bottom-sheet safe-bottom"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 200 }}
    >
      {/* Handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-night-700" />
      </div>

      <div className="px-5 pb-6 pt-2">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-bus-500/15 border border-bus-500/25 flex items-center justify-center">
              <Bus size={22} className="text-bus-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                Unidad {bus.bus_unit}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
                <span className={`text-sm ${status.color}`}>{status.label}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-night-700 flex items-center justify-center"
          >
            <X size={16} className="text-night-300" />
          </button>
        </div>

        {/* Driver info */}
        <div className="bg-night-900/60 rounded-xl p-4 mb-4">
          <div className="text-xs font-medium text-night-400 uppercase tracking-wider mb-3">
            Información del chofer
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-white font-semibold">{bus.driver_name}</div>
              <div className="text-night-300 text-sm mt-0.5">Chofer verificado</div>
            </div>
            <div className="flex items-center gap-1 bg-night-800 rounded-lg px-3 py-1.5">
              <Star size={14} className="text-bus-400 fill-bus-400" />
              <span className="text-white text-sm font-medium">4.8</span>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {bus.speed_kmh > 0 && (
            <div className="bg-night-900/60 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-lg">{bus.speed_kmh}</div>
              <div className="text-night-400 text-xs mt-0.5">km/h</div>
            </div>
          )}
          {bus.eta_minutes !== undefined && (
            <div className="bg-night-900/60 rounded-xl p-3 text-center">
              <div className="text-white font-bold text-lg">{bus.eta_minutes}</div>
              <div className="text-night-400 text-xs mt-0.5">min próx. parada</div>
            </div>
          )}
          <div className="bg-night-900/60 rounded-xl p-3 text-center">
            <div className="text-white font-bold text-lg">{bus.passenger_count}</div>
            <div className="text-night-400 text-xs mt-0.5">usuarios a bordo</div>
          </div>
        </div>

        {/* Next stop */}
        {bus.next_stop_name && (
          <div className="flex items-center gap-3 bg-bus-500/10 border border-bus-500/20 rounded-xl p-3.5 mb-5">
            <MapPin size={18} className="text-bus-400 shrink-0" />
            <div>
              <div className="text-xs text-night-300">Próxima parada</div>
              <div className="text-white font-medium text-sm">{bus.next_stop_name}</div>
            </div>
            {bus.eta_minutes !== undefined && (
              <div className="ml-auto text-bus-400 font-semibold text-sm">
                {bus.eta_minutes} min
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onReport}
            className="flex-1 flex items-center justify-center gap-2 bg-stopped/10 border border-stopped/30 text-stopped rounded-xl py-3 font-medium text-sm transition-colors hover:bg-stopped/20"
          >
            <AlertTriangle size={16} />
            Denunciar
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 bg-night-800 text-night-200 rounded-xl py-3 font-medium text-sm transition-colors hover:bg-night-700">
            <Users size={16} />
            Estoy en este colectivo
          </button>
        </div>
      </div>
    </motion.div>
  )
}