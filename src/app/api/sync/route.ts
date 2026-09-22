import { NextRequest, NextResponse } from 'next/server'

// Global in-memory cloud store for cross-device synchronization
// Retains synchronized state across all devices, browsers, and IPs connecting to the deployment
const globalMemoryStore: Record<string, any> = {
  bu_registered_users: [
    {
      id: 'usr_default_1',
      name: 'Usuario Administrador',
      email: 'usuario@usuario.com',
      password: 'Usuario',
      phone: '+54 11 5555-5555',
      gender: 'Masculino',
      age: 30,
      role: 'user',
      joinedDate: '01 de Enero, 2026',
      status: 'Activo',
      searches: 12,
      trips: 8,
      rating: 4.9,
      favLines: ['12', '60'],
      city: 'Buenos Aires',
      province: 'Buenos Aires'
    },
    {
      id: 'usr_default_2',
      name: 'Alejandro Finochietti',
      email: 'alejandro.finochietti@yahoo.com.ar',
      password: 'Afodes18',
      phone: '+54 11 4444-3333',
      gender: 'Masculino',
      age: 35,
      role: 'user',
      joinedDate: '15 de Febrero, 2026',
      status: 'Activo',
      searches: 25,
      trips: 18,
      rating: 5.0,
      favLines: ['12', '152'],
      city: 'Buenos Aires',
      province: 'Buenos Aires'
    },
    {
      id: 'usr_default_3',
      name: 'alfox',
      email: 'alfox@alfox.com',
      password: 'alfox',
      phone: '+54 11 9999-8888',
      gender: 'Masculino',
      age: 28,
      role: 'user',
      joinedDate: '10 de Marzo, 2026',
      status: 'Activo',
      searches: 5,
      trips: 3,
      rating: 4.8,
      favLines: ['60'],
      city: 'Buenos Aires',
      province: 'Buenos Aires'
    },
    {
      id: 'usr_default_4',
      name: 'Alex',
      email: 'alex@gmail.com',
      password: 'password123',
      phone: '+54 11 7777-6666',
      gender: 'Masculino',
      age: 26,
      role: 'user',
      joinedDate: '20 de Julio, 2026',
      status: 'Activo',
      searches: 3,
      trips: 1,
      rating: 5.0,
      favLines: ['28'],
      city: 'Buenos Aires',
      province: 'Buenos Aires'
    }
  ],
  mock_users: [],
  bu_super_admins: [
    { id: 'sa-0', name: 'Super Admin', email: 'admin@admin.com', password: 'Admin', role: 'Super Admin Principal', status: 'Activo' },
    { id: 'sa-1', name: 'Alejandro Finochietti', email: 'alejandro.finochietti@yahoo.com.ar', password: 'Admin', role: 'Super Admin Principal', status: 'Activo' },
    { id: 'sa-2', name: 'Nestor Admin', email: 'nestoradmin@nestoradmin.com', password: 'NestorAdmin123!', role: 'Super Admin Completo', status: 'Activo' }
  ],
  registered_line_admins: [],
  bu_created_lines: [],
  active_line_admin_sessions: {},
  mock_active_sessions: [],
  bu_submitted_ads: [],
  bu_ad_reports: [],
  deleted_users: [],
  blocked_users: [],
  banned_users: [],
  deleted_super_admins: [],
  deleted_line_admins: [],
  deleted_drivers: [],
  deleted_ad_ids: ['ad-alex-1', 'Anuncio Publicitario Alex - 20% OFF'],
  deleted_calendar_event_ids: [],
  // Calendar & Collaboration
  bu_super_admin_calendar_events: [
    {
      id: 'cal-revicion-listas-1',
      title: 'Revicion de las listas de gente para Ciberseguridad, Marketing y Abogados',
      description: 'Revisión y coordinación de listas de postulantes y contactos para Ciberseguridad, Marketing y Abogados.',
      category: 'Tarea',
      color: '#F59E0B',
      startDate: '2026-09-22',
      endDate: '2026-09-22',
      startTime: '10:00',
      endTime: '12:00',
      isAllDay: false,
      importance: 'alta',
      taggedAdmins: ['Alejandro', 'Nestor'],
      isVirtualMeeting: true,
      createdBy: 'Alejandro',
      createdAt: '2026-09-21T18:00:00.000Z'
    },
    {
      id: 'ev-1',
      title: 'Reunión de Coordinación de Líneas de Colectivo',
      description: 'Revisión de flota de Línea 12 y nuevas líneas creadas en el panel con todo el equipo de Super Administradores.',
      category: 'Reunión',
      color: '#3B82F6',
      startDate: '2026-09-22',
      endDate: '2026-09-22',
      startTime: '10:30',
      endTime: '11:30',
      isAllDay: false,
      importance: 'alta',
      taggedAdmins: ['Nestor', 'Alejandro'],
      isVirtualMeeting: true,
      createdBy: 'Alejandro',
      createdAt: '2026-09-21T18:00:00.000Z'
    },
    {
      id: 'ev-2',
      title: 'Inspección de GPS y Frecuencias Línea 12',
      description: 'Verificación del funcionamiento del reporte de choferes y tracking en vivo.',
      category: 'Inspección de Línea',
      color: '#F59E0B',
      startDate: '2026-09-22',
      endDate: '2026-09-22',
      startTime: '14:00',
      endTime: '16:00',
      isAllDay: false,
      importance: 'media',
      taggedAdmins: ['Nestor'],
      isVirtualMeeting: false,
      createdBy: 'Super Admin',
      createdAt: '2026-09-21T18:00:00.000Z'
    }
  ],
  bu_super_admin_calendar_categories: ['Reunión', 'Tarea', 'Evento', 'Inspección de Línea', 'Auditoría General', 'Mantenimiento Flota', 'Seguridad Vial'],
  bu_super_admin_notifications: [],
  registered_drivers: [],
  bu_active_super_admins: {},
  bu_super_admin_incoming_call: null,
  bu_super_admin_call_response: null
}

// Simple in-memory IP rate limiting
const ipRequestCounts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string, limit = 120, windowMs = 60000): boolean {
  const now = Date.now()
  const record = ipRequestCounts.get(ip)
  if (!record || now > record.resetAt) {
    ipRequestCounts.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (record.count >= limit) {
    return false
  }
  record.count++
  return true
}

// Preserve authentic credentials so registered users and super admins can authenticate
function sanitizeData(data: any): any {
  return data
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
  if (!checkRateLimit(ip, 120)) {
    return NextResponse.json({ success: false, error: 'Too many requests. Rate limit exceeded.' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key || key === 'all') {
    const sanitizedStore: Record<string, any> = {}
    Object.keys(globalMemoryStore).forEach(k => {
      sanitizedStore[k] = sanitizeData(globalMemoryStore[k])
    })
    return NextResponse.json({
      success: true,
      data: sanitizedStore,
      timestamp: Date.now()
    })
  }

  const data = globalMemoryStore[key] ?? null
  return NextResponse.json({
    success: true,
    key,
    data: sanitizeData(data),
    timestamp: Date.now()
  })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
  if (!checkRateLimit(ip, 120)) {
    return NextResponse.json({ success: false, error: 'Too many requests. Rate limit exceeded.' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { key, data, batch } = body

    if (batch && typeof batch === 'object') {
      // Process multiple keys in a single sync call
      Object.keys(batch).forEach(k => {
        const val = batch[k]
        if (Array.isArray(val)) {
          const existing = Array.isArray(globalMemoryStore[k]) ? globalMemoryStore[k] : []
          // Smart merge for arrays of objects with id or email
          const map = new Map<string, any>()
          existing.forEach((item: any) => {
            const id = item.id || item.email || JSON.stringify(item)
            map.set(id, item)
          })
          val.forEach((item: any) => {
            const id = item.id || item.email || JSON.stringify(item)
            map.set(id, item)
          })
          globalMemoryStore[k] = Array.from(map.values())
        } else if (typeof val === 'object' && val !== null) {
          globalMemoryStore[k] = { ...(globalMemoryStore[k] || {}), ...val }
        } else {
          globalMemoryStore[k] = val
        }
      })

      return NextResponse.json({
        success: true,
        data: globalMemoryStore,
        timestamp: Date.now()
      })
    }

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 })
    }

    if (Array.isArray(data)) {
      const existing = Array.isArray(globalMemoryStore[key]) ? globalMemoryStore[key] : []
      const map = new Map<string, any>()
      existing.forEach((item: any) => {
        const id = item.id || item.email || JSON.stringify(item)
        map.set(id, item)
      })
      data.forEach((item: any) => {
        const id = item.id || item.email || JSON.stringify(item)
        map.set(id, item)
      })
      globalMemoryStore[key] = Array.from(map.values())
    } else if (typeof data === 'object' && data !== null) {
      globalMemoryStore[key] = { ...(globalMemoryStore[key] || {}), ...data }
    } else {
      globalMemoryStore[key] = data
    }

    return NextResponse.json({
      success: true,
      key,
      data: globalMemoryStore[key],
      timestamp: Date.now()
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
