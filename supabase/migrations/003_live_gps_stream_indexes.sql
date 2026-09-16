-- ==============================================================================
-- 003_live_gps_stream_indexes.sql
-- Enables reliable Live GPS streaming, QR codes, and Driver Sessions in Supabase
-- ==============================================================================

-- 1. Ensure driver_id has a UNIQUE index on bus_positions so upserts work reliably
CREATE UNIQUE INDEX IF NOT EXISTS idx_bus_positions_driver_unique ON public.bus_positions(driver_id);

-- 2. Create bus_companies table if not exists
CREATE TABLE IF NOT EXISTS public.bus_companies (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create bus_qr_codes table if not exists
CREATE TABLE IF NOT EXISTS public.bus_qr_codes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_token   TEXT UNIQUE NOT NULL,
  line_id    UUID REFERENCES public.bus_lines(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.bus_companies(id) ON DELETE SET NULL,
  bus_unit   TEXT NOT NULL,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create driver_sessions table if not exists
CREATE TABLE IF NOT EXISTS public.driver_sessions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id        UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  qr_code_id       UUID REFERENCES public.bus_qr_codes(id) ON DELETE SET NULL,
  company_id       UUID REFERENCES public.bus_companies(id) ON DELETE SET NULL,
  line_id          UUID REFERENCES public.bus_lines(id) ON DELETE CASCADE,
  bus_unit         TEXT NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  total_passengers INT DEFAULT 0,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);

-- 5. Enable Row Level Security and Public Policies
ALTER TABLE public.bus_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bus_companies' AND policyname = 'public_bus_companies_read') THEN
    CREATE POLICY public_bus_companies_read ON public.bus_companies FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bus_qr_codes' AND policyname = 'public_bus_qr_codes_all') THEN
    CREATE POLICY public_bus_qr_codes_all ON public.bus_qr_codes FOR ALL USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'driver_sessions' AND policyname = 'public_driver_sessions_all') THEN
    CREATE POLICY public_driver_sessions_all ON public.driver_sessions FOR ALL USING (true);
  END IF;
END $$;

-- 6. Pre-seed default QR codes for official lines
DO $$
DECLARE
  v_line_id UUID;
BEGIN
  -- Line 0
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '0' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L0-000', v_line_id, '000', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 12
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '12' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L12-001', v_line_id, '001', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 28
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '28' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L24-002', v_line_id, '002', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 37
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '37' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L37-003', v_line_id, '003', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 55
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '55' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L55-004', v_line_id, '004', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 71
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '71' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L71-005', v_line_id, '005', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 88
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '88' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L88-006', v_line_id, '006', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 102
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '102' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L102-07', v_line_id, '007', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;

  -- Line 115
  SELECT id INTO v_line_id FROM public.bus_lines WHERE line_number = '115' LIMIT 1;
  IF v_line_id IS NOT NULL THEN
    INSERT INTO public.bus_qr_codes (qr_token, line_id, bus_unit, is_active)
    VALUES ('DEMO-QR-L115-08', v_line_id, '008', true)
    ON CONFLICT (qr_token) DO NOTHING;
  END IF;
END $$;
