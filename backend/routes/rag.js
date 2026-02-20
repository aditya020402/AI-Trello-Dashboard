const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware');
const GitLabClient = require('../services/gitlabClient');
const ragService = require('../services/ragService');

const router = express.Router();

/**
 * Create/Initialize RAG for a GitLab project
 * POST /api/rag/create
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, gitlabProjectId, token, gitlabUrl } = req.body;
    const userId = req.userId;

    if (!workspaceId || !gitlabProjectId || !token) {
      return res.status(400).json({ error: 'Workspace ID, GitLab project ID, and token are required' });
    }

    // Check if RAG config already exists
    const existingConfig = await query(
      `SELECT id, rag_status FROM gitlab_rag_config 
       WHERE workspace_id = $1 AND gitlab_project_id = $2`,
      [workspaceId, gitlabProjectId]
    );

    let ragConfigId;

    if (existingConfig.rows.length > 0) {
      ragConfigId = existingConfig.rows[0].id;
      
      // Update status to processing
      await query(
        `UPDATE gitlab_rag_config 
         SET rag_enabled = true, rag_status = 'processing', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [ragConfigId]
      );
    } else {
      // Create new RAG config
      const result = await query(
        `INSERT INTO gitlab_rag_config (workspace_id, gitlab_project_id, rag_enabled, rag_status)
         VALUES ($1, $2, true, 'processing')
         RETURNING id`,
        [workspaceId, gitlabProjectId]
      );
      ragConfigId = result.rows[0].id;
    }

    // Log activity: RAG creation started
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title, status, extra_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [userId, workspaceId, 'CREATE', 'RAG', ragConfigId, 'Knowledge Base Creation', 'processing', JSON.stringify({ gitlabProjectId })]
    );

    // Start RAG creation process in background
    processRAGCreation(ragConfigId, gitlabProjectId, token, gitlabUrl, userId, workspaceId).catch(err => {
      console.error('RAG creation failed:', err);
    });

    res.json({
      success: true,
      message: 'RAG creation started',
      ragConfigId
    });
  } catch (error) {
    console.error('RAG create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Background process to create RAG with simple atomic-unit batching
 * - Each wiki's paragraphs processed immediately after chunking
 * - Each MR + its comments processed as atomic unit immediately
 * - Each issue + its comments processed as atomic unit immediately
 * - Embeddings batched at 10-item chunks during storage
 */
async function processRAGCreation(ragConfigId, gitlabProjectId, token, gitlabUrl, userId, workspaceId) {
  const startTime = Date.now();
  
  try {
    const gitlab = new GitLabClient(gitlabUrl || 'https://gitlab.com', token);
    
    let totalDocuments = 0;
    let totalChunks = 0;
    let wikiCount = 0;
    let mrCount = 0;
    let issueCount = 0;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`[RAG ${ragConfigId}] 🚀 STARTING RAG CREATION`);
    console.log(`[RAG ${ragConfigId}] Project ID: ${gitlabProjectId}`);
    console.log(`[RAG ${ragConfigId}] Started at: ${new Date().toISOString()}`);
    console.log(`${'='.repeat(60)}\n`);

    // Helper to process and embed chunks immediately (no threshold accumulation)
    const processBatchChunks = async (chunkData, sourceType) => {
      if (chunkData.length === 0) return 0;
      
      // Extract text content for batch embedding
      const texts = chunkData.map(c => c.content);
      
      console.log(`[RAG ${ragConfigId}] [${sourceType.toUpperCase()}] Processing ${chunkData.length} chunks...`);
      
      // Create embeddings in batch (10 at a time)
      const embeddings = await ragService.createBatchEmbeddings(texts);
      
      // Prepare chunks with embeddings for batch insert
      const chunksToStore = chunkData.map((chunk, idx) => ({
        ...chunk,
        embedding: embeddings[idx]
      }));
      
      // Batch insert into database
      await ragService.storeBatchChunks(chunksToStore);
      
      return chunksToStore.length;
    };

    // 1. Index Wiki Pages - process each wiki immediately after chunking
    console.log(`[RAG ${ragConfigId}] 📖 PHASE 1: Processing Wiki Pages`);
    console.log(`[RAG ${ragConfigId}] Fetching wiki pages for project ${gitlabProjectId}...\n`);
    try {
      try {
        const wikiPages = await gitlab.getWikiPages(gitlabProjectId);
        console.log(`[RAG ${ragConfigId}] Found ${wikiPages.length} wiki pages\n`);
        
        // Process each wiki's chunks immediately
        for (const wiki of wikiPages) {
          const isIndexed = await ragService.isResourceIndexed(ragConfigId, 'wiki', wiki.slug);
          if (!isIndexed) {
            console.log(`[RAG ${ragConfigId}] [WIKI] Processing: "${wiki.title}"...`);
            
            try {
              // Get full wiki content
              const fullWiki = await gitlab.getWikiPage(gitlabProjectId, wiki.slug);
              const chunks = ragService.splitIntoChunks(fullWiki.content || '');
              
              console.log(`[RAG ${ragConfigId}] [WIKI] Split into ${chunks.length} chunks`);
              
              // Create wiki chunks (paragraphs)
              const wikiChunks = chunks.map((content, i) => ({
                ragConfigId,
                sourceType: 'wiki',
                sourceId: wiki.slug,
                sourceUrl: fullWiki.slug ? `${gitlabUrl}/wikis/${fullWiki.slug}` : null,
                chunkIndex: i,
                content,
                metadata: { title: wiki.title, format: wiki.format }
              }));
              
              // Process this wiki's chunks immediately
              const processed = await processBatchChunks(wikiChunks, 'wiki');
              totalChunks += processed;
              wikiCount++;
              
              await ragService.markResourceIndexed(ragConfigId, 'wiki', wiki.slug);
              totalDocuments++;
              
              console.log(`[RAG ${ragConfigId}] [WIKI] ✓ "${wiki.title}" completed\n`);
            } catch (pageError) {
              console.warn(`[RAG ${ragConfigId}] [WIKI] ✗ Could not fetch wiki page "${wiki.title}": ${pageError.message}\n`);
            }
          }
        }
        
        console.log(`[RAG ${ragConfigId}] 📖 Wiki processing complete: ${wikiCount} wikis, ${totalChunks} chunks\n`);
      } catch (wikisFetchError) {
        // Wikis may not be enabled on this project
        console.warn(`[RAG ${ragConfigId}] [WIKI] ⚠️  Could not fetch wiki pages (project may not have wikis enabled): ${wikisFetchError.message}\n`);
      }
    } catch (err) {
      console.error(`[RAG ${ragConfigId}] [WIKI] Unexpected error in wiki processing:`, err.message);
    }

    // 2. Index Merge Requests - process each MR + its comments as atomic unit
    console.log(`[RAG ${ragConfigId}] 🔀 PHASE 2: Processing Merge Requests`);
    console.log(`[RAG ${ragConfigId}] Fetching merge requests...\n`);
    try {
      const mergeRequests = await gitlab.getMergeRequests(gitlabProjectId, 'merged');
      console.log(`[RAG ${ragConfigId}] Found ${mergeRequests.length} merge requests (processing up to 50)\n`);
      
      // Process each MR immediately
      for (let i = 0; i < mergeRequests.slice(0, 50).length; i++) {
        const mr = mergeRequests[i];
        const isIndexed = await ragService.isResourceIndexed(ragConfigId, 'merge_request', mr.iid.toString());
        if (!isIndexed) {
          console.log(`[RAG ${ragConfigId}] [MR] (${i+1}/${Math.min(50, mergeRequests.length)}) Processing MR #${mr.iid}: "${mr.title}"`);
          
          // Create content from MR
          const mrContent = `Title: ${mr.title}\n\nDescription: ${mr.description || 'No description'}\n\nState: ${mr.state}`;
          const chunks = ragService.splitIntoChunks(mrContent);
          console.log(`[RAG ${ragConfigId}] [MR] Split MR into ${chunks.length} chunks`);
          
          const mrChunks = chunks.map((content, i) => ({
            ragConfigId,
            sourceType: 'merge_request',
            sourceId: mr.iid.toString(),
            sourceUrl: mr.web_url,
            chunkIndex: i,
            content,
            metadata: { title: mr.title, author: mr.author?.name, mergedAt: mr.merged_at }
          }));
          
          // Get MR comments
          let commentChunks = [];
          try {
            const mrNotes = await gitlab.getMergeRequestNotes(gitlabProjectId, mr.iid);
            commentChunks = mrNotes
              .filter(note => note.body && note.body.length > 50)
              .map(note => ({
                ragConfigId,
                sourceType: 'merge_request_comment',
                sourceId: `${mr.iid}-comment-${note.id}`,
                sourceUrl: mr.web_url,
                chunkIndex: 0,
                content: note.body,
                metadata: { title: `Comment on: ${mr.title}`, author: note.author?.name }
              }));
            if (commentChunks.length > 0) {
              console.log(`[RAG ${ragConfigId}] [MR] Found ${commentChunks.length} comments`);
            }
          } catch (err) {
            console.warn(`[RAG ${ragConfigId}] [MR] ⚠️  Could not fetch comments for MR #${mr.iid}: ${err.message}`);
          }
          
          // Process MR + comments immediately as atomic unit
          const allMRChunks = [...mrChunks, ...commentChunks];
          const processed = await processBatchChunks(allMRChunks, 'mr');
          totalChunks += processed;
          mrCount++;
          
          await ragService.markResourceIndexed(ragConfigId, 'merge_request', mr.iid.toString());
          totalDocuments++;
          
          console.log(`[RAG ${ragConfigId}] [MR] ✓ MR #${mr.iid} completed\n`);
        }
      }
      
      console.log(`[RAG ${ragConfigId}] 🔀 Merge request processing complete: ${mrCount} MRs processed\n`);
    } catch (err) {
      console.error(`[RAG ${ragConfigId}] [MR] Error indexing MRs:`, err.message);
    }

    // 3. Index Issues with their comments - process each issue + comments as atomic unit
    console.log(`[RAG ${ragConfigId}] 🐛 PHASE 3: Processing Issues`);
    console.log(`[RAG ${ragConfigId}] Fetching issues...\n`);
    try {
      const issues = await gitlab.getProjectIssues(gitlabProjectId);
      console.log(`[RAG ${ragConfigId}] Found ${issues.length} issues\n`);
      
      // Process each issue immediately
      for (let i = 0; i < issues.length; i++) {
        const issue = issues[i];
        const isIndexed = await ragService.isResourceIndexed(ragConfigId, 'issue', issue.iid.toString());
        if (!isIndexed) {
          console.log(`[RAG ${ragConfigId}] [ISSUE] (${i+1}/${issues.length}) Processing issue #${issue.iid}: "${issue.title}"`);
          
          // Create content from issue
          const issueContent = `Title: ${issue.title}\n\nDescription: ${issue.description || 'No description'}\n\nState: ${issue.state}`;
          const chunks = ragService.splitIntoChunks(issueContent);
          console.log(`[RAG ${ragConfigId}] [ISSUE] Split issue into ${chunks.length} chunks`);
          
          const issueChunks = chunks.map((content, i) => ({
            ragConfigId,
            sourceType: 'issue',
            sourceId: issue.iid.toString(),
            sourceUrl: issue.web_url,
            chunkIndex: i,
            content,
            metadata: { title: issue.title, author: issue.author?.name, state: issue.state }
          }));
          
          // Get issue comments
          let commentChunks = [];
          try {
            const issueNotes = await gitlab.getIssueNotes(gitlabProjectId, issue.iid);
            commentChunks = issueNotes
              .filter(note => note.body && note.body.length > 50)
              .map(note => ({
                ragConfigId,
                sourceType: 'issue_comment',
                sourceId: `${issue.iid}-comment-${note.id}`,
                sourceUrl: issue.web_url,
                chunkIndex: 0,
                content: note.body,
                metadata: { title: `Comment on: ${issue.title}`, author: note.author?.name }
              }));
            if (commentChunks.length > 0) {
              console.log(`[RAG ${ragConfigId}] [ISSUE] Found ${commentChunks.length} comments`);
            }
          } catch (err) {
            console.warn(`[RAG ${ragConfigId}] [ISSUE] ⚠️  Could not fetch comments for issue #${issue.iid}: ${err.message}`);
          }
          
          // Process issue + its comments immediately as atomic unit
          const allIssueChunks = [...issueChunks, ...commentChunks];
          const processed = await processBatchChunks(allIssueChunks, 'issue');
          totalChunks += processed;
          issueCount++;
          
          await ragService.markResourceIndexed(ragConfigId, 'issue', issue.iid.toString());
          totalDocuments++;
          
          console.log(`[RAG ${ragConfigId}] [ISSUE] ✓ Issue #${issue.iid} completed\n`);
        }
      }
      
      console.log(`[RAG ${ragConfigId}] 🐛 Issue processing complete: ${issueCount} issues processed\n`);
    } catch (err) {
      console.error(`[RAG ${ragConfigId}] [ISSUE] Error indexing issues:`, err.message);
    }

    // Update RAG config with success
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    
    await query(
      `UPDATE gitlab_rag_config 
       SET rag_status = 'completed', 
           total_documents = $1, 
           total_chunks = $2,
           last_indexed_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [totalDocuments, totalChunks, ragConfigId]
    );

    // Log activity: RAG creation completed
    await query(
      `UPDATE activity_logs 
       SET status = $1, extra_data = $2
       WHERE entity_id = $3 AND entity_type = 'RAG' AND status = 'processing'`,
      ['completed', JSON.stringify({ 
        totalTime: elapsedSeconds,
        documents: totalDocuments, 
        chunks: totalChunks,
        wikis: wikiCount,
        mergeRequests: mrCount,
        issues: issueCount
      }), ragConfigId]
    );

    console.log(`${'='.repeat(60)}`);
    console.log(`[RAG ${ragConfigId}] ✅ RAG CREATION COMPLETED SUCCESSFULLY`);
    console.log(`[RAG ${ragConfigId}] Total time: ${elapsedSeconds}s`);
    console.log(`[RAG ${ragConfigId}] Summary:`);
    console.log(`[RAG ${ragConfigId}]   - Wikis: ${wikiCount}`);
    console.log(`[RAG ${ragConfigId}]   - Merge Requests: ${mrCount}`);
    console.log(`[RAG ${ragConfigId}]   - Issues: ${issueCount}`);
    console.log(`[RAG ${ragConfigId}]   - Total Documents: ${totalDocuments}`);
    console.log(`[RAG ${ragConfigId}]   - Total Chunks: ${totalChunks}`);
    console.log(`${'='.repeat(60)}\n`);
  } catch (error) {
    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.error(`${'='.repeat(60)}`);
    console.error(`[RAG ${ragConfigId}] ❌ RAG CREATION FAILED`);
    console.error(`[RAG ${ragConfigId}] Time elapsed: ${elapsedSeconds}s`);
    console.error(`[RAG ${ragConfigId}] Error: ${error.message}`);
    console.error(`${'='.repeat(60)}\n`);
    
    // Update status to failed
    await query(
      `UPDATE gitlab_rag_config 
       SET rag_status = 'failed', error_message = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
      [error.message, ragConfigId]
    );

    // Log activity: RAG creation failed
    await query(
      `UPDATE activity_logs 
       SET status = $1, extra_data = $2
       WHERE entity_id = $3 AND entity_type = 'RAG' AND status = 'processing'`,
      ['failed', JSON.stringify({ 
        totalTime: elapsedSeconds,
        error: error.message
      }), ragConfigId]
    );
  }
}

/**
 * Get RAG status
 * GET /api/rag/status/:workspaceId
 */
router.get('/status/:workspaceId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const result = await query(
      `SELECT * FROM gitlab_rag_config WHERE workspace_id = $1`,
      [workspaceId]
    );

    if (result.rows.length === 0) {
      return res.json({ ragEnabled: false });
    }

    const config = result.rows[0];
    res.json({
      ragEnabled: config.rag_enabled,
      status: config.rag_status,
      totalDocuments: config.total_documents,
      totalChunks: config.total_chunks,
      lastIndexedAt: config.last_indexed_at,
      errorMessage: config.error_message
    });
  } catch (error) {
    console.error('RAG status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Query the RAG
 * POST /api/rag/query
 */
router.post('/query', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, question } = req.body;

    if (!workspaceId || !question) {
      return res.status(400).json({ error: 'Workspace ID and question are required' });
    }

    // Get RAG config
    const configResult = await query(
      `SELECT id, rag_status FROM gitlab_rag_config 
       WHERE workspace_id = $1 AND rag_enabled = true`,
      [workspaceId]
    );

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'RAG not enabled for this workspace' });
    }

    const config = configResult.rows[0];

    if (config.rag_status !== 'completed') {
      return res.status(400).json({ 
        error: 'RAG is not ready yet',
        status: config.rag_status
      });
    }

    // Query the RAG
    const result = await ragService.answerQuestion(config.id, question);

    res.json({
      success: true,
      answer: result.answer,
      sources: result.sources
    });
  } catch (error) {
    console.error('RAG query error:', error);
    res.status(500).json({ error: 'Failed to query RAG' });
  }
});

module.exports = router;
