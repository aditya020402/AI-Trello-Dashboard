const express = require('express');
const { query } = require('../db');
const { authenticateToken } = require('../middleware');
const GitLabClient = require('../services/gitlabClient');

const router = express.Router();

/**
 * Verify GitLab token and get user info
 * POST /api/gitlab/verify
 */
router.post('/verify', authenticateToken, async (req, res) => {
  try {
    const { token, gitlabUrl } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'GitLab personal access token is required' });
    }

    const gitlab = new GitLabClient(gitlabUrl || 'https://gitlab.com', token);

    try {
      const user = await gitlab.getCurrentUser();
      res.json({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          avatar_url: user.avatar_url
        }
      });
    } catch (error) {
      res.status(401).json({ error: 'Invalid GitLab token or URL' });
    }
  } catch (error) {
    console.error('GitLab verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's GitLab projects
 * POST /api/gitlab/projects
 */
router.post('/projects', authenticateToken, async (req, res) => {
  try {
    const { token, gitlabUrl } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'GitLab token is required' });
    }

    const gitlab = new GitLabClient(gitlabUrl || 'https://gitlab.com', token);

    try {
      const projects = await gitlab.getUserProjects();
      const formattedProjects = projects.map(p => ({
        id: p.id,
        name: p.name,
        path: p.path,
        description: p.description,
        url: p.web_url,
        avatar_url: p.avatar_url
      }));

      res.json({ projects: formattedProjects });
    } catch (error) {
      res.status(401).json({ error: 'Failed to fetch GitLab projects' });
    }
  } catch (error) {
    console.error('GitLab projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get issues from a GitLab project assigned to current user
 * POST /api/gitlab/issues
 */
router.post('/issues', authenticateToken, async (req, res) => {
  try {
    const { projectId, token, gitlabUrl } = req.body;

    if (!projectId || !token) {
      return res.status(400).json({ error: 'Project ID and GitLab token are required' });
    }

    const gitlab = new GitLabClient(gitlabUrl || 'https://gitlab.com', token);

    try {
      const user = await gitlab.getCurrentUser();
      const issues = await gitlab.getProjectIssues(projectId, user.id);

      const formattedIssues = await Promise.all(
        issues.map(async (issue) => {
          try {
            // Get issue details and notes
            const details = await gitlab.getIssueDetails(projectId, issue.iid);
            const notes = await gitlab.getIssueNotes(projectId, issue.iid);

            // Combine description and notes into full description
            let fullDescription = issue.description || '';
            if (notes && notes.length > 0) {
              fullDescription += '\n\n--- Comments ---\n';
              notes.forEach(note => {
                if (!note.system) { // Skip system notes
                  fullDescription += `\n**${note.author.name}** (${new Date(note.created_at).toLocaleString()}):\n${note.body}\n`;
                }
              });
            }

            return {
              id: issue.id,
              iid: issue.iid,
              title: issue.title,
              description: fullDescription,
              url: issue.web_url,
              state: issue.state,
              author: issue.author.name,
              created_at: issue.created_at
            };
          } catch (err) {
            console.error(`Failed to get details for issue ${issue.iid}:`, err);
            // Return basic issue info if details fail
            return {
              id: issue.id,
              iid: issue.iid,
              title: issue.title,
              description: issue.description || '',
              url: issue.web_url,
              state: issue.state,
              author: issue.author.name,
              created_at: issue.created_at
            };
          }
        })
      );

      res.json({ issues: formattedIssues });
    } catch (error) {
      console.error('GitLab issues error:', error);
      res.status(401).json({ error: 'Failed to fetch GitLab issues' });
    }
  } catch (error) {
    console.error('Get issues error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get GitLab wiki pages for a project
 * POST /api/gitlab/wikis
 */
router.post('/wikis', authenticateToken, async (req, res) => {
  try {
    const { projectId, token, gitlabUrl } = req.body;

    if (!projectId || !token) {
      return res.status(400).json({ error: 'Project ID and GitLab token are required' });
    }

    const gitlab = new GitLabClient(gitlabUrl || 'https://gitlab.com', token);

    try {
      const wikis = await gitlab.getWikiPages(projectId);

      const formattedWikis = wikis.map(wiki => ({
        slug: wiki.slug,
        title: wiki.title,
        format: wiki.format
      }));

      res.json({ wikis: formattedWikis });
    } catch (error) {
      console.error('GitLab wikis error:', error);
      // Return empty array if wikis not available (project may not have wikis enabled)
      res.json({ wikis: [] });
    }
  } catch (error) {
    console.error('Get wikis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Save GitLab token for user
 * POST /api/gitlab/save-token
 */
router.post('/save-token', authenticateToken, async (req, res) => {
  try {
    const { token, gitlabUrl } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'GitLab token is required' });
    }

    try {
      // Upsert token
      const result = await query(
        `INSERT INTO user_gitlab_tokens (user_id, gitlab_token, gitlab_url) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (user_id) 
         DO UPDATE SET gitlab_token = $2, gitlab_url = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [req.userId, token, gitlabUrl || 'https://gitlab.com']
      );

      res.json({ success: true, message: 'GitLab token saved' });
    } catch (error) {
      console.error('Save token error:', error);
      res.status(500).json({ error: 'Failed to save GitLab token' });
    }
  } catch (error) {
    console.error('GitLab save-token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get user's saved GitLab token
 * GET /api/gitlab/get-token
 */
router.get('/get-token', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT gitlab_token, gitlab_url FROM user_gitlab_tokens WHERE user_id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.json({ token: null, gitlabUrl: null });
    }

    res.json({
      token: result.rows[0].gitlab_token,
      gitlabUrl: result.rows[0].gitlab_url
    });
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({ error: 'Failed to retrieve GitLab token' });
  }
});

/**
 * Import GitLab issues into global GitLab workspace
 * POST /api/gitlab/import
 */
router.post('/import', authenticateToken, async (req, res) => {
  try {
    const { projectId, projectName, projectDescription, token, gitlabUrl, issues } = req.body;

    if (!projectId || !projectName || !token || !issues || issues.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
      // Find or create "GitLab" workspace for this user
      let workspaceResult = await query(
        `SELECT * FROM workspaces WHERE owner_id = $1 AND name = 'GitLab' LIMIT 1`,
        [req.userId]
      );

      let workspace;
      if (workspaceResult.rows.length === 0) {
        // Create GitLab workspace
        const createResult = await query(
          `INSERT INTO workspaces (name, description, owner_id) 
           VALUES ($1, $2, $3) 
           RETURNING *`,
          [
            'GitLab',
            'All imported GitLab projects and issues',
            req.userId
          ]
        );
        workspace = createResult.rows[0];

        // Add owner as member
        await query(
          `INSERT INTO workspace_members (workspace_id, user_id, role) 
           VALUES ($1, $2, $3)`,
          [workspace.id, req.userId, 'owner']
        );
      } else {
        workspace = workspaceResult.rows[0];
      }

      // Create board for this project inside GitLab workspace
      const boardResult = await query(
        `INSERT INTO boards (workspace_id, title) 
         VALUES ($1, $2) 
         RETURNING *`,
        [workspace.id, projectName]
      );

      const board = boardResult.rows[0];

      // Create list for issues
      const listResult = await query(
        `INSERT INTO lists (board_id, title, order_index) 
         VALUES ($1, $2, $3) 
         RETURNING *`,
        [board.id, 'Issues', 0]
      );

      const list = listResult.rows[0];

      // Create cards from issues
      const cards = await Promise.all(
        issues.map((issue, index) =>
          query(
            `INSERT INTO cards (list_id, title, description, order_index, gitlab_issue_ref) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [list.id, issue.title, issue.description || '', index, `${projectId}#${issue.iid}`]
          )
        )
      );

      // Store GitLab configuration (upsert for multiple projects)
      await query(
        `INSERT INTO gitlab_workspace_config (workspace_id, gitlab_url, gitlab_project_id, gitlab_project_name, user_id) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (workspace_id, gitlab_project_id) DO UPDATE SET
         gitlab_project_name = $4,
         gitlab_url = $2,
         updated_at = CURRENT_TIMESTAMP`,
        [workspace.id, gitlabUrl || 'https://gitlab.com', projectId, projectName, req.userId]
      );

      // Store issue mappings
      await Promise.all(
        cards.map((cardResult, index) =>
          query(
            `INSERT INTO gitlab_issue_mapping (card_id, gitlab_project_id, gitlab_issue_iid, gitlab_issue_id, gitlab_issue_url) 
             VALUES ($1, $2, $3, $4, $5)`,
            [cardResult.rows[0].id, projectId, issues[index].iid, issues[index].id, issues[index].url]
          )
        )
      );

      // Log activity
      await query(
        `INSERT INTO activity_logs (user_id, workspace_id, action, entity_type, entity_id, entity_title) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [req.userId, workspace.id, 'CREATE', 'BOARD', board.id, projectName]
      );

      res.status(201).json({
        success: true,
        workspace: workspace,
        board: board,
        list: list,
        cardsCreated: cards.length,
        message: `Successfully imported ${cards.length} GitLab issues from "${projectName}"`
      });
    } catch (error) {
      console.error('Import error:', error);
      res.status(500).json({ error: 'Failed to import GitLab issues' });
    }
  } catch (error) {
    console.error('GitLab import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get workspace GitLab configuration
 * GET /api/gitlab/workspace/:workspaceId
 */
router.get('/workspace/:workspaceId', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify user has access to workspace
    const workspaceCheck = await query(
      `SELECT w.* FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [workspaceId, req.userId]
    );

    if (workspaceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT * FROM gitlab_workspace_config WHERE workspace_id = $1`,
      [workspaceId]
    );

    if (result.rows.length === 0) {
      return res.json({ config: null });
    }

    res.json({ config: result.rows[0] });
  } catch (error) {
    console.error('Get workspace config error:', error);
    res.status(500).json({ error: 'Failed to retrieve workspace GitLab config' });
  }
});

/**
 * Get issues assigned to current user in a workspace
 * GET /api/gitlab/workspace/:workspaceId/assigned-issues
 */
router.get('/workspace/:workspaceId/assigned-issues', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify user has access to workspace
    const workspaceCheck = await query(
      `SELECT w.* FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [workspaceId, req.userId]
    );

    if (workspaceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await query(
      `SELECT c.* FROM cards c
       JOIN lists l ON c.list_id = l.id
       JOIN boards b ON l.board_id = b.id
       JOIN gitlab_workspace_config gwc ON b.workspace_id = gwc.workspace_id
       WHERE b.workspace_id = $1 AND (c.assigned_to = $2 OR gwc.user_id = $2)
       ORDER BY c.created_at DESC`,
      [workspaceId, req.userId]
    );

    res.json({ issues: result.rows });
  } catch (error) {
    console.error('Get assigned issues error:', error);
    res.status(500).json({ error: 'Failed to retrieve assigned issues' });
  }
});

/**
 * Sync GitLab issues for a workspace
 * POST /api/gitlab/workspace/:workspaceId/sync
 */
router.post('/workspace/:workspaceId/sync', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Verify user has access to workspace
    const workspaceCheck = await query(
      `SELECT w.* FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [workspaceId, req.userId]
    );

    if (workspaceCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get GitLab config
    const configResult = await query(
      `SELECT * FROM gitlab_workspace_config WHERE workspace_id = $1`,
      [workspaceId]
    );

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'GitLab configuration not found for workspace' });
    }

    const config = configResult.rows[0];

    // Get user's GitLab token
    const tokenResult = await query(
      `SELECT gitlab_token FROM user_gitlab_tokens WHERE user_id = $1`,
      [req.userId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'GitLab token not configured' });
    }

    const token = tokenResult.rows[0].gitlab_token;
    const gitlab = new GitLabClient(config.gitlab_url, token);

    try {
      // Fetch latest issues
      const user = await gitlab.getCurrentUser();
      const issues = await gitlab.getProjectIssues(config.gitlab_project_id, user.id);

      const formattedIssues = await Promise.all(
        issues.map(async (issue) => {
          try {
            const notes = await gitlab.getIssueNotes(config.gitlab_project_id, issue.iid);
            let fullDescription = issue.description || '';
            if (notes && notes.length > 0) {
              fullDescription += '\n\n--- Comments ---\n';
              notes.forEach(note => {
                if (!note.system) {
                  fullDescription += `\n**${note.author.name}** (${new Date(note.created_at).toLocaleString()}):\n${note.body}\n`;
                }
              });
            }

            return {
              id: issue.id,
              iid: issue.iid,
              title: issue.title,
              description: fullDescription,
              url: issue.web_url,
              state: issue.state,
              author: issue.author.name,
              created_at: issue.created_at
            };
          } catch (err) {
            console.error(`Failed to get details for issue ${issue.iid}:`, err);
            return {
              id: issue.id,
              iid: issue.iid,
              title: issue.title,
              description: issue.description || '',
              url: issue.web_url,
              state: issue.state,
              author: issue.author.name,
              created_at: issue.created_at
            };
          }
        })
      );

      res.json({
        success: true,
        issuesCount: formattedIssues.length,
        issues: formattedIssues,
        message: `Synced ${formattedIssues.length} GitLab issues`
      });
    } catch (error) {
      console.error('Sync error:', error);
      res.status(500).json({ error: 'Failed to sync GitLab issues' });
    }
  } catch (error) {
    console.error('GitLab sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Sync GitLab issues for a specific board
 * POST /api/gitlab/board/:boardId/sync
 */
router.post('/board/:boardId/sync', authenticateToken, async (req, res) => {
  try {
    const { boardId } = req.params;

    // Verify user has access to the board
    const boardCheck = await query(
      `SELECT b.* FROM boards b
       JOIN workspaces w ON b.workspace_id = w.id
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE b.id = $1 AND (w.owner_id = $2 OR wm.user_id = $2)`,
      [boardId, req.userId]
    );

    if (boardCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const board = boardCheck.rows[0];

    // Get GitLab config for this workspace
    const configResult = await query(
      `SELECT * FROM gitlab_workspace_config WHERE workspace_id = $1`,
      [board.workspace_id]
    );

    if (configResult.rows.length === 0) {
      return res.status(404).json({ error: 'GitLab configuration not found' });
    }

    const config = configResult.rows[0];

    // Get user's GitLab token
    const tokenResult = await query(
      `SELECT gitlab_token FROM user_gitlab_tokens WHERE user_id = $1`,
      [req.userId]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({ error: 'GitLab token not configured' });
    }

    const token = tokenResult.rows[0].gitlab_token;
    const gitlab = new GitLabClient(config.gitlab_url, token);

    try {
      // Get all lists for this board
      const listsResult = await query(
        `SELECT * FROM lists WHERE board_id = $1 ORDER BY order_index ASC`,
        [boardId]
      );

      if (listsResult.rows.length === 0) {
        return res.json({ success: true, message: 'No lists found in board' });
      }

      const list = listsResult.rows[0];

      // Fetch latest issues
      const user = await gitlab.getCurrentUser();
      const issues = await gitlab.getProjectIssues(config.gitlab_project_id, user.id);

      // Process issues
      const formattedIssues = await Promise.all(
        issues.map(async (issue) => {
          try {
            const notes = await gitlab.getIssueNotes(config.gitlab_project_id, issue.iid);
            let fullDescription = issue.description || '';
            if (notes && notes.length > 0) {
              fullDescription += '\n\n--- Comments ---\n';
              notes.forEach(note => {
                if (!note.system) {
                  fullDescription += `\n**${note.author.name}** (${new Date(note.created_at).toLocaleString()}):\n${note.body}\n`;
                }
              });
            }

            return {
              id: issue.id,
              iid: issue.iid,
              title: issue.title,
              description: fullDescription,
              url: issue.web_url,
              state: issue.state,
              author: issue.author.name,
              created_at: issue.created_at
            };
          } catch (err) {
            console.error(`Failed to get details for issue ${issue.iid}:`, err);
            return {
              id: issue.id,
              iid: issue.iid,
              title: issue.title,
              description: issue.description || '',
              url: issue.web_url,
              state: issue.state,
              author: issue.author.name,
              created_at: issue.created_at
            };
          }
        })
      );

      // Check for existing cards and update them
      let cardsAdded = 0;
      const existingCardsResult = await query(
        `SELECT * FROM cards WHERE list_id = $1`,
        [list.id]
      );

      const existingIssueRefs = new Set(existingCardsResult.rows.map(c => c.gitlab_issue_ref));

      // Add new issues as cards
      for (let i = 0; i < formattedIssues.length; i++) {
        const issue = formattedIssues[i];
        const issueRef = `${config.gitlab_project_id}#${issue.iid}`;

        if (!existingIssueRefs.has(issueRef)) {
          const maxOrderResult = await query(
            'SELECT MAX(order_index) as max_order FROM cards WHERE list_id = $1',
            [list.id]
          );
          const maxOrder = maxOrderResult.rows[0].max_order || -1;

          const cardResult = await query(
            `INSERT INTO cards (list_id, title, description, order_index, gitlab_issue_ref) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [list.id, issue.title, issue.description, maxOrder + 1, issueRef]
          );

          // Store issue mapping
          await query(
            `INSERT INTO gitlab_issue_mapping (card_id, gitlab_project_id, gitlab_issue_iid, gitlab_issue_id, gitlab_issue_url) 
             VALUES ($1, $2, $3, $4, $5)`,
            [cardResult.rows[0].id, config.gitlab_project_id, issue.iid, issue.id, issue.url]
          );

          cardsAdded++;
        }
      }

      res.json({
        success: true,
        cardsAdded: cardsAdded,
        totalIssues: formattedIssues.length,
        message: `Synced ${formattedIssues.length} GitLab issues, ${cardsAdded} new cards added`
      });
    } catch (error) {
      console.error('Board sync error:', error);
      res.status(500).json({ error: 'Failed to sync board issues' });
    }
  } catch (error) {
    console.error('GitLab board sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
