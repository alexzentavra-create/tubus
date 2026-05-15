'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Bus, Navigation, Wifi, WifiOff, Users, Power, AlertCircle, Gauge, Clock } from 'lucide-react'
import { publishDriverLocation } from '@/lib/supabase'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface DriverSession { driverId:string; driverName:string; busUnit:string; lineId:string; lineNumber:string; lineName:string }

export default function DriverPage() {
  const supabase = createClient()
  const watchIdRef = useRef<number|null>(null)
  const intervalRef = useRef<NodeJS.Timeout|null>(null)
  const lastPosRef = useRef<GeolocationPosition|null>(null)
  const startRef = useRef<Date|null>(null)

  const [session, setSession] = useState<DriverSession|null>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [passengers, setPassengers] = useState(0)
  const [pos, setPos] = useState<{lat:number;lng:number;speed:number;heading:number}|null>(null)
  const [gpsError, setGpsError] = useState<string|null>(null)
  const [status, setStatus] = useState<'moving'|'stopped'>('stopped')
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) { window.location.href='/login'; return }
      const {data:p} = await supabase.from('driver_profiles').select('*,profiles!id(name),bus_lines!line_id(id,line_number,name)').eq('id',user.id).single()
      if (p) setSession({ driverId:user.id, driverName:(p.profiles as any).name, busUnit:p.bus_unit, lineId:p.line_id, lineNumber:(p.bus_lines as any).line_number, lineName:(p.bus_lines as any).name })
    })
  }, [])

  useEffect(() => {
    if (!isOnline) return
    startRef.current = new Date()
    const t = setInterval(() => { if (startRef.current) setDuration(Math.floor((Date.now()-startRef.current.getTime())/1000)) }, 1000)
    return () => clearInterval(t)
  }, [isOnline])

  const start = useCallback(() => {
    if (!session || !navigator.geolocation) { toast.error('GPS no disponible'); return }
    navigator.geolocation.getCurrentPosition(() => {
      watchIdRef.current = navigator.geolocation.watchPosition(p => {
        lastPosRef.current = p
        const spd = p.coords.speed ? Math.round(p.coords.speed*3.6) : 0
        setPos({lat:p.coords.latitude,lng:p.coords.longitude,speed:spd,heading:p.coords.heading||0})
        setStatus(spd>2 ? 'moving' : 'stopped')
        setGpsError(null)
      }, err=>setGpsError(err.message), {enableHighAccuracy:true,timeout:10000,maximumAge:2000})
      intervalRef.current = setInterval(async () => {
        const p = lastPosRef.current; if (!p||!session) return
        const spd = p.coords.speed ? Math.round(p.coords.speed*3.6) : 0
        await publishDriverLocation({ driverId:session.driverId, lineId:session.lineId, busUnit:session.busUnit, lat:p.coords.latitude, lng:p.coords.longitude, heading:p.coords.heading||0, speedKmh:spd, status:spd>2?'moving':'stopped', passengerCount:passengers })
      }, 5000)
      setIsOnline(true)
      toast.success('GPS activo — los pasajeros te ven')
    }, err=>{ setGpsError(err.message); toast.error('Permiso de GPS denegado') }, {enableHighAccuracy:true})
  }, [session, passengers])

  const stop = useCallback(async () => {
    if (watchIdRef.current!==null) navigator.geolocation.clearWatch(watchIdRef.current)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsOnline(false); setPos(null); setDuration(0)
    toast('Turno finalizado')
  }, [])

  const fmt = (s:number) => { const h=Math.floor(s/3600),m=Math.floor((s%3600)/60); return h>0?`${h}h ${m}m`:`${m}m ${s%60}s` }

  if (!session) return (
    <div style={{minHeight:'100vh',background:'var(--void)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'var(--text-muted)',fontFamily:'DM Mono',fontSize:'13px'}}>Cargando perfil...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--void)',padding:'20px 16px',color:'var(--text-primary)',fontFamily:'DM Sans'}}>
      {/* Ambient */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}}>
        <div style={{position:'absolute',top:'-20%',right:'-10%',width:'400px',height:'400px',background:`radial-gradient(circle, ${isOnline ? 'rgba(34,211,160,0.05)' : 'rgba(184,200,224,0.03)'} 0%, transparent 70%)`,borderRadius:'50%',transition:'background 1s'}} />
      </div>

      <div style={{position:'relative',zIndex:1,maxWidth:'440px',margin:'0 auto'}}>
        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:'28px',paddingTop:'env(safe-area-inset-top)'}}>
          <div style={{width:'48px',height:'48px',borderRadius:'14px',background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.15)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 16px rgba(0,0,0,0.6)'}}>
            <Bus size={22} style={{color:'var(--platinum)'}} />
          </div>
          <div style={{flex:1}}>
            <h1 className="font-display" style={{fontWeight:700,fontSize:'18px',color:'var(--text-primary)'}}>Panel del Chofer</h1>
            <p style={{color:'var(--text-muted)',fontSize:'12px',fontFamily:'DM Mono'}}>Bien Parada</p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'7px',padding:'6px 12px',borderRadius:'999px',border:`1px solid ${isOnline?'rgba(34,211,160,0.25)':'rgba(184,200,224,0.1)'}`,background:isOnline?'rgba(34,211,160,0.08)':'rgba(184,200,224,0.04)'}}>
            {isOnline ? <Wifi size={13} style={{color:'var(--go)'}} /> : <WifiOff size={13} style={{color:'var(--text-muted)'}} />}
            <span style={{fontSize:'11px',fontFamily:'DM Mono',fontWeight:500,color:isOnline?'var(--go)':'var(--text-muted)'}}>{isOnline?'EN LÍNEA':'OFFLINE'}</span>
          </div>
        </div>

        {/* Info card */}
        <div className="platinum-card" style={{borderRadius:'var(--r-lg)',padding:'18px',marginBottom:'14px'}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
            {[['Nombre',session.driverName],['Unidad',session.busUnit],['Línea',`Línea ${session.lineNumber}`],['Recorrido',session.lineName.split(' - ')[1]||'—']].map(([k,v])=>(
              <div key={k}>
                <div style={{fontSize:'10px',fontFamily:'DM Mono',color:'var(--text-muted)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'4px'}}>{k}</div>
                <div style={{color:'var(--text-primary)',fontWeight:600,fontSize:'14px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* GPS error */}
        {gpsError && (
          <div style={{display:'flex',gap:'10px',background:'rgba(255,77,106,0.07)',border:'1px solid rgba(255,77,106,0.2)',borderRadius:'var(--r-md)',padding:'12px 14px',marginBottom:'14px'}}>
            <AlertCircle size={16} style={{color:'#FF4D6A',flexShrink:0,marginTop:'1px'}} />
            <div style={{fontSize:'13px',color:'#FF4D6A'}}>{gpsError}</div>
          </div>
        )}

        {/* Live stats */}
        {isOnline && (
          <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginBottom:'14px'}}>
            {[{icon:Gauge,val:`${pos?.speed??0}`,unit:'km/h'},{icon:Users,val:`${passengers}`,unit:'pasajeros'},{icon:Clock,val:fmt(duration),unit:'en turno'}].map(({icon:Icon,val,unit})=>(
              <div key={unit} style={{background:'rgba(6,8,16,0.7)',border:'1px solid rgba(184,200,224,0.07)',borderRadius:'var(--r-md)',padding:'14px 10px',textAlign:'center'}}>
                <Icon size={14} style={{color:'var(--text-muted)',margin:'0 auto 6px'}} />
                <div className="font-display" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'18px',lineHeight:1}}>{val}</div>
                <div style={{color:'var(--text-muted)',fontSize:'9px',fontFamily:'DM Mono',marginTop:'3px',letterSpacing:'0.06em'}}>{unit}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Passenger counter */}
        {isOnline && (
          <div className="glass" style={{padding:'18px',marginBottom:'14px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'16px'}}>
              <Users size={14} style={{color:'var(--platinum)'}} />
              <span style={{color:'var(--text-primary)',fontWeight:500,fontSize:'14px'}}>Pasajeros a bordo</span>
            </div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'24px'}}>
              <button onClick={()=>setPassengers(p=>Math.max(0,p-1))} style={{width:'48px',height:'48px',borderRadius:'50%',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.15)',color:'var(--platinum)',fontSize:'22px',fontWeight:300,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 200ms'}}>−</button>
              <span className="font-display" style={{color:'var(--text-primary)',fontWeight:800,fontSize:'44px',minWidth:'64px',textAlign:'center'}}>{passengers}</span>
              <button onClick={()=>setPassengers(p=>p+1)} style={{width:'48px',height:'48px',borderRadius:'50%',background:'rgba(34,211,160,0.1)',border:'1px solid rgba(34,211,160,0.25)',color:'var(--go)',fontSize:'22px',fontWeight:300,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 200ms'}}>+</button>
            </div>
          </div>
        )}

        {/* GPS position */}
        {isOnline && pos && (
          <div style={{background:'rgba(6,8,16,0.6)',border:'1px solid rgba(184,200,224,0.07)',borderRadius:'var(--r-md)',padding:'12px 14px',marginBottom:'14px',display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--go)',flexShrink:0,animation:'pulseNeon 2s ease-in-out infinite'}} />
            <div style={{flex:1}}>
              <div style={{fontSize:'10px',fontFamily:'DM Mono',color:'var(--text-muted)',letterSpacing:'0.06em',marginBottom:'2px'}}>GPS ACTIVO</div>
              <div style={{fontSize:'11px',fontFamily:'DM Mono',color:'var(--text-secondary)'}}>{pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
              <Navigation size={12} style={{color:'var(--text-muted)'}} />
              <span style={{fontSize:'11px',fontFamily:'DM Mono',color:'var(--text-muted)'}}>{Math.round(pos.heading)}°</span>
            </div>
          </div>
        )}

        {/* Main CTA */}
        <motion.button
          onClick={isOnline ? stop : start}
          whileTap={{scale:0.97}}
          style={{width:'100%',padding:'18px',borderRadius:'var(--r-lg)',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'14px',letterSpacing:'0.06em',textTransform:'uppercase',border:`2px solid ${isOnline?'rgba(255,77,106,0.3)':'rgba(34,211,160,0.3)'}`,background:isOnline?'rgba(255,77,106,0.08)':'rgba(34,211,160,0.08)',color:isOnline?'#FF4D6A':'var(--go)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',transition:'all 250ms',boxShadow:isOnline?'0 0 32px rgba(255,77,106,0.08)':'0 0 32px rgba(34,211,160,0.08)'}}
        >
          <Power size={18} />
          {isOnline ? 'Finalizar turno' : 'Iniciar turno'}
        </motion.button>

        {!isOnline && <p style={{textAlign:'center',color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'12px',letterSpacing:'0.04em'}}>Al iniciar, tu GPS será visible para los pasajeros</p>}
      </div>
    </div>
  )
}