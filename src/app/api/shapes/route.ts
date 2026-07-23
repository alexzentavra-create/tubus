// src/app/api/shapes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { OFFICIAL_ROUTES } from '@/lib/officialRoutes'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const routeId = searchParams.get('route_id')
  const lineNumber = searchParams.get('line_number')

  if (!routeId && !lineNumber) {
    return NextResponse.json({ error: 'route_id or line_number is required' }, { status: 400 })
  }

  const apiKey = process.env.TRANSITLAND_API_KEY || 'dummy_transitland_key'
  const targetRouteId = routeId || `r-69u-${lineNumber}`
  const url = `https://transit.land/api/v2/rest/shapes?route_onestop_id=${targetRouteId}`

  try {
    console.log(`[Transitland API] Fetching shapes for Route ${targetRouteId} from Transitland...`)
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'User-Agent': 'BienParada Buenos Aires'
      }
    })

    if (!response.ok) {
      throw new Error(`Transitland API returned status ${response.status}`)
    }

    const data = await response.json()
    console.log(`[Transitland API] Successfully fetched shapes from Transitland. Found ${data.shapes?.length || 0} shapes.`)
    return NextResponse.json(data)
  } catch (error: any) {
    console.warn(`[Transitland API WARNING] Error fetching shapes for ${targetRouteId}: ${error.message}. Falling back to static shapes.`)
    
    // Parse line number from routeId or parameter
    let lineNum = lineNumber || ''
    if (!lineNum && routeId) {
      const match = routeId.match(/r-69u-(\d+)/)
      if (match) lineNum = match[1]
    }
    const cleanedLineNum = lineNum.replace(/^0+/, '')
    const localRoute = OFFICIAL_ROUTES[cleanedLineNum]

    if (localRoute) {
      const fallbackShapes = [
        {
          onestop_id: `s-69u-${cleanedLineNum}-ida`,
          route_onestop_id: `r-69u-${cleanedLineNum}`,
          geometry: {
            type: 'LineString',
            coordinates: (localRoute.ida?.path || []).map(pt => [pt.lng, pt.lat])
          },
          direction: 'ida'
        },
        {
          onestop_id: `s-69u-${cleanedLineNum}-vuelta`,
          route_onestop_id: `r-69u-${cleanedLineNum}`,
          geometry: {
            type: 'LineString',
            coordinates: (localRoute.vuelta?.path || []).map(pt => [pt.lng, pt.lat])
          },
          direction: 'vuelta'
        }
      ]
      return NextResponse.json({ shapes: fallbackShapes, source: 'fallback' })
    }

    return NextResponse.json({ shapes: [], source: 'fallback', error: error.message })
  }
}
