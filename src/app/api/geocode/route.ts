import { NextRequest, NextResponse } from 'next/server'

interface CacheItem {
  timestamp: number
  data: any
}

const geoCache = new Map<string, CacheItem>()
const CACHE_TTL_MS = 1000 * 60 * 60 // 1 hour

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  // Reverse geocoding by coordinates
  if (lat && lng) {
    const cacheKey = `rev_${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`
    const cached = geoCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'BienParadaTransitApp/2.0 (contacto@bienparada.com.ar)',
            'Accept-Language': 'es-AR,es;q=0.9',
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        const road = data.address?.road || data.address?.pedestrian || ''
        const houseNumber = data.address?.house_number || ''
        const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.city || ''
        const formatted = road
          ? `${road} ${houseNumber}`.trim() + (suburb ? `, ${suburb}` : '')
          : data.display_name?.split(',').slice(0, 3).join(',') || 'Ubicación identificada'

        const result = { success: true, address: formatted, raw: data }
        geoCache.set(cacheKey, { timestamp: Date.now(), data: result })
        return NextResponse.json(result)
      }
    } catch (e: any) {
      // Fallback response
    }

    return NextResponse.json({
      success: true,
      address: `Ubicación (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`,
    })
  }

  // Forward geocoding by query
  if (q && q.trim().length >= 2) {
    const cleanQ = q.trim().toLowerCase()
    const cacheKey = `fwd_${cleanQ}`
    const cached = geoCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cached.data)
    }

    try {
      const queryWithContext = cleanQ.includes('buenos aires') ? cleanQ : `${cleanQ}, Buenos Aires, Argentina`
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        queryWithContext
      )}&limit=6&viewbox=-58.55,-34.52,-58.33,-34.71&bounded=1`

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BienParadaTransitApp/2.0 (contacto@bienparada.com.ar)',
          'Accept-Language': 'es-AR,es;q=0.9',
        },
      })

      if (res.ok) {
        const data = await res.json()
        const formatted = data.map((item: any) => ({
          title: item.display_name?.split(',').slice(0, 2).join(', ').trim() || item.display_name,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        }))
        const result = { success: true, results: formatted }
        geoCache.set(cacheKey, { timestamp: Date.now(), data: result })
        return NextResponse.json(result)
      }
    } catch (e: any) {
      // Return empty results gracefully
    }
  }

  return NextResponse.json({ success: true, results: [] })
}
