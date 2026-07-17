// src/app/api/routes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { OFFICIAL_ROUTES } from '@/lib/officialRoutes'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lineNumber = searchParams.get('line_number')

  if (!lineNumber) {
    return NextResponse.json({ error: 'line_number is required' }, { status: 400 })
  }

  const apiKey = process.env.TRANSITLAND_API_KEY || 'dummy_transitland_key'
  const url = `https://transit.land/api/v2/rest/routes?route_short_name=${lineNumber}`

  try {
    console.log(`[Transitland API] Fetching routes for Line ${lineNumber} from Transitland...`)
    const response = await fetch(url, {
      headers: {
        'apikey': apiKey,
        'User-Agent': 'TuBus Buenos Aires'
      }
    })

    if (!response.ok) {
      throw new Error(`Transitland API returned status ${response.status}`)
    }

    const data = await response.json()
    console.log(`[Transitland API] Successfully fetched routes from Transitland. Found ${data.routes?.length || 0} routes.`)
    return NextResponse.json(data)
  } catch (error: any) {
    console.warn(`[Transitland API WARNING] Error fetching routes from Transitland: ${error.message}. Falling back to static route data.`)
    
    // Fallback to local static routes to ensure 100% robustness
    const cleanedLineNum = lineNumber === '0' ? '0' : lineNumber.replace(/^0+/, '')
    const localRoute = OFFICIAL_ROUTES[cleanedLineNum]

    if (localRoute) {
      const fallbackRoutes = [
        {
          onestop_id: `r-69u-${cleanedLineNum}`,
          route_short_name: cleanedLineNum,
          route_long_name: localRoute.routeName || `Línea ${cleanedLineNum}`,
          route_color: localRoute.ida?.stops?.[0]?.name ? '10B981' : 'EF4444',
          operator_onestop_id: 'o-69u-buenosaires'
        }
      ]
      return NextResponse.json({ routes: fallbackRoutes, source: 'fallback' })
    }

    return NextResponse.json({ routes: [], source: 'fallback', error: error.message })
  }
}
