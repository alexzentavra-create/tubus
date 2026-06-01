'use client'
import PhoneWrapper from '@/components/PhoneWrapper'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Bus, Users, Building2, Activity, TrendingUp, AlertTriangle,
  Clock, MapPin, BarChart2, Download, LogOut, RefreshCw,
  ChevronRight, Star, Wifi, Search, Bell, Mail, Calendar,
  Share2, Printer, Plus, Trash2, ChevronDown, CheckCircle2,
  Circle, Flag, Info
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
const HOURLY = Array.from({length:24},(_,h)=>{
  const v1 = Math.round(Math.random()*400+(h>=7&&h<=9||h>=17&&h<=19?700:80))
  const v2 = Math.round(v1 * (0.75 + Math.random()*0.3))
  return { h:`${String(h).padStart(2,'0')}:00`, v1, v2 }
})
const WEEKLY = Array.from({length:7},(_,i)=>({d:format(subDays(new Date(),6-i),'EEE',{locale:es}),users:Math.round(Math.random()*1500+2500),drivers:Math.round(Math.random()*20+40)}))
const LINES_DATA = [
  {id:'line-1',   name:'Línea 12',  users:1240, trips:89,  complaints:3},
  {id:'line-28',  name:'Línea 28',  users:1650, trips:112, complaints:1},
  {id:'line-3',   name:'Línea 37',  users:920,  trips:67,  complaints:1},
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
  'line-3': {
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

interface Todo {
  id: string
  text: string
  done: boolean
  date: string
  badge: string
  flagged: boolean
}

export default function SuperAdminDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalUsers: 0, totalDrivers: 0, totalCompanies: 0,
    activeBuses: 0, pendingReports: 0, todayLogins: 0,
  })

  // Todo List State
  const [todos, setTodos] = useState<Todo[]>([
    { id: 't1', text: 'Revisar denuncias en Línea 60', done: false, date: '28 de Mayo', badge: 'Urgente', flagged: true },
    { id: 't2', text: 'Aprobar nuevo chofer Néstor García', done: true, date: '27 de Mayo', badge: 'Resuelto', flagged: false },
    { id: 't3', text: 'Exportar reporte mensual de viajes', done: false, date: '30 de Mayo', badge: 'Esta semana', flagged: false },
    { id: 't4', text: 'Verificar coordenadas de parada en Callao', done: false, date: '02 de Junio', badge: 'Pendiente', flagged: true },
  ])
  const [newTodoText, setNewTodoText] = useState('')
  const [showAddTodo, setShowAddTodo] = useState(false)

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  const toggleFlag = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, flagged: !t.flagged } : t))
  }
  const deleteTodo = (id: string) => {
    setTodos(prev => prev.filter(t => t.id !== id))
  }
  const addTodo = () => {
    if (!newTodoText.trim()) return
    const item: Todo = {
      id: `t-${Date.now()}`,
      text: newTodoText,
      done: false,
      date: format(new Date(), 'dd de MMMM', { locale: es }),
      badge: 'Nuevo',
      flagged: false,
    }
    setTodos(prev => [...prev, item])
    setNewTodoText('')
    setShowAddTodo(false)
    toast.success('Tarea agregada')
  }

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

  const NAV_ITEMS = [
    { id: 'overview', label: 'Panel Control', icon: BarChart2, hasChevron: false },
    { id: 'reports', label: 'Denuncias', icon: AlertTriangle, hasChevron: false },
    { id: 'companies', label: 'Empresas', icon: Building2, hasChevron: true },
    { id: 'analytics', label: 'Estadísticas', icon: TrendingUp, hasChevron: true },
    { id: 'users', label: 'Usuarios', icon: Users, hasChevron: true },
    { id: 'drivers', label: 'Choferes', icon: Bus, hasChevron: true },
    { id: 'apps', label: 'Apps', icon: Star, hasChevron: true },
    { id: 'documentation', label: 'Cerrar Sesión', icon: LogOut, hasChevron: false },
  ]

  if (loading) return (
    <PhoneWrapper defaultMode="computer" title="Super Admin Dashboard">
      <div style={{minHeight:'100%',background:'#0b0f19',display:'flex',flexDirection:'column',width:'100%',height:'100%',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#8f94a5',fontFamily:'DM Mono',fontSize:'13px'}}>Cargando panel...</div>
    </div>
    </PhoneWrapper>
  )

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0b0f19',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'DM Sans, sans-serif',
    }}>
      {/* Horizontal Header */}
      <header style={{
        background: '#121527',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/images/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Bien<span style={{ color: '#8f94a5', fontWeight: 400 }}>Parada</span>
            </span>
            <span style={{
              fontSize: '9px',
              color: '#4b49ac',
              background: 'rgba(75, 73, 172, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              Admin
            </span>
          </div>
        </div>

        {/* Right Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Dropdown */}
          <select style={{
            background: '#1b1d2e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#a3a6b8',
            fontSize: '13px',
            outline: 'none',
            cursor: 'pointer',
          }}>
            <option>Seleccionar Categoría</option>
            <option>Líneas de Colectivo</option>
            <option>Choferes Activos</option>
            <option>Denuncias Pendientes</option>
          </select>

          {/* Date Picker */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#1b1d2e',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '6px',
            padding: '6px 12px',
            color: '#fff',
            fontSize: '13px',
          }}>
            <Calendar size={14} style={{ color: '#a3a6b8' }} />
            <span style={{ fontSize: '12px', color: '#a3a6b8' }}>{format(new Date(), 'dd/MM/yyyy')}</span>
          </div>

          {/* Action Icons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', color: '#a3a6b8' }}>
            <Search size={16} style={{ cursor: 'pointer' }} />
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <Bell size={16} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '6px',
                height: '6px',
                background: '#ff4d6a',
                borderRadius: '50%',
              }} />
            </div>
            <Mail size={16} style={{ cursor: 'pointer' }} />
          </div>

          {/* User Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px' }}>
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
              alt="Admin Profile"
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '1.5px solid #4b49ac',
                objectFit: 'cover',
              }}
            />
          </div>
        </div>
      </header>

      {/* Main Horizontal Navigation */}
      <nav style={{
        background: '#121527',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '0 24px',
        display: 'flex',
        gap: '24px',
        overflowX: 'auto',
      }}>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id || (item.id === 'overview' && tab === 'overview')
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id !== 'apps' && item.id !== 'documentation') {
                  handleTabChange(item.id as Tab)
                } else if (item.id === 'documentation') {
                  logout()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 4px',
                color: active ? '#fff' : '#a3a6b8',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                background: 'none',
                border: 'none',
                borderBottom: `2.5px solid ${active ? '#4b49ac' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 200ms',
                whiteSpace: 'nowrap',
              }}
            >
              <item.icon size={14} style={{ color: active ? '#4b49ac' : '#a3a6b8' }} />
              <span>{item.label}</span>
              {item.hasChevron && <ChevronDown size={11} style={{ opacity: 0.5 }} />}
            </button>
          )
        })}
      </nav>

      {/* Secondary Sub-header and Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 24px 12px',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          {['Resumen', 'Audiencias', 'Demografía', 'Más'].map((sub, idx) => (
            <span
              key={sub}
              style={{
                fontSize: '14px',
                fontWeight: idx === 0 ? 600 : 500,
                color: idx === 0 ? '#fff' : '#8f94a5',
                borderBottom: idx === 0 ? '2px solid #ff8f5d' : 'none',
                paddingBottom: '4px',
                cursor: 'pointer',
              }}
            >
              {sub}
            </span>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '8px 16px',
            color: '#a3a6b8',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            <Share2 size={13} /> Compartir
          </button>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '6px',
            padding: '8px 16px',
            color: '#a3a6b8',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}>
            <Printer size={13} /> Imprimir
          </button>
          <button
            onClick={exportData}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#4b49ac',
              borderRadius: '6px',
              padding: '8px 16px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* KPI Row (6 elements) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '24px',
        padding: '12px 24px 24px',
      }}>
        {/* Bounce Rate */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Tasa de Rebote</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>32.53%</span>
          <span style={{ fontSize: '11px', color: '#ff4d6a', fontWeight: 600 }}>▼ -0.5%</span>
        </div>
        {/* Page Views (Usuarios App) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Usuarios App</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.totalUsers.toLocaleString()}</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +0.1%</span>
        </div>
        {/* Colectivos Activos (New Sessions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Colectivos Activos</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.activeBuses}</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +0.8%</span>
        </div>
        {/* Tiempo en App (Avg. Time on Site) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Tiempo en App</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>2m:35s</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +0.8%</span>
        </div>
        {/* Denuncias Pendientes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Denuncias Pendientes</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.pendingReports}</span>
          <span style={{ fontSize: '11px', color: '#ff4d6a', fontWeight: 600 }}>▼ -15.0%</span>
        </div>
        {/* Logins Hoy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Logins Hoy</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{stats.todayLogins}</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +2.4%</span>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '0 24px 24px' }}>
        {tab === 'overview' && (
          <OverviewTab
            stats={stats}
            selectedLineId={selectedLineId}
            setSelectedLineId={setSelectedLineId}
            todos={todos}
            toggleTodo={toggleTodo}
            toggleFlag={toggleFlag}
            deleteTodo={deleteTodo}
            addTodo={addTodo}
            newTodoText={newTodoText}
            setNewTodoText={setNewTodoText}
            showAddTodo={showAddTodo}
            setShowAddTodo={setShowAddTodo}
          />
        )}
        {tab === 'companies' && <CompaniesTab />}
        {tab === 'drivers' && <DriversTab />}
        {tab === 'users' && <UsersTab stats={stats} />}
        {tab === 'reports' && <ReportsTab />}
        {tab === 'analytics' && <AnalyticsTab />}
      </main>
    </div>
  )
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPI({icon:Icon,label,value,sub,color}:{icon:any;label:string;value:string|number;sub?:string;color:string}) {
  return (
    <div style={{
      background: '#121527',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}>
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '8px',
        background: `${color}15`,
        border: `1.5px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: color,
      }}>
        <Icon size={18} />
      </div>
      <div>
        <div style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: '22px', marginTop: '4px', fontFamily: 'DM Sans, sans-serif' }}>{value}</div>
        {sub && <div style={{ color: '#8f94a5', fontSize: '10px', marginTop: '2px' }}>{sub}</div>}
      </div>
    </div>
  )
}

function OverviewTab({
  stats,
  selectedLineId,
  setSelectedLineId,
  todos,
  toggleTodo,
  toggleFlag,
  deleteTodo,
  addTodo,
  newTodoText,
  setNewTodoText,
  showAddTodo,
  setShowAddTodo
}: {
  stats: any
  selectedLineId: string | null
  setSelectedLineId: (id: string | null) => void
  todos: Todo[]
  toggleTodo: (id: string) => void
  toggleFlag: (id: string) => void
  deleteTodo: (id: string) => void
  addTodo: () => void
  newTodoText: string
  setNewTodoText: (t: string) => void
  showAddTodo: boolean
  setShowAddTodo: (s: boolean) => void
}) {
  if (selectedLineId) {
    return <LineDetailView lineId={selectedLineId} onBack={() => setSelectedLineId(null)} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        {/* Left Column - 8/12 width */}
      <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Performance Line Chart Card */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Rendimiento de Usuarios</h3>
              <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Uso de la aplicación y flujo de viajes activos</p>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#a3a6b8' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff8f5d' }} />
                <span>Esta semana</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8f94a5' }} />
                <span>Semana anterior</span>
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={HOURLY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff8f5d" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ff8f5d" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="h" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} interval={3} />
              <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
              {/* Last week line (grey) */}
              <Area type="monotone" dataKey="v2" name="Semana anterior" stroke="#8f94a5" fill="none" strokeWidth={2} dot={false} />
              {/* This week area (orange) */}
              <Area type="monotone" dataKey="v1" name="Esta semana" stroke="#ff8f5d" fill="url(#colorOrange)" strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Market Overview / Busiest Lines Card */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Vista General</h3>
              <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Resumen general de líneas y afluencia de pasajeros</p>
            </div>
            <select style={{
              background: '#1b1d2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              padding: '4px 10px',
              color: '#8f94a5',
              fontSize: '12px',
              outline: 'none',
              cursor: 'pointer',
            }}>
              <option>Este mes</option>
              <option>Mes anterior</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '24px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>$36,2531.00</span>
            <span style={{ fontSize: '14px', color: '#8f94a5' }}>USD</span>
            <span style={{ fontSize: '12px', color: '#00c689', fontWeight: 600, marginLeft: '4px' }}>(+1.37%)</span>
          </div>

          {/* List of Bus Lines */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {LINES_DATA.map((l, i) => (
              <div
                key={i}
                onClick={() => setSelectedLineId(l.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  e.currentTarget.style.borderColor = 'rgba(75, 73, 172, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)'
                }}
              >
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: 'rgba(75, 73, 172, 0.15)',
                  border: '1px solid rgba(75, 73, 172, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#4b49ac',
                }}>
                  <Bus size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{l.name}</div>
                  <div style={{ color: '#8f94a5', fontSize: '12px', marginTop: '2px' }}>
                    {l.users.toLocaleString()} usuarios · {l.trips} viajes hoy
                  </div>
                </div>
                {l.complaints > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '12px',
                    background: 'rgba(255, 77, 106, 0.12)',
                    border: '1px solid rgba(255, 77, 106, 0.25)',
                    color: '#ff4d6a',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}>
                    <AlertTriangle size={11} />
                    <span>{l.complaints}</span>
                  </div>
                )}
                <ChevronRight size={16} style={{ color: '#8f94a5' }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column - 4/12 width */}
      <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Status Summary Card */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Resumen de Estado</h3>
          </div>

          {/* Mini sparkline segment */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontSize: '12px', color: '#8f94a5' }}>Casos Resueltos</span>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#00c689', marginTop: '4px' }}>357</div>
            </div>
            {/* Sparkline wave */}
            <div style={{ width: '100px', height: '40px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[
                  { v: 10 }, { v: 15 }, { v: 12 }, { v: 22 }, { v: 18 }, { v: 30 }, { v: 26 }, { v: 40 }
                ]}>
                  <Line type="monotone" dataKey="v" stroke="#00c689" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.06)', margin: 0 }} />

          {/* SVG progress rings row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Ring 1 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <svg width="56" height="56" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#4b49ac" strokeWidth="3"
                    strokeDasharray="26.8 73.2" strokeDashoffset="25" strokeLinecap="round" />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  26.8%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8f94a5' }}>Visitantes Totales</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>26.80%</div>
              </div>
            </div>

            {/* Ring 2 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
              <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                <svg width="56" height="56" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#00c689" strokeWidth="3"
                    strokeDasharray="75 25" strokeDashoffset="25" strokeLinecap="round" />
                </svg>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#fff',
                }}>
                  9K+
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: '#8f94a5' }}>Visitas por Día</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>9065</div>
              </div>
            </div>
          </div>
        </div>

        {/* Todo List Card */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Lista de Tareas</h3>
            <button
              onClick={() => setShowAddTodo(!showAddTodo)}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#4b49ac',
                border: 'none',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#3f3d8c'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#4b49ac'}
            >
              <Plus size={16} />
            </button>
          </div>

          {/* Add Todo inline input */}
          {showAddTodo && (
            <div style={{ display: 'flex', gap: '8px', background: '#1b1d2e', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <input
                type="text"
                placeholder="Nueva tarea..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
              <button
                onClick={addTodo}
                style={{
                  background: '#4b49ac',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Agregar
              </button>
            </div>
          )}

          {/* Todos container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {todos.map((todo) => (
              <div
                key={todo.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: todo.done ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  opacity: todo.done ? 0.6 : 1,
                  transition: 'all 200ms',
                }}
              >
                {/* Checkbox circle */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: todo.done ? '#00c689' : '#8f94a5',
                    cursor: 'pointer',
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {todo.done ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                </button>

                {/* Content text */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    color: '#fff',
                    fontSize: '13px',
                    textDecoration: todo.done ? 'line-through' : 'none',
                    fontWeight: todo.done ? 400 : 500,
                  }}>
                    {todo.text}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span style={{ fontSize: '10px', color: '#8f94a5' }}>{todo.date}</span>
                    {todo.badge && (
                      <span style={{
                        fontSize: '9px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: todo.badge === 'Urgente' ? 'rgba(255,77,106,0.15)' :
                                    todo.badge === 'Nuevo' ? 'rgba(75,73,172,0.15)' :
                                    todo.badge === 'Resuelto' ? 'rgba(0,198,137,0.15)' :
                                    'rgba(255,255,255,0.08)',
                        color: todo.badge === 'Urgente' ? '#ff4d6a' :
                               todo.badge === 'Nuevo' ? '#4b49ac' :
                               todo.badge === 'Resuelto' ? '#00c689' :
                               '#8f94a5',
                        fontWeight: 600,
                      }}>
                        {todo.badge}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8f94a5' }}>
                  <Flag
                    size={13}
                    onClick={() => toggleFlag(todo.id)}
                    style={{
                      cursor: 'pointer',
                      fill: todo.flagged ? '#ff8f5d' : 'none',
                      stroke: todo.flagged ? '#ff8f5d' : 'currentColor',
                    }}
                  />
                  <Trash2
                    size={13}
                    onClick={() => deleteTodo(todo.id)}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d6a'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#8f94a5'}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Back button & Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#121527',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '8px 16px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 200ms',
          }}
        >
          ← Volver al Resumen
        </button>
        <div style={{ textAlign: 'right' }}>
          <span style={{
            color: '#00c689',
            fontSize: '10px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px',
            background: 'rgba(0, 198, 137, 0.12)',
            border: '1px solid rgba(0, 198, 137, 0.25)',
          }}>
            MONITOREADA
          </span>
        </div>
      </div>

      {/* Line Title Header Card */}
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}>
        <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '24px', margin: 0, letterSpacing: '-0.02em' }}>{lineInfo.name}</h2>
        <p style={{ color: '#8f94a5', fontSize: '13px', margin: 0 }}>{details.companyName}</p>
      </div>

      {/* Line Specific KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <KPI icon={Bus} label="Choferes Activos" value={details.activeDrivers} color="#4b49ac" sub="en servicio hoy" />
        <KPI icon={Users} label="Pasajeros Hoy" value={details.totalPassengers.toLocaleString()} color="#3b82f6" sub="boletos emitidos" />
        <KPI icon={Star} label="Calificación Prom." value={details.avgRating} color="#ff8f5d" sub="promedio de usuarios" />
        <KPI icon={AlertTriangle} label="Denuncias Recibidas" value={details.complaintsList.length} color="#ff4d6a" sub="últimas 24 horas" />
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
        {/* Service drivers history (BarChart) */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
        }}>
          <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
            Choferes en servicio por día
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={details.dailyDriversHistory} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="day" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
              <Bar dataKey="count" name="Choferes" fill="#4b49ac" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Flow (AreaChart) */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
        }}>
          <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
            Flujo de Pasajeros por Hora
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={details.hourlyFlow} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="gLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
              <XAxis dataKey="h" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
              <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="passengers" name="Pasajeros" stroke="#3b82f6" fill="url(#gLine)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Lists Section: Drivers & Complaints */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
        {/* Drivers list */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Personal Activo / Reciente
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {details.driversList.map((d, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.online ? '#00c689' : '#8f94a5' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>{d.name}</div>
                  <div style={{ color: '#8f94a5', fontSize: '11px', marginTop: '2px' }}>
                    Interno {d.unit} · {d.email}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Star size={11} style={{ color: '#ff8f5d', fill: '#ff8f5d' }} />
                  <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{d.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Complaints list */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}>
          <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Denuncias de Usuarios
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {details.complaintsList.map((c, i) => (
              <div
                key={i}
                style={{
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255, 77, 106, 0.03)',
                  border: '1px solid rgba(255, 77, 106, 0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ color: '#ff4d6a', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    {c.type}
                  </span>
                  <span style={{ color: '#8f94a5', fontSize: '11px' }}>{c.time}</span>
                </div>
                <div style={{ color: '#e3e4e8', fontSize: '12px', lineHeight: 1.4 }}>{c.desc}</div>
                <div style={{ color: '#8f94a5', fontSize: '10px', marginTop: '2px' }}>
                  Acusado: {c.driver} (Interno {c.bus})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Busiest Stops */}
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
          Paradas con mayor afluencia
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {details.topStops.map((stop, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
              }}
            >
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '6px' }}>
                {stop.name}
              </div>
              <div style={{ color: '#00c689', fontWeight: 700, fontSize: '20px' }}>{stop.count}</div>
              <div style={{ color: '#8f94a5', fontSize: '11px', marginTop: '4px' }}>
                usuarios/día · {stop.wait} min esp.
              </div>
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
  useEffect(() => {
    supabase.from('bus_companies').select('*').then(({ data }) => { if (data) setCompanies(data) })
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {companies.length === 0 && (
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '40px',
          textAlign: 'center',
          color: '#8f94a5',
        }}>
          No hay empresas registradas aún
        </div>
      )}
      {companies.map(c => (
        <div
          key={c.id}
          style={{
            background: '#121527',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '16px 20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'rgba(75, 73, 172, 0.15)',
              border: '1.5px solid rgba(75, 73, 172, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b49ac',
              flexShrink: 0,
            }}>
              <Building2 size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px' }}>{c.company_name}</div>
              <div style={{ color: '#8f94a5', fontSize: '12px', marginTop: '2px' }}>
                @{c.username} · {c.is_active ? 'Activa' : 'Inactiva'}
              </div>
            </div>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: c.is_active ? '#00c689' : '#8f94a5',
            }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DriversTab() {
  const drivers = Object.entries(LINE_DETAILS).flatMap(([lineId, details]) => {
    const lineInfo = LINES_DATA.find(l => l.id === lineId) || { name: `Línea` }
    return details.driversList.map(d => ({
      name: d.name,
      email: d.email,
      unit: d.unit,
      line: lineInfo.name,
      online: d.online,
      rating: d.rating,
      reports: details.complaintsList.filter(c => c.driver === d.name).length,
      sessions: Math.floor(d.rating * 35 + (d.online ? 15 : 2)),
    }))
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {drivers.map((d, i) => (
        <div
          key={i}
          style={{
            background: '#121527',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#a3a6b8',
            flexShrink: 0,
          }}>
            <Bus size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{d.name}</span>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: d.online ? '#00c689' : '#8f94a5',
                flexShrink: 0,
              }} />
            </div>
            <div style={{ color: '#8f94a5', fontSize: '12px', marginTop: '3px' }}>
              {d.email} · Unidad {d.unit} · {d.line}
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <Star size={12} style={{ color: '#ff8f5d', fill: '#ff8f5d' }} />
              <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{d.rating}</span>
            </div>
            <div style={{ color: '#8f94a5', fontSize: '11px', marginTop: '3px' }}>{d.sessions} sesiones</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function UsersTab({ stats }: { stats: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
        <KPI icon={Users} label="Total usuarios" value={stats.totalUsers || '4,821'} color="#00c689" />
        <KPI icon={Activity} label="Activos hoy" value="1,240" color="#ff8f5d" />
        <KPI icon={Clock} label="Promedio sesión" value="18 min" color="#4b49ac" />
      </div>
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
          Nuevos usuarios por semana
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={WEEKLY} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="d" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
            <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
            <Line type="monotone" dataKey="users" name="Usuarios" stroke="#00c689" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function ReportsTab() {
  const [reports, setReports] = useState<any[]>(() => {
    return Object.entries(LINE_DETAILS).flatMap(([lineId, details]) => {
      const lineInfo = LINES_DATA.find(l => l.id === lineId) || { name: `Línea` }
      return details.complaintsList.map((c, idx) => ({
        id: `${lineId}-complaint-${idx}`,
        reporter: `Usuario ${Math.floor(Math.random() * 90 + 10)}`,
        type: c.type,
        driver: c.driver,
        bus: c.bus,
        line: lineInfo.name,
        status: c.status,
        time: c.time,
        desc: c.desc,
      }))
    })
  })

  const statusStyle: Record<string, any> = {
    pending: { background: 'rgba(240,180,41,0.12)', color: '#F0B429', border: '1px solid rgba(240,180,41,0.25)' },
    reviewing: { background: 'rgba(75,73,172,0.12)', color: '#4b49ac', border: '1px solid rgba(75,73,172,0.25)' },
    resolved: { background: 'rgba(0,198,137,0.12)', color: '#00c689', border: '1px solid rgba(0,198,137,0.25)' }
  }
  const sLabel: Record<string, string> = { pending: 'Pendiente', reviewing: 'Revisando', resolved: 'Resuelto' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {reports.map((r) => (
        <div
          key={r.id}
          style={{
            background: '#121527',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(255, 77, 106, 0.12)',
              border: '1px solid rgba(255, 77, 106, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ff4d6a',
              flexShrink: 0,
            }}>
              <AlertTriangle size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ color: '#fff', fontWeight: 600, fontSize: '14px' }}>{r.type}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 600,
                  ...statusStyle[r.status],
                }}>
                  {sLabel[r.status]}
                </span>
              </div>
              <div style={{ color: '#8f94a5', fontSize: '12px' }}>
                {r.reporter} · Chofer: {r.driver} · Interno: {r.bus} · {r.line} · {r.time}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {r.status === 'pending' && (
                <button
                  onClick={() => {
                    setReports(prev => prev.map(x => x.id === r.id ? { ...x, status: 'resolved' } : x))
                    toast.success('Denuncia resuelta')
                  }}
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    background: 'rgba(0, 198, 137, 0.1)',
                    border: '1px solid rgba(0, 198, 137, 0.2)',
                    color: '#00c689',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Resolver
                </button>
              )}
            </div>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.15)',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#d1d5db',
            lineHeight: 1.4,
            borderLeft: '3px solid #ff4d6a',
          }}>
            {r.desc}
          </div>
        </div>
      ))}
    </div>
  )
}

function AnalyticsTab() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
          Pasajeros por hora — promedio semanal
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={HOURLY} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4b49ac" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4b49ac" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="h" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} interval={3} />
            <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="v1" name="Pasajeros" stroke="#4b49ac" fill="url(#g2)" strokeWidth={2} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flexWrap: 'wrap' }}>
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
        }}>
          <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Hora pico promedio
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '36px', fontFamily: 'DM Sans, sans-serif' }}>08:00</div>
          <div style={{ color: '#8f94a5', fontSize: '13px', marginTop: '4px' }}>Mañana (7-9h) y tarde (17-19h)</div>
        </div>

        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
        }}>
          <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
            Línea más usada
          </div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '32px', fontFamily: 'DM Sans, sans-serif' }}>Línea 60</div>
          <div style={{ color: '#8f94a5', fontSize: '13px', marginTop: '4px' }}>2,100 usuarios activos</div>
        </div>
      </div>
    </div>
  )
}