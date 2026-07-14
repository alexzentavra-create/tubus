'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bus, Users, Building2, Activity, TrendingUp, AlertTriangle,
  Clock, MapPin, BarChart2, Download, LogOut, RefreshCw,
  ChevronRight, Star, Wifi, Search, Bell, Mail, Calendar,
  Share2, Printer, Plus, Trash2, ChevronDown, CheckCircle2,
  Circle, Flag, Info, Megaphone, MessageSquare, Eye, EyeOff,
  BookOpen, Globe, Award, ListChecks
} from 'lucide-react'
import { createClient } from '@/lib/supabase'
import Map, { Marker, Source, Layer } from 'react-map-gl/maplibre'
import { MOCK_LINES, getMockStopsForLine, getMockRoutePathForLine } from '@/lib/mockData'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts'
import { format, subDays } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

// Map style
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

// Visual graphs mock data
const METRICS_BY_PERIOD = {
  day: [
    { label: '06:00', joined: 5, active: 45 },
    { label: '09:00', joined: 12, active: 180 },
    { label: '12:00', joined: 8, active: 110 },
    { label: '15:00', joined: 6, active: 95 },
    { label: '18:00', joined: 14, active: 210 },
    { label: '21:00', joined: 4, active: 80 }
  ],
  week: [
    { label: 'Lunes', joined: 80, active: 1250 },
    { label: 'Martes', joined: 95, active: 1310 },
    { label: 'Miércoles', joined: 90, active: 1290 },
    { label: 'Jueves', joined: 110, active: 1340 },
    { label: 'Viernes', joined: 125, active: 1420 },
    { label: 'Sábado', joined: 55, active: 620 },
    { label: 'Domingo', joined: 35, active: 410 }
  ],
  month: [
    { label: 'Semana 1', joined: 380, active: 3950 },
    { label: 'Semana 2', joined: 420, active: 4210 },
    { label: 'Semana 3', joined: 405, active: 4150 },
    { label: 'Semana 4', joined: 490, active: 4820 }
  ]
}

const LINES_DATA = [
  { id: 'line-1',   name: 'Línea 12',  users: 1240, trips: 89,  complaints: 3 },
  { id: 'line-28',  name: 'Línea 28',  users: 1650, trips: 112, complaints: 1 },
  { id: 'line-3',   name: 'Línea 37',  users: 920,  trips: 67,  complaints: 1 },
  { id: 'line-39',  name: 'Línea 39',  users: 840,  trips: 58,  complaints: 0 },
  { id: 'line-59',  name: 'Línea 59',  users: 1310, trips: 92,  complaints: 2 },
  { id: 'line-60',  name: 'Línea 60',  users: 2100, trips: 134, complaints: 7 },
  { id: 'line-152', name: 'Línea 152', users: 1450, trips: 98,  complaints: 2 },
]

const LINE_DETAILS: Record<string, {
  companyName: string
  activeDrivers: number
  totalPassengers: number
  avgRating: number
  driversList: { name: string; email: string; pass: string; unit: string; rating: number; online: boolean }[]
  complaintsList: { type: string; driver: string; bus: string; status: 'pending'|'resolved'; time: string; desc: string }[]
}> = {
  'line-1': {
    companyName: 'Transportes Callao S.A.',
    activeDrivers: 5,
    totalPassengers: 1240,
    avgRating: 4.8,
    driversList: [
      { name: 'Néstor García', email: 'nestor@nestor.ar', pass: 'Nestor123!', unit: '1201', rating: 4.8, online: true },
      { name: 'Roberto Sánchez', email: 'roberto@demo.ar', pass: 'RobSanch99', unit: '1203', rating: 4.9, online: true },
      { name: 'Carlos Martínez', email: 'carlos@demo.ar', pass: 'CarMar8877', unit: '1202', rating: 4.6, online: false },
      { name: 'Juan Gómez', email: 'juan@demo.ar', pass: 'JuanitoGo!', unit: '1205', rating: 4.5, online: true }
    ],
    complaintsList: [
      { type: 'No paró', driver: 'Carlos Martínez', bus: '1202', status: 'pending', time: 'Hace 15 min', desc: 'El chofer no se detuvo a pesar de haber pasajeros esperando y hacer señas.' },
      { type: 'Mal trato', driver: 'Juan Gómez', bus: '1205', status: 'resolved', time: 'Ayer', desc: 'Se negó a abrir la puerta trasera al solicitar la parada.' }
    ]
  },
  'line-28': {
    companyName: 'DOTA S.A.',
    activeDrivers: 4,
    totalPassengers: 1650,
    avgRating: 4.7,
    driversList: [
      { name: 'Carlos M.', email: 'carlos28@demo.ar', pass: 'PassDota28', unit: '2802', rating: 4.6, online: true },
      { name: 'Pablo García', email: 'pablo28@demo.ar', pass: 'PabloGarc7', unit: '2806', rating: 4.9, online: false },
      { name: 'Jorge Rodríguez', email: 'jorge28@demo.ar', pass: 'Jorgito12', unit: '2804', rating: 4.7, online: true }
    ],
    complaintsList: [
      { type: 'Peligrosa', driver: 'Carlos M.', bus: '2802', status: 'pending', time: 'Hace 1h', desc: 'Conducía a exceso de velocidad en zona residencial.' }
    ]
  },
  'line-3': {
    companyName: '4 de Septiembre S.A.',
    activeDrivers: 3,
    totalPassengers: 920,
    avgRating: 4.5,
    driversList: [
      { name: 'Roberto S.', email: 'roberto37@demo.ar', pass: 'Sanch37Rob', unit: '3703', rating: 4.9, online: true },
      { name: 'Ana Martínez', email: 'ana37@demo.ar', pass: 'AnaMart37', unit: '3708', rating: 4.5, online: false }
    ],
    complaintsList: [
      { type: 'Defecto', driver: 'Ana Martínez', bus: '3708', status: 'resolved', time: 'Hace 3h', desc: 'El timbre de solicitud de parada no funcionaba.' }
    ]
  },
  'line-39': {
    companyName: 'Transportes Santa Fe S.A.C.I.',
    activeDrivers: 3,
    totalPassengers: 840,
    avgRating: 4.6,
    driversList: [
      { name: 'Esteban Ortiz', email: 'esteban39@demo.ar', pass: 'EstebanOrtiz39', unit: '3901', rating: 4.6, online: true },
      { name: 'Lucas Domínguez', email: 'lucas39@demo.ar', pass: 'LucasDom39', unit: '3902', rating: 4.7, online: true }
    ],
    complaintsList: []
  },
  'line-59': {
    companyName: 'M. C. B. A. S.A.T.C.I.',
    activeDrivers: 3,
    totalPassengers: 1310,
    avgRating: 4.7,
    driversList: [
      { name: 'Hugo Bianchi', email: 'hugo59@demo.ar', pass: 'HugoBianchi59', unit: '5903', rating: 4.7, online: true },
      { name: 'Nicolás Silva', email: 'nico59@demo.ar', pass: 'NicoSilva59', unit: '5905', rating: 4.8, online: false }
    ],
    complaintsList: []
  },
  'line-60': {
    companyName: 'MONSA S.A.',
    activeDrivers: 8,
    totalPassengers: 2100,
    avgRating: 4.6,
    driversList: [
      { name: 'Carlos Martínez', email: 'carlos60@demo.ar', pass: 'Carlos6060', unit: '6020', rating: 4.6, online: true },
      { name: 'Diego Rodríguez', email: 'diego60@demo.ar', pass: 'DiegoRod60', unit: '6022', rating: 4.2, online: false },
      { name: 'Pablo García', email: 'pablo60@demo.ar', pass: 'PabloGarc60', unit: '6024', rating: 5.0, online: true },
      { name: 'Luis Fernández', email: 'luis60@demo.ar', pass: 'LuisFer60', unit: '6026', rating: 4.7, online: true }
    ],
    complaintsList: [
      { type: 'No paró', driver: 'Diego Rodríguez', bus: '6022', status: 'pending', time: 'Hace 30 min', desc: 'No se detuvo en Plaza Italia.' },
      { type: 'Mal trato', driver: 'Luis Fernández', bus: '6026', status: 'pending', time: 'Hace 2h', desc: 'Cerró la puerta antes de terminar de subir.' }
    ]
  },
  'line-152': {
    companyName: 'Empresa Tandilense S.A.',
    activeDrivers: 6,
    totalPassengers: 1450,
    avgRating: 4.7,
    driversList: [
      { name: 'Roberto S.', email: 'roberto152@demo.ar', pass: 'RobSanch152', unit: '15210', rating: 4.9, online: true },
      { name: 'Jorge R.', email: 'jorge152@demo.ar', pass: 'JorgeR152', unit: '15212', rating: 4.7, online: false },
      { name: 'Ana C.', email: 'ana152@demo.ar', pass: 'AnaC152!!', unit: '15214', rating: 4.8, online: true }
    ],
    complaintsList: [
      { type: 'Peligrosa', driver: 'Jorge R.', bus: '15212', status: 'resolved', time: 'Ayer', desc: 'Realizó maniobras bruscas al cambiar de carril.' }
    ]
  }
}

// News tips mock data
const INITIAL_NEWS = [
  {
    id: 'n1',
    title: 'Aumento del boleto de colectivo en el AMBA',
    desc: 'El Ministerio de Transporte anunció un nuevo esquema tarifario para ajustar el costo del boleto mínimo en línea con la inflación y la quita de subsidios.',
    source: 'Clarín',
    date: 'Hace 2 días (11 de Julio, 2026)',
    starred: false
  },
  {
    id: 'n2',
    title: 'Subte porteño: la tarifa del boleto sube a $757',
    desc: 'Comienza a regir el último tramo de la actualización tarifaria acordada para el subterráneo de Buenos Aires. Descuentos vigentes con SUBE registrada.',
    source: 'Infobae',
    date: 'Hace 4 días (9 de Julio, 2026)',
    starred: true
  },
  {
    id: 'n3',
    title: 'Nuevos carriles exclusivos en el Metrobús del Bajo',
    desc: 'El Gobierno de la Ciudad inauguró la extensión del Metrobús sobre Av. Paseo Colón para agilizar la circulación de más de 30 líneas de colectivos.',
    source: 'La Nación',
    date: 'Hace 6 días (7 de Julio, 2026)',
    starred: false
  },
  {
    id: 'n4',
    title: 'Uber, Cabify y Didi enfrentan nuevas normativas de registro',
    desc: 'La legislatura debate un proyecto de ley para endurecer los requisitos técnicos, de seguro y de habilitación para vehículos de aplicaciones de movilidad.',
    source: 'Ámbito Financiero',
    date: 'Hace 8 días (5 de Julio, 2026)',
    starred: false
  }
]

// Province and demography mock data
const PROVINCES_DATA: Record<string, {
  name: string
  users: number
  neighborhoods: { name: string; count: number }[]
  habits: string[]
}> = {
  'buenos-aires': {
    name: 'Provincia de Buenos Aires & CABA',
    users: 3420,
    neighborhoods: [
      { name: 'Palermo', count: 890 },
      { name: 'Caballito', count: 750 },
      { name: 'Belgrano', count: 640 },
      { name: 'Recoleta', count: 580 },
      { name: 'Flores', count: 560 }
    ],
    habits: [
      '📍 84% de los usuarios regresan a su misma ubicación nocturna, detectando con precisión su vecindario residencial.',
      '🚌 Parada Clave: Av. Santa Fe y Coronel Díaz es la estación con mayor índice de inicio de viaje laboral temprano.',
      '🏢 El 72% de los viajes matutinos se dirigen hacia el microcentro, denotando patrones de trabajo diario.'
    ]
  },
  'cordoba': {
    name: 'Córdoba',
    users: 680,
    neighborhoods: [
      { name: 'Nueva Córdoba', count: 280 },
      { name: 'Centro', count: 190 },
      { name: 'Alberdi', count: 120 },
      { name: 'General Paz', count: 90 }
    ],
    habits: [
      '🎓 El 62% del volumen de pasajeros son estudiantes universitarios en la zona de Ciudad Universitaria.',
      '📍 Movilidad recurrente identificada en Barrio Alberdi los fines de semana hacia el centro.'
    ]
  },
  'santa-fe': {
    name: 'Santa Fe',
    users: 490,
    neighborhoods: [
      { name: 'Rosario Centro', count: 210 },
      { name: 'Pichincha', count: 130 },
      { name: 'Echesortu', count: 80 },
      { name: 'Martin', count: 70 }
    ],
    habits: [
      '📍 Algoritmo detectó patrones de retorno diario hacia Pichincha de 18:00 a 20:00.',
      '🚢 Alto tráfico en las paradas del corredor de la Costanera en Rosario.'
    ]
  },
  'mendoza': {
    name: 'Mendoza',
    users: 310,
    neighborhoods: [
      { name: 'Capital Centro', count: 140 },
      { name: 'Godoy Cruz', count: 90 },
      { name: 'Guaymallén', count: 50 },
      { name: 'Chacras de Coria', count: 30 }
    ],
    habits: [
      '🍇 55% de usuarios utilizan abonos multiviaje recurrentes para transporte interurbano.',
      '📍 Godoy Cruz registrado como el principal barrio de origen de viajes comerciales.'
    ]
  }
}

// Interactive modals mock data
const MOCK_USERS = [
  {
    id: 'usr-1',
    name: 'Alejandro Zentavra',
    email: 'ale.zentavra@demo.com.ar',
    avatar: 'AZ',
    joinedDate: '12 de Julio, 2026',
    status: 'Activo',
    searches: 48,
    trips: 24,
    rating: 4.8,
    favLines: ['Línea 12', 'Línea 60'],
    behavior: 'Usuario diario de Línea 12 y 60 en horario laboral.',
    weeklyUsage: [
      { day: 'Lun', count: 4 },
      { day: 'Mar', count: 6 },
      { day: 'Mie', count: 5 },
      { day: 'Jue', count: 8 },
      { day: 'Vie', count: 7 },
      { day: 'Sab', count: 2 },
      { day: 'Dom', count: 0 }
    ]
  },
  {
    id: 'usr-2',
    name: 'Sofía Gutiérrez',
    email: 'sofia.g@demo.com.ar',
    avatar: 'SG',
    joinedDate: '10 de Julio, 2026',
    status: 'Activo',
    searches: 15,
    trips: 10,
    rating: 4.5,
    favLines: ['Línea 37'],
    behavior: 'Uso frecuente enfocado en corredor de Av. Las Heras.',
    weeklyUsage: [
      { day: 'Lun', count: 2 },
      { day: 'Mar', count: 3 },
      { day: 'Mie', count: 2 },
      { day: 'Jue', count: 2 },
      { day: 'Vie', count: 1 },
      { day: 'Sab', count: 0 },
      { day: 'Dom', count: 0 }
    ]
  },
  {
    id: 'usr-3',
    name: 'Mateo Lombardi',
    email: 'mateo.l@demo.com.ar',
    avatar: 'ML',
    joinedDate: '07 de Julio, 2026',
    status: 'Inactivo',
    searches: 8,
    trips: 4,
    rating: 4.2,
    favLines: ['Línea 152'],
    behavior: 'Viajes ocasionales interurbanos de fin de semana.',
    weeklyUsage: [
      { day: 'Lun', count: 0 },
      { day: 'Mar', count: 0 },
      { day: 'Mie', count: 0 },
      { day: 'Jue', count: 0 },
      { day: 'Vie', count: 1 },
      { day: 'Sab', count: 2 },
      { day: 'Dom', count: 1 }
    ]
  },
  {
    id: 'usr-4',
    name: 'Mariana Peralta',
    email: 'mariana.p@demo.com.ar',
    avatar: 'MP',
    joinedDate: '11 de Julio, 2026',
    status: 'Activo',
    searches: 22,
    trips: 14,
    rating: 4.9,
    favLines: ['Línea 59', 'Línea 39'],
    behavior: 'Patrón de viaje vespertino recurrente entre las 18:00 y 20:00.',
    weeklyUsage: [
      { day: 'Lun', count: 3 },
      { day: 'Mar', count: 2 },
      { day: 'Mie', count: 4 },
      { day: 'Jue', count: 3 },
      { day: 'Vie', count: 2 },
      { day: 'Sab', count: 0 },
      { day: 'Dom', count: 0 }
    ]
  }
]

const GROWTH_STATS = {
  day: {
    newUsers: '+15',
    activeUsers: '320',
    churn: '2',
    newLines: '0',
    supportQueries: '5',
    joinedList: ['usr-1', 'usr-4']
  },
  week: {
    newUsers: '+120',
    activeUsers: '1,840',
    churn: '12',
    newLines: '1',
    supportQueries: '35',
    joinedList: ['usr-1', 'usr-2', 'usr-4']
  },
  month: {
    newUsers: '+580',
    activeUsers: '4,820',
    churn: '45',
    newLines: '3',
    supportQueries: '120',
    joinedList: ['usr-1', 'usr-2', 'usr-3', 'usr-4']
  }
}

const MOCK_ACTIVE_FLEET = [
  { unit: '1201', line: 'Línea 12', driver: 'Néstor García', speed: 34, status: 'En Hora', deviation: 'Normal', lastSync: 'Hace 30s' },
  { unit: '1203', line: 'Línea 12', driver: 'Roberto Sánchez', speed: 28, status: 'Demorado (3m)', deviation: 'Desvío Activo', lastSync: 'Hace 10s' },
  { unit: '2802', line: 'Línea 28', driver: 'Carlos M.', speed: 62, status: 'En Hora', deviation: 'Velocidad Alta', lastSync: 'Hace 45s' },
  { unit: '2804', line: 'Línea 28', driver: 'Jorge Rodríguez', speed: 0, status: 'Detenido', deviation: 'Normal', lastSync: 'Hace 2m' },
  { unit: '3703', line: 'Línea 37', driver: 'Roberto S.', speed: 41, status: 'En Hora', deviation: 'Normal', lastSync: 'Hace 12s' },
  { unit: '3901', line: 'Línea 39', driver: 'Esteban Ortiz', speed: 15, status: 'En Hora', deviation: 'Normal', lastSync: 'Hace 5s' },
  { unit: '5903', line: 'Línea 59', driver: 'Hugo Bianchi', speed: 38, status: 'Demorado (1m)', deviation: 'Normal', lastSync: 'Hace 18s' },
  { unit: '6020', line: 'Línea 60', driver: 'Carlos Martínez', speed: 45, status: 'En Hora', deviation: 'Normal', lastSync: 'Hace 25s' },
  { unit: '6024', line: 'Línea 60', driver: 'Pablo García', speed: 22, status: 'En Hora', deviation: 'Normal', lastSync: 'Hace 8s' },
  { unit: '15210', line: 'Línea 152', driver: 'Roberto S.', speed: 48, status: 'En Hora', deviation: 'Normal', lastSync: 'Hace 14s' }
]

const MOCK_DRIVERS_STATUS = [
  { id: 'drv-1', name: 'Néstor García', line: 'Línea 12', unit: '1201', online: true, rating: 4.8, trips: 4, activity: 'Conduciendo, ruta normal.' },
  { id: 'drv-2', name: 'Roberto Sánchez', line: 'Línea 12', unit: '1203', online: true, rating: 4.9, trips: 5, activity: 'Finalizó recorrido de ida.' },
  { id: 'drv-3', name: 'Carlos Martínez', line: 'Línea 12', unit: '1202', online: false, rating: 4.6, trips: 0, activity: 'Guardia finalizada.' },
  { id: 'drv-4', name: 'Juan Gómez', line: 'Línea 12', unit: '1205', online: true, rating: 4.5, trips: 3, activity: 'En parador de descanso.' },
  { id: 'drv-5', name: 'Carlos M.', line: 'Línea 28', unit: '2802', online: true, rating: 4.6, trips: 6, activity: 'Conduciendo, exceso de velocidad reportado.' },
  { id: 'drv-6', name: 'Pablo García', line: 'Línea 28', unit: '2806', online: false, rating: 4.9, trips: 2, activity: 'Turno de tarde terminado.' },
  { id: 'drv-7', name: 'Jorge Rodríguez', line: 'Línea 28', unit: '2804', online: true, rating: 4.7, trips: 4, activity: 'Unidad detenida en semáforo.' },
  { id: 'drv-8', name: 'Roberto S.', line: 'Línea 37', unit: '3703', online: true, rating: 4.9, trips: 5, activity: 'Iniciando vuelta de retorno.' },
  { id: 'drv-9', name: 'Ana Martínez', line: 'Línea 37', unit: '3708', online: false, rating: 4.5, trips: 3, activity: 'Fuera de servicio.' },
  { id: 'drv-10', name: 'Esteban Ortiz', line: 'Línea 39', unit: '3901', online: true, rating: 4.6, trips: 4, activity: 'Tráfico lento reportado.' },
  { id: 'drv-11', name: 'Hugo Bianchi', line: 'Línea 59', unit: '5903', online: true, rating: 4.7, trips: 3, activity: 'Retraso de 1 minuto.' },
  { id: 'drv-12', name: 'Carlos Martínez', line: 'Línea 60', unit: '6020', online: true, rating: 4.6, trips: 5, activity: 'Conduciendo por carril rápido.' },
  { id: 'drv-13', name: 'Diego Rodríguez', line: 'Línea 60', unit: '6022', online: false, rating: 4.2, trips: 6, activity: 'Descanso de almuerzo.' },
  { id: 'drv-14', name: 'Pablo García', line: 'Línea 60', unit: '6024', online: true, rating: 5.0, trips: 4, activity: 'Excelente puntualidad reportada.' },
  { id: 'drv-15', name: 'Roberto S.', line: 'Línea 152', unit: '15210', online: true, rating: 4.9, trips: 5, activity: 'Ingresando a terminal.' }
]

// Messenger chats mock data
const DEFAULT_CHATS = [
  { id: 'c-admin-12', name: 'Admin Línea 12 (Néstor)', role: 'lineadmin', avatar: 'L12', starred: true, lastMsg: 'Hola superadmin, modificamos el desvío en Callao.', history: [
    { id: 'm1', sender: 'user', text: 'Hola Néstor, ¿todo listo para la modificación del recorrido?', timestamp: '10:15' },
    { id: 'm2', sender: 'admin', text: 'Hola superadmin, modificamos el desvío en Callao.', timestamp: '10:20' }
  ]},
  { id: 'c-user-ale', name: 'Alejandro Zentavra', role: 'user', avatar: 'AZ', starred: false, lastMsg: '¿El desvío de la línea 60 ya está cargado?', history: [
    { id: 'm3', sender: 'user', text: 'Hola, ¿dónde puedo ver las paradas de la Línea 37?', timestamp: 'Ayer' },
    { id: 'm4', sender: 'admin', text: 'Hola Sofía, puedes ver las paradas seleccionando la Línea 37 en la pestaña de Colectivos.', timestamp: 'Ayer' }
  ]},
  { id: 'c-admin-60', name: 'Admin Línea 60 (Carlos)', role: 'lineadmin', avatar: 'L60', starred: true, lastMsg: 'Coche 304 ya está en línea.', history: [
    { id: 'm5', sender: 'user', text: 'Carlos, ¿las unidades 302 y 304 tienen el nuevo QR?', timestamp: 'Ayer' },
    { id: 'm6', sender: 'admin', text: 'Coche 304 ya está en línea.', timestamp: 'Ayer' }
  ]}
]

type Tab = 'overview' | 'linemaps' | 'drivers' | 'ads' | 'chat' | 'reports' | 'provincemap' | 'todos' | 'news'

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
  const [stats, setStats] = useState({
    totalUsers: 4820, totalDrivers: 24, totalCompanies: 7,
    activeBuses: 18, pendingReports: 3, todayLogins: 142,
  })

  // Modal active states
  const [activeDetail, setActiveDetail] = useState<'users' | 'buses' | 'drivers' | 'ads' | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedDriverLine, setSelectedDriverLine] = useState<string>('all')
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [growthPeriod, setGrowthPeriod] = useState<'day' | 'week' | 'month'>('week')

  // Graph mode (day, week, month)
  const [graphPeriod, setGraphPeriod] = useState<'day' | 'week' | 'month'>('week')
  const [adGraphPeriod, setAdGraphPeriod] = useState<'day' | 'week' | 'month'>('week')

  // News and starred items
  const [news, setNews] = useState<any[]>(INITIAL_NEWS)

  // Submitted ads
  const [ads, setAds] = useState<any[]>([
    { id: 'ad-1', title: 'Coca Cola Sin Azúcar', desc: 'Promoción de lata 350ml en quioscos.', stop: 'Plaza Italia', route: 'Línea 12', budget: 120000, duration: '30 días', status: 'approved', timestamp: 'Hace 1 día' },
    { id: 'ad-2', title: 'Hamburguesería Mostaza', desc: 'Descuento 20% en Combo Mega Deluxe.', stop: 'Av. Corrientes y Callao', route: 'Línea 37', budget: 85000, duration: '15 días', status: 'pending', timestamp: 'Hace 3 horas' },
    { id: 'ad-3', title: 'Gimnasio Megatlon', desc: 'Matrícula gratis en pase anual.', stop: 'Obelisco', route: 'Línea 152', budget: 195000, duration: '45 días', status: 'approved', timestamp: 'Hace 5 días' }
  ])

  // Support messenger chats
  const [chats, setChats] = useState<any[]>(DEFAULT_CHATS)
  const [selectedChatId, setSelectedChatId] = useState<string>('c-admin-12')
  const [chatSearch, setChatSearch] = useState('')
  const [chatInput, setChatInput] = useState('')
  const [showAddChatModal, setShowAddChatModal] = useState(false)
  const [newChatName, setNewChatName] = useState('')
  const [newChatRole, setNewChatRole] = useState<'lineadmin' | 'user'>('user')

  // Todo list state
  const [todos, setTodos] = useState<Todo[]>([
    { id: 't1', text: 'Revisar desvíos temporales en Línea 12', done: false, date: 'Hoy', badge: 'Urgente', flagged: true },
    { id: 't2', text: 'Aprobar chofer Néstor García', done: true, date: 'Ayer', badge: 'Completado', flagged: false },
    { id: 't3', text: 'Verificar cobros publicitarios en pesos (ARS)', done: false, date: 'Mañana', badge: 'Administrativo', flagged: false },
    { id: 't4', text: 'Auditar quejas de velocidad en Línea 60', done: false, date: 'Esta semana', badge: 'Seguridad', flagged: true },
  ])
  const [newTodoText, setNewTodoText] = useState('')

  // Selected province for demography popup
  const [selectedProvinceKey, setSelectedProvinceKey] = useState<string | null>(null)

  useEffect(() => {
    // Sync with localStorage
    const savedTodos = localStorage.getItem('mock_super_todos')
    if (savedTodos) setTodos(JSON.parse(savedTodos))

    const savedAds = localStorage.getItem('mock_super_ads')
    if (savedAds) setAds(JSON.parse(savedAds))

    const savedChats = localStorage.getItem('mock_super_chats')
    if (savedChats) setChats(JSON.parse(savedChats))

    const savedNews = localStorage.getItem('mock_super_news')
    if (savedNews) setNews(JSON.parse(savedNews))

    setLoading(false)
  }, [])

  const saveTodos = (newTodos: Todo[]) => {
    setTodos(newTodos)
    localStorage.setItem('mock_super_todos', JSON.stringify(newTodos))
  }

  const saveAds = (newAds: any[]) => {
    setAds(newAds)
    localStorage.setItem('mock_super_ads', JSON.stringify(newAds))
  }

  const saveChats = (newChats: any[]) => {
    setChats(newChats)
    localStorage.setItem('mock_super_chats', JSON.stringify(newChats))
  }

  const saveNews = (newNews: any[]) => {
    setNews(newNews)
    localStorage.setItem('mock_super_news', JSON.stringify(newNews))
  }

  const toggleTodo = (id: string) => {
    saveTodos(todos.map(t => t.id === id ? { ...t, done: !t.done } : t))
  }

  const toggleFlag = (id: string) => {
    saveTodos(todos.map(t => t.id === id ? { ...t, flagged: !t.flagged } : t))
  }

  const deleteTodo = (id: string) => {
    saveTodos(todos.filter(t => t.id !== id))
    toast.success('Tarea eliminada')
  }

  const addTodo = () => {
    if (!newTodoText.trim()) return
    const newItem: Todo = {
      id: `t-${Date.now()}`,
      text: newTodoText.trim(),
      done: false,
      date: 'Hoy',
      badge: 'Normal',
      flagged: false
    }
    saveTodos([...todos, newItem])
    setNewTodoText('')
    toast.success('Tarea agregada')
  }


  const handleSendAdReferral = (advertiserName: string) => {
    const uniqueRefLink = `https://tubus.com.ar/join?ref=${advertiserName.toLowerCase().replace(/\s+/g, '-')}`
    const promoMsg = `¡Hola! Aquí tienes tu enlace único de referidos de TuBus: ${uniqueRefLink}. Compartilo para que nuevos usuarios se registren y ganes puntos canjeables por publicidad gratuita.`

    const existingChat = chats.find(c => c.name.toLowerCase().includes(advertiserName.toLowerCase()))
    let targetChatId = ''

    if (existingChat) {
      targetChatId = existingChat.id
      const updatedChats = chats.map(c => {
        if (c.id === targetChatId) {
          return {
            ...c,
            lastMsg: promoMsg,
            history: [
              ...c.history,
              { id: `m-${Date.now()}`, sender: 'admin', text: promoMsg, timestamp: 'Ahora' }
            ]
          }
        }
        return c
      })
      saveChats(updatedChats)
    } else {
      const newId = `c-user-${Date.now()}`
      targetChatId = newId
      const newChat = {
        id: newId,
        name: advertiserName,
        role: 'user',
        avatar: advertiserName.split(' ').map(n=>n[0]).join(''),
        starred: false,
        lastMsg: promoMsg,
        history: [
          { id: `m-${Date.now()}`, sender: 'admin', text: promoMsg, timestamp: 'Ahora' }
        ]
      }
      saveChats([...chats, newChat])
    }

    setSelectedChatId(targetChatId)
    setTab('chat')
    setActiveDetail(null)
    toast.success('Chat abierto y enlace generado')
  }

  const handleSendMessageToAdmin = (adminName: string, adminEmail: string, lineName: string) => {
    const initMsg = `Hola ${adminName}, soy el Super Administrador. Me comunico con vos para coordinar temas operativos sobre el recorrido de la ${lineName}.`
    const existingChat = chats.find(c => c.name.toLowerCase().includes(adminName.toLowerCase()) || c.name.toLowerCase().includes(lineName.toLowerCase()))
    let targetChatId = ''

    if (existingChat) {
      targetChatId = existingChat.id
      const updatedChats = chats.map(c => {
        if (c.id === targetChatId) {
          return {
            ...c,
            lastMsg: initMsg,
            history: [
              ...c.history,
              { id: `m-${Date.now()}`, sender: 'admin', text: initMsg, timestamp: 'Ahora' }
            ]
          }
        }
        return c
      })
      saveChats(updatedChats)
    } else {
      const newId = `c-admin-${Date.now()}`
      targetChatId = newId
      const newChat = {
        id: newId,
        name: `${adminName} (${lineName})`,
        role: 'lineadmin',
        avatar: lineName.includes('Turístico') ? 'BT' : lineName.replace('Línea ', 'L'),
        starred: false,
        lastMsg: initMsg,
        history: [
          { id: `m-${Date.now()}`, sender: 'admin', text: initMsg, timestamp: 'Ahora' }
        ]
      }
      saveChats([...chats, newChat])
    }

    setSelectedChatId(targetChatId)
    setTab('chat')
    toast.success('Chat de soporte con el administrador abierto')
  }

  const renderUsersDetail = () => {
    const activeStats = GROWTH_STATS[growthPeriod]
    const filteredUsers = MOCK_USERS.filter(u =>
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    )
    const selectedUser = MOCK_USERS.find(u => u.id === selectedUserId) || MOCK_USERS[0]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Growth Stats Filter */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Estadísticas de Crecimiento</span>
            <div style={{ display: 'flex', background: '#1b1d2e', borderRadius: '6px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setGrowthPeriod('day')} style={{ padding: '4px 10px', border: 'none', background: growthPeriod === 'day' ? '#10B981' : 'transparent', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}>Día</button>
              <button onClick={() => setGrowthPeriod('week')} style={{ padding: '4px 10px', border: 'none', background: growthPeriod === 'week' ? '#10B981' : 'transparent', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}>Semana</button>
              <button onClick={() => setGrowthPeriod('month')} style={{ padding: '4px 10px', border: 'none', background: growthPeriod === 'month' ? '#10B981' : 'transparent', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}>Mes</button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#8f94a5', textTransform: 'uppercase' }}>Nuevos</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>{activeStats.newUsers}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#8f94a5', textTransform: 'uppercase' }}>Activos</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#8B5CF6', marginTop: '4px' }}>{activeStats.activeUsers}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#8f94a5', textTransform: 'uppercase' }}>Bajas</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>-{activeStats.churn}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#8f94a5', textTransform: 'uppercase' }}>Líneas Nuevas</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>{activeStats.newLines}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: '#8f94a5', textTransform: 'uppercase' }}>Consultas</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#ec4899', marginTop: '4px' }}>{activeStats.supportQueries}</div>
            </div>
          </div>
        </div>

        {/* Double Column Users List and Profiles */}
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* User List */}
          <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={userSearchTerm}
                onChange={e => setUserSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 12px 8px 30px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: '#fff', fontSize: '12px', outline: 'none' }}
              />
              <Search size={12} style={{ position: 'absolute', left: '10px', top: '11px', color: '#8f94a5' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '350px', overflowY: 'auto' }}>
              {filteredUsers.map(u => {
                const isSelected = selectedUserId === u.id
                return (
                  <div
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderRadius: '8px', background: isSelected ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isSelected ? '#10B981' : 'rgba(255,255,255,0.05)'}`, cursor: 'pointer', transition: 'all 150ms' }}
                  >
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 600, color: '#fff' }}>{u.avatar}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                      <div style={{ fontSize: '10px', color: '#8f94a5', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* User Profile Detail */}
          <div style={{ width: '60%', background: 'rgba(0,0,0,0.15)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {selectedUser ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#8B5CF6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 600, color: '#fff' }}>{selectedUser.avatar}</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{selectedUser.name}</div>
                    <div style={{ fontSize: '11px', color: '#8f94a5', marginTop: '2px' }}>Unido: {selectedUser.joinedDate}</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: '9px', fontWeight: 700, color: selectedUser.status === 'Activo' ? '#10B981' : '#ef4444', background: selectedUser.status === 'Activo' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>{selectedUser.status}</span>
                </div>

                <div style={{ fontSize: '11px', color: '#a3a6b8', background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #10B981', lineHeight: '1.4' }}>
                  {selectedUser.behavior}
                </div>

                {/* Profile Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#8f94a5' }}>Búsquedas</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{selectedUser.searches}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#8f94a5' }}>Viajes</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{selectedUser.trips}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '9px', color: '#8f94a5' }}>Rating Dado</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#F59E0B', marginTop: '4px' }}>★ {selectedUser.rating}</div>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px', borderRadius: '8px', textAlign: 'center', overflow: 'hidden' }}>
                    <div style={{ fontSize: '9px', color: '#8f94a5' }}>Favoritos</div>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#fff', marginTop: '6px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{selectedUser.favLines[0]}</div>
                  </div>
                </div>

                {/* Weekly Usage Graph */}
                <div>
                  <span style={{ fontSize: '11px', color: '#8f94a5', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Uso Semanal (Búsquedas y viajes por día)</span>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '80px', background: 'rgba(0,0,0,0.2)', padding: '10px 14px', borderRadius: '8px' }}>
                    {selectedUser.weeklyUsage.map((day, idx) => {
                      const maxVal = Math.max(...selectedUser.weeklyUsage.map(d=>d.count)) || 1
                      const pctHeight = (day.count / maxVal) * 100
                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                          <div style={{ width: '12px', height: `${pctHeight * 0.5 + 4}px`, background: '#10B981', borderRadius: '3px', position: 'relative' }} title={`${day.count} actividades`} />
                          <span style={{ fontSize: '8px', color: '#8f94a5' }}>{day.day}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8f94a5', fontSize: '12px' }}>Seleccione un usuario de la lista</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderBusesDetail = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Metric Cards Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '10px', color: '#8f94a5', textTransform: 'uppercase' }}>Flota en Servicio</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginTop: '6px' }}>18 Colectivos</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '10px', color: '#8f94a5', textTransform: 'uppercase' }}>Unidades Nuevas</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#10B981', marginTop: '6px' }}>+3 este mes</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '10px', color: '#8f94a5', textTransform: 'uppercase' }}>Alertas de Velocidad</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#ef4444', marginTop: '6px' }}>1 Unidad</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '14px', borderRadius: '10px' }}>
            <span style={{ fontSize: '10px', color: '#8f94a5', textTransform: 'uppercase' }}>Desvíos Activos</span>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#F59E0B', marginTop: '6px' }}>1 Reportado</div>
          </div>
        </div>

        {/* Live status Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#8f94a5', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '12px 16px' }}>Línea</th>
                <th style={{ padding: '12px 16px' }}>Interno</th>
                <th style={{ padding: '12px 16px' }}>Chofer</th>
                <th style={{ padding: '12px 16px' }}>Velocidad</th>
                <th style={{ padding: '12px 16px' }}>Alerta/Estado</th>
                <th style={{ padding: '12px 16px' }}>Sincronizado</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ACTIVE_FLEET.map((f, idx) => {
                const speedAlert = f.speed > 55
                const isDelayed = f.status.includes('Demorado')
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>{f.line}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'DM Mono', color: '#10B981' }}>#{f.unit}</td>
                    <td style={{ padding: '12px 16px' }}>{f.driver}</td>
                    <td style={{ padding: '12px 16px', color: speedAlert ? '#ef4444' : '#fff', fontWeight: speedAlert ? 700 : 500 }}>{f.speed} km/h</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        textTransform: 'uppercase',
                        background: speedAlert ? 'rgba(239,68,68,0.15)' : isDelayed ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        color: speedAlert ? '#ef4444' : isDelayed ? '#F59E0B' : '#10B981'
                      }}>
                        {speedAlert ? 'Velocidad Alta' : f.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#8f94a5' }}>{f.lastSync}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderDriversDetail = () => {
    const filteredDrivers = MOCK_DRIVERS_STATUS.filter(d => selectedDriverLine === 'all' || d.line === selectedDriverLine)

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Line Filter selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '12px 16px', borderRadius: '10px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Filtrar Choferes</span>
          <select
            value={selectedDriverLine}
            onChange={e => setSelectedDriverLine(e.target.value)}
            style={{ background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', padding: '6px 12px', fontSize: '12px', outline: 'none', cursor: 'pointer' }}
          >
            <option value="all">Ver Todos los Choferes</option>
            <option value="Línea 12">Línea 12</option>
            <option value="Línea 28">Línea 28</option>
            <option value="Línea 37">Línea 37</option>
            <option value="Línea 39">Línea 39</option>
            <option value="Línea 59">Línea 59</option>
            <option value="Línea 60">Línea 60</option>
            <option value="Línea 152">Línea 152</option>
          </select>
        </div>

        {/* Drivers List Table */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#8f94a5', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '12px 16px' }}>Chofer</th>
                <th style={{ padding: '12px 16px' }}>Línea</th>
                <th style={{ padding: '12px 16px' }}>Interno</th>
                <th style={{ padding: '12px 16px' }}>Estado</th>
                <th style={{ padding: '12px 16px' }}>Viajes Turno</th>
                <th style={{ padding: '12px 16px' }}>Calificación</th>
                <th style={{ padding: '12px 16px' }}>Actividad Reciente</th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((d, idx) => (
                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#fff' }}>{d.name}</td>
                  <td style={{ padding: '12px 16px' }}>{d.line}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'DM Mono' }}>#{d.unit}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: d.online ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      color: d.online ? '#10B981' : '#8f94a5'
                    }}>
                      {d.online ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{d.trips}</td>
                  <td style={{ padding: '12px 16px', color: '#F59E0B', fontWeight: 600 }}>★ {d.rating}</td>
                  <td style={{ padding: '12px 16px', color: '#a3a6b8' }}>{d.activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderAdsDetail = () => {
    const AD_EARNINGS_DATA = {
      day: [
        { label: '06:00', amount: 15000 },
        { label: '09:00', amount: 25000 },
        { label: '12:00', amount: 48000 },
        { label: '15:00', amount: 32000 },
        { label: '18:00', amount: 55000 },
        { label: '21:00', amount: 40000 },
        { label: '24:00', amount: 20000 }
      ],
      week: [
        { label: 'Lunes', amount: 85000 },
        { label: 'Martes', amount: 120000 },
        { label: 'Miércoles', amount: 95000 },
        { label: 'Jueves', amount: 140000 },
        { label: 'Viernes', amount: 180000 },
        { label: 'Sábado', amount: 110000 },
        { label: 'Domingo', amount: 90000 }
      ],
      month: [
        { label: 'Semana 1', amount: 450000 },
        { label: 'Semana 2', amount: 620000 },
        { label: 'Semana 3', amount: 580000 },
        { label: 'Semana 4', amount: 750000 }
      ]
    }

    const growthTrend = {
      day: { pct: '+8.5%', growing: true, text: 'Incremento en horas pico de la tarde.' },
      week: { pct: '+14.2%', growing: true, text: 'Crecimiento impulsado por la campaña de Mostaza S.A.' },
      month: { pct: '+22.8%', growing: true, text: 'Mayor pauta publicitaria en paradas premium.' }
    }

    const currentTrend = growthTrend[adGraphPeriod]

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Earnings Growth Graph Section */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#fff' }}>Gráfico de Ingresos Publicitarios</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: currentTrend.growing ? '#10B981' : '#ef4444', fontWeight: 700 }}>
                  {currentTrend.growing ? '▲' : '▼'} {currentTrend.pct}
                </span>
                <span style={{ fontSize: '11px', color: '#8f94a5' }}>{currentTrend.text}</span>
              </div>
            </div>
            <div style={{ display: 'flex', background: '#1b1d2e', borderRadius: '6px', padding: '3px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button onClick={() => setAdGraphPeriod('day')} style={{ padding: '4px 10px', border: 'none', background: adGraphPeriod === 'day' ? '#10B981' : 'transparent', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}>Día</button>
              <button onClick={() => setAdGraphPeriod('week')} style={{ padding: '4px 10px', border: 'none', background: adGraphPeriod === 'week' ? '#10B981' : 'transparent', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}>Semana</button>
              <button onClick={() => setAdGraphPeriod('month')} style={{ padding: '4px 10px', border: 'none', background: adGraphPeriod === 'month' ? '#10B981' : 'transparent', color: '#fff', fontSize: '11px', fontWeight: 600, borderRadius: '4px', cursor: 'pointer' }}>Mes</button>
            </div>
          </div>

          <div style={{ height: '180px', marginTop: '10px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={AD_EARNINGS_DATA[adGraphPeriod]} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAdEarnings" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis dataKey="label" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} />
                <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 10 }} tickFormatter={val => `$${val/1000}k`} />
                <Tooltip formatter={(value: any) => [`$${value.toLocaleString()} ARS`, 'Ingresos']} contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="amount" name="Ingresos" stroke="#10B981" fill="url(#colorAdEarnings)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.04)', color: '#8f94a5', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <th style={{ padding: '12px 16px' }}>Campaña</th>
                <th style={{ padding: '12px 16px' }}>Anunciante</th>
                <th style={{ padding: '12px 16px' }}>Parada / Línea</th>
                <th style={{ padding: '12px 16px' }}>Presupuesto</th>
                <th style={{ padding: '12px 16px' }}>Estado</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ads.map((ad, idx) => {
                const advertiserName = ad.title.includes('Coca Cola') ? 'Coca Cola Arg' : ad.title.includes('Mostaza') ? 'Mostaza S.A.' : 'Megatlon Club'
                return (
                  <tr key={ad.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: idx % 2 === 0 ? 'rgba(0,0,0,0.1)' : 'transparent' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#fff' }}>{ad.title}</div>
                      <div style={{ fontSize: '10px', color: '#8f94a5', marginTop: '2px' }}>{ad.desc}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ color: '#fff' }}>{advertiserName}</div>
                      <div style={{ fontSize: '10px', color: '#8f94a5', marginTop: '2px' }}>{ad.timestamp}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div>{ad.stop}</div>
                      <div style={{ fontSize: '10px', color: '#10B981', marginTop: '2px' }}>{ad.route}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10B981' }}>${ad.budget.toLocaleString()} ARS</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: ad.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: ad.status === 'approved' ? '#10B981' : '#F59E0B'
                      }}>
                        {ad.status === 'approved' ? 'APROBADO' : 'PENDIENTE'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleSendAdReferral(advertiserName)}
                        style={{
                          background: 'rgba(59,130,246,0.12)',
                          border: '1px solid rgba(59,130,246,0.25)',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          color: '#3b82f6',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 150ms'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                      >
                        <MessageSquare size={11} /> Mensajear Enlace
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const logout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const NAV_ITEMS = [
    { id: 'overview', label: 'Panel Control', icon: BarChart2 },
    { id: 'linemaps', label: 'Mapas de Línea', icon: Bus },
    { id: 'drivers', label: 'Choferes y QR', icon: Users },
    { id: 'ads', label: 'Publicidad', icon: Megaphone },
    { id: 'chat', label: 'Mensajería', icon: MessageSquare },
    { id: 'reports', label: 'Denuncias', icon: AlertTriangle },
    { id: 'provincemap', label: 'Mapa Argentina', icon: Globe },
    { id: 'todos', label: 'Tareas', icon: ListChecks },
    { id: 'news', label: 'Noticias', icon: BookOpen },
  ]

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0b0f19', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8f94a5', fontFamily: 'DM Mono', fontSize: '13px' }}>Cargando panel de Super Administrador...</div>
      </div>
    )
  }

  // Calculate total money made from Ads in ARS
  const totalAdsEarnings = ads
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => sum + a.budget, 0)

  return (
    <div style={{
      height: '100vh',
      overflow: 'hidden',
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
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.15)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src="/images/logo.jpg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Bien<span style={{ color: '#8f94a5', fontWeight: 400 }}>Parada</span>
            </span>
            <span style={{
              fontSize: '8px',
              color: '#10B981',
              background: 'rgba(16, 185, 129, 0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}>
              SUPER ADMIN
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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

          <button
            onClick={logout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              padding: '6px 14px',
              color: '#ef4444',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 200ms'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)'}
          >
            <LogOut size={13} /> Salir
          </button>
        </div>
      </header>

      {/* Main Horizontal Navigation */}
      <div style={{
        background: '#121527',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        padding: '0 24px',
        display: 'flex',
        gap: '20px',
        overflowX: 'auto',
      }}>
        {NAV_ITEMS.map((item) => {
          const active = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id as Tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 4px',
                color: active ? '#fff' : '#8f94a5',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                background: 'none',
                border: 'none',
                borderBottom: `2.5px solid ${active ? '#10B981' : 'transparent'}`,
                cursor: 'pointer',
                transition: 'all 200ms',
                whiteSpace: 'nowrap',
              }}
            >
              <item.icon size={14} style={{ color: active ? '#10B981' : '#8f94a5' }} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Quick Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
              <div
                onClick={() => { setActiveDetail('users'); setSelectedUserId('usr-1'); }}
                style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none' }}
              >
                <span style={{ fontSize: '11px', color: '#8f94a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Usuarios de la App</span>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{stats.totalUsers.toLocaleString()}</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>▲ +4.2% esta semana</div>
              </div>
              <div
                onClick={() => setActiveDetail('buses')}
                style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(59,130,246,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none' }}
              >
                <span style={{ fontSize: '11px', color: '#8f94a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Colectivos en Ruta</span>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{stats.activeBuses}</div>
                <div style={{ fontSize: '11px', color: '#10B981', marginTop: '4px' }}>En servicio en tiempo real</div>
              </div>
              <div
                onClick={() => setActiveDetail('drivers')}
                style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(16,185,129,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none' }}
              >
                <span style={{ fontSize: '11px', color: '#8f94a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Choferes Activos</span>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#fff' }}>{stats.totalDrivers}</div>
                <div style={{ fontSize: '11px', color: '#8f94a5', marginTop: '4px' }}>7 líneas registradas</div>
              </div>
              <div
                onClick={() => setActiveDetail('ads')}
                style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'all 200ms' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,158,11,0.3)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.transform = 'none' }}
              >
                <span style={{ fontSize: '11px', color: '#8f94a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recaudado Publicidad</span>
                <div style={{ fontSize: '28px', fontWeight: 800, marginTop: '8px', color: '#10B981' }}>${totalAdsEarnings.toLocaleString()} ARS</div>
                <div style={{ fontSize: '11px', color: '#8f94a5', marginTop: '4px' }}>Facturado en pesos</div>
              </div>
            </div>

            {/* Performance Visual Graph Selector */}
            <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Gráfico de Rendimiento General</h3>
                  <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Análisis de nuevos usuarios unidos y usuarios activos usando la app</p>
                </div>
                <div style={{ display: 'flex', background: '#1b1d2e', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <button onClick={() => setGraphPeriod('day')} style={{ padding: '6px 12px', border: 'none', background: graphPeriod === 'day' ? '#10B981' : 'transparent', color: '#fff', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}>Día</button>
                  <button onClick={() => setGraphPeriod('week')} style={{ padding: '6px 12px', border: 'none', background: graphPeriod === 'week' ? '#10B981' : 'transparent', color: '#fff', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}>Semana</button>
                  <button onClick={() => setGraphPeriod('month')} style={{ padding: '6px 12px', border: 'none', background: graphPeriod === 'month' ? '#10B981' : 'transparent', color: '#fff', fontSize: '12px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer' }}>Mes</button>
                </div>
              </div>

              <div style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={METRICS_BY_PERIOD[graphPeriod]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorJoined" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="label" stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 11 }} />
                    <YAxis stroke="rgba(255,255,255,0.1)" tick={{ fill: '#8f94a5', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="joined" name="Nuevos Usuarios" stroke="#10B981" fill="url(#colorJoined)" strokeWidth={2} />
                    <Area type="monotone" dataKey="active" name="Usuarios Activos" stroke="#8B5CF6" fill="url(#colorActive)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Todo reminders */}
            <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Recordatorios del Super Administrador</h3>
                <span style={{ fontSize: '11px', color: '#8f94a5', fontFamily: 'DM Mono' }}>{todos.filter(t=>!t.done).length} pendientes</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input
                  type="text"
                  placeholder="Nuevo recordatorio técnico o administrativo..."
                  value={newTodoText}
                  onChange={e => setNewTodoText(e.target.value)}
                  style={{
                    flex: 1,
                    background: '#1b1d2e',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '13px'
                  }}
                  onKeyDown={e => e.key === 'Enter' && addTodo()}
                />
                <button
                  onClick={addTodo}
                  style={{
                    padding: '0 16px',
                    background: '#10B981',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  Agregar
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {todos.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                    <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <span style={{ flex: 1, fontSize: '13px', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#8f94a5' : '#fff' }}>{t.text}</span>
                    <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.05)', color: '#8f94a5', padding: '2px 6px', borderRadius: '4px' }}>{t.date}</span>
                    <button onClick={() => toggleFlag(t.id)} style={{ background: 'none', border: 'none', color: t.flagged ? '#eab308' : '#8f94a5', cursor: 'pointer' }}>
                      <Star size={14} fill={t.flagged ? '#eab308' : 'none'} />
                    </button>
                    <button onClick={() => deleteTodo(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
            </div>

            {/* Interactive Detail Modal Overlay */}
            {activeDetail && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(5, 8, 16, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: '20px'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: activeDetail === 'users' ? '900px' : '800px',
                  background: '#121527',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  maxHeight: '90vh',
                  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
                  overflow: 'hidden'
                }}>
                  {/* Modal Header */}
                  <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {activeDetail === 'users' && <Users size={20} style={{ color: '#10B981' }} />}
                      {activeDetail === 'buses' && <Bus size={20} style={{ color: '#3b82f6' }} />}
                      {activeDetail === 'drivers' && <Users size={20} style={{ color: '#10B981' }} />}
                      {activeDetail === 'ads' && <Megaphone size={20} style={{ color: '#F59E0B' }} />}
                      <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#fff' }}>
                        {activeDetail === 'users' && 'Estadísticas de Usuarios'}
                        {activeDetail === 'buses' && 'Estado de Colectivos en Ruta'}
                        {activeDetail === 'drivers' && 'Monitoreo de Choferes Activos'}
                        {activeDetail === 'ads' && 'Resumen de Campañas de Publicidad'}
                      </h2>
                    </div>
                    <button
                      onClick={() => { setActiveDetail(null); setSelectedUserId(null); }}
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '16px'
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                    {activeDetail === 'users' && renderUsersDetail()}
                    {activeDetail === 'buses' && renderBusesDetail()}
                    {activeDetail === 'drivers' && renderDriversDetail()}
                    {activeDetail === 'ads' && renderAdsDetail()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

        {/* 1. LineMapsTab */}
        {tab === 'linemaps' && <LineMapsTab onMessageAdmin={handleSendMessageToAdmin} />}

        {/* 2. Drivers and QR Code Directory */}
        {tab === 'drivers' && <DriversTab />}

        {/* 3. Ads Tab with ARS stats */}
        {tab === 'ads' && <AdsTab ads={ads} onApprove={(id) => {
          const updated = ads.map(a => a.id === id ? { ...a, status: 'approved' } : a)
          saveAds(updated)
          toast.success('Campaña publicitaria aprobada')
        }} onReject={(id) => {
          const updated = ads.map(a => a.id === id ? { ...a, status: 'rejected' } : a)
          saveAds(updated)
          toast.error('Campaña rechazada')
        }} />}

        {/* 4. Chat support messenger layout */}
        {tab === 'chat' && (
          <ChatTab
            chats={chats}
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            chatSearch={chatSearch}
            setChatSearch={setChatSearch}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSend={(text: string) => {
              const chat = chats.find(c => c.id === selectedChatId)
              if (!chat) return
              const newMsg = { id: `m-${Date.now()}`, sender: 'admin', text, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
              const updatedHistory = [...chat.history, newMsg]
              const updatedChats = chats.map(c => c.id === selectedChatId ? { ...c, lastMsg: text, history: updatedHistory } : c)
              saveChats(updatedChats)
            }}
            onToggleStar={(id: string) => {
              const updatedChats = chats.map(c => c.id === id ? { ...c, starred: !c.starred } : c)
              saveChats(updatedChats)
              toast.success('Favoritos actualizados')
            }}
            onDeleteChat={(id: string) => {
              const updatedChats = chats.filter(c => c.id !== id)
              saveChats(updatedChats)
              if (selectedChatId === id && updatedChats.length > 0) {
                setSelectedChatId(updatedChats[0].id)
              }
              toast.success('Chat de soporte eliminado')
            }}
            onAddChat={(name: string, role: 'lineadmin' | 'user') => {
              const newChat = {
                id: `c-${Date.now()}`,
                name,
                role,
                avatar: name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
                starred: false,
                lastMsg: 'Chat iniciado.',
                history: [
                  { id: 'init', sender: 'admin', text: `Conversación de soporte iniciada con ${name}.`, timestamp: 'Reciente' }
                ]
              }
              saveChats([...chats, newChat])
              setSelectedChatId(newChat.id)
              toast.success('Nueva conversación creada')
            }}
            showAddChatModal={showAddChatModal}
            setShowAddChatModal={setShowAddChatModal}
            newChatName={newChatName}
            setNewChatName={setNewChatName}
            newChatRole={newChatRole}
            setNewChatRole={setNewChatRole}
          />
        )}

        {/* 5. Complaints Reports Tab */}
        {tab === 'reports' && <ReportsTab />}

        {/* 6. Provinces Demography Map */}
        {tab === 'provincemap' && (
          <ProvinceMapTab
            selectedProvinceKey={selectedProvinceKey}
            onSelectProvince={setSelectedProvinceKey}
          />
        )}

        {/* 7. Dedicated Todos/Reminders */}
        {tab === 'todos' && (
          <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Remitentes, Recordatorios y Tareas Críticas</h3>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="text"
                placeholder="Nueva tarea del centro de operaciones..."
                value={newTodoText}
                onChange={e => setNewTodoText(e.target.value)}
                style={{
                  flex: 1,
                  background: '#1b1d2e',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '13px'
                }}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
              />
              <button onClick={addTodo} style={{ padding: '0 24px', background: '#10B981', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>Agregar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todos.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '14px 20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <input type="checkbox" checked={t.done} onChange={() => toggleTodo(t.id)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', textDecoration: t.done ? 'line-through' : 'none', color: t.done ? '#8f94a5' : '#fff', fontWeight: 600 }}>{t.text}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                      <span style={{ fontSize: '9px', background: t.badge === 'Urgente' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)', color: t.badge === 'Urgente' ? '#ef4444' : '#8f94a5', padding: '1px 5px', borderRadius: '3px', fontWeight: 600 }}>{t.badge}</span>
                      <span style={{ fontSize: '9px', color: '#8f94a5' }}>Fecha: {t.date}</span>
                    </div>
                  </div>
                  <button onClick={() => toggleFlag(t.id)} style={{ background: 'none', border: 'none', color: t.flagged ? '#eab308' : '#8f94a5', cursor: 'pointer' }}>
                    <Star size={16} fill={t.flagged ? '#eab308' : 'none'} />
                  </button>
                  <button onClick={() => deleteTodo(t.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. Transport Industry News */}
        {tab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Noticias y Tips del Transporte Argentino</h3>
                <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Información reciente (antigüedad menor a 10 días) de colectivos, taxis, aplicaciones y subtes</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {news.map(item => (
                <div key={item.id} style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.15)', color: '#10B981', padding: '3px 8px', borderRadius: '4px', fontWeight: 700, fontFamily: 'DM Mono' }}>{item.source}</span>
                      <button onClick={() => {
                        const updated = news.map(n => n.id === item.id ? { ...n, starred: !n.starred } : n)
                        saveNews(updated)
                        toast.success(item.starred ? 'Destacado removido' : 'Noticia guardada en favoritos')
                      }} style={{ background: 'none', border: 'none', color: item.starred ? '#eab308' : '#8f94a5', cursor: 'pointer' }}>
                        <Star size={18} fill={item.starred ? '#eab308' : 'none'} />
                      </button>
                    </div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '12px 0 6px', lineHeight: 1.3 }}>{item.title}</h4>
                    <p style={{ fontSize: '12px', color: '#8f94a5', margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8f94a5', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Fecha: {item.date}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Map grid component for 7 maps ──────────────────────────────────────────
// ─── Map constants and data definitions ──────────────────────────────────────
const LINE_RAMALES: Record<string, { id: string, name: string, description: string, pathShift: number }[]> = {
  'line-1': [
    { id: 'l1-a', name: 'Ramal A (Villa Urquiza)', description: 'Por Av. Santa Fe y Las Heras', pathShift: 0 },
    { id: 'l1-b', name: 'Ramal B (Pueyrredón)', description: 'Por Av. Córdoba y Las Heras (Alternativo)', pathShift: 1 },
  ],
  'line-28': [
    { id: 'l28-a', name: 'Ramal A (General Paz)', description: 'Por Autopista General Paz directo', pathShift: 0 },
    { id: 'l28-b', name: 'Ramal B (Liniers)', description: 'Por Av. General Paz colectores laterales', pathShift: 2 },
  ],
  'line-3': [
    { id: 'l3-a', name: 'Ramal A (Costanera)', description: 'Por Av. Costanera y Libertador', pathShift: 0 },
    { id: 'l3-b', name: 'Ramal B (Callao)', description: 'Por Av. Las Heras y Callao', pathShift: 3 },
  ],
  'line-39': [
    { id: 'l39-a', name: 'Ramal 1 (Santa Fe)', description: 'Por Av. Corrientes y Santa Fe', pathShift: 0 },
    { id: 'l39-b', name: 'Ramal 2 (Palermo)', description: 'Por Colegiales y Palermo Chico', pathShift: 4 },
  ],
  'line-59': [
    { id: 'l59-a', name: 'Ramal 1 (Metrobús)', description: 'Por Metrobús Cabildo y Av. Maipú', pathShift: 0 },
    { id: 'l59-b', name: 'Ramal 2 (Libertador)', description: 'Por Av. del Libertador y San Martín', pathShift: 5 },
  ],
  'line-60': [
    { id: 'l60-a', name: 'Ramal Panamericana', description: 'Por Panamericana y Acceso Norte', pathShift: 0 },
    { id: 'l60-b', name: 'Ramal Maipú', description: 'Por Av. Maipú y Centenario', pathShift: 6 },
  ],
  'line-102': [
    { id: 'l102-a', name: 'Ramal A (Soho)', description: 'Por Palermo Soho y Las Heras', pathShift: 0 },
    { id: 'l102-b', name: 'Ramal B (Recoleta)', description: 'Por Recoleta y Plaza de Mayo', pathShift: 7 },
  ],
  'line-152': [
    { id: 'l152-a', name: 'Ramal A (Olivos)', description: 'Por Metrobús Cabildo y Av. Maipú', pathShift: 0 },
    { id: 'l152-b', name: 'Ramal B (Puerto Madero)', description: 'Por Av. del Libertador y Puerto Madero', pathShift: 8 },
  ],
  'line-tourist-yellow': [
    { id: 'lty-a', name: 'Circuito Histórico', description: 'Plaza de Mayo, San Telmo, La Boca', pathShift: 0 },
    { id: 'lty-b', name: 'Circuito Costanera', description: 'Palermo Woods, Recoleta, Costanera', pathShift: 9 },
  ],
  'line-tourist-red': [
    { id: 'ltr-a', name: 'Circuito Sur', description: 'Puerto Madero, Caminito, Plaza Dorrego', pathShift: 0 },
    { id: 'ltr-b', name: 'Circuito Norte', description: 'Aeroparque, Planetario, Recoleta', pathShift: 10 },
  ],
}

const LINE_ADMINS: Record<string, { name: string, email: string }> = {
  'line-1': { name: 'Néstor García', email: 'nestor.garcia@callao.com.ar' },
  'line-28': { name: 'Carlos DOTA', email: 'carlos.dota@dota.com.ar' },
  'line-3': { name: 'Sofía L37', email: 'sofia.l37@cuatrosept.com.ar' },
  'line-39': { name: 'Ricardo L39', email: 'ricardo.l39@santafe.com.ar' },
  'line-59': { name: 'Valeria L59', email: 'valeria.l59@mic59.com.ar' },
  'line-60': { name: 'Daniel Monsa', email: 'daniel.monsa@monsa.com.ar' },
  'line-102': { name: 'Martín Sargento', email: 'martin@sargentocabral.com.ar' },
  'line-152': { name: 'Tandilense Admin', email: 'admin@tandilense152.com.ar' },
  'line-tourist-yellow': { name: 'Turismo Amarillo', email: 'admin@ba-citytour.com.ar' },
  'line-tourist-red': { name: 'Gray Line Admin', email: 'admin@grayline.com.ar' },
}

// ─── Map grid component for all active and tourist lines ────────────────────
function LineMapsTab({ onMessageAdmin }: { onMessageAdmin: (adminName: string, adminEmail: string, lineName: string) => void }) {
  const activeLines = MOCK_LINES

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Mapas de Trayectorias en Tiempo Real</h3>
        <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Monitoreo independiente de trayectos y unidades móviles en tiempo real para todas las líneas principales y turísticas</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {activeLines.map(line => (
          <SingleLineMap key={line.id} line={line} onMessageAdmin={onMessageAdmin} />
        ))}
      </div>
    </div>
  )
}

function SingleLineMap({ line, onMessageAdmin }: { line: any, onMessageAdmin: (adminName: string, adminEmail: string, lineName: string) => void }) {
  const ramales = LINE_RAMALES[line.id] || []
  const [selectedRamalId, setSelectedRamalId] = useState(ramales[0]?.id || '')
  const activeRamal = ramales.find(r => r.id === selectedRamalId) || ramales[0]

  const basePath = getMockRoutePathForLine(line) || []
  const path = useMemo(() => {
    const shift = activeRamal ? activeRamal.pathShift : 0
    if (shift === 0) return basePath
    return basePath.map((p, idx) => ({
      lat: p.lat + 0.0012 * Math.sin(idx / 1.5 + shift),
      lng: p.lng + 0.0012 * Math.cos(idx / 1.5 + shift)
    }))
  }, [basePath, activeRamal])

  const [time, setTime] = useState(Date.now())
  const [showDetailModal, setShowDetailModal] = useState(false)

  useEffect(() => {
    const timer = setInterval(() => setTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const [viewport, setViewport] = useState({
    latitude: path[0]?.lat || -34.6037,
    longitude: path[0]?.lng || -58.3816,
    zoom: 11.2
  })

  // Recenter viewport when path changes due to ramal selection
  useEffect(() => {
    if (path[0]) {
      setViewport(prev => ({
        ...prev,
        latitude: path[0].lat,
        longitude: path[0].lng
      }))
    }
  }, [path])

  const pathLen = path.length
  if (pathLen < 2) return null

  // Calculate simulated bus coordinates along the path line
  const busIndex1 = Math.floor((time / 1400) % pathLen)
  const busIndex2 = Math.floor((time / 1400 + pathLen / 2.5) % pathLen)
  const bus1 = path[busIndex1]
  const bus2 = path[busIndex2]

  const geojson: any = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: path.map(p => [p.lng, p.lat])
    }
  }

  const adminInCharge = LINE_ADMINS[line.id] || { name: 'Operaciones Gral', email: 'ops@tubus.com.ar' }
  const lineStopsList = getMockStopsForLine(line, 'ida')

  return (
    <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: line.color }} />
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{line.name}</span>
        </div>
        <span style={{ fontSize: '10px', color: '#8f94a5', fontFamily: 'DM Mono' }}>{line.company}</span>
      </div>

      {/* Map rendering */}
      <div style={{ height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Map
          {...viewport}
          onMove={evt => setViewport(evt.viewState)}
          mapStyle={CARTODB_DARK as any}
          attributionControl={false}
        >
          <Source id={`route-${line.id}-${activeRamal?.id || 'def'}`} type="geojson" data={geojson}>
            <Layer
              id={`route-line-${line.id}-${activeRamal?.id || 'def'}`}
              type="line"
              paint={{
                'line-color': line.color,
                'line-width': 3,
                'line-opacity': 0.75
              }}
            />
          </Source>

          {/* Simulated buses markers */}
          {bus1 && (
            <Marker latitude={bus1.lat} longitude={bus1.lng}>
              <div style={{ background: '#10B981', border: '2px solid #fff', width: '12px', height: '12px', borderRadius: '50%', boxShadow: '0 0 10px rgba(16,185,129,0.8)' }} />
            </Marker>
          )}
          {bus2 && (
            <Marker latitude={bus2.lat} longitude={bus2.lng}>
              <div style={{ background: '#3b82f6', border: '2px solid #fff', width: '12px', height: '12px', borderRadius: '50%', boxShadow: '0 0 10px rgba(59,130,246,0.8)' }} />
            </Marker>
          )}
        </Map>
      </div>

      {/* Ramales selector buttons */}
      {ramales.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '9px', color: '#8f94a5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ramales Disponibles:</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ramales.map(r => {
              const isSel = r.id === selectedRamalId
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedRamalId(r.id)}
                  style={{
                    padding: '6px 10px',
                    background: isSel ? line.color : 'rgba(255,255,255,0.04)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 150ms'
                  }}
                >
                  {r.name.replace(/Ramal\s+/, '')}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8f94a5', fontFamily: 'DM Mono', marginTop: '4px' }}>
        <span>2 Colectivos Activos</span>
        <span>Velocidad: 22 km/h</span>
      </div>

      <button
        onClick={() => setShowDetailModal(true)}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '8px',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 200ms'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
      >
        Ver Detalles y Paradas
      </button>

      {/* Line detail Modal overlay */}
      {showDetailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(5, 8, 16, 0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '650px',
            background: '#121527',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: line.color }} />
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#fff' }}>{line.name}</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Operator and Admin Block */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '16px', borderRadius: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#8f94a5', textTransform: 'uppercase' }}>Operador & Responsable</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginTop: '4px' }}>{adminInCharge.name}</div>
                  <div style={{ fontSize: '11px', color: '#8f94a5', marginTop: '2px' }}>{adminInCharge.email}</div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    onMessageAdmin(adminInCharge.name, adminInCharge.email, line.name);
                  }}
                  style={{
                    padding: '8px 14px',
                    background: 'rgba(59,130,246,0.12)',
                    border: '1px solid rgba(59,130,246,0.25)',
                    borderRadius: '8px',
                    color: '#3b82f6',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 150ms'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,130,246,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,130,246,0.12)'}
                >
                  <MessageSquare size={13} /> Mensajear Admin
                </button>
              </div>

              {/* Real-time stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#8f94a5' }}>Colectivos</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#10B981', marginTop: '4px' }}>2 activos</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#8f94a5' }}>Pasajeros</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#8B5CF6', marginTop: '4px' }}>240 en viaje</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#8f94a5' }}>Velocidad</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#3b82f6', marginTop: '4px' }}>22 km/h</div>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.15)', padding: '10px', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '9px', color: '#8f94a5' }}>Paradas</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: '#F59E0B', marginTop: '4px' }}>{lineStopsList.length} total</div>
                </div>
              </div>

              {/* Stop Timeline */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', display: 'block', marginBottom: '10px' }}>Paradas y Recorrido de Ida</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px', maxHeight: '250px', overflowY: 'auto' }}>
                  {lineStopsList.map((stop, idx) => (
                    <div key={stop.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '6px' }}>
                      <span style={{ fontFamily: 'DM Mono', color: line.color, fontWeight: 700, width: '18px' }}>{idx + 1}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#fff' }}>{stop.name}</div>
                        <div style={{ fontSize: '9px', color: '#8f94a5', marginTop: '1px' }}>{stop.street_name}</div>
                      </div>
                      <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.05)', color: '#8f94a5', padding: '2px 6px', borderRadius: '4px' }}>Espere: {stop.avg_wait_minutes} min</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Drivers credentials and QR view component ──────────────────────────────
function DriversTab() {
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({})
  const [selectedQr, setSelectedQr] = useState<any | null>(null)

  const togglePasswordVisibility = (driverName: string) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [driverName]: !prev[driverName]
    }))
  }

  const allDrivers = Object.entries(LINE_DETAILS).flatMap(([lineId, details]) => {
    const lineInfo = LINES_DATA.find(l => l.id === lineId) || { name: `Línea` }
    return details.driversList.map(d => ({
      name: d.name,
      email: d.email,
      pass: d.pass,
      unit: d.unit,
      line: lineInfo.name,
      online: d.online,
      rating: d.rating,
    }))
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Registro de Choferes y Credenciales</h3>
          <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Administre accesos, correos y contraseñas de choferes registrados en el sistema</p>
        </div>
      </div>

      <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <th style={{ padding: '14px 20px', color: '#8f94a5', fontWeight: 600 }}>Nombre</th>
              <th style={{ padding: '14px 20px', color: '#8f94a5', fontWeight: 600 }}>Línea</th>
              <th style={{ padding: '14px 20px', color: '#8f94a5', fontWeight: 600 }}>Unidad</th>
              <th style={{ padding: '14px 20px', color: '#8f94a5', fontWeight: 600 }}>Correo Electrónico</th>
              <th style={{ padding: '14px 20px', color: '#8f94a5', fontWeight: 600 }}>Contraseña</th>
              <th style={{ padding: '14px 20px', color: '#8f94a5', fontWeight: 600 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {allDrivers.map((d, idx) => {
              const isVisible = showPasswordMap[d.name] || false
              return (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px 20px', fontWeight: 600, color: '#fff' }}>{d.name}</td>
                  <td style={{ padding: '12px 20px', color: '#a3a6b8' }}>{d.line}</td>
                  <td style={{ padding: '12px 20px', color: '#fff', fontFamily: 'DM Mono' }}>{d.unit}</td>
                  <td style={{ padding: '12px 20px', color: '#a3a6b8', fontFamily: 'DM Mono' }}>{d.email}</td>
                  <td style={{ padding: '12px 20px', color: '#fff', fontFamily: 'DM Mono' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{isVisible ? d.pass : '••••••••'}</span>
                      <button
                        onClick={() => togglePasswordVisibility(d.name)}
                        style={{ background: 'none', border: 'none', color: '#8f94a5', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      background: d.online ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)',
                      color: d.online ? '#10B981' : '#8f94a5',
                      padding: '3px 8px',
                      borderRadius: '999px',
                      fontWeight: 600
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: d.online ? '#10B981' : '#8f94a5' }} />
                      {d.online ? 'En servicio' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* QR Code Directory section */}
      <div style={{ marginTop: '12px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px' }}>Directorio de Códigos QR Activos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
          {allDrivers.map((d, idx) => {
            const lineObj = MOCK_LINES.find(l => l.name.toLowerCase().includes(d.line.toLowerCase()))
            const lineColor = lineObj ? lineObj.color : '#3B82F6'
            return (
              <div
                key={idx}
                onClick={() => setSelectedQr(d)}
                style={{
                  background: '#121527',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderTop: `3px solid ${lineColor}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 200ms'
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Unidad {d.unit}</span>
                  <span style={{
                    fontSize: '9px',
                    background: `${lineColor}1A`,
                    color: lineColor,
                    border: `1px solid ${lineColor}33`,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 600
                  }}>
                    {d.line}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: '#8f94a5' }}>Chofer: <strong style={{ color: '#fff' }}>{d.name}</strong></div>
                <div style={{
                  fontSize: '10px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${lineColor}26`,
                  padding: '6px 8px',
                  borderRadius: '6px',
                  fontFamily: 'DM Mono',
                  color: lineColor,
                  wordBreak: 'break-all',
                  textAlign: 'center',
                  marginTop: '4px',
                  fontWeight: 600
                }}>
                  DEMO-QR-L{d.unit.slice(0, 2)}-{d.unit.slice(2)}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Interactive QR Code Modal Preview */}
      {selectedQr && (() => {
        const lineObj = MOCK_LINES.find(l => l.name.toLowerCase().includes(selectedQr.line.toLowerCase()))
        const lineColor = lineObj ? lineObj.color : '#3B82F6'
        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 8, 16, 0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '360px',
              background: '#121527',
              border: `1px solid ${lineColor}40`,
              borderTop: `4px solid ${lineColor}`,
              borderRadius: '16px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Title */}
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: '#fff' }}>Código QR de Unidad</h4>
                <button
                  onClick={() => setSelectedQr(null)}
                  style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '28px', height: '28px', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px' }}
                >
                  ✕
                </button>
              </div>

              {/* QR Vector SVG */}
              <div style={{
                background: '#fff',
                padding: '16px',
                borderRadius: '12px',
                boxShadow: '0 10px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg width="180" height="180" viewBox="0 0 29 29">
                  <rect x="0" y="0" width="7" height="7" fill={lineColor}/>
                  <rect x="1" y="1" width="5" height="5" fill="#fff"/>
                  <rect x="2" y="2" width="3" height="3" fill={lineColor}/>
                  
                  <rect x="22" y="0" width="7" height="7" fill={lineColor}/>
                  <rect x="23" y="1" width="5" height="5" fill="#fff"/>
                  <rect x="24" y="2" width="3" height="3" fill={lineColor}/>
                  
                  <rect x="0" y="22" width="7" height="7" fill={lineColor}/>
                  <rect x="1" y="23" width="5" height="5" fill="#fff"/>
                  <rect x="2" y="24" width="3" height="3" fill={lineColor}/>
                  
                  <rect x="18" y="18" width="5" height="5" fill={lineColor}/>
                  <rect x="19" y="19" width="3" height="3" fill="#fff"/>
                  <rect x="20" y="20" width="1" height="1" fill={lineColor}/>
                  
                  <rect x="8" y="2" width="2" height="1" fill={lineColor}/>
                  <rect x="12" y="1" width="1" height="3" fill={lineColor}/>
                  <rect x="16" y="3" width="3" height="2" fill={lineColor}/>
                  <rect x="10" y="6" width="4" height="1" fill={lineColor}/>
                  
                  <rect x="2" y="10" width="1" height="4" fill={lineColor}/>
                  <rect x="6" y="8" width="3" height="2" fill={lineColor}/>
                  <rect x="11" y="10" width="2" height="2" fill={lineColor}/>
                  <rect x="15" y="9" width="1" height="4" fill={lineColor}/>
                  <rect x="18" y="12" width="3" height="1" fill={lineColor}/>
                  <rect x="22" y="10" width="4" height="2" fill={lineColor}/>
                  
                  <rect x="9" y="15" width="2" height="3" fill={lineColor}/>
                  <rect x="14" y="16" width="3" height="1" fill={lineColor}/>
                  <rect x="19" y="15" width="1" height="3" fill={lineColor}/>
                  <rect x="25" y="16" width="2" height="2" fill={lineColor}/>
                  
                  <rect x="10" y="22" width="3" height="2" fill={lineColor}/>
                  <rect x="15" y="24" width="2" height="3" fill={lineColor}/>
                  <rect x="18" y="26" width="4" height="1" fill={lineColor}/>
                  <rect x="25" y="23" width="1" height="3" fill={lineColor}/>
                </svg>
              </div>

              {/* Info & Code */}
              <div style={{ textAlign: 'center', width: '100%' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>Interno #{selectedQr.unit}</div>
                <div style={{ fontSize: '12px', color: lineColor, fontWeight: 600, marginTop: '4px' }}>{selectedQr.line}</div>
                <div style={{ fontSize: '11px', color: '#8f94a5', marginTop: '2px' }}>Chofer: {selectedQr.name}</div>
                <div style={{
                  fontSize: '11px',
                  background: 'rgba(255,255,255,0.03)',
                  border: `1px solid ${lineColor}33`,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontFamily: 'DM Mono',
                  color: lineColor,
                  marginTop: '12px',
                  wordBreak: 'break-all',
                  fontWeight: 600
                }}>
                  DEMO-QR-L{selectedQr.unit.slice(0, 2)}-{selectedQr.unit.slice(2)}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                <button
                  onClick={() => {
                    toast.success('Descargando archivo QR en formato PNG...');
                  }}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: lineColor,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={14} /> Descargar
                </button>
                <button
                  onClick={() => {
                    window.print();
                  }}
                  style={{
                    padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Printer size={14} />
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ─── Ads Management Component with ARS currency ──────────────────────────────
function AdsTab({ ads, onApprove, onReject }: { ads: any[]; onApprove: (id: string) => void; onReject: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Panel de Anuncios y Patrocinios</h3>
        <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Monitoreo de ingresos recaudados en Pesos Argentinos (ARS) y control de campañas en paradas</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {ads.map(ad => (
          <div key={ad.id} style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#8f94a5', fontFamily: 'DM Mono' }}>{ad.timestamp}</span>
                <span style={{
                  fontSize: '9px',
                  background: ad.status === 'approved' ? 'rgba(16,185,129,0.15)' : ad.status === 'pending' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                  color: ad.status === 'approved' ? '#10B981' : ad.status === 'pending' ? '#f59e0b' : '#ef4444',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  textTransform: 'uppercase'
                }}>{ad.status === 'approved' ? 'Aprobado' : ad.status === 'pending' ? 'Pendiente' : 'Rechazado'}</span>
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: '12px 0 4px' }}>{ad.title}</h4>
              <p style={{ fontSize: '12px', color: '#8f94a5', margin: 0, lineHeight: 1.4 }}>{ad.desc}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ fontSize: '11px', color: '#8f94a5' }}>Parada asignada: <strong style={{ color: '#fff' }}>{ad.stop} ({ad.route})</strong></div>
                <div style={{ fontSize: '11px', color: '#8f94a5' }}>Vigencia contratada: <strong style={{ color: '#fff' }}>{ad.duration}</strong></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
              <div>
                <span style={{ fontSize: '10px', color: '#8f94a5' }}>Presupuesto total</span>
                <div style={{ fontSize: '16px', fontWeight: 800, color: '#10B981' }}>${ad.budget.toLocaleString()} ARS</div>
              </div>
              {ad.status === 'pending' && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => onApprove(ad.id)} style={{ padding: '6px 12px', background: '#10B981', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Aprobar</button>
                  <button onClick={() => onReject(ad.id)} style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '6px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}>Rechazar</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Messenger Chat support component ────────────────────────────────────────
function ChatTab({
  chats, selectedChatId, onSelectChat, chatSearch, setChatSearch,
  chatInput, setChatInput, onSend, onToggleStar, onDeleteChat,
  onAddChat, showAddChatModal, setShowAddChatModal, newChatName,
  setNewChatName, newChatRole, setNewChatRole
}: any) {
  const currentChat = chats.find((c: any) => c.id === selectedChatId) || chats[0]

  const filteredChats = chats.filter((c: any) =>
    c.name.toLowerCase().includes(chatSearch.toLowerCase())
  ).sort((a: any, b: any) => (b.starred ? 1 : 0) - (a.starred ? 1 : 0))

  return (
    <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', display: 'flex', height: '560px', overflow: 'hidden' }}>
      {/* Search and chat list sidebar */}
      <div style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.15)' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 700 }}>Canal de Soporte</span>
            <button onClick={() => setShowAddChatModal(true)} style={{ background: '#10B981', border: 'none', color: '#fff', borderRadius: '4px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>+</button>
          </div>
          <input
            type="text"
            placeholder="Buscar conversación..."
            value={chatSearch}
            onChange={e => setChatSearch(e.target.value)}
            style={{
              background: '#1b1d2e',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#fff',
              fontSize: '12px',
              outline: 'none'
            }}
          />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {filteredChats.map((c: any) => {
            const active = c.id === selectedChatId
            return (
              <div
                key={c.id}
                onClick={() => onSelectChat(c.id)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 200ms'
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: c.role === 'lineadmin' ? '#ef4444' : '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '12px' }}>
                  {c.avatar}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); onToggleStar(c.id) }} style={{ background: 'none', border: 'none', color: c.starred ? '#eab308' : '#8f94a5', cursor: 'pointer' }}>
                      <Star size={11} fill={c.starred ? '#eab308' : 'none'} />
                    </button>
                  </div>
                  <div style={{ fontSize: '11px', color: '#8f94a5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{c.lastMsg}</div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); onDeleteChat(c.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', opacity: 0.6 }} onMouseEnter={e => e.currentTarget.style.opacity = '1'} onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}>
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main chat window */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentChat ? (
          <>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '14px', fontWeight: 700 }}>{currentChat.name}</span>
                <span style={{ fontSize: '10px', background: currentChat.role === 'lineadmin' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', color: currentChat.role === 'lineadmin' ? '#ef4444' : '#10B981', padding: '2px 6px', borderRadius: '4px', marginLeft: '8px', fontWeight: 600 }}>{currentChat.role === 'lineadmin' ? 'ADMIN LÍNEA' : 'PASAJERO'}</span>
              </div>
            </div>
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentChat.history.map((msg: any) => {
                const isAdmin = msg.sender === 'admin'
                return (
                  <div key={msg.id} style={{ alignSelf: isAdmin ? 'flex-end' : 'flex-start', maxWidth: '70%', background: isAdmin ? '#10B981' : 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '10px 14px' }}>
                    <div style={{ fontSize: '12px', color: '#fff', lineHeight: 1.4 }}>{msg.text}</div>
                    <span style={{ display: 'block', fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textAlign: 'right' }}>{msg.timestamp}</span>
                  </div>
                )
              })}
            </div>
            <form onSubmit={e => { e.preventDefault(); if (!chatInput.trim()) return; onSend(chatInput); setChatInput('') }} style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="Escriba un mensaje de soporte..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                style={{ flex: 1, background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none' }}
              />
              <button type="submit" style={{ padding: '0 20px', background: '#10B981', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Enviar</button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8f94a5' }}>Seleccione una conversación para iniciar el soporte técnico.</div>
        )}
      </div>

      {/* Add support chat modal */}
      {showAddChatModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '24px', width: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Nueva Conversación</h3>
            <div>
              <label style={{ fontSize: '11px', color: '#8f94a5', display: 'block', marginBottom: '6px' }}>Nombre del Contacto</label>
              <input type="text" value={newChatName} onChange={e => setNewChatName(e.target.value)} style={{ width: '100%', background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', color: '#fff', outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: '#8f94a5', display: 'block', marginBottom: '6px' }}>Rol</label>
              <select value={newChatRole} onChange={e => setNewChatRole(e.target.value as any)} style={{ width: '100%', background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px 12px', color: '#fff', outline: 'none' }}>
                <option value="user">Pasajero / Usuario</option>
                <option value="lineadmin">Administrador de Línea</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button onClick={() => setShowAddChatModal(false)} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '6px', color: '#8f94a5', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => { if (!newChatName.trim()) return; onAddChat(newChatName.trim(), newChatRole); setNewChatName(''); setShowAddChatModal(false) }} style={{ padding: '8px 14px', background: '#10B981', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Reports complaints view component ───────────────────────────────────────
function ReportsTab() {
  const [complaints, setComplaints] = useState<any[]>([])

  useEffect(() => {
    const list = Object.entries(LINE_DETAILS).flatMap(([lineId, details]) => {
      const lineInfo = LINES_DATA.find(l => l.id === lineId) || { name: `Línea` }
      return details.complaintsList.map(c => ({
        ...c,
        line: lineInfo.name
      }))
    })
    setComplaints(list)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Registro de Denuncias contra Choferes</h3>
        <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Reportes recibidos en tiempo real a través de las aplicaciones móviles de pasajeros</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {complaints.map((c, i) => (
          <div key={i} style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', padding: '2px 8px', borderRadius: '6px' }}>{c.type}</span>
                <span style={{ fontSize: '11px', color: '#8f94a5' }}>Chofer: <strong style={{ color: '#fff' }}>{c.driver}</strong> (Unidad {c.bus})</span>
              </div>
              <span style={{ fontSize: '11px', color: '#8f94a5', fontFamily: 'DM Mono' }}>{c.time}</span>
            </div>
            <p style={{ fontSize: '12px', color: '#a3a6b8', margin: 0, lineHeight: 1.4 }}>{c.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '4px' }}>
              <span style={{ fontSize: '11px', color: '#8f94a5' }}>Línea asociada: <strong style={{ color: '#fff' }}>{c.line}</strong></span>
              <span style={{ fontSize: '10px', background: c.status === 'resolved' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: c.status === 'resolved' ? '#10B981' : '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{c.status.toUpperCase()}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Provinces map and Demography component ──────────────────────────────────
function ProvinceMapTab({ selectedProvinceKey, onSelectProvince }: { selectedProvinceKey: string | null; onSelectProvince: (val: string | null) => void }) {
  const currentProvinceData = selectedProvinceKey ? PROVINCES_DATA[selectedProvinceKey] : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Mapa Demográfico de Argentina</h3>
        <p style={{ fontSize: '12px', color: '#8f94a5', margin: '4px 0 0' }}>Estadísticas de distribución y algoritmos de rastreo de hábitos y origen de vecindarios</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '24px' }}>
        {/* Left: Argentina Province selection grid / SVG simulator */}
        <div style={{ gridColumn: 'span 7', background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Seleccione una Provincia</h4>
          
          {/* Interactive Argentina Provincias */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {Object.entries(PROVINCES_DATA).map(([key, data]) => {
              const active = selectedProvinceKey === key
              return (
                <button
                  key={key}
                  onClick={() => onSelectProvince(key)}
                  style={{
                    background: active ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1.5px solid ${active ? '#10B981' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                    color: '#fff'
                  }}
                >
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{data.name}</div>
                  <div style={{ fontSize: '12px', color: '#8f94a5', marginTop: '4px' }}>{data.users.toLocaleString()} usuarios activos</div>
                </button>
              )
            })}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', padding: '14px', borderRadius: '8px', fontSize: '11px', color: '#8f94a5', lineHeight: 1.4 }}>
            💡 El sistema analiza en segundo plano las paradas de inicio y fin de viaje frecuentes de los pasajeros para identificar su vecindario principal sin comprometer su privacidad.
          </div>
        </div>

        {/* Right: Selected Province details and Neighborhood distribution */}
        <div style={{ gridColumn: 'span 5', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {currentProvinceData ? (
            <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#10B981' }}>{currentProvinceData.name}</h4>
                <span style={{ fontSize: '12px', color: '#8f94a5' }}>Desglose por Barrio / Comuna</span>
              </div>

              {/* Neighborhood list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {currentProvinceData.neighborhoods.map((n, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{n.name}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', fontFamily: 'DM Mono' }}>{n.count} usuarios</span>
                  </div>
                ))}
              </div>

              {/* Habits tracking log */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', color: '#8f94a5', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Hábitos de Movilidad Detectados</span>
                {currentProvinceData.habits.map((habit, i) => (
                  <div key={i} style={{ fontSize: '12px', color: '#a3a6b8', background: 'rgba(0,0,0,0.15)', padding: '10px 14px', borderRadius: '8px', lineHeight: 1.4 }}>
                    {habit}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#121527', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '40px 24px', textAlign: 'center', color: '#8f94a5' }}>
              Seleccione una provincia de la lista para ver el reporte de distribución de usuarios y vecindarios.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}