# scratch/do_page_replacements.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Z-Indexes stacking contexts
old_origin_group = """          {/* Origin Input Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>"""
new_origin_group = """          {/* Origin Input Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>"""

old_dest_group = """          {/* Destination Input Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 }}>"""
new_dest_group = """          {/* Destination Input Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', zIndex: 9 }}>"""

# 2. Autocomplete Results click handlers with auto-panning
old_origin_click = """                      onClick={() => {
                        setOriginInput(res.name)
                        setOriginCoord({ lat: res.lat, lng: res.lng })
                        setOriginResults([])
                        if (destCoord) {
                          setSolvedRoutes(solveRoutes({ lat: res.lat, lng: res.lng }, destCoord))
                        }
                      }}"""
new_origin_click = """                      onClick={() => {
                        setOriginInput(res.name)
                        setOriginCoord({ lat: res.lat, lng: res.lng })
                        setOriginResults([])
                        if (destCoord) {
                          setSolvedRoutes(solveRoutes({ lat: res.lat, lng: res.lng }, destCoord))
                        }
                        setViewState(v => ({
                          ...v,
                          latitude: res.lat,
                          longitude: res.lng,
                          zoom: 14.5,
                          transitionDuration: 1000
                        }))
                      }}"""

old_dest_click = """                      onClick={() => {
                        setDestInput(res.name)
                        setDestCoord({ lat: res.lat, lng: res.lng })
                        setDestResults([])
                        if (originCoord) {
                          setSolvedRoutes(solveRoutes(originCoord, { lat: res.lat, lng: res.lng }))
                        }
                      }}"""
new_dest_click = """                      onClick={() => {
                        setDestInput(res.name)
                        setDestCoord({ lat: res.lat, lng: res.lng })
                        setDestResults([])
                        if (originCoord) {
                          setSolvedRoutes(solveRoutes(originCoord, { lat: res.lat, lng: res.lng }))
                        }
                        setViewState(v => ({
                          ...v,
                          latitude: res.lat,
                          longitude: res.lng,
                          zoom: 14.5,
                          transitionDuration: 1000
                        }))
                      }}"""

# 3. Action pills replacement in drawer with search & horizontal carousel of circular line badges
old_action_pills = """        {/* Action pills nested below inputs */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            onClick={() => {
              setLineSelectorTab('line')
              setShowLineSelector(true)
            }}
            style={{
              flex: 1, padding: '9px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              background: prefs.darkMap ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <Bus size={14} />
            <span>Por línea</span>
          </button>
          
          <button
            onClick={() => {
              setLineSelectorTab('nearby')
              setShowLineSelector(true)
            }}
            style={{
              flex: 1, padding: '9px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              background: prefs.darkMap ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
            }}
          >
            <MapPin size={14} />
            <span>Cerca mío</span>
          </button>
        </div>"""

new_action_pills = """        {/* Line Search & Horizontal Circles Carousel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'DM Mono' }}>
              Buscar Línea de Colectivo:
            </span>
            {selectedLines.length > 0 && (
              <button
                onClick={() => {
                  setSelectedLines([])
                  setTrackedBusId(null)
                  setDirectionFilter('all')
                  setBranchFilter('all')
                }}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
              >
                Limpiar Selección
              </button>
            )}
          </div>

          {/* Line Search Input */}
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              value={lineSearchQuery}
              onChange={e => setLineSearchQuery(e.target.value)}
              placeholder="Escribí el número de línea..."
              style={{
                width: '100%', padding: '8px 12px 8px 30px', borderRadius: '10px',
                background: prefs.darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                color: 'var(--text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Horizontal Scroll of Circles */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '10px',
            overflowX: 'auto',
            padding: '4px 2px 8px 2px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {allLines
              .filter(line => !line.is_tourist)
              .filter(line => 
                line.line_number.includes(lineSearchQuery) || 
                line.name.toLowerCase().includes(lineSearchQuery.toLowerCase())
              )
              .map(line => {
                const isSelected = selectedLines.some(l => l.id === line.id)
                return (
                  <button
                    key={line.id}
                    onClick={() => {
                      setSelectedLines(prev => {
                        const exists = prev.some(l => l.id === line.id)
                        if (exists) {
                          return prev.filter(l => l.id !== line.id)
                        } else {
                          // Toggle single line focus for clarity
                          return [line]
                        }
                      })
                      // Pan to line bounds
                      const bounds = getLineBounds(line)
                      if (bounds) {
                        setViewState(v => ({
                          ...v,
                          latitude: (bounds.minLat + bounds.maxLat) / 2,
                          longitude: (bounds.minLng + bounds.maxLng) / 2,
                          zoom: 12.5,
                          transitionDuration: 1000
                        }))
                      }
                    }}
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: isSelected ? line.color : (prefs.darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                      border: `2px solid ${line.color}`,
                      color: isSelected ? '#ffffff' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '13px',
                      fontFamily: 'DM Sans',
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: isSelected ? `0 0 12px ${line.color}aa` : 'none',
                      transition: 'all 200ms',
                      outline: 'none'
                    }}
                    title={line.name}
                  >
                    {line.line_number}
                  </button>
                )
              })}
          </div>
        </div>"""

# 4. Map click handler auto-panning
old_map_click = """          onClick={e => {
            if (mapSelectionMode === 'origin') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setOriginCoord({ lat, lng })
              setOriginInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setOriginInput)
              setMapSelectionMode(null)
              setLineSelectorTab('route')
              setShowLineSelector(true)
              if (destCoord) {
                setTravelRoute(solveRoute({ lat, lng }, destCoord))
              }
            } else if (mapSelectionMode === 'destination') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setDestCoord({ lat, lng })
              setDestInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setDestInput)
              setMapSelectionMode(null)
              setLineSelectorTab('route')
              setShowLineSelector(true)
              if (originCoord) {
                setTravelRoute(solveRoute(originCoord, { lat, lng }))
              }
            } else {
              setSelectedBus(null)
            }
          }}"""

new_map_click = """          onClick={e => {
            if (mapSelectionMode === 'origin') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setOriginCoord({ lat, lng })
              setOriginInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setOriginInput)
              setMapSelectionMode(null)
              if (destCoord) {
                setSolvedRoutes(solveRoutes({ lat, lng }, destCoord))
              }
              setViewState(v => ({
                ...v,
                latitude: lat,
                longitude: lng,
                zoom: 14.5,
                transitionDuration: 1000
              }))
            } else if (mapSelectionMode === 'destination') {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setDestCoord({ lat, lng })
              setDestInput(getNearestStreetName(lat, lng))
              fetchAddressAsync(lat, lng, setDestInput)
              setMapSelectionMode(null)
              if (originCoord) {
                setSolvedRoutes(solveRoutes(originCoord, { lat, lng }))
              }
              setViewState(v => ({
                ...v,
                latitude: lat,
                longitude: lng,
                zoom: 14.5,
                transitionDuration: 1000
              }))
            } else {
              setSelectedBus(null)
            }
          }}"""

# 5. Teardrop pins for Map Markers (Origen & Destino)
old_origin_marker = """              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#3B82F6', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', marginBottom: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.4)', whiteSpace: 'nowrap' }}>Origen</div>
                <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: '#3B82F6', border: '2.5px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
              </div>"""

new_origin_marker = """              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#3B82F6', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>Origen</div>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50% 50% 50% 0',
                  background: '#3B82F6',
                  transform: 'rotate(-45deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                  border: '1.5px solid white'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                </div>
              </div>"""

old_dest_marker = """              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#111827', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '8px', fontWeight: 'bold', marginBottom: '3px', boxShadow: '0 2px 4px rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap' }}>Destino</div>
                <div style={{ width: '14px', height: '14px', borderRadius: '2px', background: '#111827', border: '2.5px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' }} />
              </div>"""

new_dest_marker = """              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#EF4444', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>Destino</div>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50% 50% 50% 0',
                  background: '#EF4444',
                  transform: 'rotate(-45deg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.35)',
                  border: '1.5px solid white'
                }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
                </div>
              </div>"""

replaces = [
    (old_origin_group, new_origin_group, "Origin Group z-index"),
    (old_dest_group, new_dest_group, "Destination Group z-index"),
    (old_origin_click, new_origin_click, "Origin Click auto-pan"),
    (old_dest_click, new_dest_click, "Destination Click auto-pan"),
    (old_action_pills, new_action_pills, "Action Pills -> Search/Carousel"),
    (old_map_click, new_map_click, "Map Click auto-pan"),
    (old_origin_marker, new_origin_marker, "Origin Marker teardrop design"),
    (old_dest_marker, new_dest_marker, "Destination Marker teardrop design")
]

success = True
for old, new, name in replaces:
    if old in code:
        code = code.replace(old, new, 1)
        print(f"SUCCESS: {name} replaced.")
    else:
        print(f"WARNING: {name} not found! Check code matching.")
        success = False

if success:
    with open("src/app/page.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    print("SUCCESS: All page replacements applied!")
else:
    print("ERROR: Some replacements were not found. page.tsx was NOT written.")
