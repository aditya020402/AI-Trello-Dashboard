-- Migration script to add workspace support
-- Run this script if you're upgrading from the old schema

-- Step 1: Create new tables
CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon_color VARCHAR(7) DEFAULT '#0ea5e9',
  owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, user_id)
);

-- Step 2: Add workspace_id to boards table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='boards' AND column_name='workspace_id') THEN
    ALTER TABLE boards ADD COLUMN workspace_id INTEGER;
  END IF;
END $$;

-- Step 3: Create default workspace for each user and migrate their boards
DO $$
DECLARE
  user_record RECORD;
  new_workspace_id INTEGER;
BEGIN
  FOR user_record IN SELECT id, username FROM users
  LOOP
    -- Create default workspace for this user
    INSERT INTO workspaces (name, owner_id)
    VALUES (user_record.username || '''s Workspace', user_record.id)
    RETURNING id INTO new_workspace_id;
    
    -- Add user as workspace owner
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, user_record.id, 'owner');
    
    -- Migrate all boards for this user to their workspace
    UPDATE boards 
    SET workspace_id = new_workspace_id 
    WHERE user_id = user_record.id AND workspace_id IS NULL;
  END LOOP;
END $$;

-- Step 4: Make workspace_id NOT NULL and add foreign key constraint
ALTER TABLE boards ALTER COLUMN workspace_id SET NOT NULL;
ALTER TABLE boards ADD CONSTRAINT fk_boards_workspace 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Step 5: Drop user_id column from boards (it's replaced by workspace_id)
ALTER TABLE boards DROP COLUMN IF EXISTS user_id;

-- Step 6: Add workspace_id to activity_logs
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS workspace_id INTEGER;
ALTER TABLE activity_logs ADD CONSTRAINT fk_activity_workspace 
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE;

-- Step 7: Create indexes
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace_id ON activity_logs(workspace_id);

-- Drop old index if exists
DROP INDEX IF EXISTS idx_boards_user_id;

COMMIT;

