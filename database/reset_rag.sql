-- Reset RAG tables
-- This will clear all document chunks and indexed resources while keeping the RAG configuration

TRUNCATE TABLE rag_document_chunks CASCADE;
TRUNCATE TABLE rag_indexed_resources CASCADE;

-- Reset RAG config status to pending
UPDATE gitlab_rag_config 
SET rag_status = 'pending', 
    rag_enabled = false,
    total_documents = 0,
    total_chunks = 0,
    last_indexed_at = NULL,
    updated_at = CURRENT_TIMESTAMP;

-- Verify the reset
SELECT 'RAG tables reset successfully' as status;
SELECT COUNT(*) as document_chunks_remaining FROM rag_document_chunks;
SELECT COUNT(*) as indexed_resources_remaining FROM rag_indexed_resources;
SELECT COUNT(*) as rag_configs FROM gitlab_rag_config;
