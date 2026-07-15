-- Unit Priority Scheduling — schema addition
-- Implements UNIT_PRIORITY_SCHEDULING_SPEC.md's slider mechanic.

CREATE TABLE IF NOT EXISTS unit_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,          -- 'Language Arts', 'Mathematics', 'Science', etc.
  unit_name TEXT NOT NULL,        -- e.g. 'Reading', 'Fractions', 'Ecosystems'
  priority NUMERIC NOT NULL DEFAULT 1,  -- relative weight, equal priority = 1 for all units in a subject at baseline
  high_scrutiny BOOLEAN DEFAULT false,  -- LA/Math always true; other subjects opt-in per TeacherAssist spec
  removed BOOLEAN DEFAULT false,        -- teacher pruned this unit from their year
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, subject, unit_name)
);

ALTER TABLE unit_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own unit priorities" ON unit_priorities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
