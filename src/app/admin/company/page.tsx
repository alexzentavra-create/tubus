'use client'
import { useState, useEffect, useMemo } from 'react'
import {
  Bus, Users, QrCode, MapPin, AlertTriangle, Activity,
  Download, LogOut, RefreshCw, Plus, Calendar, Clock,
  ChevronRight, Star, Wifi, WifiOff, CheckCircle, XCircle,
  TrendingUp, BarChart2, Share2, Printer, Trash2, ChevronDown, CheckCircle2,
  Circle, Flag, Info, Bell, MessageSquarePlus
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

// Password row with show/hide toggle for driver credential display
function PasswordRow({ password, themeColor }: { password: string; themeColor: string }) {
  const [show, setShow] = useState(false)
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: '#8f94a5' }}>Contraseña:</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#e2e8f0', fontWeight: 500, fontFamily: 'DM Mono', fontSize: '12px', letterSpacing: show ? 'normal' : '0.15em' }}>
          {show ? password : '••••••••'}
        </span>
        <button
          onClick={() => setShow(s => !s)}
          title={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: show ? themeColor : '#64748b', padding: '2px', display: 'flex', alignItems: 'center', transition: 'color 150ms' }}
        >
          {show
            ? <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            : <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          }
        </button>
      </div>
    </div>
  )
}

import { QRCodeDisplay } from '@/components/common/QRCodeDisplay'

function QRDisplay({ token, busUnit }: { token: string; busUnit: string }) {
  return <QRCodeDisplay token={token} busUnit={busUnit} size={160} />
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
  const [newBusHasAC, setNewBusHasAC] = useState(true)
  const [newBusIsNew, setNewBusIsNew] = useState(true)
  const [newBusHasRamp, setNewBusHasRamp] = useState(false)
  const [activeSessions, setActiveSessions] = useState<any[]>([])

  const [selectedLineNumber, setSelectedLineNumber] = useState<string>('12')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activeLine = localStorage.getItem('active_company_line') || '12'
      setSelectedLineNumber(activeLine)
    }
  }, [])
  const activeLine = MOCK_LINES.find(l => l.line_number === selectedLineNumber) || MOCK_LINES[0]
  const themeColor = activeLine.color
  const [buses, setBuses] = useState<any[]>([])
  const [selectedComplaintForDetail, setSelectedComplaintForDetail] = useState<any>(null)

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

  // Inactive QR Code warnings state
  const [qrWarnings, setQrWarnings] = useState<any[]>([])

  // Todo Drag-and-drop state & handlers
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }
  const handleDragOver = (e: any) => {
    e.preventDefault()
  }
  const handleDrop = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return
    setTodos(prev => {
      const copy = [...prev]
      const [moved] = copy.splice(draggedIndex, 1)
      copy.splice(index, 0, moved)
      return copy
    })
    setDraggedIndex(null)
  }

  // Support chat states & effect
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [supportMessages, setSupportMessages] = useState<any[]>([])
  const [supportInput, setSupportInput] = useState('')

  // Platform updates & suggestions states
  const [showUpdatesModal, setShowUpdatesModal] = useState(false)
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false)
  const [suggestionDesc, setSuggestionDesc] = useState('')
  const [suggestionImg, setSuggestionImg] = useState<string | null>(null)

  // Share & Clean Export states
  const [showShareModal, setShowShareModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportTarget, setExportTarget] = useState<'excel' | 'google'>('excel')
  const [exportSelBuses, setExportSelBuses] = useState(true)
  const [exportSelDrivers, setExportSelDrivers] = useState(true)
  const [exportSelPunctuality, setExportSelPunctuality] = useState(true)
  const [exportSelReports, setExportSelReports] = useState(true)

  const handleSuggestionSubmit = () => {
    if (!suggestionDesc.trim()) {
      toast.error('Por favor ingresa una descripción para tu sugerencia.')
      return
    }
    const newSuggestion = {
      id: `sug-${Date.now()}`,
      description: suggestionDesc,
      image: suggestionImg,
      timestamp: new Date().toISOString()
    }
    try {
      const prev = JSON.parse(localStorage.getItem('mock_suggestions') || '[]')
      localStorage.setItem('mock_suggestions', JSON.stringify([...prev, newSuggestion]))
    } catch (e) {
      console.error(e)
    }
    
    toast.success('¡Muchas gracias! Tu sugerencia fue enviada al equipo de desarrollo.')
    setSuggestionDesc('')
    setSuggestionImg(null)
    setShowSuggestionsModal(false)
  }

  const handleImgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setSuggestionImg(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  useEffect(() => {
    const defaultMsgs = [
      { id: 'msg-1', sender: 'superadmin', text: '¡Hola! Bienvenido al canal de soporte oficial de BienParada. ¿En qué podemos ayudarte hoy con el panel de tu línea?', time: '09:00' }
    ]
    const stored = localStorage.getItem('mock_support_messages')
    if (stored) {
      setSupportMessages(JSON.parse(stored))
    } else {
      setSupportMessages(defaultMsgs)
      localStorage.setItem('mock_support_messages', JSON.stringify(defaultMsgs))
    }
  }, [])

  const sendSupportMessage = () => {
    if (!supportInput.trim()) return
    const text = supportInput.trim()
    const userMsg = {
      id: `msg-u-${Date.now()}`,
      sender: 'user',
      text: text,
      time: format(new Date(), 'HH:mm')
    }
    
    setSupportMessages(prev => {
      const next = [...prev, userMsg]
      localStorage.setItem('mock_support_messages', JSON.stringify(next))
      return next
    })
    setSupportInput('')

    // Mock response from Super Admin
    setTimeout(() => {
      const replies = [
        "Entendido. Hemos recibido tu consulta. Un de los Super Administradores la revisará a la brevedad.",
        "Gracias por contactarnos. ¿Podrías indicarnos el número de coche o chofer afectado para investigar?",
        "Hola, registramos tu solicitud sobre los datos del recorrido. Ya lo estamos revisando con el equipo técnico.",
        "Perfecto, procesando tu reporte. Te avisaremos por este canal cuando esté resuelto."
      ]
      const randomReply = replies[Math.floor(Math.random() * replies.length)]
      const reply = {
        id: `msg-s-${Date.now()}`,
        sender: 'superadmin',
        text: randomReply,
        time: format(new Date(), 'HH:mm')
      }
      setSupportMessages(prev => {
        const next = [...prev, reply]
        localStorage.setItem('mock_support_messages', JSON.stringify(next))
        return next
      })
    }, 1500)
  }

  // Load QR warnings from localStorage
  useEffect(() => {
    const loadQRWarnings = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('mock_qr_warnings') || '[]')
        setQrWarnings(stored)
      } catch (e) {
        console.error(e)
      }
    }
    loadQRWarnings()
    const interval = setInterval(loadQRWarnings, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleResolveQRWarning = async (warning: any, activate: boolean) => {
    if (activate) {
      await supabase
        .from('bus_qr_codes')
        .update({ is_active: true })
        .eq('id', warning.qrId)
        
      try {
        const prevQRs = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
        const updated = prevQRs.map((q: any) => q.id === warning.qrId ? { ...q, is_active: true } : q)
        localStorage.setItem('mock_bus_qr_codes', JSON.stringify(updated))
        setQrCodes(prev => prev.map((q: any) => q.id === warning.qrId ? { ...q, is_active: true } : q))
      } catch (e) {
        console.error(e)
      }
      toast.success(`Código QR de Unidad ${warning.busUnit} activado con éxito.`)
    }
    
    try {
      const stored = JSON.parse(localStorage.getItem('mock_qr_warnings') || '[]')
      const filtered = stored.filter((w: any) => w.id !== warning.id)
      localStorage.setItem('mock_qr_warnings', JSON.stringify(filtered))
      setQrWarnings(filtered)
    } catch (e) {
      console.error(e)
    }
  }

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
    
    let loadedDrivers: any[] = []
    if (stored) {
      try {
        loadedDrivers = JSON.parse(stored)
      } catch (e) {
        loadedDrivers = []
      }
    }
    
    if (loadedDrivers.length === 0) {
      loadedDrivers = initialDrivers.map((d: any, idx: number) => ({
        ...d,
        id: `driver-${idx}-${Date.now()}`,
        dni: String(28000000 + idx * 45293),
        age: 32 + idx * 4,
        phone: `+54 9 11 ${5429 - idx * 100} 8234`,
        historyBuses: [`${activeLine.line_number}-301`, `${activeLine.line_number}-302`],
        historyDenuncias: idx % 3 === 0 ? [{
          id: `rep-idx-${idx}-${Date.now()}`,
          type: 'No paró',
          date: 'Ayer',
          time: '15:30',
          desc: 'El colectivo no se detuvo en la parada indicada a pesar de la seña del pasajero.',
          driver: d.name,
          bus: `${activeLine.line_number}-301`,
          stop: 'Av. Rivadavia y Pueyrredón'
        }] : []
      }))
    }

    // Ensure every loaded driver has a valid email, password, and is registered in mock_users
    let needsUpdate = false
    try {
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
      let mockUsersUpdated = false

      loadedDrivers = loadedDrivers.map((d: any) => {
        let email = d.email
        let password = d.password

        // Generate email if missing
        if (!email) {
          email = `${d.name.toLowerCase().replace(/[^a-z0-9]/g, '.').replace(/\.+/g, '.')}.linea${activeLine.line_number}@bienparada.ar`
          d.email = email
          needsUpdate = true
        }
        // Generate password if missing
        if (!password) {
          password = d.name.split(' ')[0] || 'chofer123'
          if (password.length < 5) password = `${password}123`
          d.password = password
          needsUpdate = true
        }

        // Register in mockUsers if not already there
        const existingIdx = mockUsers.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase())
        const userEntry = { name: d.name, email, password, role: 'driver', lineNumber: activeLine.line_number }
        if (existingIdx >= 0) {
          const u = mockUsers[existingIdx]
          if (u.role !== 'driver' || u.lineNumber !== activeLine.line_number || u.password !== password) {
            mockUsers[existingIdx] = { ...u, ...userEntry }
            mockUsersUpdated = true
          }
        } else {
          mockUsers.push(userEntry)
          mockUsersUpdated = true
        }

        return d
      })

      if (mockUsersUpdated) {
        localStorage.setItem('mock_users', JSON.stringify(mockUsers))
      }
    } catch (e) {
      console.error('Error during drivers login registration sync:', e)
    }

    setDriversList(loadedDrivers)
    if (needsUpdate || !stored) {
      localStorage.setItem(`mock_drivers_${activeLine.line_number}`, JSON.stringify(loadedDrivers))
    }
  }, [activeLine])

  const updateDrivers = (updatedList: any[]) => {
    setDriversList(updatedList)
    localStorage.setItem(`mock_drivers_${activeLine.line_number}`, JSON.stringify(updatedList))
  }

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
    const driver = driversList.find(d => d.id === id)
    const updated = driversList.filter(d => d.id !== id)
    setDriversList(updated)
    localStorage.setItem(`mock_drivers_${activeLine.line_number}`, JSON.stringify(updated))
    // Also remove their login credentials
    if (driver?.email) {
      try {
        const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
        localStorage.setItem('mock_users', JSON.stringify(mockUsers.filter((u: any) => u.email?.toLowerCase() !== driver.email.toLowerCase())))
      } catch (e) {}
    }
    toast.success('Chofer eliminado con éxito de los registros');
  }

  // Add Driver Form states
  const [showAddDriverModal, setShowAddDriverModal] = useState(false)
  const [newDriverName, setNewDriverName] = useState('')
  const [newDriverLegajo, setNewDriverLegajo] = useState('')
  const [newDriverDni, setNewDriverDni] = useState('')
  const [newDriverAge, setNewDriverAge] = useState('')
  const [newDriverPhone, setNewDriverPhone] = useState('')
  const [newDriverEmail, setNewDriverEmail] = useState('')
  const [newDriverPassword, setNewDriverPassword] = useState('')

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
    '0': { rating: '0.0', punctuality: '0%', dailyPas: 0 },
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

  const activeStats = LINE_STATS[activeLine.line_number] || { rating: '0.0', punctuality: '0%', dailyPas: 0 }
  
  const [liveDailyPassengers, setLiveDailyPassengers] = useState<number>(0)
  const [floatingIndicators, setFloatingIndicators] = useState<Array<{ id: number; text: string }>>([])

  useEffect(() => {
    setLiveDailyPassengers(activeStats.dailyPas)
  }, [activeStats.dailyPas])

  useEffect(() => {
    if (activeLine?.line_number === '0') return
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
  }, [activeLine?.line_number])

  const [liveEvents, setLiveEvents] = useState<Array<{ id: string; time: string; text: string; icon: string; color: string }>>([])

  useEffect(() => {
    if (activeLine?.line_number === '0') {
      setLiveEvents([])
    } else {
      setLiveEvents([
        { id: '1', time: 'Hace 2m', text: 'Pico de pasajeros: Coche 301 reporta ocupación del 82%.', icon: '👥', color: '#22d3ee' },
        { id: '2', time: 'Hace 5m', text: 'Congestión en Av. Pueyrredón: demora de 4 min en Coche 302.', icon: '🚦', color: '#ff4d6a' },
        { id: '3', time: 'Hace 12m', text: 'Conducción eficiente: Coche 303 califica con 98% en Eco-Driving.', icon: '🍃', color: '#00c689' },
      ])
    }
  }, [activeLine?.line_number])

  useEffect(() => {
    if (activeLine?.line_number === '0') return
    const EVENT_TEMPLATES = [
      { text: 'Congestión moderada detectada en Av. Cabildo para Coche 305.', icon: '🚦', color: '#ff4d6a' },
      { text: 'Unidad 302 reporta conducción eficiente exceptional (100% Eco).', icon: '🍃', color: '#00c689' },
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
  }, [activeLine?.line_number])
  
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
  const [todos, setTodos] = useState<Todo[]>([])

  useEffect(() => {
    if (activeLine?.line_number === '0') {
      setTodos([])
    } else {
      setTodos([
        { id: 't1', text: 'Revisar reclamo sobre coche 001', done: false, date: '28 de Mayo', badge: 'Urgente', flagged: true },
        { id: 't2', text: 'Imprimir y colocar código QR en unidad 005', done: false, date: '29 de Mayo', badge: 'Pendiente', flagged: false },
        { id: 't3', text: 'Verificar habilitación de chofer Juan Gómez', done: false, date: '30 de Mayo', badge: 'Esta semana', flagged: true },
        { id: 't4', text: 'Limpieza y desinfección unidad 003', done: true, date: '27 de Mayo', badge: 'Resuelto', flagged: false },
      ])
    }
  }, [activeLine?.line_number])
  const [newTodoText, setNewTodoText] = useState('')
  const [showAddTodo, setShowAddTodo] = useState(false)

  // Inactive buses state
  const [inactiveBuses, setInactiveBuses] = useState<any[]>([])
  const [showAddInactiveBus, setShowAddInactiveBus] = useState(false)
  const [newInactiveBusUnit, setNewInactiveBusUnit] = useState('')
  const [newInactiveBusTimer, setNewInactiveBusTimer] = useState('30')

  // Load and synchronize inactive buses with qrCodes and activeSessions dynamically
  useEffect(() => {
    if (!activeLine) return
    
    const companyId = `mock-company-${activeLine.id}`
    const lineQRs = qrCodes.filter((q: any) => q.line_id === activeLine.id || q.company_id === companyId)

    // A QR code belongs in "Colectivos inactivos" if:
    // - it is NOT active (is_active === false)
    // - OR there is no active session matching this QR code/bus unit (not scanned currently)
    const inactiveQRs = lineQRs.filter((qr: any) => {
      if (!qr.is_active) return true
      const isScanned = activeSessions.some((s: any) => {
        const sUnit = (s.bus_unit || s.busUnit || '').replace(/\D/g, '')
        const qrUnit = (qr.bus_unit || '').replace(/\D/g, '')
        return sUnit && qrUnit && sUnit === qrUnit
      })
      return !isScanned
    })

    setInactiveBuses(prev => {
      const updated = inactiveQRs.map((qr: any) => {
        const existing = prev.find(p => p.id === qr.id || p.unit === qr.bus_unit)
        const minutes = existing ? existing.minutesRemaining : (qr.is_active ? 0 : 60)
        return {
          id: qr.id,
          unit: qr.bus_unit,
          minutesRemaining: minutes,
          is_active: qr.is_active
        }
      })
      localStorage.setItem(`mock_inactive_buses_${activeLine.line_number}`, JSON.stringify(updated))
      return updated
    })
  }, [qrCodes, activeSessions, activeLine])

  // Inactive buses countdown interval
  useEffect(() => {
    const interval = setInterval(() => {
      setInactiveBuses(prev => {
        const updated = prev.map(bus => {
          if (bus.minutesRemaining > 0) {
            return { ...bus, minutesRemaining: bus.minutesRemaining - 1 }
          }
          return bus
        })
        if (activeLine) {
          localStorage.setItem(`mock_inactive_buses_${activeLine.line_number}`, JSON.stringify(updated))
        }
        return updated
      })
    }, 60000)
    return () => clearInterval(interval)
  }, [activeLine])

  // Add inactive bus
  const addInactiveBus = () => {
    if (!newInactiveBusUnit) {
      toast.error("Introduce el número de interno")
      return
    }
    const minutes = parseInt(newInactiveBusTimer) || 30
    const fullUnit = `${activeLine.line_number}-${newInactiveBusUnit}`
    const companyId = `mock-company-${activeLine.id}`
    
    // Create new inactive QR code / bus
    const qrData = {
      id: `qr-${Date.now()}`,
      qr_token: `DEMO-QR-L${activeLine.line_number}-${newInactiveBusUnit}`,
      bus_unit: fullUnit,
      is_active: false, // starts inactive
      company_id: companyId,
      line_id: activeLine.id
    }

    try {
      const prevQRs = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
      localStorage.setItem('mock_bus_qr_codes', JSON.stringify([...prevQRs, qrData]))
      setQrCodes(prev => [...prev, qrData])
    } catch (e) {
      console.error(e)
    }

    const newBus = {
      id: qrData.id,
      unit: fullUnit,
      minutesRemaining: minutes,
      is_active: false
    }
    const next = [...inactiveBuses, newBus]
    setInactiveBuses(next)
    localStorage.setItem(`mock_inactive_buses_${activeLine.line_number}`, JSON.stringify(next))
    setNewInactiveBusUnit('')
    setShowAddInactiveBus(false)
    toast.success(`Colectivo ${newBus.unit} registrado como inactivo y código QR creado.`)
  }

  // Delete inactive bus
  const deleteInactiveBus = (id: string) => {
    const bus = inactiveBuses.find(b => b.id === id)
    const next = inactiveBuses.filter(b => b.id !== id)
    setInactiveBuses(next)
    localStorage.setItem(`mock_inactive_buses_${activeLine.line_number}`, JSON.stringify(next))
    
    // Also delete corresponding QR code to remain synced
    if (bus) {
      try {
        const prevQRs = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
        const filteredQRs = prevQRs.filter((q: any) => q.id !== id && q.bus_unit !== bus.unit)
        localStorage.setItem('mock_bus_qr_codes', JSON.stringify(filteredQRs))
        setQrCodes(prev => prev.filter(q => q.id !== id && q.bus_unit !== bus.unit))
      } catch (e) {}
    }
    toast.success("Colectivo eliminado de la lista de inactivos")
  }

  // Adjust timer minutes
  const adjustInactiveBusTimer = (id: string, delta: number) => {
    const next = inactiveBuses.map(b => {
      if (b.id === id) {
        return { ...b, minutesRemaining: Math.max(0, b.minutesRemaining + delta) }
      }
      return b
    })
    setInactiveBuses(next)
    localStorage.setItem(`mock_inactive_buses_${activeLine.line_number}`, JSON.stringify(next))
  }

  // Prompt edit timer minutes
  const promptEditTimer = (id: string, currentMinutes: number) => {
    const val = prompt("Minutos restantes para salida:", String(currentMinutes))
    if (val === null) return
    const parsed = parseInt(val)
    if (isNaN(parsed) || parsed < 0) {
      toast.error("Minutos inválidos")
      return
    }
    const next = inactiveBuses.map(b => {
      if (b.id === id) {
        return { ...b, minutesRemaining: parsed }
      }
      return b
    })
    setInactiveBuses(next)
    localStorage.setItem(`mock_inactive_buses_${activeLine.line_number}`, JSON.stringify(next))
    toast.success("Temporizador actualizado")
  }

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
      // Always load QR codes from localStorage first — this is the source of truth for all lines
      const companyId = `mock-company-${activeLine.id}`
      const storedQRs: any[] = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
        .filter((q: any) => q.line_id === activeLine.id || q.company_id === companyId)
      
      if (storedQRs.length > 0) {
        // Real QRs created by admin — use them
        setQrCodes(storedQRs)
      } else if (activeLine.line_number !== '0') {
        // No stored QRs yet and not Line 0 — seed with demo placeholders
        const demoQRs = [
          { id: `mock-qr-${activeLine.line_number}-1`, qr_token: `DEMO-QR-L${activeLine.line_number}-001`, bus_unit: `${activeLine.line_number}-301`, is_active: true, company_id: companyId, line_id: activeLine.id },
          { id: `mock-qr-${activeLine.line_number}-2`, qr_token: `DEMO-QR-L${activeLine.line_number}-002`, bus_unit: `${activeLine.line_number}-302`, is_active: false, company_id: companyId, line_id: activeLine.id }
        ]
        setQrCodes(demoQRs)
        // Persist demo QRs so they survive reload too
        const allStored = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
        localStorage.setItem('mock_bus_qr_codes', JSON.stringify([...allStored, ...demoQRs]))
      } else {
        // Line 0 with no QRs yet — start empty (admin must create real ones)
        setQrCodes([])
      }
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
          // Load local mock active sessions from localStorage
          const localSessions = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock_active_sessions') || '[]').filter((s: any) => s.line_id === activeLine.id)
            : []

          // Load QR codes from localStorage for the active line
          const companyId = `mock-company-${activeLine.id}`
          const storedQRs: any[] = typeof window !== 'undefined'
            ? JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]').filter((q: any) => q.line_id === activeLine.id || q.company_id === companyId)
            : []

          // Find all active QR codes for this line
          const activeQRs = storedQRs.filter((q: any) => q.is_active)

          // Build active buses list from active QR codes
          const activeBuses = activeQRs.map((qr: any) => {
            const sess = localSessions.find((s: any) => {
              const sUnit = (s.busUnit || s.bus_unit || '').replace(/\D/g, '')
              const qrUnit = (qr.bus_unit || '').replace(/\D/g, '')
              return sUnit && qrUnit && sUnit === qrUnit
            })

            const routePath = getMockRoutePathForLine(activeLine)
            const firstStop = routePath && routePath.length > 0 ? routePath[0] : { lat: -34.6037, lng: -58.3816 }

            if (sess) {
              // Scanned and active! Uses driver's live location and speed
              const speed = Number(sess.speed_kmh || sess.speed || 0)
              return {
                id: sess.sessionId || sess.id,
                driver_id: sess.driverId || sess.driver_id,
                line_id: sess.line_id || activeLine.id,
                line_number: sess.lineNumber || sess.line_number || activeLine.line_number,
                bus_unit: qr.bus_unit,
                driver_name: sess.driverName || sess.profiles?.name || 'Chofer Real',
                latitude: Number(sess.latitude || firstStop.lat),
                longitude: Number(sess.longitude || firstStop.lng),
                heading: Number(sess.heading || 0),
                speed_kmh: speed,
                next_stop_id: `stop-${activeLine.line_number}-active`,
                next_stop_name: 'Recorrido Activo',
                eta_minutes: speed > 2 ? 5 : 0,
                status: speed > 2 ? 'moving' : 'stopped',
                passenger_count: Number(sess.passenger_count || sess.total_passengers || 0),
                timestamp: sess.timestamp || new Date().toISOString(),
                reports_count: 0,
                direction: 'ida',
                ramal: `${activeLine.line_number}-A`,
                qr_code: qr.qr_token
              }
            } else {
              // Active but NOT scanned yet — stands still!
              return {
                id: `bus-idle-${qr.id}`,
                driver_id: 'none',
                line_id: activeLine.id,
                line_number: activeLine.line_number,
                bus_unit: qr.bus_unit,
                driver_name: 'Sin chofer asignado',
                latitude: Number(firstStop.lat),
                longitude: Number(firstStop.lng),
                heading: 0,
                speed_kmh: 0,
                next_stop_id: `stop-${activeLine.line_number}-idle`,
                next_stop_name: 'En espera de chofer',
                eta_minutes: 0,
                status: 'stopped',
                passenger_count: 0,
                timestamp: new Date().toISOString(),
                reports_count: 0,
                direction: 'ida',
                ramal: `${activeLine.line_number}-A`,
                qr_code: qr.qr_token
              }
            }
          })

          // Merge with simulated buses from json.data (skip for Line 0 to keep it strictly real-world GPS only)
          const mergedBuses = [...activeBuses]
          if (json.data && activeLine.line_number !== '0') {
            json.data.forEach((mb: any) => {
              const exists = mergedBuses.some(b => {
                const bUnit = (b.bus_unit || '').replace(/\D/g, '')
                const mbUnit = (mb.bus_unit || '').replace(/\D/g, '')
                return bUnit && mbUnit && bUnit === mbUnit
              })
              if (!exists) {
                mergedBuses.push(mb)
              }
            })
          }

          setBuses(mergedBuses)

          try {
            if (mergedBuses.length > 0) {
              const todayStr = new Date().toISOString().split('T')[0]
              const key = `mock_active_buses_line_${activeLine.line_number}_${todayStr}`
              const storedBuses = JSON.parse(localStorage.getItem(key) || '[]')
              const currentUnits = mergedBuses.map((b: any) => `Coche ${b.bus_unit}`)
              const merged = Array.from(new Set([...storedBuses, ...currentUnits]))
              localStorage.setItem(key, JSON.stringify(merged))
            }
          } catch (e) {
            console.error('Error logging active buses:', e)
          }
          
          // Map live or scanned buses to activeSessions (excluding non-scanned idle ones)
          const sessionsFromBuses = mergedBuses
            .filter((bus: any) => bus.driver_id !== 'none')
            .map((bus: any) => ({
              id: bus.id,
              bus_unit: bus.bus_unit,
              line_id: bus.line_id,
              line_number: bus.line_number,
              qr_code: bus.qr_code,
              started_at: bus.timestamp || new Date().toISOString(),
              total_passengers: bus.passenger_count,
              profiles: { name: bus.driver_name },
              latitude: bus.latitude,
              longitude: bus.longitude,
              speed_kmh: bus.speed_kmh,
              heading: bus.heading,
              status: bus.status
            }))

          setActiveSessions(sessionsFromBuses)
        })
        .catch(() => {})
    }

    fetchBuses()
    const interval = setInterval(fetchBuses, 5000)
    return () => clearInterval(interval)
  }, [activeLine, qrCodes])

  // Initialize stops timeframes when activeLine stops are loaded, persisted to localStorage
  useEffect(() => {
    if (!activeLine) return
    const stored = localStorage.getItem(`stops_timeframes_${activeLine.line_number}`)
    if (stored) {
      setStopsTimeframes(JSON.parse(stored))
    } else {
      const defaultTimeframes: Record<string, { start: string; end: string }> = {}
      const lineStops = getMockStopsForLine(activeLine, 'ida')
      lineStops.forEach((s, idx) => {
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
      localStorage.setItem(`stops_timeframes_${activeLine.line_number}`, JSON.stringify(defaultTimeframes))
    }
  }, [selectedLineNumber, activeLine])

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

  useEffect(() => {
    if (!activeLine) return
    setGpsPassageLogs([])
    if (activeLine.line_number === '0' && buses.length === 0) return
    const mergeLogs = () => {
      setGpsPassageLogs(prev => {
        const updated = [...prev]
        let changed = false
        
        try {
          const keys = Object.keys(localStorage)
          keys.forEach(k => {
            if (k.startsWith(`driver_passage_logs_${activeLine.line_number}_`)) {
              const busUnit = k.replace(`driver_passage_logs_${activeLine.line_number}_`, '')
              const list = JSON.parse(localStorage.getItem(k) || '[]')
              list.forEach((log: any) => {
                const logId = `driver-${busUnit}-${log.stopId}`
                const exists = updated.some(l => l.id === logId)
                if (!exists) {
                  const tf = stopsTimeframes[log.stopId] || { start: '--:--', end: '--:--' }
                  updated.unshift({
                    id: logId,
                    busUnit,
                    driver: 'Néstor García',
                    stopName: log.stopName,
                    time: log.arrivalTime,
                    scheduled: `${tf.start} - ${tf.end} hs`,
                    status: log.status
                  })
                  changed = true
                }
              })
            }
          })
        } catch (e) {
          console.error(e)
        }
        
        return changed ? updated.slice(0, 30) : prev
      })
    }
    
    mergeLogs()
    const interval = setInterval(mergeLogs, 2000)
    return () => clearInterval(interval)
  }, [activeLine, stopsTimeframes])

  const getChartData = () => {
    if (activeLine.line_number === '0') {
      if (chartPeriod === 'week') {
        return Array.from({ length: 7 }, (_, i) => {
          const d = subDays(new Date(selectedDate), 6 - i)
          const dayLabel = format(d, 'EEEE', { locale: es })
          return { label: dayLabel.substring(0, 3), subidos: 0, bajados: 0 }
        })
      }
      if (chartPeriod === 'month') {
        return Array.from({ length: 30 }, (_, i) => {
          const d = subDays(new Date(selectedDate), 29 - i)
          const dayLabel = format(d, 'dd MMM', { locale: es })
          return { label: dayLabel, subidos: 0, bajados: 0 }
        })
      }
      const todayStr = format(new Date(), 'yyyy-MM-dd')
      let maxHour = 23
      if (selectedDate === todayStr) {
        maxHour = new Date().getHours()
      } else if (selectedDate > todayStr) {
        return []
      }
      return HOURLY.slice(0, maxHour + 1).map((h) => ({
        label: h.h,
        subidos: 0,
        bajados: 0
      }))
    }

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
    '0': [],
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
  const topStops = activeLine.line_number === '0' ? [] : [...stops]
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
    if (activeLine.line_number === '0') {
      setReports([])
      return
    }
    setReports([
      {
        id: 'rep-1',
        type: 'No paró',
        driver: driversList[0],
        bus: `${activeLine.line_number}-301`,
        stop: stopsList[0]?.name || 'Esquina Principal',
        status: 'pending',
        time: 'Hace 20 min',
        desc: 'El colectivo no paró a pesar de que había espacio y se le hizo la señal correspondiente.',
        reporter: {
          name: 'Alejandro Pérez',
          avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
          count: 3
        }
      },
      {
        id: 'rep-2',
        type: 'Mal trato',
        driver: driversList[1] || 'Chofer de Guardia',
        bus: `${activeLine.line_number}-303`,
        stop: stopsList[1]?.name || 'Avenida Central',
        status: 'resolved',
        time: 'Hace 2h',
        desc: 'El chofer fue agresivo al responder una consulta sobre el recorrido.',
        reporter: {
          name: 'Sofía Rodríguez',
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
          count: 14
        }
      }
    ])
  }, [activeLine])

  // Auto-detect and sync system issues to Todo List
  useEffect(() => {
    if (activeLine?.line_number === '0') return
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
        created_at: new Date().toISOString(),
        has_ac: newBusHasAC,
        is_new: newBusIsNew,
        has_ramp: newBusHasRamp,
      }
      const prevQRs = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
      localStorage.setItem('mock_bus_qr_codes', JSON.stringify([...prevQRs, qrData]))
    } else {
      qrData = data
    }

    setQrCodes(prev => [...prev, qrData])
    setNewBusUnit('')
    setNewBusHasAC(true)
    setNewBusIsNew(true)
    setNewBusHasRamp(false)
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

  const toggleQRActive = async (id: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus
    await supabase.from('bus_qr_codes').update({ is_active: nextStatus }).eq('id', id)

    try {
      const prevQRs = JSON.parse(localStorage.getItem('mock_bus_qr_codes') || '[]')
      const updated = prevQRs.map((q: any) => q.id === id ? { ...q, is_active: nextStatus } : q)
      localStorage.setItem('mock_bus_qr_codes', JSON.stringify(updated))
    } catch (e) {
      console.error(e)
    }

    setQrCodes(prev => prev.map(qr => qr.id === id ? { ...qr, is_active: nextStatus } : qr))
    toast.success(nextStatus ? 'Código QR activado' : 'Código QR desactivado')
  }

  const downloadQR = (qr: any) => {
    toast.success('QR descargado (función disponible en producción)')
  }

  const handleAddDriver = () => {
    if (!newDriverName.trim() || !newDriverLegajo.trim() || !newDriverDni.trim()) {
      toast.error('Por favor, completa los campos requeridos (Nombre, Legajo y DNI)');
      return;
    }
    const email = newDriverEmail.trim() || `${newDriverName.trim().toLowerCase().replace(/\s+/g, '.')}.linea${activeLine.line_number}@bienparada.ar`
    const password = newDriverPassword.trim() || Math.random().toString(36).slice(2, 10)

    const newDriver = {
      id: `driver-${Date.now()}`,
      name: newDriverName.trim(),
      legajo: newDriverLegajo.trim(),
      dni: newDriverDni.trim(),
      age: parseInt(newDriverAge) || 30,
      phone: newDriverPhone.trim() || '+54 9 11 5000 0000',
      email,
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

    // Register credentials in mock_users so the driver can log in from /login
    try {
      const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
      const existingIdx = mockUsers.findIndex((u: any) => u.email.toLowerCase() === email.toLowerCase())
      const userEntry = { name: newDriver.name, email, password, role: 'driver', lineNumber: activeLine.line_number }
      if (existingIdx >= 0) {
        mockUsers[existingIdx] = userEntry
      } else {
        mockUsers.push(userEntry)
      }
      localStorage.setItem('mock_users', JSON.stringify(mockUsers))
    } catch (e) {
      console.error('Error saving driver credentials:', e)
    }

    setShowAddDriverModal(false)
    
    // Clear inputs
    setNewDriverName('')
    setNewDriverLegajo('')
    setNewDriverDni('')
    setNewDriverAge('')
    setNewDriverPhone('')
    setNewDriverEmail('')
    setNewDriverPassword('')
    toast.success(`✅ Chofer ${newDriver.name} registrado. Email: ${email} | Contraseña: ${password}`);
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const toggleTodo = (id: string) => {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }
  const toggleFlag = (id: string) => {
    setTodos(prev => prev.map(t => {
      if (t.id === id) {
        const nextFlagged = !t.flagged
        return {
          ...t,
          flagged: nextFlagged,
          badge: nextFlagged ? 'Urgente' : (t.badge === 'Urgente' ? 'Pendiente' : t.badge)
        }
      }
      return t
    }))
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

  const handleCleanExport = () => {
    let outputContent = "\ufeff" // UTF-8 BOM for Excel compatibility

    if (exportSelBuses) {
      outputContent += "=== REGISTRO DE COLECTIVOS ===\n"
      outputContent += "Unidad,Chofer Asignado,Pasajeros a Bordo,Estado de Ruta\n"
      activeSessions.forEach((s: any) => {
        outputContent += `"${s.bus_unit || 'N/A'}","${s.driver_name || 'N/A'}",${s.total_passengers || 0},"En recorrido"\n`
      })
      outputContent += "\n"
    }

    if (exportSelDrivers) {
      outputContent += "=== REGISTRO DE CHOFERES ===\n"
      outputContent += "Nombre Completo,Estado,Calificación Promedio\n"
      const drivers = LINE_DRIVERS[activeLine.line_number] || []
      drivers.forEach((d: any) => {
        const isActive = activeSessions.some((s: any) => s.driver_name === d.name)
        outputContent += `"${d.name}","${isActive ? 'Activo' : 'Inactivo'}",4.8\n`
      })
      outputContent += "\n"
    }

    if (exportSelPunctuality) {
      outputContent += "=== HISTORIAL DE PUNTUALIDAD ===\n"
      outputContent += "Parada,Paso Estimado,Paso Real,Diferencia,Estado de Cruce\n"
      const crossings = gpsPassageLogs || []
      crossings.forEach((log: any) => {
        outputContent += `"${log.stopName || 'N/A'}","${log.scheduledTime || 'N/A'}","${log.realTime || 'N/A'}",${log.delayMinutes ? log.delayMinutes + ' min' : '0 min'},"${log.status || 'N/A'}"\n`
      })
      outputContent += "\n"
    }

    if (exportSelReports) {
      outputContent += "=== REGISTRO DE DENUNCIAS ===\n"
      outputContent += "Usuario Denunciante,Motivo,Unidad Colectivo,Fecha y Hora,Gravedad\n"
      const reportsList = [
        { user: 'Juan Pérez', reason: 'Unidad no se detuvo en la parada establecida', bus: '102', date: '09/07/2026 14:20', severity: 'Media' },
        { user: 'María Gómez', reason: 'Conducción temeraria y exceso de velocidad', bus: '105', date: '09/07/2026 15:45', severity: 'Alta' },
        { user: 'Carlos Sosa', reason: 'Maltrato verbal al momento de ingresar', bus: '108', date: '08/07/2026 18:10', severity: 'Alta' },
      ]
      reportsList.forEach((r: any) => {
        outputContent += `"${r.user}","${r.reason}","${r.bus}","${r.date}","${r.severity}"\n`
      })
      outputContent += "\n"
    }

    if (!outputContent.trim()) {
      toast.error("Por favor selecciona al menos una categoría para exportar.")
      return
    }

    if (exportTarget === 'excel') {
      const blob = new Blob([outputContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.setAttribute("href", url)
      link.setAttribute("download", `BienParada_Export_Linea_${activeLine.line_number}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success("Archivo Excel (.csv) descargado correctamente.")
    } else {
      toast.loading("Subiendo planilla a Google Spreadsheets...", { duration: 1500 })
      setTimeout(() => {
        toast.success("¡Planilla exportada a Google Spreadsheets correctamente!")
      }, 1500)
    }

    setShowExportModal(false)
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
          <button
            onClick={() => setShowSupportModal(true)}
            style={{
              background: hexToRgba(themeColor, 0.15),
              border: `1px solid ${hexToRgba(themeColor, 0.35)}`,
              borderRadius: '6px',
              padding: '6px 14px',
              color: themeColor,
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 200ms'
            }}
          >
            <span style={{ fontSize: '13px' }}>💬</span> Contactar Super Admin
          </button>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: '#a3a6b8' }}>
            {/* Updates Bell Icon */}
            <div
              onClick={() => setShowUpdatesModal(true)}
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Actualizaciones de la plataforma"
            >
              <Bell size={16} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '7px',
                height: '7px',
                background: '#FF4D6A',
                borderRadius: '50%',
                boxShadow: '0 0 4px #FF4D6A'
              }} />
            </div>

            {/* Suggestions Icon */}
            <div
              onClick={() => setShowSuggestionsModal(true)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              title="Sugerir mejoras o reportar fallas"
            >
              <MessageSquarePlus size={16} />
            </div>
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
          <button
            onClick={() => setShowShareModal(true)}
            style={{
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
              transition: 'background-color 200ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          >
            <Share2 size={13} /> Compartir
          </button>
          <button
            onClick={() => setShowExportModal(true)}
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
              transition: 'opacity 200ms',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Download size={13} /> Exportar
          </button>
        </div>
      </div>

      {/* QR Code Inactive Warnings Banner */}
      {qrWarnings.length > 0 && (
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {qrWarnings.map((w: any) => (
              <div key={w.id} style={{
                background: 'rgba(255, 77, 106, 0.08)',
                border: '1px solid rgba(255, 77, 106, 0.25)',
                borderRadius: '8px',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertTriangle size={16} style={{ color: '#ff4d6a', flexShrink: 0 }} />
                  <div style={{ fontSize: '13px', color: '#fff' }}>
                    <span style={{ fontWeight: 700, color: '#ff4d6a' }}>[Alerta Chofer]</span> {w.message}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  <button
                    onClick={() => handleResolveQRWarning(w, true)}
                    style={{
                      background: '#10B981',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '6px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    Activar QR
                  </button>
                  <button
                    onClick={() => handleResolveQRWarning(w, false)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: '#a3a6b8',
                      fontSize: '11px',
                      padding: '6px 12px',
                      cursor: 'pointer'
                    }}
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>{activeLine.line_number === '0' ? '' : '▲ +1 hoy'}</span>
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
          
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>{activeLine.line_number === '0' ? '' : '▲ +12%'}</span>
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
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>{activeLine.line_number === '0' ? '' : '▼ -15.0%'}</span>
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
          <span style={{ fontSize: '11px', color: '#00c689', fontWeight: 600 }}>{activeLine.line_number === '0' ? '' : '▲ +2.4%'}</span>
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
                                          setStopsTimeframes(prev => {
                                            const updated = {
                                              ...prev,
                                              [stop.id]: { start: editingStart, end: editingEnd }
                                            };
                                            localStorage.setItem(`stops_timeframes_${activeLine.line_number}`, JSON.stringify(updated));
                                            return updated;
                                          });
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

                    {/* Active fleet summary */}
                    <button
                      onClick={() => { setTab('buses'); setShowPuntualidadTimeline(false); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: '#121527',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        padding: '24px',
                        cursor: 'pointer',
                        transition: 'all 200ms ease-out',
                        outline: 'none',
                        display: 'block'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <div style={{ color: '#8f94a5', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colectivos en servicio ahora</div>
                        <span style={{ fontSize: '11px', color: themeColor, fontWeight: 700 }}>Ver Detalle Flota →</span>
                      </div>

                      {(() => {
                        const activeCount = activeSessions.length
                        const inactiveCount = inactiveBuses.length
                        const totalPassengers = activeSessions.reduce((acc: number, s: any) => acc + (s.total_passengers || 0), 0)
                        const activeDrivers = activeSessions.map((s: any) => s.profiles?.name || 'Chofer').filter(Boolean)

                        return (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '16px' }}>
                            {/* Active buses */}
                            <div style={{ background: 'rgba(34,211,160,0.06)', border: '1px solid rgba(34,211,160,0.15)', borderRadius: '8px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '10px', color: '#22D3A0', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Activos</div>
                              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{activeCount}</div>
                              <div style={{ fontSize: '10px', color: '#8f94a5', marginTop: '2px' }}>{activeCount === 1 ? 'colectivo en servicio' : 'colectivos en servicio'}</div>
                            </div>

                            {/* Inactive buses */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '10px', color: '#8f94a5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Inactivos</div>
                              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{inactiveCount}</div>
                              <div style={{ fontSize: '10px', color: '#8f94a5', marginTop: '2px' }}>{inactiveCount === 1 ? 'colectivo fuera de servicio' : 'colectivos fuera de servicio'}</div>
                            </div>

                            {/* Passenger count */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '10px', color: '#8f94a5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Pasajeros</div>
                              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{totalPassengers}</div>
                              <div style={{ fontSize: '10px', color: '#8f94a5', marginTop: '2px' }}>usuarios a bordo</div>
                            </div>

                            {/* Active drivers */}
                            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px' }}>
                              <div style={{ fontSize: '10px', color: '#8f94a5', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>Choferes</div>
                              <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{activeDrivers.length}</div>
                              <div style={{ fontSize: '10px', color: '#8f94a5', marginTop: '2px' }}>{activeDrivers.length === 1 ? 'conductor activo' : 'conductores activos'}</div>
                            </div>
                          </div>
                        )
                      })()}
                    </button>
                  </>
                )}
              </div>
            )}

            {tab === 'buses' && <BusesTab buses={buses} activeLine={activeLine} themeColor={themeColor} />}
            {tab === 'drivers' && (
              <CompanyDrivers
                drivers={driversList}
                activeSessions={activeSessions}
                driverWarnings={driverWarnings}
                onDeleteDriver={deleteDriver}
                onAddDriverClick={() => setShowAddDriverModal(true)}
                onUpdateDrivers={updateDrivers}
                onViewComplaint={setSelectedComplaintForDetail}
                themeColor={themeColor}
              />
            )}
            {tab === 'qrcodes' && (
              <QRTab
                qrCodes={qrCodes}
                newBusUnit={newBusUnit}
                setNewBusUnit={setNewBusUnit}
                newBusHasAC={newBusHasAC}
                setNewBusHasAC={setNewBusHasAC}
                newBusIsNew={newBusIsNew}
                setNewBusIsNew={setNewBusIsNew}
                newBusHasRamp={newBusHasRamp}
                setNewBusHasRamp={setNewBusHasRamp}
                onGenerate={generateQR}
                onDownload={downloadQR}
                onDelete={deleteQR}
                onToggleActive={toggleQRActive}
                themeColor={themeColor}
              />
            )}
            {tab === 'stops' && <StopsTab activeLine={activeLine} themeColor={themeColor} />}
            {tab === 'reports' && (
              <CompanyReports
                reports={reports}
                driverWarnings={driverWarnings}
                onAddWarning={addWarning}
                onResolve={(id) => setReports(rs => rs.map(x => x.id === id ? { ...x, status: 'resolved' } : x))}
                onViewComplaint={setSelectedComplaintForDetail}
                themeColor={themeColor}
              />
            )}
            {tab === 'calendar' && <CalendarTab themeColor={themeColor} activeLine={activeLine} activeStats={activeStats} />}
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
                {(() => {
                  const activeSessCount = activeSessions.length
                  const totalPassengers = activeSessions.reduce((acc: number, s: any) => acc + (s.total_passengers || 0), 0)
                  const capacity = activeSessCount * 60 || 1
                  const occupationPct = activeSessCount > 0 ? Math.min(100, Math.round((totalPassengers / capacity) * 100)) : 0
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                        <svg width="48" height="48" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke={themeColor} strokeWidth="3"
                            strokeDasharray={`${occupationPct} ${100 - occupationPct}`} strokeDashoffset="25" strokeLinecap="round" />
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
                          {occupationPct}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#8f94a5', whiteSpace: 'nowrap' }}>Ocupación</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{occupationPct}.0%</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Ring 2 - Choferes */}
                {(() => {
                  const activeD = activeSessions.length
                  const pct = Math.min(100, activeD * 20)
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
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{activeD}</div>
                      </div>
                    </div>
                  )
                })()}

                {/* Ring 3 - Puntualidad */}
                {(() => {
                  const crossings = gpsPassageLogs || []
                  const onTimeCount = crossings.filter((log: any) => log.status === 'A tiempo' || log.status === 'on-time' || log.status === 'On Time').length
                  const totalCrossings = crossings.length
                  const punctualityPct = totalCrossings > 0
                    ? Math.round((onTimeCount / totalCrossings) * 100)
                    : (activeLine.line_number === '12' ? 92 : 0)

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
                        <svg width="48" height="48" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                          <circle cx="18" cy="18" r="15.915" fill="none" stroke="#22d3ee" strokeWidth="3"
                            strokeDasharray={`${punctualityPct} ${100 - punctualityPct}`} strokeDashoffset="25" strokeLinecap="round" />
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
                          {punctualityPct}%
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#8f94a5', whiteSpace: 'nowrap' }}>Puntualidad</div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', marginTop: '2px' }}>{punctualityPct}.0%</div>
                      </div>
                    </div>
                  )
                })()}
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
                {todos.map((todo, i) => (
                  <div
                    key={todo.id}
                    draggable
                    onDragStart={() => handleDragStart(i)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(i)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: draggedIndex === i ? 'rgba(255,255,255,0.05)' : (todo.done ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)'),
                      border: draggedIndex === i ? `1px dashed ${themeColor}` : '1px solid rgba(255, 255, 255, 0.04)',
                      opacity: todo.done ? 0.6 : 1,
                      transition: 'all 200ms',
                      cursor: 'grab',
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

            {/* Colectivos Inactivos Card */}
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
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#fff', margin: 0 }}>Colectivos Inactivos</h3>
                  <span style={{ fontSize: '11px', color: '#8f94a5', marginTop: '2px' }}>Programación de salida</span>
                </div>
                <button
                  onClick={() => setShowAddInactiveBus(!showAddInactiveBus)}
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

              {showAddInactiveBus && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#1b1d2e', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '9px', color: '#8f94a5', marginBottom: '4px' }}>Nº de Interno</label>
                      <input
                        type="text"
                        placeholder="ej. 308"
                        value={newInactiveBusUnit}
                        onChange={(e) => setNewInactiveBusUnit(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '12px',
                          padding: '4px 8px',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div style={{ width: '80px' }}>
                      <label style={{ display: 'block', fontSize: '9px', color: '#8f94a5', marginBottom: '4px' }}>Minutos</label>
                      <input
                        type="number"
                        value={newInactiveBusTimer}
                        onChange={(e) => setNewInactiveBusTimer(e.target.value)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '4px',
                          color: '#fff',
                          fontSize: '12px',
                          padding: '4px 8px',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={addInactiveBus}
                    style={{
                      background: themeColor,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Programar Salida
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {inactiveBuses.map((bus) => (
                  <div
                    key={bus.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      transition: 'all 200ms',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bus size={14} style={{ color: '#8f94a5' }} />
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600 }}>
                          Unidad {bus.unit}
                        </div>
                        <div style={{ fontSize: '10px', color: bus.is_active ? themeColor : '#8f94a5', marginTop: '2px', fontWeight: bus.is_active ? 600 : 'normal' }}>
                          {bus.is_active ? 'Activo / Sin chofer' : 'Inactivo / En terminal'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {/* Timer box */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          onClick={() => adjustInactiveBusTimer(bus.id, -5)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#8f94a5',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Restar 5 minutos"
                        >
                          -
                        </button>
                        <div
                          onClick={() => promptEditTimer(bus.id, bus.minutesRemaining)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: bus.minutesRemaining <= 15 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                            border: `1px solid ${bus.minutesRemaining <= 15 ? '#ef4444' : '#f59e0b'}`,
                            color: bus.minutesRemaining <= 15 ? '#f87171' : '#fbbf24',
                            fontSize: '11.5px',
                            fontFamily: 'DM Mono',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                            minWidth: '55px',
                          }}
                          title="Hacer clic para editar tiempo"
                        >
                          {bus.minutesRemaining}m
                        </div>
                        <button
                          onClick={() => adjustInactiveBusTimer(bus.id, 5)}
                          style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '4px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            color: '#8f94a5',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Sumar 5 minutos"
                        >
                          +
                        </button>
                      </div>

                      {/* Trash bin */}
                      <Trash2
                        size={13}
                        onClick={() => deleteInactiveBus(bus.id)}
                        style={{ cursor: 'pointer', color: '#8f94a5', transition: 'color 150ms' }}
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

      {/* Support Chat Modal */}
      {showSupportModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-dark" style={{ padding: '24px', borderRadius: '16px', maxWidth: '440px', width: '100%', margin: '16px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', height: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }} />
                <div>
                  <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>Canal de Soporte (Super Admin)</h3>
                  <span style={{ color: '#8f94a5', fontSize: '10px' }}>Soporte técnico centralizado · En línea</span>
                </div>
              </div>
              <button
                onClick={() => setShowSupportModal(false)}
                style={{ background: 'none', border: 'none', color: '#8f94a5', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Message Area */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingRight: '4px', marginBottom: '16px' }}>
              {supportMessages.map((msg) => {
                const isSuper = msg.sender === 'superadmin'
                return (
                  <div key={msg.id} style={{
                    alignSelf: isSuper ? 'flex-start' : 'flex-end',
                    maxWidth: '80%',
                    background: isSuper ? 'rgba(255,255,255,0.05)' : hexToRgba(themeColor, 0.2),
                    border: isSuper ? '1px solid rgba(255,255,255,0.08)' : `1px solid ${hexToRgba(themeColor, 0.3)}`,
                    borderRadius: isSuper ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                    padding: '10px 14px',
                  }}>
                    <div style={{ color: isSuper ? '#8f94a5' : themeColor, fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                      {isSuper ? 'Super Admin' : 'Tu Canal'}
                    </div>
                    <div style={{ color: '#fff', fontSize: '13px', lineHeight: '1.4' }}>
                      {msg.text}
                    </div>
                    <div style={{ color: '#8f94a5', fontSize: '9px', textAlign: 'right', marginTop: '4px', fontFamily: 'DM Mono' }}>
                      {msg.time} hs
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Input Bar */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
              <input
                className="input-dark"
                placeholder="Escribe tu consulta al Super Admin..."
                value={supportInput}
                onChange={(e) => setSupportInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendSupportMessage()}
                style={{ flex: 1, fontSize: '13px' }}
              />
              <button
                onClick={sendSupportMessage}
                disabled={!supportInput.trim()}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  background: supportInput.trim() ? themeColor : 'rgba(255,255,255,0.04)',
                  color: supportInput.trim() ? '#fff' : '#8f94a5',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: supportInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 200ms'
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Platform Updates Modal */}
      {showUpdatesModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-dark" style={{ padding: '28px', borderRadius: '16px', maxWidth: '480px', width: '100%', margin: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>Actualizaciones de la Plataforma</h3>
              <button
                onClick={() => setShowUpdatesModal(false)}
                style={{ background: 'none', border: 'none', color: '#8f94a5', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Notification Banner */}
            <div style={{
              background: 'rgba(240,180,41,0.08)',
              border: '1px solid rgba(240,180,41,0.25)',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#F0B429',
              fontSize: '12px',
              marginBottom: '20px',
              lineHeight: 1.5
            }}>
              ⚠️ <strong>¡Nueva actualización disponible!</strong> Por favor, recarga tu navegador para aplicar los últimos parches y optimizaciones en la sincronización de mapas en tiempo real (Versión 1.3.0).
            </div>

            {/* Change Log List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '240px', overflowY: 'auto', paddingRight: '4px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: '#fff' }}>🚀 Control de Puntualidad en Tiempo Real</strong>
                <p style={{ color: '#8f94a5', margin: '3px 0 0' }}>El panel de choferes ahora está sincronizado para notificar el arribo exacto de las paradas a los administradores.</p>
              </div>
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: '#fff' }}>📊 Resumen de Flota Compacto</strong>
                <p style={{ color: '#8f94a5', margin: '3px 0 0' }}>Reemplazado el listado individual del panel de resumen por una tarjeta interactiva con accesos directos.</p>
              </div>
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: '#fff' }}>📋 Tareas con Ordenamiento por Arrastre</strong>
                <p style={{ color: '#8f94a5', margin: '3px 0 0' }}>Ahora puedes priorizar tu lista de tareas arrastrándolas libremente hacia arriba o abajo en la barra lateral.</p>
              </div>
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: '#fff' }}>💬 Soporte Directo (Super Admin)</strong>
                <p style={{ color: '#8f94a5', margin: '3px 0 0' }}>Módulo de chat directo con los super administradores integrado en el menú de navegación.</p>
              </div>
              <div style={{ fontSize: '12px' }}>
                <strong style={{ color: '#fff' }}>🛡️ Alertas de Códigos QR Inactivos</strong>
                <p style={{ color: '#8f94a5', margin: '3px 0 0' }}>Bloqueo para escaneos inactivos con alertas de seguridad en tiempo real para el panel de administración.</p>
              </div>
            </div>

            <button
              onClick={() => setShowUpdatesModal(false)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                background: themeColor,
                border: 'none',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* Suggest Changes Modal */}
      {showSuggestionsModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-dark" style={{ padding: '28px', borderRadius: '16px', maxWidth: '440px', width: '100%', margin: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>Sugerir Cambios o Mejoras</h3>
              <button
                onClick={() => { setShowSuggestionsModal(false); setSuggestionDesc(''); setSuggestionImg(null); }}
                style={{ background: 'none', border: 'none', color: '#8f94a5', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#8f94a5', fontSize: '12px', margin: '0 0 20px', lineHeight: 1.4 }}>
              Envía sugerencias o reporta problemas de diseño o funcionamiento directamente a nuestro equipo de desarrollo.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Description Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>Descripción de la Sugerencia</label>
                <textarea
                  className="input-dark"
                  placeholder="Describe detalladamente el cambio o la falla encontrada..."
                  value={suggestionDesc}
                  onChange={(e) => setSuggestionDesc(e.target.value)}
                  rows={4}
                  style={{ resize: 'none', fontSize: '13px', padding: '10px 12px', borderRadius: '8px' }}
                />
              </div>

              {/* Image Upload Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>Adjuntar Captura de Pantalla</label>
                
                {suggestionImg ? (
                  <div style={{ position: 'relative', width: '100%', height: '140px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <img src={suggestionImg} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      onClick={() => setSuggestionImg(null)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(255, 77, 106, 0.9)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div style={{
                    border: '1.5px dashed rgba(255,255,255,0.15)',
                    borderRadius: '8px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    background: 'rgba(255,255,255,0.01)'
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImgUpload}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                    />
                    <div style={{ fontSize: '20px', marginBottom: '6px' }}>📸</div>
                    <div style={{ fontSize: '12px', color: themeColor, fontWeight: 600 }}>Subir Imagen</div>
                    <div style={{ fontSize: '10px', color: '#8f94a5', marginTop: '2px' }}>Formatos soportados: JPG, PNG (Max 5MB)</div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setShowSuggestionsModal(false); setSuggestionDesc(''); setSuggestionImg(null); }}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSuggestionSubmit}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  background: themeColor,
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-dark" style={{ padding: '28px', borderRadius: '16px', maxWidth: '460px', width: '100%', margin: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>Compartir Vista del Panel</h3>
              <button
                onClick={() => setShowShareModal(false)}
                style={{ background: 'none', border: 'none', color: '#8f94a5', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#8f94a5', fontSize: '12px', margin: '0 0 16px', lineHeight: 1.4 }}>
              Previsualiza la captura del panel actual antes de compartirla con tu equipo por correo o mensajería.
            </p>

            {/* Dashboard Screenshot Preview */}
            <div style={{
              background: '#0b0f19',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '16px',
              marginBottom: '20px',
              textAlign: 'left',
              position: 'relative',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.5)'
            }}>
              <div style={{ position: 'absolute', top: '8px', right: '8px', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(0,198,137,0.15)', color: '#00c689', fontWeight: 700 }}>
                CAPTURA PREVIA
              </div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>BienParada Panel · Línea {activeLine.line_number}</div>
              <div style={{ fontSize: '10px', color: '#8f94a5', marginBottom: '12px' }}>{format(new Date(), 'dd/MM/yyyy HH:mm')} hs</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px', color: '#fff' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ color: '#8f94a5', fontSize: '9px' }}>Colectivos Activos</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>{activeSessions.length} Unidades</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ color: '#8f94a5', fontSize: '9px' }}>Pasajeros a Bordo</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>
                    {activeSessions.reduce((acc: number, s: any) => acc + (s.total_passengers || 0), 0)} Pasajeros
                  </div>
                </div>
              </div>
            </div>

            {/* Sharing Channels List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              <a
                href={`mailto:?subject=BienParada - Panel Administrativo de la Linea ${activeLine.line_number}&body=Hola! Te comparto una vista del panel de control de BienParada para la linea ${activeLine.line_number}: http://bienparada.com/shared/snapshot?line=${activeLine.line_number}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: '13px',
                  textDecoration: 'none',
                  transition: 'background-color 200ms'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <span style={{ fontSize: '16px' }}>✉️</span> Compartir por Correo Electrónico
              </a>

              <a
                href={`https://wa.me/?text=Hola! Te comparto una vista del panel de control de BienParada para la linea ${activeLine.line_number}: http://bienparada.com/shared/snapshot?line=${activeLine.line_number}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: '13px',
                  textDecoration: 'none',
                  transition: 'background-color 200ms'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <span style={{ fontSize: '16px' }}>💬</span> Compartir por WhatsApp
              </a>

              <button
                onClick={() => {
                  toast.success('¡Enlace de Slack generado y enviado al canal #general!')
                  setShowShareModal(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#fff',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 200ms'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <span style={{ fontSize: '16px' }}>📟</span> Enviar a Canal de Slack
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(`http://bienparada.com/shared/snapshot?line=${activeLine.line_number}`)
                  toast.success('¡Enlace de captura copiado al portapapeles!')
                  setShowShareModal(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  background: hexToRgba(themeColor, 0.1),
                  border: `1px solid ${hexToRgba(themeColor, 0.25)}`,
                  color: themeColor,
                  fontSize: '13px',
                  fontWeight: 600,
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 200ms'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = hexToRgba(themeColor, 0.15)}
                onMouseLeave={(e) => e.currentTarget.style.background = hexToRgba(themeColor, 0.1)}
              >
                <span style={{ fontSize: '16px' }}>🔗</span> Copiar Enlace de Captura Directo
              </button>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-dark" style={{ padding: '28px', borderRadius: '16px', maxWidth: '440px', width: '100%', margin: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3 style={{ color: '#fff', fontSize: '16px', fontWeight: 700, margin: 0 }}>Exportar Reportes de la Línea</h3>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ background: 'none', border: 'none', color: '#8f94a5', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <p style={{ color: '#8f94a5', fontSize: '12px', margin: '0 0 20px', lineHeight: 1.4 }}>
              Configura el tipo de exportación y selecciona las columnas y datos que deseas incluir en tu planilla limpia.
            </p>

            {/* Target Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              <label style={{ fontSize: '12px', color: '#fff', fontWeight: 600 }}>Plataforma de Destino</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  onClick={() => setExportTarget('excel')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: exportTarget === 'excel' ? hexToRgba(themeColor, 0.15) : 'rgba(255,255,255,0.02)',
                    border: exportTarget === 'excel' ? `1px solid ${themeColor}` : '1px solid rgba(255,255,255,0.06)',
                    color: exportTarget === 'excel' ? themeColor : '#a3a6b8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🟢 Microsoft Excel (.csv)
                </button>
                <button
                  onClick={() => setExportTarget('google')}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: exportTarget === 'google' ? hexToRgba(themeColor, 0.15) : 'rgba(255,255,255,0.02)',
                    border: exportTarget === 'google' ? `1px solid ${themeColor}` : '1px solid rgba(255,255,255,0.06)',
                    color: exportTarget === 'google' ? themeColor : '#a3a6b8',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  🔵 Google Spreadsheets
                </button>
              </div>
            </div>

            {/* Selection Checkboxes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
              <label style={{ fontSize: '11px', color: '#8f94a5', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>Módulos de Datos Disponibles</label>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={exportSelBuses}
                  onChange={(e) => setExportSelBuses(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Planilla de Colectivos (Unidad, Chofer, Pasajeros)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={exportSelDrivers}
                  onChange={(e) => setExportSelDrivers(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Registro de Choferes (Nombre, Estado, Rating)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={exportSelPunctuality}
                  onChange={(e) => setExportSelPunctuality(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Historial de Puntualidad (Hora Cruzada, Status)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#fff' }}>
                <input
                  type="checkbox"
                  checked={exportSelReports}
                  onChange={(e) => setExportSelReports(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                Planilla de Denuncias (Reportero, Motivo, Fecha)
              </label>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setShowExportModal(false)}
                style={{ flex: 1, padding: '11px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCleanExport}
                style={{
                  flex: 1,
                  padding: '11px',
                  borderRadius: '10px',
                  background: themeColor,
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Exportar Limpio
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

              {/* Credentials section */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <div style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Credenciales de Acceso a la App</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', color: '#8f94a5', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>Email <span style={{ color: '#8f94a5', fontWeight: 400, fontSize: '11px' }}>(se autogenera si se deja vacío)</span></label>
                    <input
                      type="email"
                      placeholder={`ej. ${(newDriverName || 'juan.perez').toLowerCase().replace(/\s+/g, '.')}.linea${activeLine.line_number}@bienparada.ar`}
                      value={newDriverEmail}
                      onChange={(e) => setNewDriverEmail(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: '#8f94a5', fontSize: '12px', marginBottom: '6px', fontWeight: 500 }}>Contraseña <span style={{ color: '#8f94a5', fontWeight: 400, fontSize: '11px' }}>(se autogenera si se deja vacío)</span></label>
                    <input
                      type="text"
                      placeholder="ej. clave1234"
                      value={newDriverPassword}
                      onChange={(e) => setNewDriverPassword(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                    />
                  </div>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>El chofer usará estas credenciales para ingresar a <strong style={{ color: '#8f94a5' }}>/login</strong> y acceder al panel del conductor. Las credenciales se muestran una sola vez al guardar.</p>
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

      {/* Denuncia Detail Modal */}
      {selectedComplaintForDetail && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-dark" style={{
            background: '#121527',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            <button
              onClick={() => setSelectedComplaintForDetail(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✕
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(255,77,106,0.1)', color: '#FF4D6A', fontSize: '10px', fontWeight: 700 }}>DENUNCIA</span>
              <span style={{ fontSize: '11px', color: '#8f94a5' }}>ID: {selectedComplaintForDetail.id}</span>
            </div>

            <div>
              <h3 style={{ color: '#fff', fontSize: '18px', fontWeight: 700, margin: 0 }}>{selectedComplaintForDetail.type}</h3>
              <p style={{ color: '#8f94a5', fontSize: '12px', margin: '4px 0 0' }}>{selectedComplaintForDetail.date} · {selectedComplaintForDetail.time || 'N/A'}</p>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#8f94a5', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Descripción del suceso:</span>
                <div style={{ color: '#fff', background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '12px', lineHeight: 1.5 }}>
                  {selectedComplaintForDetail.desc}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
                <div>
                  <span style={{ color: '#8f94a5', display: 'block', fontSize: '11px' }}>Chofer denunciado:</span>
                  <strong style={{ color: '#fff' }}>{selectedComplaintForDetail.driver}</strong>
                </div>
                <div>
                  <span style={{ color: '#8f94a5', display: 'block', fontSize: '11px' }}>Unidad de colectivo:</span>
                  <strong style={{ color: '#fff' }}>Unidad {selectedComplaintForDetail.bus}</strong>
                </div>
              </div>

              <div>
                <span style={{ color: '#8f94a5', display: 'block', fontSize: '11px', marginBottom: '2px' }}>Lugar del suceso:</span>
                <strong style={{ color: '#fff' }}>{selectedComplaintForDetail.stop || 'Ubicación Desconocida'}</strong>
                
                <div style={{
                  marginTop: '8px',
                  height: '140px',
                  borderRadius: '8px',
                  background: '#0b0f19',
                  border: '1px solid rgba(255,255,255,0.06)',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <div style={{ position: 'absolute', zIndex: 1, textAlign: 'center' }}>
                    <MapPin size={24} style={{ color: '#FF4D6A', margin: '0 auto 4px' }}/>
                    <span style={{ color: '#fff', fontSize: '10px', fontWeight: 600, background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px' }}>
                      {selectedComplaintForDetail.stop}
                    </span>
                  </div>
                  
                  <div style={{ width: '100%', height: '100%', opacity: 0.15, background: 'radial-gradient(circle, #fff 10%, transparent 11%)', backgroundSize: '12px 12px' }}/>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                onClick={() => setSelectedComplaintForDetail(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: themeColor,
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Aceptar
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

function getBusProgress(bus: any, stops: any[]) {
  if (stops.length < 2) return 0;

  let closestIdx = 0;
  let minDistance = Infinity;
  for (let i = 0; i < stops.length; i++) {
    const dist = Math.hypot(stops[i].latitude - bus.latitude, stops[i].longitude - bus.longitude);
    if (dist < minDistance) {
      minDistance = dist;
      closestIdx = i;
    }
  }

  if (closestIdx === stops.length - 1) {
    return 100;
  }
  if (closestIdx === 0) {
    const nextStop = stops[1];
    const distToCurrent = Math.hypot(stops[0].latitude - bus.latitude, stops[0].longitude - bus.longitude);
    const distToNext = Math.hypot(nextStop.latitude - bus.latitude, nextStop.longitude - bus.longitude);
    const totalDist = distToCurrent + distToNext;
    const factor = totalDist > 0 ? distToCurrent / totalDist : 0;
    return (factor / (stops.length - 1)) * 100;
  }

  const prevStop = stops[closestIdx - 1];
  const currentStop = stops[closestIdx];
  const nextStop = stops[closestIdx + 1];

  const distToPrev = Math.hypot(prevStop.latitude - bus.latitude, prevStop.longitude - bus.longitude);
  const distToNext = Math.hypot(nextStop.latitude - bus.latitude, nextStop.longitude - bus.longitude);

  let percent = 0;
  if (distToNext < distToPrev) {
    const distToCurrent = Math.hypot(currentStop.latitude - bus.latitude, currentStop.longitude - bus.longitude);
    const segmentDist = distToCurrent + distToNext;
    const factor = segmentDist > 0 ? distToCurrent / segmentDist : 0;
    percent = ((closestIdx + factor) / (stops.length - 1)) * 100;
  } else {
    const distToCurrent = Math.hypot(currentStop.latitude - bus.latitude, currentStop.longitude - bus.longitude);
    const segmentDist = distToPrev + distToCurrent;
    const factor = segmentDist > 0 ? distToPrev / segmentDist : 0;
    percent = ((closestIdx - 1 + factor) / (stops.length - 1)) * 100;
  }
  return Math.min(100, Math.max(0, percent));
}

function BusesTab({ buses, activeLine, themeColor }: { buses: any[]; activeLine: any; themeColor: string }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      {buses.length === 0 ? (
        <div style={{textAlign:'center',padding:'40px',color:'#8f94a5',fontFamily:'DM Mono',fontSize:'13px'}}>
          No hay colectivos activos en servicio para esta línea en este momento.
        </div>
      ) : (
        buses.map((b, i) => {
          const busDirection = b.direction || 'ida'
          const stops = getMockStopsForLine(activeLine, busDirection)
          const progressPercent = getBusProgress(b, stops)

          // Find current closest stop name
          let closestIdx = 0;
          let minDistance = Infinity;
          for (let sIdx = 0; sIdx < stops.length; sIdx++) {
            const dist = Math.hypot(stops[sIdx].latitude - b.latitude, stops[sIdx].longitude - b.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              closestIdx = sIdx;
            }
          }
          const closestStopName = stops[closestIdx]?.name.replace('[BLOQUEADA] ', '') || 'Parada';

          return (
            <div key={i} style={{
              background: '#121527',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              {/* Header Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{width:'42px',height:'42px',borderRadius:'12px',background:b.status==='moving'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',border:`1px solid ${b.status==='moving'?'rgba(34,211,160,0.25)':'rgba(184,200,224,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Bus size={18} style={{color:b.status==='moving'?'#22D3A0':'#8f94a5'}}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'3px'}}>
                    <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>Unidad {b.bus_unit}</span>
                    <span style={{padding:'2px 8px',borderRadius:'999px',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600,background:b.status==='moving'?'rgba(34,211,160,0.1)':'rgba(184,200,224,0.05)',color:b.status==='moving'?'#22D3A0':'#8f94a5',border:`1px solid ${b.status==='moving'?'rgba(34,211,160,0.2)':'rgba(184,200,224,0.1)'}`}}>
                      {b.status==='moving'?'EN MOVIMIENTO':'DETENIDO'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#8f94a5', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                      Sentido: {busDirection.toUpperCase()}
                    </span>
                    {b.qr_code && (
                      <span style={{ fontSize: '10px', color: '#3B82F6', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600, fontFamily: 'DM Mono' }}>
                        QR: {b.qr_code}
                      </span>
                    )}
                  </div>
                  <div style={{color:'#8f94a5',fontSize:'11px',fontFamily:'DM Mono'}}>
                    <strong style={{ color: '#fff' }}>{b.driver_name}</strong> · {b.passenger_count} pas · {b.speed_kmh} km/h · rumbo {b.heading}° · parada más cercana: <span style={{ color: themeColor }}>{closestStopName}</span>
                  </div>
                </div>
                {b.status==='moving'&&<div style={{flexShrink:0,textAlign:'right'}}>
                  <div style={{color:'#22D3A0',fontSize:'12px',fontFamily:'DM Mono',fontWeight:600}}>{b.eta_minutes} min ETA</div>
                </div>}
              </div>

              {/* Straight Line Real-time Progression */}
              {stops.length >= 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 8px' }}>
                  <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
                    
                    {/* Background line */}
                    <div style={{ position: 'absolute', left: 0, right: 0, height: '4px', background: '#1b1d2e', borderRadius: '2px', zIndex: 1 }}/>
                    
                    {/* Green/Theme fill progress */}
                    <div style={{ position: 'absolute', left: 0, width: `${progressPercent}%`, height: '4px', background: '#10B981', borderRadius: '2px', zIndex: 2, transition: 'width 1s linear' }}/>
                    
                    {/* Render Stop Pins along the line */}
                    {stops.map((stop, sIdx) => {
                      const stopPercent = (sIdx / (stops.length - 1)) * 100
                      const hasPassed = progressPercent >= stopPercent
                      return (
                        <div
                          key={stop.id}
                          title={stop.name}
                          style={{
                            position: 'absolute',
                            left: `${stopPercent}%`,
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: hasPassed ? '#10B981' : 'rgba(255, 255, 255, 0.2)',
                            border: `1.5px solid ${hasPassed ? '#fff' : '#1b1d2e'}`,
                            transform: 'translate(-50%, -50%)',
                            top: '50%',
                            zIndex: 3,
                            cursor: 'pointer'
                          }}
                        />
                      )
                    })}

                    {/* Miniature animated bus indicator */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${progressPercent}%`,
                        transform: 'translate(-50%, -50%)',
                        top: '50%',
                        zIndex: 4,
                        transition: 'left 1s linear',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <div style={{
                        background: '#10B981',
                        color: '#fff',
                        padding: '3px 6px',
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(16,185,129,0.4)',
                        border: '1.5px solid #fff',
                        whiteSpace: 'nowrap'
                      }}>
                        <Bus size={10} style={{ transform: 'scaleX(-1)' }}/>
                        <span>{b.speed_kmh} km/h</span>
                      </div>
                    </div>

                  </div>

                  {/* Stop Name Indicators under the line */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#8f94a5' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%' }}>
                      Inicio: <strong>{stops[0].name.replace('[BLOQUEADA] ', '')}</strong>
                    </span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '40%', textAlign: 'right' }}>
                      Fin: <strong>{stops[stops.length - 1].name.replace('[BLOQUEADA] ', '')}</strong>
                    </span>
                  </div>

                </div>
              )}

            </div>
          )
        })
      )}
    </div>
  )
}

function CompanyDrivers({ drivers, activeSessions = [], driverWarnings = {}, onDeleteDriver, onAddDriverClick, onUpdateDrivers, onViewComplaint, themeColor }: { drivers: any[]; activeSessions?: any[]; driverWarnings?: Record<string, number>; onDeleteDriver: (id: string) => void; onAddDriverClick: () => void; onUpdateDrivers: (list: any[]) => void; onViewComplaint: (complaint: any) => void; themeColor: string }) {
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, driverId: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const updated = drivers.map(d => {
        if (d.id === driverId) {
          return { ...d, photo: dataUrl }
        }
        return d
      })
      onUpdateDrivers(updated)
      toast.success("Foto de perfil actualizada con éxito")
    }
    reader.readAsDataURL(file)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, driverId: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const sizeStr = file.size > 1024 * 1024 
      ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` 
      : `${(file.size / 1024).toFixed(0)} KB`

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const updated = drivers.map(d => {
        if (d.id === driverId) {
          const files = d.files || []
          return {
            ...d,
            files: [
              ...files,
              {
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: sizeStr,
                data: dataUrl
              }
            ]
          }
        }
        return d
      })
      onUpdateDrivers(updated)
      toast.success(`Archivo "${file.name}" subido con éxito`)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = (driverId: string, fileIdx: number) => {
    const updated = drivers.map(d => {
      if (d.id === driverId) {
        const files = d.files || []
        return {
          ...d,
          files: files.filter((_: any, idx: number) => idx !== fileIdx)
        }
      }
      return d
    })
    onUpdateDrivers(updated)
    toast.success("Archivo eliminado correctamente")
  }

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
                  <div style={{width:'44px',height:'44px',borderRadius:'12px',overflow:'hidden',background:activeSession ? hexToRgba(themeColor, 0.15) : 'rgba(255,255,255,0.02)',border:activeSession ? `1px solid ${hexToRgba(themeColor, 0.3)}` : '1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    {d.photo ? (
                      <img src={d.photo} alt={d.name} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    ) : (
                      <Users size={18} style={{color:activeSession ? themeColor : '#8f94a5'}}/>
                    )}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap'}}>
                      <span style={{color:'#fff',fontWeight:700,fontSize:'15px'}}>{d.name}</span>
                      {activeSession ? (
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
                      ) : (
                        <span style={{
                          padding:'2px 8px',
                          borderRadius:'999px',
                          background:'rgba(255,255,255,0.03)',
                          border:'1px solid rgba(255,255,255,0.08)',
                          color:'#8f94a5',
                          fontSize:'9px',
                          fontWeight:600,
                          textTransform:'uppercase',
                          letterSpacing:'0.03em'
                        }}>
                          Fuera de servicio
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
                      {/* Left side: General Profile with Image editing */}
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                          <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', border: `2px solid ${themeColor}`, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {d.photo ? (
                              <img src={d.photo} alt={d.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Users size={32} style={{ color: '#8f94a5' }} />
                            )}
                          </div>
                          <label htmlFor={`photo-upload-${d.id}`} style={{ padding: '4px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '10px', fontWeight: 600, cursor: 'pointer', textAlign: 'center' }}>
                            Cambiar Foto
                          </label>
                          <input
                            type="file"
                            id={`photo-upload-${d.id}`}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={(e) => handlePhotoChange(e, d.id)}
                          />
                        </div>
                        
                        <div style={{ flex: 1 }}>
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

                            {/* Credentials row — read from mock_users */}
                            {(() => {
                              const driverEmail = d.email || ''
                              let creds: { email: string; password: string } | null = null
                              try {
                                const mockUsers = JSON.parse(localStorage.getItem('mock_users') || '[]')
                                const found = mockUsers.find((u: any) => u.email?.toLowerCase() === driverEmail.toLowerCase() || u.name === d.name)
                                if (found) creds = { email: found.email, password: found.password }
                              } catch (e) {}
                              if (!creds) return null
                              return (
                                <>
                                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: '6px', paddingTop: '10px' }}>
                                    <span style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Credenciales de Acceso</span>
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: '#8f94a5' }}>Email:</span>
                                    <span style={{ color: '#60A5FA', fontWeight: 500, fontFamily: 'DM Mono', fontSize: '12px' }}>{creds.email}</span>
                                  </div>
                                  <PasswordRow password={creds.password} themeColor={themeColor} />
                                </>
                              )
                            })()}
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
                            <span style={{ color: '#8f94a5', display: 'block', marginBottom: '4px' }}>Registro de Denuncias (Haz clic para ver detalle):</span>
                            {(d.historyDenuncias || []).length === 0 ? (
                              <span style={{ color: '#64748b' }}>Chofer sin denuncias activas</span>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {(d.historyDenuncias || []).map((rep: any, rIdx: number) => (
                                  <div
                                    key={rIdx}
                                    onClick={() => onViewComplaint(rep)}
                                    style={{
                                      padding: '6px 10px',
                                      borderRadius: '6px',
                                      background: 'rgba(255,77,106,0.04)',
                                      border: '1px solid rgba(255,77,106,0.1)',
                                      color: '#8f94a5',
                                      cursor: 'pointer',
                                      transition: 'border-color 150ms'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,77,106,0.25)'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,77,106,0.1)'}
                                  >
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

                    {/* Document Files Section */}
                    <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                      <h5 style={{ color: '#fff', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '12px', letterSpacing: '0.05em' }}>Documentos y Archivos Relacionados</h5>
                      
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '14px' }}>
                        <label
                          htmlFor={`file-upload-${d.id}`}
                          style={{
                            padding: '6px 14px',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 200ms'
                          }}
                        >
                          📎 Cargar Archivo
                        </label>
                        <input
                          type="file"
                          id={`file-upload-${d.id}`}
                          style={{ display: 'none' }}
                          accept=".zip,.pdf,.doc,.docx,image/*"
                          onChange={(e) => handleFileUpload(e, d.id)}
                        />
                        <span style={{ color: '#8f94a5', fontSize: '11px' }}>Soporta PDF, Word, ZIP e imágenes.</span>
                      </div>

                      {(d.files || []).length === 0 ? (
                        <div style={{ color: '#64748b', fontSize: '11px', fontStyle: 'italic' }}>No hay archivos adjuntos en el perfil de este chofer.</div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {(d.files || []).map((file: any, fIdx: number) => {
                            let fileIcon = '📄';
                            if (file.type.includes('image')) fileIcon = '🖼️';
                            else if (file.type.includes('pdf')) fileIcon = '📕';
                            else if (file.type.includes('zip')) fileIcon = '📦';
                            else if (file.type.includes('word') || file.name.endsWith('.doc') || file.name.endsWith('.docx')) fileIcon = '📘';

                            return (
                              <div
                                key={fIdx}
                                style={{
                                  background: 'rgba(255,255,255,0.02)',
                                  border: '1px solid rgba(255,255,255,0.06)',
                                  borderRadius: '8px',
                                  padding: '8px 12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  <span style={{ fontSize: '16px' }}>{fileIcon}</span>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ color: '#fff', fontSize: '11px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
                                      {file.name}
                                    </div>
                                    <div style={{ color: '#8f94a5', fontSize: '9px' }}>
                                      {file.size}
                                    </div>
                                  </div>
                                </div>
                                
                                <div style={{ display: 'flex', gap: '6px' }}>
                                  <a
                                    href={file.data}
                                    download={file.name}
                                    style={{
                                      color: themeColor,
                                      background: 'none',
                                      border: 'none',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    Descargar
                                  </a>
                                  <button
                                    onClick={() => handleRemoveFile(d.id, fIdx)}
                                    style={{
                                      color: '#FF4D6A',
                                      background: 'none',
                                      border: 'none',
                                      fontSize: '11px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
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

                    {/* Action bar: Notes + Delete */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                      <DriverNotesPanel driverId={d.id} driverName={d.name} themeColor={themeColor} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(`¿Estás seguro de que deseas eliminar al chofer ${d.name}?`)) {
                            onDeleteDriver(d.id)
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '8px',
                          background: 'rgba(255,77,106,0.08)',
                          border: '1px solid rgba(255,77,106,0.2)',
                          color: '#FF4D6A',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 200ms'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,106,0.15)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,77,106,0.08)'}
                      >
                        <Trash2 size={13}/> Eliminar Chofer
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


// ─── Admin Notes Panel for a driver ─────────────────────────────────────────
function DriverNotesPanel({ driverId, driverName, themeColor }: { driverId: string; driverName: string; themeColor: string }) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<any[]>([])
  const [text, setText] = useState('')

  const loadNotes = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(`mock_driver_notes_${driverId}`) || '[]')
      setNotes(stored)
    } catch {}
  }

  useEffect(() => { if (open) loadNotes() }, [open, driverId])

  const saveNote = () => {
    if (!text.trim()) return
    const updated = [...notes, { id: `note-${Date.now()}`, text: text.trim(), date: new Date().toLocaleString('es-AR'), author: 'Admin' }]
    setNotes(updated)
    localStorage.setItem(`mock_driver_notes_${driverId}`, JSON.stringify(updated))
    setText('')
  }

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id)
    setNotes(updated)
    localStorage.setItem(`mock_driver_notes_${driverId}`, JSON.stringify(updated))
  }

  return (
    <div style={{ flex: 1, marginRight: '12px' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          padding: '8px 14px', borderRadius: '8px',
          background: open ? `${themeColor}22` : 'rgba(255,255,255,0.04)',
          border: `1px solid ${open ? themeColor : 'rgba(255,255,255,0.1)'}`,
          color: open ? themeColor : '#8f94a5',
          fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 200ms'
        }}
      >
        <MessageSquarePlus size={13} /> Notas{notes.length > 0 || open ? ` (${notes.length})` : ''}
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            marginTop: '10px', padding: '14px', borderRadius: '10px',
            background: 'rgba(6,8,16,0.6)', border: `1px solid ${themeColor}33`,
            display: 'flex', flexDirection: 'column', gap: '10px'
          }}
        >
          {/* Note input */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveNote()}
              placeholder={`Nota sobre ${driverName}…`}
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none', fontFamily: 'DM Sans,sans-serif'
              }}
            />
            <button
              onClick={saveNote}
              disabled={!text.trim()}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                background: themeColor, border: 'none', color: '#fff',
                cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.5
              }}
            >
              Guardar
            </button>
          </div>

          {/* Existing notes */}
          {notes.length === 0 ? (
            <div style={{ color: '#8f94a5', fontSize: '11px', fontFamily: 'DM Mono', textAlign: 'center', padding: '8px 0' }}>
              No hay notas aún. Escribí la primera arriba.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {notes.map(n => (
                <div key={n.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px',
                  padding: '8px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: '#e2e8f0', fontSize: '12px', lineHeight: 1.4 }}>{n.text}</div>
                    <div style={{ color: '#8f94a5', fontSize: '10px', fontFamily: 'DM Mono', marginTop: '3px' }}>
                      {n.author} · {n.date}
                    </div>
                  </div>
                  <button
                    onClick={() => deleteNote(n.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#FF4D6A', padding: '2px', flexShrink: 0, opacity: 0.6 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                    title="Eliminar nota"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function QRTab({qrCodes,newBusUnit,setNewBusUnit,newBusHasAC,setNewBusHasAC,newBusIsNew,setNewBusIsNew,newBusHasRamp,setNewBusHasRamp,onGenerate,onDownload,onDelete,onToggleActive,themeColor}:{
  qrCodes:any[];newBusUnit:string;setNewBusUnit:(v:string)=>void;
  newBusHasAC:boolean;setNewBusHasAC:(v:boolean)=>void;
  newBusIsNew:boolean;setNewBusIsNew:(v:boolean)=>void;
  newBusHasRamp:boolean;setNewBusHasRamp:(v:boolean)=>void;
  onGenerate:()=>void;onDownload:(qr:any)=>void;onDelete:(id:string)=>void;onToggleActive:(id:string,status:boolean)=>void;themeColor:string
}) {
  const [selected, setSelected] = useState<any>(null)

  const ToggleOption = ({ label, sublabel, value, onChange, icon }: { label: string; sublabel?: string; value: boolean; onChange: (v: boolean) => void; icon: string }) => (
    <div
      onClick={() => onChange(!value)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
        background: value ? hexToRgba(themeColor, 0.08) : 'rgba(255,255,255,0.02)',
        border: `1px solid ${value ? hexToRgba(themeColor, 0.3) : 'rgba(255,255,255,0.07)'}`,
        transition: 'all 180ms',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '13px', fontWeight: 600 }}>{label}</div>
          {sublabel && <div style={{ color: '#64748b', fontSize: '11px', marginTop: '1px' }}>{sublabel}</div>}
        </div>
      </div>
      <div style={{
        width: '36px', height: '20px', borderRadius: '10px', position: 'relative',
        background: value ? themeColor : 'rgba(255,255,255,0.1)',
        transition: 'background 200ms', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: '2px', left: value ? '18px' : '2px',
          width: '16px', height: '16px', borderRadius: '50%',
          background: '#fff', transition: 'left 200ms',
          boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
        }} />
      </div>
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      {/* Generator */}
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '24px',
      }}>
        <div style={{color:'#8f94a5',fontSize:'12px',fontWeight:500,textTransform:'uppercase',marginBottom:'14px',letterSpacing:'0.05em'}}>Generar nuevo QR / Unidad</div>

        {/* Bus unit number */}
        <div style={{marginBottom:'14px'}}>
          <label style={{display:'block',color:'#8f94a5',fontSize:'12px',marginBottom:'8px',fontWeight:500}}>Número de unidad</label>
          <div style={{display:'flex',gap:'10px'}}>
            <input
              className="input-dark" placeholder="ej: 005"
              value={newBusUnit} onChange={e=>setNewBusUnit(e.target.value)}
              style={{flex:1}}
              onKeyDown={e=>e.key==='Enter'&&onGenerate()}
            />
            <button onClick={onGenerate} disabled={!newBusUnit.trim()} style={{padding:'13px 20px',borderRadius:'10px',background:hexToRgba(themeColor, 0.15),border:`1px solid ${hexToRgba(themeColor, 0.3)}`,color:themeColor,fontWeight:600,fontSize:'13px',cursor:newBusUnit.trim()?'pointer':'not-allowed',display:'flex',alignItems:'center',gap:'8px',flexShrink:0,transition:'all 200ms',opacity:newBusUnit.trim()?1:0.5}}>
              <Plus size={15}/> Generar QR
            </button>
          </div>
        </div>

        {/* Bus characteristics */}
        <div style={{borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:'14px'}}>
          <div style={{color:'#8f94a5',fontSize:'11px',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:'10px'}}>Características del vehículo</div>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            <ToggleOption
              icon="❄️"
              label="Aire acondicionado"
              value={newBusHasAC}
              onChange={setNewBusHasAC}
            />
            <ToggleOption
              icon="🕐"
              label="Antigüedad del vehículo"
              sublabel={newBusIsNew ? 'Menos de 5 años' : 'Más de 5 años'}
              value={newBusIsNew}
              onChange={setNewBusIsNew}
            />
            <ToggleOption
              icon="♿"
              label="Rampa para sillas de ruedas"
              value={newBusHasRamp}
              onChange={setNewBusHasRamp}
            />
          </div>
        </div>

        <p style={{color:'#8f94a5',fontSize:'11px',marginTop:'14px',lineHeight:1.5}}>
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
              transition: 'all 200ms',
              boxShadow: selected?.id===qr.id?`0 0 12px ${hexToRgba(themeColor, 0.15)}` : 'none'
            }} onClick={()=>{
              onToggleActive(qr.id, qr.is_active)
              setSelected(selected?.id===qr.id?null:qr)
            }}>
              <QRDisplay token={qr.qr_token} busUnit={qr.bus_unit}/>
              {/* Characteristics badges */}
              {(qr.has_ac !== undefined || qr.is_new !== undefined || qr.has_ramp !== undefined) && (
                <div style={{display:'flex',flexWrap:'wrap',gap:'4px',margin:'10px 0 6px'}}>
                  {qr.has_ac !== undefined && (
                    <span style={{padding:'2px 7px',borderRadius:'20px',fontSize:'10px',fontWeight:600,background:qr.has_ac?'rgba(34,211,160,0.12)':'rgba(255,255,255,0.04)',color:qr.has_ac?'#22D3A0':'#64748b',border:`1px solid ${qr.has_ac?'rgba(34,211,160,0.3)':'rgba(255,255,255,0.07)'}`}}>
                      {qr.has_ac ? '❄️ AC' : '🌡️ Sin AC'}
                    </span>
                  )}
                  {qr.is_new !== undefined && (
                    <span style={{padding:'2px 7px',borderRadius:'20px',fontSize:'10px',fontWeight:600,background:qr.is_new?'rgba(96,165,250,0.12)':'rgba(255,255,255,0.04)',color:qr.is_new?'#60A5FA':'#64748b',border:`1px solid ${qr.is_new?'rgba(96,165,250,0.3)':'rgba(255,255,255,0.07)'}`}}>
                      {qr.is_new ? '🕐 &lt;5 años' : '🕐 &gt;5 años'}
                    </span>
                  )}
                  {qr.has_ramp !== undefined && qr.has_ramp && (
                    <span style={{padding:'2px 7px',borderRadius:'20px',fontSize:'10px',fontWeight:600,background:'rgba(167,139,250,0.12)',color:'#A78BFA',border:'1px solid rgba(167,139,250,0.3)'}}>
                      ♿ Rampa
                    </span>
                  )}
                </div>
              )}
              <div style={{marginTop:'8px',display:'flex',gap:'8px'}}>
                <button onClick={e=>{e.stopPropagation();onDownload(qr)}} style={{flex:1,padding:'8px',borderRadius:'8px',background:hexToRgba(themeColor, 0.1),border:`1px solid ${hexToRgba(themeColor, 0.25)}`,color:themeColor,fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}>
                  <Download size={12}/> Descargar
                </button>
                <button onClick={e=>{e.stopPropagation();onDelete(qr.id)}} style={{padding:'8px',borderRadius:'8px',background:'rgba(255, 77, 106, 0.1)',border:'1px solid rgba(255, 77, 106, 0.25)',color:'#ff4d6a',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <Trash2 size={12}/>
                </button>
              </div>
              <div style={{marginTop:'8px',display:'flex',alignItems:'center',gap:'6px'}}>
                <div style={{width:'6px',height:'6px',borderRadius:'50%',background:qr.is_active?'#22D3A0':'#FF4D6A'}}/>
                <span style={{color:qr.is_active?'#22D3A0':'#FF4D6A',fontSize:'10px',fontFamily:'DM Mono',fontWeight:600}}>{qr.is_active?'Activo':'Inactivo'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StopsTab({ activeLine, themeColor }: { activeLine: any; themeColor: string }) {
  const [stopsList, setStopsList] = useState<any[]>([])
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)

  useEffect(() => {
    const baseStops = getMockStopsForLine(activeLine, 'all')
    const mapped = baseStops.map((stop, idx) => {
      const seed = stop.name.charCodeAt(0) + stop.name.charCodeAt(stop.name.length - 1) + idx
      const subidas = Math.round(((seed % 60) + 40) * 1.8)
      const bajadas = Math.round(((seed % 50) + 30) * 1.8)
      const espera = (seed % 6) + 3
      return {
        ...stop,
        subidas,
        bajadas,
        espera
      }
    })
    setStopsList(mapped)
    if (mapped.length > 0) {
      setSelectedStopId(mapped[0].id)
    }
  }, [activeLine])

  const selectedStop = stopsList.find(s => s.id === selectedStopId)

  const hourlyData = useMemo(() => {
    if (!selectedStop) return []
    const seed = selectedStop.name.charCodeAt(0) + selectedStop.name.charCodeAt(selectedStop.name.length - 1)
    return Array.from({ length: 24 }, (_, h) => {
      const isPeak = (h >= 7 && h <= 9) || (h >= 17 && h <= 19)
      const multiplier = isPeak ? 3.2 : 1
      const subidas = Math.round(((seed + h) % 12 + 4) * multiplier)
      const bajadas = Math.round(((seed * h + 7) % 10 + 3) * multiplier)
      return {
        h: `${String(h).padStart(2, '0')}:00`,
        subidas,
        bajadas
      }
    })
  }, [selectedStop])

  const barFillSubidas = hexToRgba(themeColor, 0.15)
  const barFillBajadas = 'rgba(143, 148, 165, 0.15)'

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '560px' }}>
      {/* Left Column: Stops List with Stats */}
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div>
          <h4 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, margin: 0 }}>Listado de Paradas</h4>
          <p style={{ color: '#8f94a5', fontSize: '11px', margin: '2px 0 10px' }}>Selecciona una parada para ver su análisis por hora</p>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '520px', paddingRight: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {stopsList.map((s) => {
            const isSelected = s.id === selectedStopId
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStopId(s.id)}
                style={{
                  background: isSelected ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.005)',
                  borderRadius: '10px',
                  border: `1.5px solid ${isSelected ? themeColor : 'rgba(255, 255, 255, 0.04)'}`,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 200ms',
                  boxShadow: isSelected ? `0 0 12px ${hexToRgba(themeColor, 0.1)}` : 'none'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: isSelected ? '#fff' : '#d1d5db', fontSize: '13px', fontWeight: 600 }}>{s.name.replace('[BLOQUEADA] ', '')}</span>
                  {s.name.includes('[BLOQUEADA]') && (
                    <span style={{ fontSize: '9px', color: '#FF4D6A', background: 'rgba(255,77,106,0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>BLOQUEADA</span>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#8f94a5' }}>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span>📥 <strong style={{ color: themeColor }}>{s.subidas}</strong> subieron</span>
                    <span>📤 <strong style={{ color: '#9ca3af' }}>{s.bajadas}</strong> bajaron</span>
                  </div>
                  <span style={{ fontFamily: 'DM Mono' }}>Espera: {s.espera}m</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Column: Hourly charts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Subidas Chart */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>Subidas por Hora</h4>
            <p style={{ color: '#8f94a5', fontSize: '11px', margin: '2px 0 0' }}>Parada: {selectedStop ? selectedStop.name.replace('[BLOQUEADA] ', '') : '---'}</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false}/>
              <XAxis dataKey="h" tick={{fill:'#8f94a5',fontSize:10}} interval={3}/>
              <YAxis tick={{fill:'#8f94a5',fontSize:10}}/>
              <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }}/>
              <Bar dataKey="subidas" name="Subieron" fill={barFillSubidas} stroke={themeColor} strokeWidth={1.5} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Bajadas Chart */}
        <div style={{
          background: '#121527',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <div>
            <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>Bajadas por Hora</h4>
            <p style={{ color: '#8f94a5', fontSize: '11px', margin: '2px 0 0' }}>Parada: {selectedStop ? selectedStop.name.replace('[BLOQUEADA] ', '') : '---'}</p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false}/>
              <XAxis dataKey="h" tick={{fill:'#8f94a5',fontSize:10}} interval={3}/>
              <YAxis tick={{fill:'#8f94a5',fontSize:10}}/>
              <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }}/>
              <Bar dataKey="bajadas" name="Bajaron" fill={barFillBajadas} stroke="#8f94a5" strokeWidth={1.5} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  )
}

function CompanyReports({ reports, driverWarnings = {}, onAddWarning, onResolve, onViewComplaint, themeColor }: { reports: any[]; driverWarnings?: Record<string, number>; onAddWarning: (driver: string) => void; onResolve: (id: string) => void; onViewComplaint: (complaint: any) => void; themeColor: string }) {
  const statusStyle:Record<string,any>={pending:{bg:'rgba(240,180,41,0.08)',c:'#F0B429',b:'rgba(240,180,41,0.2)'},resolved:{bg:'rgba(34,211,160,0.08)',c:'#22D3A0',b:'rgba(34,211,160,0.2)'}}
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      {reports.map(r=>{
        const warnings = driverWarnings[r.driver] || 0
        
        return (
          <div
            key={r.id}
            onClick={() => onViewComplaint(r)}
            style={{
              background: '#121527',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              cursor: 'pointer',
              transition: 'border-color 200ms'
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
          >
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

            {/* Reporter Profile Details */}
            {r.reporter && (
              <div style={{
                marginTop: '4px',
                paddingTop: '10px',
                borderTop: '1px solid rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                background: 'rgba(255,255,255,0.01)',
                padding: '6px 12px',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {r.reporter.avatar ? (
                    <img
                      src={r.reporter.avatar}
                      alt={r.reporter.name}
                      style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }}
                    />
                  ) : (
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#4A5568', color: '#fff', fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {r.reporter.name.charAt(0)}
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600 }}>{r.reporter.name}</span>
                    <span style={{ fontSize: '9px', color: '#8f94a5' }}>Denunciante registrado</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    fontSize: '10px',
                    color: r.reporter.count > 10 ? '#FF4D6A' : '#22D3A0',
                    background: r.reporter.count > 10 ? 'rgba(255,77,106,0.1)' : 'rgba(34,211,160,0.1)',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    fontWeight: 700,
                    fontFamily: 'DM Mono'
                  }}>
                    {r.reporter.count} denuncias en esta línea
                  </span>
                  {r.reporter.count > 10 && (
                    <div style={{ fontSize: '8px', color: '#FF4D6A', marginTop: '2px', fontWeight: 600 }}>⚠️ Actividad inusualmente alta (Posible Spam)</div>
                  )}
                </div>
              </div>
            )}
            
            <div style={{display:'flex',gap:'8px',marginTop:'4px',alignItems:'center'}}>
              {r.status==='pending' && (
                <button
                  onClick={(e)=>{ e.stopPropagation(); onResolve(r.id); }}
                  style={{flex:2,padding:'8px',borderRadius:'8px',background:'rgba(34,211,160,0.08)',border:'1px solid rgba(34,211,160,0.2)',color:'#22D3A0',fontSize:'12px',fontWeight:600,cursor:'pointer'}}
                >
                  Marcar resuelto
                </button>
              )}
              <button
                onClick={(e)=>{ e.stopPropagation(); onAddWarning(r.driver); }}
                style={{flex:1,padding:'8px 12px',borderRadius:'8px',background:'rgba(255,77,106,0.08)',border:'1px solid rgba(255,77,106,0.25)',color:'#FF4D6A',fontSize:'11px',fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'5px'}}
              >
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

function CalendarTab({ themeColor, activeLine, activeStats }: { themeColor: string; activeLine: any; activeStats: { rating: string; punctuality: string; dailyPas: number } }) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  const [selected, setSelected] = useState<any>(null)
  const [historyBaseMonth, setHistoryBaseMonth] = useState<string>(format(new Date(), 'yyyy-MM'))

  if (activeLine?.line_number === '0') {
    return (
      <div style={{
        background: '#121527',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '48px 24px',
        textAlign: 'center',
        color: '#8f94a5'
      }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>📅</div>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>Sin Historial de Viajes</div>
        <p style={{ fontSize: '12px', margin: 0 }}>Aún no se han registrado viajes ni métricas de operación para la Línea 0.</p>
      </div>
    )
  }

  const getRichDetails = (item: any) => {
    if (!item) return null;
    const seed = item.passengers;
    const rawStops = getMockStopsForLine(activeLine, 'ida')
    const stopsList = activeLine.line_number === '0'
      ? rawStops.map(s => ({ name: s.name, flow: 0 }))
      : [
          { name: 'Plaza Italia', flow: Math.round(seed * 0.28) },
          { name: 'Estación Palermo', flow: Math.round(seed * 0.22) },
          { name: 'Barrancas de Belgrano', flow: Math.round(seed * 0.18) }
        ];
    
    let activeBuses = [];
    try {
      const targetDateStr = format(item.date, 'yyyy-MM-dd')
      const key = `mock_active_buses_line_${activeLine.line_number}_${targetDateStr}`
      const recordedBuses = JSON.parse(localStorage.getItem(key) || '[]')
      activeBuses = recordedBuses.length > 0
        ? recordedBuses
        : (activeLine.line_number !== '12'
           ? []
           : (item.type === 'day'
              ? [`Coche ${item.bus}`, `Coche 30${(seed % 4) + 1}`, `Coche 305`]
              : [`Coche 301`, `Coche 302`, `Coche 304`, `Coche 305`].slice(0, item.busesCount || 4)));
    } catch (e) {
      activeBuses = activeLine.line_number === '12' ? [`Coche 301`, `Coche 302`, `Coche 305`] : []
    }

    const peakHour = (seed % 2 === 0) ? '08:00 - 09:30 (Pico Mañana)' : '17:30 - 19:00 (Pico Tarde)';
    
    let ageGroup10_18 = 0;
    let ageGroup19_30 = 0;
    let ageGroup31_50 = 0;
    let ageGroup51_70 = 0;

    try {
      const boardingsKey = `mock_boardings_line_${activeLine.line_number}`
      const liveBoardings = JSON.parse(localStorage.getItem(boardingsKey) || '[]')
      
      let matching = liveBoardings
      if (item.type === 'day') {
        const targetDateStr = format(item.date, 'yyyy-MM-dd')
        matching = liveBoardings.filter((b: any) => b.date === targetDateStr)
      }
      
      if (matching.length > 0) {
        let c1 = 0, c2 = 0, c3 = 0, c4 = 0
        matching.forEach((b: any) => {
          if (b.age >= 10 && b.age <= 18) c1++
          else if (b.age >= 19 && b.age <= 30) c2++
          else if (b.age >= 31 && b.age <= 50) c3++
          else if (b.age >= 51 && b.age <= 70) c4++
        })
        const tot = matching.length
        ageGroup10_18 = Math.round((c1 / tot) * 100)
        ageGroup19_30 = Math.round((c2 / tot) * 100)
        ageGroup31_50 = Math.round((c3 / tot) * 100)
        ageGroup51_70 = 100 - ageGroup10_18 - ageGroup19_30 - ageGroup31_50
      } else {
        if (activeLine.line_number === '0') {
          ageGroup10_18 = 0
          ageGroup19_30 = 0
          ageGroup31_50 = 0
          ageGroup51_70 = 0
        } else {
          ageGroup10_18 = 15 + (seed % 8)
          ageGroup19_30 = 35 + (seed % 12)
          ageGroup31_50 = 30 + (seed % 10)
          ageGroup51_70 = 100 - ageGroup10_18 - ageGroup19_30 - ageGroup31_50
        }
      }
    } catch (e) {
      console.error(e)
    }

    return { stopsList, activeBuses, peakHour, ageStats: { ageGroup10_18, ageGroup19_30, ageGroup31_50, ageGroup51_70 } };
  };

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
      bus: ['301', '303', '305', '302', '304'][i % 5],
      hours: `${6 + (i % 4)}:00 - ${14 + (i % 4)}:00`
    })
  }
  let totalDayPas = 0
  for (const d of days) totalDayPas += d.passengers
  const dayAvg = Math.round(totalDayPas / 30)

  // Calculate unique months to display name if changed
  const uniqueMonths = new Set(days.map(x => x.date.getMonth()))
  const hasMonthChange = uniqueMonths.size > 1

  // 2. Week Data (weeks of the selected month ONLY)
  const weeks = []
  const daysInMonth = monthEnd.getDate()
  const numWeeks = Math.ceil(daysInMonth / 7)
  
  for (let i = 0; i < numWeeks; i++) {
    const startDay = i * 7 + 1
    const endDay = Math.min((i + 1) * 7, daysInMonth)
    
    const startD = new Date(year, month - 1, startDay)
    const endD = new Date(year, month - 1, endDay)
    
    const seed = i * 14.5
    const pct = 0.8 + ((seed * 23) % 40) / 100
    const numDaysInThisWeek = endDay - startDay + 1
    const passengers = Math.round(activeStats.dailyPas * numDaysInThisWeek * pct)
    
    weeks.push({
      type: 'week',
      date: endD,
      label: `${i + 1}`,
      dateRange: `${format(startD, 'd MMM', { locale: es })} - ${format(endD, 'd MMM', { locale: es })}`,
      passengers,
      busesCount: 5 + (i % 4),
      busiestDayName: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][i % 6]
    })
  }
  let totalWeekPas = 0
  for (const w of weeks) totalWeekPas += w.passengers
  const weekAvg = Math.round(totalWeekPas / weeks.length)

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
                  <span style={{color: '#8f94a5', fontSize: '8px', fontFamily: 'DM Mono', textTransform: 'uppercase', display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                    <span>{d.dayName}</span>
                    {hasMonthChange && (
                      <span style={{ fontSize: '7px', opacity: 0.8, marginTop: '1px' }}>
                        {format(d.date, 'MMM', { locale: es }).toUpperCase()}
                      </span>
                    )}
                  </span>
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
                  <span style={{color: colors.text, fontSize: '14px', fontWeight: 700}}>Semana {w.label}</span>
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
                {(getRichDetails(selected)?.activeBuses || []).map((bus: any, idx: number) => (
                  <span key={idx} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}>
                    {bus}
                  </span>
                ))}
              </div>
              <div style={{ color: '#8f94a5', fontSize: '11px', marginTop: '12px' }}>
                {selected.type === 'day' ? `Horario: ${selected.hours}` : `${selected.busesCount || 4} coches registrados`}
              </div>
            </div>

            {/* Box 4: Distribución por Edad */}
            <div style={{ background: 'rgba(6,8,16,0.3)', borderRadius: '10px', padding: '16px' }}>
              <div style={{ color: '#8f94a5', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Distribución por Edad</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', color: '#fff' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>10-18 años</span>
                    <span style={{ fontFamily: 'DM Mono' }}>{getRichDetails(selected)?.ageStats.ageGroup10_18}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}>
                    <div style={{ background: '#22d3ee', height: '100%', borderRadius: '2px', width: `${getRichDetails(selected)?.ageStats.ageGroup10_18}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>19-30 años</span>
                    <span style={{ fontFamily: 'DM Mono' }}>{getRichDetails(selected)?.ageStats.ageGroup19_30}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}>
                    <div style={{ background: themeColor, height: '100%', borderRadius: '2px', width: `${getRichDetails(selected)?.ageStats.ageGroup19_30}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>31-50 años</span>
                    <span style={{ fontFamily: 'DM Mono' }}>{getRichDetails(selected)?.ageStats.ageGroup31_50}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}>
                    <div style={{ background: '#00c689', height: '100%', borderRadius: '2px', width: `${getRichDetails(selected)?.ageStats.ageGroup31_50}%` }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>51-70 años</span>
                    <span style={{ fontFamily: 'DM Mono' }}>{getRichDetails(selected)?.ageStats.ageGroup51_70}%</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.1)', height: '4px', borderRadius: '2px' }}>
                    <div style={{ background: '#f59e0b', height: '100%', borderRadius: '2px', width: `${getRichDetails(selected)?.ageStats.ageGroup51_70}%` }} />
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

// ─── Buenos Aires Street Grid Rotation Routing ─────────────────────────────
function rotatePoint(p: any, angleRad: number) {
  const cosVal = Math.cos(angleRad);
  const sinVal = Math.sin(angleRad);
  // Scale longitude by cos(-34.6) to make coordinates isotropic
  const scaleX = 0.823;
  const lat = p.lat !== undefined ? p.lat : p.latitude;
  const lng = p.lng !== undefined ? p.lng : p.longitude;
  const lngScaled = lng * scaleX;
  return {
    x: lngScaled * cosVal - lat * sinVal,
    y: lngScaled * sinVal + lat * cosVal
  };
}

function unrotatePoint(x: number, y: number, angleRad: number) {
  const cosVal = Math.cos(angleRad);
  const sinVal = Math.sin(angleRad);
  const scaleX = 0.823;
  
  const lngScaled = x * cosVal + y * sinVal;
  const lat = -x * sinVal + y * cosVal;
  
  return {
    lat: lat,
    lng: lngScaled / scaleX
  };
}

function getDetourOption(p1: any, p2: any, optionIndex: number) {
  // Extract coordinate values robustly
  const lat1 = p1.lat !== undefined ? p1.lat : p1.latitude;
  const lng1 = p1.lng !== undefined ? p1.lng : p1.longitude;
  const lat2 = p2.lat !== undefined ? p2.lat : p2.latitude;
  const lng2 = p2.lng !== undefined ? p2.lng : p2.longitude;
  
  const scaleX = 0.823;
  
  // Street angles in radians matching the map grid:
  // - Vertical streets (Entre Ríos/Callao) run at -3.4 degrees (up-left)
  // - Horizontal streets (Santa Fe/Ayacucho/Alsina) run at +2.8 degrees (up-right)
  const thetaV = -3.4 * Math.PI / 180;
  const thetaH = 2.8 * Math.PI / 180;
  
  // Projection matrix components
  const m11 = -Math.cos(thetaH);
  const m12 = Math.sin(thetaV);
  const m21 = -Math.sin(thetaH);
  const m22 = Math.cos(thetaV);
  
  const det = m11 * m22 - m12 * m21;
  
  // Forward transform: skewed grid coordinates (u, v) -> local lat/lng deltas
  function gridToLocal(u: number, v: number) {
    const dxScaled = u * m11 + v * m12;
    const dy = u * m21 + v * m22;
    return {
      lat: dy,
      lng: dxScaled / scaleX
    };
  }
  
  // Inverse transform: local lat/lng deltas -> skewed grid coordinates (u, v)
  function localToGrid(dx: number, dy: number) {
    const dxScaled = dx * scaleX;
    const u = (m22 * dxScaled - m12 * dy) / det;
    const v = (-m21 * dxScaled + m11 * dy) / det;
    return { u, v };
  }
  
  const originLat = lat1;
  const originLng = lng1;
  
  const targetGrid = localToGrid(lng2 - originLng, lat2 - originLat);
  const blockOffset = 0.0012; // Approx 1 block spacing
  
  let path: {lat: number, lng: number}[] = [];
  
  if (optionIndex === 0) {
    // Option 1: Turn at u = targetGrid.u, v = 0
    const c1Local = gridToLocal(targetGrid.u, 0);
    path = [
      { lat: lat1, lng: lng1 },
      { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
      { lat: lat2, lng: lng2 }
    ];
  } else if (optionIndex === 1) {
    // Option 2: Turn at u = 0, v = targetGrid.v
    const c1Local = gridToLocal(0, targetGrid.v);
    path = [
      { lat: lat1, lng: lng1 },
      { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
      { lat: lat2, lng: lng2 }
    ];
  } else if (optionIndex === 2) {
    // Option 3: U-shape bypass offset parallel to main direction
    const isVertical = Math.abs(targetGrid.v) > Math.abs(targetGrid.u);
    if (isVertical) {
      // Shift horizontally (u-axis)
      const c1Local = gridToLocal(blockOffset, 0);
      const c2Local = gridToLocal(blockOffset, targetGrid.v);
      path = [
        { lat: lat1, lng: lng1 },
        { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
        { lat: c2Local.lat + originLat, lng: c2Local.lng + originLng },
        { lat: lat2, lng: lng2 }
      ];
    } else {
      // Shift vertically (v-axis)
      const c1Local = gridToLocal(0, blockOffset);
      const c2Local = gridToLocal(targetGrid.u, blockOffset);
      path = [
        { lat: lat1, lng: lng1 },
        { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
        { lat: c2Local.lat + originLat, lng: c2Local.lng + originLng },
        { lat: lat2, lng: lng2 }
      ];
    }
  } else if (optionIndex === 3) {
    // Option 4: U-shape bypass offset opposite direction
    const isVertical = Math.abs(targetGrid.v) > Math.abs(targetGrid.u);
    if (isVertical) {
      const c1Local = gridToLocal(-blockOffset, 0);
      const c2Local = gridToLocal(-blockOffset, targetGrid.v);
      path = [
        { lat: lat1, lng: lng1 },
        { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
        { lat: c2Local.lat + originLat, lng: c2Local.lng + originLng },
        { lat: lat2, lng: lng2 }
      ];
    } else {
      const c1Local = gridToLocal(0, -blockOffset);
      const c2Local = gridToLocal(targetGrid.u, -blockOffset);
      path = [
        { lat: lat1, lng: lng1 },
        { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
        { lat: c2Local.lat + originLat, lng: c2Local.lng + originLng },
        { lat: lat2, lng: lng2 }
      ];
    }
  } else {
    // Option 5: Zig-zag (halfway turn)
    const isVertical = Math.abs(targetGrid.v) > Math.abs(targetGrid.u);
    if (isVertical) {
      const c1Local = gridToLocal(0, targetGrid.v / 2);
      const c2Local = gridToLocal(targetGrid.u, targetGrid.v / 2);
      path = [
        { lat: lat1, lng: lng1 },
        { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
        { lat: c2Local.lat + originLat, lng: c2Local.lng + originLng },
        { lat: lat2, lng: lng2 }
      ];
    } else {
      const c1Local = gridToLocal(targetGrid.u / 2, 0);
      const c2Local = gridToLocal(targetGrid.u / 2, targetGrid.v);
      path = [
        { lat: lat1, lng: lng1 },
        { lat: c1Local.lat + originLat, lng: c1Local.lng + originLng },
        { lat: c2Local.lat + originLat, lng: c2Local.lng + originLng },
        { lat: lat2, lng: lng2 }
      ];
    }
  }
  
  return path;
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
  const [selectedDetourOptionIndex, setSelectedDetourOptionIndex] = useState(0)

  // Manual detour states
  const [isEditingDetourManually, setIsEditingDetourManually] = useState(false)
  const [manualDetourPoints, setManualDetourPoints] = useState<any[]>([])
  const [manualDetourRouteCoords, setManualDetourRouteCoords] = useState<{ lat: number; lng: number }[]>([])
  const [savedCustomDetours, setSavedCustomDetours] = useState<any[]>([])
  const [osrmRoutesCache, setOsrmRoutesCache] = useState<{[key: string]: any[]}>({})

  // Fetch street-aligned path for manual detour
  useEffect(() => {
    if (!isEditingDetourManually || !detourStartStopId || !detourEndStopId) {
      setManualDetourRouteCoords([])
      return
    }
    if (manualDetourPoints.length === 0) {
      setManualDetourRouteCoords([])
      return
    }

    const startStop = stops.find(s => s.id === detourStartStopId)
    const endStop = stops.find(s => s.id === detourEndStopId)
    if (!startStop || !endStop) return

    const coords = [
      { lat: startStop.latitude, lng: startStop.longitude },
      ...manualDetourPoints.map(p => ({ lat: p.lat, lng: p.lng })),
      { lat: endStop.latitude, lng: endStop.longitude }
    ]
    const waypoints = coords.map(c => `${c.lng},${c.lat}`).join(';')
    const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.routes[0] && data.routes[0].geometry) {
          const path = data.routes[0].geometry.coordinates.map((c: number[]) => ({ lat: c[1], lng: c[0] }))
          setManualDetourRouteCoords(path)
        }
      })
      .catch(err => console.error("OSRM manual detour error:", err))
  }, [isEditingDetourManually, manualDetourPoints, detourStartStopId, detourEndStopId, stops])



  // Load saved custom detours on mount
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('mock_saved_custom_detours') || '[]')
      setSavedCustomDetours(stored)
    } catch (e) {
      console.error(e)
    }
  }, [])

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

    // Automatically jump into manual detour input
    setIsEditingDetourManually(true)
    setManualDetourPoints([])
    setManualDetourRouteCoords([])
    toast("Haz clic en el mapa para trazar tu desvío personalizado", { icon: '✍️' })
  }

  // Select dynamic detour option index
  const selectDetourOption = (idx: number) => {
    setSelectedDetourOptionIndex(idx)
    const startStop = stops.find(s => s.id === detourStartStopId)
    const endStop = stops.find(s => s.id === detourEndStopId)
    if (!startStop || !endStop) return

    const selectCacheKey = `${detourStartStopId}_${detourEndStopId}_${idx}`
    const detourPoints = osrmRoutesCache[selectCacheKey] || getDetourOption(startStop, endStop, idx)
    const originalPath = getMockRoutePathForLine(activeLine, direction)
    const pathStartIdx = findClosestPathIndex(originalPath, startStop.latitude, startStop.longitude)
    const pathEndIdx = findClosestPathIndex(originalPath, endStop.latitude, endStop.longitude)

    let newPath = [...originalPath]
    if (pathStartIdx !== -1 && pathEndIdx !== -1 && pathStartIdx < pathEndIdx) {
      newPath = [
        ...originalPath.slice(0, pathStartIdx + 1),
        ...detourPoints,
        ...originalPath.slice(pathEndIdx)
      ]
    }

    setRoutePath(newPath)
    setActiveDetour((prev: any) => {
      if (!prev) return null;
      return {
        ...prev,
        points: detourPoints
      };
    })
    setIsDirty(true)
    toast.success(`Recorrido alternativo: Opción ${idx + 1} seleccionada`)
  }

  // Apply manual detour
  const applyManualDetour = () => {
    if (manualDetourPoints.length === 0) {
      toast.error("Por favor selecciona al menos una esquina para trazar la ruta de desvío")
      return
    }
    const startStop = stops.find(s => s.id === detourStartStopId)
    const endStop = stops.find(s => s.id === detourEndStopId)
    if (!startStop || !endStop) return

    const fullDetourPoints = manualDetourRouteCoords.length > 0
      ? manualDetourRouteCoords
      : [
          { lat: startStop.latitude, lng: startStop.longitude },
          ...manualDetourPoints,
          { lat: endStop.latitude, lng: endStop.longitude }
        ]

    const originalPath = getMockRoutePathForLine(activeLine, direction)
    const pathStartIdx = findClosestPathIndex(originalPath, startStop.latitude, startStop.longitude)
    const pathEndIdx = findClosestPathIndex(originalPath, endStop.latitude, endStop.longitude)

    let newPath = [...originalPath]
    if (pathStartIdx !== -1 && pathEndIdx !== -1 && pathStartIdx < pathEndIdx) {
      newPath = [
        ...originalPath.slice(0, pathStartIdx + 1),
        ...fullDetourPoints,
        ...originalPath.slice(pathEndIdx)
      ]
    }

    setRoutePath(newPath)
    setActiveDetour({
      reason: detourReason,
      startId: detourStartStopId,
      endId: detourEndStopId,
      points: fullDetourPoints,
      isManual: true,
      waypoints: manualDetourPoints
    })
    setIsEditingDetourManually(false)
    setIsDirty(true)
    toast.success("Desvío manual aplicado correctamente en el mapa")
  }

  // Save detour to favorites
  const saveDetourToFavorites = () => {
    if (!activeDetour) {
      toast.error("No hay ningún desvío activo para guardar")
      return
    }
    const name = prompt("Introduce un nombre para este desvío favorito:", `Desvío ${detourReason === 'accident' ? 'Accidente' : detourReason === 'protest' ? 'Corte' : 'Obras'} L${activeLine.line_number}`)
    if (!name) return

    const newFavorite = {
      id: `fav-${Date.now()}`,
      name: name,
      line_number: activeLine.line_number,
      reason: activeDetour.reason,
      startId: activeDetour.startId,
      endId: activeDetour.endId,
      points: activeDetour.points,
      waypoints: activeDetour.waypoints || []
    }

    setSavedCustomDetours(prev => {
      const next = [...prev, newFavorite]
      localStorage.setItem('mock_saved_custom_detours', JSON.stringify(next))
      return next
    })
    toast.success("¡Desvío guardado en favoritos (⭐) con éxito!")
  }

  // Load favorite detour
  const loadFavoriteDetour = (fav: any) => {
    setDetourReason(fav.reason)
    setDetourStartStopId(fav.startId)
    setDetourEndStopId(fav.endId)
    
    const startStop = stops.find(s => s.id === fav.startId)
    const endStop = stops.find(s => s.id === fav.endId)
    if (!startStop || !endStop) return

    const originalPath = getMockRoutePathForLine(activeLine, direction)
    const pathStartIdx = findClosestPathIndex(originalPath, startStop.latitude, startStop.longitude)
    const pathEndIdx = findClosestPathIndex(originalPath, endStop.latitude, endStop.longitude)

    let newPath = [...originalPath]
    if (pathStartIdx !== -1 && pathEndIdx !== -1 && pathStartIdx < pathEndIdx) {
      newPath = [
        ...originalPath.slice(0, pathStartIdx + 1),
        ...fav.points,
        ...originalPath.slice(pathEndIdx)
      ]
    }

    setRoutePath(newPath)
    setActiveDetour({
      reason: fav.reason,
      startId: fav.startId,
      endId: fav.endId,
      points: fav.points,
      isManual: true,
      waypoints: fav.waypoints || []
    })
    setIsDirty(true)
    toast.success(`Desvío favorito "${fav.name}" cargado con éxito`)
  }

  // Clear detour
  const clearDetour = () => {
    setActiveDetour(null)
    setDetourStartStopId('')
    setDetourEndStopId('')
    setSelectedDetourOptionIndex(0)
    setManualDetourPoints([])
    setManualDetourRouteCoords([])
    setIsEditingDetourManually(false)
    
    // Remove custom detour path from localStorage
    localStorage.removeItem(`mock_route_path_${activeLine.line_number}_${direction}`)
    
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
    if (activeDetour) {
      localStorage.setItem(`mock_route_path_${activeLine.line_number}_${direction}`, JSON.stringify(routePath))
      localStorage.setItem(`mock_detour_${activeLine.line_number}_${direction}`, JSON.stringify(activeDetour))
    } else {
      localStorage.removeItem(`mock_route_path_${activeLine.line_number}_${direction}`)
      localStorage.removeItem(`mock_detour_${activeLine.line_number}_${direction}`)
    }
    setIsDirty(false)
    toast.success("¡Cambios operativos guardados y sincronizados con pasajeros y choferes!")
  }

  // Handle click on map to add stop or detour waypoint
  const handleMapClick = (e: any) => {
    const lat = e.lngLat.lat
    const lng = e.lngLat.lng

    if (isEditingDetourManually) {
      const url = `https://router.project-osrm.org/nearest/v1/driving/${lng},${lat}?number=1`
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.waypoints && data.waypoints[0]) {
            const wp = data.waypoints[0]
            const snappedLng = wp.location[0]
            const snappedLat = wp.location[1]
            const name = wp.name || "Esquina sin nombre"
            setManualDetourPoints(prev => [
              ...prev,
              { lat: snappedLat, lng: snappedLng, name }
            ])
            toast.success(`Esquina añadida: ${name}`)
          } else {
            setManualDetourPoints(prev => [
              ...prev,
              { lat, lng, name: "Punto manual" }
            ])
          }
        })
        .catch(() => {
          setManualDetourPoints(prev => [
            ...prev,
            { lat, lng, name: "Punto manual" }
          ])
        })
      return
    }

    if (mapClickMode === 'add_stop') {
      setNewStopCoords({ lat, lng })
    }
  }

  // Handle dragging detour waypoints to a new position
  const handleMarkerDragEnd = (idx: number, e: any) => {
    const newLat = e.lngLat.lat
    const newLng = e.lngLat.lng

    const url = `https://router.project-osrm.org/nearest/v1/driving/${newLng},${newLat}?number=1`
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.waypoints && data.waypoints[0]) {
          const wp = data.waypoints[0]
          const snappedLng = wp.location[0]
          const snappedLat = wp.location[1]
          const name = wp.name || "Esquina sin nombre"
          
          setManualDetourPoints(prev => {
            const next = [...prev]
            next[idx] = { lat: snappedLat, lng: snappedLng, name }
            return next
          })
          toast.success(`Esquina movida a: ${name}`)
        } else {
          setManualDetourPoints(prev => {
            const next = [...prev]
            next[idx] = { ...next[idx], lat: newLat, lng: newLng }
            return next
          })
        }
      })
      .catch(() => {
        setManualDetourPoints(prev => {
          const next = [...prev]
          next[idx] = { ...next[idx], lat: newLat, lng: newLng }
          return next
        })
      })
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

  // Format GeoJSON path (dynamically splits with a gap if detour is active or previewed)
  const routeGeoJson = (() => {
    const activeStartId = activeDetour?.startId || detourStartStopId;
    const activeEndId = activeDetour?.endId || detourEndStopId;
    
    if (activeStartId && activeEndId) {
      const originalPath = getMockRoutePathForLine(activeLine, direction)
      const startStop = stops.find(s => s.id === activeStartId)
      const endStop = stops.find(s => s.id === activeEndId)
      if (startStop && endStop) {
        const pathStartIdx = findClosestPathIndex(originalPath, startStop.latitude, startStop.longitude)
        const pathEndIdx = findClosestPathIndex(originalPath, endStop.latitude, endStop.longitude)
        if (pathStartIdx !== -1 && pathEndIdx !== -1 && pathStartIdx < pathEndIdx) {
          const seg1 = originalPath.slice(0, pathStartIdx + 1).map(p => [p.lng, p.lat])
          const seg2 = originalPath.slice(pathEndIdx).map(p => [p.lng, p.lat])
          
          return {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: {
                  type: 'MultiLineString',
                  coordinates: [seg1, seg2]
                },
                properties: {}
              }
            ]
          };
        }
      }
    }
    
    return {
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
    };
  })();

  // Format Detour GeoJSON bypass or preview
  const detourGeoJson = (() => {
    if (isEditingDetourManually) return null;
    if (activeDetour) {
      return {
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
      };
    }
    return null;
  })()

  // Format Manual Detour GeoJSON
  const manualDetourGeoJson = (isEditingDetourManually && (detourStartStopId || manualDetourPoints.length > 0)) ? (() => {
    const startStop = stops.find(s => s.id === detourStartStopId)
    if (!startStop) return null
    let coordinates = manualDetourRouteCoords.map(p => [p.lng, p.lat])
    if (coordinates.length === 0) {
      coordinates = [
        [startStop.longitude, startStop.latitude],
        ...manualDetourPoints.map((p: any) => [p.lng, p.lat])
      ]
    }
    if (coordinates.length < 2) return null
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates
          },
          properties: {}
        }
      ]
    }
  })() : null

  // Generate interactive corners grid for manual detour mapping
  const interactiveCorners = useMemo(() => {
    if (!isEditingDetourManually || !detourStartStopId || !detourEndStopId) return []
    const startStop = stops.find(s => s.id === detourStartStopId)
    const endStop = stops.find(s => s.id === detourEndStopId)
    if (!startStop || !endStop) return []

    const corners: { id: string; lat: number; lng: number }[] = []
    const scaleX = 0.823

    const originLat = startStop.latitude - 0.00030
    const originLng = startStop.longitude

    // Piecewise linear parameter provider for any latitude in CABA
    const getLocalParams = (y: number) => {
      const anchors = [
        { lat: -34.613182, thetaV: -3.4, thetaH: 12.5, wU: 0.00122, wV: 0.00104 },
        { lat: -34.604710, thetaV: -12.5, thetaH: -12.5, wU: 0.00135, wV: 0.00104 },
        { lat: -34.595645, thetaV: -19.1, thetaH: -19.1, wU: 0.00135, wV: 0.00104 }
      ]
      if (y <= anchors[0].lat) return anchors[0]
      if (y >= anchors[2].lat) return anchors[2]
      let idx = 0
      while (idx < anchors.length - 1 && y > anchors[idx + 1].lat) {
        idx++
      }
      const a1 = anchors[idx]
      const a2 = anchors[idx + 1]
      const ratio = (y - a1.lat) / (a2.lat - a1.lat)
      return {
        thetaV: a1.thetaV + (a2.thetaV - a1.thetaV) * ratio,
        thetaH: a1.thetaH + (a2.thetaH - a1.thetaH) * ratio,
        wU: a1.wU + (a2.wU - a1.wU) * ratio,
        wV: a1.wV + (a2.wV - a1.wV) * ratio
      }
    }

    const centerLat = (startStop.latitude + endStop.latitude) / 2
    const centerLng = (startStop.longitude + endStop.longitude) / 2

    const avgParams = getLocalParams(centerLat)
    const thetaV_avg = avgParams.thetaV * Math.PI / 180
    const thetaH_avg = avgParams.thetaH * Math.PI / 180

    const m11 = -Math.cos(thetaH_avg)
    const m12 = Math.sin(thetaV_avg)
    const m21 = -Math.sin(thetaH_avg)
    const m22 = Math.cos(thetaV_avg)
    const det = m11 * m22 - m12 * m21

    const dx = centerLng - originLng
    const dy = centerLat - originLat
    const dxScaled = dx * scaleX
    const centerU = (m22 * dxScaled - m12 * dy) / (det * avgParams.wU)
    const centerV = (-m21 * dxScaled + m11 * dy) / (det * avgParams.wV)

    const midU = Math.round(centerU)
    const midV = Math.round(centerV)

    // Generate 21x21 grid (20-block diameter centered on detour)
    for (let i = midU - 10; i <= midU + 10; i++) {
      for (let j = midV - 10; j <= midV + 10; j++) {
        // Calculate point on vertical axis (j steps) row-by-row
        let rowLat = originLat
        let rowLng = originLng
        const stepSign = Math.sign(j)
        const steps = Math.abs(j)
        for (let s = 0; s < steps; s++) {
          const stepLat = originLat + stepSign * s * 0.00104
          const params = getLocalParams(stepLat)
          const tV = params.thetaV * Math.PI / 180
          rowLat += stepSign * params.wV * Math.cos(tV)
          rowLng += stepSign * params.wV * Math.sin(tV) / scaleX
        }

        const rowParams = getLocalParams(rowLat)
        const tH = rowParams.thetaH * Math.PI / 180

        // Move i steps horizontally
        const lat = rowLat + i * rowParams.wU * Math.sin(tH)
        const lng = rowLng + i * rowParams.wU * Math.cos(tH) / scaleX

        corners.push({
          id: `corner-${i}-${j}`,
          lat,
          lng
        })
      }
    }

    return corners
  }, [isEditingDetourManually, detourStartStopId, detourEndStopId, stops])

  return (
    <div style={{ display: 'flex', gap: '20px', height: '700px', background: '#0b0f19', borderRadius: '16px', overflow: 'hidden' }}>
      
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

          {/* Manual Detour path line */}
          {manualDetourGeoJson && (
            <Source id="manual-detour-path" type="geojson" data={manualDetourGeoJson as any}>
              <Layer
                id="manual-detour-line"
                type="line"
                paint={{ 'line-color': '#FF8A00', 'line-width': 4, 'line-opacity': 0.9 }}
              />
            </Source>
          )}

          {/* Render active detour waypoints after saving */}
          {!isEditingDetourManually && activeDetour?.waypoints?.map((p: any, idx: number) => (
            <Marker
              key={`saved-pt-${idx}`}
              latitude={p.lat}
              longitude={p.lng}
              anchor="center"
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#FF8A00',
                    border: '1.5px solid #fff',
                    boxShadow: '0 0 6px rgba(0,0,0,0.5)'
                  }}
                />
                <div
                  style={{
                    background: 'rgba(11,15,25,0.9)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 600,
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                  }}
                >
                  {p.name || `Esquina ${idx + 1}`}
                </div>
              </div>
            </Marker>
          ))}

          {/* Render selected points for manual detour */}
          {isEditingDetourManually && manualDetourPoints.map((p, idx) => (
            <Marker
              key={`manual-pt-${idx}`}
              latitude={p.lat}
              longitude={p.lng}
              anchor="center"
              draggable={true}
              onDragEnd={(e) => handleMarkerDragEnd(idx, e)}
            >
              <div
                onClick={(e) => {
                  e.stopPropagation() // Prevent adding new points on clicking existing marker
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setManualDetourPoints(prev => prev.filter((_, i) => i !== idx))
                  toast.success("Esquina eliminada")
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  cursor: 'grab'
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: '#FF8A00',
                    border: '2px solid #fff',
                    boxShadow: '0 0 6px rgba(0,0,0,0.5)'
                  }}
                />
                <div
                  style={{
                    background: 'rgba(11,15,25,0.9)',
                    color: '#fff',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    fontWeight: 600,
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                  }}
                >
                  {p.name || `Esquina ${idx + 1}`}
                </div>
              </div>
            </Marker>
          ))}

          {/* Render Stops */}
          {(() => {
            const activeStartId = activeDetour?.startId || detourStartStopId;
            const activeEndId = activeDetour?.endId || detourEndStopId;
            
            if (activeStartId && activeEndId) {
              const startIndex = stops.findIndex(s => s.id === activeStartId)
              const endIndex = stops.findIndex(s => s.id === activeEndId)
              if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
                // Keep start/end stops, filter out all stops in between
                return stops.filter((s, idx) => idx <= startIndex || idx >= endIndex);
              }
            }
            return stops;
          })().map(s => {
            const isBlocked = blockedStops.includes(s.id)
            const isStartDetour = s.id === detourStartStopId
            const isEndDetour = s.id === detourEndStopId
            const shouldGlow = isEditingDetourManually && (isStartDetour || isEndDetour)

            return (
              <Marker key={s.id} latitude={s.latitude} longitude={s.longitude} anchor="center">
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedStop(s)
                    setSelectedBus(null)
                  }}
                  style={{
                    width: shouldGlow ? '20px' : (isBlocked ? '16px' : '11px'),
                    height: shouldGlow ? '20px' : (isBlocked ? '16px' : '11px'),
                    borderRadius: '50%',
                    background: shouldGlow ? '#F59E0B' : (isBlocked ? '#FF4D6A' : 'rgba(255,255,255,0.85)'),
                    border: `2px solid ${shouldGlow ? '#fff' : (isBlocked ? '#fff' : themeColor)}`,
                    boxShadow: shouldGlow ? '0 0 20px 4px #F59E0B' : (isBlocked ? '0 0 10px #FF4D6A' : `0 0 6px ${themeColor}`),
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: 700,
                    transform: shouldGlow ? 'scale(1.3)' : 'scale(1)',
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
      <div style={{ width: '320px', background: '#121527', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', maxHeight: '100%' }}>
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
                {isEditingDetourManually ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <div style={{ fontSize: '10px', color: '#8f94a5', textAlign: 'left' }}>
                      Esquinas seleccionadas: <strong style={{ color: '#fff' }}>{manualDetourPoints.length}</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setIsEditingDetourManually(false)
                          setManualDetourPoints([])
                          setManualDetourRouteCoords([])
                        }}
                        style={{ flex: 1, padding: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#a3a6b8', fontSize: '11px', fontWeight: 500, cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={applyManualDetour}
                        style={{ flex: 2, padding: '6px', borderRadius: '6px', background: '#00c689', color: '#fff', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        Guardar
                      </button>
                    </div>
                  </div>
                ) : activeDetour ? (
                  <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    <button
                      onClick={clearDetour}
                      style={{ flex: 2, padding: '6px', borderRadius: '6px', background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.2)', color: '#FF4D6A', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                    >
                      Quitar Desvío
                    </button>
                    <button
                      onClick={saveDetourToFavorites}
                      style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.15)', border: '1px solid #F59E0B', color: '#F59E0B', fontSize: '11px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                      title="Guardar desvío como favorito"
                    >
                      ⭐ Guardar
                    </button>
                  </div>
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

              {/* Saved custom detours list */}
              {savedCustomDetours.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '6px' }}>
                  <label style={{ display: 'block', color: '#8f94a5', fontSize: '9px', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 700 }}>Desvíos Favoritos (⭐)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                    {savedCustomDetours.map(fav => (
                      <div key={fav.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '5px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <span
                          onClick={() => loadFavoriteDetour(fav)}
                          style={{ fontSize: '11px', color: '#fff', cursor: 'pointer', fontWeight: 500, flex: 1 }}
                        >
                          {fav.name}
                        </span>
                        <button
                          onClick={() => {
                            setSavedCustomDetours(prev => {
                              const next = prev.filter(f => f.id !== fav.id)
                              localStorage.setItem('mock_saved_custom_detours', JSON.stringify(next))
                              return next
                            })
                            toast.success("Desvío favorito eliminado")
                          }}
                          style={{ background: 'none', border: 'none', color: '#ff4d6a', fontSize: '11px', cursor: 'pointer' }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset to Original Route path */}
              <button
                onClick={() => {
                  const loadedPath = getMockRoutePathForLine(activeLine, direction)
                  setRoutePath(loadedPath)
                  toast.success("Mostrando recorrido original")
                }}
                style={{
                  width: '100%',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  color: '#a3a6b8',
                  fontSize: '11px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  marginTop: '4px'
                }}
              >
                🔄 Ver Recorrido Original
              </button>
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