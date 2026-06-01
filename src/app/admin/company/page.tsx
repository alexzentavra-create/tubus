'use client'
import PhoneWrapper from '@/components/PhoneWrapper'

import { useState, useEffect } from 'react'
import {
  Bus, Users, QrCode, MapPin, AlertTriangle, Activity,
  Download, LogOut, RefreshCw, Plus, Calendar, Clock,
  ChevronRight, Star, Wifi, WifiOff, CheckCircle, XCircle,
  TrendingUp, BarChart2, Share2, Printer, Trash2, ChevronDown, CheckCircle2,
  Circle, Flag, Info
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

interface Todo {
  id: string
  text: string
  done: boolean
  date: string
  badge: string
  flagged: boolean
}

// Simple QR SVG generator
function QRDisplay({ token, busUnit }: { token: string; busUnit: string }) {
  const size = 120
  const cells = 21
  const cellSize = size / cells

  const hash = token.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const grid: boolean[][] = Array.from({length: cells}, (_, r) =>
    Array.from({length: cells}, (_, c) => {
      if ((r < 7 && c < 7) || (r < 7 && c >= cells-7) || (r >= cells-7 && c < 7)) return true
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
        <div style={{color:'#fff',fontWeight:700,fontSize:'14px',fontFamily:'DM Sans,sans-serif'}}>Unidad {busUnit}</div>
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

  // Checklist State
  const [todos, setTodos] = useState<Todo[]>([
    { id: 't1', text: 'Revisar reclamo sobre coche 001', done: false, date: '28 de Mayo', badge: 'Urgente', flagged: true },
    { id: 't2', text: 'Imprimir y colocar código QR en unidad 005', done: false, date: '29 de Mayo', badge: 'Pendiente', flagged: false },
    { id: 't3', text: 'Verificar habilitación de chofer Juan Gómez', done: false, date: '30 de Mayo', badge: 'Esta semana', flagged: true },
    { id: 't4', text: 'Limpieza y desinfección unidad 003', done: true, date: '27 de Mayo', badge: 'Resuelto', flagged: false },
  ])
  const [newTodoText, setNewTodoText] = useState('')
  const [showAddTodo, setShowAddTodo] = useState(false)

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    if (url.includes('placeholder.supabase.co')) {
      setCompany({
        id: 'mock-company-id',
        company_name: 'Línea 12 (Transporte Larrazábal)',
        username: 'linea12',
        is_active: true
      })
      setQrCodes([
        { id: 'mock-qr-1', qr_token: 'DEMO-QR-L12-001', bus_unit: '001', is_active: true, company_id: 'mock-company-id', line_id: 'line-1' },
        { id: 'mock-qr-2', qr_token: 'DEMO-QR-BUS-0387-LINEA12', bus_unit: '0387', is_active: false, company_id: 'mock-company-id', line_id: 'line-1' }
      ])
      setActiveSessions([
        {
          id: 'mock-session-1',
          bus_unit: '001',
          started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          total_passengers: 12,
          profiles: { name: 'Néstor García' }
        },
        {
          id: 'mock-session-2',
          bus_unit: '003',
          started_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          total_passengers: 35,
          profiles: { name: 'Roberto Sánchez' }
        }
      ])
      setLoading(false)
      return
    }

    supabase.auth.getUser().then(async ({data:{user}}) => {
      if (!user) { window.location.href='/login'; return }
      const {data:p} = await supabase.from('profiles').select('role').eq('id',user.id).single()
      if (p?.role !== 'company') { window.location.href='/'; return }

      const {data:comp} = await supabase.from('bus_companies').select('*').eq('profile_id',user.id).single()
      if (comp) {
        setCompany(comp)
        const {data:qrs} = await supabase.from('bus_qr_codes').select('*').eq('company_id',comp.id)
        if (qrs) setQrCodes(qrs)
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

  const exportData = () => {
    const csv = ['Métrica,Valor',`Colectivos activos,${activeSessions.length}`,`Pasajeros transportados,1240`,`Calificación promedio,4.7`,`Denuncias pendientes,${todos.filter(t => !t.done && t.badge === 'Urgente').length}`].join('\n')
    const a = document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download=`bienparada_linea12_${format(new Date(),'yyyy-MM-dd')}.csv`; a.click()
    toast.success('Datos exportados')
  }

  const NAV_ITEMS = [
    { id: 'overview', label: 'Resumen', icon: BarChart2, hasChevron: false },
    { id: 'buses', label: 'Colectivos', icon: Bus, hasChevron: true },
    { id: 'drivers', label: 'Choferes', icon: Users, hasChevron: true },
    { id: 'qrcodes', label: 'Códigos QR', icon: QrCode, hasChevron: true },
    { id: 'stops', label: 'Paradas', icon: MapPin, hasChevron: true },
    { id: 'reports', label: 'Denuncias', icon: AlertTriangle, hasChevron: false },
    { id: 'calendar', label: 'Historial', icon: Calendar, hasChevron: false },
    { id: 'logout', label: 'Cerrar Sesión', icon: LogOut, hasChevron: false },
  ]

  if (loading) return (
    <PhoneWrapper defaultMode="computer" title="Panel de Compañía">
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
              color: '#fff',
              background: '#EF4444',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              Línea 12
            </span>
          </div>
        </div>

        {/* Right Options */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            <option>Colectivos en Servicio</option>
            <option>Denuncias Recientes</option>
            <option>Alertas de Paradas</option>
          </select>

          {/* Date display */}
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
            <Activity size={16} style={{ cursor: 'pointer' }} />
            <div style={{ position: 'relative', cursor: 'pointer' }}>
              <AlertTriangle size={16} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '6px',
                height: '6px',
                background: '#EF4444',
                borderRadius: '50%',
              }} />
            </div>
            <Users size={16} style={{ cursor: 'pointer' }} />
          </div>

          {/* Company Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '12px' }}>Transportes Callao</div>
              <div style={{ color: '#8f94a5', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Panel Empresa</div>
            </div>
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
          const active = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id !== 'logout') {
                  setTab(item.id as Tab)
                } else {
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
                borderBottom: `2.5px solid ${active ? '#EF4444' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 200ms',
                whiteSpace: 'nowrap',
              }}
            >
              <item.icon size={14} style={{ color: active ? '#EF4444' : '#a3a6b8' }} />
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
          {['Resumen', 'Flota', 'Historial', 'Más'].map((sub, idx) => (
            <span
              key={sub}
              style={{
                fontSize: '14px',
                fontWeight: idx === 0 ? 600 : 500,
                color: idx === 0 ? '#fff' : '#8f94a5',
                borderBottom: idx === 0 ? '2px solid #EF4444' : 'none',
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
              background: '#EF4444',
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
        {/* Colectivos Activos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Colectivos Activos</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{activeSessions.length}</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +1 hoy</span>
        </div>
        {/* Pasajeros Hoy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Pasajeros Hoy</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>1.240</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +12%</span>
        </div>
        {/* Calificacion Promedio */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Calificación Prom.</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>4.7</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +0.2</span>
        </div>
        {/* Denuncias Pendientes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Denuncias Pend.</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{todos.filter(t => !t.done && t.badge === 'Urgente').length}</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▼ -15.0%</span>
        </div>
        {/* Pasajeros A Bordo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Pasajeros a Bordo</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>47</span>
          <span style={{ fontSize: '11px', color: '#8f94a5', fontWeight: 600 }}>Promedio por coche</span>
        </div>
        {/* En Hora */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Puntualidad</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>84%</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +2.4%</span>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '0 24px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
          {/* Left Column (col-span-8) */}
          <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {tab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Performance Chart Card */}
                <div style={{
                  background: '#121527',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '24px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Pasajeros por Hora</h3>
                      <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Pasajeros a bordo y subidas registradas hoy</p>
                    </div>
                    {/* Legend */}
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#a3a6b8' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
                        <span>Pasajeros</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8f94a5' }} />
                        <span>Subidas</span>
                      </div>
                    </div>
                  </div>

                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={HOURLY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="h" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} interval={3} />
                      <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="subidas" name="Subidas" stroke="#8f94a5" fill="none" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="pasajeros" name="Pasajeros" stroke="#EF4444" fill="url(#colorRed)" strokeWidth={2.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Busiest Stops Card */}
                <div style={{
                  background: '#121527',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  padding: '24px',
                }}>
                  <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.05em' }}>
                    Paradas con mayor afluencia (Hoy)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {TOP_STOPS.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: '26px', color: '#8f94a5', fontWeight: 700, fontSize: '13px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.name}</span>
                            <span style={{ color: '#fff', fontSize: '12px', fontFamily: 'DM Mono', fontWeight: 600, flexShrink: 0, marginLeft: '8px' }}>{s.subidas} subidas</span>
                          </div>
                          <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '2px' }}>
                            <div style={{ height: '4px', borderRadius: '2px', background: '#EF4444', width: `${(s.subidas / TOP_STOPS[0].subidas) * 100}%` }} />
                          </div>
                          <div style={{ color: '#8f94a5', fontSize: '10px', marginTop: '3px' }}>espera promedio: {s.espera} min</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active fleet */}
                {activeSessions.length > 0 && (
                  <div style={{
                    background: '#121527',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '24px',
                  }}>
                    <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', marginBottom: '14px', letterSpacing: '0.05em' }}>Colectivos en servicio ahora</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {activeSessions.map((s:any, i:number)=>(
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22D3A0' }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: '#fff', fontWeight: 600, fontSize: '13px' }}>Unidad {s.bus_unit}</div>
                            <div style={{ color: '#8f94a5', fontSize: '11px' }}>{s.profiles?.name||'Chofer'} · desde {format(new Date(s.started_at), 'HH:mm')}</div>
                          </div>
                          <div style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>{s.total_passengers} pasajeros</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'buses' && <BusesTab activeSessions={activeSessions} />}
            {tab === 'drivers' && <CompanyDrivers />}
            {tab === 'qrcodes' && (
              <QRTab
                qrCodes={qrCodes}
                newBusUnit={newBusUnit}
                setNewBusUnit={setNewBusUnit}
                onGenerate={generateQR}
                onDownload={downloadQR}
              />
            )}
            {tab === 'stops' && <StopsTab />}
            {tab === 'reports' && <CompanyReports />}
            {tab === 'calendar' && <CalendarTab />}
          </div>

          {/* Right Column (col-span-4) */}
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

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#8f94a5' }}>Pasajeros Totales</span>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: '#EF4444', marginTop: '4px' }}>1.240</div>
                </div>
                {/* Sparkline wave */}
                <div style={{ width: '100px', height: '40px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { v: 10 }, { v: 18 }, { v: 12 }, { v: 28 }, { v: 22 }, { v: 36 }, { v: 29 }, { v: 45 }
                    ]}>
                      <Line type="monotone" dataKey="v" stroke="#EF4444" strokeWidth={2.5} dot={false} />
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
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#EF4444" strokeWidth="3"
                        strokeDasharray="48.2 51.8" strokeDashoffset="25" strokeLinecap="round" />
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
                      48%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#8f94a5' }}>Ocupación Prom.</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>48.2%</div>
                  </div>
                </div>

                {/* Ring 2 */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '56px', height: '56px' }}>
                    <svg width="56" height="56" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#00c689" strokeWidth="3"
                        strokeDasharray="84 16" strokeDashoffset="25" strokeLinecap="round" />
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
                      84%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#8f94a5' }}>Puntualidad</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>84.0%</div>
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
                    background: '#EF4444',
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#e53e3e'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#EF4444'}
                >
                  <Plus size={16} />
                </button>
              </div>

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
                      background: '#EF4444',
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
                                        todo.badge === 'Nuevo' ? 'rgba(239,68,68,0.15)' :
                                        todo.badge === 'Resuelto' ? 'rgba(0,198,137,0.15)' :
                                        'rgba(255,255,255,0.08)',
                            color: todo.badge === 'Urgente' ? '#ff4d6a' :
                                   todo.badge === 'Nuevo' ? '#EF4444' :
                                   todo.badge === 'Resuelto' ? '#00c689' :
                                   '#8f94a5',
                            fontWeight: 600,
                          }}>
                            {todo.badge}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8f94a5' }}>
                      <Flag
                        size={13}
                        onClick={() => toggleFlag(todo.id)}
                        style={{
                          cursor: 'pointer',
                          fill: todo.flagged ? '#EF4444' : 'none',
                          stroke: todo.flagged ? '#EF4444' : 'currentColor',
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
      </main>

      {/* QR Modal */}
      {showQRModal && selectedQR && (
        <div style={{position:'fixed',inset:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.75)',backdropFilter:'blur(8px)'}}>
          <div className="glass-dark" style={{padding:'32px',borderRadius:'20px',maxWidth:'280px',width:'100%',margin:'16px',textAlign:'center'}}>
            <h3 style={{color:'#fff',fontFamily:'DM Sans,sans-serif',fontWeight:700,fontSize:'18px',margin:'0 0 20px'}}>QR Generado</h3>
            <QRDisplay token={selectedQR.qr_token} busUnit={selectedQR.bus_unit}/>
            <div style={{display:'flex',gap:'10px',marginTop:'20px'}}>
              <button onClick={()=>downloadQR(selectedQR)} style={{flex:1,padding:'11px',borderRadius:'10px',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.25)',color:'#EF4444',fontSize:'13px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
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

function BusesTab({ activeSessions }: { activeSessions: any[] }) {
  const mockBuses = [
    {unit:'001',driver:'Néstor García',status:'active',passengers:12,speed:34,stops:8,started:'07:42'},
    {unit:'002',driver:'Carlos Martínez',status:'inactive',passengers:0,speed:0,stops:0,started:'—'},
    {unit:'003',driver:'Roberto Sánchez',status:'active',passengers:7,speed:28,stops:5,started:'08:15'},
    {unit:'005',driver:'Juan Gómez',status:'inactive',passengers:0,speed:0,stops:0,started:'—'},
  ]
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {mockBuses.map((b,i)=>(
        <div key={i} style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
        }}>
          <div style={{width:'42px',height:'42px',borderRadius:'12px',background:b.status==='active'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',border:`1px solid ${b.status==='active'?'rgba(34,211,160,0.25)':'rgba(184,200,224,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <Bus size={18} style={{color:b.status==='active'?'#22D3A0':'#8f94a5'}}/>
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
              <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>Unidad {b.unit}</span>
              <span style={{padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600,background:b.status==='active'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',color:b.status==='active'?'#22D3A0':'#8f94a5',border:`1px solid ${b.status==='active'?'rgba(34,211,160,0.2)':'rgba(184,200,224,0.1)'}`}}>
                {b.status==='active'?'EN SERVICIO':'INACTIVO'}
              </span>
            </div>
            <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono'}}>
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
    {name:'Juan Gómez',legajo:'LEG-0091',sessions:42,onTime:91,rating:4.5,reports:0,lastActive:'Hoy 08:30'},
  ]
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {drivers.map((d,i)=>(
        <div key={i} style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '16px 20px',
        }}>
          <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
            <div style={{width:'44px',height:'44px',borderRadius:'12px',background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Users size={18} style={{color:'#8f94a5'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>{d.name}</div>
              <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.legajo} · último: {d.lastActive}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent:'flex-end'}}>
                <Star size={12} style={{color:'#EF4444',fill:'#EF4444'}}/><span style={{color:'#fff',fontFamily:'DM Mono',fontWeight:700,fontSize:'13px'}}>{d.rating}</span>
              </div>
              {d.reports>0&&<div style={{color:'#FF4D6A',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.reports} denuncia</div>}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',marginTop:'12px'}}>
            {[{label:'Sesiones',value:d.sessions},{label:'A tiempo',value:`${d.onTime}%`},{label:'Denuncias',value:d.reports}].map(({label,value})=>(
              <div key={label} style={{background:'rgba(6,8,16,0.3)',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                <div style={{color:'#fff',fontWeight:700,fontSize:'16px'}}>{value}</div>
                <div style={{color:'#8f94a5',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px'}}>{label}</div>
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
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{color:'#8f94a5',fontSize:'12px',fontWeight:500,textTransform:'uppercase',marginBottom:'14px',letterSpacing:'0.05em'}}>Generar nuevo QR</div>
        <div style={{display:'flex',gap:'10px'}}>
          <input
            className="input-dark" placeholder="Número de unidad (ej: 005)"
            value={newBusUnit} onChange={e=>setNewBusUnit(e.target.value)}
            style={{flex:1}}
            onKeyDown={e=>e.key==='Enter'&&onGenerate()}
          />
          <button onClick={onGenerate} disabled={!newBusUnit.trim()} style={{padding:'13px 20px',borderRadius:'10px',background:'rgba(239, 68, 68, 0.15)',border:'1px solid rgba(239, 68, 68, 0.3)',color:'#EF4444',fontWeight:600,fontSize:'13px',cursor:newBusUnit.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',gap:'8px',flexShrink:0,transition:'all 200ms',opacity:newBusUnit.trim()?1:0.5}}>
            <Plus size={15}/> Generar QR
          </button>
        </div>
        <p style={{color:'#8f94a5',fontSize:'11px',marginTop:'10px',lineHeight:1.5}}>
          El QR generado debe ser impreso y colocado en el colectivo. Cuando el chofer lo escanea, el sistema lo asocia automáticamente con ese vehículo.
        </p>
      </div>

      {/* QR list */}
      {qrCodes.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px',color:'#8f94a5',fontFamily:'DM Mono',fontSize:'13px'}}>
          No hay códigos QR generados aún.<br/>Creá uno con el formulario de arriba.
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'16px'}}>
          {qrCodes.map((qr:any)=>(
            <div key={qr.id} style={{
              background: '#121527',
              borderRadius: '12px',
              border: `1px solid ${selected?.id===qr.id?'rgba(239, 68, 68, 0.3)':'rgba(255, 255, 255, 0.06)'}`,
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 200ms'
            }} onClick={()=>setSelected(selected?.id===qr.id?null:qr)}>
              <QRDisplay token={qr.qr_token} busUnit={qr.bus_unit}/>
              <div style={{marginTop:'14px',display:'flex',gap:'8px'}}>
                <button onClick={e=>{e.stopPropagation();onDownload(qr)}} style={{flex:1,padding:'8px',borderRadius:'8px',background:'rgba(239, 68, 68, 0.1)',border:'1px solid rgba(239, 68, 68, 0.2)',color:'#EF4444',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                  <Download size={12}/> Descargar
                </button>
              </div>
              <div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:qr.is_active?'#22D3A0':'#4A5568'}}/>
                <span style={{color:'#8f94a5',fontSize:'10px',fontFamily:'DM Mono'}}>{qr.is_active?'Activo':'Inactivo'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrCodes.length === 0 && (
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{color:'#8f94a5',fontSize:'12px',marginBottom:'16px'}}>QR de ejemplo (Unidad 001 — Línea 12)</div>
          <QRDisplay token="DEMO-QR-BUS-001-LINEA12" busUnit="001"/>
        </div>
      )}
    </div>
  )
}

function StopsTab() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{color:'#8f94a5',fontSize:'12px',fontWeight:500,textTransform:'uppercase',marginBottom:'16px',letterSpacing:'0.05em'}}>Paradas más activas hoy</div>
        {TOP_STOPS.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:i<TOP_STOPS.length-1?'14px':'0'}}>
            <div style={{width: '26px', color: '#8f94a5', fontWeight: 700, fontSize: '13px', textAlign: 'right', flexShrink: 0}}>{i+1}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                <span style={{color:'#fff',fontSize:'13px',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{s.name}</span>
                <span style={{color:'#fff',fontSize:'12px',fontFamily:'DM Mono',fontWeight:600,flexShrink:0,marginLeft:'8px'}}>{s.subidas}</span>
              </div>
              <div style={{height:'4px',background:'rgba(255, 255, 255, 0.04)',borderRadius:'2px'}}>
                <div style={{height:'4px',borderRadius:'2px',background:'#EF4444',width:`${(s.subidas/TOP_STOPS[0].subidas)*100}%`}}/>
              </div>
              <div style={{color:'#8f94a5',fontSize:'10px',fontFamily:'DM Mono',marginTop:'3px'}}>espera promedio: {s.espera} min</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{color:'#8f94a5',fontSize:'12px',fontWeight:500,textTransform:'uppercase',marginBottom:'12px',letterSpacing:'0.05em'}}>Subidas por hora</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={HOURLY}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false}/>
            <XAxis dataKey="h" tick={{fill:'#8f94a5',fontSize:10}} interval={3}/>
            <YAxis tick={{fill:'#8f94a5',fontSize:10}}/>
            <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }}/>
            <Bar dataKey="subidas" name="Subidas" fill="rgba(239, 68, 68, 0.15)" stroke="#EF4444" strokeWidth={1} radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CompanyReports() {
  const [reports, setReports] = useState([
    {id:'1',type:'No paró',driver:'Néstor García',bus:'001',stop:'Av. Rivadavia y Medrano',status:'pending',time:'Hace 20 min',desc:'El colectivo no paró en la parada habitual.'},
    {id:'2',type:'Mal trato',driver:'Carlos Martínez',bus:'002',stop:'Av. Corrientes y Callao',status:'resolved',time:'Hace 2h',desc:'El chofer fue descortés con los pasajeros.'},
  ])
  const statusStyle:Record<string,any>={pending:{bg:'rgba(240,180,41,0.08)',c:'#F0B429',b:'rgba(240,180,41,0.2)'},resolved:{bg:'rgba(34,211,160,0.08)',c:'#22D3A0',b:'rgba(34,211,160,0.2)'}}
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {reports.map(r=>(
        <div key={r.id} style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
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
              <div style={{color:'#8f94a5',fontSize:'12px',marginBottom:'6px'}}>{r.desc}</div>
              <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono'}}>{r.driver} · Unidad {r.bus} · {r.stop} · {r.time}</div>
            </div>
          </div>
          {r.status==='pending'&&(
            <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
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
    return { date:d, label:format(d,'d'), dayName:format(d,'EEE',{locale:es}), hasWork, bus:hasWork?['001','003','005'][Math.floor(Math.random()*3)]:null, hours:hasWork?`${6+Math.floor(Math.random()*4)}:00 - ${14+Math.floor(Math.random()*4)}:00`:null }
  })
  const [selected, setSelected] = useState<any>(null)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{color:'#8f94a5',fontSize:'12px',fontWeight:500,textTransform:'uppercase',marginBottom:'16px',letterSpacing:'0.05em'}}>Historial de actividad — últimos 30 días</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:'6px'}}>
          {days.map((d,i)=>(
            <button key={i} onClick={()=>setSelected(selected?.date===d.date?null:d)} style={{aspectRatio:'1/1',borderRadius:'8px',background:d.hasWork?(selected?.date===d.date?'rgba(239, 68, 68, 0.3)':'rgba(239, 68, 68, 0.12)'):'rgba(184,200,224,0.04)',border:`1px solid ${d.hasWork?(selected?.date===d.date?'rgba(239, 68, 68, 0.5)':'rgba(239, 68, 68, 0.2)'):'rgba(184,200,224,0.06)'}`,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1px',transition:'all 200ms',padding:'4px'}}>
              <span style={{color:d.hasWork?'#EF4444':'#8f94a5',fontSize:'11px',fontWeight:d.hasWork?700:400,fontFamily:'DM Mono'}}>{d.label}</span>
              <span style={{color:'#8f94a5',fontSize:'8px',fontFamily:'DM Mono',textTransform:'uppercase'}}>{d.dayName}</span>
            </button>
          ))}
        </div>
      </div>
      {selected && selected.hasWork && (
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
        }}>
          <div style={{color:'#8f94a5',fontSize:'12px',fontWeight:500,textTransform:'uppercase',marginBottom:'12px',letterSpacing:'0.05em'}}>
            {format(selected.date,"EEEE d 'de' MMMM",{locale:es})}
          </div>
          <div style={{display:'flex',gap:'12px'}}>
            <div style={{flex:1,background:'rgba(6,8,16,0.3)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:'18px'}}>Unidad {selected.bus}</div>
              <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono',marginTop:'4px'}}>Vehículo asignado</div>
            </div>
            <div style={{flex:1,background:'rgba(6,8,16,0.3)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{color:'#fff',fontWeight:700,fontSize:'16px'}}>{selected.hours}</div>
              <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono',marginTop:'4px'}}>Horario</div>
            </div>
            <div style={{flex:1,background:'rgba(6,8,16,0.3)',borderRadius:'10px',padding:'12px',textAlign:'center'}}>
              <div style={{color:'#22D3A0',fontWeight:700,fontSize:'18px'}}>{Math.floor(Math.random()*80+40)}</div>
              <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono',marginTop:'4px'}}>Pasajeros</div>
            </div>
          </div>
        </div>
      )}
      <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'10px',height:'10px',borderRadius:'3px',background:'rgba(239, 68, 68, 0.12)',border:'1px solid rgba(239, 68, 68, 0.2)'}}/><span style={{color:'#8f94a5',fontSize:'11px'}}>Día trabajado</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'10px',height:'10px',borderRadius:'3px',background:'rgba(184,200,224,0.04)',border:'1px solid rgba(184,200,224,0.06)'}}/><span style={{color:'#8f94a5',fontSize:'11px'}}>Sin actividad</span></div>
      </div>
    </div>
  )
}