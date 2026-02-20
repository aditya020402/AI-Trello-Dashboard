-- ============================================================================
-- Taskboard Database Migration Script
-- Purpose: Migrate complete database from Docker dev to production PostgreSQL
-- ============================================================================

-- Step 1: Backup current production database (if exists)
-- Run this before migration: pg_dump -h production_host -U postgres -d taskboard > taskboard_prod_backup.sql

-- Step 2: Create database if not exists
CREATE DATABASE IF NOT EXISTS taskboard;

-- Connect to taskboard database
\c taskboard;

-- ============================================================================
-- TABLE CREATION
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  profile_photo_url TEXT,
  status VARCHAR(50) DEFAULT 'available',
  bio TEXT,
  is_dyslexic BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_color VARCHAR(7) DEFAULT '#0ea5e9',
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2) Create missing table
CREATE TABLE IF NOT EXISTS workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

-- 3) Useful indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);


-- Boards table
CREATE TABLE IF NOT EXISTS boards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lists table
CREATE TABLE IF NOT EXISTS lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  board_id INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  list_id INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  board_id INTEGER REFERENCES boards(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id INTEGER,
  entity_title VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50),
  extra_data JSONB
);

-- GitLab integration table
CREATE TABLE IF NOT EXISTS gitlab_integrations (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  gitlab_url VARCHAR(500) NOT NULL,
  gitlab_project_id INTEGER NOT NULL,
  gitlab_token VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, gitlab_project_id)
);

-- GitLab RAG config table
CREATE TABLE IF NOT EXISTS gitlab_rag_config (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  gitlab_project_id INTEGER NOT NULL,
  rag_enabled BOOLEAN DEFAULT false,
  rag_status VARCHAR(50) DEFAULT 'pending',
  last_indexed_at TIMESTAMP,
  total_documents INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, gitlab_project_id)
);

-- RAG document chunks table
CREATE TABLE IF NOT EXISTS rag_document_chunks (
  id SERIAL PRIMARY KEY,
  rag_config_id INTEGER NOT NULL REFERENCES gitlab_rag_config(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL,
  source_id VARCHAR(255) NOT NULL,
  source_url VARCHAR(500),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RAG indexed resources table
CREATE TABLE IF NOT EXISTS rag_indexed_resources (
  id SERIAL PRIMARY KEY,
  rag_config_id INTEGER NOT NULL REFERENCES gitlab_rag_config(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  gitlab_updated_at TIMESTAMP,
  indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rag_config_id, resource_type, resource_id)
);

-- User streaks table
ALTER TABLE boards
  ADD COLUMN IF NOT EXISTS image_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS image_thumb_url TEXT,
  ADD COLUMN IF NOT EXISTS image_full_url TEXT,
  ADD COLUMN IF NOT EXISTS image_user_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS image_link_html TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS user_daily_streaks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  streak_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, streak_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_streaks_user_id
  ON user_daily_streaks(user_id);

CREATE INDEX IF NOT EXISTS idx_user_daily_streaks_date
  ON user_daily_streaks(streak_date);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Workspace indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

-- Board indexes
CREATE INDEX IF NOT EXISTS idx_boards_workspace ON boards(workspace_id);

-- List indexes
CREATE INDEX IF NOT EXISTS idx_lists_board ON lists(board_id);

-- Card indexes
CREATE INDEX IF NOT EXISTS idx_cards_list ON cards(list_id);

-- Activity log indexes
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_workspace ON activity_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_board ON activity_logs(board_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_status ON activity_logs(status);
CREATE INDEX IF NOT EXISTS idx_activity_entity ON activity_logs(entity_type, entity_id);

-- GitLab integration indexes
CREATE INDEX IF NOT EXISTS idx_gitlab_workspace ON gitlab_integrations(workspace_id);

-- RAG config indexes
CREATE INDEX IF NOT EXISTS idx_rag_config_workspace ON gitlab_rag_config(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rag_config_project ON gitlab_rag_config(gitlab_project_id);

-- RAG document chunks indexes
CREATE INDEX IF NOT EXISTS idx_rag_chunks_config ON rag_document_chunks(rag_config_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_document_chunks(source_type, source_id);

-- RAG indexed resources indexes
CREATE INDEX IF NOT EXISTS idx_rag_indexed_config ON rag_indexed_resources(rag_config_id);

-- User streaks indexes
CREATE INDEX IF NOT EXISTS idx_streaks_user ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_streaks_date ON user_streaks(date);

-- ============================================================================
-- DATA MIGRATION FROM DOCKER DATABASE
-- ============================================================================

-- Step 1: Export data from Docker database
-- Run this on Docker database:
-- pg_dump -h localhost -p 5432 -U postgres -d taskboard --data-only --inserts > taskboard_data.sql

-- Step 2: Import data into production
-- \i taskboard_data.sql

-- Alternative: Use COPY command for large tables
-- Example:
-- COPY users FROM '/path/to/users.csv' WITH (FORMAT csv, HEADER true);
-- COPY workspaces FROM '/path/to/workspaces.csv' WITH (FORMAT csv, HEADER true);
-- COPY boards FROM '/path/to/boards.csv' WITH (FORMAT csv, HEADER true);
-- COPY lists FROM '/path/to/lists.csv' WITH (FORMAT csv, HEADER true);
-- COPY cards FROM '/path/to/cards.csv' WITH (FORMAT csv, HEADER true);
-- COPY activity_logs FROM '/path/to/activity_logs.csv' WITH (FORMAT csv, HEADER true);
-- COPY gitlab_integrations FROM '/path/to/gitlab_integrations.csv' WITH (FORMAT csv, HEADER true);
-- COPY gitlab_rag_config FROM '/path/to/gitlab_rag_config.csv' WITH (FORMAT csv, HEADER true);
-- COPY rag_document_chunks FROM '/path/to/rag_document_chunks.csv' WITH (FORMAT csv, HEADER true);
-- COPY rag_indexed_resources FROM '/path/to/rag_indexed_resources.csv' WITH (FORMAT csv, HEADER true);
-- COPY user_streaks FROM '/path/to/user_streaks.csv' WITH (FORMAT csv, HEADER true);

-- ============================================================================
-- POST-MIGRATION: UPDATE SEQUENCES
-- ============================================================================

-- Reset all sequences to max ID + 1
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('workspaces_id_seq', COALESCE((SELECT MAX(id) FROM workspaces), 1), true);
SELECT setval('boards_id_seq', COALESCE((SELECT MAX(id) FROM boards), 1), true);
SELECT setval('lists_id_seq', COALESCE((SELECT MAX(id) FROM lists), 1), true);
SELECT setval('cards_id_seq', COALESCE((SELECT MAX(id) FROM cards), 1), true);
SELECT setval('activity_logs_id_seq', COALESCE((SELECT MAX(id) FROM activity_logs), 1), true);
SELECT setval('gitlab_integrations_id_seq', COALESCE((SELECT MAX(id) FROM gitlab_integrations), 1), true);
SELECT setval('gitlab_rag_config_id_seq', COALESCE((SELECT MAX(id) FROM gitlab_rag_config), 1), true);
SELECT setval('rag_document_chunks_id_seq', COALESCE((SELECT MAX(id) FROM rag_document_chunks), 1), true);
SELECT setval('rag_indexed_resources_id_seq', COALESCE((SELECT MAX(id) FROM rag_indexed_resources), 1), true);
SELECT setval('user_streaks_id_seq', COALESCE((SELECT MAX(id) FROM user_streaks), 1), true);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check row counts
SELECT 'users' AS table_name, COUNT(*) AS row_count FROM users
UNION ALL
SELECT 'workspaces', COUNT(*) FROM workspaces
UNION ALL
SELECT 'boards', COUNT(*) FROM boards
UNION ALL
SELECT 'lists', COUNT(*) FROM lists
UNION ALL
SELECT 'cards', COUNT(*) FROM cards
UNION ALL
SELECT 'activity_logs', COUNT(*) FROM activity_logs
UNION ALL
SELECT 'gitlab_integrations', COUNT(*) FROM gitlab_integrations
UNION ALL
SELECT 'gitlab_rag_config', COUNT(*) FROM gitlab_rag_config
UNION ALL
SELECT 'rag_document_chunks', COUNT(*) FROM rag_document_chunks
UNION ALL
SELECT 'rag_indexed_resources', COUNT(*) FROM rag_indexed_resources
UNION ALL
SELECT 'user_streaks', COUNT(*) FROM user_streaks;

-- Check for orphaned records
SELECT 'Boards without workspace' AS issue, COUNT(*) AS count
FROM boards b LEFT JOIN workspaces w ON b.workspace_id = w.id WHERE w.id IS NULL
UNION ALL
SELECT 'Lists without board', COUNT(*)
FROM lists l LEFT JOIN boards b ON l.board_id = b.id WHERE b.id IS NULL
UNION ALL
SELECT 'Cards without list', COUNT(*)
FROM cards c LEFT JOIN lists l ON c.list_id = l.id WHERE l.id IS NULL;

-- ============================================================================
-- GRANT PERMISSIONS (Adjust as needed)
-- ============================================================================

-- Create production user if needed
-- CREATE USER taskboard_prod WITH PASSWORD 'your_secure_password';

-- Grant permissions
-- GRANT CONNECT ON DATABASE taskboard TO taskboard_prod;
-- GRANT USAGE ON SCHEMA public TO taskboard_prod;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO taskboard_prod;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO taskboard_prod;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

SELECT 'Database migration completed successfully!' AS status;



BEGIN;

-- Rename old columns if present (safe, conditional)
DO $$
BEGIN
  -- lists.name -> lists.title
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'title'
  ) THEN
    ALTER TABLE lists RENAME COLUMN name TO title;
  END IF;

  -- lists.position -> lists.order_index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'position'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'lists' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE lists RENAME COLUMN position TO order_index;
  END IF;

  -- cards.position -> cards.order_index
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'position'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cards' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE cards RENAME COLUMN position TO order_index;
  END IF;
END $$;

-- Ensure required columns exist even if rename did not happen
ALTER TABLE lists
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE cards
  ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Helpful indexes for your queries
CREATE INDEX IF NOT EXISTS idx_lists_board_order ON lists(board_id, order_index);
CREATE INDEX IF NOT EXISTS idx_cards_list_order ON cards(list_id, order_index);

COMMIT;

