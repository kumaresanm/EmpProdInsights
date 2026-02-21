-- Run this in Supabase Dashboard → SQL Editor (New query) → Run

-- Production entries
CREATE TABLE IF NOT EXISTS entries (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  employee_name TEXT NOT NULL DEFAULT '',
  shift TEXT NOT NULL DEFAULT '',
  machine TEXT NOT NULL DEFAULT '',
  program_no TEXT NOT NULL DEFAULT '',
  cycle_time_sec NUMERIC NOT NULL DEFAULT 0,
  hours_worked NUMERIC NOT NULL DEFAULT 0,
  actual_hours NUMERIC,
  pieces_per_hour NUMERIC,
  actual_pdn NUMERIC,
  pdn_req NUMERIC,
  producted_qty NUMERIC,
  short NUMERIC,
  notes TEXT NOT NULL DEFAULT ''
);

-- Config: machines, employees, programs (key = name, value = json array of strings)
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Seed default config keys
INSERT INTO config (key, value) VALUES
  ('machines', '[]'::jsonb),
  ('employees', '[]'::jsonb),
  ('programs', '[]'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Optional: enable RLS so only authenticated users can read/write (if you use Supabase client from frontend)
-- For now the Node backend uses service_role and bypasses RLS, so this is optional.
-- ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE config ENABLE ROW LEVEL SECURITY;
