const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();

/**
 * Get all cards for a list
 * GET /api/lists/:listId/cards
 */
router.get('/list/:listId', authenticateToken, async (req, res) => {
  try {
    const { listId } = req.params;

    // Verify user has access to board via workspace
    const listCheck = await query(
      `SELECT l.* FROM lists l
       JOIN boards b ON l.board_id = b.id
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE l.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [listId, req.userId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get cards
    const result = await query(
      'SELECT * FROM cards WHERE list_id = $1 ORDER BY order_index ASC',
      [listId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get cards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new card
 * POST /api/cards
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { listId, title, description } = req.body;

    if (!listId || !title) {
      return res.status(400).json({ error: 'List ID and title are required' });
    }

    // Verify user has access to board via workspace
    const listCheck = await query(
      `SELECT l.*, b.workspace_id FROM lists l
       JOIN boards b ON l.board_id = b.id
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE l.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [listId, req.userId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const listData = listCheck.rows[0];

    // Get max order for new card
    const maxOrderResult = await query(
      'SELECT MAX(order_index) as max_order FROM cards WHERE list_id = $1',
      [listId]
    );
    const maxOrder = maxOrderResult.rows[0].max_order || -1;

    // Create card
    const result = await query(
      'INSERT INTO cards (list_id, title, description, order_index) VALUES ($1, $2, $3, $4) RETURNING *',
      [listId, title, description || null, maxOrder + 1]
    );

    const card = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, listData.workspace_id, 'CREATE', 'CARD', card.id, card.title]
    );

    res.status(201).json(card);
  } catch (error) {
    console.error('Create card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a card
 * PATCH /api/cards/:id
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, listId, orderIndex } = req.body;

    // Verify user has access to board via workspace
    const cardCheck = await query(
      `SELECT c.*, b.workspace_id FROM cards c
       JOIN lists l ON c.list_id = l.id
       JOIN boards b ON l.board_id = b.id
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE c.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [id, req.userId]
    );

    if (cardCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const cardData = cardCheck.rows[0];

    // If moving to another list, verify that list is accessible
    if (listId) {
      const newListCheck = await query(
        `SELECT l.* FROM lists l
         JOIN boards b ON l.board_id = b.id
         JOIN workspaces w ON b.workspace_id = w.id
         LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
         WHERE l.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
        [listId, req.userId]
      );

      if (newListCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Unauthorized - target list not found' });
      }
    }

    // Update card
    const result = await query(
      `UPDATE cards 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           list_id = COALESCE($3, list_id),
           order_index = COALESCE($4, order_index),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [title, description, listId, orderIndex, id]
    );

    const card = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, cardData.workspace_id, 'UPDATE', 'CARD', id, card.title]
    );

    res.json(card);
  } catch (error) {
    console.error('Update card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a card
 * DELETE /api/cards/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user has access to board via workspace and get card title
    const cardResult = await query(
      `SELECT c.id, c.title, b.workspace_id FROM cards c
       JOIN lists l ON c.list_id = l.id
       JOIN boards b ON l.board_id = b.id
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE c.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [id, req.userId]
    );

    if (cardResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const card = cardResult.rows[0];

    // Log activity before deletion
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, card.workspace_id, 'DELETE', 'CARD', card.id, card.title]
    );

    // Delete card
    await query('DELETE FROM cards WHERE id = $1', [id]);

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    console.error('Delete card error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
