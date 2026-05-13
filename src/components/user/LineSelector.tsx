'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X, Bus } from 'lucide-react'
import type { BusLine } from '@/types'

interface Props {
  lines: BusLine[]
  selectedLine: BusLine | null
  onSelect: (line: BusLine) => void
  onClose: () => void
}

export default function LineSelector({ lines, selectedLine, onSelect, onClose }: Props) {
  const [query, setQuery] = useState('')
  const filtered = lines.filter(l =>
    l.line_number.includes(query) ||
    l.name.toLowerCase().includes(query.toLowerCase()) ||
    l.company?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className="relative w-full max-w-md glass-panel mx-4 mb-4 sm:mb-0 overflow-hidden"
        initial={{ y: 60, scale: 0.97, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28 }}
        style={{ maxHeight: '80vh' }}
      >
        <div className="flex items-center justify-between p-5 border-b border-night-700">
          <h3 className="text-white font-bold text-lg">Elegí una línea</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-night-700 flex items-center justify-center">
            <X size={16} className="text-night-300" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-night-400" />
            <input
              autoFocus
              type="text"
              className="bus-input pl-10"
              placeholder="Buscá por número o destino..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto scroll-panel px-4 pb-5" style={{ maxHeight: '55vh' }}>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <Bus size={32} className="text-night-600 mx-auto mb-2" />
              <p className="text-night-400 text-sm">No encontramos esa línea</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(line => (
                <button
                  key={line.id}
                  onClick={() => onSelect(line)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedLine?.id === line.id
                      ? 'border-bus-500 bg-bus-500/10'
                      : 'border-night-700 bg-night-900/60 hover:border-night-500'
                  }`}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shrink-0"
                    style={{ background: line.color }}
                  >
                    {line.line_number}
                  </div>
                  <div className="min-w-0">
                    <div className="text-white font-medium text-sm truncate">
                      {line.name.split(' - ')[1] || line.name}
                    </div>
                    <div className="text-night-400 text-xs mt-0.5">{line.company}</div>
                  </div>
                  {selectedLine?.id === line.id && (
                    <div className="ml-auto w-5 h-5 rounded-full bg-bus-500 flex items-center justify-center shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}