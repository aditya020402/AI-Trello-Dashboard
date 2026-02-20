const express = require('express');
const { query } = require('../db');
const { orchestrate } = require('../services/agentOrchestrator');

const router = express.Router();

/**
 * Helper function to get RAG config ID for a workspace
 */
async function getRagConfigId(workspaceId) {
  if (!workspaceId) return null;
  
  try {
    const result = await query(
      `SELECT id, rag_status FROM gitlab_rag_config 
       WHERE workspace_id = $1 AND rag_enabled = true AND rag_status = 'completed'`,
      [workspaceId]
    );
    
    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch (err) {
    console.error('[Chat] Error fetching RAG config:', err);
    return null;
  }
}

/**
 * Unified orchestrator endpoint - Routes to specialized agents
 * POST /chat/orchestrate
 * Can be used for general queries without card selection
 */
router.post('/orchestrate', async (req, res) => {
  const { message, selectedCards = [], workspaceId } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const ragConfigId = await getRagConfigId(workspaceId);

    const result = await orchestrate({
      userMessage: message,
      selectedCards,
      workspaceId,
      ragConfigId,
    });

    // Return full orchestrator result with agent type info
    return res.json({
      success: true,
      agentType: result.type,
      ...result, // Include all fields from agent (response, data, sources, etc.)
    });
  } catch (error) {
    console.error('[Chat Orchestrator] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Legacy endpoint - Chat with AI for single card
 * POST /chat/card/:cardId
 * Transformed through orchestrator
 */
router.post('/card/:cardId', async (req, res) => {
  const { message, cardContent } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    const workspaceId = cardContent?.workspaceId || null;
    const ragConfigId = await getRagConfigId(workspaceId);
    const selectedCards = cardContent ? [cardContent] : [];

    const result = await orchestrate({
      userMessage: message,
      selectedCards,
      workspaceId,
      ragConfigId,
    });

    // Transform orchestrator result to legacy format, but include agent type
    return res.json({
      success: true,
      agentType: result.type,
      response: result.response || result.data?.description || JSON.stringify(result),
      fullResult: result, // Include full result for frontend to use if needed
    });
  } catch (error) {
    console.error('[Single Card Chat] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Legacy endpoint - Multi-card chat
 * POST /chat/multi-card
 * Transformed through orchestrator
 */
router.post('/multi-card', async (req, res) => {
  const { message, cardsContent } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!cardsContent || !Array.isArray(cardsContent) || cardsContent.length === 0) {
    return res.status(400).json({ error: 'At least one card is required' });
  }

  try {
    const workspaceId = cardsContent[0]?.workspaceId || null;
    const ragConfigId = await getRagConfigId(workspaceId);

    const result = await orchestrate({
      userMessage: message,
      selectedCards: cardsContent,
      workspaceId,
      ragConfigId,
    });

    // Transform orchestrator result to legacy format, but include agent type
    return res.json({
      success: true,
      agentType: result.type,
      response: result.response || result.data?.description || JSON.stringify(result),
      fullResult: result,
    });
  } catch (error) {
    console.error('[Multi-Card Chat] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Legacy endpoint - AI-assisted ticket creation
 * POST /chat/create-ticket
 * Routes to ticket creation agent through orchestrator
 */
router.post('/create-ticket', async (req, res) => {
  const { userRequest, boardContext } = req.body;

  if (!userRequest) {
    return res.status(400).json({ error: 'User request is required' });
  }

  try {
    const result = await orchestrate({
      userMessage: userRequest,
      selectedCards: [],
      workspaceId: null,
      ragConfigId: null,
    });

    // Check if it's a ticket creation result
    if (result.type !== 'ticket_creation') {
      return res.status(400).json({ error: 'Request was not classified as ticket creation' });
    }

    return res.json({
      success: true,
      agentType: result.type,
      ticketData: result.data,
      fullResult: result,
    });
  } catch (error) {
    console.error('[Create Ticket] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Legacy endpoint - AI-assisted ticket editing
 * POST /chat/edit-ticket
 * Routes to update agent through orchestrator
 */
router.post('/edit-ticket', async (req, res) => {
  const { userRequest, cardContent } = req.body;

  if (!userRequest) {
    return res.status(400).json({ error: 'User request is required' });
  }

  if (!cardContent || !cardContent.title) {
    return res.status(400).json({ error: 'Card content is required' });
  }

  try {
    const result = await orchestrate({
      userMessage: userRequest,
      selectedCards: [cardContent],
      workspaceId: null,
      ragConfigId: null,
    });

    // Check if it's a ticket update result
    if (result.type !== 'ticket_update') {
      return res.status(400).json({ error: 'Request was not classified as ticket update' });
    }

    return res.json({
      success: true,
      agentType: result.type,
      ticketData: result.data,
      cardId: result.cardId,
      fullResult: result,
    });
  } catch (error) {
    console.error('[Edit Ticket] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
