const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();

/**
 * Get all workspaces for current user
 * GET /api/workspaces
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT w.*, wm.role 
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
       WHERE w.owner_id = $1 OR wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get workspaces error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get single workspace by ID
 * GET /api/workspaces/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT w.*, wm.role 
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
       WHERE w.id = $2 AND (w.owner_id = $1 OR wm.user_id = $1)`,
      [req.userId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new workspace
 * POST /api/workspaces
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, iconColor } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      `INSERT INTO workspaces (name, description, icon_color, owner_id) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, description || null, iconColor || '#0ea5e9', req.userId]
    );

    const workspace = result.rows[0];

    // Add owner as member
    await query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) 
       VALUES ($1, $2, $3)`,
      [workspace.id, req.userId, 'owner']
    );

    // Log activity
    const createTitle = workspace.name || 'Unnamed Workspace';
    console.log('Creating workspace:', workspace.id, 'name:', createTitle);
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, workspace.id, 'CREATE', 'WORKSPACE', workspace.id, createTitle]
    );

    res.status(201).json({ ...workspace, role: 'owner' });
  } catch (error) {
    console.error('Create workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a workspace
 * PATCH /api/workspaces/:id
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, iconColor } = req.body;

    // Verify ownership or admin role
    const workspaceResult = await query(
      `SELECT w.*, wm.role 
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
       WHERE w.id = $2 AND (w.owner_id = $1 OR wm.role IN ('owner', 'admin'))`,
      [req.userId, id]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found or insufficient permissions' });
    }

    const workspace = workspaceResult.rows[0];

    // Update workspace
    const result = await query(
      `UPDATE workspaces 
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           icon_color = COALESCE($3, icon_color),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [name, description, iconColor, id]
    );

    const updatedWorkspace = result.rows[0];

    // Log activity with workspace name from database
    const updateTitle = updatedWorkspace.name || workspace.name || 'Unnamed Workspace';
    console.log('Updating workspace:', id, 'new name:', updateTitle);
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, id, 'UPDATE', 'WORKSPACE', id, updateTitle]
    );

    res.json({ ...updatedWorkspace, role: workspace.role });
  } catch (error) {
    console.error('Update workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a workspace
 * DELETE /api/workspaces/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const workspaceResult = await query(
      'SELECT * FROM workspaces WHERE id = $1 AND owner_id = $2',
      [id, req.userId]
    );

    if (workspaceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found or insufficient permissions' });
    }

    const workspace = workspaceResult.rows[0];

    // Log activity before deletion
    const deleteTitle = workspace.name || 'Unnamed Workspace';
    console.log('Deleting workspace:', workspace.id, 'name:', deleteTitle);
    await query(
      `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.userId, workspace.id, 'DELETE', 'WORKSPACE', workspace.id, deleteTitle]
    );

    // Delete workspace (cascades to boards, lists, cards, members)
    await query('DELETE FROM workspaces WHERE id = $1', [id]);

    res.json({ message: 'Workspace deleted successfully' });
  } catch (error) {
    console.error('Delete workspace error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
