-- Year Plan lens preferences — schema addition
-- Run once in Supabase SQL Editor (ca-central-1 project, per standing rule).

CREATE TABLE IF NOT EXISTS year_plan_lens_prefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model_key TEXT NOT NULL,          -- e.g. 'inquiry_based', matches lib/curriculum-models.js keys
  period_label TEXT NOT NULL,       -- e.g. 'Who am I in my community?'
  period_pct NUMERIC NOT NULL,      -- 0-100, normalized to sum 100 per model_key
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, model_key, period_label)
);

ALTER TABLE year_plan_lens_prefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lens prefs" ON year_plan_lens_prefs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
