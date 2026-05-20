'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bus, Navigation, Wifi, WifiOff, Users, Power, AlertCircle, Gauge, Clock, QrCode, CheckCircle, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface ActiveSession {
  sessionId: string
  driverId: string
  driverName: string
  busUnit: string
  lineId: string
  lineName: string
  lineNumber: string
  companyName: string
}

export default function DriverPage() {
  const supabase = createClient()
  const watchIdRef  = useRef<number | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPosRef  = useRef<GeolocationPosition | null>(null)
  const startRef    = useRef<Date | null>(null)

  const [driverName, setDriverName]     = useState('')
  const [driverId,   setDriverId]       = useState('')
  const [session,    setSession]        = useState<ActiveSession | null>(null)
  const [isOnline,   setIsOnline]       = useState(false)
  const [passengers, setPassengers]     = useState(0)
  const [pos,        setPos]            = useState<{lat:number;lng:number;speed:number;heading:number}|null>(null)
  const [gpsError,   setGpsError]       = useState<string|null>(null)
  const [duration,   setDuration]       = useState(0)
  const [showScanner,setShowScanner]    = useState(false)
  const [qrToken,    setQrToken]        = useState('')
  const [scanning,   setScanning]       = useState(false)

  // Auth + resume any active session
  useEffect(() => {
    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) { window.location.href='/login'; return }
      const {data:profile} = await supabase.from('profiles').select('role,name').eq('id',user.id).single()
      if (!profile || profile.role !== 'driver') { window.location.href='/'; return }
      setDriverName(profile.name || 'Chofer')
      setDriverId(user.id)

      const {data:s} = await supabase
        .from('driver_sessions')
        .select('*, bus_companies!company_id(company_name), bus_lines!line_id(line_number,name)')
        .eq('driver_id',user.id)
        .eq('is_active',true)
        .single()

      if (s) {
        const sess: ActiveSession = {
          sessionId: s.id, driverId: user.id,
          driverName: profile.name,
          busUnit: s.bus_unit, lineId: s.line_id,
          lineName:    (s.bus_lines as any)?.name || '—',
          lineNumber:  (s.bus_lines as any)?.line_number || '—',
          companyName: (s.bus_companies as any)?.company_name || '—',
        }
        setSession(sess)
        startGPS(user.id, s.id, s.line_id, s.bus_unit, 0)
        setIsOnline(true)
      }
    })
  }, [])

  // Duration timer
  useEffect(() => {
    if (!isOnline) return
    startRef.current = new Date()
    const t = setInterval(() => {
      if (startRef.current) setDuration(Math.floor((Date.now()-startRef.current.getTime())/1000))
    }, 1000)
    return () => clearInterval(t)
  }, [isOnline])

  const startGPS = useCallback((uid:string, sid:string, lid:string, unit:string, initPass:number) => {
    if (!navigator.geolocation) { toast.error('GPS no disponible'); return }

    watchIdRef.current = navigator.geolocation.watchPosition(
      p => {
        lastPosRef.current = p
        const spd = p.coords.speed ? Math.round(p.coords.speed*3.6) : 0
        setPos({lat:p.coords.latitude,lng:p.coords.longitude,speed:spd,heading:p.coords.heading||0})
        setGpsError(null)
      },
      err => setGpsError(err.message),
      {enableHighAccuracy:true,timeout:10000,maximumAge:2000}
    )

    intervalRef.current = setInterval(async () => {
      const p = lastPosRef.current; if (!p) return
      const spd = p.coords.speed ? Math.round(p.coords.speed*3.6) : 0
      // Use a ref to get latest passenger count
      const currentPass = initPass  // updated via closure on each new GPS start
      await supabase.from('bus_positions').upsert({
        driver_id:uid, line_id:lid, bus_unit:unit,
        latitude:p.coords.latitude, longitude:p.coords.longitude,
        heading:Math.round(p.coords.heading||0), speed_kmh:spd,
        status:spd>2?'moving':'stopped',
        passenger_count:currentPass,
        timestamp:new Date().toISOString(),
      },{onConflict:'driver_id'})
      await supabase.from('driver_sessions').update({total_passengers:currentPass}).eq('id',sid)
    }, 5000)
  }, [])

  // Re-broadcast passenger count changes
  useEffect(() => {
    if (!session || !isOnline || !lastPosRef.current) return
    const p = lastPosRef.current
    const spd = p.coords.speed ? Math.round(p.coords.speed*3.6) : 0
    supabase.from('bus_positions').upsert({
      driver_id:session.driverId, line_id:session.lineId, bus_unit:session.busUnit,
      latitude:p.coords.latitude, longitude:p.coords.longitude,
      heading:Math.round(p.coords.heading||0), speed_kmh:spd,
      status:spd>2?'moving':'stopped', passenger_count:passengers,
      timestamp:new Date().toISOString(),
    },{onConflict:'driver_id'})
  }, [passengers])

  const handleQRScan = async () => {
    if (!qrToken.trim() || !driverId) return
    setScanning(true)

    const {data:qr,error} = await supabase
      .from('bus_qr_codes')
      .select('*, bus_companies!company_id(company_name), bus_lines!line_id(line_number,name)')
      .eq('qr_token',qrToken.trim())
      .eq('is_active',true)
      .single()

    if (error||!qr) { toast.error('QR inválido o inactivo'); setScanning(false); return }

    // Close any open session
    await supabase.from('driver_sessions').update({is_active:false,ended_at:new Date().toISOString()}).eq('driver_id',driverId).eq('is_active',true)
    await supabase.from('bus_positions').update({status:'offline'}).eq('driver_id',driverId)

    const {data:newS,error:sErr} = await supabase.from('driver_sessions').insert({
      driver_id:driverId, qr_code_id:qr.id, company_id:qr.company_id,
      line_id:qr.line_id, bus_unit:qr.bus_unit, is_active:true,
      started_at:new Date().toISOString(),
    }).select().single()

    if (sErr||!newS) { toast.error('Error al iniciar sesión'); setScanning(false); return }

    const sess: ActiveSession = {
      sessionId:newS.id, driverId, driverName,
      busUnit:qr.bus_unit, lineId:qr.line_id,
      lineName:    (qr.bus_lines as any)?.name||'—',
      lineNumber:  (qr.bus_lines as any)?.line_number||'—',
      companyName: (qr.bus_companies as any)?.company_name||'—',
    }
    setSession(sess)
    setPassengers(0)
    startGPS(driverId, newS.id, qr.line_id, qr.bus_unit, 0)
    setIsOnline(true)
    setShowScanner(false)
    setQrToken('')
    setScanning(false)
    toast.success(`¡Turno iniciado! Unidad ${qr.bus_unit}`)
  }

  const endShift = useCallback(async () => {
    if (watchIdRef.current!==null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (session) {
      await supabase.from('driver_sessions').update({is_active:false,ended_at:new Date().toISOString(),total_passengers:passengers}).eq('id',session.sessionId)
      await supabase.from('bus_positions').update({status:'offline'}).eq('driver_id',session.driverId)
    }
    setIsOnline(false); setSession(null); setPos(null); setDuration(0); setPassengers(0)
    toast('Turno finalizado')
  },[session,passengers])

  const logout = async () => {
    if (isOnline) await endShift()
    await supabase.auth.signOut()
    window.location.href='/login'
  }

  const fmt = (s:number) => {
    const h=Math.floor(s/3600),m=Math.floor((s%3600)/60)
    return h>0?`${h}h ${m}m`:`${m}m ${s%60}s`
  }

  return (
    <div style={{minHeight:'100vh',background:'var(--void)',color:'var(--text-primary)',fontFamily:'DM Sans,sans-serif',overflowY:'auto'}}>
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}}>
        <div style={{position:'absolute',top:'-20%',right:'-10%',width:'400px',height:'400px',background:`radial-gradient(circle,${isOnline?'rgba(34,211,160,0.05)':'rgba(184,200,224,0.03)'} 0%,transparent 70%)`,borderRadius:'50%',transition:'background 1s'}}/>
      </div>

      <div style={{position:'relative',zIndex:1,maxWidth:'440px',margin:'0 auto',padding:'20px 16px',paddingTop:'calc(env(safe-area-inset-top) + 20px)'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'24px'}}>
          <div style={{width:'46px',height:'46px',borderRadius:'13px',background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.15)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.6)',flexShrink:0}}>
            <Bus size={20} style={{color:'var(--platinum)'}}/>
          </div>
          <div style={{flex:1}}>
            <h1 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'17px',color:'var(--text-primary)',margin:0}}>Panel del Chofer</h1>
            <p style={{color:'var(--text-muted)',fontSize:'12px',fontFamily:'DM Mono',margin:0}}>{driverName}</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',borderRadius:'999px',border:`1px solid ${isOnline?'rgba(34,211,160,0.25)':'rgba(184,200,224,0.1)'}`,background:isOnline?'rgba(34,211,160,0.08)':'rgba(184,200,224,0.04)'}}>
            {isOnline?<Wifi size={12} style={{color:'var(--go)'}}/>:<WifiOff size={12} style={{color:'var(--text-muted)'}}/>}
            <span style={{fontSize:'10px',fontFamily:'DM Mono',fontWeight:600,color:isOnline?'var(--go)':'var(--text-muted)'}}>{isOnline?'EN LÍNEA':'OFFLINE'}</span>
          </div>
        </div>

        {/* No session */}
        {!session && !showScanner && (
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="glass" style={{padding:'32px 24px',textAlign:'center',marginBottom:'16px'}}>
            <div style={{width:'64px',height:'64px',borderRadius:'18px',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.15)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
              <QrCode size={28} style={{color:'var(--platinum)'}}/>
            </div>
            <h2 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'18px',color:'var(--text-primary)',margin:'0 0 8px'}}>Escaneá el QR del colectivo</h2>
            <p style={{color:'var(--text-muted)',fontSize:'13px',lineHeight:1.5,margin:'0 0 24px'}}>
              Encontrá el código QR dentro del colectivo asignado y escanealo para iniciar tu turno.
            </p>
            <motion.button onClick={()=>setShowScanner(true)} whileHover={{scale:1.02}} whileTap={{scale:0.98}} className="btn-platinum">
              <QrCode size={16}/> Escanear código QR
            </motion.button>
            <p style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'14px',letterSpacing:'0.04em'}}>Sin QR no podés iniciar el turno</p>
          </motion.div>
        )}

        {/* QR scanner */}
        <AnimatePresence>
          {showScanner && !session && (
            <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-16}} className="glass" style={{padding:'24px',marginBottom:'16px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'18px'}}>
                <QrCode size={18} style={{color:'var(--platinum)'}}/><h3 style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'16px',color:'var(--text-primary)',margin:0}}>Ingresar código QR</h3>
              </div>
              {/* Viewfinder */}
              <div style={{width:'100%',aspectRatio:'1',borderRadius:'14px',background:'rgba(6,8,16,0.8)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'16px',position:'relative',overflow:'hidden'}}>
                {/* Corner markers */}
                {[{top:'20%',left:'20%',borderTop:'2px solid rgba(34,211,160,0.6)',borderLeft:'2px solid rgba(34,211,160,0.6)'},{top:'20%',right:'20%',borderTop:'2px solid rgba(34,211,160,0.6)',borderRight:'2px solid rgba(34,211,160,0.6)'},{bottom:'20%',left:'20%',borderBottom:'2px solid rgba(34,211,160,0.6)',borderLeft:'2px solid rgba(34,211,160,0.6)'},{bottom:'20%',right:'20%',borderBottom:'2px solid rgba(34,211,160,0.6)',borderRight:'2px solid rgba(34,211,160,0.6)'}].map((s,i)=>(
                  <div key={i} style={{position:'absolute',width:'36px',height:'36px',...s as any}}/>
                ))}
                <div style={{textAlign:'center'}}>
                  <QrCode size={44} style={{color:'rgba(184,200,224,0.15)'}}/>
                  <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'8px'}}>Cámara no disponible</div>
                </div>
              </div>
              <p style={{color:'var(--text-muted)',fontSize:'12px',marginBottom:'10px'}}>Pegá el token del QR:</p>
              <input className="input-dark" placeholder="Token QR (ej: DEMO-QR-BUS-0421-LINEA12)" value={qrToken} onChange={e=>setQrToken(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleQRScan()} style={{marginBottom:'12px'}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <button onClick={()=>{setShowScanner(false);setQrToken('')}} className="btn-glass">Cancelar</button>
                <motion.button onClick={handleQRScan} disabled={!qrToken.trim()||scanning} whileHover={{scale:1.02}} whileTap={{scale:0.98}} className="btn-platinum" style={{opacity:qrToken.trim()&&!scanning?1:0.5}}>
                  {scanning?'Validando...':'Confirmar'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active session */}
        {session && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}>
            {/* Session info */}
            <div className="platinum-card" style={{borderRadius:'var(--r-lg)',padding:'18px',marginBottom:'14px',overflow:'hidden',position:'relative'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'14px'}}>
                <CheckCircle size={15} style={{color:'var(--go)'}}/><span style={{color:'var(--go)',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600,letterSpacing:'0.06em'}}>TURNO ACTIVO</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
                {[['Empresa',session.companyName],['Línea',`Línea ${session.lineNumber}`],['Unidad',session.busUnit],['Recorrido',session.lineName.split(' - ')[1]||'—']].map(([k,v])=>(
                  <div key={k}>
                    <div style={{fontSize:'10px',fontFamily:'DM Mono',color:'var(--text-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'3px'}}>{k}</div>
                    <div style={{color:'var(--text-primary)',fontWeight:600,fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {gpsError&&(
              <div style={{display:'flex',gap:'10px',background:'rgba(255,77,106,0.07)',border:'1px solid rgba(255,77,106,0.2)',borderRadius:'var(--r-md)',padding:'12px 14px',marginBottom:'14px'}}>
                <AlertCircle size={16} style={{color:'#FF4D6A',flexShrink:0,marginTop:'1px'}}/><div style={{fontSize:'13px',color:'#FF4D6A'}}>{gpsError}</div>
              </div>
            )}

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}}>
              {[{icon:Gauge,val:`${pos?.speed??0}`,unit:'km/h'},{icon:Users,val:`${passengers}`,unit:'pasajeros'},{icon:Clock,val:fmt(duration),unit:'en turno'}].map(({icon:Icon,val,unit})=>(
                <div key={unit} style={{background:'rgba(6,8,16,0.6)',border:'1px solid rgba(184,200,224,0.07)',borderRadius:'var(--r-md)',padding:'14px 10px',textAlign:'center'}}>
                  <Icon size={14} style={{color:'var(--text-muted)',margin:'0 auto 6px'}}/>
                  <div style={{color:'var(--text-primary)',fontWeight:700,fontSize:'18px',lineHeight:1,fontFamily:'Syne,sans-serif'}}>{val}</div>
                  <div style={{color:'var(--text-muted)',fontSize:'9px',fontFamily:'DM Mono',marginTop:'3px',letterSpacing:'0.06em'}}>{unit}</div>
                </div>
              ))}
            </div>

            {/* Passenger counter */}
            <div className="glass" style={{padding:'18px',marginBottom:'14px'}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
                <Users size={14} style={{color:'var(--platinum)'}}/><span style={{color:'var(--text-primary)',fontWeight:500,fontSize:'14px'}}>Pasajeros a bordo</span>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'24px'}}>
                <button onClick={()=>setPassengers(p=>Math.max(0,p-1))} style={{width:'46px',height:'46px',borderRadius:'50%',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.15)',color:'var(--platinum)',fontSize:'22px',fontWeight:300,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 200ms'}}>−</button>
                <span style={{color:'var(--text-primary)',fontWeight:800,fontSize:'44px',minWidth:'64px',textAlign:'center',fontFamily:'Syne,sans-serif'}}>{passengers}</span>
                <button onClick={()=>setPassengers(p=>p+1)} style={{width:'46px',height:'46px',borderRadius:'50%',background:'rgba(34,211,160,0.1)',border:'1px solid rgba(34,211,160,0.25)',color:'var(--go)',fontSize:'22px',fontWeight:300,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 200ms'}}>+</button>
              </div>
            </div>

            {/* GPS status */}
            {pos&&(
              <div style={{background:'rgba(6,8,16,0.6)',border:'1px solid rgba(184,200,224,0.07)',borderRadius:'var(--r-md)',padding:'12px 14px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--go)',flexShrink:0,animation:'pulseNeon 2s ease-in-out infinite'}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:'10px',fontFamily:'DM Mono',color:'var(--text-muted)',letterSpacing:'0.06em',marginBottom:'2px'}}>GPS ACTIVO · visible para pasajeros</div>
                  <div style={{fontSize:'11px',fontFamily:'DM Mono',color:'var(--text-secondary)'}}>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</div>
                </div>
                <Navigation size={12} style={{color:'var(--text-muted)'}}/>
              </div>
            )}

            <motion.button onClick={endShift} whileTap={{scale:0.97}} style={{width:'100%',padding:'16px',borderRadius:'var(--r-lg)',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'14px',letterSpacing:'0.06em',textTransform:'uppercase',border:'2px solid rgba(255,77,106,0.3)',background:'rgba(255,77,106,0.08)',color:'#FF4D6A',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',transition:'all 250ms',boxShadow:'0 0 32px rgba(255,77,106,0.08)'}}>
              <Power size={18}/> Finalizar turno
            </motion.button>
          </motion.div>
        )}

        <button onClick={logout} style={{display:'flex',alignItems:'center',gap:'8px',margin:'16px auto 0',padding:'8px 16px',background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',fontSize:'12px',fontFamily:'DM Mono'}}>
          <LogOut size={13}/> Cerrar sesión
        </button>
      </div>
    </div>
  )
}