import React, { useState, useEffect } from 'react';
import { ExternalLink, Loader, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import apiClient from '../lib/apiClient';
import '../styles/GitLabIssuesTable.css';

export default function GitLabIssuesTable({ workspaceId, onRefresh }) {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [expandedIssueId, setExpandedIssueId] = useState(null);

  const fetchAssignedIssues = async () => {
    if (!workspaceId) {
      console.warn('No workspaceId provided to GitLabIssuesTable');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.get(`/gitlab/workspace/${workspaceId}/assigned-issues`);
      setIssues(response.data.issues || []);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to load issues';
      setError(errorMsg);
      console.error('Error fetching assigned issues:', errorMsg, err);
    } finally {
      setLoading(false);
    }
  };

  const handleSyncIssues = async () => {
    if (!workspaceId) {
      setError('Workspace ID is not available. Please refresh the page.');
      console.warn('No workspaceId provided for sync');
      return;
    }

    setSyncing(true);
    setError('');

    try {
      const response = await apiClient.post(`/gitlab/workspace/${workspaceId}/sync`);
      setIssues(response.data.issues || []);
      onRefresh?.();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to sync issues';
      setError(errorMsg);
      console.error('Error syncing issues:', errorMsg, err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchAssignedIssues();
  }, [workspaceId]);

  const toggleIssueDetails = (issueId) => {
    setExpandedIssueId(expandedIssueId === issueId ? null : issueId);
  };

  if (loading) {
    return (
      <div className="issues-table-container">
        <div className="loading-state">
          <Loader size={32} className="spinner" />
          <p>Loading issues...</p>
        </div>
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="issues-table-container">
        <div className="empty-state">
          <AlertCircle size={32} />
          <p>Workspace not found</p>
          <small>Please select a workspace to view GitLab issues</small>
        </div>
      </div>
    );
  }

  return (
    <div className="issues-table-container">
      <div className="issues-header">
        <h2>GitLab Issues Assigned to You</h2>
        <button
          className="btn-sync"
          onClick={handleSyncIssues}
          disabled={syncing || !workspaceId}
          title={!workspaceId ? "No workspace selected" : "Sync with GitLab"}
        >
          {syncing ? <Loader size={16} className="spinner" /> : <RefreshCw size={16} />}
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {error && (
        <div className="error-alert">
          <AlertCircle size={16} />
          <div>
            <strong>{error}</strong>
            {error.includes('configuration not found') && (
              <small style={{ display: 'block', marginTop: '4px' }}>
                Use the "GitLab" button in the navbar to connect a GitLab project.
              </small>
            )}
          </div>
        </div>
      )}

      {issues.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={32} style={{ color: '#d97706', marginBottom: '8px' }} />
          <p>No GitLab issues found</p>
          <small>
            {error && error.includes('configuration not found')
              ? 'Click the "GitLab" button in the nav to import issues from GitLab'
              : 'Import a GitLab project using the "GitLab" button in the navbar to see issues'}
          </small>
        </div>
      ) : (
        <div className="issues-table">
          <div className="table-header">
            <div className="col-title">Issue Title</div>
            <div className="col-author">Author</div>
            <div className="col-state">State</div>
            <div className="col-date">Created</div>
            <div className="col-actions">Actions</div>
          </div>

          {issues.map((issue) => (
            <div key={issue.id} className="table-row">
              <div className="row-main">
                <div className="col-title">
                  <button
                    className="issue-title-btn"
                    onClick={() => toggleIssueDetails(issue.id)}
                  >
                    {issue.title}
                  </button>
                </div>
                <div className="col-author">{issue.author || 'Unknown'}</div>
                <div className="col-state">
                  <span className={`issue-state state-${issue.state || 'opened'}`}>
                    {issue.state || 'opened'}
                  </span>
                </div>
                <div className="col-date">
                  {new Date(issue.created_at).toLocaleDateString()}
                </div>
                <div className="col-actions">
                  {issue.gitlab_issue_url && (
                    <a
                      href={issue.gitlab_issue_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-external"
                      title="View on GitLab"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
              </div>

              {expandedIssueId === issue.id && (
                <div className="row-details">
                  <div className="issue-description">
                    <h4>Description</h4>
                    <div className="description-content">
                      {issue.description ? (
                        <pre>{issue.description}</pre>
                      ) : (
                        <p className="no-description">No description</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
