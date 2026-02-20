# GitLab RAG (Retrieval Augmented Generation) Feature - Setup & Usage Guide

## Overview

This feature creates an AI-powered knowledge base from your GitLab project's:

- **Wiki pages** - All documentation
- **Merge Requests** - MR descriptions and comments
- **Issue Comments** - Discussion threads on issues

## What's Been Implemented

### Backend

1. **Database Schema** (`rag_system_migration.sql`)
   - `gitlab_rag_config` - Tracks RAG status per workspace
   - `rag_document_chunks` - Stores text chunks with embeddings
   - `rag_indexed_resources` - Prevents duplicate indexing

2. **GitLab API Methods** (`services/gitlabClient.js`)
   - `getWikiPages()` - Fetch all wiki pages
   - `getWikiPage(slug)` - Get wiki content
   - `getMergeRequests()` - Fetch MRs
   - `getMergeRequestNotes()` - Get MR comments
   - `getAllIssueComments()` - Get all issue comments

3. **RAG Service** (`services/ragService.js`)
   - Creates embeddings using OpenAI (text-embedding-3-small)
   - Stores chunks with embeddings in database
   - Performs similarity search for questions
   - Answers questions using retrieved context

4. **API Endpoints** (`routes/rag.js`)
   - `POST /api/rag/create` - Start RAG creation
   - `GET /api/rag/status/:workspaceId` - Check RAG status
   - `POST /api/rag/query` - Query the knowledge base

### Frontend

1. **GitLab Integration Modal** (updated)
   - Added "Create Knowledge Base (RAG)" checkbox in review step
   - Triggers RAG creation after import if enabled

## Setup Instructions

### 1. Run Database Migration

```bash
cd /Users/darknight/Developer/taskboard/backend
psql -U postgres -d taskboard -f rag_system_migration.sql
```

### 2. Restart Backend

The new routes are already registered in index.js. Just restart:

```bash
# In backend terminal
# Ctrl+C to stop
npm start
```

### 3. Restart Frontend

```bash
# In frontend terminal
# Ctrl+C to stop
npm run dev
```

## How to Use

### Step 1: Link GitLab Project with RAG

1. Open Dashboard → Click "Link GitLab Project"
2. Enter token and connect
3. Select your project
4. Select issues to import
5. **✅ Check "Create Knowledge Base (RAG)"** checkbox
6. Click "Import Issues"
7. You'll see a message that indexing has started

### Step 2: Wait for RAG Processing

- This runs in background
- Fetches all wikis, MRs, and comments
- Creates embeddings for each chunk
- Can take 2-10 minutes depending on project size

### Step 3: Check RAG Status

You can check status via API:

```bash
curl http://localhost:3000/api/rag/status/<workspaceId> \
  -H "Authorization: Bearer <your-jwt-token>"
```

Response:

```json
{
  "ragEnabled": true,
  "status": "completed", // or "processing", "failed"
  "totalDocuments": 45,
  "totalChunks": 123,
  "lastIndexedAt": "2026-02-19T..."
}
```

### Step 4: Query the Knowledge Base

Use the API to ask questions:

```bash
curl -X POST http://localhost:3000/api/rag/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-jwt-token>" \
  -d '{
    "workspaceId": 123,
    "question": "How do I deploy the application?"
  }'
```

Response:

```json
{
  "success": true,
  "answer": "Based on the documentation, you can deploy the application by...",
  "sources": [
    {
      "type": "wiki",
      "url": "https://gitlab.com/project/wikis/deployment",
      "similarity": 0.89,
      "preview": "Deployment guide: First, build the Docker image..."
    }
  ]
}
```

## Next Steps (To Complete)

### Add RAG Query Interface in Chat Widget

The ChatWidget needs to be updated to:

1. Detect if current workspace has RAG enabled
2. Add a toggle "Ask Knowledge Base" mode
3. When enabled, route questions to `/api/rag/query` instead of regular chat
4. Display sources below the answer

Would you like me to implement the ChatWidget RAG query interface now?

## Troubleshooting

### RAG Status is "failed"

- Check backend logs for error messages
- Verify GitLab token has access to wikis
- Ensure OpenAI API key is valid

### No results from queries

- Check that RAG status is "completed"
- Verify there's actual content in wikis/MRs/comments
- Try more specific questions

### Slow performance

- First query creates embeddings (slower)
- Subsequent queries use cache (faster)
- Consider limiting MRs to recent ones (already limited to 50)

## Architecture Notes

- **Embeddings**: Using OpenAI's text-embedding-3-small (1536 dimensions)
- **Chunking**: Text split into ~1500 char chunks with paragraph boundaries
- **Similarity**: Cosine similarity for ranking relevant chunks
- **Context**: Top 5 most similar chunks sent to GPT for answering
- **Model**: GPT-3.5-turbo for answer generation with retrieved context
