'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Bus, Users, QrCode, MapPin, AlertTriangle, Activity,
  Download, LogOut, RefreshCw, Plus, Calendar, Clock,
  ChevronRight, Star, Wifi, WifiOff, CheckCircle, XCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const HOURLY = Array.from({length:24},(_,h)=>({h:`${String(h).padStart(2,'0')}:00`,pasajeros:Math.round(Math.random()*300+(h>=7&&h<=9||h>=17&&h<=19?550:60)),subidas:Math.round(Math.random()*150+(h>=7&&h<=9||h>=17&&h<=19?280:30))}))
const WEEKLY = Array.from({length:7},(_,i)=>({d:format(subDays(new Date(),6-i),'EEE',{locale:es}),v:Math.round(Math.random()*1200+1800)}))
const TOP_STOPS=[{name:'Av. Rivadavia y Pueyrredón',subidas:342,espera:4},{name:'Av. Corrientes y Callao',subidas:287,espera:6},{name:'Av. Santa Fe y Medrano',subidas:198,espera:5},{name:'Av. Cabildo y Juramento',subidas:167,espera:7}]
const TTP={contentStyle:{background:'rgba(10,14,20,0.97)',border:'1px solid rgba(184,200,224,0.12)',borderRadius:'10px',fontSize:'12px',fontFamily:'DM Mono'},labelStyle:{color:'#C2C8D4'},itemStyle:{color:'#8A95A8'}}

type Tab = 'overview'|'buses'|'drivers'|'qrcodes'|'stops'|'reports'|'calendar'

// Simple QR SVG generator
function QRDisplay({ token, busUnit }: { token: string; busUnit: string }) {
  // Generate a simple visual QR pattern for display
  const size = 120
  const cells = 21
  const cellSize = size / cells

  // Deterministic pattern from token
  const hash = token.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const grid: boolean[][] = Array.from({length: cells}, (_, r) =>
    Array.from({length: cells}, (_, c) => {
      // Finder patterns (corners)
      if ((r < 7 && c < 7) || (r < 7 && c >= cells-7) || (r >= cells-7 && c < 7)) return true
      // Random fill based on token hash
      return ((r * cells + c + hash) % 3) !== 0
    })
  )

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
      <div style={{padding:'12px',background:'#fff',borderRadius:'10px',display:'inline-block'}}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {grid.map((row, r) => row.map((cell, c) =>
            cell ? <rect key={`${r}-${c}`} x={c*cellSize} y={r*cellSize} width={cellSize} height={cellSize} fill="#000"/> : null
          ))}
        </svg>
      </div>
      <div style={{textAlign:'center'}}>
        <div style={{color:'#fff',fontWeight:700,fontSize:'14px',fontFamily:'Syne,sans-serif'}}>Unidad {busUnit}</div>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px',letterSpacing:'0.04em'}}>{token.slice(0,24)}...</div>
      </div>
    </div>
  )
}

export default function CompanyDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<any>(null)
  const [qrCodes, setQrCodes] = useState<any[]>([])
  const [selectedQR, setSelectedQR] = useState<any>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [newBusUnit, setNewBusUnit] = useState('')
  const [activeSessions, setActiveSessions] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) { window.location.href='/login'; return }
      const {data:p} = await supabase.from('profiles').select('role').eq('id',user.id).single()
      if (p?.role !== 'company') { window.location.href='/'; return }

      const {data:comp} = await supabase.from('bus_companies').select('*').eq('profile_id',user.id).single()
      if (comp) {
        setCompany(comp)
        // Load QR codes
        const {data:qrs} = await supabase.from('bus_qr_codes').select('*').eq('company_id',comp.id)
        if (qrs) setQrCodes(qrs)
        // Load active sessions
        const {data:sessions} = await supabase
          .from('driver_sessions')
          .select('*, profiles!driver_id(name)')
          .eq('company_id',comp.id)
          .eq('is_active',true)
        if (sessions) setActiveSessions(sessions)
      }
      setLoading(false)
    })
  }, [])

  const generateQR = async () => {
    if (!newBusUnit.trim() || !company) return
    const {data,error} = await supabase.from('bus_qr_codes').insert({
      company_id: company.id,
      bus_unit: newBusUnit.trim(),
    }).select().single()
    if (error) { toast.error('Error al generar QR'); return }
    setQrCodes(prev => [...prev, data])
    setNewBusUnit('')
    setSelectedQR(data)
    setShowQRModal(true)
    toast.success(`QR generado para unidad ${newBusUnit}`)
  }

  const downloadQR = (qr: any) => {
    toast.success('QR descargado (función disponible en producción)')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const TABS: {id:Tab;icon:any;label:string}[] = [
    {id:'overview', icon:Activity,      label:'Resumen'},
    {id:'buses',    icon:Bus,           label:'Colectivos'},
    {id:'drivers',  icon:Users,         label:'Choferes'},
    {id:'qrcodes',  icon:QrCode,        label:'Códigos QR'},
    {id:'stops',    icon:MapPin,        label:'Paradas'},
    {id:'reports',  icon:AlertTriangle, label:'Denuncias'},
    {id:'calendar', icon:Calendar,      label:'Historial'},
  ]

  if (loading) return (
    <div style={{minHeight:'100vh',background:'var(--void)',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'var(--text-muted)',fontFamily:'DM Mono',fontSize:'13px'}}>Cargando panel...</div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'var(--void)',display:'flex',height:'100vh',overflow:'hidden',fontFamily:'DM Sans,sans-serif'}}>

      {/* Sidebar */}
      <aside style={{width:'220px',background:'linear-gradient(180deg,#0A0E14,#060810)',borderRight:'1px solid rgba(184,200,224,0.07)',display:'flex',flexDirection:'column',flexShrink:0}}>
        <div style={{padding:'20px 16px 16px',borderBottom:'1px solid rgba(184,200,224,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'34px',height:'34px',borderRadius:'10px',background:'linear-gradient(145deg,rgba(245,158,11,0.2),rgba(245,158,11,0.05))',border:'1px solid rgba(245,158,11,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bus size={16} style={{color:'#F59E0B'}}/>
            </div>
            <div>
              <div style={{color:'#fff',fontWeight:700,fontSize:'13px',fontFamily:'Syne,sans-serif'}}>{company?.company_name||'Empresa'}</div>
              <div style={{color:'rgba(245,158,11,0.7)',fontSize:'9px',fontFamily:'DM Mono',letterSpacing:'0.08em'}}>PANEL EMPRESA</div>
            </div>
          </div>
        </div>

        <nav style={{flex:1,padding:'12px 8px',display:'flex',flexDirection:'column',gap:'2px'}}>
          {TABS.map(({id,icon:Icon,label})=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:'9px',padding:'9px 10px',borderRadius:'9px',border:`1px solid ${tab===id?'rgba(245,158,11,0.2)':'transparent'}`,background:tab===id?'rgba(245,158,11,0.08)':'transparent',color:tab===id?'#F59E0B':'var(--text-muted)',fontSize:'13px',fontWeight:500,cursor:'pointer',transition:'all 200ms',textAlign:'left',width:'100%'}}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </nav>

        {/* Active buses indicator */}
        <div style={{padding:'12px 16px',borderTop:'1px solid rgba(184,200,224,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'10px'}}>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#22D3A0',animation:'pulseNeon 2s ease-in-out infinite'}}/>
            <span style={{color:'#22D3A0',fontSize:'11px',fontFamily:'DM Mono',fontWeight:600}}>{activeSessions.length} ACTIVOS</span>
          </div>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',borderRadius:'9px',border:'1px solid rgba(255,77,106,0.15)',background:'rgba(255,77,106,0.05)',color:'#FF4D6A',fontSize:'12px',cursor:'pointer',width:'100%'}}>
            <LogOut size={13}/> Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="scroll-panel" style={{flex:1,overflow:'auto'}}>
        <div style={{borderBottom:'1px solid rgba(184,200,224,0.06)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(6,8,16,0.5)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:10}}>
          <div>
            <h1 style={{color:'#fff',fontWeight:700,fontSize:'17px',fontFamily:'Syne,sans-serif',margin:0}}>{TABS.find(t=>t.id===tab)?.label}</h1>
            <p style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',margin:'2px 0 0'}}>
              {format(new Date(),"EEEE d 'de' MMMM",{locale:es})}
            </p>
          </div>
          <button onClick={()=>window.location.reload()} style={{width:'30px',height:'30px',borderRadius:'8px',background:'rgba(184,200,224,0.05)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
            <RefreshCw size={12} style={{color:'var(--text-muted)'}}/>
          </button>
        </div>

        <div style={{padding:'20px 24px'}}>
          {tab==='overview' && <CompanyOverview activeSessions={activeSessions}/>}
          {tab==='buses'    && <BusesTab activeSessions={activeSessions}/>}
          {tab==='drivers'  && <CompanyDrivers/>}
          {tab==='qrcodes'  && (
            <QRTab
              qrCodes={qrCodes}
              newBusUnit={newBusUnit}
              setNewBusUnit={setNewBusUnit}
              onGenerate={generateQR}
              onDownload={downloadQR}
            />
          )}
          {tab==='stops'    && <StopsTab/>}
          {tab==='reports'  && <CompanyReports/>}
          {tab==='calendar' && <CalendarTab/>}
        </div>
      </main>

      {/* QR Modal */}
      {showQRModal && selectedQR && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="glass-dark" style={{padding:'32px',borderRadius:'20px',maxWidth:'280px',width:'100%',margin:'16px',textAlign:'center'}}>
            <h3 style={{color:'#fff',fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:'18px',margin:'0 0 20px'}}>QR Generado</h3>
            <QRDisplay token={selectedQR.qr_token} busUnit={selectedQR.bus_unit}/>
            <div style={{display:'flex',gap:'10px',marginTop:'20px'}}>
              <button onClick={()=>downloadQR(selectedQR)} style={{flex:1,padding:'11px',borderRadius:'10px',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',color:'#F59E0B',fontSize:'13px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                <Download size={14}/> Descargar
              </button>
              <button onClick={()=>setShowQRModal(false)} style={{flex:1,padding:'11px',borderRadius:'10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function KPI({icon:Icon,label,value,color,sub}:{icon:any;label:string;value:string|number;color:string;sub?:string}) {
  return (
    <div className="kpi-card">
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(184,200,224,0.05)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Icon size={16} style={{color}}/>
        </div>
        <div>
          <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'3px'}}>{label}</div>
          <div style={{color:'#fff',fontWeight:800,fontSize:'22px',lineHeight:1,fontFamily:'Syne,sans-serif'}}>{value}</div>
          {sub&&<div style={{color:'var(--text-muted)',fontSize:'10px',marginTop:'3px'}}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function CompanyOverview({activeSessions}:{activeSessions:any[]}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
        <KPI icon={Bus}     label="Colectivos activos" value={activeSessions.length||'—'} color="#22D3A0" sub="en este momento"/>
        <KPI icon={Users}   label="Usuarios a bordo"   value="47"                         color="#F59E0B"/>
        <KPI icon={Activity} label="Viajes hoy"        value="23"                         color="var(--platinum)"/>
      </div>

      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Pasajeros por hora — hoy</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={HOURLY}>
            <defs><linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
            <XAxis dataKey="h" tick={{fill:'#4A5568',fontSize:10}} interval={3}/>
            <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
            <Tooltip {...TTP}/>
            <Area type="monotone" dataKey="pasajeros" name="Pasajeros" stroke="#F59E0B" fill="url(#ga)" strokeWidth={1.5}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Active buses live */}
      {activeSessions.length > 0 && (
        <div className="glass" style={{padding:'18px'}}>
          <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'14px'}}>Colectivos en servicio ahora</div>
          {activeSessions.map((s:any,i:number)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 0',borderBottom:i<activeSessions.length-1?'1px solid rgba(184,200,224,0.06)':'none'}}>
              <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'#22D3A0',flexShrink:0,animation:'pulseNeon 2s ease-in-out infinite'}}/>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontWeight:600,fontSize:'13px'}}>Unidad {s.bus_unit}</div>
                <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>{s.profiles?.name||'Chofer'} · desde {format(new Date(s.started_at),'HH:mm')}</div>
              </div>
              <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>{s.total_passengers} pas.</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BusesTab({activeSessions}:{activeSessions:any[]}) {
  const mockBuses = [
    {unit:'0421',driver:'Néstor García',status:'active',passengers:12,speed:34,stops:8,started:'07:42'},
    {unit:'0387',driver:'Carlos M.',status:'inactive',passengers:0,speed:0,stops:0,started:'—'},
    {unit:'0512',driver:'Roberto S.',status:'active',passengers:7,speed:28,stops:5,started:'08:15'},
    {unit:'0298',driver:'—',status:'inactive',passengers:0,speed:0,stops:0,started:'—'},
  ]
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      {mockBuses.map((b,i)=>(
        <div key={i} className="glass" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'42px',height:'42px',borderRadius:'12px',background:b.status==='active'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',border:`1px solid ${b.status==='active'?'rgba(34,211,160,0.25)':'rgba(184,200,224,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Bus size={18} style={{color:b.status==='active'?'#22D3A0':'var(--text-muted)'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
              <span style={{color:'#fff',fontWeight:700,fontSize:'15px',fontFamily:'Syne,sans-serif'}}>Unidad {b.unit}</span>
              <span style={{padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600,background:b.status==='active'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',color:b.status==='active'?'#22D3A0':'var(--text-muted)',border:`1px solid ${b.status==='active'?'rgba(34,211,160,0.2)':'rgba(184,200,224,0.1)'}`}}>
                {b.status==='active'?'EN SERVICIO':'INACTIVO'}
              </span>
            </div>
            <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>
              {b.driver} {b.status==='active'?`· ${b.passengers} pas · ${b.speed} km/h · desde ${b.started}`:''}
            </div>
          </div>
          {b.status==='active'&&<div style={{flexShrink:0,textAlign:'right'}}>
            <div style={{color:'#22D3A0',fontSize:'12px',fontFamily:'DM Mono',fontWeight:600}}>{b.stops} paradas</div>
          </div>}
        </div>
      ))}
    </div>
  )
}

function CompanyDrivers() {
  const drivers = [
    {name:'Néstor García',legajo:'LEG-0042',sessions:127,onTime:94,rating:4.8,reports:0,lastActive:'Hoy 07:42'},
    {name:'Carlos Martínez',legajo:'LEG-0018',sessions:89,onTime:88,rating:4.6,reports:1,lastActive:'Ayer 18:30'},
    {name:'Roberto Sánchez',legajo:'LEG-0067',sessions:203,onTime:96,rating:4.9,reports:0,lastActive:'Hoy 08:15'},
  ]
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      {drivers.map((d,i)=>(
        <div key={i} className="glass" style={{padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Users size={18} style={{color:'var(--platinum-dim)'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>{d.name}</div>
              <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.legajo} · último: {d.lastActive}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent:'flex-end'}}>
                <Star size={12} style={{color:'var(--near)',fill:'var(--near)'}}/><span style={{color:'#fff',fontFamily:'DM Mono',fontWeight:700,fontSize:'13px'}}>{d.rating}</span>
              </div>
              {d.reports>0&&<div style={{color:'#FF4D6A',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.reports} denuncia</div>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginTop:'12px'}}>
            {[{label:'Sesiones',value:d.sessions},{label:'A tiempo',value:`${d.onTime}%`},{label:'Denuncias',value:d.reports}].map(({label,value})=>(
              <div key={label} style={{background:'rgba(6,8,16,0.5)',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                <div style={{color:'#fff',fontWeight:700,fontFamily:'Syne,sans-serif',fontSize:'16px'}}>{value}</div>
                <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px'}}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function QRTab({qrCodes,newBusUnit,setNewBusUnit,onGenerate,onDownload}:{qrCodes:any[];newBusUnit:string;setNewBusUnit:(v:string)=>void;onGenerate:()=>void;onDownload:(qr:any)=>void}) {
  const [selected, setSelected] = useState<any>(null)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      {/* Generator */}
      <div className="glass" style={{padding:'20px'}}>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'14px'}}>Generar nuevo QR</div>
        <div style={{display:'flex',gap:'10px'}}>
          <input
            className="input-dark" placeholder="Número de unidad (ej: 0421)"
            value={newBusUnit} onChange={e=>setNewBusUnit(e.target.value)}
            style={{flex:1}}
            onKeyDown={e=>e.key==='Enter'&&onGenerate()}
          />
          <button onClick={onGenerate} disabled={!newBusUnit.trim()} style={{padding:'13px 20px',borderRadius:'10px',background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.3)',color:'#F59E0B',fontWeight:600,fontSize:'13px',cursor:newBusUnit.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',gap:'8px',flexShrink:0,transition:'all 200ms',opacity:newBusUnit.trim()?1:0.5}}>
            <Plus size={15}/> Generar QR
          </button>
        </div>
        <p style={{color:'var(--text-muted)',fontSize:'11px',marginTop:'10px',lineHeight:1.5}}>
          El QR generado debe ser impreso y colocado en el colectivo. Cuando el chofer lo escanea, el sistema lo asocia automáticamente con ese vehículo.
        </p>
      </div>

      {/* QR list */}
      {qrCodes.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px',color:'var(--text-muted)',fontFamily:'DM Mono',fontSize:'13px'}}>
          No hay códigos QR generados aún.<br/>Creá uno con el formulario de arriba.
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'12px'}}>
          {qrCodes.map((qr:any)=>(
            <div key={qr.id} className="glass" style={{padding:'16px',cursor:'pointer',border:`1px solid ${selected?.id===qr.id?'rgba(245,158,11,0.3)':'rgba(184,200,224,0.08)'}`,transition:'all 200ms'}} onClick={()=>setSelected(selected?.id===qr.id?null:qr)}>
              <QRDisplay token={qr.qr_token} busUnit={qr.bus_unit}/>
              <div style={{marginTop:'14px',display:'flex',gap:'8px'}}>
                <button onClick={e=>{e.stopPropagation();onDownload(qr)}} style={{flex:1,padding:'8px',borderRadius:'8px',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',color:'#F59E0B',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                  <Download size={12}/> Descargar
                </button>
              </div>
              <div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:qr.is_active?'#22D3A0':'#4A5568'}}/>
                <span style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono'}}>{qr.is_active?'Activo':'Inactivo'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Demo QR if no real ones */}
      {qrCodes.length === 0 && (
        <div className="glass" style={{padding:'20px',textAlign:'center'}}>
          <div style={{color:'var(--text-muted)',fontSize:'12px',marginBottom:'16px'}}>QR de ejemplo (Unidad 0421 — Línea 12)</div>
          <QRDisplay token="DEMO-QR-BUS-0421-LINEA12" busUnit="0421"/>
        </div>
      )}
    </div>
  )
}

function StopsTab() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'14px'}}>Paradas más activas hoy</div>
        {TOP_STOPS.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:i<TOP_STOPS.length-1?'14px':'0'}}>
            <div style={{width:'26px',color:'var(--text-muted)',fontWeight:700,fontSize:'13px',fontFamily:'Syne,sans-serif',textAlign:'right',flexShrink:0}}>{i+1}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                <span style={{color:'#fff',fontSize:'13px',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{s.name}</span>
                <span style={{color:'var(--platinum)',fontSize:'12px',fontFamily:'DM Mono',fontWeight:600,flexShrink:0,marginLeft:'8px'}}>{s.subidas}</span>
              </div>
              <div style={{height:'3px',background:'rgba(184,200,224,0.07)',borderRadius:'2px'}}>
                <div style={{height:'3px',borderRadius:'2px',background:'linear-gradient(90deg,#9AA4B8,#B8C8E0)',width:`${(s.subidas/TOP_STOPS[0].subidas)*100}%`,transition:'width 600ms'}}/>
              </div>
              <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',marginTop:'3px'}}>espera promedio: {s.espera} min</div>
            </div>
          </div>
        ))}
      </div>
      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Subidas por hora</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={HOURLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
            <XAxis dataKey="h" tick={{fill:'#4A5568',fontSize:10}} interval={3}/>
            <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
            <Tooltip {...TTP}/>
            <Bar dataKey="subidas" name="Subidas" fill="rgba(245,158,11,0.3)" stroke="#F59E0B" strokeWidth={0.5} radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CompanyReports() {
  const [reports, setReports] = useState([
    {id:'1',type:'No paró',driver:'Néstor García',bus:'0421',stop:'Av. Rivadavia y Medrano',status:'pending',time:'Hace 20 min',desc:'El colectivo no paró en la parada habitual.'},
    {id:'2',type:'Mal trato',driver:'Carlos M.',bus:'0387',stop:'Av. Corrientes y Callao',status:'resolved',time:'Hace 2h',desc:'El chofer fue descortés con los pasajeros.'},
  ])
  const statusStyle:Record<string,any>={pending:{bg:'rgba(240,180,41,0.08)',c:'#F0B429',b:'rgba(240,180,41,0.2)'},resolved:{bg:'rgba(34,211,160,0.08)',c:'#22D3A0',b:'rgba(34,211,160,0.2)'}}
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
      {reports.map(r=>(
        <div key={r.id} className="glass" style={{padding:'16px'}}>
          <div style={{display:'flex',alignItems:'flex-start',gap:'12px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,77,106,0.07)',border:'1px solid rgba(255,77,106,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <AlertTriangle size={15} style={{color:'#FF4D6A'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                <span style={{color:'#fff',fontWeight:600,fontSize:'14px'}}>{r.type}</span>
                <span style={{padding:'2px 7px',borderRadius:'999px',fontSize:'10px',fontFamily:'DM Mono',background:statusStyle[r.status].bg,color:statusStyle[r.status].c,border:`1px solid ${statusStyle[r.status].b}`}}>
                  {r.status==='pending'?'Pendiente':'Resuelto'}
                </span>
              </div>
              <div style={{color:'var(--text-muted)',fontSize:'12px',marginBottom:'6px'}}>{r.desc}</div>
              <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>{r.driver} · Unidad {r.bus} · {r.stop} · {r.time}</div>
            </div>
          </div>
          {r.status==='pending'&&(
            <div style={{display:'flex',gap:'8px',marginTop:'12px'}}>
              <button onClick={()=>setReports(rs=>rs.map(x=>x.id===r.id?{...x,status:'resolved'}:x))} style={{flex:1,padding:'8px',borderRadius:'8px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)',color:'#22D3A0',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
                Marcar resuelto
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CalendarTab() {
  const days = Array.from({length:30},(_,i)=>{
    const d = subDays(new Date(),29-i)
    const hasWork = Math.random()>0.3
    return { date:d, label:format(d,'d'), dayName:format(d,'EEE',{locale:es}), hasWork, bus:hasWork?['0421','0387','0512'][Math.floor(Math.random()*3)]:null, hours:hasWork?`${6+Math.floor(Math.random()*4)}:00 - ${14+Math.floor(Math.random()*4)}:00`:null }
  })
  const [selected, setSelected] = useState<any>(null)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <div className="glass" style={{padding:'20px'}}>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'16px'}}>Historial de actividad — últimos 30 días</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:'6px'}}>
          {days.map((d,i)=>(
            <button key={i} onClick={()=>setSelected(selected?.date===d.date?null:d)} style={{aspectRatio:'1/1',borderRadius:'8px',background:d.hasWork?(selected?.date===d.date?'rgba(34,211,160,0.3)':'rgba(34,211,160,0.12)'):'rgba(184,200,224,0.04)',border:`1px solid ${d.hasWork?(selected?.date===d.date?'rgba(34,211,160,0.5)':'rgba(34,211,160,0.2)'):'rgba(184,200,224,0.06)'}`,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1px',transition:'all 200ms',padding:'4px'}}>
              <span style={{color:d.hasWork?'#22D3A0':'var(--text-muted)',fontSize:'11px',fontWeight:d.hasWork?700:400,fontFamily:'DM Mono'}}>{d.label}</span>
              <span style={{color:'var(--text-muted)',fontSize:'8px',fontFamily:'DM Mono',textTransform:'uppercase'}}>{d.dayName}</span>
            </button>
          ))}
        </div>
      </div>
      {selected && selected.hasWork && (
        <div className="glass" style={{padding:'16px'}}>
          <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>
            {format(selected.date,"EEEE d 'de' MMMM",{locale:es})}
          </div>
          <div style={{display:'flex',gap:'12px'}}>
            <div style={{flex:1,background:'rgba(6,8,16,0.5)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{color:'#fff',fontWeight:700,fontFamily:'Syne,sans-serif',fontSize:'18px'}}>Unidad {selected.bus}</div>
              <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'4px'}}>Vehículo asignado</div>
            </div>
            <div style={{flex:1,background:'rgba(6,8,16,0.5)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{color:'#fff',fontWeight:700,fontFamily:'Syne,sans-serif',fontSize:'16px'}}>{selected.hours}</div>
              <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'4px'}}>Horario</div>
            </div>
            <div style={{flex:1,background:'rgba(6,8,16,0.5)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{color:'#22D3A0',fontWeight:700,fontFamily:'Syne,sans-serif',fontSize:'18px'}}>{Math.floor(Math.random()*80+40)}</div>
              <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'4px'}}>Pasajeros</div>
            </div>
          </div>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'10px',height:'10px',borderRadius:'3px',background:'rgba(34,211,160,0.12)',border:'1px solid rgba(34,211,160,0.2)'}}/><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Día trabajado</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'10px',height:'10px',borderRadius:'3px',background:'rgba(184,200,224,0.04)',border:'1px solid rgba(184,200,224,0.06)'}}/><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Sin actividad</span></div>
      </div>
    </div>
  )
}