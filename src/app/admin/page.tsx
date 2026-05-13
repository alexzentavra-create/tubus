'use client'

import { useState, useEffect } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, CartesianGrid
} from 'recharts'
import {
  Bus, Users, AlertTriangle, TrendingUp, Download, Clock,
  MapPin, Star, BarChart2, Activity, RefreshCw, FileText
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { BusLine } from '@/types'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

// ─── Mock data for demo (replace with real Supabase queries) ─────────────────

const HOURLY_DATA = Array.from({ length: 24 }, (_, h) => ({
  hour: `${h.toString().padStart(2, '0')}:00`,
  pasajeros: Math.round(Math.random() * 400 + (h >= 7 && h <= 9 || h >= 17 && h <= 19 ? 600 : 50)),
  viajes: Math.round(Math.random() * 20 + (h >= 7 && h <= 9 || h >= 17 && h <= 19 ? 30 : 5)),
}))

const WEEKLY_DATA = Array.from({ length: 7 }, (_, i) => ({
  dia: format(subDays(new Date(), 6 - i), 'EEE', { locale: es }),
  pasajeros: Math.round(Math.random() * 2000 + 3000),
  viajes: Math.round(Math.random() * 80 + 120),
}))

const TOP_STOPS = [
  { nombre: 'Av. Corrientes y Callao', subidas: 842, espera: 4 },
  { nombre: 'Av. Santa Fe y Pueyrredón', subidas: 721, espera: 6 },
  { nombre: 'Av. Rivadavia y Medrano', subidas: 608, espera: 5 },
  { nombre: 'Av. Cabildo y Juramento', subidas: 589, espera: 7 },
  { nombre: 'Av. del Libertador y Obligado', subidas: 412, espera: 8 },
]

const REPORT_TYPES = [
  { name: 'No paró', value: 38, color: '#EF4444' },
  { name: 'Mal trato', value: 22, color: '#F59E0B' },
  { name: 'Cond. peligrosa', value: 18, color: '#8B5CF6' },
  { name: 'Vehículo defectuoso', value: 14, color: '#3B82F6' },
  { name: 'Otro', value: 8, color: '#10B981' },
]

export default function AdminDashboard() {
  const supabase = createClient()
  const [lines, setLines] = useState<BusLine[]>([])
  const [selectedLine, setSelectedLine] = useState<BusLine | null>(null)
  const [stats, setStats] = useState({
    activeBuses: 23,
    onlineDrivers: 19,
    totalAppUsers: 4821,
    pendingReports: 7,
    todayPassengers: 12_540,
    onTimePct: 84,
  })
  const [reports, setReports] = useState<{ id: string; reporter: string; type: string; driver: string; bus: string; status: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'stops' | 'drivers'>('overview')

  useEffect(() => {
    // Auth check: admin only
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') {
        window.location.href = '/'
        return
      }
    })

    supabase.from('bus_lines').select('*').then(({ data }) => {
      if (data) { setLines(data); setSelectedLine(data[0]) }
      setLoading(false)
    })

    supabase
      .from('reports')
      .select('id, created_at, type, status, profiles!reporter_id(name), driver_profiles!driver_id(bus_unit)')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setReports(data as unknown as typeof reports) })
  }, [])

  const exportCSV = () => {
    const rows = [
      ['Hora', 'Pasajeros', 'Viajes'],
      ...HOURLY_DATA.map(d => [d.hour, d.pasajeros, d.viajes])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bustrack_${selectedLine?.line_number}_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    toast.success('Datos exportados correctamente')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-night-950 flex items-center justify-center">
        <div className="text-night-400 animate-pulse">Cargando panel...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-night-950 text-white">
      {/* ─── Sidebar + content layout ──────────────────────────────── */}
      <div className="flex h-screen overflow-hidden">

        {/* Sidebar */}
        <aside className="w-64 bg-night-900 border-r border-night-800 flex flex-col hidden lg:flex shrink-0">
          <div className="p-5 border-b border-night-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-bus-500/20 flex items-center justify-center">
                <Bus size={18} className="text-bus-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">BusTrack AR</div>
                <div className="text-night-400 text-xs">Panel Administración</div>
              </div>
            </div>
          </div>

          {/* Line selector */}
          <div className="p-4 border-b border-night-800">
            <div className="text-night-500 text-xs font-medium uppercase tracking-wider mb-3">Línea activa</div>
            <select
              className="bus-input text-sm"
              value={selectedLine?.id || ''}
              onChange={e => setSelectedLine(lines.find(l => l.id === e.target.value) || null)}
            >
              {lines.map(l => (
                <option key={l.id} value={l.id}>Línea {l.line_number} — {l.name.split(' - ')[1]}</option>
              ))}
            </select>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {([
              ['overview', BarChart2, 'Resumen'],
              ['reports',  AlertTriangle, 'Denuncias'],
              ['stops',    MapPin, 'Paradas'],
              ['drivers',  Bus, 'Choferes'],
            ] as const).map(([tab, Icon, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  activeTab === tab
                    ? 'bg-bus-500/15 text-bus-300 border border-bus-500/25'
                    : 'text-night-400 hover:text-white hover:bg-night-800'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-night-800">
            <button
              onClick={exportCSV}
              className="w-full flex items-center justify-center gap-2 btn-secondary text-sm"
            >
              <Download size={14} />
              Exportar datos
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto scroll-panel">
          {/* Top bar */}
          <div className="sticky top-0 z-10 bg-night-950/95 backdrop-blur border-b border-night-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h1 className="text-white font-bold text-lg">
                {activeTab === 'overview' ? 'Resumen del día' :
                 activeTab === 'reports'  ? 'Denuncias' :
                 activeTab === 'stops'    ? 'Paradas más usadas' : 'Choferes'}
              </h1>
              {selectedLine && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: selectedLine.color }} />
                  <span className="text-night-400 text-sm">Línea {selectedLine.line_number}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-night-500 text-sm hidden sm:block">
                {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
              </span>
              <button
                onClick={() => window.location.reload()}
                className="w-8 h-8 rounded-lg bg-night-800 flex items-center justify-center hover:bg-night-700 transition-colors"
              >
                <RefreshCw size={14} className="text-night-300" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && <OverviewTab stats={stats} />}
            {activeTab === 'reports'  && <ReportsTab reports={reports} />}
            {activeTab === 'stops'    && <StopsTab />}
            {activeTab === 'drivers'  && <DriversTab />}
          </div>
        </main>
      </div>
    </div>
  )
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────

function OverviewTab({ stats }: { stats: { activeBuses: number; onlineDrivers: number; totalAppUsers: number; pendingReports: number; todayPassengers: number; onTimePct: number } }) {
  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard icon={Bus}          label="Colectivos activos"   value={stats.activeBuses}                     color="text-moving"     />
        <KPICard icon={Users}        label="Choferes online"      value={stats.onlineDrivers}                   color="text-bus-400"    />
        <KPICard icon={Users}        label="Usuarios con app"     value={stats.totalAppUsers.toLocaleString()}  color="text-blue-400"   />
        <KPICard icon={AlertTriangle} label="Denuncias pendientes" value={stats.pendingReports}                  color="text-stopped"    />
        <KPICard icon={TrendingUp}   label="Pasajeros hoy"        value={stats.todayPassengers.toLocaleString()} color="text-bus-300"  />
        <KPICard icon={Activity}     label="En hora"              value={`${stats.onTimePct}%`}                 color="text-moving"     />
      </div>

      {/* Hourly chart */}
      <div className="glass-panel p-5">
        <h3 className="text-white font-semibold mb-4">Pasajeros por hora — hoy</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={HOURLY_DATA}>
            <defs>
              <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF9800" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF9800" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fill: '#607D8B', fontSize: 11 }} interval={3} />
            <YAxis tick={{ fill: '#607D8B', fontSize: 11 }} />
            <Tooltip
              contentStyle={{ background: '#263238', border: '1px solid rgba(255,152,0,0.2)', borderRadius: 8 }}
              labelStyle={{ color: '#fff' }}
              itemStyle={{ color: '#FF9800' }}
            />
            <Area type="monotone" dataKey="pasajeros" stroke="#FF9800" fill="url(#grad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly + Report types */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-panel p-5">
          <h3 className="text-white font-semibold mb-4">Pasajeros — últimos 7 días</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={WEEKLY_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="dia" tick={{ fill: '#607D8B', fontSize: 12 }} />
              <YAxis tick={{ fill: '#607D8B', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#263238', border: '1px solid rgba(255,152,0,0.2)', borderRadius: 8 }}
                labelStyle={{ color: '#fff' }}
                itemStyle={{ color: '#FF9800' }}
              />
              <Bar dataKey="pasajeros" fill="#FF9800" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-white font-semibold mb-4">Tipos de denuncias</h3>
          <div className="flex items-center gap-6">
            <PieChart width={140} height={140}>
              <Pie data={REPORT_TYPES} cx={65} cy={65} innerRadius={40} outerRadius={60} dataKey="value">
                {REPORT_TYPES.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            </PieChart>
            <div className="flex-1 space-y-2">
              {REPORT_TYPES.map(rt => (
                <div key={rt.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: rt.color }} />
                  <span className="text-night-300 text-xs flex-1">{rt.name}</span>
                  <span className="text-white text-xs font-medium">{rt.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────

function ReportsTab({ reports }: { reports: { id: string; reporter: string; type: string; driver: string; bus: string; status: string; created_at: string }[] }) {
  const supabase = createClient()
  const typeLabels: Record<string, string> = {
    no_paro: 'No paró', conduccion_peligrosa: 'Cond. peligrosa',
    mal_trato: 'Mal trato', vehiculo_defectuoso: 'Veh. defectuoso',
    no_llego: 'No llegó', otro: 'Otro',
  }
  const statusColors: Record<string, string> = {
    pending: 'bg-approaching/20 text-approaching border-approaching/30',
    reviewing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    resolved: 'bg-moving/20 text-moving border-moving/30',
    dismissed: 'bg-night-700 text-night-400 border-night-600',
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('reports').update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null }).eq('id', id)
    toast.success('Estado actualizado')
  }

  // Use mock data if no real reports yet
  const displayReports = reports.length > 0 ? reports : [
    { id: '1', reporter: 'Juan P.', type: 'no_paro', driver: 'Carlos M.', bus: '0421', status: 'pending', created_at: new Date().toISOString() },
    { id: '2', reporter: 'María G.', type: 'mal_trato', driver: 'Roberto S.', bus: '0387', status: 'reviewing', created_at: new Date().toISOString() },
    { id: '3', reporter: 'Lucas F.', type: 'conduccion_peligrosa', driver: 'Diego R.', bus: '0512', status: 'resolved', created_at: new Date().toISOString() },
  ]

  return (
    <div className="space-y-3">
      {displayReports.map(r => (
        <div key={r.id} className="glass-panel p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white font-medium text-sm">{typeLabels[r.type] || r.type}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[r.status] || statusColors.pending}`}>
                {r.status === 'pending' ? 'Pendiente' : r.status === 'reviewing' ? 'En revisión' : r.status === 'resolved' ? 'Resuelto' : 'Desestimado'}
              </span>
            </div>
            <div className="text-night-400 text-xs">
              Reportado por <span className="text-night-200">{r.reporter || 'Anónimo'}</span>
              {' · '} Chofer: <span className="text-night-200">{r.driver || '—'}</span>
              {' · '} Unidad: <span className="text-night-200">{r.bus || '—'}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {r.status === 'pending' && (
              <>
                <button onClick={() => updateStatus(r.id, 'reviewing')} className="btn-secondary text-xs py-1.5 px-3">Revisar</button>
                <button onClick={() => updateStatus(r.id, 'resolved')} className="text-xs px-3 py-1.5 rounded-lg bg-moving/15 border border-moving/30 text-moving hover:bg-moving/25 transition-colors">Resolver</button>
              </>
            )}
            {r.status === 'reviewing' && (
              <>
                <button onClick={() => updateStatus(r.id, 'resolved')} className="text-xs px-3 py-1.5 rounded-lg bg-moving/15 border border-moving/30 text-moving transition-colors">Resolver</button>
                <button onClick={() => updateStatus(r.id, 'dismissed')} className="btn-secondary text-xs py-1.5 px-3">Desestimar</button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── STOPS TAB ────────────────────────────────────────────────────────────────

function StopsTab() {
  return (
    <div className="space-y-6">
      <div className="glass-panel p-5">
        <h3 className="text-white font-semibold mb-4">Top 5 paradas más usadas</h3>
        <div className="space-y-3">
          {TOP_STOPS.map((stop, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-7 h-7 rounded-lg bg-night-800 text-night-300 text-sm font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">{stop.nombre}</div>
                <div className="w-full bg-night-800 rounded-full h-1.5 mt-1.5">
                  <div
                    className="h-1.5 rounded-full bg-bus-500 transition-all"
                    style={{ width: `${(stop.subidas / TOP_STOPS[0].subidas) * 100}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-white text-sm font-bold">{stop.subidas}</div>
                <div className="text-night-400 text-xs">{stop.espera} min espera</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-panel p-5">
        <h3 className="text-white font-semibold mb-4">Subidas por hora en paradas principales</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={HOURLY_DATA}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="hour" tick={{ fill: '#607D8B', fontSize: 11 }} interval={3} />
            <YAxis tick={{ fill: '#607D8B', fontSize: 11 }} />
            <Tooltip contentStyle={{ background: '#263238', border: '1px solid rgba(255,152,0,0.2)', borderRadius: 8 }} />
            <Line type="monotone" dataKey="pasajeros" stroke="#FF9800" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ─── DRIVERS TAB ─────────────────────────────────────────────────────────────

function DriversTab() {
  const mockDrivers = [
    { name: 'Carlos Martínez', unit: '0421', status: 'online', trips: 4, rating: 4.9, reports: 0 },
    { name: 'Roberto Sánchez', unit: '0387', status: 'online', trips: 3, rating: 4.6, reports: 1 },
    { name: 'Diego Rodríguez', unit: '0512', status: 'offline', trips: 6, rating: 4.2, reports: 2 },
    { name: 'Pablo García',    unit: '0298', status: 'online', trips: 2, rating: 5.0, reports: 0 },
    { name: 'Miguel Torres',   unit: '0634', status: 'offline', trips: 5, rating: 4.7, reports: 0 },
  ]

  return (
    <div className="space-y-3">
      {mockDrivers.map((d, i) => (
        <div key={i} className="glass-panel p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-night-800 flex items-center justify-center shrink-0">
            <Bus size={18} className="text-night-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{d.name}</span>
              <div className={`w-2 h-2 rounded-full ${d.status === 'online' ? 'bg-moving' : 'bg-night-600'}`} />
            </div>
            <div className="text-night-400 text-xs">Unidad {d.unit} · {d.trips} viajes hoy</div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 justify-end">
              <Star size={12} className="text-bus-400 fill-bus-400" />
              <span className="text-white text-sm font-bold">{d.rating}</span>
            </div>
            {d.reports > 0 && (
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                <AlertTriangle size={11} className="text-stopped" />
                <span className="text-stopped text-xs">{d.reports} denuncia{d.reports > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Reusable KPI card ────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="glass-panel p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-night-800 flex items-center justify-center shrink-0">
        <Icon size={18} className={color} />
      </div>
      <div>
        <div className="text-night-400 text-xs">{label}</div>
        <div className="text-white font-bold text-xl mt-0.5">{value}</div>
      </div>
    </div>
  )
}