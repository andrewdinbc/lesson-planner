ALTER TABLE steering_documents ADD COLUMN IF NOT EXISTS link_status TEXT;
ALTER TABLE steering_documents ADD COLUMN IF NOT EXISTS http_status_code INT;
ALTER TABLE steering_documents ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;
