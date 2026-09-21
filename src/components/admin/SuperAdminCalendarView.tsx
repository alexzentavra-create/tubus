'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Video,
  Clock, Tag, AlertCircle, Users, CheckCircle2, Trash2, Edit3,
  Filter, Search, MapPin, AlignLeft, Sparkles, Bell, X, ShieldAlert,
  List, Grid
} from 'lucide-react'
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, isToday } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { pushGlobalKey, syncAllGlobalKeys } from '@/lib/sync'

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  category: string
  color: string
  startDate: string // YYYY-MM-DD
  endDate?: string // YYYY-MM-DD
  startTime?: string // HH:mm
  endTime?: string // HH:mm
  isAllDay: boolean
  importance: 'baja' | 'media' | 'alta' | 'urgente'
  taggedAdmins: string[]
  isVirtualMeeting: boolean
  createdBy: string
  createdAt: string
}

const DEFAULT_CATEGORIES = [
  { name: 'Reunión', defaultColor: '#3B82F6' },
  { name: 'Tarea', defaultColor: '#10B981' },
  { name: 'Evento', defaultColor: '#8B5CF6' },
  { name: 'Inspección de Línea', defaultColor: '#F59E0B' },
  { name: 'Auditoría General', defaultColor: '#EC4899' },
  { name: 'Mantenimiento Técnico', defaultColor: '#06B6D4' }
]

const COLOR_PRESETS = [
  '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444',
  '#06B6D4', '#EC4899', '#6366F1', '#14B8A6', '#F97316'
]

interface SuperAdminCalendarViewProps {
  currentAdminName: string
  onStartVirtualMeeting: (targetAdmin?: string, meetingTitle?: string) => void
}

export default function SuperAdminCalendarView({
  currentAdminName,
  onStartVirtualMeeting
}: SuperAdminCalendarViewProps) {
  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewMode, setViewMode] = useState<'month' | 'agenda'>('month')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [adminList, setAdminList] = useState<string[]>([])

  // Filter State
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [importanceFilter, setImportanceFilter] = useState<string>('all')
  const [adminFilter, setAdminFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEventForDetail, setSelectedEventForDetail] = useState<CalendarEvent | null>(null)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)

  // Form State
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formCategory, setFormCategory] = useState('Reunión')
  const [formColor, setFormColor] = useState('#3B82F6')
  const [formStartDate, setFormStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formEndDate, setFormEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [formStartTime, setFormStartTime] = useState('10:00')
  const [formEndTime, setFormEndTime] = useState('11:00')
  const [formIsAllDay, setFormIsAllDay] = useState(false)
  const [formImportance, setFormImportance] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media')
  const [formTaggedAdmins, setFormTaggedAdmins] = useState<string[]>([])
  const [formIsVirtualMeeting, setFormIsVirtualMeeting] = useState(false)

  // New Category Input
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  // Load Super Admins & Events
  const loadData = () => {
    try {
      // 1. Load Admins
      const storedAdmins = localStorage.getItem('bu_super_admins')
      let adminNames = ['Alejandro', 'Nestor']
      if (storedAdmins) {
        const parsed = JSON.parse(storedAdmins)
        parsed.forEach((a: any) => {
          const n = a.name || a.email
          if (!adminNames.includes(n)) adminNames.push(n)
        })
      }
      setAdminList(adminNames)

      // 2. Load Categories
      const storedCats = localStorage.getItem('bu_super_admin_calendar_categories')
      if (storedCats) {
        setCategories(JSON.parse(storedCats))
      } else {
        const defaultCatNames = DEFAULT_CATEGORIES.map(c => c.name)
        setCategories(defaultCatNames)
        localStorage.setItem('bu_super_admin_calendar_categories', JSON.stringify(defaultCatNames))
      }

      // 3. Load Events
      const storedEvents = localStorage.getItem('bu_super_admin_calendar_events')
      if (storedEvents) {
        setEvents(JSON.parse(storedEvents))
      } else {
        // Initial baseline events
        const todayStr = format(new Date(), 'yyyy-MM-dd')
        const initial: CalendarEvent[] = [
          {
            id: 'ev-1',
            title: 'Reunión de Coordinación de Líneas de Colectivo',
            description: 'Revisión de flota de Línea 12 y nuevas líneas creadas en el panel con todo el equipo de Super Administradores.',
            category: 'Reunión',
            color: '#3B82F6',
            startDate: todayStr,
            endDate: todayStr,
            startTime: '10:30',
            endTime: '11:30',
            isAllDay: false,
            importance: 'alta',
            taggedAdmins: ['Nestor', 'Alejandro'],
            isVirtualMeeting: true,
            createdBy: 'Alejandro',
            createdAt: new Date().toISOString()
          },
          {
            id: 'ev-2',
            title: 'Inspección de GPS y Frecuencias Línea 12',
            description: 'Verificación del funcionamiento del reporte de choferes y tracking en vivo.',
            category: 'Inspección de Línea',
            color: '#F59E0B',
            startDate: todayStr,
            endDate: todayStr,
            startTime: '14:00',
            endTime: '16:00',
            isAllDay: false,
            importance: 'media',
            taggedAdmins: ['Nestor'],
            isVirtualMeeting: false,
            createdBy: 'Super Admin',
            createdAt: new Date().toISOString()
          }
        ]
        setEvents(initial)
        localStorage.setItem('bu_super_admin_calendar_events', JSON.stringify(initial))
      }
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    loadData()
    // Perform initial cloud sync
    syncAllGlobalKeys(true).then(() => loadData()).catch(() => {})

    // Periodic synchronization every 4s so events added by other Super Admins show live
    const pollInterval = setInterval(() => {
      syncAllGlobalKeys().then(() => loadData()).catch(() => {})
    }, 4000)

    const handleUpdate = () => loadData()
    window.addEventListener('storage', handleUpdate)
    window.addEventListener('global_sync_completed', handleUpdate)
    window.addEventListener('super_admin_calendar_updated', handleUpdate)
    return () => {
      clearInterval(pollInterval)
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('global_sync_completed', handleUpdate)
      window.removeEventListener('super_admin_calendar_updated', handleUpdate)
    }
  }, [])

  // Month Days calculation
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(monthStart)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return events.filter(ev => {
      if (categoryFilter !== 'all' && ev.category !== categoryFilter) return false
      if (importanceFilter !== 'all' && ev.importance !== importanceFilter) return false
      if (adminFilter !== 'all' && !ev.taggedAdmins.includes(adminFilter)) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const titleMatch = ev.title.toLowerCase().includes(q)
        const descMatch = (ev.description || '').toLowerCase().includes(q)
        if (!titleMatch && !descMatch) return false
      }
      return true
    })
  }, [events, categoryFilter, importanceFilter, adminFilter, searchQuery])

  // Get Events for a specific day
  const getEventsForDay = (day: Date) => {
    const dayStr = format(day, 'yyyy-MM-dd')
    return filteredEvents.filter(ev => ev.startDate === dayStr)
  }

  // Open Create Modal
  const handleOpenCreateModal = (presetDate?: Date) => {
    const dateStr = format(presetDate || selectedDate || new Date(), 'yyyy-MM-dd')
    setEditingEventId(null)
    setFormTitle('')
    setFormDescription('')
    setFormCategory(categories[0] || 'Reunión')
    setFormColor('#3B82F6')
    setFormStartDate(dateStr)
    setFormEndDate(dateStr)
    setFormStartTime('10:00')
    setFormEndTime('11:00')
    setFormIsAllDay(false)
    setFormImportance('media')
    setFormTaggedAdmins([])
    setFormIsVirtualMeeting(false)
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEditModal = (ev: CalendarEvent) => {
    setEditingEventId(ev.id)
    setFormTitle(ev.title)
    setFormDescription(ev.description || '')
    setFormCategory(ev.category)
    setFormColor(ev.color)
    setFormStartDate(ev.startDate)
    setFormEndDate(ev.endDate || ev.startDate)
    setFormStartTime(ev.startTime || '10:00')
    setFormEndTime(ev.endTime || '11:00')
    setFormIsAllDay(ev.isAllDay)
    setFormImportance(ev.importance)
    setFormTaggedAdmins(ev.taggedAdmins || [])
    setFormIsVirtualMeeting(ev.isVirtualMeeting)
    setSelectedEventForDetail(null)
    setIsModalOpen(true)
  }

  // Save Event (Create or Update)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      toast.error('El nombre del evento es obligatorio')
      return
    }

    const eventPayload: CalendarEvent = {
      id: editingEventId || `cal-${Date.now()}`,
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      color: formColor,
      startDate: formStartDate,
      endDate: formEndDate,
      startTime: formIsAllDay ? undefined : formStartTime,
      endTime: formIsAllDay ? undefined : formEndTime,
      isAllDay: formIsAllDay,
      importance: formImportance,
      taggedAdmins: formTaggedAdmins,
      isVirtualMeeting: formIsVirtualMeeting,
      createdBy: currentAdminName || 'Super Admin',
      createdAt: new Date().toISOString()
    }

    let updatedList: CalendarEvent[] = []
    if (editingEventId) {
      updatedList = events.map(ev => (ev.id === editingEventId ? eventPayload : ev))
      toast.success('Evento actualizado exitosamente')
    } else {
      updatedList = [eventPayload, ...events]
      toast.success('Nuevo evento añadido al calendario')
    }

    setEvents(updatedList)
    localStorage.setItem('bu_super_admin_calendar_events', JSON.stringify(updatedList))
    await pushGlobalKey('bu_super_admin_calendar_events', updatedList)

    // Notify tagged admins
    if (formTaggedAdmins.length > 0) {
      try {
        const storedNotifs = localStorage.getItem('bu_super_admin_notifications')
        const currentNotifs = storedNotifs ? JSON.parse(storedNotifs) : []
        formTaggedAdmins.forEach(adminName => {
          if (adminName !== currentAdminName) {
            currentNotifs.unshift({
              id: `notif-${Date.now()}-${Math.random()}`,
              recipient: adminName,
              sender: currentAdminName,
              title: `📅 Te etiquetaron en: "${formTitle.trim()}"`,
              detail: `Fecha: ${formStartDate} ${formIsAllDay ? '(Todo el día)' : `a las ${formStartTime} hs`}`,
              time: 'Hace un instante',
              read: false,
              isVirtual: formIsVirtualMeeting
            })
          }
        })
        localStorage.setItem('bu_super_admin_notifications', JSON.stringify(currentNotifs))
        await pushGlobalKey('bu_super_admin_notifications', currentNotifs)
        window.dispatchEvent(new Event('super_admin_notifications_updated'))
      } catch (err) {}
    }

    window.dispatchEvent(new Event('super_admin_calendar_updated'))
    setIsModalOpen(false)
  }

  // Delete Event
  const handleDeleteEvent = async (id: string) => {
    const updated = events.filter(e => e.id !== id)
    setEvents(updated)
    localStorage.setItem('bu_super_admin_calendar_events', JSON.stringify(updated))
    await pushGlobalKey('bu_super_admin_calendar_events', updated)
    window.dispatchEvent(new Event('super_admin_calendar_updated'))
    setSelectedEventForDetail(null)
    toast.success('Evento eliminado del calendario')
  }

  // Add Custom Category
  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return
    const trimmed = newCategoryName.trim()
    if (!categories.includes(trimmed)) {
      const updated = [...categories, trimmed]
      setCategories(updated)
      localStorage.setItem('bu_super_admin_calendar_categories', JSON.stringify(updated))
      setFormCategory(trimmed)
      toast.success(`Categoría "${trimmed}" agregada`)
    }
    setNewCategoryName('')
    setShowNewCategoryInput(false)
  }

  // Importance Badge helper
  const renderImportanceBadge = (importance: string) => {
    switch (importance) {
      case 'urgente':
        return <span style={{ background: '#EF4444', color: '#FFF', fontSize: '10px', fontWeight: 800, padding: '2px 6px', borderRadius: '6px' }}>🚨 URGENTE</span>
      case 'alta':
        return <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', border: '1px solid #EF4444', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px' }}>Alta</span>
      case 'media':
        return <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', border: '1px solid #F59E0B', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px' }}>Media</span>
      default:
        return <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', border: '1px solid #3B82F6', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '6px' }}>Baja</span>
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1380px', margin: '0 auto' }}>
      {/* Top Banner & Quick Controls */}
      <div style={{
        background: '#121527', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px',
        padding: '20px 24px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #10B981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
          }}>
            <CalendarIcon size={24} color="#FFFFFF" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
              🗓️ Calendario Colaborativo de Super Administradores
              <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.2)', color: '#10B981', border: '1px solid #10B981', borderRadius: '10px', padding: '2px 8px', fontWeight: 700 }}>
                Sincronizado en Tiempo Real
              </span>
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8F94A5' }}>
              Organizá reuniones virtuales, tareas, auditorías de líneas y coordiná con todo el equipo de Super Admins.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: '#1b1d2e', borderRadius: '8px', padding: '3px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setViewMode('month')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: viewMode === 'month' ? '#10B981' : 'transparent',
                color: viewMode === 'month' ? '#FFF' : '#8F94A5',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <Grid size={13} /> Mes
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: 'none',
                background: viewMode === 'agenda' ? '#10B981' : 'transparent',
                color: viewMode === 'agenda' ? '#FFF' : '#8F94A5',
                fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
              }}
            >
              <List size={13} /> Agenda ({filteredEvents.length})
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateModal()}
            style={{
              padding: '10px 18px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)',
              border: 'none', color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
            }}
          >
            <Plus size={16} /> Agregar Evento / Tarea
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div style={{
        background: '#121527', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px',
        padding: '12px 18px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8F94A5', fontSize: '12px', fontWeight: 700 }}>
            <Filter size={14} /> Filtros:
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            style={{
              background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              color: '#FFF', fontSize: '11px', fontWeight: 600, padding: '5px 10px', outline: 'none'
            }}
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Importance Filter */}
          <select
            value={importanceFilter}
            onChange={e => setImportanceFilter(e.target.value)}
            style={{
              background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              color: '#FFF', fontSize: '11px', fontWeight: 600, padding: '5px 10px', outline: 'none'
            }}
          >
            <option value="all">Toda Importancia</option>
            <option value="urgente">🚨 Solo Urgentes</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>

          {/* Tagged Admin Filter */}
          <select
            value={adminFilter}
            onChange={e => setAdminFilter(e.target.value)}
            style={{
              background: '#1b1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
              color: '#FFF', fontSize: '11px', fontWeight: 600, padding: '5px 10px', outline: 'none'
            }}
          >
            <option value="all">Todos los Super Admins</option>
            {adminList.map(name => (
              <option key={name} value={name}>Etiquetado: {name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1b1d2e', borderRadius: '8px', padding: '5px 10px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={13} color="#8F94A5" />
          <input
            type="text"
            placeholder="Buscar eventos o notas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#FFF', fontSize: '11px', outline: 'none', width: '170px' }}
          />
        </div>
      </div>

      {/* VIEW: MONTH VIEW */}
      {viewMode === 'month' && (
        <div style={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Month Navigation Header */}
          <div style={{
            padding: '16px 20px', background: '#181b2e', borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#FFFFFF', textTransform: 'capitalize' }}>
                {format(currentMonth, 'MMMM yyyy', { locale: es })}
              </h3>
              <button
                onClick={() => setCurrentMonth(new Date())}
                style={{
                  padding: '4px 10px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)', color: '#8F94A5', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Hoy
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                style={{
                  width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)',
                  border: 'none', color: '#FFF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Days of Week Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#0e1122', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
            {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map(dayName => (
              <div key={dayName} style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#8F94A5' }}>
                {dayName}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px', background: 'rgba(255, 255, 255, 0.04)' }}>
            {calendarDays.map((day, idx) => {
              const dayEvents = getEventsForDay(day)
              const isCurrentMonth = isSameMonth(day, currentMonth)
              const isCurrentDay = isToday(day)

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(day)
                    handleOpenCreateModal(day)
                  }}
                  style={{
                    minHeight: '120px',
                    padding: '8px',
                    background: isCurrentDay ? 'rgba(16, 185, 129, 0.06)' : isCurrentMonth ? '#121527' : '#0a0d1a',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'all 150ms'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isCurrentDay ? 'rgba(16, 185, 129, 0.12)' : '#181c33')}
                  onMouseLeave={e => (e.currentTarget.style.background = isCurrentDay ? 'rgba(16, 185, 129, 0.06)' : isCurrentMonth ? '#121527' : '#0a0d1a')}
                >
                  {/* Day Number Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{
                      fontSize: '12px', fontWeight: isCurrentDay ? 900 : 700,
                      color: isCurrentDay ? '#10B981' : isCurrentMonth ? '#FFFFFF' : '#475569',
                      width: isCurrentDay ? '24px' : 'auto', height: isCurrentDay ? '24px' : 'auto',
                      borderRadius: isCurrentDay ? '50%' : '0', background: isCurrentDay ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span style={{ fontSize: '10px', color: '#8F94A5', fontWeight: 600 }}>
                        {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
                      </span>
                    )}
                  </div>

                  {/* Day Events Pills */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'hidden' }}>
                    {dayEvents.slice(0, 3).map(ev => (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEventForDetail(ev)
                        }}
                        style={{
                          background: `${ev.color}22`,
                          borderLeft: `3px solid ${ev.color}`,
                          padding: '4px 6px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          color: '#FFFFFF',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title={ev.title}
                      >
                        {ev.isVirtualMeeting && <Video size={10} style={{ color: '#10B981', flexShrink: 0 }} />}
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title}</span>
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <div style={{ fontSize: '10px', color: '#10B981', fontWeight: 700, paddingLeft: '4px' }}>
                        +{dayEvents.length - 3} más...
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VIEW: AGENDA VIEW */}
      {viewMode === 'agenda' && (
        <div style={{ background: '#121527', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 800, color: '#FFF' }}>
            Próximos Eventos y Tareas ({filteredEvents.length})
          </h3>

          {filteredEvents.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <CalendarIcon size={36} style={{ opacity: 0.4, marginBottom: '8px' }} />
              <div>No hay eventos ni tareas que coincidan con los filtros actuales.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredEvents.map(ev => (
                <div
                  key={ev.id}
                  style={{
                    background: '#181b2e', border: `1px solid ${ev.color}44`, borderLeft: `5px solid ${ev.color}`,
                    borderRadius: '12px', padding: '16px 20px', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '14px'
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: ev.color, background: `${ev.color}22`, padding: '2px 8px', borderRadius: '6px' }}>
                        {ev.category}
                      </span>
                      {renderImportanceBadge(ev.importance)}
                      {ev.isVirtualMeeting && (
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#10B981', background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Video size={11} /> Reunión Virtual
                        </span>
                      )}
                    </div>

                    <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 800, color: '#FFF' }}>{ev.title}</h4>
                    {ev.description && (
                      <p style={{ margin: '0 0 10px', fontSize: '13px', color: '#CBD5E1', lineHeight: 1.4 }}>{ev.description}</p>
                    )}

                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '14px', fontSize: '11px', color: '#8F94A5' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={12} /> {ev.startDate} {ev.isAllDay ? '• Todo el día' : `• ${ev.startTime || ''} - ${ev.endTime || ''} hs`}
                      </span>
                      {ev.taggedAdmins.length > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#60A5FA' }}>
                          <Users size={12} /> Etiquetados: {ev.taggedAdmins.join(', ')}
                        </span>
                      )}
                      <span>Creado por: {ev.createdBy}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {ev.isVirtualMeeting && (
                      <button
                        onClick={() => {
                          const target = ev.taggedAdmins.find(a => a !== currentAdminName) || ev.taggedAdmins[0]
                          onStartVirtualMeeting(target, ev.title)
                        }}
                        style={{
                          padding: '10px 16px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)',
                          border: 'none', color: '#FFF', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <Video size={14} /> Iniciar Reunión Virtual
                      </button>
                    )}
                    <button
                      onClick={() => handleOpenEditModal(ev)}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.12)', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Edit3 size={13} /> Editar
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(ev.id)}
                      style={{
                        padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)',
                        border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '4px'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAIL MODAL (Clicking event card from Month view) */}
      {selectedEventForDetail && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#121527', border: `2px solid ${selectedEventForDetail.color}`, borderRadius: '16px',
            width: '100%', maxWidth: '540px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.7)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: selectedEventForDetail.color, background: `${selectedEventForDetail.color}22`, padding: '3px 8px', borderRadius: '6px' }}>
                  {selectedEventForDetail.category}
                </span>
                {renderImportanceBadge(selectedEventForDetail.importance)}
              </div>
              <button
                onClick={() => setSelectedEventForDetail(null)}
                style={{ background: 'none', border: 'none', color: '#8F94A5', fontSize: '18px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFF' }}>
              {selectedEventForDetail.title}
            </h3>

            {selectedEventForDetail.description && (
              <p style={{ margin: 0, fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5 }}>
                {selectedEventForDetail.description}
              </p>
            )}

            <div style={{ background: '#181b2e', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#8F94A5' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#FFF' }}>
                <Clock size={14} color="#10B981" />
                <span>Fecha: <strong>{selectedEventForDetail.startDate}</strong></span>
                <span>• Horario: <strong>{selectedEventForDetail.isAllDay ? 'Todo el día' : `${selectedEventForDetail.startTime} a ${selectedEventForDetail.endTime} hs`}</strong></span>
              </div>
              {selectedEventForDetail.taggedAdmins.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#60A5FA' }}>
                  <Users size={14} />
                  <span>Super Admins etiquetados: <strong>{selectedEventForDetail.taggedAdmins.join(', ')}</strong></span>
                </div>
              )}
            </div>

            {/* Virtual meeting launch button */}
            {selectedEventForDetail.isVirtualMeeting && (
              <button
                onClick={() => {
                  const target = selectedEventForDetail.taggedAdmins.find(a => a !== currentAdminName) || selectedEventForDetail.taggedAdmins[0]
                  setSelectedEventForDetail(null)
                  onStartVirtualMeeting(target, selectedEventForDetail.title)
                }}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #10B981, #059669)',
                  border: 'none', color: '#FFF', fontWeight: 800, fontSize: '13px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Video size={16} /> 🚀 Iniciar Reunión Virtual Ahora
              </button>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button
                onClick={() => handleDeleteEvent(selectedEventForDetail.id)}
                style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #EF4444', color: '#EF4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Eliminar
              </button>
              <button
                onClick={() => handleOpenEditModal(selectedEventForDetail)}
                style={{ padding: '8px 16px', borderRadius: '8px', background: '#3B82F6', border: 'none', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                Editar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT EVENT MODAL */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
          <div style={{
            background: '#121527', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '16px',
            width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '24px',
            display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#FFF' }}>
                {editingEventId ? '✏️ Editar Evento del Calendario' : '➕ Nuevo Evento / Tarea para Super Admins'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#8F94A5', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Name / Title */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '6px' }}>
                  Nombre / Título del Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Reunión Operativa de Choferes y Admins de Línea"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', background: '#181b2e', border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px', color: '#FFF', fontSize: '13px', outline: 'none'
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '6px' }}>
                  Descripción / Orden del Día / Notas
                </label>
                <textarea
                  rows={3}
                  placeholder="Detalles sobre los temas a tratar o la tarea a realizar..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', background: '#181b2e', border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px', color: '#FFF', fontSize: '12px', outline: 'none', resize: 'vertical'
                  }}
                />
              </div>

              {/* Category & New Type Button */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFF' }}>Categoría / Tipo</label>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryInput(!showNewCategoryInput)}
                      style={{ background: 'none', border: 'none', color: '#10B981', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Nuevo Tipo
                    </button>
                  </div>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#181b2e', border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px', color: '#FFF', fontSize: '12px', outline: 'none'
                    }}
                  >
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>

                  {/* Add Category input popup */}
                  {showNewCategoryInput && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <input
                        type="text"
                        placeholder="Nombre de nueva categoría..."
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        style={{ flex: 1, padding: '6px 8px', background: '#0e1122', border: '1px solid #10B981', borderRadius: '6px', color: '#FFF', fontSize: '11px', outline: 'none' }}
                      />
                      <button
                        type="button"
                        onClick={handleAddNewCategory}
                        style={{ padding: '6px 10px', background: '#10B981', border: 'none', borderRadius: '6px', color: '#FFF', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Crear
                      </button>
                    </div>
                  )}
                </div>

                {/* Importance */}
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '6px' }}>
                    Nivel de Importancia
                  </label>
                  <select
                    value={formImportance}
                    onChange={e => setFormImportance(e.target.value as any)}
                    style={{
                      width: '100%', padding: '10px 12px', background: '#181b2e', border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px', color: '#FFF', fontSize: '12px', outline: 'none'
                    }}
                  >
                    <option value="baja">Baja (Normal)</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">🚨 URGENTE</option>
                  </select>
                </div>
              </div>

              {/* Color Selector */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '6px' }}>
                  Color del Evento
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {COLOR_PRESETS.map(c => (
                    <div
                      key={c}
                      onClick={() => setFormColor(c)}
                      style={{
                        width: '26px', height: '26px', borderRadius: '50%', background: c,
                        cursor: 'pointer', border: formColor === c ? '2.5px solid #FFFFFF' : '1px solid rgba(255,255,255,0.2)',
                        transform: formColor === c ? 'scale(1.15)' : 'scale(1)', transition: 'all 150ms'
                      }}
                    />
                  ))}
                  <input
                    type="color"
                    value={formColor}
                    onChange={e => setFormColor(e.target.value)}
                    style={{ width: '28px', height: '28px', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}
                    title="Color personalizado"
                  />
                </div>
              </div>

              {/* Dates & Times */}
              <div style={{ background: '#181b2e', padding: '12px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8F94A5', display: 'block', marginBottom: '4px' }}>Fecha Inicio</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={e => setFormStartDate(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#121527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFF', fontSize: '12px' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#8F94A5', display: 'block', marginBottom: '4px' }}>Fecha Fin</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={e => setFormEndDate(e.target.value)}
                      style={{ width: '100%', padding: '8px', background: '#121527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFF', fontSize: '12px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="allDayCheck"
                    checked={formIsAllDay}
                    onChange={e => setFormIsAllDay(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label htmlFor="allDayCheck" style={{ fontSize: '12px', color: '#FFF', cursor: 'pointer' }}>
                    Todo el día
                  </label>
                </div>

                {!formIsAllDay && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: '#8F94A5', display: 'block', marginBottom: '4px' }}>Hora Inicio</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={e => setFormStartTime(e.target.value)}
                        style={{ width: '100%', padding: '8px', background: '#121527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFF', fontSize: '12px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', color: '#8F94A5', display: 'block', marginBottom: '4px' }}>Hora Fin</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={e => setFormEndTime(e.target.value)}
                        style={{ width: '100%', padding: '8px', background: '#121527', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#FFF', fontSize: '12px' }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tag other Super Admins */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 700, color: '#FFF', display: 'block', marginBottom: '6px' }}>
                  Etiquetar a otro Super Administrador (recibirá notificación en su perfil)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {adminList.map(name => {
                    const isTagged = formTaggedAdmins.includes(name)
                    return (
                      <div
                        key={name}
                        onClick={() => {
                          if (isTagged) {
                            setFormTaggedAdmins(formTaggedAdmins.filter(n => n !== name))
                          } else {
                            setFormTaggedAdmins([...formTaggedAdmins, name])
                          }
                        }}
                        style={{
                          padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                          background: isTagged ? 'rgba(59, 130, 246, 0.25)' : '#181b2e',
                          border: `1px solid ${isTagged ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)'}`,
                          color: isTagged ? '#60A5FA' : '#8F94A5', fontSize: '12px', fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <Users size={12} />
                        <span>{name}</span>
                        {isTagged && <span>✓</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Virtual Meeting Checkbox */}
              <div style={{
                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                padding: '12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px'
              }}>
                <input
                  type="checkbox"
                  id="virtualMeetingCheck"
                  checked={formIsVirtualMeeting}
                  onChange={e => setFormIsVirtualMeeting(e.target.checked)}
                  style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#10B981' }}
                />
                <div>
                  <label htmlFor="virtualMeetingCheck" style={{ fontSize: '13px', fontWeight: 800, color: '#10B981', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Video size={14} /> Es una reunión virtual
                  </label>
                  <div style={{ fontSize: '11px', color: '#8F94A5', marginTop: '2px' }}>
                    Al activar esta opción, el evento mostrará un botón para iniciar automáticamente la videollamada con transcripción en vivo.
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 16px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.06)', border: 'none', color: '#8F94A5', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px', borderRadius: '8px', background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none', color: '#FFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {editingEventId ? 'Guardar Cambios' : 'Crear Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
