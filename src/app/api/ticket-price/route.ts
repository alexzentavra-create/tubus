import { NextResponse } from 'next/server'

// Returns AMBA Bus ticket prices (updated for June 15, 2026)
export async function GET() {
  try {
    // In a production environment, we could scrape the official site (e.g., argentina.gob.ar/transporte)
    // or parse a reliable RSS feed. We mock a successful real-time fetch here with the official scale.
    return NextResponse.json({
      min: 728.28,
      max: 1227.76,
      subeSinRegistrarMin: 1456.56,
      tarifaSocialMin: 327.72,
      lastUpdated: '2026-06-15T00:00:00Z',
      source: 'Secretaría de Transporte (Argentina)'
    })
  } catch (error) {
    return NextResponse.json({ min: 728.28, max: 1227.76 }, { status: 500 })
  }
}
