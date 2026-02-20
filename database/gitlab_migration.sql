-- Add GitLab integration tables

-- Store GitLab project mappings to workspaces
CREATE TABLE IF NOT EXISTS gitlab_workspace_config (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  gitlab_url VARCHAR(255) NOT NULL,
  gitlab_project_id INTEGER NOT NULL,
  gitlab_project_name VARCHAR(255) NOT NULL,
  gitlab_project_path VARCHAR(255),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Store GitLab issue mappings to cards
CREATE TABLE IF NOT EXISTS gitlab_issue_mapping (
  id SERIAL PRIMARY KEY,
  card_id INTEGER NOT NULL UNIQUE REFERENCES cards(id) ON DELETE CASCADE,
  gitlab_project_id INTEGER NOT NULL,
  gitlab_issue_iid INTEGER NOT NULL,
  gitlab_issue_id INTEGER NOT NULL,
  gitlab_issue_url VARCHAR(255),
  last_synced_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gitlab_workspace_config_workspace_id ON gitlab_workspace_config(workspace_id);
CREATE INDEX IF NOT EXISTS idx_gitlab_workspace_config_user_id ON gitlab_workspace_config(user_id);
CREATE INDEX IF NOT EXISTS idx_gitlab_issue_mapping_card_id ON gitlab_issue_mapping(card_id);
CREATE INDEX IF NOT EXISTS idx_gitlab_issue_mapping_gitlab_project_id ON gitlab_issue_mapping(gitlab_project_id);

-- Add columns to cards for GitLab-specific fields
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS gitlab_issue_ref VARCHAR(255),
ADD COLUMN IF NOT EXISTS assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Create index for assigned_to
CREATE INDEX IF NOT EXISTS idx_cards_assigned_to ON cards(assigned_to);

-- Add GitLab token storage (encrypted in production)
CREATE TABLE IF NOT EXISTS user_gitlab_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  gitlab_token VARCHAR(255) NOT NULL,
  gitlab_url VARCHAR(255) NOT NULL DEFAULT 'https://gitlab.com',
  token_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_gitlab_tokens_user_id ON user_gitlab_tokens(user_id);
