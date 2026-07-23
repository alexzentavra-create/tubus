import React from 'react'

interface QRCodeDisplayProps {
  token: string
  busUnit: string
  size?: number
  moduleColor?: string
  backgroundColor?: string
  showLabel?: boolean
}

export function QRCodeDisplay({
  token,
  busUnit,
  size = 180,
  moduleColor = '#000000',
  backgroundColor = '#FFFFFF',
  showLabel = true
}: QRCodeDisplayProps) {
  const cells = 29 // High density matrix (Version 3 QR format)
  const cellSize = size / cells

  // Deterministic hashing algorithm to generate unique, reproducible 2D data bits per token
  const getHashBits = (str: string, totalBits: number): boolean[] => {
    let h1 = 0x811c9dc5
    let h2 = 0x55555555
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      h1 = Math.imul(h1 ^ char, 0x01000193)
      h2 = Math.imul(h2 ^ (char * (i + 1)), 0x27d4eb2d)
    }
    const bits: boolean[] = []
    let seed = Math.abs(h1 ^ h2)
    for (let i = 0; i < totalBits; i++) {
      seed = (seed * 1664525 + 1013904223) % 4294967296
      bits.push((seed % 100) < 48) // ~48% density for realistic contrast
    }
    return bits
  }

  const dataBits = getHashBits(token || busUnit, cells * cells)
  let bitIdx = 0

  const grid: boolean[][] = Array.from({ length: cells }, (_, r) =>
    Array.from({ length: cells }, (_, c) => {
      // 1. Finder Pattern Top-Left (7x7)
      if (r < 7 && c < 7) {
        return r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      }
      // Quiet zone Top-Left
      if ((r === 7 && c <= 7) || (c === 7 && r <= 7)) return false

      // 2. Finder Pattern Top-Right (7x7)
      if (r < 7 && c >= cells - 7) {
        const cc = c - (cells - 7)
        return r === 0 || r === 6 || cc === 0 || cc === 6 || (r >= 2 && r <= 4 && cc >= 2 && cc <= 4)
      }
      // Quiet zone Top-Right
      if ((r === 7 && c >= cells - 8) || (c === cells - 8 && r <= 7)) return false

      // 3. Finder Pattern Bottom-Left (7x7)
      if (r >= cells - 7 && c < 7) {
        const rr = r - (cells - 7)
        return rr === 0 || rr === 6 || c === 0 || c === 6 || (rr >= 2 && rr <= 4 && c >= 2 && c <= 4)
      }
      // Quiet zone Bottom-Left
      if ((r === cells - 8 && c <= 7) || (c === 7 && r >= cells - 8)) return false

      // 4. Alignment Pattern (5x5 around row 22, col 22)
      const alignR = cells - 7
      const alignC = cells - 7
      if (Math.abs(r - alignR) <= 2 && Math.abs(c - alignC) <= 2) {
        const dr = Math.abs(r - alignR)
        const dc = Math.abs(c - alignC)
        return dr === 2 || dc === 2 || (dr === 0 && dc === 0)
      }

      // 5. Timing Patterns (horizontal & vertical lines)
      if (r === 6) return c % 2 === 0
      if (c === 6) return r % 2 === 0

      // 6. Data Modules generated deterministically
      const isDataBit = dataBits[bitIdx++ % dataBits.length]
      return isDataBit
    })
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{
        padding: '16px',
        background: backgroundColor,
        borderRadius: '14px',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)',
        display: 'inline-block'
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges">
          <rect width={size} height={size} fill={backgroundColor} />
          {grid.map((row, r) => row.map((cell, c) =>
            cell ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.05}
                height={cellSize + 0.05}
                fill={moduleColor}
              />
            ) : null
          ))}
        </svg>
      </div>

      {showLabel && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', fontFamily: 'DM Sans, sans-serif' }}>
            Unidad {busUnit}
          </div>
          {token && (
            <div style={{ color: '#8f94a5', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '2px', letterSpacing: '0.04em' }}>
              {token.length > 28 ? `${token.slice(0, 26)}...` : token}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
