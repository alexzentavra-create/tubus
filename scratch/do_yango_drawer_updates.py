# scratch/do_yango_drawer_updates.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

# 1. Modify src/types/index.ts to add optional pathIndex?: number to BusStop
with open("src/types/index.ts", "r", encoding="utf-8") as f:
    types_code = f.read()

old_stop_def = """export interface BusStop {
  id: string
  line_id: string
  name: string
  street_name: string
  cross_street?: string
  stop_number: number     // sequence in the route
  latitude: number
  longitude: number
  direction: 'ida' | 'vuelta'
  avg_wait_minutes: number
  total_daily_users: number
}"""

new_stop_def = """export interface BusStop {
  id: string
  line_id: string
  name: string
  street_name: string
  cross_street?: string
  stop_number: number     // sequence in the route
  latitude: number
  longitude: number
  direction: 'ida' | 'vuelta'
  avg_wait_minutes: number
  total_daily_users: number
  pathIndex?: number      // path coordinate alignment index
}"""

if old_stop_def in types_code:
    types_code = types_code.replace(old_stop_def, new_stop_def, 1)
    with open("src/types/index.ts", "w", encoding="utf-8") as f:
        f.write(types_code)
    print("SUCCESS: types/index.ts updated with pathIndex.")
else:
    print("WARNING: types/index.ts stop definition not found or already modified.")


# 2. Modify src/lib/mockData.ts to copy pathIndex to the generated stop objects
with open("src/lib/mockData.ts", "r", encoding="utf-8") as f:
    mock_code = f.read()

old_stops_mapping = """      return dirObj.stops.map((stop, index) => ({
        id: `${line.id}-official-${stop.id}-${direction}`,
        line_id: line.id,
        name: stop.name,
        street_name: stop.name,
        stop_number: index + 1,
        latitude: stop.lat,
        longitude: stop.lng,
        direction: direction,
        avg_wait_minutes: 6,
        total_daily_users: 120,
      }))"""

new_stops_mapping = """      return dirObj.stops.map((stop, index) => ({
        id: `${line.id}-official-${stop.id}-${direction}`,
        line_id: line.id,
        name: stop.name,
        street_name: stop.name,
        stop_number: index + 1,
        latitude: stop.lat,
        longitude: stop.lng,
        direction: direction,
        avg_wait_minutes: 6,
        total_daily_users: 120,
        pathIndex: (stop as any).pathIndex,
      }))"""

if old_stops_mapping in mock_code:
    mock_code = mock_code.replace(old_stops_mapping, new_stops_mapping, 1)
    with open("src/lib/mockData.ts", "w", encoding="utf-8") as f:
        f.write(mock_code)
    print("SUCCESS: mockData.ts updated to map pathIndex.")
else:
    print("WARNING: mockData.ts stops mapping not found or already modified.")


# 3. Modify src/app/page.tsx to implement Yango drawer layout & map path slicing
with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    page_code = f.read()

# 3.1 Slice routeGeoJsons coordinates in page.tsx if activeTravelRoute matches the line
old_route_geojsons_slice = """  const routeGeoJsons = linesToDraw.map(line => {
    const lineShapes = transitlandShapes.filter(s => {
      return s.route_onestop_id?.includes(line.line_number) || s.onestop_id?.includes(line.line_number)
    })

    const paths = lineShapes.length > 0
      ? lineShapes.map(s => s.geometry.coordinates.map(([lng, lat]: any) => ({ lat, lng })))
      : getMockRoutePathsForLine(line, directionFilter)

    return {
      id: `route-${line.id}`,
      color: line.color,
      features: paths.map((path, pIdx) => ({
        type: 'Feature' as const,
        properties: { color: line.color },
        geometry: {
          type: 'LineString' as const,
          coordinates: path.map((point: any) => [point.lng, point.lat]),
        }
      }))
    }
  })"""

new_route_geojsons_slice = """  const routeGeoJsons = linesToDraw.map(line => {
    const lineShapes = transitlandShapes.filter(s => {
      return s.route_onestop_id?.includes(line.line_number) || s.onestop_id?.includes(line.line_number)
    })

    const paths = lineShapes.length > 0
      ? lineShapes.map(s => s.geometry.coordinates.map(([lng, lat]: any) => ({ lat, lng })))
      : getMockRoutePathsForLine(line, directionFilter)

    // Slice coordinates to show ONLY the trip portion if activeTravelRoute is set for this line
    let pathsToDraw = paths
    if (activeTravelRoute && activeTravelRoute.line_id === line.id) {
      const stops = getMockStopsForLine(line, directionFilter)
      const stopO = stops.find(s => s.id === activeTravelRoute.originStop.id)
      const stopD = stops.find(s => s.id === activeTravelRoute.destStop.id)
      
      // Look up pathIndex, fallback to closest segment search if undefined
      let idxO = stopO?.pathIndex
      let idxD = stopD?.pathIndex
      
      if (idxO === undefined || idxD === undefined) {
        const pathRef = paths[0] || []
        if (idxO === undefined && stopO) {
          let minD = Infinity
          pathRef.forEach((pt: any, idx: number) => {
            const dist = Math.hypot(pt.lat - stopO.latitude, pt.lng - stopO.longitude)
            if (dist < minD) { minD = dist; idxO = idx }
          })
        }
        if (idxD === undefined && stopD) {
          let minD = Infinity
          pathRef.forEach((pt: any, idx: number) => {
            const dist = Math.hypot(pt.lat - stopD.latitude, pt.lng - stopD.longitude)
            if (dist < minD) { minD = dist; idxD = idx }
          })
        }
      }

      const startIdx = Math.min(idxO ?? 0, idxD ?? (paths[0]?.length ? paths[0].length - 1 : 0))
      const endIdx = Math.max(idxO ?? 0, idxD ?? (paths[0]?.length ? paths[0].length - 1 : 0))
      pathsToDraw = paths.map(path => path.slice(startIdx, endIdx + 1))
    }

    return {
      id: `route-${line.id}`,
      color: line.color,
      features: pathsToDraw.map((path, pIdx) => ({
        type: 'Feature' as const,
        properties: { color: line.color },
        geometry: {
          type: 'LineString' as const,
          coordinates: path.map((point: any) => [point.lng, point.lat]),
        }
      }))
    }
  })"""

if old_route_geojsons_slice in page_code:
    page_code = page_code.replace(old_route_geojsons_slice, new_route_geojsons_slice, 1)
    print("SUCCESS: page.tsx updated with map path slicing.")
else:
    print("ERROR: routeGeoJsons slicing pattern not found!")

# 3.2 Update travel-walking GeoJSON generator to support activeTravelRoute stop coordinates
old_walking_geojson = """          {showTravelPins && travelRoute && originCoord && destCoord && (
            <Source id="travel-route-geojson" type="geojson" data={{
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [originCoord.lng, originCoord.lat],
                      [travelRoute.originStop.longitude, travelRoute.originStop.latitude]
                    ]
                  }
                },
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [travelRoute.destStop.longitude, travelRoute.destStop.latitude],
                      [destCoord.lng, destCoord.lat]
                    ]
                  }
                }
              ]
            }}>
              <Layer
                id="travel-walking"
                type="line"
                paint={{ 'line-color': '#B8C8E0', 'line-width': 3, 'line-dasharray': [2, 2] }}
              />
            </Source>
          )}"""

new_walking_geojson = """          {showTravelPins && (activeTravelRoute || travelRoute) && originCoord && destCoord && (
            <Source id="travel-route-geojson" type="geojson" data={{
              type: 'FeatureCollection',
              features: [
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [originCoord.lng, originCoord.lat],
                      [(activeTravelRoute || travelRoute).originStop.longitude, (activeTravelRoute || travelRoute).originStop.latitude]
                    ]
                  }
                },
                {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: [
                      [(activeTravelRoute || travelRoute).destStop.longitude, (activeTravelRoute || travelRoute).destStop.latitude],
                      [destCoord.lng, destCoord.lat]
                    ]
                  }
                }
              ]
            }}>
              <Layer
                id="travel-walking"
                type="line"
                paint={{ 'line-color': '#B8C8E0', 'line-width': 3, 'line-dasharray': [2, 2] }}
              />
            </Source>
          )}"""

if old_walking_geojson in page_code:
    page_code = page_code.replace(old_walking_geojson, new_walking_geojson, 1)
    print("SUCCESS: page.tsx updated walking GeoJSON.")
else:
    print("ERROR: travel-route-geojson block not found!")

# 3.3 Replace renderDrawerContent with new Yango layout
# Let's find "const renderDrawerContent = () => {" up to the end of the function

new_drawer_body_pattern = """  // Render content inside the sliding travel assistant drawer
  const renderDrawerContent = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%' }}>
        {/* Title: TU VIAJE / YOUR TRIP */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <span style={{ fontSize: '14px', fontWeight: 900, color: 'var(--text-primary)', fontFamily: 'DM Sans', letterSpacing: '-0.02em', textTransform: 'uppercase' }}>
            TU VIAJE (YOUR TRIP)
          </span>
          {selectedLines.length > 0 && (
            <button
              onClick={() => {
                setSelectedLines([])
                setActiveTravelRoute(null)
                setTrackedBusId(null)
                setSolvedRoutes([])
              }}
              style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 700 }}
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Inputs stacked with vertical connector in a clean card */}
        <div style={{
          background: prefs.darkMap ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
          border: prefs.darkMap ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
          borderRadius: '16px',
          padding: '12px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Vertical connector line */}
          <div style={{
            position: 'absolute',
            left: '23px',
            top: '28px',
            bottom: '28px',
            width: '2px',
            background: prefs.darkMap ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            zIndex: 1
          }} />
          
          {/* Origin Input Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
            {/* Pickup human icon */}
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(59,130,246,0.15)', color: '#3B82F6',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <User size={13} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={originInput}
                onChange={e => {
                  setOriginInput(e.target.value)
                  fetchAutocomplete(e.target.value, true)
                }}
                placeholder="Origen (¿Dónde te encontrás?)"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px',
                  background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {originResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                  background: prefs.darkMap ? '#1e293b' : '#ffffff',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px', overflow: 'hidden', marginTop: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {originResults.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setOriginInput(res.name)
                        setOriginCoord({ lat: res.lat, lng: res.lng })
                        setOriginResults([])
                        if (destCoord) {
                          const routes = solveRoutes({ lat: res.lat, lng: res.lng }, destCoord)
                          setSolvedRoutes(routes)
                          if (routes.length > 0) {
                            setActiveTravelRoute(routes[0])
                            const line = allLines.find(l => l.id === routes[0].line_id)
                            if (line) setSelectedLines([line])
                          }
                        }
                        setViewState(v => ({ ...v, latitude: res.lat, longitude: res.lng, zoom: 14.5, transitionDuration: 1000 }))
                      }}
                      style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: idx < originResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', color: 'var(--text-primary)' }}
                    >
                      📍 {res.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setMapSelectionMode('origin'); setOriginResults([]) }}
              style={{
                background: 'rgba(59,130,246,0.12)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.25)',
                borderRadius: '8px', padding: '8px 10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0
              }}
            >
              Pin
            </button>
          </div>

          {/* Destination Input Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9 }}>
            {/* Checkered flag icon */}
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: 'rgba(239,68,68,0.15)', color: '#EF4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <NavIcon size={12} style={{ transform: 'rotate(45deg)' }} />
            </div>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={destInput}
                onChange={e => {
                  setDestInput(e.target.value)
                  fetchAutocomplete(e.target.value, false)
                }}
                placeholder="Destino (¿A dónde vamos?)"
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: '10px',
                  background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                }}
              />
              {destResults.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 1000,
                  background: prefs.darkMap ? '#1e293b' : '#ffffff',
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                  borderRadius: '8px', overflow: 'hidden', marginTop: '4px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                }}>
                  {destResults.map((res: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setDestInput(res.name)
                        setDestCoord({ lat: res.lat, lng: res.lng })
                        setDestResults([])
                        if (originCoord) {
                          const routes = solveRoutes(originCoord, { lat: res.lat, lng: res.lng })
                          setSolvedRoutes(routes)
                          if (routes.length > 0) {
                            setActiveTravelRoute(routes[0])
                            const line = allLines.find(l => l.id === routes[0].line_id)
                            if (line) setSelectedLines([line])
                          }
                        }
                        setViewState(v => ({ ...v, latitude: res.lat, longitude: res.lng, zoom: 14.5, transitionDuration: 1000 }))
                      }}
                      style={{ padding: '8px 12px', fontSize: '12px', cursor: 'pointer', borderBottom: idx < destResults.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none', color: 'var(--text-primary)' }}
                    >
                      📍 {res.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => { setMapSelectionMode('destination'); setDestResults([]) }}
              style={{
                background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '8px', padding: '8px 10px', fontSize: '12px', cursor: 'pointer', flexShrink: 0
              }}
            >
              Pin
            </button>
          </div>
        </div>

        {/* Mode Selector Row (Normal, Turismo, Bares, Compras) - Yango Pill Tabs style */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          {([
            { id: 'normal', label: 'Normal' },
            { id: 'tourist', label: 'Turismo' },
            { id: 'clubbing', label: 'Bares' },
            { id: 'shopping', label: 'Compras' }
          ] as const).map(m => {
            const active = activeMode === m.id
            return (
              <button
                key={m.id}
                onClick={() => {
                  setActiveMode(m.id)
                  if (m.id === 'tourist') {
                    setTouristYellowSelected(true)
                    setTouristRedSelected(true)
                    const yellowLine = allLines.find(l => l.line_number === 'T-Amarillo')
                    const redLine = allLines.find(l => l.line_number === 'T-Rojo')
                    setSelectedLines(prev => {
                      const next = [...prev]
                      if (yellowLine && !next.some(l => l.id === yellowLine.id)) next.push(yellowLine)
                      if (redLine && !next.some(l => l.id === redLine.id)) next.push(redLine)
                      return next
                    })
                  } else {
                    setSelectedLines(prev => prev.filter(l => !(l as any).is_tourist))
                    setActiveTravelRoute(null)
                  }
                }}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 700,
                  background: active 
                    ? 'var(--text-primary)' 
                    : (prefs.darkMap ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                  border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
                  color: active 
                    ? (prefs.darkMap ? '#000000' : '#ffffff') 
                    : 'var(--text-secondary)',
                  cursor: 'pointer', transition: 'all 150ms', flexShrink: 0
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>

        {/* Bus Line selector - replaced car types scroll */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'DM Mono', textTransform: 'uppercase' }}>
            {solvedRoutes.length > 0 ? 'Líneas recomendadas' : 'Líneas disponibles'}
          </span>
          <div style={{
            display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px',
            scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch'
          }}>
            {(() => {
              const activeLines = lines.length > 0 ? lines : MOCK_LINES
              const linesToDisplay = solvedRoutes.length > 0
                ? solvedRoutes.map(r => ({
                    ...r,
                    line: activeLines.find(l => l.id === r.line_id)
                  })).filter(r => r.line !== undefined)
                : activeLines.filter(line => {
                    if (activeMode === 'tourist') return line.is_tourist
                    return !line.is_tourist
                  })

              return linesToDisplay.map((item: any) => {
                const line = item.line || item
                const isSelected = selectedLines.some(l => l.id === line.id)
                const eta = item.originStop ? calculateRouteTimeMinutes(item, allLines) : null
                
                return (
                  <div
                    key={line.id}
                    onClick={() => {
                      setSelectedLines(prev => {
                        const exists = prev.some(l => l.id === line.id)
                        if (exists) {
                          return prev.filter(l => l.id !== line.id)
                        } else {
                          return [...prev, line]
                        }
                      })
                      if (item.originStop) {
                        setActiveTravelRoute(prev => prev?.line_id === item.line_id ? null : item)
                      }
                    }}
                    style={{
                      flexShrink: 0,
                      width: '105px',
                      padding: '10px 8px',
                      borderRadius: '12px',
                      background: isSelected 
                        ? (prefs.darkMap ? 'rgba(34,211,160,0.1)' : 'rgba(34,211,160,0.06)') 
                        : (prefs.darkMap ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'),
                      border: `2.5px solid ${isSelected ? line.color : (prefs.darkMap ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)')}`,
                      boxShadow: isSelected ? `0 4px 12px ${line.color}33` : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 200ms',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%',
                      background: line.color, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: 'white', boxShadow: `0 2px 6px ${line.color}66`
                    }}>
                      <Bus size={16} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)' }}>
                        Línea {line.line_number}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '85px' }}>
                        {eta ? `~${eta} min` : `${line.total_stops} paradas`}
                      </div>
                    </div>
                  </div>
                )
              })
            })()}
          </div>
        </div>

        {/* Bottom Bar: Payment Icon + Main Button + Filters (Matches Yango bottom bar style) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid rgba(184,200,224,0.08)', paddingTop: '10px', marginTop: 'auto' }}>
          {/* Visa/SUBE card badge */}
          <div style={{
            width: '42px', height: '34px', borderRadius: '8px',
            background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }} title="SUBE Card">
            <span style={{ fontSize: '9px', fontWeight: 900, color: '#0057B7', fontFamily: 'system-ui' }}>SUBE</span>
          </div>

          {/* Main button: Comenzar Viaje / Request */}
          <button
            onClick={() => {
              if (originCoord && destCoord) {
                const routes = solveRoutes(originCoord, destCoord)
                setSolvedRoutes(routes)
                if (routes.length > 0) {
                  setActiveTravelRoute(routes[0])
                  const line = allLines.find(l => l.id === routes[0].line_id)
                  if (line) setSelectedLines([line])
                }
                setDrawerState('half')
                toast.success("¡Colectivos recomendados actualizados!")
              } else {
                toast.error("Por favor ingresá origen y destino primero.")
              }
            }}
            style={{
              flex: 1, height: '42px', background: prefs.darkMap ? '#ffffff' : '#111827',
              color: prefs.darkMap ? '#000000' : '#ffffff', border: 'none', borderRadius: '10px',
              fontSize: '13px', fontWeight: 800, cursor: 'pointer', transition: 'all 200ms'
            }}
          >
            Buscar Colectivos
          </button>

          {/* Filters/Settings icon button */}
          <button
            onClick={() => updatePrefs({ darkMap: !prefs.darkMap })}
            style={{
              width: '42px', height: '34px', borderRadius: '8px',
              background: prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: prefs.darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
              color: 'var(--text-primary)'
            }}
            title="Ajustar Mapa"
          >
            <Sliders size={14} />
          </button>
        </div>

        {/* Premium Advertisement Card */}
        {((drawerState === 'expanded' || !isMobile)) && (
          <div style={{
            padding: '12px',
            borderRadius: '14px',
            background: prefs.darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
            border: prefs.darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#10B981', fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>Anuncio</span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Patrocinado</span>
            </div>
            <div style={{ borderRadius: '8px', overflow: 'hidden', width: '100%', border: '1px solid rgba(184, 200, 224, 0.15)' }}>
              <img src="/images/tufix-ad.png" alt="TUFIX Ad" style={{ width: '100%', height: 'auto', display: 'block' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>TUFIX - Contratá Profesionales</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>El trabajador ideal para vos.</span>
              </div>
              <button
                onClick={() => window.open('https://tufix.com', '_blank')}
                style={{
                  padding: '5px 12px', background: '#10B981', color: 'white', border: 'none', borderRadius: '6px',
                  fontSize: '10px', fontWeight: 700, cursor: 'pointer', transition: 'all 200ms'
                }}
              >
                Ver más
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }
"""

idx_start = page_code.find("  // Render content inside the sliding travel assistant drawer")
idx_end = page_code.find("  const showTravelPins = (drawerState !== 'collapsed')")

if idx_start != -1 and idx_end != -1:
    page_code = page_code[:idx_start] + new_drawer_body_pattern + "\n\n" + page_code[idx_end:]
    print("SUCCESS: renderDrawerContent fully refactored to Yango style.")
else:
    print("ERROR: could not locate renderDrawerContent function boundaries!")

with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(page_code)
print("SUCCESS: Yango updates fully applied.")
