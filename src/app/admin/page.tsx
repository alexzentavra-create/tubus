'use client'
import { useState, useEffect } from 'react'
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { Bus, Users, AlertTriangle, TrendingUp, Download, Clock, MapPin, Star, BarChart2, Activity, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { BusLine } from '@/types'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const HOURLY = Array.from({length:24},(_,h)=>({h:`${String(h).padStart(2,'0')}:00`,v:Math.round(Math.random()*400+(h>=7&&h<=9||h>=17&&h<=19?600:50))}))
const WEEKLY = Array.from({length:7},(_,i)=>({d:format(subDays(new Date(),6-i),'EEE',{locale:es}),v:Math.round(Math.random()*2000+3000)}))
const TOP_STOPS = [
  {name:'Av. Corrientes y Callao',v:842,wait:4},
  {name:'Av. Santa Fe y Pueyrredón',v:721,wait:6},
  {name:'Av. Rivadavia y Medrano',v:608,wait:5},
  {name:'Av. Cabildo y Juramento',v:589,wait:7},
  {name:'Av. del Libertador y Obligado',v:412,wait:8},
]
const RPT_TYPES = [
  {name:'No paró',v:38,c:'#FF4D6A'},{name:'Mal trato',v:22,c:'#F0B429'},
  {name:'Cond. peligrosa',v:18,c:'#8B5CF6'},{name:'Veh. defectuoso',v:14,c:'#3B82F6'},{name:'Otro',v:8,c:'#22D3A0'},
]
const MOCK_REPORTS = [
  {id:'1',reporter:'Juan P.',type:'No paró',driver:'Carlos M.',bus:'0421',status:'pending',at:'Hace 12 min'},
  {id:'2',reporter:'María G.',type:'Mal trato',driver:'Roberto S.',bus:'0387',status:'reviewing',at:'Hace 1h'},
  {id:'3',reporter:'Lucas F.',type:'Cond. peligrosa',driver:'Diego R.',bus:'0512',status:'resolved',at:'Hace 3h'},
  {id:'4',reporter:'Ana C.',type:'No llegó',driver:'Pablo G.',bus:'0298',status:'pending',at:'Hace 4h'},
]
const MOCK_DRIVERS = [
  {name:'Carlos Martínez',unit:'0421',online:true,trips:4,rating:4.9,reports:0},
  {name:'Roberto Sánchez',unit:'0387',online:true,trips:3,rating:4.6,reports:1},
  {name:'Diego Rodríguez',unit:'0512',online:false,trips:6,rating:4.2,reports:2},
  {name:'Pablo García',unit:'0298',online:true,trips:2,rating:5.0,reports:0},
  {name:'Miguel Torres',unit:'0634',online:false,trips:5,rating:4.7,reports:0},
]

type Tab = 'overview'|'reports'|'stops'|'drivers'

const S = { // shared inline styles shorthand
  label: {fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.1em',color:'var(--text-muted)',textTransform:'uppercase' as const,marginBottom:'6px'},
  card: {background:'rgba(6,8,16,0.5)',border:'1px solid rgba(184,200,224,0.06)',borderRadius:'var(--r-md)',padding:'14px 16px'},
}

export default function AdminPanel() {
  const supabase = createClient()
  const [lines, setLines] = useState<BusLine[]>([])
  const [sel, setSel] = useState<BusLine|null>(null)
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    supabase.auth.getUser().then(async({data:{user}})=>{
      if(!user){window.location.href='/login';return}
      const{data:p}=await supabase.from('profiles').select('role').eq('id',user.id).single()
      if(p?.role!=='admin'){window.location.href='/';return}
    })
    supabase.from('bus_lines').select('*').then(({data})=>{ if(data){setLines(data);setSel(data[0])}; setLoading(false) })
  },[])

  const exportCSV = () => {
    const csv = ['Hora,Pasajeros',...HOURLY.map(d=>`${d.h},${d.v}`)].join('\n')
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`bustrack_${sel?.line_number}_${format(new Date(),'yyyy-MM-dd')}.csv`; a.click()
    toast.success('Datos exportados')
  }

  const TABS: {id:Tab;icon:any;label:string}[] = [
    {id:'overview',icon:BarChart2,label:'Resumen'},
    {id:'reports',icon:AlertTriangle,label:'Denuncias'},
    {id:'stops',icon:MapPin,label:'Paradas'},
    {id:'drivers',icon:Bus,label:'Choferes'},
  ]

  const tColor = (t:Tab) => tab===t ? 'rgba(184,200,224,0.15)' : 'transparent'
  const tBorder = (t:Tab) => tab===t ? '1px solid rgba(184,200,224,0.18)' : '1px solid transparent'

  if(loading) return <div style={{minHeight:'100vh',background:'var(--void)',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'var(--text-muted)',fontFamily:'DM Mono'}}>Cargando...</div></div>

  return (
    <div style={{minHeight:'100vh',background:'var(--void)',display:'flex',overflow:'hidden',height:'100vh',fontFamily:'DM Sans'}}>
      {/* Sidebar */}
      <aside style={{width:'240px',background:'linear-gradient(180deg,#0D1117,#0A0E14)',borderRight:'1px solid rgba(184,200,224,0.07)',display:'flex',flexDirection:'column',flexShrink:0}}>
        {/* Logo */}
        <div style={{padding:'24px 20px 20px',borderBottom:'1px solid rgba(184,200,224,0.07)'}}>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bus size={16} style={{color:'var(--platinum)'}} />
            </div>
            <div>
              <div className="font-display" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'14px'}}>Bien Parada</div>
              <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono'}}>ADMINISTRACIÓN</div>
            </div>
          </div>
        </div>

        {/* Line selector */}
        <div style={{padding:'14px 16px',borderBottom:'1px solid rgba(184,200,224,0.07)'}}>
          <div style={{...S.label,marginBottom:'8px'}}>Línea activa</div>
          <select style={{width:'100%',background:'rgba(6,8,16,0.8)',border:'1px solid rgba(184,200,224,0.1)',borderRadius:'8px',color:'var(--text-primary)',padding:'9px 12px',fontSize:'13px',fontFamily:'DM Mono',cursor:'pointer'}} value={sel?.id||''} onChange={e=>setSel(lines.find(l=>l.id===e.target.value)||null)}>
            {lines.map(l=><option key={l.id} value={l.id}>L{l.line_number} — {l.name.split(' - ')[1]?.slice(0,20)||l.name.slice(0,20)}</option>)}
          </select>
        </div>

        {/* Nav */}
        <nav style={{flex:1,padding:'12px 10px',display:'flex',flexDirection:'column',gap:'3px'}}>
          {TABS.map(({id,icon:Icon,label})=>(
            <button key={id} onClick={()=>setTab(id)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'10px',border:tBorder(id),background:tColor(id),color: tab===id ? 'var(--platinum)' : 'var(--text-muted)',fontSize:'13px',fontWeight:500,cursor:'pointer',transition:'all 200ms',textAlign:'left'}}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </nav>

        <div style={{padding:'14px 12px',borderTop:'1px solid rgba(184,200,224,0.07)'}}>
          <button className="btn-glass" style={{fontSize:'12px',padding:'10px 16px'}} onClick={exportCSV}>
            <Download size={13}/> Exportar CSV
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="scroll-panel" style={{flex:1,display:'flex',flexDirection:'column'}}>
        {/* Topbar */}
        <div style={{borderBottom:'1px solid rgba(184,200,224,0.06)',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(6,8,16,0.5)',backdropFilter:'blur(12px)',flexShrink:0,position:'sticky',top:0,zIndex:10}}>
          <div>
            <h1 className="font-display" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'18px'}}>{TABS.find(t=>t.id===tab)?.label}</h1>
            {sel && <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'3px'}}><div style={{width:'8px',height:'8px',borderRadius:'50%',background:sel.color}} /><span style={{color:'var(--text-muted)',fontSize:'12px',fontFamily:'DM Mono'}}>Línea {sel.line_number}</span></div>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
            <span style={{color:'var(--text-muted)',fontSize:'12px',fontFamily:'DM Mono'}}>{format(new Date(),"EEEE d MMM",{locale:es})}</span>
            <button onClick={()=>window.location.reload()} style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(184,200,224,0.05)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <RefreshCw size={13} style={{color:'var(--text-muted)'}} />
            </button>
          </div>
        </div>

        <div style={{padding:'24px',flex:1}}>
          {tab==='overview' && <OverviewTab />}
          {tab==='reports'  && <ReportsTab />}
          {tab==='stops'    && <StopsTab />}
          {tab==='drivers'  && <DriversTab />}
        </div>
      </main>
    </div>
  )
}

/* ─── KPI ─────────────────────────────────────────────────────────────────── */
function KPI({icon:Icon,label,value,color}:{icon:any;label:string;value:string|number;color:string}) {
  return (
    <div className="kpi-card">
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(184,200,224,0.05)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Icon size={17} style={{color}} />
        </div>
        <div>
          <div style={{...S.label,marginBottom:'3px'}}>{label}</div>
          <div className="font-display" style={{color:'var(--text-primary)',fontWeight:800,fontSize:'24px',lineHeight:1}}>{value}</div>
        </div>
      </div>
    </div>
  )
}

const TTP = {contentStyle:{background:'rgba(10,14,20,0.97)',border:'1px solid rgba(184,200,224,0.12)',borderRadius:'10px',fontSize:'12px',fontFamily:'DM Mono'},labelStyle:{color:'var(--platinum)'},itemStyle:{color:'var(--text-secondary)'}}

function OverviewTab() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'12px'}}>
        <KPI icon={Bus}          label="Colectivos activos"  value={23}      color="#22D3A0" />
        <KPI icon={Users}        label="Choferes online"     value={19}      color="var(--platinum)" />
        <KPI icon={Users}        label="Usuarios con app"    value="4,821"   color="#3B82F6" />
        <KPI icon={AlertTriangle} label="Denuncias pendientes" value={7}     color="#FF4D6A" />
        <KPI icon={TrendingUp}   label="Pasajeros hoy"       value="12,540"  color="var(--near)" />
        <KPI icon={Activity}     label="En hora"             value="84%"     color="#22D3A0" />
      </div>

      <div className="glass" style={{padding:'20px'}}>
        <div style={{...S.label,marginBottom:'14px'}}>Pasajeros por hora — hoy</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={HOURLY}>
            <defs>
              <linearGradient id="grd" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B8C8E0" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#B8C8E0" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)" />
            <XAxis dataKey="h" tick={{fill:'#4A5568',fontSize:10}} interval={3} />
            <YAxis tick={{fill:'#4A5568',fontSize:10}} />
            <Tooltip {...TTP} />
            <Area type="monotone" dataKey="v" name="Pasajeros" stroke="#B8C8E0" fill="url(#grd)" strokeWidth={1.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        <div className="glass" style={{padding:'20px'}}>
          <div style={{...S.label,marginBottom:'14px'}}>Últimos 7 días</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={WEEKLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)" />
              <XAxis dataKey="d" tick={{fill:'#4A5568',fontSize:10}} />
              <YAxis tick={{fill:'#4A5568',fontSize:10}} />
              <Tooltip {...TTP} />
              <Bar dataKey="v" name="Pasajeros" fill="rgba(184,200,224,0.2)" stroke="#B8C8E0" strokeWidth={1} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass" style={{padding:'20px'}}>
          <div style={{...S.label,marginBottom:'14px'}}>Tipos de denuncias</div>
          <div style={{display:'flex',alignItems:'center',gap:'16px'}}>
            <PieChart width={120} height={120}>
              <Pie data={RPT_TYPES} cx={55} cy={55} innerRadius={32} outerRadius={50} dataKey="v" strokeWidth={0}>
                {RPT_TYPES.map((e,i)=><Cell key={i} fill={e.c} fillOpacity={0.85} />)}
              </Pie>
            </PieChart>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:'6px'}}>
              {RPT_TYPES.map(rt=>(
                <div key={rt.name} style={{display:'flex',alignItems:'center',gap:'8px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:rt.c,flexShrink:0}} />
                  <span style={{color:'var(--text-muted)',fontSize:'11px',flex:1}}>{rt.name}</span>
                  <span style={{color:'var(--text-primary)',fontSize:'11px',fontFamily:'DM Mono',fontWeight:600}}>{rt.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ReportsTab() {
  const [reports, setReports] = useState(MOCK_REPORTS)
  const statusStyle:{[k:string]:React.CSSProperties} = {
    pending:   {background:'rgba(240,180,41,0.08)',color:'#F0B429',border:'1px solid rgba(240,180,41,0.2)'},
    reviewing: {background:'rgba(59,130,246,0.08)',color:'#3B82F6',border:'1px solid rgba(59,130,246,0.2)'},
    resolved:  {background:'rgba(34,211,160,0.08)',color:'#22D3A0',border:'1px solid rgba(34,211,160,0.2)'},
    dismissed: {background:'rgba(74,85,104,0.1)',color:'#4A5568',border:'1px solid rgba(74,85,104,0.2)'},
  }
  const sLabel = {pending:'Pendiente',reviewing:'Revisando',resolved:'Resuelto',dismissed:'Desestimado'}

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      {reports.map(r=>(
        <div key={r.id} className="glass" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(255,77,106,0.07)',border:'1px solid rgba(255,77,106,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <AlertTriangle size={16} style={{color:'#FF4D6A'}} />
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
              <span style={{color:'var(--text-primary)',fontWeight:600,fontSize:'14px'}}>{r.type}</span>
              <span style={{padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontFamily:'DM Mono',fontWeight:500,...statusStyle[r.status]}}>{(sLabel as any)[r.status]}</span>
            </div>
            <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>
              {r.reporter} · Chofer {r.driver} · Unidad {r.bus} · {r.at}
            </div>
          </div>
          <div style={{display:'flex',gap:'6px',flexShrink:0}}>
            {r.status==='pending' && <>
              <button onClick={()=>setReports(rs=>rs.map(x=>x.id===r.id?{...x,status:'reviewing'}:x))} className="btn-glass" style={{fontSize:'11px',padding:'7px 12px'}}>Revisar</button>
              <button onClick={()=>setReports(rs=>rs.map(x=>x.id===r.id?{...x,status:'resolved'}:x))} style={{fontSize:'11px',padding:'7px 12px',borderRadius:'8px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)',color:'var(--go)',cursor:'pointer',fontWeight:500}}>Resolver</button>
            </>}
            {r.status==='reviewing' && <>
              <button onClick={()=>setReports(rs=>rs.map(x=>x.id===r.id?{...x,status:'resolved'}:x))} style={{fontSize:'11px',padding:'7px 12px',borderRadius:'8px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)',color:'var(--go)',cursor:'pointer',fontWeight:500}}>Resolver</button>
              <button onClick={()=>setReports(rs=>rs.map(x=>x.id===r.id?{...x,status:'dismissed'}:x))} className="btn-glass" style={{fontSize:'11px',padding:'7px 12px'}}>Desestimar</button>
            </>}
          </div>
        </div>
      ))}
    </div>
  )
}

function StopsTab() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'20px'}}>
      <div className="glass" style={{padding:'20px'}}>
        <div style={{...S.label,marginBottom:'16px'}}>Top paradas por afluencia diaria</div>
        {TOP_STOPS.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:i<TOP_STOPS.length-1?'14px':'0'}}>
            <div className="font-display" style={{width:'28px',color:'var(--text-muted)',fontWeight:700,fontSize:'14px',flexShrink:0,textAlign:'right'}}>{i+1}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                <span style={{color:'var(--text-primary)',fontSize:'13px',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{s.name}</span>
                <span style={{color:'var(--platinum)',fontSize:'12px',fontFamily:'DM Mono',fontWeight:600,flexShrink:0,marginLeft:'8px'}}>{s.v}</span>
              </div>
              <div style={{height:'3px',background:'rgba(184,200,224,0.07)',borderRadius:'2px'}}>
                <div style={{height:'3px',borderRadius:'2px',background:'linear-gradient(90deg,#9AA4B8,#B8C8E0)',width:`${(s.v/TOP_STOPS[0].v)*100}%`,transition:'width 600ms var(--ease-out)'}} />
              </div>
              <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',marginTop:'3px'}}>espera promedio: {s.wait} min</div>
            </div>
          </div>
        ))}
      </div>
      <div className="glass" style={{padding:'20px'}}>
        <div style={{...S.label,marginBottom:'14px'}}>Subidas por hora — paradas top</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={HOURLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)" />
            <XAxis dataKey="h" tick={{fill:'#4A5568',fontSize:10}} interval={3} />
            <YAxis tick={{fill:'#4A5568',fontSize:10}} />
            <Tooltip {...TTP} />
            <Line type="monotone" dataKey="v" name="Subidas" stroke="#B8C8E0" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function DriversTab() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      {MOCK_DRIVERS.map((d,i)=>(
        <div key={i} className="glass" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'42px',height:'42px',borderRadius:'12px',background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Bus size={17} style={{color:'var(--platinum-dim)'}} />
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{color:'var(--text-primary)',fontWeight:600,fontSize:'14px'}}>{d.name}</span>
              <div style={{width:'7px',height:'7px',borderRadius:'50%',background:d.online?'var(--go)':'var(--text-muted)',flexShrink:0}} />
            </div>
            <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'2px'}}>Unidad {d.unit} · {d.trips} viajes hoy</div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent:'flex-end',marginBottom:'3px'}}>
              <Star size={12} style={{color:'var(--near)',fill:'var(--near)'}} />
              <span className="font-mono" style={{color:'var(--text-primary)',fontWeight:700,fontSize:'13px'}}>{d.rating}</span>
            </div>
            {d.reports>0 && (
              <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent:'flex-end'}}>
                <AlertTriangle size={10} style={{color:'#FF4D6A'}} />
                <span style={{color:'#FF4D6A',fontSize:'10px',fontFamily:'DM Mono'}}>{d.reports} denuncia{d.reports>1?'s':''}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}