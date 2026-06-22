# scratch/do_drawer_restore.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add back Action Pills below origin/destination inputs
target_line = "        {/* Line Search & Horizontal Circles Carousel */}"
action_pills = """        {/* Action pills restored below inputs */}
        <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
          <button
            onClick={() => {
              setLineSelectorTab('line')
              setShowLineSelector(true)
            }}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              background: prefs.darkMap ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 200ms'
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
              flex: 1, padding: '9px 12px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
              background: prefs.darkMap ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
              color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              transition: 'all 200ms'
            }}
          >
            <MapPin size={14} />
            <span>Cerca mío</span>
          </button>
        </div>

"""

if target_line in code:
    code = code.replace(target_line, action_pills + "        " + target_line, 1)
    print("SUCCESS: Action pills added back below inputs.")
else:
    print("ERROR: Target line for action pills not found!")

# 2. Remove Travel Planner floating button
travel_button_block = """            {/* Travel Planner Button */}
            <button
              onClick={() => {
                const newDrawerState = drawerState === 'collapsed' ? 'half' : 'collapsed'
                setDrawerState(newDrawerState)
                setPinNearbyStopsMode(false)
                if (!originCoord) {
                  const o = { lat: -34.6037, lng: -58.3816 }
                  const d = { lat: -34.5810, lng: -58.4210 }
                  setOriginCoord(o)
                  setDestCoord(d)
                  setOriginInput(getNearestStreetName(o.lat, o.lng))
                  setDestInput(getNearestStreetName(d.lat, d.lng))
                  fetchAddressAsync(o.lat, o.lng, setOriginInput)
                  fetchAddressAsync(d.lat, d.lng, setDestInput)
                  setSolvedRoutes(solveRoutes(o, d))
                }
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: drawerState !== 'collapsed' ? '#3B82F6' : (prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)'),
                border: drawerState !== 'collapsed' ? '1px solid #3B82F6' : (prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)'),
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: drawerState !== 'collapsed' ? 'white' : 'var(--text-primary)', transition: 'all 200ms'
              }}
              title="Planificar Viaje (Origen/Destino)"
            >
              <NavIcon size={16} />
            </button>"""

if travel_button_block in code:
    code = code.replace(travel_button_block, "", 1)
    print("SUCCESS: Travel Planner button removed.")
else:
    # Try finding with windows line endings or minor variations
    normalized_code = code.replace("\r\n", "\n")
    normalized_block = travel_button_block.replace("\r\n", "\n")
    if normalized_block in normalized_code:
        normalized_code = normalized_code.replace(normalized_block, "", 1)
        code = normalized_code
        print("SUCCESS: Travel Planner button removed (normalized).")
    else:
        print("ERROR: Travel Planner button block not found!")

with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)
print("SUCCESS: page.tsx updated.")
