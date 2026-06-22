# scratch/do_map_alarm_updates_2.py
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open("src/app/page.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Inject helpers (calculateRouteTimeMinutes & getUpcomingBusesForRoute) right at the top of UserMapPage component
old_decl = "export default function UserMapPage() {"
new_decl = """const calculateRouteTimeMinutes = (route: any, allLines: any[]) => {
  const walkTime = (route.walkDistance / 4) * 60
  const line = allLines.find(l => l.id === route.line_id)
  if (!line) return Math.round(walkTime)
  const routeKey = line.line_number.replace(/^0+/, '')
  const officialRoute = (OFFICIAL_ROUTES as any)[routeKey]
  if (!officialRoute) return Math.round(walkTime + 15)
  const path = officialRoute.ida.path
  const stopO = officialRoute.ida.stops.find((s: any) => s.id === route.originStop.id)
  const stopD = officialRoute.ida.stops.find((s: any) => s.id === route.destStop.id)
  if (!stopO || !stopD) return Math.round(walkTime + 15)
  
  // getDistanceToPathIndex helper
  const getDistanceToPathIndexLocal = (
    p: { lat: number; lng: number }[],
    currIdx: number,
    progress: number,
    targetIdx: number
  ): number => {
    if (targetIdx <= currIdx) return 0
    const pA = p[currIdx]
    const pB = p[currIdx + 1] || pA
    const currentLat = pA.lat + (pB.lat - pA.lat) * progress
    const currentLng = pA.lng + (pB.lng - pA.lng) * progress
    let totalDist = globalDistanceKm({ lat: currentLat, lng: currentLng }, { lat: pB.lat, lng: pB.lng })
    for (let i = currIdx + 1; i < targetIdx; i++) {
      const pt1 = p[i]
      const pt2 = p[i + 1] || pt1
      totalDist += globalDistanceKm({ lat: pt1.lat, lng: pt1.lng }, { lat: pt2.lat, lng: pt2.lng })
    }
    return totalDist * 1000 // in meters
  }

  const busDist = getDistanceToPathIndexLocal(path, stopO.pathIndex, 0, stopD.pathIndex)
  const busTime = (busDist / 1000 / 18) * 60
  return Math.round(walkTime + busTime)
}

export default function UserMapPage() {"""

if old_decl in code:
    code = code.replace(old_decl, new_decl, 1)
    print("SUCCESS: Helpers injected before UserMapPage.")
else:
    print("ERROR: UserMapPage decl not found!")

# 2. Inject getUpcomingBusesForRoute inside UserMapPage body (after allLines is declared/defined)
old_all_lines_decl = "  const allLines = lines.length > 0 ? lines : MOCK_LINES"
new_all_lines_decl = """  const allLines = lines.length > 0 ? lines : MOCK_LINES

  const getUpcomingBusesForRoute = (route: any) => {
    if (!route) return { upcoming: null, nextBus: null, upcomingDist: 0, nextDist: 0 }
    const lineBuses = buses.filter(b => b.line_id === route.line_id)
    if (lineBuses.length === 0) return { upcoming: null, nextBus: null, upcomingDist: 0, nextDist: 0 }
    const incomingBuses = lineBuses.map(bus => {
      const distKm = globalDistanceKm({ latitude: bus.latitude, longitude: bus.longitude }, { lat: route.originStop.latitude, lng: route.originStop.longitude })
      const distM = distKm * 1000
      const dy = route.originStop.latitude - bus.latitude
      const dx = route.originStop.longitude - bus.longitude
      const angleToStop = ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360
      const diff = Math.abs(bus.heading - angleToStop)
      const circularDiff = Math.abs(((diff + 180) % 360) - 180)
      const isComing = circularDiff <= 90
      return { bus, distM, isComing }
    }).filter(item => item.isComing)
    incomingBuses.sort((a, b) => a.distM - b.distM)
    const upcoming = incomingBuses[0]?.bus || null
    const nextBus = incomingBuses[1]?.bus || null
    const upcomingDist = incomingBuses[0]?.distM || 0
    const nextDist = incomingBuses[1]?.distM || 0
    return { upcoming, nextBus, upcomingDist, nextDist }
  }"""

if old_all_lines_decl in code:
    code = code.replace(old_all_lines_decl, new_all_lines_decl, 1)
    print("SUCCESS: getUpcomingBusesForRoute helper added.")
else:
    print("ERROR: allLines decl not found!")

# 3. Replace Premium Advertisement Card with Picture-style TUFIX Ad
old_ad_card = """        {/* Premium Advertisement Card (at the bottom when scrolling down) */}
        {(drawerState === 'expanded' || !isMobile) && (
          <div style={{
            marginTop: 'auto',
            padding: '14px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(249, 115, 22, 0.05) 100%)',
            border: '1px solid rgba(234, 179, 8, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(234, 179, 8, 0.05)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#F59E0B', fontFamily: 'DM Mono', letterSpacing: '0.06em' }}>Anuncio Premium</span>
              <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>Patrocinado</span>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                🍔
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>McDonald's Cuarto de Libra</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>¡20% de descuento pidiendo con la app! Parada Obelisco.</div>
              </div>
            </div>
            <button style={{
              width: '100%', padding: '6px', background: '#F59E0B', color: 'black', border: 'none', borderRadius: '8px',
              fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)'
            }}>
              Pedir ahora
            </button>
          </div>
        )}"""

new_ad_card = """        {/* Premium Advertisement Card (at the bottom when scrolling down) */}
        {(drawerState === 'expanded' || !isMobile) && (
          <div style={{
            marginTop: 'auto',
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
        )}"""

if old_ad_card in code:
    code = code.replace(old_ad_card, new_ad_card, 1)
    print("SUCCESS: Premium ad card replaced with picture banner.")
else:
    print("ERROR: Premium ad card not found!")

# 4. Render Orange AlarmPinCoord Marker in Map container
old_draggable_pins = "          {/* Travel Planner Pins */}"
new_alarm_pin_marker = """          {/* Custom Station Alarm Pin Marker */}
          {alarmPinCoord && (
            <Marker longitude={alarmPinCoord.lng} latitude={alarmPinCoord.lat} anchor="bottom">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#F59E0B', color: 'white', fontSize: '9px', padding: '2px 6px', borderRadius: '6px', fontWeight: 'bold', marginBottom: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', whiteSpace: 'nowrap' }}>
                  Recordatorio
                </div>
                <div style={{
                  width: '24px', height: '24px', borderRadius: '50% 50% 50% 0',
                  background: '#F59E0B', transform: 'rotate(-45deg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 3px 8px rgba(0,0,0,0.35)', border: '1.5px solid white'
                }}>
                  <Clock size={10} style={{ transform: 'rotate(45deg)', color: 'white' }} />
                </div>
              </div>
            </Marker>
          )}

          {/* Travel Planner Pins */}"""

if old_draggable_pins in code:
    code = code.replace(old_draggable_pins, new_alarm_pin_marker, 1)
    print("SUCCESS: Alarm pin marker rendering added to Map.")
else:
    print("ERROR: Travel Planner Pins marker placement point not found!")

# 5. Extend MiniPopup invocation inside Popup to pass alarm handlers
old_minipopup_call = """              <MiniPopup
                bus={selectedBus}
                darkMap={prefs.darkMap}
                onReport={() => setShowReport(true)}
                isFavBus={(prefs.favBuses || []).includes(selectedBus.bus_unit)}
                isFavDriver={(prefs.favDrivers || []).includes(selectedBus.driver_name)}
                onToggleFavBus={() => {
                  const current = prefs.favBuses || []
                  const exists = current.includes(selectedBus.bus_unit)
                  updatePrefs({
                    favBuses: exists
                      ? current.filter(u => u !== selectedBus.bus_unit)
                      : [...current, selectedBus.bus_unit]
                  })
                }}
                onToggleFavDriver={() => {
                  const current = prefs.favDrivers || []
                  const exists = current.includes(selectedBus.driver_name)
                  updatePrefs({
                    favDrivers: exists
                      ? current.filter(d => d !== selectedBus.driver_name)
                      : [...current, selectedBus.driver_name]
                  })
                }}
              />"""

new_minipopup_call = """              <MiniPopup
                bus={selectedBus}
                darkMap={prefs.darkMap}
                onReport={() => setShowReport(true)}
                isFavBus={(prefs.favBuses || []).includes(selectedBus.bus_unit)}
                isFavDriver={(prefs.favDrivers || []).includes(selectedBus.driver_name)}
                onToggleFavBus={() => {
                  const current = prefs.favBuses || []
                  const exists = current.includes(selectedBus.bus_unit)
                  updatePrefs({
                    favBuses: exists
                      ? current.filter(u => u !== selectedBus.bus_unit)
                      : [...current, selectedBus.bus_unit]
                  })
                }}
                onToggleFavDriver={() => {
                  const current = prefs.favDrivers || []
                  const exists = current.includes(selectedBus.driver_name)
                  updatePrefs({
                    favDrivers: exists
                      ? current.filter(d => d !== selectedBus.driver_name)
                      : [...current, selectedBus.driver_name]
                  })
                }}
                activeAlarms={activeAlarms}
                onAddAlarm={(alarm) => setActiveAlarms(prev => [...prev, alarm])}
                onRemoveAlarm={(id) => setActiveAlarms(prev => prev.filter(a => a.id !== id))}
                originCoord={originCoord}
              />"""

if old_minipopup_call in code:
    code = code.replace(old_minipopup_call, new_minipopup_call, 1)
    print("SUCCESS: MiniPopup call extended with alarm props.")
else:
    print("ERROR: MiniPopup call block not found!")

# 6. Add Route Duration Overlay Card & Custom Station Alarm Config Card inside UI Layout
old_selection_banner = """        {/* Map Selection Banner */}
        <AnimatePresence>
          {mapSelectionMode && ("""

new_selection_banner_with_overlays = """        {/* Route Duration Overlay */}
        {solvedRoutes.length > 0 && originCoord && destCoord && !activeTravelRoute && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '70px' : '20px',
            left: '14px',
            zIndex: 10,
            width: '260px',
            background: prefs.darkMap ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            padding: '10px 12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '11px', fontWeight: 800, color: 'var(--text-primary)', textTransform: 'uppercase', fontFamily: 'DM Mono', letterSpacing: '0.04em' }}>
              ⏱️ Tiempos de Viaje
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {solvedRoutes.map((route: any) => {
                const routeTime = calculateRouteTimeMinutes(route, allLines)
                const isSelected = selectedLines.some(l => l.id === route.line_id)
                return (
                  <div
                    key={route.line_id}
                    onClick={() => {
                      setActiveTravelRoute(route)
                      const line = allLines.find(l => l.id === route.line_id)
                      if (line) {
                        setSelectedLines([line])
                      }
                      toast.success(`Siguiendo recorrido de Línea ${route.line_number}`)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                      background: isSelected ? 'rgba(34,211,160,0.08)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(34,211,160,0.3)' : 'transparent'}`,
                      transition: 'all 150ms'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: route.color, color: 'white', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 800
                      }}>
                        {route.line_number}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {route.originStop.name.split(',')[0]}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      ~{routeTime} min
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Custom Station Timer Alarm Config Card */}
        {alarmPinCoord && (
          <div style={{
            position: 'absolute',
            top: isMobile ? '70px' : '20px',
            right: '64px',
            zIndex: 100,
            width: '280px',
            background: prefs.darkMap ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', fontFamily: 'DM Mono', letterSpacing: '0.04em' }}>
                🔔 Configurar Recordatorio
              </span>
              <button
                onClick={() => {
                  setAlarmPinCoord(null)
                  setAlarmSelectedLineId(null)
                }}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
              >
                Cancelar
              </button>
            </div>

            <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '0 0 10px 0', lineHeight: '1.4' }}>
              Te avisaremos cuando el colectivo que elijas esté por llegar a este punto exacto.
            </p>

            {(() => {
              const activeLines = lines.length > 0 ? lines : MOCK_LINES
              const nearbyLines = activeLines.filter(line => {
                const stops = getMockStopsForLine(line)
                return stops.some(s => distanceKm({ latitude: s.latitude, longitude: s.longitude }, alarmPinCoord) < 2.0)
              })
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>LÍNEA CERCANA:</span>
                    {nearbyLines.length > 0 ? (
                      <select
                        value={alarmSelectedLineId || nearbyLines[0].id}
                        onChange={e => setAlarmSelectedLineId(e.target.value)}
                        style={{
                          width: '100%',
                          background: prefs.darkMap ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                          color: 'var(--text-primary)',
                          border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                          borderRadius: '8px', fontSize: '12px', padding: '6px 8px', outline: 'none'
                        }}
                      >
                        {nearbyLines.map(line => (
                          <option key={line.id} value={line.id} style={{ background: prefs.darkMap ? '#0f172a' : '#ffffff', color: 'var(--text-primary)' }}>
                            Línea {line.line_number} ({line.name})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span style={{ fontSize: '11px', color: '#EF4444' }}>No hay líneas a menos de 2km de este punto.</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>MEDIR ALERTA POR:</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {(['minutes', 'blocks'] as const).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setAlarmThresholdType(type)
                            setAlarmThresholdValue(type === 'minutes' ? 5 : 3)
                          }}
                          style={{
                            flex: 1, padding: '5px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                            background: alarmThresholdType === type ? 'rgba(245,158,11,0.15)' : (prefs.darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                            border: `1px solid ${alarmThresholdType === type ? '#F59E0B' : 'transparent'}`,
                            color: alarmThresholdType === type ? '#F59E0B' : 'var(--text-secondary)', fontWeight: 600,
                            transition: 'all 150ms'
                          }}
                        >
                          {type === 'minutes' ? 'Minutos' : 'Cuadras'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>
                      Aviso a: <strong>{alarmThresholdValue} {alarmThresholdType === 'minutes' ? 'min' : 'cuadras'}</strong>
                    </span>
                    <input
                      type="range"
                      min={alarmThresholdType === 'minutes' ? 1 : 1}
                      max={alarmThresholdType === 'minutes' ? 15 : 10}
                      step="1"
                      value={alarmThresholdValue}
                      onChange={e => setAlarmThresholdValue(parseInt(e.target.value))}
                      style={{ width: '100px', accentColor: '#F59E0B' }}
                    />
                  </div>

                  {nearbyLines.length > 0 && (
                    <button
                      onClick={() => {
                        const targetLine = nearbyLines.find(l => l.id === alarmSelectedLineId) || nearbyLines[0]
                        const alarm = {
                          id: `alarm-stop-${targetLine.id}-${Date.now()}`,
                          type: 'stop_alarm',
                          lineId: targetLine.id,
                          coord: alarmPinCoord,
                          thresholdType: alarmThresholdType,
                          thresholdValue: alarmThresholdValue
                        }
                        setActiveAlarms(prev => [...prev, alarm])
                        toast.success(`Recordatorio fijado para Línea ${targetLine.line_number} a ${alarmThresholdValue} ${alarmThresholdType === 'minutes' ? 'minutos' : 'cuadras'}`)
                        setAlarmPinCoord(null)
                        setAlarmSelectedLineId(null)
                      }}
                      style={{
                        width: '100%', padding: '8px', background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px',
                        fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center', boxShadow: '0 2px 6px rgba(245, 158, 11, 0.2)',
                        marginTop: '4px'
                      }}
                    >
                      Establecer Recordatorio
                    </button>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Upcoming Bus Overlay Card */}
        {activeTravelRoute && (
          <div style={{
            position: 'absolute',
            bottom: isMobile ? '80px' : '20px',
            left: '14px',
            right: '14px',
            margin: '0 auto',
            maxWidth: '380px',
            zIndex: 100,
            background: prefs.darkMap ? 'rgba(15, 23, 42, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: prefs.darkMap ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
            padding: '12px 14px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            fontFamily: 'DM Sans, sans-serif'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: activeTravelRoute.color }} />
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>
                  Línea {activeTravelRoute.line_number} en Ruta
                </span>
              </div>
              <button
                onClick={() => {
                  setActiveTravelRoute(null)
                  setTrackedBusId(null)
                }}
                style={{
                  background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Volver
              </button>
            </div>

            {(() => {
              const { upcoming, nextBus, upcomingDist, nextDist } = getUpcomingBusesForRoute(activeTravelRoute)
              
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {upcoming ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: prefs.darkMap ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: '10px', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Próximo colectivo</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            Interno {upcoming.bus_unit}
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Arribo estimado</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: '#10B981' }}>
                            {Math.ceil(upcomingDist / 1000 / (upcoming.speed_kmh > 2 ? upcoming.speed_kmh / 60 : 0.3))} min
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', borderTop: prefs.darkMap ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.04)', paddingTop: '6px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          Distancia: {Math.round(upcomingDist)} metros
                        </span>
                        <button
                          onClick={() => {
                            setTrackedBusId(upcoming.id)
                            setViewState(v => ({
                              ...v,
                              latitude: upcoming.latitude,
                              longitude: upcoming.longitude,
                              zoom: 15.5,
                              transitionDuration: 1000
                            }))
                            toast.success(`Siguiendo Interno ${upcoming.bus_unit} en tiempo real`)
                          }}
                          style={{
                            background: trackedBusId === upcoming.id ? '#10B981' : 'rgba(34,211,160,0.12)',
                            color: trackedBusId === upcoming.id ? 'white' : '#10B981',
                            border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          <Activity size={10} />
                          <span>{trackedBusId === upcoming.id ? 'Siguiendo...' : 'Ver en tiempo real'}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
                      No hay unidades aproximándose en este momento.
                    </div>
                  )}

                  {nextBus && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '8px', border: prefs.darkMap ? '1px dashed rgba(255,255,255,0.1)' : '1px dashed rgba(0,0,0,0.08)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ 
                          fontSize: '10px', color: 'var(--text-muted)' }}>Siguiente colectivo</span>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-primary)' }}>
                          Interno {nextBus.bus_unit}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Distancia</span>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {Math.round(nextDist)} metros
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Map Selection Banner */}
        <AnimatePresence>
          {mapSelectionMode && ("""

if old_selection_banner in code:
    code = code.replace(old_selection_banner, new_selection_banner_with_overlays, 1)
    print("SUCCESS: Route duration, timer alarm, and upcoming overlays added to layout.")
else:
    print("ERROR: Map Selection Banner not found!")

# 7. Add current street to stop alarm triggers in the simulation tick loop
old_alarm_trigger_msg = """                  const line = MOCK_LINES.find(l => l.id === alarm.lineId)
                  const lineName = line ? `Línea ${line.line_number}` : 'Colectivo'
                  toast(`🚨 ¡Recordatorio de Parada! Un colectivo de la ${lineName} (Interno ${bus.bus_unit}) está a ${triggerVal} ${alarm.thresholdType === 'minutes' ? 'minutos' : 'cuadras'} de tu parada personalizada.`, {"""

new_alarm_trigger_msg = """                  const line = MOCK_LINES.find(l => l.id === alarm.lineId)
                  const lineName = line ? `Línea ${line.line_number}` : 'Colectivo'
                  const currentSt = getNearestStreetName(bus.latitude, bus.longitude)
                  toast(`🚨 ¡Recordatorio de Parada! Tu próximo colectivo de la ${lineName} (Interno ${bus.bus_unit}) está a ${triggerVal} ${alarm.thresholdType === 'minutes' ? 'minutos' : 'cuadras'} de tu parada personalizada (actualmente cerca de ${currentSt}).`, {"""

if old_alarm_trigger_msg in code:
    code = code.replace(old_alarm_trigger_msg, new_alarm_trigger_msg, 1)
    print("SUCCESS: Current street location added to stop alarm notification toast.")
else:
    print("ERROR: Alarm trigger message pattern not found!")

# 8. Fully rewrite the MiniPopup component definition at the bottom of the file
# Since we need to add the Tabbed layout, we will replace the old MiniPopup function with a stateful one
old_minipopup_def = """// ─── Mini popup ───────────────────────────────────────────────────────────────
function MiniPopup({
  bus,
  darkMap,
  onReport,
  isFavBus,
  isFavDriver,
  onToggleFavBus,
  onToggleFavDriver
}: {
  bus: BusPosition
  darkMap: boolean
  onReport: () => void
  isFavBus: boolean
  isFavDriver: boolean
  onToggleFavBus: () => void
  onToggleFavDriver: () => void
}) {"""

# We can replace from old_minipopup_def down to the end of the function (which is followed by 4344: })
# Let's inspect the target code to replace: it starts at old_minipopup_def and goes to the end of MiniPopup.
# Let's make a precise replacement for the MiniPopup component.

new_minipopup_def = """// ─── Mini popup ───────────────────────────────────────────────────────────────
function MiniPopup({
  bus,
  darkMap,
  onReport,
  isFavBus,
  isFavDriver,
  onToggleFavBus,
  onToggleFavDriver,
  activeAlarms,
  onAddAlarm,
  onRemoveAlarm,
  originCoord
}: {
  bus: BusPosition
  darkMap: boolean
  onReport: () => void
  isFavBus: boolean
  isFavDriver: boolean
  onToggleFavBus: () => void
  onToggleFavDriver: () => void
  activeAlarms: any[]
  onAddAlarm: (alarm: any) => void
  onRemoveAlarm: (id: string) => void
  originCoord: { lat: number; lng: number } | null
}) {
  const [popupTab, setPopupTab] = useState<'characteristics' | 'notifications'>('characteristics')
  const [thresholdType, setThresholdType] = useState<'minutes' | 'meters' | 'blocks'>('minutes')
  const [thresholdVal, setThresholdVal] = useState<number>(5)

  const busColor = bus.line_number === '12' ? '#EF4444' : 
                   bus.line_number === '28' ? '#16A34A' :
                   bus.line_number === '37' ? '#15803D' :
                   bus.line_number === '60' ? '#EAB308' : '#1D4ED8';

  // Deterministically generate amenities based on bus unit to make them consistent but different
  const getBusAmenities = (busUnit: string) => {
    const digits = busUnit.split('').filter(c => '0123456789'.includes(c)).join('')
    const num = parseInt(digits) || 0
    const hasAC = num % 3 !== 0      // 2 out of 3 have AC (most of them)
    const isNew = num % 4 !== 0      // 3 out of 4 are under 5 years old
    const hasRamp = num % 5 !== 0    // 4 out of 5 have wheelchair ramps (some have no ramp)
    return { hasAC, isNew, hasRamp }
  }

  const amenities = getBusAmenities(bus.bus_unit)

  const hasAlarm = activeAlarms.some(a => a.type === 'bus_alarm' && a.busId === bus.id)
  const busAlarm = activeAlarms.find(a => a.type === 'bus_alarm' && a.busId === bus.id)

  return (
    <div style={{
      background: darkMap
        ? 'linear-gradient(135deg, rgba(17, 24, 39, 0.95) 0%, rgba(10, 15, 26, 0.98) 100%)'
        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(249, 250, 251, 0.98) 100%)',
      border: darkMap ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
      borderRadius: '16px',
      padding: '12px',
      color: darkMap ? 'white' : 'var(--text-primary)',
      width: '280px',
      boxShadow: darkMap
        ? '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
        : '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
      fontFamily: 'DM Sans, sans-serif',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
    }}>
      {/* Bus image header */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: '110px',
        borderRadius: '10px',
        background: darkMap ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
        border: darkMap ? '1px solid rgba(255, 255, 255, 0.06)' : '1px solid rgba(0, 0, 0, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        marginBottom: '10px'
      }}>
        <img
          src={
            bus.line_number === '12' ? '/images/bus-12-real.jpg' :
            bus.line_number === '37' ? '/images/bus-37-real.jpg' :
            `/images/bus-${bus.line_number}.png`
          }
          alt={`Bus ${bus.line_number}`}
          style={{ width: '100%', height: '100%', objectFit: (bus.line_number === '12' || bus.line_number === '37') ? 'cover' : 'contain' }}
        />
        <div style={{
          position: 'absolute',
          top: '6px',
          left: '6px',
          background: busColor,
          color: busColor === '#EAB308' ? 'black' : 'white',
          fontWeight: 'bold',
          fontSize: '10px',
          padding: '2px 8px',
          borderRadius: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        }}>
          Línea {bus.line_number}
          {bus.ramal && ` - Ramal ${bus.ramal}`}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
        <div style={{ fontWeight: 700, fontSize: '13px', color: darkMap ? '#F3F4F6' : 'var(--text-primary)' }}>
          Interno: {bus.bus_unit}
        </div>
        <div style={{ fontSize: '10px', color: '#EAB308', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
          <span>👥 {bus.passenger_count} a bordo</span>
        </div>
      </div>

      <div style={{ color: darkMap ? '#9CA3AF' : 'var(--text-secondary)', fontSize: '11px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span>Chofer: <strong>{bus.driver_name}</strong></span>
        <span style={{ color: '#10B981', fontWeight: 'bold' }}>✓</span>
      </div>

      {/* Tab toggles */}
      <div style={{ display: 'flex', borderBottom: darkMap ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)', marginBottom: '10px' }}>
        <button
          onClick={() => setPopupTab('characteristics')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', background: 'none',
            fontSize: '11px', fontWeight: popupTab === 'characteristics' ? 700 : 500,
            color: popupTab === 'characteristics' ? (darkMap ? '#FBBF24' : '#EAB308') : 'var(--text-muted)',
            borderBottom: popupTab === 'characteristics' ? `2px solid ${darkMap ? '#FBBF24' : '#EAB308'}` : 'none',
            cursor: 'pointer'
          }}
        >
          Características
        </button>
        <button
          onClick={() => setPopupTab('notifications')}
          style={{
            flex: 1, padding: '6px 0', border: 'none', background: 'none',
            fontSize: '11px', fontWeight: popupTab === 'notifications' ? 700 : 500,
            color: popupTab === 'notifications' ? (darkMap ? '#FBBF24' : '#EAB308') : 'var(--text-muted)',
            borderBottom: popupTab === 'notifications' ? `2px solid ${darkMap ? '#FBBF24' : '#EAB308'}` : 'none',
            cursor: 'pointer'
          }}
        >
          Notificaciones
        </button>
      </div>

      {popupTab === 'characteristics' ? (
        /* Amenities Ticked & Unticked Grid */
        <div style={{
          background: darkMap ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
          border: darkMap ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
          borderRadius: '10px',
          padding: '10px',
          marginBottom: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '11px',
          color: darkMap ? '#D1D5DB' : 'var(--text-primary)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Aire Acondicionado</span>
            <span style={{ color: amenities.hasAC ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '12px' }}>
              {amenities.hasAC ? '✓' : '✗'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Antigüedad &lt; 5 años</span>
            <span style={{ color: amenities.isNew ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '12px' }}>
              {amenities.isNew ? '✓' : '✗'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Rampa para Silla de Ruedas</span>
            <span style={{ color: amenities.hasRamp ? '#10B981' : '#EF4444', fontWeight: 'bold', fontSize: '12px' }}>
              {amenities.hasRamp ? '✓' : '✗'}
            </span>
          </div>
        </div>
      ) : (
        /* Notifications config panel */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {hasAlarm ? (
            <div style={{ padding: '10px', borderRadius: '10px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                🔔 Alarma activa
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                Aviso cuando esté a menos de {busAlarm.thresholdValue} {busAlarm.thresholdType === 'minutes' ? 'minutos' : busAlarm.thresholdType === 'meters' ? 'metros' : 'cuadras'}.
              </div>
              <button
                onClick={() => {
                  onRemoveAlarm(busAlarm.id)
                  toast.success("Alarma desactivada.")
                }}
                style={{
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px',
                  padding: '4px', fontSize: '10px', color: '#EF4444', cursor: 'pointer', fontWeight: 600
                }}
              >
                Desactivar Alarma
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600 }}>DISTANCIA DE AVISO:</span>
              
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['minutes', 'meters', 'blocks'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      setThresholdType(type)
                      setThresholdVal(type === 'minutes' ? 5 : type === 'meters' ? 500 : 3)
                    }}
                    style={{
                      flex: 1, padding: '4px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer',
                      background: thresholdType === type ? 'rgba(245,158,11,0.15)' : (darkMap ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                      border: `1px solid ${thresholdType === type ? '#F59E0B' : 'transparent'}`,
                      color: thresholdType === type ? '#F59E0B' : 'var(--text-secondary)', fontWeight: 600
                    }}
                  >
                    {type === 'minutes' ? 'Min' : type === 'meters' ? 'Metros' : 'Cuadras'}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flex: 1 }}>
                  Valor: <strong>{thresholdVal} {thresholdType === 'minutes' ? 'min' : thresholdType === 'meters' ? 'm' : 'cuadras'}</strong>
                </span>
                <input
                  type="range"
                  min={thresholdType === 'minutes' ? 1 : thresholdType === 'meters' ? 100 : 1}
                  max={thresholdType === 'minutes' ? 15 : thresholdType === 'meters' ? 1500 : 10}
                  step={thresholdType === 'meters' ? 100 : 1}
                  value={thresholdVal}
                  onChange={e => setThresholdVal(parseInt(e.target.value))}
                  style={{ width: '80px', accentColor: '#F59E0B' }}
                />
              </div>

              <button
                onClick={() => {
                  const alarm = {
                    id: `alarm-bus-${bus.id}-${Date.now()}`,
                    type: 'bus_alarm',
                    busId: bus.id,
                    stop: {
                      name: 'Tu ubicación',
                      latitude: originCoord?.lat ?? -34.6037,
                      longitude: originCoord?.lng ?? -58.4173
                    },
                    thresholdType,
                    thresholdValue: thresholdVal
                  }
                  onAddAlarm(alarm)
                  toast.success(`Alarma activada para el Interno ${bus.bus_unit}`)
                }}
                style={{
                  background: '#F59E0B', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', textAlign: 'center'
                }}
              >
                Establecer Alarma
              </button>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '6px', marginTop: '12px', borderTop: darkMap ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.08)', paddingTop: '10px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onReport(); }}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: darkMap ? '#FCA5A5' : '#EF4444',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
            boxShadow: '0 2px 4px rgba(239,68,68,0.1)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'; }}
        >
          <AlertTriangle size={11} />
          Denunciar
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavBus(); }}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: '10px',
            background: isFavBus ? 'rgba(234, 179, 8, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'),
            border: `1px solid ${isFavBus ? 'rgba(234, 179, 8, 0.4)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')}`,
            color: isFavBus ? '#FBBF24' : (darkMap ? '#E5E7EB' : 'var(--text-primary)'),
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isFavBus ? 'rgba(234, 179, 8, 0.22)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isFavBus ? 'rgba(234, 179, 8, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'); }}
        >
          <Star size={11} style={{ fill: isFavBus ? '#FBBF24' : 'none' }} />
          Colectivo
        </button>

        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavDriver(); }}
          style={{
            flex: 1,
            padding: '7px 4px',
            borderRadius: '10px',
            background: isFavDriver ? 'rgba(236, 72, 153, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'),
            border: `1px solid ${isFavDriver ? 'rgba(236, 72, 153, 0.4)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)')}`,
            color: isFavDriver ? '#F472B6' : (darkMap ? '#E5E7EB' : 'var(--text-primary)'),
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = isFavDriver ? 'rgba(236, 72, 153, 0.22)' : (darkMap ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)'); }}
          onMouseLeave={(e) => { e.currentTarget.style.background = isFavDriver ? 'rgba(236, 72, 153, 0.15)' : (darkMap ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)'); }}
        >
          <Heart size={11} style={{ fill: isFavDriver ? '#F472B6' : 'none' }} />
          Chofer
        </button>
      </div>
    </div>
  )
}"""

# Find the end of page.tsx and slice there to replace the definition of MiniPopup
popup_pos = code.find(old_minipopup_def)
if popup_pos != -1:
    code = code[:popup_pos] + new_minipopup_def + "\n"
    print("SUCCESS: MiniPopup component fully replaced and upgraded with tabs.")
else:
    print("ERROR: MiniPopup component definition not found!")

# Write file back
with open("src/app/page.tsx", "w", encoding="utf-8") as f:
    f.write(code)
print("SUCCESS: Stage 2 updates fully applied.")
