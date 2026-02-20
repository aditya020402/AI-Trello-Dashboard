-- RAG (Retrieval Augmented Generation) System Migration
-- Stores knowledge base for GitLab wikis, MRs, and issue comments

-- Main RAG configuration table
CREATE TABLE IF NOT EXISTS gitlab_rag_config (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  gitlab_project_id INTEGER NOT NULL,
  rag_enabled BOOLEAN DEFAULT false,
  rag_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  last_indexed_at TIMESTAMP,
  total_documents INTEGER DEFAULT 0,
  total_chunks INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workspace_id, gitlab_project_id)
);

-- Store document chunks with embeddings
CREATE TABLE IF NOT EXISTS rag_document_chunks (
  id SERIAL PRIMARY KEY,
  rag_config_id INTEGER NOT NULL REFERENCES gitlab_rag_config(id) ON DELETE CASCADE,
  source_type VARCHAR(50) NOT NULL, -- 'wiki', 'merge_request', 'issue_comment'
  source_id VARCHAR(255) NOT NULL, -- GitLab resource ID
  source_url VARCHAR(500),
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding TEXT, -- OpenAI embeddings stored as JSON array (1536 dimensions)
  metadata JSONB, -- Store additional metadata (title, author, date, etc.)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Track indexed resources to avoid duplicates
CREATE TABLE IF NOT EXISTS rag_indexed_resources (
  id SERIAL PRIMARY KEY,
  rag_config_id INTEGER NOT NULL REFERENCES gitlab_rag_config(id) ON DELETE CASCADE,
  resource_type VARCHAR(50) NOT NULL, -- 'wiki', 'merge_request', 'issue_comment'
  resource_id VARCHAR(255) NOT NULL,
  gitlab_updated_at TIMESTAMP,
  indexed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(rag_config_id, resource_type, resource_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rag_config_workspace ON gitlab_rag_config(workspace_id);
CREATE INDEX IF NOT EXISTS idx_rag_config_project ON gitlab_rag_config(gitlab_project_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_config ON rag_document_chunks(rag_config_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_source ON rag_document_chunks(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_rag_indexed_config ON rag_indexed_resources(rag_config_id);

COMMENT ON TABLE gitlab_rag_config IS 'Configuration and status tracking for RAG knowledge bases';
COMMENT ON TABLE rag_document_chunks IS 'Chunked documents with embeddings for similarity search';
COMMENT ON TABLE rag_indexed_resources IS 'Track which GitLab resources have been indexed';
