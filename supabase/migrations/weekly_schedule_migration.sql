-- Weekly Schedule Builder — schema addition
-- Run once in Supabase SQL Editor (ca-central-1 project, per standing rule).

CREATE TABLE IF NOT EXISTS weekly_schedule_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_start_time TEXT,        -- e.g. "08:45"
  school_end_time TEXT,          -- e.g. "14:45"
  lunch_start_time TEXT,
  lunch_duration_minutes INT,
  block_length_minutes INT,      -- default block size, e.g. 45
  prep_periods_per_week INT,     -- count of non-contact/prep blocks
  am_core_preference BOOLEAN DEFAULT true,  -- literacy/numeracy in the morning
  fixed_blocks JSONB,            -- [{ subject, day, start_time, length_minutes, label }]
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS weekly_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lens_period_id TEXT,           -- links this week's schedule to a Year Plan lens period, if applicable
  week_label TEXT,               -- e.g. "Week 3" or an ISO date
  grid JSONB NOT NULL,           -- { Mon: [{id, subject, label, start_time, length_minutes, fixed}], Tue: [...], ... }
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE weekly_schedule_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own prefs" ON weekly_schedule_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own schedules" ON weekly_schedules
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
