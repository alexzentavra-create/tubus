'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bus, Users, Building2, Activity, TrendingUp, AlertTriangle,
  Clock, MapPin, BarChart2, Download, LogOut, RefreshCw,
  ChevronRight, Star, Wifi
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

// Mock data for charts
const HOURLY = Array.from({length:24},(_,h)=>({h:`${String(h).padStart(2,'0')}:00`,v:Math.round(Math.random()*400+(h>=7&&h<=9||h>=17&&h<=19?700:80))}))
const WEEKLY = Array.from({length:7},(_,i)=>({d:format(subDays(new Date(),6-i),'EEE',{locale:es}),users:Math.round(Math.random()*1500+2500),drivers:Math.round(Math.random()*20+40)}))
const LINES_DATA = [
  {id:'line-1',   name:'Línea 12',  users:1240, trips:89,  complaints:3},
  {id:'line-28',  name:'Línea 28',  users:1650, trips:112, complaints:1},
  {id:'line-37',  name:'Línea 37',  users:920,  trips:67,  complaints:1},
  {id:'line-60',  name:'Línea 60',  users:2100, trips:134, complaints:7},
  {id:'line-152', name:'Línea 152', users:1450, trips:98,  complaints:2},
]

const LINE_DETAILS: Record<string, {
  companyName: string
  activeDrivers: number
  totalPassengers: number
  avgRating: number
  dailyDriversHistory: { day: string; count: number }[]
  hourlyFlow: { h: string; passengers: number }[]
  driversList: { name: string; email: string; unit: string; rating: number; online: boolean }[]
  complaintsList: { type: string; driver: string; bus: string; status: 'pending'|'resolved'; time: string; desc: string }[]
  topStops: { name: string; count: number; wait: number }[]
}> = {
  'line-1': {
    companyName: 'Transportes Callao S.A.',
    activeDrivers: 5,
    totalPassengers: 1240,
    avgRating: 4.8,
    dailyDriversHistory: [
      { day: 'Lun', count: 6 },
      { day: 'Mar', count: 6 },
      { day: 'Mié', count: 5 },
      { day: 'Jue', count: 7 },
      { day: 'Vie', count: 8 },
      { day: 'Sáb', count: 4 },
      { day: 'Dom', count: 3 }
    ],
    hourlyFlow: Array.from({length:12}, (_, i) => {
      const h = 7 + i
      return {
        h: `${String(h).padStart(2, '0')}:00`,
        passengers: Math.round(50 + Math.sin((i / 11) * Math.PI) * 120 + Math.random() * 20)
      }
    }),
    driversList: [
      { name: 'Néstor García', email: 'nestor@nestor.ar', unit: '001', rating: 4.8, online: true },
      { name: 'Roberto Sánchez', email: 'roberto@demo.ar', unit: '003', rating: 4.9, online: true },
      { name: 'Carlos Martínez', email: 'carlos@demo.ar', unit: '002', rating: 4.6, online: false },
      { name: 'Juan Gómez', email: 'juan@demo.ar', unit: '005', rating: 4.5, online: true }
    ],
    complaintsList: [
      { type: 'No paró', driver: 'Carlos Martínez', bus: '002', status: 'pending', time: 'Hace 15 min', desc: 'El chofer no se detuvo a pesar de haber pasajeros esperando y hacer señas.' },
      { type: 'Mal trato', driver: 'Juan Gómez', bus: '005', status: 'resolved', time: 'Ayer', desc: 'Se negó a abrir la puerta trasera al solicitar la parada.' }
    ],
    topStops: [
      { name: 'Av. Pueyrredón y Corrientes', count: 380, wait: 6 },
      { name: 'Av. Corrientes y Callao', count: 290, wait: 5 },
      { name: 'Av. Santa Fe y Pueyrredón', count: 260, wait: 5 }
    ]
  },
  'line-28': {
    companyName: 'DOTA S.A.',
    activeDrivers: 4,
    totalPassengers: 1650,
    avgRating: 4.7,
    dailyDriversHistory: [
      { day: 'Lun', count: 5 },
      { day: 'Mar', count: 6 },
      { day: 'Mié', count: 6 },
      { day: 'Jue', count: 5 },
      { day: 'Vie', count: 6 },
      { day: 'Sáb', count: 3 },
      { day: 'Dom', count: 2 }
    ],
    hourlyFlow: Array.from({length:12}, (_, i) => {
      const h = 7 + i
      return {
        h: `${String(h).padStart(2, '0')}:00`,
        passengers: Math.round(40 + Math.sin((i / 11) * Math.PI) * 150 + Math.random() * 25)
      }
    }),
    driversList: [
      { name: 'Carlos M.', email: 'carlos@demo.ar', unit: '002', rating: 4.6, online: true },
      { name: 'Pablo García', email: 'pablo@demo.ar', unit: '006', rating: 4.9, online: false },
      { name: 'Jorge Rodríguez', email: 'jorge@demo.ar', unit: '004', rating: 4.7, online: true }
    ],
    complaintsList: [
      { type: 'Peligrosa', driver: 'Carlos M.', bus: '002', status: 'pending', time: 'Hace 1h', desc: 'Conducía a exceso de velocidad en zona residencial.' }
    ],
    topStops: [
      { name: 'Obelisco', count: 450, wait: 4 },
      { name: 'Santa Fe y Callao', count: 370, wait: 5 },
      { name: 'Palermo - Santa Fe', count: 310, wait: 5 }
    ]
  },
  'line-37': {
    companyName: '4 de Septiembre S.A.',
    activeDrivers: 3,
    totalPassengers: 920,
    avgRating: 4.5,
    dailyDriversHistory: [
      { day: 'Lun', count: 4 },
      { day: 'Mar', count: 4 },
      { day: 'Mié', count: 3 },
      { day: 'Jue', count: 4 },
      { day: 'Vie', count: 5 },
      { day: 'Sáb', count: 2 },
      { day: 'Dom', count: 1 }
    ],
    hourlyFlow: Array.from({length:12}, (_, i) => {
      const h = 7 + i
      return {
        h: `${String(h).padStart(2, '0')}:00`,
        passengers: Math.round(30 + Math.sin((i / 11) * Math.PI) * 90 + Math.random() * 15)
      }
    }),
    driversList: [
      { name: 'Roberto S.', email: 'roberto@demo.ar', unit: '003', rating: 4.9, online: true },
      { name: 'Ana Martínez', email: 'ana@demo.ar', unit: '008', rating: 4.5, online: false }
    ],
    complaintsList: [
      { type: 'Defecto', driver: 'Ana Martínez', bus: '008', status: 'resolved', time: 'Hace 3h', desc: 'El timbre de solicitud de parada no funcionaba.' }
    ],
    topStops: [
      { name: 'Aeroparque', count: 200, wait: 12 },
      { name: 'Callao y Corrientes', count: 280, wait: 5 },
      { name: 'Diagonal Norte', count: 340, wait: 4 }
    ]
  },
  'line-60': {
    companyName: 'MONSA S.A.',
    activeDrivers: 8,
    totalPassengers: 2100,
    avgRating: 4.6,
    dailyDriversHistory: [
      { day: 'Lun', count: 9 },
      { day: 'Mar', count: 9 },
      { day: 'Mié', count: 8 },
      { day: 'Jue', count: 10 },
      { day: 'Vie', count: 11 },
      { day: 'Sáb', count: 6 },
      { day: 'Dom', count: 4 }
    ],
    hourlyFlow: Array.from({length:12}, (_, i) => {
      const h = 7 + i
      return {
        h: `${String(h).padStart(2, '0')}:00`,
        passengers: Math.round(70 + Math.sin((i / 11) * Math.PI) * 220 + Math.random() * 30)
      }
    }),
    driversList: [
      { name: 'Carlos Martínez', email: 'carlos@demo.ar', unit: '020', rating: 4.6, online: true },
      { name: 'Diego Rodríguez', email: 'diego@demo.ar', unit: '022', rating: 4.2, online: false },
      { name: 'Pablo García', email: 'pablo@demo.ar', unit: '024', rating: 5.0, online: true },
      { name: 'Luis Fernández', email: 'luis@demo.ar', unit: '026', rating: 4.7, online: true }
    ],
    complaintsList: [
      { type: 'No paró', driver: 'Diego Rodríguez', bus: '022', status: 'pending', time: 'Hace 30 min', desc: 'No se detuvo en Plaza Italia.' },
      { type: 'Mal trato', driver: 'Luis Fernández', bus: '026', status: 'pending', time: 'Hace 2h', desc: 'Cerró la puerta antes de terminar de subir.' }
    ],
    topStops: [
      { name: 'Constitución', count: 520, wait: 5 },
      { name: 'Plaza Italia', count: 430, wait: 6 },
      { name: 'Tigre Terminal', count: 280, wait: 10 }
    ]
  },
  'line-152': {
    companyName: 'Empresa Tandilense S.A.',
    activeDrivers: 6,
    totalPassengers: 1450,
    avgRating: 4.7,
    dailyDriversHistory: [
      { day: 'Lun', count: 7 },
      { day: 'Mar', count: 7 },
      { day: 'Mié', count: 6 },
      { day: 'Jue', count: 8 },
      { day: 'Vie', count: 9 },
      { day: 'Sáb', count: 5 },
      { day: 'Dom', count: 3 }
    ],
    hourlyFlow: Array.from({length:12}, (_, i) => {
      const h = 7 + i
      return {
        h: `${String(h).padStart(2, '0')}:00`,
        passengers: Math.round(60 + Math.sin((i / 11) * Math.PI) * 160 + Math.random() * 20)
      }
    }),
    driversList: [
      { name: 'Roberto S.', email: 'roberto@demo.ar', unit: '010', rating: 4.9, online: true },
      { name: 'Jorge R.', email: 'jorge@demo.ar', unit: '012', rating: 4.7, online: false },
      { name: 'Ana C.', email: 'ana@demo.ar', unit: '014', rating: 4.8, online: true }
    ],
    complaintsList: [
      { type: 'Peligrosa', driver: 'Jorge R.', bus: '012', status: 'resolved', time: 'Ayer', desc: 'Realizó maniobras bruscas al cambiar de carril.' }
    ],
    topStops: [
      { name: 'La Boca', count: 250, wait: 8 },
      { name: 'Plaza de Mayo', count: 480, wait: 4 },
      { name: 'Olivos Terminal', count: 180, wait: 12 }
    ]
  }
}

const COMPLAINT_TYPES=[{n:'No paró',v:38,c:'#FF4D6A'},{n:'Mal trato',v:22,c:'#F0B429'},{n:'Peligrosa',v:18,c:'#8B5CF6'},{n:'Defecto',v:14,c:'#3B82F6'},{n:'Otro',v:8,c:'#22D3A0'}]

const TTP={contentStyle:{background:'rgba(10,14,20,0.97)',border:'1px solid rgba(184,200,224,0.12)',borderRadius:'10px',fontSize:'12px',fontFamily:'DM Mono'},labelStyle:{color:'#C2C8D4'},itemStyle:{color:'#8A95A8'}}

type Tab = 'overview'|'companies'|'drivers'|'users'|'reports'|'analytics'

export default function SuperAdminDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0, totalDrivers: 0, totalCompanies: 0,
    activeBuses: 0, pendingReports: 0, todayLogins: 0,
  })

  const handleTabChange = (t: Tab) => {
    setTab(t)
    setSelectedLineId(null)
  }

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    if (url.includes('placeholder.supabase.co')) {
      setStats({
        totalUsers: 4821,
        totalDrivers: 3,
        totalCompanies: 1,
        activeBuses: 23,
        pendingReports: 1,
        todayLogins: 142,
      })
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) { window.location.href='/login'; return }
      const {data:p} = await supabase.from('profiles').select('role').eq('id',user.id).single()
      if (p?.role !== 'superadmin') { window.location.href='/'; return }

      // Fetch real stats
      const [users, drivers, companies, reports] = await Promise.all([
        supabase.from('user_profiles').select('*',{count:'exact',head:true}),
        supabase.from('driver_profiles').select('*',{count:'exact',head:true}),
        supabase.from('bus_companies').select('*',{count:'exact',head:true}),
        supabase.from('reports').select('*',{count:'exact',head:true}).eq('status','pending'),
      ])
      setStats({
        totalUsers: users.count||0,
        totalDrivers: drivers.count||0,
        totalCompanies: companies.count||0,
        activeBuses: 23, // from live positions
        pendingReports: reports.count||0,
        todayLogins: 142,
      })
      setLoading(false)
    })
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const exportData = () => {
    const csv = ['Métrica,Valor',`Usuarios totales,${stats.totalUsers}`,`Choferes,${stats.totalDrivers}`,`Empresas,${stats.totalCompanies}`,`Colectivos activos,${stats.activeBuses}`,`Denuncias pendientes,${stats.pendingReports}`].join('\n')
    const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`bienparada_superadmin_${format(new Date(),'yyyy-MM-dd')}.csv`; a.click()
    toast.success('Datos exportados')
  }

  const TABS: {id:Tab;icon:any;label:string}[] = [
    {id:'overview',   icon:BarChart2,    label:'Resumen'},
    {id:'companies',  icon:Building2,    label:'Empresas'},
    {id:'drivers',    icon:Bus,          label:'Choferes'},
    {id:'users',      icon:Users,        label:'Usuarios'},
    {id:'reports',    icon:AlertTriangle,label:'Denuncias'},
    {id:'analytics',  icon:TrendingUp,   label:'Analíticas'},
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
            <div style={{width:'34px',height:'34px',borderRadius:'10px',background:'linear-gradient(145deg,rgba(34,211,160,0.2),rgba(34,211,160,0.05))',border:'1px solid rgba(34,211,160,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <Bus size={16} style={{color:'#22D3A0'}}/>
            </div>
            <div>
              <div style={{color:'#fff',fontWeight:700,fontSize:'14px',fontFamily:'DM Sans,sans-serif',letterSpacing:'-0.01em'}}>Bien Parada</div>
              <div style={{color:'rgba(34,211,160,0.7)',fontSize:'9px',fontFamily:'DM Mono',letterSpacing:'0.08em'}}>SUPER ADMIN</div>
            </div>
          </div>
        </div>

        <nav style={{flex:1,padding:'12px 8px',display:'flex',flexDirection:'column',gap:'2px'}}>
          {TABS.map(({id,icon:Icon,label})=>(
            <button key={id} onClick={()=>handleTabChange(id)} style={{display:'flex',alignItems:'center',gap:'9px',padding:'9px 10px',borderRadius:'9px',border:`1px solid ${tab===id?'rgba(184,200,224,0.15)':'transparent'}`,background:tab===id?'rgba(184,200,224,0.08)':'transparent',color:tab===id?'var(--platinum)':'var(--text-muted)',fontSize:'13px',fontWeight:500,cursor:'pointer',transition:'all 200ms',textAlign:'left'}}>
              <Icon size={14}/>{label}
            </button>
          ))}
        </nav>

        <div style={{padding:'12px 8px',borderTop:'1px solid rgba(184,200,224,0.07)',display:'flex',flexDirection:'column',gap:'6px'}}>
          <button onClick={exportData} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',borderRadius:'9px',border:'1px solid rgba(184,200,224,0.1)',background:'rgba(184,200,224,0.04)',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer',width:'100%'}}>
            <Download size={13}/> Exportar
          </button>
          <button onClick={logout} style={{display:'flex',alignItems:'center',gap:'8px',padding:'9px 10px',borderRadius:'9px',border:'1px solid rgba(255,77,106,0.15)',background:'rgba(255,77,106,0.05)',color:'#FF4D6A',fontSize:'12px',cursor:'pointer',width:'100%'}}>
            <LogOut size={13}/> Salir
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="scroll-panel" style={{flex:1,overflow:'auto'}}>
        {/* Topbar */}
        <div style={{borderBottom:'1px solid rgba(184,200,224,0.06)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(6,8,16,0.5)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:10}}>
          <div>
            <h1 style={{color:'#fff',fontWeight:700,fontSize:'18px',fontFamily:'DM Sans,sans-serif',letterSpacing:'-0.01em',margin:0}}>{TABS.find(t=>t.id===tab)?.label}</h1>
            <p style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',margin:'2px 0 0'}}>
              {format(new Date(),"EEEE d 'de' MMMM yyyy",{locale:es})}
            </p>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'6px',padding:'5px 10px',borderRadius:'999px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)'}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22D3A0',animation:'pulseNeon 2s ease-in-out infinite'}}/>
              <span style={{color:'#22D3A0',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600}}>EN VIVO</span>
            </div>
            <button onClick={()=>window.location.reload()} style={{width:'30px',height:'30px',borderRadius:'8px',background:'rgba(184,200,224,0.05)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer'}}>
              <RefreshCw size={12} style={{color:'var(--text-muted)'}}/>
            </button>
          </div>
        </div>

        <div style={{padding:'20px 24px'}}>
          {tab==='overview' && <OverviewTab stats={stats} selectedLineId={selectedLineId} setSelectedLineId={setSelectedLineId}/>}
          {tab==='companies' && <CompaniesTab/>}
          {tab==='drivers'   && <DriversTab/>}
          {tab==='users'     && <UsersTab stats={stats}/>}
          {tab==='reports'   && <ReportsTab/>}
          {tab==='analytics' && <AnalyticsTab/>}
        </div>
      </main>
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPI({icon:Icon,label,value,sub,color}:{icon:any;label:string;value:string|number;sub?:string;color:string}) {
  return (
    <div className="kpi-card">
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(184,200,224,0.05)',border:'1px solid rgba(184,200,224,0.1)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <Icon size={16} style={{color}}/>
        </div>
        <div>
          <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'5px'}}>{label}</div>
          <div style={{color:'#fff',fontWeight:700,fontSize:'26px',lineHeight:1.1,fontFamily:'DM Sans,sans-serif',letterSpacing:'-0.03em'}}>{value}</div>
          {sub && <div style={{color:'var(--text-muted)',fontSize:'10px',marginTop:'3px'}}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

function OverviewTab({stats, selectedLineId, setSelectedLineId}:{stats:any; selectedLineId: string | null; setSelectedLineId: (id: string | null) => void}) {
  if (selectedLineId) {
    return <LineDetailView lineId={selectedLineId} onBack={() => setSelectedLineId(null)} />
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
        <KPI icon={Users}        label="Usuarios app"       value={stats.totalUsers.toLocaleString()}    color="#22D3A0"/>
        <KPI icon={Bus}          label="Choferes"           value={stats.totalDrivers}                   color="var(--platinum)"/>
        <KPI icon={Building2}    label="Empresas"           value={stats.totalCompanies}                 color="#3B82F6"/>
        <KPI icon={Activity}     label="Colectivos activos" value={stats.activeBuses}                    color="#22D3A0" sub="en este momento"/>
        <KPI icon={AlertTriangle} label="Denuncias pend."   value={stats.pendingReports}                 color="#FF4D6A"/>
        <KPI icon={Clock}        label="Logins hoy"         value={stats.todayLogins}                    color="var(--near)"/>
      </div>

      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Actividad de usuarios — últimas 24h</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={HOURLY}>
            <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22D3A0" stopOpacity={0.2}/><stop offset="95%" stopColor="#22D3A0" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
            <XAxis dataKey="h" tick={{fill:'#4A5568',fontSize:10}} interval={3}/>
            <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
            <Tooltip {...TTP}/>
            <Area type="monotone" dataKey="v" name="Usuarios" stroke="#22D3A0" fill="url(#g1)" strokeWidth={1.5}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <div className="glass" style={{padding:'18px'}}>
          <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Uso semanal</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={WEEKLY}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
              <XAxis dataKey="d" tick={{fill:'#4A5568',fontSize:10}}/>
              <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
              <Tooltip {...TTP}/>
              <Bar dataKey="users" name="Usuarios" fill="rgba(34,211,160,0.35)" stroke="#22D3A0" strokeWidth={0.5} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="glass" style={{padding:'18px'}}>
          <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Tipos de denuncias</div>
          <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
            <PieChart width={110} height={110}>
              <Pie data={COMPLAINT_TYPES} cx={50} cy={50} innerRadius={28} outerRadius={48} dataKey="v" strokeWidth={0}>
                {COMPLAINT_TYPES.map((e,i)=><Cell key={i} fill={e.c} fillOpacity={0.85}/>)}
              </Pie>
            </PieChart>
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:'5px'}}>
              {COMPLAINT_TYPES.map(rt=>(
                <div key={rt.n} style={{display:'flex',alignItems:'center',gap:'7px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:rt.c,flexShrink:0}}/>
                  <span style={{color:'var(--text-muted)',fontSize:'11px',flex:1}}>{rt.n}</span>
                  <span style={{color:'#fff',fontSize:'11px',fontFamily:'DM Mono',fontWeight:600}}>{rt.v}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Per-line table */}
      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'14px'}}>Actividad por línea (Hacé clic para ver detalles)</div>
        <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
          {LINES_DATA.map((l,i)=>(
            <div key={i} onClick={()=>setSelectedLineId(l.id)} style={{display:'flex',alignItems:'center',gap:'14px',padding:'10px 12px',borderRadius:'10px',background:'rgba(6,8,16,0.5)',border:'1px solid rgba(184,200,224,0.06)',cursor:'pointer',transition:'all var(--t-fast) var(--ease-out)'}} className="action-btn">
              <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <Bus size={14} style={{color:'#22D3A0'}}/>
              </div>
              <div style={{flex:1}}>
                <div style={{color:'#fff',fontWeight:600,fontSize:'13px'}}>{l.name}</div>
                <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'1px'}}>{l.users.toLocaleString()} usuarios · {l.trips} viajes hoy</div>
              </div>
              {l.complaints>0&&<div style={{display:'flex',alignItems:'center',gap:'4px',padding:'3px 8px',borderRadius:'999px',background:'rgba(255,77,106,0.08)',border:'1px solid rgba(255,77,106,0.2)'}}>
                <AlertTriangle size={11} style={{color:'#FF4D6A'}}/><span style={{color:'#FF4D6A',fontSize:'10px',fontFamily:'DM Mono'}}>{l.complaints}</span>
              </div>}
              <ChevronRight size={14} style={{color:'var(--text-muted)',flexShrink:0}}/>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

interface LineDetailViewProps {
  lineId: string
  onBack: () => void
}

function LineDetailView({ lineId, onBack }: LineDetailViewProps) {
  const details = LINE_DETAILS[lineId] || LINE_DETAILS['line-1']
  const lineInfo = LINES_DATA.find(l => l.id === lineId) || { name: 'Línea Desconocida' }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
      {/* Back button & Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <button onClick={onBack} style={{display:'flex',alignItems:'center',gap:'6px',background:'rgba(184,200,224,0.06)',border:'1px solid rgba(184,200,224,0.1)',padding:'8px 14px',borderRadius:'8px',color:'var(--platinum)',fontSize:'12px',cursor:'pointer',transition:'all 200ms',fontWeight:500}}>
          ← Volver al Resumen
        </button>
        <div style={{textAlign:'right'}}>
          <span style={{color:'var(--go)',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600,padding:'3px 8px',borderRadius:'999px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)'}}>MONITOREADA</span>
        </div>
      </div>

      <div className="glass" style={{padding:'20px',display:'flex',flexDirection:'column',gap:'4px'}}>
        <h2 style={{color:'#fff',fontWeight:700,fontSize:'22px',fontFamily:'DM Sans,sans-serif',margin:0,letterSpacing:'-0.02em'}}>{lineInfo.name}</h2>
        <p style={{color:'var(--text-secondary)',fontSize:'12px',fontFamily:'DM Mono',margin:0}}>{details.companyName}</p>
      </div>

      {/* Line Specific KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
        <KPI icon={Bus} label="Choferes Activos" value={details.activeDrivers} color="var(--platinum)" sub="en servicio hoy"/>
        <KPI icon={Users} label="Pasajeros Hoy" value={details.totalPassengers.toLocaleString()} color="#3B82F6" sub="boletos emitidos"/>
        <KPI icon={Star} label="Calificación Prom." value={details.avgRating} color="var(--near)" sub="promedio de usuarios"/>
        <KPI icon={AlertTriangle} label="Denuncias Recibidas" value={details.complaintsList.length} color="#FF4D6A" sub="últimas 24 horas"/>
      </div>

      {/* Charts Section */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <div className="glass" style={{padding:'18px'}}>
          <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Choferes en servicio por día</div>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={details.dailyDriversHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
              <XAxis dataKey="day" tick={{fill:'#4A5568',fontSize:10}}/>
              <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
              <Tooltip {...TTP}/>
              <Bar dataKey="count" name="Choferes" fill="rgba(34,211,160,0.35)" stroke="#22D3A0" strokeWidth={0.5} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass" style={{padding:'18px'}}>
          <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Flujo de Pasajeros por Hora</div>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={details.hourlyFlow}>
              <defs><linearGradient id="gLine" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
              <XAxis dataKey="h" tick={{fill:'#4A5568',fontSize:10}}/>
              <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
              <Tooltip {...TTP}/>
              <Area type="monotone" dataKey="passengers" name="Pasajeros" stroke="#3B82F6" fill="url(#gLine)" strokeWidth={1.5}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lists Section: Drivers & Complaints */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        {/* Drivers list */}
        <div className="glass" style={{padding:'18px',display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase'}}>Personal Activo / Reciente</div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {details.driversList.map((d,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 10px',borderRadius:'8px',background:'rgba(6,8,16,0.4)',border:'1px solid rgba(184,200,224,0.04)'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:d.online?'#22D3A0':'#4A5568'}}/>
                <div style={{flex:1}}>
                  <div style={{color:'#fff',fontWeight:600,fontSize:'12px'}}>{d.name}</div>
                  <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono'}}>Int. {d.unit} · {d.email}</div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:'2px'}}>
                  <Star size={10} style={{color:'var(--near)',fill:'var(--near)'}}/>
                  <span style={{color:'#fff',fontSize:'11px',fontWeight:700,fontFamily:'DM Mono'}}>{d.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complaints list */}
        <div className="glass" style={{padding:'18px',display:'flex',flexDirection:'column',gap:'12px'}}>
          <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase'}}>Denuncias de Usuarios</div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {details.complaintsList.map((c,i)=>(
              <div key={i} style={{padding:'10px',borderRadius:'8px',background:'rgba(255,77,106,0.03)',border:'1px solid rgba(255,77,106,0.1)',display:'flex',flexDirection:'column',gap:'4px'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',width:'100%'}}>
                  <span style={{color:'#FF4D6A',fontWeight:700,fontSize:'11px',fontFamily:'DM Mono',letterSpacing:'0.02em'}}>{c.type.toUpperCase()}</span>
                  <span style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',marginLeft:'auto'}}>{c.time}</span>
                </div>
                <div style={{color:'var(--text-secondary)',fontSize:'11px',lineHeight:1.4}}>{c.desc}</div>
                <div style={{color:'var(--text-muted)',fontSize:'9px',fontFamily:'DM Mono',marginTop:'2px'}}>Acusado: {c.driver} (Interno {c.bus})</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Busiest Stops */}
      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-secondary)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Paradas con mayor afluencia</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
          {details.topStops.map((stop,i)=>(
            <div key={i} style={{background:'rgba(6,8,16,0.5)',border:'1px solid rgba(184,200,224,0.04)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{color:'#fff',fontWeight:600,fontSize:'13px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:'4px'}}>{stop.name}</div>
              <div style={{color:'var(--go)',fontWeight:700,fontSize:'18px',fontFamily:'DM Sans,sans-serif'}}>{stop.count}</div>
              <div style={{color:'var(--text-muted)',fontSize:'9px',fontFamily:'DM Mono',marginTop:'2px'}}>usuarios/día · {stop.wait} min esp.</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CompaniesTab() {
  const supabase = createClient()
  const [companies, setCompanies] = useState<any[]>([])
  useEffect(()=>{ supabase.from('bus_companies').select('*').then(({data})=>{ if(data) setCompanies(data) }) },[])
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
      {companies.length===0&&<div style={{color:'var(--text-muted)',textAlign:'center',padding:'40px',fontFamily:'DM Mono',fontSize:'13px'}}>No hay empresas registradas aún</div>}
      {companies.map(c=>(
        <div key={c.id} className="glass" style={{padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'rgba(59,130,246,0.1)',border:'1px solid rgba(59,130,246,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Building2 size={20} style={{color:'#3B82F6'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>{c.company_name}</div>
              <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'2px'}}>@{c.username} · {c.is_active?'Activa':'Inactiva'}</div>
            </div>
            <div style={{width:'8px',height:'8px',borderRadius:'50%',background:c.is_active?'#22D3A0':'#4A5568'}}/>
          </div>
        </div>
      ))}
    </div>
  )
}

function DriversTab() {
  const [drivers] = useState([
    {name:'Néstor García',email:'nestor@nestor.ar',unit:'0421',line:'Línea 12',online:true,rating:4.8,reports:0,sessions:127},
    {name:'Carlos M.',email:'carlos@demo.ar',unit:'0387',line:'Línea 60',online:false,rating:4.6,reports:1,sessions:89},
    {name:'Roberto S.',email:'roberto@demo.ar',unit:'0512',line:'Línea 12',online:true,rating:4.9,reports:0,sessions:203},
  ])
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      {drivers.map((d,i)=>(
        <div key={i} className="glass" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'11px',background:'linear-gradient(145deg,#1E2638,#131921)',border:'1px solid rgba(184,200,224,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Bus size={17} style={{color:'var(--platinum-dim)'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:'14px'}}>{d.name}</span>
              <div style={{width:'7px',height:'7px',borderRadius:'50%',background:d.online?'#22D3A0':'var(--text-muted)',flexShrink:0}}/>
            </div>
            <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.email} · Unidad {d.unit} · {d.line}</div>
          </div>
          <div style={{textAlign:'right',flexShrink:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent:'flex-end'}}>
              <Star size={12} style={{color:'var(--near)',fill:'var(--near)'}}/><span style={{color:'#fff',fontFamily:'DM Mono',fontWeight:700,fontSize:'13px'}}>{d.rating}</span>
            </div>
            <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.sessions} sesiones</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function UsersTab({stats}:{stats:any}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
        <KPI icon={Users}    label="Total usuarios"    value={stats.totalUsers||'4,821'} color="#22D3A0"/>
        <KPI icon={Activity} label="Activos hoy"       value="1,240"                     color="var(--platinum)"/>
        <KPI icon={Clock}    label="Promedio sesión"   value="18 min"                    color="#3B82F6"/>
      </div>
      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Nuevos usuarios por semana</div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={WEEKLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
            <XAxis dataKey="d" tick={{fill:'#4A5568',fontSize:10}}/>
            <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
            <Tooltip {...TTP}/>
            <Line type="monotone" dataKey="users" name="Usuarios" stroke="#22D3A0" dot={false} strokeWidth={2}/>
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ReportsTab() {
  const [reports] = useState([
    {reporter:'Juan P.',type:'No paró',driver:'Néstor García',bus:'0421',line:'Línea 12',status:'pending',time:'Hace 15 min'},
    {reporter:'María G.',type:'Mal trato',driver:'Carlos M.',bus:'0387',line:'Línea 60',status:'reviewing',time:'Hace 1h'},
    {reporter:'Lucas F.',type:'Cond. peligrosa',driver:'Roberto S.',bus:'0512',line:'Línea 12',status:'resolved',time:'Hace 3h'},
  ])
  const statusStyle:Record<string,any>={pending:{background:'rgba(240,180,41,0.08)',color:'#F0B429',border:'1px solid rgba(240,180,41,0.2)'},reviewing:{background:'rgba(59,130,246,0.08)',color:'#3B82F6',border:'1px solid rgba(59,130,246,0.2)'},resolved:{background:'rgba(34,211,160,0.08)',color:'#22D3A0',border:'1px solid rgba(34,211,160,0.2)'}}
  const sLabel:Record<string,string>={pending:'Pendiente',reviewing:'Revisando',resolved:'Resuelto'}
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
      {reports.map((r,i)=>(
        <div key={i} className="glass" style={{padding:'14px 16px',display:'flex',alignItems:'center',gap:'14px'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(255,77,106,0.07)',border:'1px solid rgba(255,77,106,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <AlertTriangle size={15} style={{color:'#FF4D6A'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
              <span style={{color:'#fff',fontWeight:600,fontSize:'13px'}}>{r.type}</span>
              <span style={{padding:'2px 7px',borderRadius:'999px',fontSize:'10px',fontFamily:'DM Mono',...statusStyle[r.status]}}>{sLabel[r.status]}</span>
            </div>
            <div style={{color:'var(--text-muted)',fontSize:'11px',fontFamily:'DM Mono'}}>{r.reporter} · {r.driver} · Unidad {r.bus} · {r.line} · {r.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyticsTab() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'18px'}}>
      <div className="glass" style={{padding:'18px'}}>
        <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'12px'}}>Pasajeros por hora — promedio semanal</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={HOURLY}>
            <defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#B8C8E0" stopOpacity={0.2}/><stop offset="95%" stopColor="#B8C8E0" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(184,200,224,0.04)"/>
            <XAxis dataKey="h" tick={{fill:'#4A5568',fontSize:10}} interval={3}/>
            <YAxis tick={{fill:'#4A5568',fontSize:10}}/>
            <Tooltip {...TTP}/>
            <Area type="monotone" dataKey="v" name="Pasajeros" stroke="#B8C8E0" fill="url(#g2)" strokeWidth={1.5}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px'}}>
        <div className="glass" style={{padding:'18px'}}>
          <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'10px'}}>Hora pico promedio</div>
          <div style={{color:'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:'34px',letterSpacing:'-0.03em'}}>08:00</div>
          <div style={{color:'var(--text-muted)',fontSize:'12px',marginTop:'4px'}}>Mañana (7-9h) y tarde (17-19h)</div>
        </div>
        <div className="glass" style={{padding:'18px'}}>
          <div style={{color:'var(--text-muted)',fontSize:'10px',fontFamily:'DM Mono',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:'10px'}}>Línea más usada</div>
          <div style={{color:'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:'28px',letterSpacing:'-0.02em'}}>Línea 60</div>
          <div style={{color:'var(--text-muted)',fontSize:'12px',marginTop:'4px'}}>2,100 usuarios activos</div>
        </div>
      </div>
    </div>
  )
}