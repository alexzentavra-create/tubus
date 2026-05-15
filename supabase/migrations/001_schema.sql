-- ═══════════════════════════════════════════════════════════════════════════
-- Bien Parada — Supabase Schema
-- Run in: Supabase SQL Editor or via `supabase db push`
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";  -- for geo queries

-- ─── PROFILES ────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'driver', 'admin')) DEFAULT 'user',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── USERS (passenger data) ───────────────────────────────────────────────────
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  age           INT CHECK (age >= 5 AND age <= 120),
  weekly_trips  INT DEFAULT 0,
  total_trips_tracked INT DEFAULT 0,
  is_on_bus     BOOLEAN DEFAULT FALSE,
  current_bus_id TEXT
);

-- ─── DRIVERS ─────────────────────────────────────────────────────────────────
CREATE TABLE driver_profiles (
  id            UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  driver_number TEXT UNIQUE NOT NULL,  -- legajo
  license_plate TEXT,
  line_id       UUID,
  bus_unit      TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  is_online     BOOLEAN DEFAULT FALSE,
  rating        DECIMAL(3,2) DEFAULT 5.0,
  total_reports INT DEFAULT 0,
  verified      BOOLEAN DEFAULT FALSE
);

-- ─── BUS LINES ────────────────────────────────────────────────────────────────
CREATE TABLE bus_lines (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_number  TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#FF9800',
  company      TEXT,
  total_stops  INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BUS STOPS ────────────────────────────────────────────────────────────────
CREATE TABLE bus_stops (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_id          UUID REFERENCES bus_lines(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  street_name      TEXT NOT NULL,
  cross_street     TEXT,
  stop_number      INT NOT NULL,
  latitude         DECIMAL(10,8) NOT NULL,
  longitude        DECIMAL(11,8) NOT NULL,
  direction        TEXT CHECK (direction IN ('ida', 'vuelta')) DEFAULT 'ida',
  avg_wait_minutes INT DEFAULT 8,
  total_daily_users INT DEFAULT 0,
  geom             GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
                     ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                   ) STORED
);

CREATE INDEX idx_stops_line ON bus_stops(line_id);
CREATE INDEX idx_stops_geom ON bus_stops USING GIST(geom);

-- ─── LIVE BUS POSITIONS (ephemeral, high write) ───────────────────────────────
CREATE TABLE bus_positions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  line_id        UUID REFERENCES bus_lines(id),
  bus_unit       TEXT,
  latitude       DECIMAL(10,8) NOT NULL,
  longitude      DECIMAL(11,8) NOT NULL,
  heading        INT DEFAULT 0 CHECK (heading >= 0 AND heading <= 360),
  speed_kmh      INT DEFAULT 0,
  next_stop_id   UUID REFERENCES bus_stops(id),
  eta_minutes    INT,
  status         TEXT CHECK (status IN ('moving','stopped','at_stop','offline')) DEFAULT 'moving',
  passenger_count INT DEFAULT 0,
  timestamp      TIMESTAMPTZ DEFAULT NOW(),
  geom           GEOMETRY(Point, 4326) GENERATED ALWAYS AS (
                   ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                 ) STORED
);

-- Only keep last 24h of positions (older → trips_history)
CREATE INDEX idx_positions_driver ON bus_positions(driver_id);
CREATE INDEX idx_positions_line ON bus_positions(line_id);
CREATE INDEX idx_positions_ts ON bus_positions(timestamp DESC);

-- ─── TRIPS HISTORY (for analytics) ───────────────────────────────────────────
CREATE TABLE trips (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id      UUID REFERENCES profiles(id),
  line_id        UUID REFERENCES bus_lines(id),
  start_stop_id  UUID REFERENCES bus_stops(id),
  end_stop_id    UUID REFERENCES bus_stops(id),
  started_at     TIMESTAMPTZ NOT NULL,
  ended_at       TIMESTAMPTZ,
  total_passengers INT DEFAULT 0,
  app_user_count INT DEFAULT 0,
  distance_km    DECIMAL(8,2),
  on_time        BOOLEAN DEFAULT TRUE,
  date           DATE GENERATED ALWAYS AS (started_at::DATE) STORED
);

CREATE INDEX idx_trips_line ON trips(line_id);
CREATE INDEX idx_trips_date ON trips(date);
CREATE INDEX idx_trips_driver ON trips(driver_id);

-- ─── PASSENGER EVENTS ────────────────────────────────────────────────────────
CREATE TABLE passenger_events (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES profiles(id),
  driver_id  UUID REFERENCES profiles(id),
  line_id    UUID REFERENCES bus_lines(id),
  stop_id    UUID REFERENCES bus_stops(id),
  trip_id    UUID REFERENCES trips(id),
  event_type TEXT CHECK (event_type IN ('board','exit')),
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  date       DATE GENERATED ALWAYS AS (timestamp::DATE) STORED,
  hour       INT GENERATED ALWAYS AS (EXTRACT(HOUR FROM timestamp)::INT) STORED
);

CREATE INDEX idx_passenger_events_line ON passenger_events(line_id);
CREATE INDEX idx_passenger_events_date ON passenger_events(date);
CREATE INDEX idx_passenger_events_stop ON passenger_events(stop_id);

-- ─── REPORTS / DENUNCIAS ──────────────────────────────────────────────────────
CREATE TABLE reports (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id    UUID REFERENCES profiles(id),
  driver_id      UUID REFERENCES profiles(id),
  line_id        UUID REFERENCES bus_lines(id),
  stop_id        UUID REFERENCES bus_stops(id),
  bus_unit       TEXT,
  type           TEXT CHECK (type IN (
                   'no_paro','conduccion_peligrosa','mal_trato',
                   'vehiculo_defectuoso','no_llego','otro'
                 )),
  description    TEXT NOT NULL,
  status         TEXT CHECK (status IN ('pending','reviewing','resolved','dismissed'))
                   DEFAULT 'pending',
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ,
  admin_notes    TEXT
);

CREATE INDEX idx_reports_driver ON reports(driver_id);
CREATE INDEX idx_reports_line ON reports(line_id);
CREATE INDEX idx_reports_status ON reports(status);

-- ─── STOP WAIT METRICS (aggregated hourly) ────────────────────────────────────
CREATE TABLE stop_metrics (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stop_id         UUID REFERENCES bus_stops(id),
  line_id         UUID REFERENCES bus_lines(id),
  date            DATE NOT NULL,
  hour            INT CHECK (hour >= 0 AND hour <= 23),
  boardings       INT DEFAULT 0,
  wait_minutes    INT DEFAULT 0,
  UNIQUE(stop_id, date, hour)
);

-- ─── SEED: Buenos Aires bus lines (common ones) ───────────────────────────────
INSERT INTO bus_lines (line_number, name, color, company) VALUES
  ('60',  'Línea 60 - Constitución / Tigre',        '#F44336', 'Dota SA'),
  ('132', 'Línea 132 - Palermo / Escobar',           '#2196F3', 'TAMSE'),
  ('710', 'Línea 710 - Microcentro / Quilmes',       '#4CAF50', 'La Perlita'),
  ('21',  'Línea 21 - Retiro / Villa Urquiza',       '#FF9800', 'CITA'),
  ('86',  'Línea 86 - Plaza Mayo / Lomas de Zamora', '#9C27B0', 'La Nueva Metropol'),
  ('55',  'Línea 55 - Retiro / Palermo',             '#00BCD4', 'DOTA'),
  ('67',  'Línea 67 - Once / V. del Parque',         '#FF5722', 'TRAMWAY'),
  ('140', 'Línea 140 - Lacroze / Tigre',             '#795548', 'La Puntual');

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE bus_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE passenger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE stop_metrics ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, admins see all
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "drivers_own_profile" ON driver_profiles
  FOR ALL USING (auth.uid() = id);

-- Bus lines & stops: public read
CREATE POLICY "public_bus_lines" ON bus_lines
  FOR SELECT USING (true);
CREATE POLICY "public_bus_stops" ON bus_stops
  FOR SELECT USING (true);

-- Bus positions: public read, drivers write own
CREATE POLICY "public_positions_read" ON bus_positions
  FOR SELECT USING (true);
CREATE POLICY "driver_write_position" ON bus_positions
  FOR INSERT USING (auth.uid() = driver_id);
CREATE POLICY "driver_update_position" ON bus_positions
  FOR UPDATE USING (auth.uid() = driver_id);

-- Reports: users create, admins manage
CREATE POLICY "users_create_report" ON reports
  FOR INSERT USING (auth.uid() = reporter_id);
CREATE POLICY "users_own_reports" ON reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ─── REALTIME SETUP ───────────────────────────────────────────────────────────
-- Enable realtime on bus_positions (this is what makes the live map work)
-- Run in Supabase Dashboard → Database → Replication → add bus_positions table
-- Or via CLI: supabase realtime enable bus_positions

-- ─── FUNCTIONS ────────────────────────────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Get nearest stops for a coordinate
CREATE OR REPLACE FUNCTION get_nearby_stops(
  user_lat DECIMAL, user_lng DECIMAL, radius_meters INT DEFAULT 500
)
RETURNS TABLE(stop_id UUID, stop_name TEXT, street_name TEXT, distance_m FLOAT, line_number TEXT, line_color TEXT)
AS $$
  SELECT
    bs.id,
    bs.name,
    bs.street_name,
    ST_Distance(bs.geom::geography, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) AS distance_m,
    bl.line_number,
    bl.color
  FROM bus_stops bs
  JOIN bus_lines bl ON bl.id = bs.line_id
  WHERE ST_DWithin(
    bs.geom::geography,
    ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
    radius_meters
  )
  ORDER BY distance_m;
$$ LANGUAGE sql;

-- Hourly analytics aggregation (call via cron / Edge Function)
CREATE OR REPLACE FUNCTION aggregate_hourly_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
BEGIN
  INSERT INTO stop_metrics (stop_id, line_id, date, hour, boardings, wait_minutes)
  SELECT
    pe.stop_id,
    pe.line_id,
    target_date,
    pe.hour,
    COUNT(*) FILTER (WHERE pe.event_type = 'board') AS boardings,
    AVG(bs.avg_wait_minutes)::INT AS wait_minutes
  FROM passenger_events pe
  JOIN bus_stops bs ON bs.id = pe.stop_id
  WHERE pe.date = target_date AND pe.event_type = 'board'
  GROUP BY pe.stop_id, pe.line_id, pe.hour
  ON CONFLICT (stop_id, date, hour) DO UPDATE SET
    boardings = EXCLUDED.boardings,
    wait_minutes = EXCLUDED.wait_minutes;
END;
$$ LANGUAGE plpgsql;