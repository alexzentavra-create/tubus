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
import { MOCK_LINES, getMockStopsForLine, getMockRoutePathForLine, getMockRoutePathsForLine } from '@/lib/mockData'
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/maplibre'

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

type Tab = 'overview'|'buses'|'drivers'|'qrcodes'|'stops'|'reports'|'calendar'|'map'

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
      // Finder pattern top-left
      if (r < 7 && c < 7) {
        return r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      }
      // Finder pattern top-right
      if (r < 7 && c >= cells - 7) {
        const cc = c - (cells - 7)
        return r === 0 || r === 6 || cc === 0 || cc === 6 || (r >= 2 && r <= 4 && cc >= 2 && cc <= 4)
      }
      // Finder pattern bottom-left
      if (r >= cells - 7 && c < 7) {
        const rr = r - (cells - 7)
        return rr === 0 || rr === 6 || c === 0 || c === 6 || (rr >= 2 && rr <= 4 && c >= 2 && c <= 4)
      }
      
      // Random-looking modules based on hash
      return ((r * 17 + c * 23 + hash) % 2) === 0
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
  const activeLine = MOCK_LINES.find(l => l.line_number === selectedLineNumber) || MOCK_LINES[0]
  const themeColor = activeLine.color
  const [buses, setBuses] = useState<any[]>([])

  // Dynamic Chart Filters
  const [chartPeriod, setChartPeriod] = useState<'day' | 'week' | 'month'>('day')
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0])

  // Modals & Sub-views
  const [showPassengerModal, setShowPassengerModal] = useState(false)
  const [showPuntualidadTimeline, setShowPuntualidadTimeline] = useState(false)
  const [showMasDropdown, setShowMasDropdown] = useState(false)

  // Stops Timeframe Settings
  const [stopsTimeframes, setStopsTimeframes] = useState<Record<string, { start: string; end: string }>>({})
  const [editingStopId, setEditingStopId] = useState<string | null>(null)
  const [editingStart, setEditingStart] = useState<string>("06:00")
  const [editingEnd, setEditingEnd] = useState<string>("23:30")

  // Live GPS control logs
  const [gpsPassageLogs, setGpsPassageLogs] = useState<any[]>([])

  // Driver Warnings / Infractions
  const [driverWarnings, setDriverWarnings] = useState<Record<string, number>>({})
  useEffect(() => {
    const local = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mock_driver_warnings') || '{}') : {}
    setDriverWarnings(local)
  }, [selectedLineNumber])

  // Drivers List state & localStorage sync
  const [driversList, setDriversList] = useState<any[]>([])
  useEffect(() => {
    if (!activeLine) return
    const initialDrivers = getLineDrivers(activeLine.line_number)
    const stored = localStorage.getItem(`mock_drivers_${activeLine.line_number}`)
    if (stored) {
      setDriversList(JSON.parse(stored))
    } else {
      const enhanced = initialDrivers.map((d: any, idx: number) => ({
        ...d,
        id: `driver-${idx}-${Date.now()}`,
        dni: String(28000000 + idx * 45293),
        age: 32 + idx * 4,
        phone: `+54 9 11 ${5429 - idx * 100} 8234`,
        historyBuses: [`${activeLine.line_number}-301`, `${activeLine.line_number}-302`],
        historyDenuncias: idx % 3 === 0 ? [{ id: `rep-idx-${idx}`, type: 'No paró', date: 'Ayer', desc: 'El colectivo no paró...' }] : []
      }))
      setDriversList(enhanced)
      localStorage.setItem(`mock_drivers_${activeLine.line_number}`, JSON.stringify(enhanced))
    }
  }, [activeLine])

  const addWarning = (driverName: string, complaintType: string = 'Infracción', complaintDesc: string = 'Llamada de atención administrativa') => {
    // 1. Update warnings mapping
    setDriverWarnings(prev => {
      const updated = { ...prev, [driverName]: (prev[driverName] || 0) + 1 }
      localStorage.setItem('mock_driver_warnings', JSON.stringify(updated))
      return updated
    })

    // 2. Append to driver's historyDenuncias in profile list
    setDriversList(prevList => {
      const updatedList = prevList.map(d => {
        if (d.name === driverName) {
          const history = d.historyDenuncias || []
          return {
            ...d,
            reports: (d.reports || 0) + 1,
            historyDenuncias: [
              ...history,
              {
                id: `rep-${Date.now()}`,
                type: complaintType,
                date: 'Hoy',
                desc: complaintDesc
              }
            ]
          }
        }
        return d
      })
      localStorage.setItem(`mock_drivers_${activeLine.line_number}`, JSON.stringify(updatedList))
      return updatedList
    })

    toast.success(`Se ha añadido un punto de infracción y registrado en el historial de ${driverName}`);
  }

  const deleteDriver = (id: string) => {
    const updated = driversList.filter(d => d.id !== id)
    setDriversList(updated)
    localStorage.setItem(`mock_drivers_${activeLine.line_number}`, JSON.stringify(updated))
    toast.success('Chofer eliminado con éxito de los registros');
  }

  // Add Driver Form states
  const [showAddDriverModal, setShowAddDriverModal] = useState(false)
  const [newDriverName, setNewDriverName] = useState('')
  const [newDriverLegajo, setNewDriverLegajo] = useState('')
  const [newDriverDni, setNewDriverDni] = useState('')
  const [newDriverAge, setNewDriverAge] = useState('')
  const [newDriverPhone, setNewDriverPhone] = useState('')

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

  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; time: string; text: string; icon: string; color: string }>>([
    { id: '1', time: 'Hace 2m', text: 'Pico de pasajeros: Coche 301 reporta ocupación del 82%.', icon: '👥', color: '#22d3ee' },
    { id: '2', time: 'Hace 5m', text: 'Congestión en Av. Pueyrredón: demora de 4 min en Coche 302.', icon: '🚦', color: '#ff4d6a' },
    { id: '3', time: 'Hace 12m', text: 'Conducción eficiente: Coche 303 califica con 98% en Eco-Driving.', icon: '🍃', color: '#00c689' },
  ])

  useEffect(() => {
    const EVENT_TEMPLATES = [
      { text: 'Congestión moderada detectada en Av. Cabildo para Coche 305.', icon: '🚦', color: '#ff4d6a' },
      { text: 'Unidad 302 reporta conducción eficiente excepcional (100% Eco).', icon: '🍃', color: '#00c689' },
      { text: 'Frecuencia regularizada: tiempo de espera reducido a 5 min.', icon: '⏱️', color: '#22D3A0' },
      { text: 'Alta afluencia de pasajeros en parada Pueyrredón.', icon: '👥', color: '#22d3ee' },
      { text: 'Unidad 304 reanudó ruta habitual tras desvío por obras.', icon: '✅', color: '#00c689' },
      { text: 'Coche 301 finalizó recorrido habitual sin novedades.', icon: '🏁', color: '#8f94a5' },
    ]

    const interval = setInterval(() => {
      const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)]
      const newEvent = {
        id: Math.random().toString(),
        time: 'Ahora',
        text: template.text,
        icon: template.icon,
        color: template.color
      }
      setLiveEvents(prev => {
        const updatedPrev = prev.map((e, idx) => ({
          ...e,
          time: idx === 0 ? 'Hace 1m' : `Hace ${(idx + 1) * 3}m`
        }))
        return [newEvent, ...updatedPrev].slice(0, 3)
      })
    }, 12000)
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
        const localQRs = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]').filter((q: any) => q.company_id === comp.id) : []
        setQrCodes(qrs ? [...qrs, ...localQRs] : localQRs)

        const {data:sessions} = await supabase
          .from('driver_sessions')
          .select('*, profiles!driver_id(name)')
          .eq('company_id',comp.id)
          .eq('is_active',true)
        const localSessions = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('mock_active_sessions') || '[]').filter((s: any) => s.company_id === comp.id) : []
        setActiveSessions(sessions ? [...sessions, ...localSessions] : localSessions)
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
    const defaultTimeframes: Record<string, { start: string; end: string }> = {}
    stops.forEach((s, idx) => {
      const startMin = idx * 10
      const endMin = idx * 10 + 30
      
      const formatTime = (totalMin: number) => {
        const h = Math.floor(totalMin / 60) % 24
        const m = totalMin % 60
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      }
      
      defaultTimeframes[s.id] = {
        start: formatTime(360 + startMin), // starts around 06:00 + idx*10
        end: formatTime(1410 + endMin)     // ends around 23:30 + idx*10
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
            const defaultStart = matchedStop.stop_number ? `${String(Math.floor((360 + (matchedStop.stop_number - 1) * 10) / 60)).padStart(2, '0')}:${String(((matchedStop.stop_number - 1) * 10) % 60).padStart(2, '0')}` : "06:00"
            const defaultEnd = matchedStop.stop_number ? `${String(Math.floor((1440 + (matchedStop.stop_number - 1) * 10) / 60) % 24).padStart(2, '0')}:${String(((matchedStop.stop_number - 1) * 10 + 30) % 60).padStart(2, '0')}` : "23:30"
            const tf = stopsTimeframes[matchedStop.id] || { start: defaultStart, end: defaultEnd }
            
            const timeToMin = (t: string) => {
              const [h, m] = t.split(':').map(Number)
              return h * 60 + m
            }
            
            const currentMinOfDay = currentHour * 60 + currentMin
            const startMinOfDay = timeToMin(tf.start)
            const endMinOfDay = timeToMin(tf.end)
            
            const inTimeframe = currentMinOfDay >= startMinOfDay && currentMinOfDay <= endMinOfDay
            const isLate = currentMinOfDay > endMinOfDay
            const status = inTimeframe ? 'A tiempo' : (isLate ? 'Demorado' : 'Adelantado')

            updated.unshift({
              id: logId,
              busUnit: bus.bus_unit,
              driver: bus.driver_name,
              stopName: matchedStop.name,
              time: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}:${String(currentSec).padStart(2, '0')}`,
              scheduled: `${tf.start} - ${tf.end} hs`,
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

    // Enforce uniqueness of QR codes per bus unit for the active line
    const exists = qrCodes.some(qr => qr.bus_unit.toLowerCase() === newBusUnit.trim().toLowerCase())
    if (exists) {
      toast.error(`La unidad ${newBusUnit} ya tiene un código QR asignado.`);
      return;
    }

    let qrData: any = null
    const {data,error} = await supabase.from('bus_qr_codes').insert({
      company_id: company.id,
      line_id: activeLine.id,
      bus_unit: newBusUnit.trim(),
    }).select().single()

    if (error || !data) {
      // Fallback fallback storage
      qrData = {
        id: `mock-qr-${Date.now()}`,
        company_id: company.id,
        line_id: activeLine.id,
        bus_unit: newBusUnit.trim(),
        qr_token: `DEMO-QR-L${activeLine.line_number}-${newBusUnit.trim()}-${Math.floor(Math.random() * 1000)}`,
        is_active: true,
        created_at: new Date().toISOString()
      }
      const prevQRs = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
      localStorage.setItem('mock_bus_qr_codes', JSON.stringify([...prevQRs, qrData]))
    } else {
      qrData = data
    }

    setQrCodes(prev => [...prev, qrData])
    setNewBusUnit('')
    setSelectedQR(qrData)
    setShowQRModal(true)
    toast.success(`QR generado para unidad ${newBusUnit}`)
  }

  const deleteQR = async (id: string) => {
    await supabase.from('bus_qr_codes').delete().eq('id', id)
    
    // Always clear from localStorage too
    const prevQRs = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
    localStorage.setItem('mock_bus_qr_codes', JSON.stringify(prevQRs.filter((q: any) => q.id !== id)))

    setQrCodes(prev => prev.filter(qr => qr.id !== id))
    if (selectedQR?.id === id) setSelectedQR(null)
    toast.success('Código QR eliminado correctamente');
  }

  const downloadQR = (qr: any) => {
    toast.success('QR descargado (función disponible en producción)')
  }

  const handleAddDriver = () => {
    if (!newDriverName.trim() || !newDriverLegajo.trim() || !newDriverDni.trim()) {
      toast.error('Por favor, completa los campos requeridos (Nombre, Legajo y DNI)');
      return;
    }
    const newDriver = {
      id: `driver-${Date.now()}`,
      name: newDriverName.trim(),
      legajo: newDriverLegajo.trim(),
      dni: newDriverDni.trim(),
      age: parseInt(newDriverAge) || 30,
      phone: newDriverPhone.trim() || '+54 9 11 5000 0000',
      sessions: 0,
      onTime: 100,
      rating: "5.0",
      reports: 0,
      lastActive: 'Sin actividad reciente',
      historyBuses: [],
      historyDenuncias: []
    }
    const updated = [...driversList, newDriver]
    setDriversList(updated)
    localStorage.setItem(`mock_drivers_${activeLine.line_number}`, JSON.stringify(updated))
    setShowAddDriverModal(false)
    
    // Clear inputs
    setNewDriverName('')
    setNewDriverLegajo('')
    setNewDriverDni('')
    setNewDriverAge('')
    setNewDriverPhone('')
    toast.success(`Chofer ${newDriver.name} registrado con éxito`);
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
            { label: 'Resumen', id: 'overview', onClick: () => { setTab('overview'); setShowPuntualidadTimeline(false); }, isActive: tab === 'overview' && !showPuntualidadTimeline },
            { label: 'Flota', id: 'buses', onClick: () => { setTab('buses'); setShowPuntualidadTimeline(false); }, isActive: tab === 'buses' },
            { label: 'Choferes', id: 'drivers', onClick: () => { setTab('drivers'); setShowPuntualidadTimeline(false); }, isActive: tab === 'drivers' },
            { label: 'Historial', id: 'calendar', onClick: () => { setTab('calendar'); setShowPuntualidadTimeline(false); }, isActive: tab === 'calendar' },
            { label: 'Puntualidad', id: 'punctuality', onClick: () => { setTab('overview'); setShowPuntualidadTimeline(true); }, isActive: tab === 'overview' && showPuntualidadTimeline },
            { label: 'Códigos QR', id: 'qrcodes', onClick: () => { setTab('qrcodes'); setShowPuntualidadTimeline(false); }, isActive: tab === 'qrcodes' },
            { label: 'Denuncias', id: 'reports', onClick: () => { setTab('reports'); setShowPuntualidadTimeline(false); }, isActive: tab === 'reports' },
            { label: 'Mapa', id: 'map', onClick: () => { setTab('map'); setShowPuntualidadTimeline(false); }, isActive: tab === 'map' },
            { label: 'Cerrar Sesión', id: 'logout', onClick: () => {
              const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
              if (url.includes('placeholder.supabase.co')) {
                window.location.href = '/login'
              } else {
                supabase.auth.signOut().then(() => { window.location.href = '/login' })
              }
            }, isActive: false }
          ].map((item) => {
            return (
              <span
                key={item.label}
                onClick={item.onClick}
                style={{
                  fontSize: '14px',
                  fontWeight: item.isActive ? 600 : 500,
                  color: item.id === 'logout' ? '#ff4d6a' : (item.isActive ? '#fff' : '#8f94a5'),
                  borderBottom: item.isActive ? `2px solid ${themeColor}` : 'none',
                  paddingBottom: '4px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                }}
              >
                {item.label}
              </span>
            )
          })}
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
                                <p style={{ fontSize: '11px', color: '#8f94a5', margin: '4px 0 0' }}>Horario de paso programado: <span style={{ color: '#fff', fontWeight: 600 }}>{tf.start} a {tf.end} hs</span></p>
                                
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
                                      <span style={{ fontSize: '10px', color: '#8f94a5' }}>Inicio:</span>
                                      <input
                                        type="time"
                                        value={editingStart}
                                        onChange={(e) => setEditingStart(e.target.value)}
                                        style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '2px 4px', outline: 'none' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                      <span style={{ fontSize: '10px', color: '#8f94a5' }}>Fin:</span>
                                      <input
                                        type="time"
                                        value={editingEnd}
                                        onChange={(e) => setEditingEnd(e.target.value)}
                                        style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '4px', color: '#fff', fontSize: '11px', padding: '2px 4px', outline: 'none' }}
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
                                        Cancelar
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
                                    Configurar Horario
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
                          {chartPeriod !== 'week' && chartPeriod !== 'month' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8f94a5' }} />
                              <span>Bajados</span>
                            </div>
                          )}
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
                            {chartPeriod !== 'week' && chartPeriod !== 'month' && (
                              <Area type="monotone" dataKey="bajados" name="Bajados" stroke="#8f94a5" fill="none" strokeWidth={2} dot={false} />
                            )}
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
            {tab === 'drivers' && (
              <CompanyDrivers
                drivers={driversList}
                activeSessions={activeSessions}
                driverWarnings={driverWarnings}
                onDeleteDriver={deleteDriver}
                onAddDriverClick={() => setShowAddDriverModal(true)}
                themeColor={themeColor}
              />
            )}
            {tab === 'qrcodes' && (
              <QRTab
                qrCodes={qrCodes}
                newBusUnit={newBusUnit}
                setNewBusUnit={setNewBusUnit}
                onGenerate={generateQR}
                onDownload={downloadQR}
                onDelete={deleteQR}
                themeColor={themeColor}
              />
            )}
            {tab === 'stops' && <StopsTab topStops={topStops} hourlyData={HOURLY} themeColor={themeColor} />}
            {tab === 'reports' && <CompanyReports reports={reports} driverWarnings={driverWarnings} onAddWarning={addWarning} onResolve={(id) => setReports(rs => rs.map(x => x.id === id ? { ...x, status: 'resolved' } : x))} themeColor={themeColor} />}
            {tab === 'calendar' && <CalendarTab themeColor={themeColor} activeStats={activeStats} />}
            {tab === 'map' && (
              <MapTab
                activeLine={activeLine}
                activeSessions={activeSessions}
                driversList={driversList}
                themeColor={themeColor}
              />
            )}
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

              {/* Novedades en Vivo / Live Events Feed */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#8f94a5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Novedades en Vivo</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {liveEvents.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'rgba(255, 255, 255, 0.015)',
                        border: '1px solid rgba(255, 255, 255, 0.03)',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        color: '#dfe2ec',
                        lineHeight: '1.4',
                      }}
                    >
                      <span style={{ fontSize: '13px', display: 'inline-block', marginTop: '1px' }}>{evt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontSize: '10px', color: evt.color, fontWeight: 700 }}>AUTODETECTADO</span>
                          <span style={{ fontSize: '9px', color: '#8f94a5', fontFamily: 'DM Mono' }}>{evt.time}</span>
                        </div>
                        <div>{evt.text}</div>
                      </div>
                    </div>
                  ))}
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

      {/* Add Driver Modal */}
      {showAddDriverModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-dark" style={{ padding: '24px', borderRadius: '16px', maxWidth: '450px', width: '100%', margin: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: '0 0 8px' }}>Registrar Nuevo Chofer</h3>
            <p style={{ color: '#8f94a5', fontSize: '12px', margin: '0 0 20px' }}>Ingrese la información del perfil del conductor para darlo de alta en el sistema.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', color: '#8f94a5', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>Nombre Completo <span style={{ color: '#ff4d6a' }}>*</span></label>
                <input
                  type="text"
                  placeholder="ej. Juan Carlos Pérez"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', color: '#8f94a5', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>DNI / Documento <span style={{ color: '#ff4d6a' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="ej. 32954823"
                    value={newDriverDni}
                    onChange={(e) => setNewDriverDni(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8f94a5', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>Legajo Interno <span style={{ color: '#ff4d6a' }}>*</span></label>
                  <input
                    type="text"
                    placeholder="ej. L12-583"
                    value={newDriverLegajo}
                    onChange={(e) => setNewDriverLegajo(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', color: '#8f94a5', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>Edad</label>
                  <input
                    type="number"
                    placeholder="ej. 35"
                    value={newDriverAge}
                    onChange={(e) => setNewDriverAge(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', color: '#8f94a5', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>Teléfono de Contacto</label>
                  <input
                    type="text"
                    placeholder="ej. +54 9 11 5824 9342"
                    value={newDriverPhone}
                    onChange={(e) => setNewDriverPhone(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setShowAddDriverModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDriver}
                style={{ flex: 2, padding: '11px', borderRadius: '10px', background: themeColor, border: 'none', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Guardar Chofer
              </button>
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

function CompanyDrivers({ drivers, activeSessions = [], driverWarnings = {}, onDeleteDriver, onAddDriverClick, themeColor }: { drivers: any[]; activeSessions?: any[]; driverWarnings?: Record<string, number>; onDeleteDriver: (id: string) => void; onAddDriverClick: () => void; themeColor: string }) {
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null)

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      {/* Header with Add Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#121527', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '16px 20px' }}>
        <div>
          <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 600, margin: 0 }}>Registro Oficial de Conductores</h4>
          <p style={{ color: '#8f94a5', fontSize: '11px', margin: '2px 0 0' }}>Administre los perfiles, sanciones y datos de contacto de la línea</p>
        </div>
        <button
          onClick={onAddDriverClick}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: themeColor,
            color: '#fff',
            border: 'none',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 200ms'
          }}
        >
          <Plus size={14}/> Agregar Chofer
        </button>
      </div>

      {drivers.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px',color:'#8f94a5',fontFamily:'DM Mono',fontSize:'13px',background:'#121527',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.06)'}}>
          No hay choferes registrados en esta línea.
        </div>
      ) : (
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {drivers.map((d,i)=>{
            const activeSession = activeSessions.find((s: any) => s.profiles?.name === d.name)
            const warningsCount = driverWarnings[d.name] || 0
            const isExpanded = expandedDriverId === d.id

            return (
              <div key={d.id || i} style={{
                background: '#121527',
                borderRadius: '12px',
                border: isExpanded ? `1.5px solid ${themeColor}` : (activeSession ? `1px solid ${hexToRgba(themeColor, 0.4)}` : '1px solid rgba(255, 255, 255, 0.06)'),
                padding: '16px 20px',
                boxShadow: isExpanded ? `0 0 15px ${hexToRgba(themeColor, 0.15)}` : (activeSession ? `0 0 12px ${hexToRgba(themeColor, 0.08)}` : 'none'),
                transition: 'all 200ms'
              }}>
                <div style={{display:'flex',alignItems:'center',gap:'14px',cursor:'pointer'}} onClick={() => setExpandedDriverId(isExpanded ? null : d.id)}>
                  <div style={{width:'44px',height:'44px',borderRadius:'12px',background:activeSession ? hexToRgba(themeColor, 0.15) : 'rgba(255,255,255,0.02)',border:activeSession ? `1px solid ${hexToRgba(themeColor, 0.3)}` : '1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <Users size={18} style={{color:activeSession ? themeColor : '#8f94a5'}}/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                      <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>{d.name}</span>
                      {activeSession && (
                        <span style={{
                          padding:'2px 8px',
                          borderRadius:'999px',
                          background:'rgba(34,211,160,0.08)',
                          border:'1px solid rgba(34,211,160,0.2)',
                          color:'#22D3A0',
                          fontSize:'9px',
                          fontWeight:600,
                          textTransform:'uppercase',
                          letterSpacing:'0.03em'
                        }}>
                          En servicio · Colectivo {activeSession.bus_unit}
                        </span>
                      )}
                      {warningsCount > 0 && (
                        <span style={{
                          padding:'2px 8px',
                          borderRadius:'999px',
                          background:'rgba(255,77,106,0.08)',
                          border:'1px solid rgba(255,77,106,0.2)',
                          color:'#FF4D6A',
                          fontSize:'9px',
                          fontWeight:600,
                          textTransform:'uppercase',
                          letterSpacing:'0.03em'
                        }}>
                          ⚠️ {warningsCount} {warningsCount === 1 ? 'Sanción' : 'Sanciones'}
                        </span>
                      )}
                    </div>
                    <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.legajo} · último: {activeSession ? 'Activo ahora' : d.lastActive}</div>
                  </div>
                  <div style={{textAlign:'right',display:'flex',alignItems:'center',gap:'12px'}}>
                    <div>
                      <div style={{display:'flex',alignItems:'center',gap:'4px',justifyContent:'flex-end'}}>
                        <Star size={12} style={{color:themeColor,fill:themeColor}}/><span style={{color:'#fff',fontFamily:'DM Mono',fontWeight:700,fontSize:'13px'}}>{d.rating}</span>
                      </div>
                      {d.reports>0&&<div style={{color:'#FF4D6A',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px'}}>{d.reports} denuncia</div>}
                    </div>
                    <ChevronDown size={16} style={{color:'#8f94a5',transform:isExpanded ? 'rotate(180deg)' : 'none',transition:'transform 200ms'}}/>
                  </div>
                </div>

                {/* Expanded Details Panel */}
                {isExpanded && (
                  <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      {/* Left side: General Profile */}
                      <div>
                        <h5 style={{ color: '#fff', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Perfil General</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8f94a5' }}>Documento (DNI):</span>
                            <span style={{ color: '#fff', fontWeight: 500, fontFamily: 'DM Mono' }}>{d.dni || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8f94a5' }}>Edad:</span>
                            <span style={{ color: '#fff', fontWeight: 500 }}>{d.age || '—'} años</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8f94a5' }}>Número de contacto:</span>
                            <span style={{ color: '#fff', fontWeight: 500, fontFamily: 'DM Mono' }}>{d.phone || '—'}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#8f94a5' }}>Legajo interno:</span>
                            <span style={{ color: '#fff', fontWeight: 500, fontFamily: 'DM Mono' }}>{d.legajo}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: History & Denuncias */}
                      <div>
                        <h5 style={{ color: '#fff', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Historial y Sanciones</h5>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                          <div>
                            <span style={{ color: '#8f94a5', display: 'block', marginBottom: '4px' }}>Colectivos Conducidos:</span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {(d.historyBuses || []).length === 0 ? (
                                <span style={{ color: '#64748b' }}>Sin historial de unidades</span>
                              ) : (
                                (d.historyBuses || []).map((bus: string, bIdx: number) => (
                                  <span key={bIdx} style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', color: '#fff', fontFamily: 'DM Mono' }}>{bus}</span>
                                ))
                              )}
                            </div>
                          </div>
                          <div>
                            <span style={{ color: '#8f94a5', display: 'block', marginBottom: '4px' }}>Registro de Denuncias:</span>
                            {(d.historyDenuncias || []).length === 0 ? (
                              <span style={{ color: '#64748b' }}>Chofer sin denuncias activas</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {(d.historyDenuncias || []).map((rep: any, rIdx: number) => (
                                  <div key={rIdx} style={{ padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,77,106,0.04)', border: '1px solid rgba(255,77,106,0.1)', color: '#8f94a5' }}>
                                    <div style={{ color: '#ff4d6a', fontWeight: 600, fontSize: '11px' }}>{rep.type} · {rep.date}</div>
                                    <div style={{ fontSize: '10px', marginTop: '2px' }}>{rep.desc}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stats strip */}
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:20,borderTop:'1px dashed rgba(255,255,255,0.04)',paddingTop:16}}>
                      {[{label:'Sesiones',value:d.sessions},{label:'A tiempo',value:`${d.onTime}%`},{label:'Sanciones (Puntos)',value:warningsCount}].map(({label,value})=>(
                        <div key={label} style={{background:'rgba(6,8,16,0.3)',borderRadius:'8px',padding:'8px',textAlign:'center'}}>
                          <div style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>{value}</div>
                          <div style={{color:'#8f94a5',fontSize:'10px',fontFamily:'DM Mono',marginTop:'2px'}}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Delete Action bar */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`¿Estás seguro de eliminar a ${d.name} de los registros?`)) {
                            onDeleteDriver(d.id);
                          }
                        }}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '6px',
                          background: 'rgba(255,77,106,0.08)',
                          border: '1px solid rgba(255,77,106,0.2)',
                          color: '#ff4d6a',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 200ms'
                        }}
                      >
                        <Trash2 size={12}/> Eliminar Chofer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function QRTab({qrCodes,newBusUnit,setNewBusUnit,onGenerate,onDownload,onDelete,themeColor}:{qrCodes:any[];newBusUnit:string;setNewBusUnit:(v:string)=>void;onGenerate:()=>void;onDownload:(qr:any)=>void;onDelete:(id:string)=>void;themeColor:string}) {
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
          El QR generado debe ser impreso y colocado en el colectivo. Cuando el chofer lo escaneara, el sistema lo asocia automáticamente con ese vehículo y chofer en tiempo real.
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
                <button onClick={e=>{e.stopPropagation();onDelete(qr.id)}} style={{padding:'8px',borderRadius:'8px',background:'rgba(255, 77, 106, 0.1)',border:'1px solid rgba(255, 77, 106, 0.25)',color:'#ff4d6a',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Trash2 size={12}/>
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

function CompanyReports({ reports, driverWarnings = {}, onAddWarning, onResolve, themeColor }: { reports: any[]; driverWarnings?: Record<string, number>; onAddWarning: (driver: string) => void; onResolve: (id: string) => void; themeColor: string }) {
  const statusStyle:Record<string,any>={pending:{bg:'rgba(240,180,41,0.08)',c:'#F0B429',b:'rgba(240,180,41,0.2)'},resolved:{bg:'rgba(34,211,160,0.08)',c:'#22D3A0',b:'rgba(34,211,160,0.2)'}}
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {reports.map(r=>{
        const warnings = driverWarnings[r.driver] || 0
        
        return (
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
                <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono'}}>
                  <span style={{color:'#fff',fontWeight:500}}>{r.driver}</span> {warnings > 0 ? <span style={{color:'#FF4D6A',fontWeight:600}}>(⚠️ {warnings} sanc.)</span> : ''} · Unidad {r.bus} · {r.stop} · {r.time}
                </div>
              </div>
            </div>
            
            <div style={{display:'flex',gap:'8px',marginTop:'4px',alignItems:'center'}}>
              {r.status==='pending' && (
                <button onClick={()=>onResolve(r.id)} style={{flex:2,padding:'8px',borderRadius:'8px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)',color:'#22D3A0',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
                  Marcar resuelto
                </button>
              )}
              <button onClick={()=>onAddWarning(r.driver)} style={{flex:1,padding:'8px 12px',borderRadius:'8px',background:'rgba(255,77,106,0.08)',border:'1px solid rgba(255,77,106,0.25)',color:'#FF4D6A',fontSize:'11px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                <AlertTriangle size={12}/> Penalizar (+1 Punto)
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function getColorConfig(val: number, avg: number) {
  if (val < avg * 0.9) {
    return {
      bg: 'rgba(255, 77, 106, 0.1)',
      border: 'rgba(255, 77, 106, 0.25)',
      text: '#ff4d6a',
      label: 'Menor al promedio (< -10%)'
    }
  } else if (val > avg * 1.1) {
    return {
      bg: 'rgba(0, 198, 137, 0.1)',
      border: 'rgba(0, 198, 137, 0.25)',
      text: '#00c689',
      label: 'Mayor al promedio (> +10%)'
    }
  } else {
    return {
      bg: 'rgba(240, 180, 41, 0.1)',
      border: 'rgba(240, 180, 41, 0.25)',
      text: '#F0B429',
      label: 'Rango promedio (±10%)'
    }
  }
}

function CalendarTab({ themeColor, activeStats }: { themeColor: string; activeStats: { rating: string; punctuality: string; dailyPas: number } }) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [selected, setSelected] = useState<any>(null)
  const [historyBaseMonth, setHistoryBaseMonth] = useState<string>(format(new Date(), 'yyyy-MM'))

  const getRichDetails = (item: any) => {
    if (!item) return null;
    const seed = item.passengers;
    const stopsList = [
      { name: 'Plaza Italia', flow: Math.round(seed * 0.28) },
      { name: 'Estación Palermo', flow: Math.round(seed * 0.22) },
      { name: 'Barrancas de Belgrano', flow: Math.round(seed * 0.18) }
    ];
    const activeBuses = item.type === 'day'
      ? [`Coche ${item.bus}`, `Coche 30${(seed % 4) + 1}`, `Coche 305`]
      : [`Coche 301`, `Coche 302`, `Coche 304`, `Coche 305`].slice(0, item.busesCount || 4);
    const peakHour = (seed % 2 === 0) ? '08:00 - 09:30 (Pico Mañana)' : '17:30 - 19:00 (Pico Tarde)';
    const subeGeneralPct = 70 + (seed % 10);
    const studentPct = 15 - (seed % 5);
    const retiredPct = 100 - subeGeneralPct - studentPct;
    return { stopsList, activeBuses, peakHour, ticketStats: { subeGeneralPct, studentPct, retiredPct } };
  };

  // Parse custom month base date in local timezone securely
  const [yearStr, monthStr] = historyBaseMonth.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monthStr, 10)
  const monthEnd = new Date(year, month, 0)
  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month
  const targetEnd = isCurrentMonth ? today : monthEnd

  // 1. Day Data (last 30 days)
  const days = []
  for (let i = 0; i < 30; i++) {
    const d = subDays(targetEnd, 29 - i)
    const seed = i * 7.5
    const pct = 0.6 + ((seed * 17) % 80) / 100
    const passengers = Math.round(activeStats.dailyPas * pct)
    days.push({
      type: 'day',
      date: d,
      label: format(d, 'd'),
      dayName: format(d, 'EEE', { locale: es }),
      passengers,
      bus: ['001', '003', '005', '002', '004'][i % 5],
      hours: `${6 + (i % 4)}:00 - ${14 + (i % 4)}:00`
    })
  }
  let totalDayPas = 0
  for (const d of days) totalDayPas += d.passengers
  const dayAvg = Math.round(totalDayPas / 30)

  // 2. Week Data (last 12 weeks)
  const weeks = []
  for (let i = 0; i < 12; i++) {
    const d = subDays(targetEnd, (11 - i) * 7)
    const seed = i * 11.2
    const pct = 0.8 + ((seed * 23) % 40) / 100
    const passengers = Math.round(activeStats.dailyPas * 7 * pct)
    weeks.push({
      type: 'week',
      date: d,
      label: `S${i + 1}`,
      dateRange: `${format(subDays(d, 6), 'd MMM', { locale: es })} - ${format(d, 'd MMM', { locale: es })}`,
      passengers,
      busesCount: 5 + (i % 4),
      busiestDayName: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][i % 6]
    })
  }
  let totalWeekPas = 0
  for (const w of weeks) totalWeekPas += w.passengers
  const weekAvg = Math.round(totalWeekPas / 12)

  // 3. Month Data (last 6 months)
  const months = []
  for (let i = 0; i < 6; i++) {
    const d = subDays(targetEnd, (5 - i) * 30)
    const seed = i * 19.8
    const pct = 0.85 + ((seed * 31) % 30) / 100
    const passengers = Math.round(activeStats.dailyPas * 30 * pct)
    months.push({
      type: 'month',
      date: d,
      label: format(d, 'MMMM', { locale: es }),
      year: format(d, 'yyyy'),
      passengers,
      busiestDay: format(subDays(d, 5 + (i % 10)), "d 'de' MMMM", { locale: es }),
      avgDaily: Math.round(passengers / 30)
    })
  }
  let totalMonthPas = 0
  for (const m of months) totalMonthPas += m.passengers
  const monthAvg = Math.round(totalMonthPas / 6)

  // Determine current items and averages
  const currentAvg = viewMode === 'day' ? dayAvg : viewMode === 'week' ? weekAvg : monthAvg

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      {/* Calendar container */}
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        {/* Header selectors */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>
            {viewMode === 'day' ? 'Historial Diario — últimos 30 días' : viewMode === 'week' ? 'Historial Semanal — últimas 12 semanas' : 'Historial Mensual — últimos 6 meses'}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#8f94a5', fontSize: '12px' }}>Ver mes:</span>
              <input
                type="month"
                value={historyBaseMonth}
                max={format(new Date(), 'yyyy-MM')}
                onChange={(e) => {
                  setHistoryBaseMonth(e.target.value);
                  setSelected(null);
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
            </div>

            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', padding: '2px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { label: 'Día', mode: 'day' },
                { label: 'Semana', mode: 'week' },
                { label: 'Mes', mode: 'month' }
              ].map((btn) => (
                <button
                  key={btn.mode}
                  onClick={() => { setViewMode(btn.mode as any); setSelected(null); }}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    background: viewMode === btn.mode ? 'rgba(255,255,255,0.08)' : 'transparent',
                    border: 'none',
                    color: viewMode === btn.mode ? '#fff' : '#8f94a5',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Grids */}
        {viewMode === 'day' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(10,1fr)',gap:'6px'}}>
            {days.map((d,i)=>{
              const colors = getColorConfig(d.passengers, dayAvg)
              const isSelected = selected?.type === 'day' && selected?.date === d.date
              return (
                <button
                  key={i}
                  onClick={() => setSelected(isSelected ? null : d)}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: '8px',
                    background: isSelected ? hexToRgba(colors.text, 0.3) : colors.bg,
                    border: `1px solid ${isSelected ? colors.text : colors.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    transition: 'all 200ms',
                    padding: '4px'
                  }}
                >
                  <span style={{color: colors.text, fontSize: '13px', fontWeight: 700, fontFamily: 'DM Mono'}}>{d.label}</span>
                  <span style={{color: '#8f94a5', fontSize: '8px', fontFamily: 'DM Mono', textTransform: 'uppercase'}}>{d.dayName}</span>
                  <span style={{color: '#fff', fontSize: '7.5px', fontFamily: 'DM Mono', opacity: 0.65}}>{(d.passengers / 1000).toFixed(1)}k</span>
                </button>
              )
            })}
          </div>
        )}

        {viewMode === 'week' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px'}}>
            {weeks.map((w,i)=>{
              const colors = getColorConfig(w.passengers, weekAvg)
              const isSelected = selected?.type === 'week' && selected?.label === w.label
              return (
                <button
                  key={i}
                  onClick={() => setSelected(isSelected ? null : w)}
                  style={{
                    borderRadius: '10px',
                    background: isSelected ? hexToRgba(colors.text, 0.3) : colors.bg,
                    border: `1px solid ${isSelected ? colors.text : colors.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 200ms',
                    padding: '12px 6px'
                  }}
                >
                  <span style={{color: colors.text, fontSize: '14px', fontWeight: 700}}>{w.label}</span>
                  <span style={{color: '#8f94a5', fontSize: '9px', fontFamily: 'DM Mono'}}>{w.dateRange}</span>
                  <span style={{color: '#fff', fontSize: '11px', fontFamily: 'DM Mono', fontWeight: 600, marginTop: '2px'}}>{w.passengers.toLocaleString('es-ES')} pas</span>
                </button>
              )
            })}
          </div>
        )}

        {viewMode === 'month' && (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'10px'}}>
            {months.map((m,i)=>{
              const colors = getColorConfig(m.passengers, monthAvg)
              const isSelected = selected?.type === 'month' && selected?.label === m.label
              return (
                <button
                  key={i}
                  onClick={() => setSelected(isSelected ? null : m)}
                  style={{
                    borderRadius: '10px',
                    background: isSelected ? hexToRgba(colors.text, 0.3) : colors.bg,
                    border: `1px solid ${isSelected ? colors.text : colors.border}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    transition: 'all 200ms',
                    padding: '16px 8px'
                  }}
                >
                  <span style={{color: colors.text, fontSize: '14px', fontWeight: 700, textTransform: 'capitalize'}}>{m.label}</span>
                  <span style={{color: '#8f94a5', fontSize: '10px', fontFamily: 'DM Mono'}}>{m.year}</span>
                  <span style={{color: '#fff', fontSize: '12px', fontFamily: 'DM Mono', fontWeight: 600, marginTop: '2px'}}>{m.passengers.toLocaleString('es-ES')} pas</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Details Panel */}
      {selected && (
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '24px',
          animation: 'fadeIn 200ms ease-out'
        }}>
          {/* Title Header */}
          <div style={{
            color: themeColor,
            fontSize: '15px',
            fontWeight: 600,
            textTransform: 'uppercase',
            marginBottom: '20px',
            letterSpacing: '0.05em',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            paddingBottom: '12px'
          }}>
            {selected.type === 'day' && `Detalle Operativo del Día: ${format(selected.date, "EEEE d 'de' MMMM", { locale: es })}`}
            {selected.type === 'week' && `Detalle Operativo de la ${selected.label} (${selected.dateRange})`}
            {selected.type === 'month' && `Detalle Operativo del Mes: ${selected.label} ${selected.year}`}
          </div>

          {/* Grid Layout of Details */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
            
            {/* Box 1: Pasajeros y Demanda */}
            <div style={{ background: 'rgba(6,8,16,0.3)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Pasajeros y Demanda</div>
              <div style={{ color: getColorConfig(selected.passengers, selected.type === 'day' ? dayAvg : selected.type === 'week' ? weekAvg : monthAvg).text, fontSize: '24px', fontWeight: 700 }}>
                {selected.passengers.toLocaleString('es-ES')}
              </div>
              <div style={{ color: '#8f94a5', fontSize: '12px', marginTop: '4px' }}>
                {selected.type === 'day' ? 'Pasajeros totales' : selected.type === 'week' ? 'Pasajeros de la semana' : 'Pasajeros del mes'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: '#fff' }}>Pico:</span>
                <span style={{ fontSize: '12px', color: themeColor, fontWeight: 600 }}>{getRichDetails(selected)?.peakHour}</span>
              </div>
            </div>

            {/* Box 2: Paradas Críticas */}
            <div style={{ background: 'rgba(6,8,16,0.3)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Paradas Críticas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {getRichDetails(selected)?.stopsList.map((stop, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                    <span style={{ color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      {index + 1}. {stop.name}
                    </span>
                    <span style={{ color: '#8f94a5', fontFamily: 'DM Mono' }}>{stop.flow.toLocaleString('es-ES')} pas</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Box 3: Flota Asignada */}
            <div style={{ background: 'rgba(6,8,16,0.3)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Flota Asignada</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {getRichDetails(selected)?.activeBuses.map((bus, idx) => (
                  <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>
                    {bus}
                  </span>
                ))}
              </div>
              <div style={{ color: '#8f94a5', fontSize: '11px', marginTop: '12px' }}>
                {selected.type === 'day' ? `Horario: ${selected.hours}` : `${selected.busesCount || 4} coches registrados`}
              </div>
            </div>

            {/* Box 4: Medios de Pago (SUBE) */}
            <div style={{ background: 'rgba(6,8,16,0.3)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Medios de Pago (SUBE)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#fff' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>General</span>
                    <span style={{ fontFamily: 'DM Mono' }}>{getRichDetails(selected)?.ticketStats.subeGeneralPct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}>
                    <div style={{ background: themeColor, height: '100%', borderRadius: '2px', width: `${getRichDetails(selected)?.ticketStats.subeGeneralPct}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Estudiantil</span>
                    <span style={{ fontFamily: 'DM Mono' }}>{getRichDetails(selected)?.ticketStats.studentPct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}>
                    <div style={{ background: '#22d3ee', height: '100%', borderRadius: '2px', width: `${getRichDetails(selected)?.ticketStats.studentPct}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>Jubilados</span>
                    <span style={{ fontFamily: 'DM Mono' }}>{getRichDetails(selected)?.ticketStats.retiredPct}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}>
                    <div style={{ background: '#00c689', height: '100%', borderRadius: '2px', width: `${getRichDetails(selected)?.ticketStats.retiredPct}%` }} />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{display:'flex',alignItems:'center',gap:'16px',flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'12px',height:'12px',borderRadius:'4px',background:'rgba(0, 198, 137, 0.1)',border:'1px solid rgba(0, 198, 137, 0.25)'}}/>
          <span style={{color:'#8f94a5',fontSize:'11px'}}>{"Mayor al promedio (> +10%)"}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'12px',height:'12px',borderRadius:'4px',background:'rgba(240, 180, 41, 0.1)',border:'1px solid rgba(240, 180, 41, 0.25)'}}/>
          <span style={{color:'#8f94a5',fontSize:'11px'}}>Rango promedio (±10%)</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
          <div style={{width:'12px',height:'12px',borderRadius:'4px',background:'rgba(255, 77, 106, 0.1)',border:'1px solid rgba(255, 77, 106, 0.25)'}}/>
          <span style={{color:'#8f94a5',fontSize:'11px'}}>{"Menor al promedio (< -10%)"}</span>
        </div>
      </div>
    </div>
  )
}

const CARTODB_DARK = {
  version: 8,
  sources: {
    "cartodb-dark-tiles": {
      type: "raster",
      tiles: [
        "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
        "https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"
      ],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors, © CartoDB"
    }
  },
  layers: [
    {
      id: "cartodb-dark-layer",
      type: "raster",
      source: "cartodb-dark-tiles",
      minzoom: 0,
      maxzoom: 20
    }
  ]
}

function MapTab({ activeLine, activeSessions = [], driversList = [], themeColor }: { activeLine: any; activeSessions?: any[]; driversList?: any[]; themeColor: string }) {
  const [direction, setDirection] = useState<'ida' | 'vuelta'>('ida')
  const [stops, setStops] = useState<any[]>([])
  const [routePath, setRoutePath] = useState<any[]>([])
  const [blockedStops, setBlockedStops] = useState<string[]>([])
  const [activeDetour, setActiveDetour] = useState<any>(null)
  
  const [viewState, setViewState] = useState({
    latitude: -34.6037,
    longitude: -58.3816,
    zoom: 12.2
  })

  const [selectedBus, setSelectedBus] = useState<any>(null)
  const [selectedStop, setSelectedStop] = useState<any>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Detour panel states
  const [showDetourPanel, setShowDetourPanel] = useState(false)
  const [detourReason, setDetourReason] = useState<'accident' | 'protest' | 'construction' | 'traffic'>('accident')
  const [detourStartStopId, setDetourStartStopId] = useState('')
  const [detourEndStopId, setDetourEndStopId] = useState('')

  // Add stop states
  const [mapClickMode, setMapClickMode] = useState<'none' | 'add_stop'>('none')
  const [newStopName, setNewStopName] = useState('')
  const [newStopCoords, setNewStopCoords] = useState<{ lat: number; lng: number } | null>(null)

  // Load stops and route path
  useEffect(() => {
    const loadedStops = getMockStopsForLine(activeLine, direction)
    setStops(loadedStops)

    const loadedPath = getMockRoutePathForLine(activeLine, direction)
    setRoutePath(loadedPath)

    const blocked = JSON.parse(localStorage.getItem(`mock_blocked_stops_${activeLine.line_number}`) || '[]')
    setBlockedStops(blocked)

    const detour = JSON.parse(localStorage.getItem(`mock_detour_${activeLine.line_number}_${direction}`) || 'null')
    setActiveDetour(detour)

    setIsDirty(false)

    // Center map on the first stop
    if (loadedStops.length > 0) {
      setViewState({
        latitude: loadedStops[0].latitude,
        longitude: loadedStops[0].longitude,
        zoom: 12.5
      })
    }
  }, [activeLine, direction])

  // Helper to find closest point in path
  const findClosestPathIndex = (path: { lat: number; lng: number }[], lat: number, lng: number): number => {
    if (path.length === 0) return -1
    let minDistance = Infinity
    let closestIndex = -1
    for (let i = 0; i < path.length; i++) {
      const dist = Math.hypot(path[i].lat - lat, path[i].lng - lng)
      if (dist < minDistance) {
        minDistance = dist
        closestIndex = i
      }
    }
    return closestIndex
  }

  // Handle stop block toggle
  const toggleStopBlock = (stopId: string) => {
    let updated: string[] = []
    if (blockedStops.includes(stopId)) {
      updated = blockedStops.filter(id => id !== stopId)
      toast.success("Parada desbloqueada temporariamente")
    } else {
      updated = [...blockedStops, stopId]
      toast.success("Parada bloqueada")
    }
    setBlockedStops(updated)
    setIsDirty(true)
    
    // Update local state isBlocked
    setStops((prev: any[]) => prev.map(s => s.id === stopId ? {
      ...s,
      isBlocked: updated.includes(stopId),
      name: updated.includes(stopId) && !s.name.includes('[BLOQUEADA]') ? `[BLOQUEADA] ${s.name}` : s.name.replace('[BLOQUEADA] ', '')
    } : s))

    if (selectedStop?.id === stopId) {
      setSelectedStop((prev: any) => ({
        ...prev,
        isBlocked: updated.includes(stopId),
        name: updated.includes(stopId) && !prev.name.includes('[BLOQUEADA]') ? `[BLOQUEADA] ${prev.name}` : prev.name.replace('[BLOQUEADA] ', '')
      }))
    }
  }

  // Remove stop
  const removeStop = (stopId: string) => {
    const updatedStops = stops.filter(s => s.id !== stopId)
    setStops(updatedStops)
    setIsDirty(true)
    setSelectedStop(null)
    toast.success("Parada eliminada de la ruta")
  }

  // Apply detour
  const applyDetour = () => {
    if (!detourStartStopId || !detourEndStopId) {
      toast.error("Por favor selecciona ambas paradas de inicio y reingreso")
      return
    }
    const startStop = stops.find(s => s.id === detourStartStopId)
    const endStop = stops.find(s => s.id === detourEndStopId)

    if (!startStop || !endStop) {
      toast.error("Paradas seleccionadas no encontradas")
      return
    }

    const startIndex = stops.findIndex(s => s.id === detourStartStopId)
    const endIndex = stops.findIndex(s => s.id === detourEndStopId)

    if (startIndex >= endIndex) {
      toast.error("La parada de reingreso debe ser posterior a la parada de salida")
      return
    }

    // Generate smooth detour points (curving north/east)
    const midLat = (startStop.latitude + endStop.latitude) / 2
    const midLng = (startStop.longitude + endStop.longitude) / 2
    
    // Smooth offset for detour visual curve
    const latOffset = 0.005
    const lngOffset = 0.005

    const detourPoints = [
      { lat: startStop.latitude, lng: startStop.longitude },
      { lat: midLat + latOffset, lng: midLng - lngOffset },
      { lat: midLat + latOffset * 1.3, lng: midLng + lngOffset * 0.4 },
      { lat: endStop.latitude, lng: endStop.longitude }
    ]

    const pathStartIdx = findClosestPathIndex(routePath, startStop.latitude, startStop.longitude)
    const pathEndIdx = findClosestPathIndex(routePath, endStop.latitude, endStop.longitude)

    let newPath = [...routePath]
    if (pathStartIdx !== -1 && pathEndIdx !== -1 && pathStartIdx < pathEndIdx) {
      newPath = [
        ...routePath.slice(0, pathStartIdx + 1),
        ...detourPoints,
        ...routePath.slice(pathEndIdx)
      ]
    }

    setRoutePath(newPath)
    setActiveDetour({
      reason: detourReason,
      startId: detourStartStopId,
      endId: detourEndStopId,
      points: detourPoints
    })
    setIsDirty(true)
    toast.success("Desvío aplicado temporalmente en el mapa")
  }

  // Clear detour
  const clearDetour = () => {
    setActiveDetour(null)
    setDetourStartStopId('')
    setDetourEndStopId('')
    
    // Reload original path
    const loadedPath = getMockRoutePathForLine(activeLine, direction)
    setRoutePath(loadedPath)
    setIsDirty(true)
    toast.success("Desvío removido. Recorrido original restaurado.")
  }

  // Save changes to localStorage
  const saveChanges = () => {
    localStorage.setItem(`mock_blocked_stops_${activeLine.line_number}`, JSON.stringify(blockedStops))
    localStorage.setItem(`mock_custom_stops_${activeLine.line_number}_${direction}`, JSON.stringify(stops))
    localStorage.setItem(`mock_route_path_${activeLine.line_number}_${direction}`, JSON.stringify(routePath))
    if (activeDetour) {
      localStorage.setItem(`mock_detour_${activeLine.line_number}_${direction}`, JSON.stringify(activeDetour))
    } else {
      localStorage.removeItem(`mock_detour_${activeLine.line_number}_${direction}`)
    }
    setIsDirty(false)
    toast.success("¡Cambios operativos guardados y sincronizados con pasajeros y choferes!")
  }

  // Handle click on map to add stop
  const handleMapClick = (e: any) => {
    if (mapClickMode !== 'add_stop') return
    const lat = e.lngLat.lat
    const lng = e.lngLat.lng
    setNewStopCoords({ lat, lng })
  }

  // Confirm new stop addition
  const confirmAddStop = () => {
    if (!newStopName.trim()) {
      toast.error("Por favor ingresa un nombre para la parada")
      return
    }
    if (!newStopCoords) {
      toast.error("Haz clic en el mapa para colocar la parada")
      return
    }

    const newStop = {
      id: `stop-custom-${Date.now()}`,
      line_id: activeLine.id,
      name: newStopName.trim(),
      street_name: newStopName.trim(),
      stop_number: stops.length + 1,
      latitude: newStopCoords.lat,
      longitude: newStopCoords.lng,
      direction: direction,
      avg_wait_minutes: 6,
      total_daily_users: 75
    }

    const updatedStops = [...stops, newStop]
    setStops(updatedStops)

    // Insert new stop coordinate in routePath
    const closestIdx = findClosestPathIndex(routePath, newStopCoords.lat, newStopCoords.lng)
    let newPath = [...routePath]
    if (closestIdx !== -1) {
      newPath.splice(closestIdx + 1, 0, { lat: newStopCoords.lat, lng: newStopCoords.lng })
    }

    setRoutePath(newPath)
    setIsDirty(true)
    setNewStopCoords(null)
    setNewStopName('')
    setMapClickMode('none')
    toast.success(`Parada "${newStop.name}" añadida exitosamente`)
  }

  // Active buses for this line in real-time
  const activeBuses = activeSessions
    .filter(s => s.line_id === activeLine.id)
    .map(s => {
      // Find driver info
      const driver = driversList.find(d => d.name === s.profiles?.name) || { name: s.profiles?.name || 'Chofer Auxiliar', rating: '4.8' }
      return {
        id: s.id,
        bus_unit: s.bus_unit,
        latitude: s.latitude || -34.6037 + (Math.random() - 0.5) * 0.03,
        longitude: s.longitude || -58.3816 + (Math.random() - 0.5) * 0.03,
        speed_kmh: s.speed_kmh || Math.floor(Math.random() * 25) + 15,
        heading: s.heading || Math.floor(Math.random() * 360),
        status: s.status || 'moving',
        driverName: driver.name
      }
    })

  // Format GeoJSON path
  const routeGeoJson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: routePath.map(p => [p.lng, p.lat])
        },
        properties: {}
      }
    ]
  }

  // Format Detour GeoJSON bypass
  const detourGeoJson = activeDetour ? {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: activeDetour.points.map((p: any) => [p.lng, p.lat])
        },
        properties: {}
      }
    ]
  } : null

  return (
    <div style={{ display: 'flex', gap: '20px', height: '620px', background: '#0b0f19', borderRadius: '16px', overflow: 'hidden' }}>
      
      {/* MAP VIEW */}
      <div style={{ flex: 1, position: 'relative', background: '#121527', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        
        {/* Visual indicators */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(10,15,30,0.85)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Activity size={12} style={{ color: themeColor }}/> Mapa Operativo · Línea {activeLine.line_number}
          </div>
          {activeDetour && (
            <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,77,106,0.15)', border: '1px solid rgba(255,77,106,0.3)', color: '#FF4D6A', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚠️ Desvío Activo: {activeDetour.reason === 'accident' ? 'Accidente' : activeDetour.reason === 'protest' ? 'Corte/Protesta' : activeDetour.reason === 'construction' ? 'Obras' : 'Tránsito Pesado'}
            </div>
          )}
        </div>

        <Map
          {...viewState}
          onMove={e => setViewState(e.viewState)}
          mapStyle={CARTODB_DARK as any}
          style={{ width: '100%', height: '100%' }}
          onClick={handleMapClick}
        >
          {/* Route path line */}
          <Source id="route-path" type="geojson" data={routeGeoJson as any}>
            <Layer
              id="route-line-glow"
              type="line"
              paint={{ 'line-color': themeColor, 'line-width': 8, 'line-opacity': 0.15, 'line-blur': 2 }}
            />
            <Layer
              id="route-line"
              type="line"
              paint={{ 'line-color': themeColor, 'line-width': 3, 'line-opacity': 0.7 }}
            />
          </Source>

          {/* Detour path line */}
          {detourGeoJson && (
            <Source id="detour-path" type="geojson" data={detourGeoJson as any}>
              <Layer
                id="detour-line"
                type="line"
                paint={{ 'line-color': '#F59E0B', 'line-width': 3, 'line-dasharray': [2, 2], 'line-opacity': 0.9 }}
              />
            </Source>
          )}

          {/* Render Stops */}
          {stops.map(s => {
            const isBlocked = blockedStops.includes(s.id)
            return (
              <Marker key={s.id} latitude={s.latitude} longitude={s.longitude} anchor="center">
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedStop(s)
                    setSelectedBus(null)
                  }}
                  style={{
                    width: isBlocked ? '16px' : '11px',
                    height: isBlocked ? '16px' : '11px',
                    borderRadius: '50%',
                    background: isBlocked ? '#FF4D6A' : 'rgba(255,255,255,0.85)',
                    border: `2px solid ${isBlocked ? '#fff' : themeColor}`,
                    boxShadow: isBlocked ? '0 0 10px #FF4D6A' : `0 0 6px ${themeColor}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    transition: 'all 200ms'
                  }}
                >
                  {isBlocked ? '✕' : ''}
                </div>
              </Marker>
            )
          })}

          {/* Render Active Buses */}
          {activeBuses.map(b => (
            <Marker key={b.id} latitude={b.latitude} longitude={b.longitude} anchor="center">
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedBus(b)
                  setSelectedStop(null)
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: themeColor,
                  border: '1.5px solid #fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Bus size={10} style={{ color: '#fff' }}/>
                {b.bus_unit}
              </div>
            </Marker>
          ))}

          {/* Render Add Stop Preview Pin */}
          {newStopCoords && (
            <Marker latitude={newStopCoords.lat} longitude={newStopCoords.lng} anchor="bottom">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ background: '#10B981', color: '#fff', padding: '3px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 600, border: '1px solid #fff', whiteSpace: 'nowrap' }}>
                  Nueva Parada
                </div>
                <div style={{ width: '4px', height: '8px', background: '#10B981' }}/>
              </div>
            </Marker>
          )}

          {/* Popups */}
          {selectedBus && (
            <Popup
              latitude={selectedBus.latitude}
              longitude={selectedBus.longitude}
              closeButton={true}
              closeOnClick={false}
              onClose={() => setSelectedBus(null)}
              anchor="top"
            >
              <div style={{ color: '#fff', minWidth: '160px', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '6px', color: themeColor }}>
                  Unidad {selectedBus.bus_unit}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px' }}>
                  <div><span style={{ color: '#8f94a5' }}>Chofer:</span> <strong style={{ color: '#fff' }}>{selectedBus.driverName}</strong></div>
                  <div><span style={{ color: '#8f94a5' }}>Velocidad:</span> <strong style={{ color: '#fff' }}>{selectedBus.speed_kmh} km/h</strong></div>
                  <div><span style={{ color: '#8f94a5' }}>Estado:</span> <span style={{ color: selectedBus.status === 'moving' ? '#22D3A0' : '#8f94a5', fontWeight: 600 }}>{selectedBus.status === 'moving' ? 'EN MOVIMIENTO' : 'DETENIDO'}</span></div>
                </div>
              </div>
            </Popup>
          )}

          {selectedStop && (
            <Popup
              latitude={selectedStop.latitude}
              longitude={selectedStop.longitude}
              closeButton={true}
              closeOnClick={false}
              onClose={() => setSelectedStop(null)}
              anchor="top"
            >
              <div style={{ color: '#fff', minWidth: '180px', fontFamily: 'DM Sans, sans-serif' }}>
                <div style={{ fontWeight: 700, fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px', marginBottom: '8px' }}>
                  {selectedStop.name.replace('[BLOQUEADA] ', '')}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <button
                    onClick={() => toggleStopBlock(selectedStop.id)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      background: selectedStop.isBlocked ? 'rgba(34,211,160,0.15)' : 'rgba(255,77,106,0.15)',
                      border: `1px solid ${selectedStop.isBlocked ? '#22D3A0' : '#FF4D6A'}`,
                      color: selectedStop.isBlocked ? '#22D3A0' : '#FF4D6A',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {selectedStop.isBlocked ? 'Desbloquear Parada' : 'Bloquear Parada'}
                  </button>
                  <button
                    onClick={() => removeStop(selectedStop.id)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#a3a6b8',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                  >
                    Eliminar Parada
                  </button>
                </div>
              </div>
            </Popup>
          )}
        </Map>
      </div>

      {/* CONTROL SIDEBAR */}
      <div style={{ width: '320px', background: '#121527', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>Control de Ruta</h4>
          <p style={{ color: '#8f94a5', fontSize: '11px', margin: '2px 0 0' }}>Administre desvíos, bloqueos y paradas</p>
        </div>

        {/* Direction Selector */}
        <div>
          <label style={{ display: 'block', color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Sentido del Recorrido</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              onClick={() => { setDirection('ida'); setSelectedStop(null); }}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: direction === 'ida' ? hexToRgba(themeColor, 0.15) : 'rgba(255,255,255,0.02)',
                border: `1.5px solid ${direction === 'ida' ? themeColor : 'rgba(255,255,255,0.08)'}`,
                color: direction === 'ida' ? '#fff' : '#8f94a5',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Ida
            </button>
            <button
              onClick={() => { setDirection('vuelta'); setSelectedStop(null); }}
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: direction === 'vuelta' ? hexToRgba(themeColor, 0.15) : 'rgba(255,255,255,0.02)',
                border: `1.5px solid ${direction === 'vuelta' ? themeColor : 'rgba(255,255,255,0.08)'}`,
                color: direction === 'vuelta' ? '#fff' : '#8f94a5',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Vuelta
            </button>
          </div>
        </div>

        {/* Emergency Detours Section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600 }}>Desvío de Emergencia</span>
            {activeDetour && (
              <span style={{ fontSize: '10px', color: '#F59E0B', background: 'rgba(245,158,11,0.1)', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>ACTIVO</span>
            )}
          </div>

          {!showDetourPanel && !activeDetour ? (
            <button
              onClick={() => setShowDetourPanel(true)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              + Configurar Desvío
            </button>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', color: '#8f94a5', fontSize: '10px', marginBottom: '4px' }}>Motivo del Desvío</label>
                <select
                  value={detourReason}
                  onChange={(e) => setDetourReason(e.target.value as any)}
                  style={{ width: '100%', background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: '#fff', fontSize: '11px', outline: 'none' }}
                >
                  <option value="accident">Accidente de tránsito</option>
                  <option value="protest">Corte / Protesta</option>
                  <option value="construction">Obra en calzada</option>
                  <option value="traffic">Congestión Grave</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#8f94a5', fontSize: '10px', marginBottom: '4px' }}>Parada de Salida (Corte)</label>
                <select
                  value={detourStartStopId}
                  onChange={(e) => setDetourStartStopId(e.target.value)}
                  style={{ width: '100%', background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: '#fff', fontSize: '11px', outline: 'none' }}
                >
                  <option value="">Seleccionar parada...</option>
                  {stops.map(s => (
                    <option key={s.id} value={s.id}>{s.name.replace('[BLOQUEADA] ', '')}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#8f94a5', fontSize: '10px', marginBottom: '4px' }}>Parada de Reingreso</label>
                <select
                  value={detourEndStopId}
                  onChange={(e) => setDetourEndStopId(e.target.value)}
                  style={{ width: '100%', background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: '#fff', fontSize: '11px', outline: 'none' }}
                >
                  <option value="">Seleccionar parada...</option>
                  {stops.map(s => (
                    <option key={s.id} value={s.id}>{s.name.replace('[BLOQUEADA] ', '')}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                {activeDetour ? (
                  <button
                    onClick={clearDetour}
                    style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.2)', color: '#FF4D6A', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Quitar Desvío
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowDetourPanel(false)}
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a6b8', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
                    >
                      Atrás
                    </button>
                    <button
                      onClick={applyDetour}
                      style={{ flex: 2, padding: '6px', borderRadius: '6px', background: themeColor, color: '#fff', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Aplicar
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add Stops tools */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          <label style={{ display: 'block', color: '#fff', fontSize: '12px', fontWeight: 600, marginBottom: '8px' }}>Gestión de Paradas</label>
          
          {mapClickMode !== 'add_stop' ? (
            <button
              onClick={() => { setMapClickMode('add_stop'); toast("Haz clic en cualquier punto del mapa para colocar la nueva parada", { icon: 'ℹ️' }); }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              + Agregar Nueva Parada
            </button>
          ) : (
            <div style={{ background: 'rgba(16,185,129,0.04)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ color: '#10B981', fontSize: '11px', fontWeight: 600 }}>Modo: Colocar Parada</div>
              
              {!newStopCoords ? (
                <div style={{ color: '#8f94a5', fontSize: '10px', fontStyle: 'italic' }}>Haz clic en el mapa para colocar el marcador</div>
              ) : (
                <>
                  <div style={{ color: '#fff', fontSize: '10px' }}>Coordenadas: {newStopCoords.lat.toFixed(5)}, {newStopCoords.lng.toFixed(5)}</div>
                  <input
                    type="text"
                    placeholder="Nombre de parada..."
                    value={newStopName}
                    onChange={(e) => setNewStopName(e.target.value)}
                    style={{ width: '100%', background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', padding: '6px', borderRadius: '6px', color: '#fff', fontSize: '11px', outline: 'none' }}
                  />
                </>
              )}

              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <button
                  onClick={() => { setMapClickMode('none'); setNewStopCoords(null); }}
                  style={{ flex: 1, padding: '5px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a6b8', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmAddStop}
                  disabled={!newStopCoords}
                  style={{ flex: 1.5, padding: '5px', borderRadius: '6px', background: '#10B981', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer', opacity: newStopCoords ? 1 : 0.5 }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Global Save Actions */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
          {isDirty && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#F59E0B', fontSize: '11px', marginBottom: '8px', fontWeight: 600 }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B', display: 'inline-block', animation: 'pulse 1.5s infinite' }}/>
              Tienes cambios sin guardar
            </div>
          )}
          <button
            onClick={saveChanges}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '8px',
              background: themeColor,
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: `0 4px 12px ${hexToRgba(themeColor, 0.25)}`
            }}
          >
            Guardar Cambios Operativos
          </button>
        </div>
      </div>
      
    </div>
  )
}