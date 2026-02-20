const { OpenAI } = require('openai');
const { query } = require('../db');

class RAGService {
  constructor() {
    this.openai = null;
  }

  // Initialize OpenAI client
  getOpenAIClient() {
    if (!this.openai) {
      const apiKey = 
      if (!apiKey) {
        throw new Error('OpenAI API key is not configured');
      }
      this.openai = new OpenAI({ apiKey: });
    }
    return this.openai;
  }

  /**
   * Split text into chunks for embedding
   */
  splitIntoChunks(text, maxChunkSize = 1500) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    
    let currentChunk = '';
    for (const paragraph of paragraphs) {
      if ((currentChunk + paragraph).length > maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks.filter(c => c.length > 50); // Filter out very small chunks
  }

  /**
   * Create embedding for a text chunk
   */
  async createEmbedding(text) {
    const openai = this.getOpenAIClient();
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  /**
   * Create embeddings for a small batch of texts (10-20 at a time)
   * Processes immediately without waiting for larger batches
   */
  async createBatchEmbeddings(texts, batchSize = 10) {
    const openai = this.getOpenAIClient();
    const allEmbeddings = [];
    const startTime = Date.now();
    
    console.log(`\n[EMBED] Starting batch embedding for ${texts.length} texts (batch size: ${batchSize})`);
    
    // Process in small batches of 10 for real-time processing
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(texts.length / batchSize);
      
      try {
        console.log(`[EMBED] Processing batch ${batchNum}/${totalBatches} (${batch.length} items)...`);
        
        const response = await this.retryWithBackoff(async () => {
          return await openai.embeddings.create({
            model: 'text-embedding-3-small',
            input: batch,
          });
        });
        
        allEmbeddings.push(...response.data.map(item => item.embedding));
        const progress = Math.min(i + batchSize, texts.length);
        const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[EMBED] ✓ Progress: ${progress}/${texts.length} chunks (${elapsedSeconds}s elapsed)`);
      } catch (error) {
        console.error(`[EMBED] ✗ Error in batch ${batchNum}:`, error.message);
        throw error;
      }
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[EMBED] ✓ Completed: All ${texts.length} chunks embedded in ${totalTime}s\n`);
    
    return allEmbeddings;
  }

  /**
   * Retry function with exponential backoff for rate limits
   */
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        // Check if it's a rate limit error
        if (error.status === 429 || error.code === 'rate_limit_exceeded') {
          const delay = initialDelay * Math.pow(2, attempt);
          console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // Non-rate-limit error, don't retry
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      magnitude1 += vec1[i] * vec1[i];
      magnitude2 += vec2[i] * vec2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Store a document chunk with embedding
   */
  async storeChunk(ragConfigId, sourceType, sourceId, sourceUrl, chunkIndex, content, metadata = {}) {
    try {
      // Create embedding
      const embedding = await this.createEmbedding(content);
      const embeddingJson = JSON.stringify(embedding);
      
      // Store in database
      const result = await query(
        `INSERT INTO rag_document_chunks 
         (rag_config_id, source_type, source_id, source_url, chunk_index, content, embedding, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [ragConfigId, sourceType, sourceId, sourceUrl, chunkIndex, content, embeddingJson, JSON.stringify(metadata)]
      );
      
      return result.rows[0].id;
    } catch (error) {
      console.error('Error storing chunk:', error);
      throw error;
    }
  }

  /**
   * Store chunks with their embeddings efficiently (small batches of 10-20)
   */
  async storeBatchChunks(chunks) {
    try {
      if (chunks.length === 0) {
        console.log(`[STORE] No chunks to store`);
        return [];
      }
      
      // Build multi-row insert query for small batches
      const values = [];
      const placeholders = [];
      
      chunks.forEach((chunk, idx) => {
        const offset = idx * 8;
        placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`);
        values.push(
          chunk.ragConfigId,
          chunk.sourceType,
          chunk.sourceId,
          chunk.sourceUrl,
          chunk.chunkIndex,
          chunk.content,
          JSON.stringify(chunk.embedding),
          JSON.stringify(chunk.metadata)
        );
      });
      
      console.log(`[STORE] Storing ${chunks.length} chunks to database...`);
      
      const sql = `
        INSERT INTO rag_document_chunks 
        (rag_config_id, source_type, source_id, source_url, chunk_index, content, embedding, metadata)
        VALUES ${placeholders.join(', ')}
        RETURNING id
      `;
      
      const result = await query(sql, values);
      console.log(`[STORE] ✓ Successfully stored ${result.rows.length} chunks\n`);
      return result.rows.map(row => row.id);
    } catch (error) {
      console.error(`[STORE] ✗ Error storing batch chunks:`, error.message);
      throw error;
    }
  }

  /**
   * Find similar chunks to a query
   */
  async findSimilarChunks(ragConfigId, queryText, topK = 5) {
    try {
      // Create embedding for query
      const queryEmbedding = await this.createEmbedding(queryText);
      
      // Get all chunks for this RAG config
      const chunksResult = await query(
        `SELECT id, content, embedding, source_type, source_url, metadata
         FROM rag_document_chunks
         WHERE rag_config_id = $1`,
        [ragConfigId]
      );
      
      if (chunksResult.rows.length === 0) {
        return [];
      }
      
      // Calculate similarities
      const chunksWithScores = chunksResult.rows.map(chunk => {
        const chunkEmbedding = JSON.parse(chunk.embedding);
        const similarity = this.cosineSimilarity(queryEmbedding, chunkEmbedding);
        
        return {
          id: chunk.id,
          content: chunk.content,
          sourceType: chunk.source_type,
          sourceUrl: chunk.source_url,
          metadata: chunk.metadata,
          similarity
        };
      });
      
      // Sort by similarity and return top K
      chunksWithScores.sort((a, b) => b.similarity - a.similarity);
      return chunksWithScores.slice(0, topK);
    } catch (error) {
      console.error('Error finding similar chunks:', error);
      throw error;
    }
  }

  /**
   * Answer a question using RAG
   */
  async answerQuestion(ragConfigId, question) {
    try {
      const openai = this.getOpenAIClient();
      
      // Find relevant chunks
      const relevantChunks = await this.findSimilarChunks(ragConfigId, question, 5);
      
      if (relevantChunks.length === 0) {
        return {
          answer: "I don't have enough information in the knowledge base to answer this question.",
          sources: []
        };
      }
      
      // Build context from chunks
      const context = relevantChunks.map((chunk, idx) => 
        `[Source ${idx + 1}]: ${chunk.content}`
      ).join('\n\n');
      
      // Create prompt
      const systemMessage = `You are a helpful assistant that answers questions based on the provided context from GitLab wikis, merge requests, and issue comments.

Use the following context to answer the user's question. If the context doesn't contain enough information, say so clearly.

Context:
${context}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: question }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      const answer = completion.choices[0]?.message?.content || 'No answer generated';
      
      // Return answer with sources
      return {
        answer,
        sources: relevantChunks.map(chunk => ({
          type: chunk.sourceType,
          url: chunk.sourceUrl,
          similarity: chunk.similarity,
          preview: chunk.content.substring(0, 200) + '...',
          metadata: chunk.metadata || {}
        }))
      };
    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  }

  /**
   * Mark a resource as indexed
   */
  async markResourceIndexed(ragConfigId, resourceType, resourceId, gitlabUpdatedAt = null) {
    try {
      await query(
        `INSERT INTO rag_indexed_resources (rag_config_id, resource_type, resource_id, gitlab_updated_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (rag_config_id, resource_type, resource_id) 
         DO UPDATE SET indexed_at = CURRENT_TIMESTAMP, gitlab_updated_at = $4`,
        [ragConfigId, resourceType, resourceId, gitlabUpdatedAt]
      );
    } catch (error) {
      console.error('Error marking resource indexed:', error);
      throw error;
    }
  }

  /**
   * Check if a resource has been indexed
   */
  async isResourceIndexed(ragConfigId, resourceType, resourceId) {
    try {
      const result = await query(
        `SELECT id FROM rag_indexed_resources
         WHERE rag_config_id = $1 AND resource_type = $2 AND resource_id = $3`,
        [ragConfigId, resourceType, resourceId]
      );
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking if resource indexed:', error);
      return false;
    }
  }
}

module.exports = new RAGService();
