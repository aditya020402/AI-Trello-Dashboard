const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();

/**
 * Get all lists for a board
 * GET /api/boards/:boardId/lists
 */
router.get('/board/:boardId', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;

    // Verify user has access to board via workspace
    const boardCheck = await query(
      `SELECT b.id FROM boards b
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE b.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [boardId, req.userId]
    );

    if (boardCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get lists
    const result = await query(
      'SELECT * FROM lists WHERE board_id = $1 ORDER BY order_index ASC',
      [boardId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new list
 * POST /api/lists
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { boardId, title } = req.body;

    if (!boardId || !title) {
      return res.status(400).json({ error: 'Board ID and title are required' });
    }

    // Verify user has access to board via workspace
    const boardCheck = await query(
      `SELECT b.id, b.workspace_id FROM boards b
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE b.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [boardId, req.userId]
    );

    if (boardCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const board = boardCheck.rows[0];

    // Get max order for new list
    const maxOrderResult = await query(
      'SELECT MAX(order_index) as max_order FROM lists WHERE board_id = $1',
      [boardId]
    );
    const maxOrder = maxOrderResult.rows[0].max_order || -1;

    // Create list
    const result = await query(
      'INSERT INTO lists (board_id, title, order_index) VALUES ($1, $2, $3) RETURNING *',
      [boardId, title, maxOrder + 1]
    );

    const list = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, board.workspace_id, 'CREATE', 'LIST', list.id, list.title]
    );

    res.status(201).json(list);
  } catch (error) {
    console.error('Create list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a list
 * PATCH /api/lists/:id
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, orderIndex } = req.body;

    // Verify user has access to board via workspace
    const listCheck = await query(
      `SELECT l.*, b.workspace_id FROM lists l
       JOIN boards b ON l.board_id = b.id
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE l.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [id, req.userId]
    );

    if (listCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const listData = listCheck.rows[0];

    // Update list
    const result = await query(
      `UPDATE lists 
       SET title = COALESCE($1, title),
           order_index = COALESCE($2, order_index),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [title, orderIndex, id]
    );

    const list = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, listData.workspace_id, 'UPDATE', 'LIST', id, list.title]
    );

    res.json(list);
  } catch (error) {
    console.error('Update list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a list
 * DELETE /api/lists/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user has access to board via workspace and get list title
    const listResult = await query(
      `SELECT l.id, l.title, b.workspace_id FROM lists l
       JOIN boards b ON l.board_id = b.id
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $2
       WHERE l.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [id, req.userId]
    );

    if (listResult.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const list = listResult.rows[0];

    // Log activity before deletion
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, list.workspace_id, 'DELETE', 'LIST', list.id, list.title]
    );

    // Delete list (cascade will handle cards)
    await query('DELETE FROM lists WHERE id = $1', [id]);

    res.json({ message: 'List deleted successfully' });
  } catch (error) {
    console.error('Delete list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
