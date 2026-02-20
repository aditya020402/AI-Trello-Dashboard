-- Fix gitlab_workspace_config to support multiple projects per workspace

-- Drop the old UNIQUE constraint on workspace_id
ALTER TABLE gitlab_workspace_config 
DROP CONSTRAINT IF EXISTS gitlab_workspace_config_workspace_id_key;

-- Add a composite UNIQUE constraint for workspace_id + gitlab_project_id
ALTER TABLE gitlab_workspace_config 
ADD CONSTRAINT unique_workspace_project_config UNIQUE (workspace_id, gitlab_project_id);
