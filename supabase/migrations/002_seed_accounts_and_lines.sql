-- ==============================================================================
-- 002_seed_accounts_and_lines.sql
-- Complete database setup, bus lines seed, and initial accounts for BienParada
-- Compatible with Supabase SQL Editor and automated GitHub migrations
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ── 1. Create Base Tables if not existing ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL CHECK (role IN ('user', 'driver', 'company_admin', 'admin', 'superadmin')) DEFAULT 'user',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id                  UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  age                 INT DEFAULT 25,
  weekly_trips        INT DEFAULT 0,
  total_trips_tracked INT DEFAULT 0,
  is_on_bus           BOOLEAN DEFAULT FALSE,
  current_bus_id      TEXT
);

CREATE TABLE IF NOT EXISTS public.bus_lines (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_number  TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  color        TEXT NOT NULL DEFAULT '#FF9800',
  company      TEXT,
  total_stops  INT DEFAULT 0,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_profiles (
  id            UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  driver_number TEXT UNIQUE,
  license_plate TEXT,
  line_id       UUID REFERENCES public.bus_lines(id) ON DELETE SET NULL,
  bus_unit      TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  is_online     BOOLEAN DEFAULT FALSE,
  rating        DECIMAL(3,2) DEFAULT 5.0,
  total_reports INT DEFAULT 0,
  verified      BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS public.bus_stops (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  line_id          UUID REFERENCES public.bus_lines(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  street_name      TEXT NOT NULL,
  cross_street     TEXT,
  stop_number      INT NOT NULL,
  latitude         DECIMAL(10,8) NOT NULL,
  longitude        DECIMAL(11,8) NOT NULL,
  direction        TEXT CHECK (direction IN ('ida', 'vuelta')) DEFAULT 'ida',
  avg_wait_minutes INT DEFAULT 8,
  total_daily_users INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.bus_positions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id       UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  line_id         UUID REFERENCES public.bus_lines(id),
  bus_unit        TEXT,
  latitude        DECIMAL(10,8) NOT NULL,
  longitude       DECIMAL(11,8) NOT NULL,
  heading         INT DEFAULT 0,
  speed_kmh       INT DEFAULT 0,
  next_stop_id    UUID REFERENCES public.bus_stops(id),
  eta_minutes     INT,
  status          TEXT CHECK (status IN ('moving','stopped','at_stop','offline')) DEFAULT 'moving',
  passenger_count INT DEFAULT 0,
  timestamp       TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Supabase Realtime replication on bus_positions
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.bus_positions;
EXCEPTION WHEN OTHERS THEN
  -- Table already in publication or publication doesn't exist
  NULL;
END $$;

-- ── 2. Seed Official Bus Lines ────────────────────────────────────────────────

INSERT INTO public.bus_lines (line_number, name, color, company, total_stops, is_active)
VALUES
  ('0', 'Línea 0 - Plaza Italia / Av. Belgrano (Test)', '#8B5CF6', 'Empresa Línea 0 S.A.', 35, true),
  ('12', 'Línea 12 - Once / Villa Urquiza', '#EF4444', 'Transportes Automotores Callao S.A.', 69, true),
  ('28', 'Línea 28 - Retiro / Puente La Noria', '#16A34A', 'DOTA S.A.', 95, true),
  ('37', 'Línea 37 - Aeropuerto / Centro', '#15803D', '4 de Junio S.A.T.C.I.', 142, true),
  ('39', 'Línea 39 - Chacarita / Barracas', '#F97316', 'Transportes Santa Fe S.A.C.I.I.', 97, true),
  ('55', 'Línea 55 - San Justo / Barrancas de Belgrano', '#84CC16', 'Almafuerte S.A.C.I.E.I.', 80, true),
  ('59', 'Línea 59 - Estación Buenos Aires / San Isidro', '#10B981', 'MOCBA S.A.', 172, true),
  ('60', 'Línea 60 - Constitución / Tigre', '#EAB308', 'Microomnibus Norte S.A. (MONSA)', 81, true),
  ('71', 'Línea 71 - Villa Adelina / Plaza Once', '#06B6D4', 'Empresa Línea 71 S.A.', 90, true),
  ('88', 'Línea 88 - Once / Lobos / Monte', '#6366F1', 'Expreso Liniers S.A.I.C.', 110, true),
  ('102', 'Línea 102 - Palermo / Barracas', '#3B82F6', 'Transportes El Puente S.A.T.', 65, true),
  ('115', 'Línea 115 - Hospital Rivadavia / Villa Soldati', '#A855F7', 'Transportes Automotores Loria S.A.', 75, true),
  ('152', 'Línea 152 - La Boca / Olivos', '#1D4ED8', 'Empresa Tandilense S.A.C.I.F.I.', 129, true),
  ('T-Amarillo', 'Bus Turístico Amarillo', '#F59E0B', 'Buenos Aires Bus (Circuito Amarillo)', 9, true),
  ('T-Rojo', 'Bus Turístico Rojo', '#EF4444', 'Gray Line Argentina (Circuito Rojo)', 9, true)
ON CONFLICT (line_number) DO UPDATE
SET name = EXCLUDED.name, color = EXCLUDED.color, company = EXCLUDED.company;

-- ── 3. Helper Function to Provision Authenticated Users in Supabase ──────────

CREATE OR REPLACE FUNCTION public.seed_app_account(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_line_number TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_encrypted_pw TEXT;
  v_line_id UUID;
BEGIN
  -- Compute bcrypt password hash using pgcrypto
  v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));

  -- Check if user exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = lower(trim(p_email));

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      lower(trim(p_email)),
      v_encrypted_pw,
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      json_build_object('name', p_name, 'role', p_role, 'line_number', p_line_number)::jsonb,
      NOW(),
      NOW(),
      '', '', '', ''
    );

    -- Insert into auth.identities
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      v_user_id::text,
      v_user_id,
      json_build_object('sub', v_user_id::text, 'email', lower(trim(p_email)))::jsonb,
      'email',
      NOW(),
      NOW(),
      NOW()
    ) ON CONFLICT (provider, id) DO NOTHING;

  ELSE
    -- Update password and metadata for existing user
    UPDATE auth.users
    SET
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = json_build_object('name', p_name, 'role', p_role, 'line_number', p_line_number)::jsonb,
      updated_at = NOW()
    WHERE id = v_user_id;
  END IF;

  -- Upsert into public.profiles
  INSERT INTO public.profiles (id, email, name, role, updated_at)
  VALUES (v_user_id, lower(trim(p_email)), p_name, p_role, NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role, updated_at = NOW();

  -- If driver, link to line and create driver_profile
  IF p_role = 'driver' THEN
    IF p_line_number IS NOT NULL THEN
      SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = p_line_number LIMIT 1;
    END IF;

    INSERT INTO public.driver_profiles (id, driver_number, line_id, is_active, is_online, verified)
    VALUES (v_user_id, lower(split_part(p_email, '@', 1)), v_line_id, true, false, true)
    ON CONFLICT (id) DO UPDATE
    SET line_id = EXCLUDED.line_id, is_active = true;
  END IF;

  -- If passenger, create user_profile
  IF p_role = 'user' THEN
    INSERT INTO public.user_profiles (id, age, weekly_trips)
    VALUES (v_user_id, 30, 10)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 4. Provision Super Admins ─────────────────────────────────────────────────

SELECT public.seed_app_account('admin@admin.com', 'Admin', 'Super Admin Principal', 'superadmin');
SELECT public.seed_app_account('nestoradmin@nestoradmin.com', 'NestorAdmin123!', 'Nestor Admin', 'superadmin');

-- ── 5. Provision Line Admins ──────────────────────────────────────────────────

SELECT public.seed_app_account('linea0@bienparada.ar', 'Bienparada', 'Admin Línea 0', 'company_admin', '0');
SELECT public.seed_app_account('linea12@bienparada.ar', 'Bienparada', 'Admin Línea 12 (Callao)', 'company_admin', '12');
SELECT public.seed_app_account('linea28@bienparada.ar', 'Bienparada', 'Admin Línea 28 (DOTA)', 'company_admin', '28');
SELECT public.seed_app_account('linea37@bienparada.ar', 'Bienparada', 'Admin Línea 37 (4 de Junio)', 'company_admin', '37');
SELECT public.seed_app_account('linea39@bienparada.ar', 'Bienparada', 'Admin Línea 39 (Santa Fe)', 'company_admin', '39');
SELECT public.seed_app_account('linea55@bienparada.ar', 'Bienparada', 'Admin Línea 55 (Almafuerte)', 'company_admin', '55');
SELECT public.seed_app_account('linea59@bienparada.ar', 'Bienparada', 'Admin Línea 59 (MOCBA)', 'company_admin', '59');
SELECT public.seed_app_account('linea60@bienparada.ar', 'Bienparada', 'Admin Línea 60 (MONSA)', 'company_admin', '60');
SELECT public.seed_app_account('linea71@bienparada.ar', 'Bienparada', 'Admin Línea 71', 'company_admin', '71');
SELECT public.seed_app_account('linea88@bienparada.ar', 'Bienparada', 'Admin Línea 88 (Liniers)', 'company_admin', '88');
SELECT public.seed_app_account('linea102@bienparada.ar', 'Bienparada', 'Admin Línea 102 (El Puente)', 'company_admin', '102');
SELECT public.seed_app_account('linea115@bienparada.ar', 'Bienparada', 'Admin Línea 115 (Loria)', 'company_admin', '115');
SELECT public.seed_app_account('linea152@bienparada.ar', 'Bienparada', 'Admin Línea 152 (Tandilense)', 'company_admin', '152');
SELECT public.seed_app_account('amarillo@bienparada.ar', 'Bienparada', 'Admin Bus Amarillo', 'company_admin', 'T-Amarillo');
SELECT public.seed_app_account('rojo@bienparada.ar', 'Bienparada', 'Admin Bus Rojo', 'company_admin', 'T-Rojo');

-- ── 6. Provision Choferes (Drivers) ───────────────────────────────────────────

SELECT public.seed_app_account('nestor@linea12.ar', 'Bienparada', 'Néstor García', 'driver', '12');
SELECT public.seed_app_account('roberto@linea12.ar', 'Bienparada', 'Roberto Sánchez', 'driver', '12');
SELECT public.seed_app_account('marcos@linea0.ar', 'Bienparada', 'Marcos Díaz', 'driver', '0');
SELECT public.seed_app_account('carlos@linea0.ar', 'Bienparada', 'Carlos Martínez', 'driver', '0');

-- ── 7. Provision Pasajeros (Users) ────────────────────────────────────────────

SELECT public.seed_app_account('alejandro.finochietti@yahoo.com.ar', 'Afodes18', 'Alejandro Finochietti', 'user');
SELECT public.seed_app_account('usuario@usuario.com', 'Usuario', 'Usuario Administrador', 'user');
SELECT public.seed_app_account('alfox@alfox.com', 'alfox', 'alfox', 'user');
SELECT public.seed_app_account('alex@gmail.com', 'password123', 'Alex', 'user');

-- ── 8. Row Level Security Policies ────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_positions ENABLE ROW LEVEL SECURITY;

-- Allow public read of bus lines, stops, and positions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_bus_lines_read') THEN
    CREATE POLICY public_bus_lines_read ON public.bus_lines FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_bus_positions_read') THEN
    CREATE POLICY public_bus_positions_read ON public.bus_positions FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_profiles_read') THEN
    CREATE POLICY public_profiles_read ON public.profiles FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'driver_positions_insert') THEN
    CREATE POLICY driver_positions_insert ON public.bus_positions FOR ALL USING (true);
  END IF;
END $$;
