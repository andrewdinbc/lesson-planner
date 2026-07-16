ALTER TABLE previous_plan_uploads ADD COLUMN IF NOT EXISTS inferred_grades TEXT[];
ALTER TABLE previous_plan_uploads ADD COLUMN IF NOT EXISTS inferred_subjects TEXT[];
ALTER TABLE previous_plan_uploads ADD COLUMN IF NOT EXISTS inferred_teaching_style_notes TEXT;
