const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();

/**
 * Get all boards for current user (optionally filtered by workspace)
 * GET /api/boards?workspaceId=123
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.query;
    
    let queryText;
    let queryParams;
    
    if (workspaceId) {
      // Get boards for specific workspace
      queryText = `
        SELECT b.*, w.name as workspace_name FROM boards b
        INNER JOIN workspaces w ON b.workspace_id = w.id
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        WHERE b.workspace_id = $2 AND (w.owner_id = $1 OR wm.user_id = $1)
        ORDER BY b.created_at DESC
      `;
      queryParams = [req.userId, workspaceId];
    } else {
      // Get all boards user has access to
      queryText = `
        SELECT b.*, w.name as workspace_name FROM boards b
        INNER JOIN workspaces w ON b.workspace_id = w.id
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        WHERE w.owner_id = $1 OR wm.user_id = $1
        ORDER BY b.created_at DESC
      `;
      queryParams = [req.userId];
    }
    
    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get single board by ID
 * GET /api/boards/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT b.*, w.name as workspace_name FROM boards b
       INNER JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
       WHERE b.id = $2 AND (w.owner_id = $1 OR wm.user_id = $1)`,
      [req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new board
 * POST /api/boards
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { workspaceId, title, imageId, imageThumbUrl, imageFullUrl, imageUserName, imageLinkHTML } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!workspaceId) {
      return res.status(400).json({ error: 'Workspace ID is required' });
    }

    // Verify user has access to workspace
    const workspaceCheck = await query(
      `SELECT w.id FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
       WHERE w.id = $2 AND (w.owner_id = $1 OR wm.user_id = $1)`,
      [req.userId, workspaceId]
    );

    if (workspaceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied to workspace' });
    }

    const result = await query(
      `INSERT INTO boards (workspace_id, title, image_id, image_thumb_url, image_full_url, image_user_name, image_link_html) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [workspaceId, title, imageId || null, imageThumbUrl || null, imageFullUrl || null, imageUserName || null, imageLinkHTML || null]
    );

    const board = result.rows[0];

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, workspaceId, 'CREATE', 'BOARD', board.id, board.title]
    );

    res.status(201).json(board);
  } catch (error) {
    console.error('Create board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a board
 * PATCH /api/boards/:id
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, imageId, imageThumbUrl, imageFullUrl, imageUserName, imageLinkHTML } = req.body;

    // Verify access
    const boardResult = await query(
      `SELECT b.*, w.owner_id FROM boards b
       INNER JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
       WHERE b.id = $2 AND (w.owner_id = $1 OR wm.user_id = $1)`,
      [req.userId, id]
    );

    if (boardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const board = boardResult.rows[0];

    // Update board
    const result = await query(
      `UPDATE boards 
       SET title = COALESCE($1, title),
           image_id = COALESCE($2, image_id),
           image_thumb_url = COALESCE($3, image_thumb_url),
           image_full_url = COALESCE($4, image_full_url),
           image_user_name = COALESCE($5, image_user_name),
           image_link_html = COALESCE($6, image_link_html),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [title, imageId, imageThumbUrl, imageFullUrl, imageUserName, imageLinkHTML, id]
    );

    // Log activity
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, board.workspace_id, 'UPDATE', 'BOARD', id, title || board.title]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a board
 * DELETE /api/boards/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify access and get board title
    const boardResult = await query(
      `SELECT b.id, b.title, b.workspace_id FROM boards b
       INNER JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
       WHERE b.id = $2 AND (w.owner_id = $1 OR wm.role IN ('owner', 'admin'))`,
      [req.userId, id]
    );

    if (boardResult.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const board = boardResult.rows[0];

    // Log activity before deletion
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, board.workspace_id, 'DELETE', 'BOARD', board.id, board.title]
    );

    // Delete board (cascade will handle lists and cards)
    await query('DELETE FROM boards WHERE id = $1', [id]);

    res.json({ message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
