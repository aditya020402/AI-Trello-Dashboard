-- Add status column to activity_logs to track RAG creation progress
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS extra_data JSONB;

-- Create index for activity status queries
CREATE INDEX IF NOT EXISTS idx_activity_logs_status ON activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
