const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware');

const router = express.Router();

/**
 * Get activity logs for current user
 * GET /api/activity?boardId=123&workspaceId=456 (optional filters)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const boardId = req.query.boardId;
    const workspaceId = req.query.workspaceId;

    let queryText;
    let queryParams;

    if (workspaceId) {
      // Filter activities for specific workspace
      queryText = `
        SELECT al.*, u.username, u.profile_photo_url
        FROM activity_logs al
        INNER JOIN workspaces w ON al.workspace_id = w.id
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        LEFT JOIN users u ON al.user_id = u.id
        WHERE (w.owner_id = $1 OR wm.user_id = $1)
          AND al.workspace_id = $2
        ORDER BY al.created_at DESC 
        LIMIT $3 OFFSET $4
      `;
      queryParams = [req.userId, workspaceId, limit, offset];
    } else if (boardId) {
      // Filter activities for specific board
      queryText = `
        SELECT al.*, u.username, u.profile_photo_url
        FROM activity_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.user_id = $1 
          AND (
            (al.entity_type = 'BOARD' AND al.entity_id = $2)
            OR (al.entity_type = 'LIST' AND al.entity_id IN (SELECT id FROM lists WHERE board_id = $2))
            OR (al.entity_type = 'CARD' AND al.entity_id IN (SELECT c.id FROM cards c JOIN lists l ON c.list_id = l.id WHERE l.board_id = $2))
          )
        ORDER BY al.created_at DESC 
        LIMIT $3 OFFSET $4
      `;
      queryParams = [req.userId, boardId, limit, offset];
    } else {
      // Get all activities for user across all workspaces
      queryText = `
        SELECT al.*, u.username, u.profile_photo_url
        FROM activity_logs al
        LEFT JOIN workspaces w ON al.workspace_id = w.id
        LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = $1
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.user_id = $1 OR w.owner_id = $1 OR wm.user_id = $1
        ORDER BY al.created_at DESC 
        LIMIT $2 OFFSET $3
      `;
      queryParams = [req.userId, limit, offset];
    }

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Get activity logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
