const https = require('https');
const http = require('http');

class GitLabClient {
  constructor(baseUrl = 'https://gitlab.com', personalAccessToken) {
    this.baseUrl = baseUrl;
    this.token = personalAccessToken;
    this.protocol = baseUrl.startsWith('https') ? https : http;
  }

  /**
   * Make HTTP request to GitLab API
   */
  async makeRequest(method, path, body = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        method,
        hostname: url.hostname,
        path: url.pathname + url.search,
        headers: {
          'PRIVATE-TOKEN': this.token,
          'Content-Type': 'application/json',
          'User-Agent': 'TaskTracker-GitLab-Integration'
        }
      };

      const protocol = url.protocol === 'https:' ? https : http;

      const req = protocol.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode >= 400) {
              reject(new Error(`GitLab API Error: ${res.statusCode} - ${data}`));
            } else {
              resolve(JSON.parse(data || '{}'));
            }
          } catch (err) {
            reject(err);
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Get current user info
   */
  async getCurrentUser() {
    try {
      const response = await this.makeRequest('GET', '/api/v4/user');
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab user: ${error.message}`);
    }
  }

  /**
   * Get user projects
   */
  async getUserProjects() {
    try {
      const response = await this.makeRequest('GET', '/api/v4/projects?owned=true&per_page=100');
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab projects: ${error.message}`);
    }
  }

  /**
   * Get project by ID
   */
  async getProject(projectId) {
    try {
      const response = await this.makeRequest('GET', `/api/v4/projects/${projectId}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab project: ${error.message}`);
    }
  }

  /**
   * Get issues assigned to current user for a project
   */
  async getProjectIssues(projectId, assigneeId = null) {
    try {
      let path = `/api/v4/projects/${projectId}/issues?state=opened&per_page=100`;
      
      if (assigneeId) {
        path += `&assignee_id=${assigneeId}`;
      }

      const response = await this.makeRequest('GET', path);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab issues: ${error.message}`);
    }
  }

  /**
   * Get issue details including notes (comments)
   */
  async getIssueDetails(projectId, issueIid) {
    try {
      const response = await this.makeRequest('GET', `/api/v4/projects/${projectId}/issues/${issueIid}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab issue details: ${error.message}`);
    }
  }

  /**
   * Get issue notes/comments
   */
  async getIssueNotes(projectId, issueIid) {
    try {
      const response = await this.makeRequest('GET', `/api/v4/projects/${projectId}/issues/${issueIid}/notes?per_page=100`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab issue notes: ${error.message}`);
    }
  }

  /**
   * Get all wiki pages for a project
   */
  async getWikiPages(projectId) {
    try {
      const response = await this.makeRequest('GET', `/api/v4/projects/${projectId}/wikis?per_page=100`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab wiki pages: ${error.message}`);
    }
  }

  /**
   * Get a specific wiki page content
   */
  async getWikiPage(projectId, slug) {
    try {
      const response = await this.makeRequest('GET', `/api/v4/projects/${projectId}/wikis/${slug}`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab wiki page: ${error.message}`);
    }
  }

  /**
   * Get merge requests for a project
   */
  async getMergeRequests(projectId, state = 'all') {
    try {
      const response = await this.makeRequest('GET', `/api/v4/projects/${projectId}/merge_requests?state=${state}&per_page=100`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab merge requests: ${error.message}`);
    }
  }

  /**
   * Get merge request notes/comments
   */
  async getMergeRequestNotes(projectId, mergeRequestIid) {
    try {
      const response = await this.makeRequest('GET', `/api/v4/projects/${projectId}/merge_requests/${mergeRequestIid}/notes?per_page=100`);
      return response;
    } catch (error) {
      throw new Error(`Failed to get GitLab MR notes: ${error.message}`);
    }
  }

  /**
   * Get all comments from all issues (for RAG)
   */
  async getAllIssueComments(projectId) {
    try {
      // First get all issues
      const issues = await this.makeRequest('GET', `/api/v4/projects/${projectId}/issues?per_page=100`);
      
      const commentsWithContext = [];
      for (const issue of issues) {
        try {
          const notes = await this.getIssueNotes(projectId, issue.iid);
          notes.forEach(note => {
            commentsWithContext.push({
              ...note,
              issue_iid: issue.iid,
              issue_title: issue.title,
              issue_url: issue.web_url
            });
          });
        } catch (err) {
          console.error(`Error fetching comments for issue ${issue.iid}:`, err.message);
        }
      }
      
      return commentsWithContext;
    } catch (error) {
      throw new Error(`Failed to get all issue comments: ${error.message}`);
    }
  }
}

module.exports = GitLabClient;
