# scratch/do_map_alarm_updates.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add Explicit Buscar Green Button next to the Title
old_title_section = """        {/* Title / Where are we going? */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
            ¿A dónde vamos hoy?
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Elegí origen y destino para encontrar colectivos.
          </span>
        </div>"""

new_title_section = """        {/* Title / Where are we going? */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>
              ¿A dónde vamos hoy?
            </h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Elegí origen y destino para encontrar colectivos.
            </span>
          </div>
          <button
            onClick={() => {
              if (originCoord && destCoord) {
                const routes = solveRoutes(originCoord, destCoord)
                setSolvedRoutes(routes)
                if (routes.length > 0) {
                  // Select the first one by default as active
                  setActiveTravelRoute(routes[0])
                  // Include its line in selectedLines
                  const line = allLines.find(l => l.id === routes[0].line_id)
                  if (line) {
                    setSelectedLines([line])
                  }
                }
                setDrawerState('half')
                toast.success("¡Colectivos recomendados actualizados!")
              } else {
                toast.error("Por favor ingresá origen y destino primero.")
              }
            }}
            style={{
              background: '#22C55E', color: 'white', border: 'none', borderRadius: '18px',
              padding: '6px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 2px 8px rgba(34,197,94,0.3)',
              transition: 'all 200ms', flexShrink: 0
            }}
            className="search-green-btn-hover"
          >
            <Search size={13} />
            <span>Buscar</span>
          </button>
        </div>"""

if old_title_section in code:
    code = code.replace(old_title_section, new_title_section, 1)
    print("SUCCESS: Buscar button added.")
else:
    print("ERROR: Title section not found!")

# 2. Add Timer Alarm Button to Floating Controls
old_theme_button = """            {/* Theme Toggle Button */}
            <button
              onClick={() => updatePrefs({ darkMap: !prefs.darkMap })}"""

new_timer_button = """            {/* Custom Timer Alarm Button */}
            <button
              onClick={() => {
                setAlarmPinMode(prev => !prev)
                setAlarmPinCoord(null)
                setPinNearbyStopsMode(false)
                toast.success(alarmPinMode ? "Modo de alarma desactivado." : "Hacé click en el mapa para marcar tu parada para el recordatorio.")
              }}
              style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: alarmPinMode ? '#F59E0B' : (prefs.darkMap ? 'rgba(10,14,20,0.9)' : 'rgba(255,255,255,0.9)'),
                border: alarmPinMode ? '1px solid #F59E0B' : (prefs.darkMap ? '1px solid rgba(184,200,224,0.15)' : '1px solid rgba(0,0,0,0.1)'),
                boxShadow: prefs.darkMap ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: alarmPinMode ? 'white' : 'var(--text-primary)', transition: 'all 200ms'
              }}
              title="Recordatorio de Colectivo en Parada Personalizada"
            >
              <Clock size={16} />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => updatePrefs({ darkMap: !prefs.darkMap })}"""

if old_theme_button in code:
    code = code.replace(old_theme_button, new_timer_button, 1)
    print("SUCCESS: Timer alarm button added to floating controls.")
else:
    print("ERROR: Theme button not found!")

# 3. Add Custom Alarm evaluation in Simulation Tick loop
old_traffic_collect = """        // Traffic state collection (once a second)
        if (tickCount % 20 === 0 && selectedIds.has(bus.line_id)) {"""

alarm_tick_check = """        // Check active alarms for this bus
        if (activeAlarms.length > 0) {
          const triggeredAlarms: string[] = []
          activeAlarms.forEach(alarm => {
            if (alarm.type === 'bus_alarm' && alarm.busId === bus.id) {
              const stop = alarm.stop
              const distKm = globalDistanceKm({ latitude: bus.latitude, longitude: bus.longitude }, { lat: stop.latitude, lng: stop.longitude })
              const distM = distKm * 1000
              
              let triggered = false
              if (alarm.thresholdType === 'meters' && distM <= alarm.thresholdValue) {
                triggered = true
              } else if (alarm.thresholdType === 'minutes') {
                const speed = bus.speed_kmh > 2 ? bus.speed_kmh : 20
                const minutes = (distKm / speed) * 60
                if (minutes <= alarm.thresholdValue) triggered = true
              } else if (alarm.thresholdType === 'blocks') {
                const blocks = distKm * 10
                if (blocks <= alarm.thresholdValue) triggered = true
              }

              if (triggered) {
                toast(`🚨 ¡Alerta de Colectivo! El Interno ${bus.bus_unit} está a menos de ${alarm.thresholdValue} ${alarm.thresholdType === 'meters' ? 'metros' : alarm.thresholdType === 'minutes' ? 'minutos' : 'cuadras'} de tu parada (${stop.name})`, {
                  icon: '🔔',
                  duration: 8000
                })
                triggeredAlarms.push(alarm.id)
              }
            } else if (alarm.type === 'stop_alarm' && alarm.lineId === bus.line_id) {
              const distKm = globalDistanceKm({ latitude: bus.latitude, longitude: bus.longitude }, alarm.coord)
              const distM = distKm * 1000

              const dy = alarm.coord.lat - bus.latitude
              const dx = alarm.coord.lng - bus.longitude
              const angleToStop = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
              const diff = Math.abs(bus.heading - angleToStop)
              const circularDiff = Math.abs(((diff + 180) % 360) - 180)
              const isComing = circularDiff <= 90

              if (isComing) {
                let triggered = false
                let triggerVal = 0
                if (alarm.thresholdType === 'minutes') {
                  const speed = bus.speed_kmh > 2 ? bus.speed_kmh : 20
                  const minutes = (distKm / speed) * 60
                  if (minutes <= alarm.thresholdValue) {
                    triggered = true
                    triggerVal = Math.round(minutes)
                  }
                } else if (alarm.thresholdType === 'blocks') {
                  const blocks = distKm * 10
                  if (blocks <= alarm.thresholdValue) {
                    triggered = true
                    triggerVal = Math.round(blocks)
                  }
                }

                if (triggered) {
                  const line = MOCK_LINES.find(l => l.id === alarm.lineId)
                  const lineName = line ? `Línea ${line.line_number}` : 'Colectivo'
                  toast(`🚨 ¡Recordatorio de Parada! Un colectivo de la ${lineName} (Interno ${bus.bus_unit}) está a ${triggerVal} ${alarm.thresholdType === 'minutes' ? 'minutos' : 'cuadras'} de tu parada personalizada.`, {
                    icon: '⏱️',
                    duration: 8000
                  })
                  triggeredAlarms.push(alarm.id)
                }
              }
            }
          })

          if (triggeredAlarms.length > 0) {
            setActiveAlarms(prev => prev.filter(a => !triggeredAlarms.includes(a.id)))
          }
        }

        // Traffic state collection (once a second)
        if (tickCount % 20 === 0 && selectedIds.has(bus.line_id)) {"""

if old_traffic_collect in code:
    code = code.replace(old_traffic_collect, alarm_tick_check, 1)
    print("SUCCESS: Alarm checks added to simulation interval tick.")
else:
    print("ERROR: Traffic state collection line not found!")

# 4. Map click handler Custom Alarm Pin placement
old_map_click = """          onClick={e => {
            if (mapSelectionMode === 'origin') {"""

new_map_click = """          onClick={e => {
            if (alarmPinMode) {
              const lat = e.lngLat.lat
              const lng = e.lngLat.lng
              setAlarmPinCoord({ lat, lng })
              setAlarmPinMode(false)
              const activeLines = lines.length > 0 ? lines : MOCK_LINES
              const nearby = activeLines.filter(line => {
                const stops = getMockStopsForLine(line)
                return stops.some(s => distanceKm({ latitude: s.latitude, longitude: s.longitude }, { lat, lng }) < 2.0)
              })
              if (nearby.length > 0) {
                setAlarmSelectedLineId(nearby[0].id)
                toast.success("¡Pin de recordatorio colocado! Configura la alarma en la tarjeta flotante del mapa.")
              } else {
                toast.error("No hay líneas de colectivos cerca del pin (radio de 2km).")
                setAlarmPinCoord(null)
              }
              return
            }
            if (mapSelectionMode === 'origin') {"""

if old_map_click in code:
    code = code.replace(old_map_click, new_map_click, 1)
    print("SUCCESS: Alarm pin placement map click handler added.")
else:
    print("ERROR: Map click select origin not found!")

# 5. Filter paths and buses to draw based on activeTravelRoute selection (Map Transform)
old_route_geojsons = "const routeGeoJsons = selectedLines.map(line => {"
new_route_geojsons = """const linesToDraw = activeTravelRoute
    ? selectedLines.filter(l => l.id === activeTravelRoute.line_id)
    : selectedLines
  const routeGeoJsons = linesToDraw.map(line => {"""

old_filtered_buses = "const filtered = simulatedBusesRef.current.filter(bus => selectedIds.has(bus.line_id))\n      setBuses(filtered)"
new_filtered_buses = """const filtered = simulatedBusesRef.current.filter(bus => selectedIds.has(bus.line_id))
      const busesToSet = activeTravelRoute
        ? filtered.filter(b => b.line_id === activeTravelRoute.line_id)
        : filtered
      setBuses(busesToSet)"""

if old_route_geojsons in code:
    code = code.replace(old_route_geojsons, new_route_geojsons, 1)
    print("SUCCESS: Map route geojsons filtered by activeTravelRoute.")
else:
    print("ERROR: routeGeoJsons line not found!")

if old_filtered_buses in code:
    code = code.replace(old_filtered_buses, new_filtered_buses, 1)
    print("SUCCESS: Map buses filtered by activeTravelRoute.")
else:
    print("ERROR: filtered buses line not found!")

with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)
print("SUCCESS: First stage updates applied.")
