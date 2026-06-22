# scratch/do_selector_replacements.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/components/user/LineSelector.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. LineSelector line tab circular badges carousel
old_line_tab = """          {/* ── LINE TAB ── */}
          {tab === 'line' && (
            <>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Número o nombre de línea..."
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px', background: darkMap ? 'rgba(6,8,16,0.6)' : 'rgba(255,255,255,0.9)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.1)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {filtered.map(line => (
                  <LineItem key={line.id} line={line} selected={selectedLines.some(l => l.id === line.id)} onSelect={() => onSelect(line)} darkMap={darkMap} />
                ))}
                {filtered.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', fontFamily: 'DM Sans' }}>Sin resultados para "{q}"</p>
                )}
              </div>
            </>
          )}"""

new_line_tab = """          {/* ── LINE TAB ── */}
          {tab === 'line' && (
            <>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  autoFocus
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Número o nombre de línea..."
                  style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: '10px', background: darkMap ? 'rgba(6,8,16,0.6)' : 'rgba(255,255,255,0.9)', border: darkMap ? '1px solid rgba(184,200,224,0.1)' : '1px solid rgba(0,0,0,0.1)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '12px',
                overflowX: 'auto',
                padding: '6px 4px 12px 4px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                WebkitOverflowScrolling: 'touch',
                width: '100%',
                boxSizing: 'border-box'
              }}>
                {filtered.map(line => {
                  const isSelected = selectedLines.some(l => l.id === line.id)
                  return (
                    <button
                      key={line.id}
                      onClick={() => onSelect(line)}
                      style={{
                        width: '50px',
                        height: '50px',
                        borderRadius: '50%',
                        background: isSelected ? line.color : (darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        border: `2.5px solid ${line.color}`,
                        color: isSelected ? '#ffffff' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '14px',
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
                {filtered.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px 0', fontFamily: 'DM Sans', flexShrink: 0, width: '100%' }}>Sin resultados para "{q}"</p>
                )}
              </div>
            </>
          )}"""

# 2. Panning resolved coordinates in LineSelector inputs
old_origin_resolver = """                          const coord = resolveStreetToCoords(e.target.value)
                          if (coord) {
                            setOriginCoord(coord)
                            if (destCoord) setTravelRoute(solveRoute(coord, destCoord))
                          }"""

new_origin_resolver = """                          const coord = resolveStreetToCoords(e.target.value)
                          if (coord) {
                            setOriginCoord(coord)
                            setViewState((v: any) => ({
                              ...v,
                              latitude: coord.lat,
                              longitude: coord.lng,
                              zoom: 14.5,
                              transitionDuration: 1000
                            }))
                            if (destCoord) setTravelRoute(solveRoute(coord, destCoord))
                          }"""

old_dest_resolver = """                          const coord = resolveStreetToCoords(e.target.value)
                          if (coord) {
                            setDestCoord(coord)
                            if (originCoord) setTravelRoute(solveRoute(originCoord, coord))
                          }"""

new_dest_resolver = """                          const coord = resolveStreetToCoords(e.target.value)
                          if (coord) {
                            setDestCoord(coord)
                            setViewState((v: any) => ({
                              ...v,
                              latitude: coord.lat,
                              longitude: coord.lng,
                              zoom: 14.5,
                              transitionDuration: 1000
                            }))
                            if (originCoord) setTravelRoute(solveRoute(originCoord, coord))
                          }"""

old_geolocate_resolver = """                            const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                            setOriginCoord(coord)
                            setOriginInput(getNearestStreetName(coord.lat, coord.lng))
                            fetchAddressAsync(coord.lat, coord.lng, setOriginInput)
                            if (destCoord) setTravelRoute(solveRoute(coord, destCoord))"""

new_geolocate_resolver = """                            const coord = { lat: pos.coords.latitude, lng: pos.coords.longitude }
                            setOriginCoord(coord)
                            setOriginInput(getNearestStreetName(coord.lat, coord.lng))
                            fetchAddressAsync(coord.lat, coord.lng, setOriginInput)
                            setViewState((v: any) => ({
                              ...v,
                              latitude: coord.lat,
                              longitude: coord.lng,
                              zoom: 14.5,
                              transitionDuration: 1000
                            }))
                            if (destCoord) setTravelRoute(solveRoute(coord, destCoord))"""

replaces = [
    (old_line_tab, new_line_tab, "Modal circular scroll lines selector"),
    (old_origin_resolver, new_origin_resolver, "Modal origin geocode pan"),
    (old_dest_resolver, new_dest_resolver, "Modal destination geocode pan"),
    (old_geolocate_resolver, new_geolocate_resolver, "Modal geolocate origin pan")
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
    with open("src/components/user/LineSelector.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    print("SUCCESS: All modal replacements applied!")
else:
    print("ERROR: Some replacements were not found. LineSelector.tsx was NOT written.")
