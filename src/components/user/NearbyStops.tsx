'use client'

import { motion } from 'framer-motion'
import { MapPin, Clock } from 'lucide-react'
import type { BusStop } from '@/types'

export default function NearbyStops({ stops }: { stops: BusStop[] }) {
  return (
    <motion.div
      className="bottom-sheet safe-bottom"
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 200 }}
    >
      <div className="flex justify-center pt-3">
        <div className="w-10 h-1 rounded-full bg-night-700" />
      </div>
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-bus-400" />
          <h3 className="text-white font-semibold">Paradas cercanas</h3>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto scroll-panel">
          {stops.slice(0, 6).map((stop: BusStop) => (
            <div key={stop.id} className="flex items-center gap-3 py-2 border-b border-night-800 last:border-0">
              <div className="w-8 h-8 rounded-lg bg-night-800 flex items-center justify-center shrink-0">
                <MapPin size={14} className="text-night-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{stop.street_name}</div>
                <div className="text-night-400 text-xs">{stop.name}</div>
              </div>
              <div className="flex items-center gap-1 text-night-400 text-xs">
                <Clock size={11} />
                <span>~{stop.avg_wait_minutes} min</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}