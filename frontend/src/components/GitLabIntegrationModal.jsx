import React, { useState } from 'react';
import { X, Check, Loader, AlertCircle, GitBranch } from 'lucide-react';
import apiClient from '../lib/apiClient';
import '../styles/GitLabIntegration.css';

export default function GitLabIntegrationModal({ onClose, onImportComplete }) {
  const [step, setStep] = useState(1); // 1: Connect, 2: Select Project, 3: Select Issues, 4: Select Wikis, 5: Review
  const [gitlabUrl, setGitlabUrl] = useState('https://gitlab.com');
  const [token, setToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [issues, setIssues] = useState([]);
  const [selectedIssues, setSelectedIssues] = useState([]);
  const [wikis, setWikis] = useState([]);
  const [selectedWikis, setSelectedWikis] = useState([]);
  const [error, setError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [enableRAG, setEnableRAG] = useState(false);

  const handleVerifyToken = async () => {
    setLoading(true);
    setError('');
    setTokenError('');

    try {
      const response = await apiClient.post('/gitlab/verify', {
        token,
        gitlabUrl
      });

      if (response.data.success) {
        setUser(response.data.user);
        // Fetch projects
        const projectsResponse = await apiClient.post('/gitlab/projects', {
          token,
          gitlabUrl
        });
        setProjects(projectsResponse.data.projects);
        setStep(2);
      }
    } catch (err) {
      setTokenError(err.response?.data?.error || 'Failed to verify GitLab token');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProject = async (project) => {
    setSelectedProject(project);
    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/gitlab/issues', {
        projectId: project.id,
        token,
        gitlabUrl
      });
      setIssues(response.data.issues);
      setSelectedIssues(response.data.issues.map(issue => issue.id)); // Select all by default
      
      // Fetch wikis (optional - may not exist)
      try {
        const wikisResponse = await apiClient.post('/gitlab/wikis', {
          projectId: project.id,
          token,
          gitlabUrl
        });
        setWikis(wikisResponse.data.wikis || []);
        setSelectedWikis((wikisResponse.data.wikis || []).map(wiki => wiki.slug)); // Select all by default
      } catch (wikiError) {
        console.warn('Wikis not available for this project:', wikiError.message);
        setWikis([]);
        setSelectedWikis([]);
      }
      
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch issues');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleIssue = (issueId) => {
    setSelectedIssues(prev =>
      prev.includes(issueId) ? prev.filter(id => id !== issueId) : [...prev, issueId]
    );
  };

  const handleSelectAll = () => {
    if (selectedIssues.length === issues.length) {
      setSelectedIssues([]);
    } else {
      setSelectedIssues(issues.map(issue => issue.id));
    }
  };

  const handleToggleWiki = (wikiSlug) => {
    setSelectedWikis(prev =>
      prev.includes(wikiSlug) ? prev.filter(s => s !== wikiSlug) : [...prev, wikiSlug]
    );
  };

  const handleSelectAllWikis = () => {
    if (selectedWikis.length === wikis.length) {
      setSelectedWikis([]);
    } else {
      setSelectedWikis(wikis.map(wiki => wiki.slug));
    }
  };

  const handleImport = async () => {
    if (selectedIssues.length === 0) {
      setError('Please select at least one issue to import');
      return;
    }

    setImportLoading(true);
    setError('');

    try {
      // Save the GitLab token first
      await apiClient.post('/gitlab/save-token', {
        token,
        gitlabUrl
      });

      const selectedIssuesData = issues.filter(issue => selectedIssues.includes(issue.id));

      const response = await apiClient.post('/gitlab/import', {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        projectDescription: selectedProject.description,
        token,
        gitlabUrl,
        issues: selectedIssuesData
      });

      if (response.data.success) {
        // If RAG is enabled, trigger RAG creation
        if (enableRAG && response.data.workspace) {
          try {
            await apiClient.post('/rag/create', {
              workspaceId: response.data.workspace.id,
              gitlabProjectId: selectedProject.id,
              token,
              gitlabUrl,
              selectedWikis
            });
            
            // Show success message about RAG creation
            alert('✓ Issues imported successfully! Knowledge base creation started in the background. You\'ll be able to query it once processing completes.');
          } catch (ragError) {
            console.error('Error creating RAG:', ragError);
            alert('Issues imported successfully, but knowledge base creation failed. You can try creating it later.');
          }
        }
        
        // Call callback immediately with board info for direct navigation
        onImportComplete?.(response.data.workspace, response.data.board);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to import issues');
      setImportLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="gitlab-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-section">
            <GitBranch size={24} />
            <h2>GitLab Integration</h2>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="modal-content">
          {/* Step 1: Connect */}
          {step === 1 && (
            <div className="step-content">
              <h3>Connect to GitLab</h3>
              <div className="form-group">
                <label>GitLab URL</label>
                <input
                  type="text"
                  value={gitlabUrl}
                  onChange={(e) => setGitlabUrl(e.target.value)}
                  placeholder="https://gitlab.com"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Personal Access Token</label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setTokenError('');
                  }}
                  placeholder="Enter your GitLab personal access token"
                  className="form-input"
                />
                <small className="help-text">
                  Create a token at {gitlabUrl}/profile/personal_access_tokens with 'api' and 'read_user' scopes
                </small>
              </div>

              {tokenError && (
                <div className="error-alert">
                  <AlertCircle size={16} />
                  {tokenError}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleVerifyToken}
                  disabled={!token.trim() || loading}
                >
                  {loading ? <Loader size={16} className="spinner" /> : 'Connect'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Project */}
          {step === 2 && (
            <div className="step-content">
              <h3>Select Project</h3>
              {user && (
                <div className="user-info">
                  <img src={user.avatar_url} alt={user.name} className="user-avatar" />
                  <div>
                    <strong>{user.name}</strong>
                    <small>({user.username})</small>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="loading-indicator">
                  <Loader size={32} className="spinner" />
                  <p>Fetching issues...</p>
                </div>
              ) : (
                <div className="projects-list">
                  {projects.map(project => (
                    <div
                      key={project.id}
                      className="project-item"
                      onClick={() => handleSelectProject(project)}
                    >
                      {project.avatar_url && (
                        <img src={project.avatar_url} alt={project.name} className="project-avatar" />
                      )}
                      <div className="project-info">
                        <strong>{project.name}</strong>
                        {project.description && <small>{project.description}</small>}
                      </div>
                      <small className="project-path">{project.path}</small>
                    </div>
                  ))}
                </div>
              )}              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Select Issues */}
          {step === 3 && (
            <div className="step-content">
              <h3>Select Issues to Import</h3>
              <div className="project-header">
                From: <strong>{selectedProject?.name}</strong> ({issues.length} issues found)
              </div>

              <div className="select-all-option">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedIssues.length === issues.length && issues.length > 0}
                    onChange={handleSelectAll}
                    className="checkbox-input"
                  />
                  Select All
                </label>
              </div>

              <div className="issues-list">
                {issues.map(issue => (
                  <div key={issue.id} className="issue-item">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedIssues.includes(issue.id)}
                        onChange={() => handleToggleIssue(issue.id)}
                        className="checkbox-input"
                      />
                      <div className="issue-content">
                        <strong>{issue.title}</strong>
                        <small>by {issue.author}</small>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {error && (
                <div className="error-alert">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setStep(2)}>
                  Back
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setStep(4)}
                  disabled={selectedIssues.length === 0}
                >
                  Next ({selectedIssues.length} selected)
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Select Wiki Pages */}
          {step === 4 && (
            <div className="step-content">
              <h3>Select Wiki Pages (Optional)</h3>
              <div className="project-header">
                From: <strong>{selectedProject?.name}</strong> ({wikis.length} wiki pages found)
              </div>

              {wikis.length > 0 ? (
                <>
                  <div className="select-all-option">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedWikis.length === wikis.length && wikis.length > 0}
                        onChange={handleSelectAllWikis}
                        className="checkbox-input"
                      />
                      Select All
                    </label>
                  </div>

                  <div className="issues-list">
                    {wikis.map(wiki => (
                      <div key={wiki.slug} className="issue-item">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={selectedWikis.includes(wiki.slug)}
                            onChange={() => handleToggleWiki(wiki.slug)}
                            className="checkbox-input"
                          />
                          <div className="issue-content">
                            <strong>{wiki.title}</strong>
                            <small>{wiki.slug}</small>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <small>No wiki pages found for this project. (This is optional - you can proceed to create the knowledge base with just issues and merge requests)</small>
                </div>
              )}

              {error && (
                <div className="error-alert">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setStep(3)}>
                  Back
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setStep(5)}
                >
                  Next ({selectedWikis.length} wiki pages selected)
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Import */}
          {step === 5 && (
            <div className="step-content">
              <h3>Review and Import</h3>
              <div className="review-info">
                <div className="review-item">
                  <strong>Project Name:</strong> {selectedProject?.name}
                </div>
                <div className="review-item">
                  <strong>Issues to Import:</strong> {selectedIssues.length}
                </div>
                {selectedWikis.length > 0 && (
                  <div className="review-item">
                    <strong>Wiki Pages for Knowledge Base:</strong> {selectedWikis.length}
                  </div>
                )}
              </div>

              <div className="rag-option">
                <label className="rag-checkbox-label">
                  <input
                    type="checkbox"
                    checked={enableRAG}
                    onChange={(e) => setEnableRAG(e.target.checked)}
                    className="checkbox-input"
                  />
                  <div className="rag-option-content">
                    <strong>Create Knowledge Base (RAG)</strong>
                    <p>Build a searchable knowledge base from GitLab wikis, merge requests, and issue comments. This enables AI-powered Q&A about your project's documentation and discussions.</p>
                    <small className="rag-note">⚠️ This may take a few minutes depending on project size</small>
                  </div>
                </label>
              </div>

              {error && (
                <div className="error-alert">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setStep(4)} disabled={importLoading}>
                  Back
                </button>
                <button className="btn-secondary" onClick={onClose} disabled={importLoading}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleImport}
                  disabled={importLoading}
                >
                  {importLoading ? (
                    <>
                      <Loader size={16} className="spinner" />
                      <span>Importing...</span>
                    </>
                  ) : (
                    'Import Issues'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
