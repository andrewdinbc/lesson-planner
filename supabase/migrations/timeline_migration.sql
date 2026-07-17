-- Year Timeline (Premiere-style) — schema addition
-- Implements the timeline/track view from Aj's spec (2026-07-16): one
-- horizontal track per subject, units as draggable/resizable week-range
-- blocks within that track. Seeded from unit_priorities (see
-- lib/timeline.js#seedTimelineFromUnits) but independently editable and
-- persistent/revisitable, not a one-time derived view.

CREATE TABLE IF NOT EXISTS timeline_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,          -- track this block belongs to
  unit_name TEXT NOT NULL,
  color TEXT NOT NULL,            -- hex, one per subject (lib/timeline.js#colorForSubject)
  start_week INTEGER NOT NULL,    -- 1-indexed, inclusive
  end_week INTEGER NOT NULL,      -- 1-indexed, inclusive
  sort_order INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, subject, unit_name)
);

ALTER TABLE timeline_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own timeline units" ON timeline_units
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
