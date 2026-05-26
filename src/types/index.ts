// ─── Core Domain Types ───────────────────────────────────────────────────────

export type UserRole = 'user' | 'driver' | 'admin'

export interface Profile {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface User extends Profile {
  role: 'user'
  age: number
  weekly_trips: number // how many times they take the bus per week
  total_trips_tracked: number
  is_on_bus: boolean
  current_bus_id?: string
}

export interface Driver extends Profile {
  role: 'driver'
  driver_number: string    // internal ID (legajo)
  license_plate: string
  line_id: string
  bus_unit: string         // number painted on the bus
  is_active: boolean
  is_online: boolean
  rating: number
  total_reports: number
  verified: boolean
}

// ─── Bus Lines & Stops ────────────────────────────────────────────────────────

export interface BusLine {
  id: string
  line_number: string     // e.g. "60", "132", "710"
  name: string            // e.g. "Línea 60 - Constitución / Tigre"
  color: string           // hex color for map display
  company: string
  total_stops: number
  is_active: boolean
}

export interface BusStop {
  id: string
  line_id: string
  name: string
  street_name: string
  cross_street?: string
  stop_number: number     // sequence in the route
  latitude: number
  longitude: number
  direction: 'ida' | 'vuelta'
  avg_wait_minutes: number
  total_daily_users: number
}

// ─── Live Bus Position ────────────────────────────────────────────────────────

export interface BusPosition {
  id: string
  driver_id: string
  line_id: string
  line_number: string
  bus_unit: string
  driver_name: string
  latitude: number
  longitude: number
  heading: number         // degrees 0-360
  speed_kmh: number
  next_stop_id?: string
  next_stop_name?: string
  eta_minutes?: number
  status: 'moving' | 'stopped' | 'at_stop' | 'offline'
  passenger_count: number // users with app who are on this bus
  timestamp: string
  ramal?: string
  reports_count?: number
}

// ─── Reports & Complaints ─────────────────────────────────────────────────────

export type ReportType =
  | 'no_paro'           // didn't stop
  | 'conduccion_peligrosa'
  | 'mal_trato'
  | 'vehiculo_defectuoso'
  | 'no_llego'          // bus never arrived
  | 'otro'

export interface Report {
  id: string
  reporter_id: string
  reporter_name: string
  driver_id: string
  driver_name: string
  line_id: string
  line_number: string
  bus_unit: string
  stop_id?: string
  type: ReportType
  description: string
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
  created_at: string
  resolved_at?: string
  admin_notes?: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface HourlyMetric {
  hour: number            // 0-23
  passenger_count: number
  trip_count: number
  avg_occupancy: number
}

export interface StopMetric {
  stop_id: string
  stop_name: string
  street_name: string
  daily_boardings: number
  avg_wait_minutes: number
  peak_hour: number
}

export interface LineMetrics {
  line_id: string
  line_number: string
  date: string
  total_trips: number
  total_passengers: number
  app_users_count: number
  avg_occupancy_pct: number
  on_time_pct: number
  reports_count: number
  peak_hour: number
  hourly: HourlyMetric[]
  top_stops: StopMetric[]
}

export interface AdminDashboard {
  line_id: string
  today: LineMetrics
  week: LineMetrics[]
  month: LineMetrics[]
  active_buses: number
  online_drivers: number
  total_app_users: number
  pending_reports: number
  resolved_reports_today: number
}

// ─── Real-time Channel Types ──────────────────────────────────────────────────

export interface BusLocationUpdate {
  type: 'location_update'
  driver_id: string
  line_id: string
  lat: number
  lng: number
  heading: number
  speed: number
  status: BusPosition['status']
}

export interface PassengerBoardEvent {
  type: 'passenger_board' | 'passenger_exit'
  user_id: string
  bus_id: string
  stop_id: string
}

// ─── API Response Shapes ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  per_page: number
  total_pages: number
}