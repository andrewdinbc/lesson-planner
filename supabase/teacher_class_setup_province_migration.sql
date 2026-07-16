ALTER TABLE teacher_class_setup ADD COLUMN IF NOT EXISTS province TEXT NOT NULL DEFAULT 'BC';
ALTER TABLE teacher_class_setup ADD COLUMN IF NOT EXISTS custom_curriculum_url TEXT;
