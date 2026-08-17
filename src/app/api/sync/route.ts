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
    { id: 'sa-1', name: 'Super Admin', email: 'admin@admin.com', password: 'Admin', role: 'Super Admin Principal', status: 'Activo' },
    { id: 'sa-2', name: 'Nestor Admin', email: 'nestoradmin@nestoradmin.com', password: 'NestorAdmin123!', role: 'Super Admin Completo', status: 'Activo' }
  ],
  registered_line_admins: [],
  bu_created_lines: [],
  active_line_admin_sessions: {},
  mock_active_sessions: [],
  bu_submitted_ads: [
    {
      id: 'ad-alex-1',
      title: 'Anuncio Publicitario Alex - 20% OFF',
      description: 'Descuento exclusivo para pasajeros de BienParada presentando la app en el local.',
      locationName: 'Obelisco, Av. Corrientes y 9 de Julio',
      lat: -34.6037,
      lng: -58.3816,
      status: 'approved',
      isActive: true,
      isPaused: false,
      budget: 50,
      placement: 'standard',
      selectedAdTypes: ['standard'],
      userName: 'Alex',
      userEmail: 'alex@gmail.com',
      created_at: '2026-08-16T22:00:00.000Z',
      timestamp: '16/08/2026',
      startDate: '16/8/2026',
      endDate: '15/9/2026',
      activeHours: 'Las 24 hs activo',
      stop: 'Obelisco / Av. Corrientes',
      route: 'Línea 28',
      targetAudience: 'Línea 28'
    }
  ],
  bu_ad_reports: [],
  deleted_users: [],
  blocked_users: [],
  banned_users: [],
  deleted_super_admins: [],
  deleted_line_admins: [],
  deleted_drivers: [],
  deleted_ad_ids: []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const key = searchParams.get('key')

  if (!key || key === 'all') {
    return NextResponse.json({
      success: true,
      data: globalMemoryStore,
      timestamp: Date.now()
    })
  }

  const data = globalMemoryStore[key] ?? null
  return NextResponse.json({
    success: true,
    key,
    data,
    timestamp: Date.now()
  })
}

export async function POST(request: NextRequest) {
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
