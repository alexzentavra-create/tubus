'use client'
import { useState, useEffect } from 'react'
import {
  Bus, Users, QrCode, MapPin, AlertTriangle, Activity,
  Download, LogOut, RefreshCw, Plus, Calendar, Clock,
  ChevronRight, Star, Wifi, WifiOff, CheckCircle, XCircle,
  TrendingUp, BarChart2, Share2, Printer, Trash2, ChevronDown, CheckCircle2,
  Circle, Flag, Info
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { MOCK_LINES, getMockStopsForLine } from '@/lib/mockData'

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '')
  let r = 0, g = 0, b = 0
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16)
    g = parseInt(cleanHex[1] + cleanHex[1], 16)
    b = parseInt(cleanHex[2] + cleanHex[2], 16)
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16)
    g = parseInt(cleanHex.slice(2, 4), 16)
    b = parseInt(cleanHex.slice(4, 6), 16)
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
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

  const [selectedLineNumber, setSelectedLineNumber] = useState<string>('12')
  const [buses, setBuses] = useState<any[]>([])

  // Dynamic Chart Filters
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Modals & Sub-views
  const [showPassengerModal, setShowPassengerModal] = useState(false)
  const [showPuntualidadTimeline, setShowPuntualidadTimeline] = useState(false)
  const [showMasDropdown, setShowMasDropdown] = useState(false)

  // Stops Timeframe Settings
  const [stopsTimeframes, setStopsTimeframes] = useState<Record<string, { start: number; end: number }>>({})
  const [editingStopId, setEditingStopId] = useState<string | null>(null)
  const [editingStart, setEditingStart] = useState<number>(0)
  const [editingEnd, setEditingEnd] = useState<number>(5)

  // Live GPS control logs
  const [gpsPassageLogs, setGpsPassageLogs] = useState<any[]>([])

  // Load initial line from query parameter if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const lineParam = params.get('line') || params.get('line_number')
      if (lineParam) {
        setSelectedLineNumber(lineParam)
      }
    }
  }, [])

  const activeLine = MOCK_LINES.find(l => l.line_number === selectedLineNumber) || MOCK_LINES[0]
  const themeColor = activeLine.color

  const LINE_STATS: Record<string, { rating: string; punctuality: string; dailyPas: number }> = {
    '12': { rating: '4.7', punctuality: '84%', dailyPas: 1240 },
    '28': { rating: '4.5', punctuality: '88%', dailyPas: 2150 },
    '37': { rating: '4.6', punctuality: '82%', dailyPas: 1480 },
    '39': { rating: '4.8', punctuality: '91%', dailyPas: 1890 },
    '59': { rating: '4.7', punctuality: '89%', dailyPas: 2300 },
    '60': { rating: '4.4', punctuality: '79%', dailyPas: 3120 },
    '102': { rating: '4.6', punctuality: '85%', dailyPas: 1150 },
    '152': { rating: '4.7', punctuality: '87%', dailyPas: 1720 },
    'T-Amarillo': { rating: '4.9', punctuality: '95%', dailyPas: 480 },
    'T-Rojo': { rating: '4.8', punctuality: '93%', dailyPas: 510 },
  }

  const activeStats = LINE_STATS[activeLine.line_number] || { rating: '4.7', punctuality: '85%', dailyPas: 1200 }
  
  const [liveDailyPassengers, setLiveDailyPassengers] = useState<number>(0)
  const [floatingIndicators, setFloatingIndicators] = useState<Array<{ id: number; text: string }>>([])

  useEffect(() => {
    setLiveDailyPassengers(activeStats.dailyPas)
  }, [activeStats.dailyPas])

  useEffect(() => {
    const interval = setInterval(() => {
      // Boards a group of 1 to 5 passengers
      const amt = Math.floor(Math.random() * 5) + 1
      setLiveDailyPassengers(prev => prev + amt)
      
      const newId = Date.now() + Math.random()
      setFloatingIndicators(prev => [...prev, { id: newId, text: `+${amt}` }])
      
      setTimeout(() => {
        setFloatingIndicators(prev => prev.filter(x => x.id !== newId))
      }, 1500)
    }, 4500)
    return () => clearInterval(interval)
  }, [])
  
  const totalPassengersOnboard = buses.reduce((acc, b) => acc + b.passenger_count, 0)
  const avgOnboard = buses.length > 0 ? Math.round(totalPassengersOnboard / buses.length) : 0

  const handleLineChange = (lineNum: string) => {
    setSelectedLineNumber(lineNum)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('line', lineNum)
      window.history.pushState({}, '', url.toString())
    }
  }

  // Checklist State
  const [todos, setTodos] = useState<Todo[]>([
    { id: 't1', text: 'Revisar reclamo sobre coche 001', done: false, date: '28 de Mayo', badge: 'Urgente', flagged: true },
    { id: 't2', text: 'Imprimir y colocar código QR en unidad 005', done: false, date: '29 de Mayo', badge: 'Pendiente', flagged: false },
    { id: 't3', text: 'Verificar habilitación de chofer Juan Gómez', done: false, date: '30 de Mayo', badge: 'Esta semana', flagged: true },
    { id: 't4', text: 'Limpieza y desinfección unidad 003', done: true, date: '27 de Mayo', badge: 'Resuelto', flagged: false },
  ])
  const [newTodoText, setNewTodoText] = useState('')
  const [showAddTodo, setShowAddTodo] = useState(false)

  // Load company profile and details
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
    if (url.includes('placeholder.supabase.co')) {
      setCompany({
        id: `mock-company-${activeLine.id}`,
        company_name: `${activeLine.line_number === 'T-Amarillo' || activeLine.line_number === 'T-Rojo' ? '' : 'Línea '}${activeLine.line_number} (${activeLine.company})`,
        username: `linea${activeLine.line_number.toLowerCase()}`,
        is_active: true
      })
      setQrCodes([
        { id: `mock-qr-${activeLine.line_number}-1`, qr_token: `DEMO-QR-L${activeLine.line_number}-001`, bus_unit: `${activeLine.line_number}-301`, is_active: true, company_id: `mock-company-${activeLine.id}`, line_id: activeLine.id },
        { id: `mock-qr-${activeLine.line_number}-2`, qr_token: `DEMO-QR-L${activeLine.line_number}-002`, bus_unit: `${activeLine.line_number}-302`, is_active: false, company_id: `mock-company-${activeLine.id}`, line_id: activeLine.id }
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
        
        // Dynamically select the line number from the database company_name
        const nameClean = comp.company_name || ''
        const match = nameClean.match(/L[íi]nea\s*(\d+)/i) || nameClean.match(/(\d+)/)
        if (match && match[1]) {
          setSelectedLineNumber(match[1])
        } else if (nameClean.toLowerCase().includes('amarillo')) {
          setSelectedLineNumber('T-Amarillo')
        } else if (nameClean.toLowerCase().includes('rojo')) {
          setSelectedLineNumber('T-Rojo')
        }

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
  }, [activeLine])

  // Fetch live fleet details from user app's simulator
  useEffect(() => {
    if (!activeLine) return
    const fetchBuses = () => {
      fetch(`/api/buses?line_id=${activeLine.id}&line_number=${activeLine.line_number}`)
        .then(res => res.json())
        .then(json => {
          if (json.data) {
            setBuses(json.data)
            
            // Map live simulated buses to activeSessions so the rest of the dashboard updates dynamically
            const sessions = json.data.map((bus: any) => ({
              id: bus.id,
              bus_unit: bus.bus_unit,
              started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
              total_passengers: bus.passenger_count,
              profiles: { name: bus.driver_name }
            }))
            setActiveSessions(sessions)
          }
        })
        .catch(() => {})
    }

    fetchBuses()
    const interval = setInterval(fetchBuses, 5000)
    return () => clearInterval(interval)
  }, [activeLine])

  // Initialize stops timeframes when activeLine stops are loaded
  useEffect(() => {
    const defaultTimeframes: Record<string, { start: number; end: number }> = {}
    stops.forEach((s, idx) => {
      defaultTimeframes[s.id] = {
        start: idx * 5,
        end: idx * 5 + 4
      }
    })
    setStopsTimeframes(defaultTimeframes)
  }, [selectedLineNumber])

  // Simulated GPS tracking passage logs
  useEffect(() => {
    if (buses.length === 0) return
    const now = new Date()
    const currentHour = now.getHours()
    const currentMin = now.getMinutes()
    const currentSec = now.getSeconds()

    setGpsPassageLogs(prev => {
      const updated = [...prev]
      let changed = false

      buses.forEach(bus => {
        const matchedStop = stops.find(s => s.name === bus.next_stop_name || s.id === bus.next_stop_id)
        if (matchedStop) {
          const logId = `gps-${bus.id}-${matchedStop.id}-${currentHour}-${currentMin}`
          const exists = updated.some(l => l.id === logId)
          if (!exists) {
            const tf = stopsTimeframes[matchedStop.id] || { start: (matchedStop.stop_number - 1) * 5, end: (matchedStop.stop_number - 1) * 5 + 4 }
            
            const offsetMin = currentMin % 60
            const inTimeframe = offsetMin >= tf.start && offsetMin <= tf.end
            const isLate = offsetMin > tf.end
            const status = inTimeframe ? 'A tiempo' : (isLate ? 'Demorado' : 'Adelantado')

            updated.unshift({
              id: logId,
              busUnit: bus.bus_unit,
              driver: bus.driver_name,
              stopName: matchedStop.name,
              time: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}:${String(currentSec).padStart(2, '0')}`,
              scheduled: `${String(tf.start).padStart(2, '0')}-${String(tf.end).padStart(2, '0')} min`,
              status
            })
            changed = true
          }
        }
      })

      return changed ? updated.slice(0, 20) : prev
    })
  }, [buses, stopsTimeframes])

  const getChartData = () => {
    if (chartPeriod === 'week') {
      return Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(selectedDate), 6 - i)
        const dayLabel = format(d, 'EEEE', { locale: es })
        const base = activeStats.dailyPas
        const seed = activeLine.line_number.charCodeAt(0) + i * 23
        const val = Math.sin(seed) * 0.2 + 1.0
        const subidos = Math.round(base * val * 0.8)
        const bajados = Math.round(subidos * 0.95)
        return { label: dayLabel.substring(0, 3), subidos, bajados }
      })
    }
    if (chartPeriod === 'month') {
      return Array.from({ length: 30 }, (_, i) => {
        const d = subDays(new Date(selectedDate), 29 - i)
        const dayLabel = format(d, 'dd MMM', { locale: es })
        const base = activeStats.dailyPas
        const seed = activeLine.line_number.charCodeAt(0) + i * 17
        const val = Math.cos(seed) * 0.3 + 1.0
        const subidos = Math.round(base * val * 0.8)
        const bajados = Math.round(subidos * 0.93)
        return { label: dayLabel, subidos, bajados }
      })
    }
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    let maxHour = 23
    if (selectedDate === todayStr) {
      maxHour = new Date().getHours()
    } else if (selectedDate > todayStr) {
      return []
    }

    return HOURLY.slice(0, maxHour + 1).map((h, i) => {
      const seed = activeLine.line_number.charCodeAt(0) + i * 7
      const factor = 0.9 + (seed % 3) * 0.1
      const sub = Math.round(h.subidas * factor)
      const baj = Math.round(h.pasajeros * 0.45 * factor)
      return { label: h.h, subidos: sub, bajados: baj }
    })
  }

  const currentChartData = getChartData()

  const LINE_DRIVERS: Record<string, string[]> = {
    '12': ['Néstor García', 'Roberto Sánchez', 'Carlos Martínez', 'Juan Gómez'],
    '28': ['Carlos M.', 'Jorge Rodríguez', 'Pablo García'],
    '37': ['Roberto S.', 'Ana Martínez'],
    '39': ['Esteban Ortiz', 'Lucas Domínguez', 'Martín Pereyra'],
    '59': ['Hugo Bianchi', 'Nicolás Silva', 'Claudio Rossi'],
    '60': ['Carlos Martínez', 'Diego Rodríguez', 'Pablo García', 'Luis Fernández'],
    '102': ['Diego Torres', 'Fernando Gómez', 'Javier Ortega'],
    '152': ['Roberto S.', 'Jorge R.', 'Ana C.'],
    'T-Amarillo': ['Marta Giménez', 'Sergio Rossi', 'Elena Paz'],
    'T-Rojo': ['Juan Pérez', 'Facundo Castro', 'Sofía Medina']
  }

  const getLineDrivers = (lineNum: string) => {
    const names = LINE_DRIVERS[lineNum] || ['Chofer Auxiliar', 'Chofer de Guardia']
    return names.map((name, i) => ({
      name,
      legajo: `LEG-${String(100 + i * 17).padStart(4, '0')}`,
      sessions: 40 + (i * 23) % 150,
      onTime: 85 + (i * 7) % 15,
      rating: (4.4 + (i * 0.15) % 0.6).toFixed(1),
      reports: i % 3 === 0 ? 1 : 0,
      lastActive: i % 2 === 0 ? 'Hoy 08:30' : 'Ayer 18:30'
    }))
  }

  const currentDrivers = getLineDrivers(activeLine.line_number)

  const stops = getMockStopsForLine(activeLine, 'ida')
  const topStops = [...stops]
    .sort((a, b) => b.total_daily_users - a.total_daily_users)
    .slice(0, 4)
    .map(s => ({
      name: s.name,
      subidas: Math.round(s.total_daily_users * 0.8),
      espera: s.avg_wait_minutes
    }))

  // Dynamic reports
  const [reports, setReports] = useState<any[]>([])
  useEffect(() => {
    const driversList = LINE_DRIVERS[activeLine.line_number] || ['Chofer de Guardia']
    const stopsList = getMockStopsForLine(activeLine, 'ida')
    setReports([
      {
        id: 'rep-1',
        type: 'No paró',
        driver: driversList[0],
        bus: `${activeLine.line_number}-301`,
        stop: stopsList[0]?.name || 'Esquina Principal',
        status: 'pending',
        time: 'Hace 20 min',
        desc: 'El colectivo no paró a pesar de que había espacio y se le hizo la señal correspondiente.'
      },
      {
        id: 'rep-2',
        type: 'Mal trato',
        driver: driversList[1] || 'Chofer de Guardia',
        bus: `${activeLine.line_number}-303`,
        stop: stopsList[1]?.name || 'Avenida Central',
        status: 'resolved',
        time: 'Hace 2h',
        desc: 'El chofer fue agresivo al responder una consulta sobre el recorrido.'
      }
    ])
  }, [activeLine])

  // Auto-detect and sync system issues to Todo List
  useEffect(() => {
    setTodos(prev => {
      const updated = [...prev]
      let changed = false

      // 1. Sync pending reports
      reports.forEach(r => {
        const todoId = `todo-rep-${r.id}`
        const exists = updated.some(t => t.id === todoId)
        if (!exists && r.status === 'pending') {
          updated.unshift({
            id: todoId,
            text: `Atender denuncia [${r.type}]: Unidad ${r.bus} - Chofer ${r.driver}`,
            done: false,
            date: 'Hoy',
            badge: 'Urgente',
            flagged: true
          })
          changed = true
        } else if (exists && r.status === 'resolved') {
          const idx = updated.findIndex(t => t.id === todoId)
          if (idx !== -1 && !updated[idx].done) {
            updated[idx] = { ...updated[idx], done: true, badge: 'Resuelto' }
            changed = true
          }
        }
      })

      // 2. Sync stopped or broken down buses
      buses.forEach(b => {
        if (b.speed_kmh === 0 && b.status === 'stopped') {
          const todoId = `todo-bus-stop-${b.id}`
          const exists = updated.some(t => t.id === todoId)
          if (!exists) {
            updated.unshift({
              id: todoId,
              text: `Alerta GPS: Unidad ${b.bus_unit} detenida en parada ${b.next_stop_name || 'recorrido'}`,
              done: false,
              date: 'Hoy',
              badge: 'Nuevo',
              flagged: true
            })
            changed = true
          }
        } else if (b.speed_kmh > 0) {
          const todoId = `todo-bus-stop-${b.id}`
          const idx = updated.findIndex(t => t.id === todoId)
          if (idx !== -1 && !updated[idx].done) {
            updated[idx] = { ...updated[idx], done: true, badge: 'Resuelto' }
            changed = true
          }
        }
      })

      return changed ? updated : prev
    })
  }, [reports, buses])

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
    a.download=`bienparada_linea${activeLine.line_number}_${format(new Date(),'yyyy-MM-dd')}.csv`; a.click()
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
    <div style={{minHeight:'100vh',background:'#0b0f19',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{color:'#8f94a5',fontFamily:'DM Mono',fontSize:'13px'}}>Cargando panel...</div>
    </div>
  )

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
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
            
            {/* Interactive Badge Selector */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <select
                value={selectedLineNumber}
                onChange={(e) => handleLineChange(e.target.value)}
                style={{
                  fontSize: '9px',
                  color: '#fff',
                  background: themeColor,
                  border: 'none',
                  padding: '3px 20px 3px 8px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  transition: 'background-color 200ms',
                }}
              >
                {MOCK_LINES.map(l => (
                  <option key={l.id} value={l.line_number} style={{ background: '#121527', color: '#fff' }}>
                    {l.line_number === 'T-Amarillo' || l.line_number === 'T-Rojo' ? '' : 'Línea '}{l.line_number}
                  </option>
                ))}
              </select>
              <ChevronDown size={10} style={{ position: 'absolute', right: '5px', color: '#fff', pointerEvents: 'none' }} />
            </div>
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
                background: themeColor,
                borderRadius: '50%',
              }} />
            </div>
            <Users size={16} style={{ cursor: 'pointer' }} />
          </div>

          {/* Company Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderLeft: '1px solid rgba(255, 255, 255, 0.1)', paddingLeft: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: '12px' }}>{activeLine.company}</div>
              <div style={{ color: '#8f94a5', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Panel Empresa</div>
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Sub-header and Actions */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 24px 12px',
        flexWrap: 'wrap',
        gap: '16px',
        position: 'relative',
      }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', position: 'relative' }}>
          {[
            { label: 'Resumen', id: 'overview', matches: ['overview'] },
            { label: 'Flota', id: 'buses', matches: ['buses', 'drivers', 'stops'] },
            { label: 'Historial', id: 'calendar', matches: ['calendar'] },
          ].map((item) => {
            const active = item.matches.includes(tab) && !showPuntualidadTimeline
            return (
              <span
                key={item.label}
                onClick={() => {
                  setTab(item.matches[0] as Tab)
                  setShowPuntualidadTimeline(false)
                  setShowMasDropdown(false)
                }}
                style={{
                  fontSize: '14px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#fff' : '#8f94a5',
                  borderBottom: active ? `2px solid ${themeColor}` : 'none',
                  paddingBottom: '4px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
              >
                {item.label}
              </span>
            )
          })}

          {/* "Más" Dropdown Selector */}
          <div style={{ position: 'relative' }}>
            <span
              onClick={() => setShowMasDropdown(!showMasDropdown)}
              style={{
                fontSize: '14px',
                fontWeight: (tab === 'qrcodes' || tab === 'reports' || showPuntualidadTimeline) ? 600 : 500,
                color: (tab === 'qrcodes' || tab === 'reports' || showPuntualidadTimeline) ? '#fff' : '#8f94a5',
                borderBottom: (tab === 'qrcodes' || tab === 'reports' || showPuntualidadTimeline) ? `2px solid ${themeColor}` : 'none',
                paddingBottom: '4px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                transition: 'all 200ms',
              }}
            >
              Más <ChevronDown size={12} style={{ transform: showMasDropdown ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
            </span>

            {showMasDropdown && (
              <div style={{
                position: 'absolute',
                top: '24px',
                left: 0,
                background: '#121527',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '6px 0',
                width: '140px',
                zIndex: 60,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              }}>
                {[
                  { label: 'Puntualidad GPS', tab: 'overview', showTimeline: true },
                  { label: 'Códigos QR', tab: 'qrcodes', showTimeline: false },
                  { label: 'Denuncias', tab: 'reports', showTimeline: false },
                  { label: 'Cerrar Sesión', tab: 'logout', showTimeline: false }
                ].map((opt) => (
                  <div
                    key={opt.label}
                    onClick={() => {
                      setShowMasDropdown(false)
                      if (opt.tab === 'logout') {
                        const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
                        if (url.includes('placeholder.supabase.co')) {
                          window.location.href = '/login'
                        } else {
                          supabase.auth.signOut().then(() => { window.location.href = '/login' })
                        }
                      } else {
                        setTab(opt.tab as Tab)
                        setShowPuntualidadTimeline(opt.showTimeline)
                      }
                    }}
                    style={{
                      padding: '8px 16px',
                      color: (tab === opt.tab && showPuntualidadTimeline === opt.showTimeline) ? themeColor : '#a3a6b8',
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'background-color 150ms',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
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
              background: themeColor,
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

      {/* KPI Row (5 elements now) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '24px',
        padding: '12px 24px 24px',
      }}>
        {/* Colectivos Activos */}
        <div
          onClick={() => { setTab('buses'); setShowPuntualidadTimeline(false); }}
          style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer', transition: 'all 200ms' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = themeColor}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
        >
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Colectivos Activos</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{activeSessions.length}</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +1 hoy</span>
        </div>
        {/* Pasajeros Hoy */}
        <div
          onClick={() => setShowPassengerModal(true)}
          style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer', transition: 'all 200ms', position: 'relative', overflow: 'visible' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = themeColor}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
        >
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Pasajeros Hoy</span>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{liveDailyPassengers.toLocaleString('es-ES')}</span>
            
            {/* Real-time floating animated boarding indicators */}
            <div style={{ position: 'absolute', left: '110px', top: '-10px', display: 'flex', flexDirection: 'column', gap: '4px', pointerEvents: 'none', zIndex: 10 }}>
              {floatingIndicators.map(ind => (
                <div
                  key={ind.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'rgba(34,211,160,0.15)',
                    border: '1px solid rgba(34,211,160,0.3)',
                    borderRadius: '999px',
                    padding: '2px 8px',
                    color: '#22D3A0',
                    fontSize: '11px',
                    fontWeight: 700,
                    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    fontFamily: 'DM Mono',
                    animation: 'floatFade 1.2s ease-out forwards',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Users size={10} />
                  <span>{ind.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▲ +12%</span>
        </div>
        {/* Denuncias Pendientes */}
        <div
          onClick={() => { setTab('reports'); setShowPuntualidadTimeline(false); }}
          style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', cursor: 'pointer', transition: 'all 200ms' }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = themeColor}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
        >
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Denuncias Pend.</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{reports.filter(r => r.status === 'pending').length}</span>
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>▼ -15.0%</span>
        </div>
        {/* Pasajeros A Bordo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#121527', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Pasajeros a Bordo</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{totalPassengersOnboard}</span>
          <span style={{ fontSize: '11px', color: '#8f94a5', fontWeight: 600 }}>Promedio: {avgOnboard}/coche</span>
        </div>
        {/* En Hora */}
        <div
          onClick={() => setShowPuntualidadTimeline(!showPuntualidadTimeline)}
          style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: showPuntualidadTimeline ? hexToRgba(themeColor, 0.08) : '#121527', padding: '16px', borderRadius: '12px', border: `1px solid ${showPuntualidadTimeline ? themeColor : 'rgba(255, 255, 255, 0.06)'}`, cursor: 'pointer', transition: 'all 200ms' }}
          onMouseEnter={(e) => { if (!showPuntualidadTimeline) e.currentTarget.style.borderColor = themeColor }}
          onMouseLeave={(e) => { if (!showPuntualidadTimeline) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
        >
          <span style={{ fontSize: '12px', color: '#8f94a5', fontWeight: 500 }}>Puntualidad</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{activeStats.punctuality}</span>
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
                {showPuntualidadTimeline ? (
                  <div style={{
                    background: '#121527',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '24px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>Control de Puntualidad y GPS</h3>
                        <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Planificador de frecuencia y registro de arribos en tiempo real</p>
                      </div>
                      <button
                        onClick={() => setShowPuntualidadTimeline(false)}
                        style={{
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '6px',
                          color: '#fff',
                          fontSize: '12px',
                          padding: '6px 12px',
                          cursor: 'pointer',
                          borderStyle: 'solid'
                        }}
                      >
                        Volver a Resumen
                      </button>
                    </div>

                    {/* Timeline stops flow */}
                    <div style={{ borderLeft: `2.5px solid ${themeColor}`, marginLeft: '12px', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>
                      {stops.map((stop, idx) => {
                        const tf = stopsTimeframes[stop.id] || { start: idx * 5, end: idx * 5 + 4 }
                        const isEditing = editingStopId === stop.id
                        const lastPass = gpsPassageLogs.find(l => l.stopName === stop.name)

                        return (
                          <div key={stop.id} style={{ position: 'relative' }}>
                            {/* Bullet dot */}
                            <div style={{
                              position: 'absolute',
                              left: '-31px',
                              top: '2px',
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: '#121527',
                              border: `3px solid ${themeColor}`,
                              boxShadow: `0 0 0 4px ${hexToRgba(themeColor, 0.15)}`
                            }} />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>{idx + 1}. {stop.name}</h4>
                                <p style={{ fontSize: '11px', color: '#8f94a5', margin: '4px 0 0' }}>Frecuencia de paso programada: <span style={{ color: '#fff', fontWeight: 600 }}>minuto {tf.start} al {tf.end}</span> de cada ciclo</p>
                                
                                {lastPass ? (
                                  <div style={{
                                    marginTop: '8px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: lastPass.status === 'A tiempo' ? 'rgba(34,211,160,0.08)' : (lastPass.status === 'Demorado' ? 'rgba(255,77,106,0.08)' : 'rgba(240,180,41,0.08)'),
                                    border: `1px solid ${lastPass.status === 'A tiempo' ? 'rgba(34,211,160,0.15)' : (lastPass.status === 'Demorado' ? 'rgba(255,77,106,0.15)' : 'rgba(240,180,41,0.15)')}`,
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '10px',
                                    color: lastPass.status === 'A tiempo' ? '#22D3A0' : (lastPass.status === 'Demorado' ? '#FF4D6A' : '#F0B429'),
                                    fontFamily: 'DM Mono'
                                  }}>
                                    <span>Ultimo GPS: Unidad {lastPass.busUnit} pasó a las {lastPass.time} ({lastPass.status})</span>
                                  </div>
                                ) : (
                                  <div style={{ marginTop: '8px', fontSize: '10px', color: '#64748b', fontFamily: 'DM Mono' }}>Esperando paso de colectivos por GPS...</div>
                                )}
                              </div>

                              <div>
                                {isEditing ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#1b1d32', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <span style={{ fontSize: '10px', color: '#8f94a5' }}>Inicio (min):</span>
                                      <input
                                        type="number"
                                        value={editingStart}
                                        onChange={(e) => setEditingStart(parseInt(e.target.value) || 0)}
                                        style={{ width: '45px', background: '#121527', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '2px 4px' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <span style={{ fontSize: '10px', color: '#8f94a5' }}>Fin (min):</span>
                                      <input
                                        type="number"
                                        value={editingEnd}
                                        onChange={(e) => setEditingEnd(parseInt(e.target.value) || 0)}
                                        style={{ width: '45px', background: '#121527', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '2px 4px' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                      <button
                                        onClick={() => {
                                          setStopsTimeframes(prev => ({
                                            ...prev,
                                            [stop.id]: { start: editingStart, end: editingEnd }
                                          }));
                                          setEditingStopId(null);
                                          toast.success('Horario de paso guardado');
                                        }}
                                        style={{ flex: 1, background: themeColor, border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', padding: '4px', cursor: 'pointer', fontWeight: 600 }}
                                      >
                                        Ok
                                      </button>
                                      <button
                                        onClick={() => setEditingStopId(null)}
                                        style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '4px', color: '#fff', fontSize: '10px', padding: '4px', cursor: 'pointer' }}
                                      >
                                        X
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setEditingStopId(stop.id);
                                      setEditingStart(tf.start);
                                      setEditingEnd(tf.end);
                                    }}
                                    style={{
                                      background: hexToRgba(themeColor, 0.1),
                                      border: `1px solid ${hexToRgba(themeColor, 0.25)}`,
                                      borderRadius: '6px',
                                      color: themeColor,
                                      fontSize: '11px',
                                      padding: '4px 10px',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      borderStyle: 'solid'
                                    }}
                                  >
                                    Configurar Rango
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* GPS live tracker log table */}
                    <div style={{ marginTop: '36px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '24px' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 16px' }}>Registro de Control GPS en Vivo (Paso por Parada)</h4>
                      {gpsPassageLogs.length === 0 ? (
                        <div style={{ color: '#8f94a5', fontSize: '12px', textAlign: 'center', padding: '24px 0', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                          Esperando eventos de paso de la flota en el recorrido... (Los colectivos se sincronizan desde el mapa principal)
                        </div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                <th style={{ padding: '8px', color: '#8f94a5', fontWeight: 500 }}>Hora</th>
                                <th style={{ padding: '8px', color: '#8f94a5', fontWeight: 500 }}>Unidad</th>
                                <th style={{ padding: '8px', color: '#8f94a5', fontWeight: 500 }}>Chofer</th>
                                <th style={{ padding: '8px', color: '#8f94a5', fontWeight: 500 }}>Parada</th>
                                <th style={{ padding: '8px', color: '#8f94a5', fontWeight: 500 }}>Rango Prog.</th>
                                <th style={{ padding: '8px', color: '#8f94a5', fontWeight: 500 }}>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {gpsPassageLogs.map(log => (
                                <tr key={log.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '8px', color: '#fff', fontFamily: 'DM Mono' }}>{log.time}</td>
                                  <td style={{ padding: '8px', color: '#fff', fontWeight: 600 }}>{log.busUnit}</td>
                                  <td style={{ padding: '8px', color: '#a3a6b8' }}>{log.driver}</td>
                                  <td style={{ padding: '8px', color: '#fff' }}>{log.stopName}</td>
                                  <td style={{ padding: '8px', color: '#8f94a5', fontFamily: 'DM Mono' }}>{log.scheduled}</td>
                                  <td style={{ padding: '8px' }}>
                                    <span style={{
                                      background: log.status === 'A tiempo' ? 'rgba(34,211,160,0.08)' : (log.status === 'Demorado' ? 'rgba(255,77,106,0.08)' : 'rgba(240,180,41,0.08)'),
                                      border: `1px solid ${log.status === 'A tiempo' ? 'rgba(34,211,160,0.15)' : (log.status === 'Demorado' ? 'rgba(255,77,106,0.15)' : 'rgba(240,180,41,0.15)')}`,
                                      borderRadius: '4px',
                                      padding: '2px 6px',
                                      fontSize: '10px',
                                      color: log.status === 'A tiempo' ? '#22D3A0' : (log.status === 'Demorado' ? '#FF4D6A' : '#F0B429'),
                                      fontFamily: 'DM Mono',
                                      fontWeight: 600
                                    }}>
                                      {log.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Performance Chart Card */}
                    <div style={{
                      background: '#121527',
                      borderRadius: '12px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      padding: '24px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Pasajeros por Período</h3>
                          <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Flujo de subidas y bajadas registradas en el sistema</p>
                        </div>

                        {/* Filters & Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => {
                              setSelectedDate(e.target.value);
                              toast.success(`Mostrando datos de fecha: ${e.target.value}`);
                            }}
                            style={{
                              background: '#1b1d2e',
                              border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '6px',
                              color: '#fff',
                              fontSize: '11px',
                              padding: '4px 8px',
                              outline: 'none',
                              cursor: 'pointer',
                            }}
                          />
                          
                          <div style={{ display: 'flex', background: '#1b1d2e', padding: '2px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                            {(['day', 'week', 'month'] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => {
                                  setChartPeriod(p);
                                  toast.success(`Filtrado por: ${p === 'day' ? 'Día' : p === 'week' ? 'Semana' : 'Mes'}`);
                                }}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '4px',
                                  background: chartPeriod === p ? themeColor : 'transparent',
                                  border: 'none',
                                  color: chartPeriod === p ? '#fff' : '#a3a6b8',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  transition: 'all 200ms',
                                }}
                              >
                                {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : 'Mes'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Legend */}
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#a3a6b8' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: themeColor }} />
                            <span>Subidos</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8f94a5' }} />
                            <span>Bajados</span>
                          </div>
                        </div>
                      </div>

                      {currentChartData.length === 0 ? (
                        <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
                          <span style={{ color: '#8f94a5', fontSize: '12px', fontFamily: 'DM Sans' }}>No hay registros disponibles para la fecha seleccionada</span>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={220}>
                          <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={themeColor} stopOpacity={0.25} />
                                <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                            <XAxis dataKey="label" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
                            <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
                            <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="bajados" name="Bajados" stroke="#8f94a5" fill="none" strokeWidth={2} dot={false} />
                            <Area type="monotone" dataKey="subidos" name="Subidos" stroke={themeColor} fill="url(#colorRed)" strokeWidth={2.5} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Busiest Stops Card */}
                    <div
                      onClick={() => setTab('stops')}
                      style={{
                        background: '#121527',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '24px',
                        cursor: 'pointer',
                        transition: 'all 200ms'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = themeColor}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Paradas con mayor afluencia (Hoy)
                        </div>
                        <span style={{ fontSize: '11px', color: themeColor, fontWeight: 600 }}>Ver todas las paradas →</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {topStops.map((s, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{ width: '26px', color: '#8f94a5', fontWeight: 700, fontSize: '13px', textAlign: 'right', flexShrink: 0 }}>{i + 1}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ color: '#fff', fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{s.name}</span>
                                <span style={{ color: '#fff', fontSize: '12px', fontFamily: 'DM Mono', fontWeight: 600, flexShrink: 0, marginLeft: '8px' }}>{s.subidas} subidas</span>
                              </div>
                              <div style={{ height: '4px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '2px' }}>
                                <div style={{ height: '4px', borderRadius: '2px', background: themeColor, width: `${topStops[0]?.subidas ? (s.subidas / topStops[0].subidas) * 100 : 0}%` }} />
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
                  </>
                )}
              </div>
            )}

            {tab === 'buses' && <BusesTab buses={buses} themeColor={themeColor} />}
            {tab === 'drivers' && <CompanyDrivers drivers={currentDrivers} themeColor={themeColor} />}
            {tab === 'qrcodes' && (
              <QRTab
                qrCodes={qrCodes}
                newBusUnit={newBusUnit}
                setNewBusUnit={setNewBusUnit}
                onGenerate={generateQR}
                onDownload={downloadQR}
                themeColor={themeColor}
              />
            )}
            {tab === 'stops' && <StopsTab topStops={topStops} hourlyData={HOURLY} themeColor={themeColor} />}
            {tab === 'reports' && <CompanyReports reports={reports} onResolve={(id) => setReports(rs => rs.map(x => x.id === id ? { ...x, status: 'resolved' } : x))} themeColor={themeColor} />}
            {tab === 'calendar' && <CalendarTab themeColor={themeColor} />}
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
                  <span style={{ fontSize: '12px', color: '#8f94a5' }}>Pasajeros Totales (Hoy)</span>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: themeColor, marginTop: '4px' }}>{liveDailyPassengers.toLocaleString('es-ES')}</div>
                </div>
                {/* Sparkline wave */}
                <div style={{ width: '100px', height: '40px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { v: 10 }, { v: 18 }, { v: 12 }, { v: 28 }, { v: 22 }, { v: 36 }, { v: 29 }, { v: 45 }
                    ]}>
                      <Line type="monotone" dataKey="v" stroke={themeColor} strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.06)', margin: 0 }} />

              {/* SVG progress rings row - 3 columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                {/* Ring 1 - Ocupación */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                    <svg width="48" height="48" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke={themeColor} strokeWidth="3"
                        strokeDasharray="48 52" strokeDashoffset="25" strokeLinecap="round" />
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
                      48%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8f94a5', whiteSpace: 'nowrap' }}>Ocupación</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>48.2%</div>
                  </div>
                </div>

                {/* Ring 2 - Choferes */}
                {(() => {
                  const totalD = LINE_DRIVERS[activeLine.line_number]?.length || 5
                  const activeD = activeSessions.length
                  const pct = Math.min(100, Math.round((activeD / totalD) * 100))
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                        <svg width="48" height="48" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#00c689" strokeWidth="3"
                            strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="25" strokeLinecap="round" />
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
                          {pct}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#8f94a5', whiteSpace: 'nowrap' }}>Choferes</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{activeD}/{totalD}</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Ring 3 - Eco-Driving */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                  <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                    <svg width="48" height="48" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                      <circle cx="18" cy="18" r="15.915" fill="none" stroke="#22d3ee" strokeWidth="3"
                        strokeDasharray="92 8" strokeDashoffset="25" strokeLinecap="round" />
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
                      92%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#8f94a5', whiteSpace: 'nowrap' }}>Eco-Conduc.</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>92.0%</div>
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
                    background: themeColor,
                    border: 'none',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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
                      background: themeColor,
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
                                        todo.badge === 'Nuevo' ? hexToRgba(themeColor, 0.15) :
                                        todo.badge === 'Resuelto' ? 'rgba(0,198,137,0.15)' :
                                        'rgba(255,255,255,0.08)',
                            color: todo.badge === 'Urgente' ? '#ff4d6a' :
                                   todo.badge === 'Nuevo' ? themeColor :
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
                          fill: todo.flagged ? themeColor : 'none',
                          stroke: todo.flagged ? themeColor : 'currentColor',
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
              <button onClick={()=>downloadQR(selectedQR)} style={{flex:1,padding:'11px',borderRadius:'10px',background:hexToRgba(themeColor, 0.1),border:`1px solid ${hexToRgba(themeColor, 0.25)}`,color:themeColor,fontSize:'13px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                <Download size={14}/> Descargar
              </button>
              <button onClick={()=>setShowQRModal(false)} style={{flex:1,padding:'11px',borderRadius:'10px',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'#fff',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Passenger Logs Modal */}
      {showPassengerModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-dark" style={{ padding: '24px', borderRadius: '16px', maxWidth: '640px', width: '100%', margin: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>Planilla de Pasajeros de Hoy</h3>
                <p style={{ color: '#8f94a5', fontSize: '12px', margin: '4px 0 0' }}>Registro de ingresos y egresos registrados en la flota de la línea</p>
              </div>
              <button
                onClick={() => setShowPassengerModal(false)}
                style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', padding: '6px 12px', cursor: 'pointer' }}
              >
                Cerrar
              </button>
            </div>

            <div style={{ overflowY: 'auto', maxHeight: '360px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <th style={{ padding: '12px', color: '#8f94a5', fontWeight: 500 }}>Pasajero</th>
                    <th style={{ padding: '12px', color: '#8f94a5', fontWeight: 500 }}>Acción</th>
                    <th style={{ padding: '12px', color: '#8f94a5', fontWeight: 500 }}>Parada</th>
                    <th style={{ padding: '12px', color: '#8f94a5', fontWeight: 500 }}>Hora</th>
                    <th style={{ padding: '12px', color: '#8f94a5', fontWeight: 500 }}>Unidad</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Alejandro Gómez', action: 'Subió', stop: stops[0]?.name || 'Pueyrredón', time: '16:12', bus: '301' },
                    { name: 'María Rodríguez', action: 'Bajó', stop: stops[1]?.name || 'Corrientes', time: '16:15', bus: '301' },
                    { name: 'Javier López', action: 'Subió', stop: stops[2]?.name || 'Medrano', time: '16:22', bus: '302' },
                    { name: 'Ana Fernández', action: 'Subió', stop: stops[0]?.name || 'Pueyrredón', time: '16:34', bus: '303' },
                    { name: 'Diego Martínez', action: 'Bajó', stop: stops[2]?.name || 'Medrano', time: '16:45', bus: '302' },
                    { name: 'Sofia Romero', action: 'Subió', stop: stops[1]?.name || 'Corrientes', time: '16:50', bus: '301' },
                    { name: 'Nicolás Silva', action: 'Bajó', stop: stops[0]?.name || 'Pueyrredón', time: '16:55', bus: '303' },
                    { name: 'Estela Bianchi', action: 'Subió', stop: stops[3]?.name || 'Cabildo', time: '17:02', bus: '301' },
                    { name: 'Lucas Rossi', action: 'Subió', stop: stops[1]?.name || 'Corrientes', time: '17:10', bus: '302' }
                  ].map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{
                          background: p.action === 'Subió' ? 'rgba(34,211,160,0.1)' : 'rgba(255,77,106,0.1)',
                          color: p.action === 'Subió' ? '#22D3A0' : '#FF4D6A',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 600
                        }}>{p.action}</span>
                      </td>
                      <td style={{ padding: '10px 12px', color: '#a3a6b8' }}>{p.stop}</td>
                      <td style={{ padding: '10px 12px', color: '#8f94a5', fontFamily: 'DM Mono' }}>{p.time}</td>
                      <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600 }}>Coche {p.bus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes floatFade {
          0% {
            opacity: 0;
            transform: translateY(15px) scale(0.75);
          }
          20% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-30px) scale(0.85);
          }
        }
      `}</style>
    </div>
  )
}

function BusesTab({ buses, themeColor }: { buses: any[]; themeColor: string }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {buses.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px',color:'#8f94a5',fontFamily:'DM Mono',fontSize:'13px'}}>
          No hay colectivos activos en servicio para esta línea en este momento.
        </div>
      ) : (
        buses.map((b, i) => (
          <div key={i} style={{
            background: '#121527',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
          }}>
            <div style={{width:'42px',height:'42px',borderRadius:'12px',background:b.status==='moving'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',border:`1px solid ${b.status==='moving'?'rgba(34,211,160,0.25)':'rgba(184,200,224,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Bus size={18} style={{color:b.status==='moving'?'#22D3A0':'#8f94a5'}}/>
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>Unidad {b.bus_unit}</span>
                <span style={{padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600,background:b.status==='moving'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',color:b.status==='moving'?'#22D3A0':'#8f94a5',border:`1px solid ${b.status==='moving'?'rgba(34,211,160,0.2)':'rgba(184,200,224,0.1)'}`}}>
                  {b.status==='moving'?'EN MOVIMIENTO':'DETENIDO'}
                </span>
              </div>
              <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono'}}>
                {b.driver_name} {b.status==='moving'?`· ${b.passenger_count} pas · ${b.speed_kmh} km/h · rumbo ${b.heading}°`:''}
              </div>
            </div>
            {b.status==='moving'&&<div style={{flexShrink:0,textAlign:'right'}}>
              <div style={{color:'#22D3A0',fontSize:'12px',fontFamily:'DM Mono',fontWeight:600}}>{b.eta_minutes} min ETA</div>
            </div>}
          </div>
        ))
      )}
    </div>
  )
}

function CompanyDrivers({ drivers, themeColor }: { drivers: any[]; themeColor: string }) {
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
                <Star size={12} style={{color:themeColor,fill:themeColor}}/><span style={{color:'#fff',fontFamily:'DM Mono',fontWeight:700,fontSize:'13px'}}>{d.rating}</span>
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

function QRTab({qrCodes,newBusUnit,setNewBusUnit,onGenerate,onDownload,themeColor}:{qrCodes:any[];newBusUnit:string;setNewBusUnit:(v:string)=>void;onGenerate:()=>void;onDownload:(qr:any)=>void;themeColor:string}) {
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
          <button onClick={onGenerate} disabled={!newBusUnit.trim()} style={{padding:'13px 20px',borderRadius:'10px',background:hexToRgba(themeColor, 0.15),border:`1px solid ${hexToRgba(themeColor, 0.3)}`,color:themeColor,fontWeight:600,fontSize:'13px',cursor:newBusUnit.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',gap:'8px',flexShrink:0,transition:'all 200ms',opacity:newBusUnit.trim()?1:0.5}}>
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
              border: `1px solid ${selected?.id===qr.id?hexToRgba(themeColor, 0.35):'rgba(255, 255, 255, 0.06)'}`,
              padding: '16px',
              cursor: 'pointer',
              transition: 'all 200ms'
            }} onClick={()=>setSelected(selected?.id===qr.id?null:qr)}>
              <QRDisplay token={qr.qr_token} busUnit={qr.bus_unit}/>
              <div style={{marginTop:'14px',display:'flex',gap:'8px'}}>
                <button onClick={e=>{e.stopPropagation();onDownload(qr)}} style={{flex:1,padding:'8px',borderRadius:'8px',background:hexToRgba(themeColor, 0.1),border:`1px solid ${hexToRgba(themeColor, 0.25)}`,color:themeColor,fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
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
    </div>
  )
}

function StopsTab({ topStops, hourlyData, themeColor }: { topStops: any[]; hourlyData: any[]; themeColor: string }) {
  const barFill = hexToRgba(themeColor, 0.15)
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{color:'#8f94a5',fontSize:'12px',fontWeight:500,textTransform:'uppercase',marginBottom:'16px',letterSpacing:'0.05em'}}>Paradas más activas hoy</div>
        {topStops.map((s,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',marginBottom:i<topStops.length-1?'14px':'0'}}>
            <div style={{width: '26px', color: '#8f94a5', fontWeight: 700, fontSize: '13px', textAlign: 'right', flexShrink: 0}}>{i+1}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px'}}>
                <span style={{color:'#fff',fontSize:'13px',fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>{s.name}</span>
                <span style={{color:'#fff',fontSize:'12px',fontFamily:'DM Mono',fontWeight:600,flexShrink:0,marginLeft:'8px'}}>{s.subidas}</span>
              </div>
              <div style={{height:'4px',background:'rgba(255, 255, 255, 0.04)',borderRadius:'2px'}}>
                <div style={{height:'4px',borderRadius:'2px',background:themeColor,width:`${topStops[0]?.subidas ? (s.subidas/topStops[0].subidas)*100 : 0}%`}}/>
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
          <BarChart data={hourlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false}/>
            <XAxis dataKey="h" tick={{fill:'#8f94a5',fontSize:10}} interval={3}/>
            <YAxis tick={{fill:'#8f94a5',fontSize:10}}/>
            <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }}/>
            <Bar dataKey="subidas" name="Subidas" fill={barFill} stroke={themeColor} strokeWidth={1} radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CompanyReports({ reports, onResolve, themeColor }: { reports: any[]; onResolve: (id: string) => void; themeColor: string }) {
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
              <button onClick={()=>onResolve(r.id)} style={{flex:1,padding:'8px',borderRadius:'8px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)',color:'#22D3A0',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
                Marcar resuelto
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function CalendarTab({ themeColor }: { themeColor: string }) {
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
            <button key={i} onClick={()=>setSelected(selected?.date===d.date?null:d)} style={{aspectRatio:'1/1',borderRadius:'8px',background:d.hasWork?(selected?.date===d.date?hexToRgba(themeColor, 0.3):hexToRgba(themeColor, 0.12)):'rgba(184,200,224,0.04)',border:`1px solid ${d.hasWork?(selected?.date===d.date?hexToRgba(themeColor, 0.5):hexToRgba(themeColor, 0.2)):'rgba(184,200,224,0.06)'}`,cursor:'pointer',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'1px',transition:'all 200ms',padding:'4px'}}>
              <span style={{color:d.hasWork?themeColor:'#8f94a5',fontSize:'11px',fontWeight:d.hasWork?700:400,fontFamily:'DM Mono'}}>{d.label}</span>
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
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'10px',height:'10px',borderRadius:'3px',background:hexToRgba(themeColor, 0.12),border:`1px solid ${hexToRgba(themeColor, 0.2)}`}}/><span style={{color:'#8f94a5',fontSize:'11px'}}>Día trabajado</span></div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}><div style={{width:'10px',height:'10px',borderRadius:'3px',background:'rgba(184,200,224,0.04)',border:'1px solid rgba(184,200,224,0.06)'}}/><span style={{color:'#8f94a5',fontSize:'11px'}}>Sin actividad</span></div>
      </div>
    </div>
  )
}