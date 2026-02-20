import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkspaces, useBoards, useActivity } from '../hooks/useApi';
import { Plus, LogOut, ChevronDown, ChevronRight, LayoutGrid, Activity, Settings, GitBranch } from 'lucide-react';
import BoardCard from '../components/BoardCard';
import CreateBoardModal from '../components/CreateBoardModal';
import CreateWorkspaceModal from '../components/CreateWorkspaceModal';
import GitLabIntegrationModal from '../components/GitLabIntegrationModal';
import StreakCalendar from '../components/StreakCalendar';
import SettingsPage from './SettingsPage';
import '../styles/Dashboard.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { workspaces, loading: workspacesLoading, fetchWorkspaces, createWorkspace, updateWorkspace, deleteWorkspace } = useWorkspaces();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCreateWorkspaceModal, setShowCreateWorkspaceModal] = useState(false);
  const [showGitLabModal, setShowGitLabModal] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState({});
  const [activeView, setActiveView] = useState('boards'); // boards, activity
  const [showSettings, setShowSettings] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [editingWorkspaceName, setEditingWorkspaceName] = useState('');
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [streakWelcome, setStreakWelcome] = useState(null);
  const [activitySummary, setActivitySummary] = useState(null);
  const { boards, loading: boardsLoading, fetchBoards, deleteBoard } = useBoards(selectedWorkspace?.id);
  const { activities, loading: activitiesLoading, fetchActivity } = useActivity();

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (workspaces.length > 0 && !selectedWorkspace) {
      setSelectedWorkspace(workspaces[0]);
      setExpandedWorkspaces({ [workspaces[0].id]: true });
    }
  }, [workspaces, selectedWorkspace]);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchBoards();
      if (activeView === 'activity') {
        fetchActivity(null, selectedWorkspace.id);
      }
    }
  }, [selectedWorkspace, activeView]);

  // Fetch and summarize last 24h activities when welcome modal shows
  useEffect(() => {
    if (streakWelcome && user) {
      fetchActivity();
    }
  }, [streakWelcome, user, fetchActivity]);

  // Generate summary from activities
  useEffect(() => {
    if (activities && activities.length > 0 && streakWelcome) {
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const last24hActivities = activities.filter(a => {
        const actDate = new Date(a.created_at);
        return actDate >= last24h && actDate <= now;
      });

      // Count activities by type
      const counts = {
        boards: 0,
        lists: 0,
        cards: 0
      };

      last24hActivities.forEach(activity => {
        if (activity.entity_type === 'BOARD') counts.boards++;
        else if (activity.entity_type === 'LIST') counts.lists++;
        else if (activity.entity_type === 'CARD') counts.cards++;
      });

      // Build sentence
      let parts = [];
      if (counts.cards > 0) {
        parts.push(`updated ${counts.cards} ${counts.cards === 1 ? 'card' : 'cards'}`);
      }
      if (counts.boards > 0) {
        parts.push(`created ${counts.boards} ${counts.boards === 1 ? 'board' : 'boards'}`);
      }
      if (counts.lists > 0) {
        parts.push(`created ${counts.lists} ${counts.lists === 1 ? 'list' : 'lists'}`);
      }

      const sentence = parts.length > 0 ? `Great! You ${parts.join(', ')}` : null;

      setActivitySummary(sentence);
    }
  }, [activities, streakWelcome]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateWorkspace = async (workspaceData) => {
    try {
      const newWorkspace = await createWorkspace(workspaceData);
      setSelectedWorkspace(newWorkspace);
      setExpandedWorkspaces({ ...expandedWorkspaces, [newWorkspace.id]: true });
      setShowCreateWorkspaceModal(false);
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  const handleCreateBoard = async (boardData) => {
    try {
      if (!selectedWorkspace) {
        alert('Please select a workspace first');
        return;
      }
      await fetch('http://localhost:3000/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...boardData,
          workspaceId: selectedWorkspace.id
        })
      });
      fetchBoards();
      setShowCreateModal(false);
    } catch (err) {
      console.error('Failed to create board:', err);
    }
  };

  const handleDeleteBoard = async (boardId) => {
    if (window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      try {
        await deleteBoard(boardId);
      } catch (err) {
        console.error('Failed to delete board:', err);
      }
    }
  };

  const toggleWorkspace = (workspaceId) => {
    setExpandedWorkspaces(prev => ({
      ...prev,
      [workspaceId]: !prev[workspaceId]
    }));
  };

  const handleWorkspaceSelect = (workspace, view = 'boards') => {
    setSelectedWorkspace(workspace);
    setActiveView(view);
    if (!expandedWorkspaces[workspace.id]) {
      setExpandedWorkspaces({ ...expandedWorkspaces, [workspace.id]: true });
    }
  };

  const getUserInitials = () => {
    return user?.username?.substring(0, 2).toUpperCase() || 'TT';
  };

  const getUserAvatarColor = (username) => {
    const colors = [
      '#0ea5e9', // blue
      '#8b5cf6', // purple
      '#ec4899', // pink
      '#f59e0b', // amber
      '#10b981', // green
      '#ef4444', // red
      '#6366f1', // indigo
      '#14b8a6'  // teal
    ];
    if (!username) return colors[0];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = ((hash << 5) - hash) + username.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getWorkspaceIcon = (workspace) => {
    const firstLetter = workspace.name.charAt(0).toUpperCase();
    return (
      <div className="workspace-icon" style={{ background: workspace.icon_color || '#0ea5e9' }}>
        <span>{firstLetter}</span>
      </div>
    );
  };

  const formatActivityTime = (timestamp) => {
    const date = new Date(timestamp);
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    };
    return date.toLocaleString('en-US', options).replace(',', ' at');
  };

  const getActivityText = (activity) => {
    const actionMap = {
      'create': 'created',
      'update': 'updated',
      'delete': 'deleted',
      'move': 'moved'
    };
    const action = actionMap[activity.action] || activity.action;
    const entityType = activity.entity_type.replace('_', ' ');
    return { action, entityType };
  };

  return (
    <div className="dashboard-layout">
      {/* Top Navigation Bar */}
      <header className="top-navbar">
        <div className="navbar-left">
          <div className="logo-section">
            <div className="app-logo">
              <svg viewBox="0 0 24 24" width="24" height="24">
                <rect x="3" y="3" width="7" height="18" rx="1" fill="currentColor"/>
                <rect x="13" y="3" width="3" height="18" rx="1" fill="currentColor"/>
                <rect x="19" y="3" width="2" height="18" rx="1" fill="currentColor"/>
              </svg>
            </div>
            <span className="app-name">TaskTracker</span>
          </div>
          <button 
            className="btn-create"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus size={18} />
            Create
          </button>
        </div>
        
        <div className="navbar-right">
          <button 
            className="btn-gitlab-navbar"
            onClick={() => setShowGitLabModal(true)}
            title="Connect GitLab project"
          >
            <GitBranch size={16} />
            GitLab
          </button>
          
          <div className="user-avatar" onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}>
            {user?.profile_photo_url ? (
              <img src={user.profile_photo_url} alt={user?.username} className="avatar-image" />
            ) : (
              <span className="avatar-initials">{getUserInitials()}</span>
            )}
          </div>
          
          {orgDropdownOpen && (
            <div className="user-dropdown">
              <button 
                className="dropdown-item"
                onClick={() => {
                  setShowSettings(true);
                  setOrgDropdownOpen(false);
                }}
              >
                <Settings size={16} />
                Profile Settings
              </button>
              <button onClick={handleLogout} className="logout-btn">
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="dashboard-content">
        {/* Left Sidebar */}
        <aside className="sidebar open">
          <div className="sidebar-section">
            <div className="section-header">
              <h3>Workspaces</h3>
              <button className="btn-icon" onClick={() => setShowCreateWorkspaceModal(true)} title="Add workspace">
                <Plus size={16} />
              </button>
            </div>
            
            <div className="workspaces-list">
              {workspaces.map((workspace) => (
                <div key={workspace.id} className="workspace-container">
                  <div 
                    className={`workspace-item ${selectedWorkspace?.id === workspace.id && activeView === 'boards' ? 'active' : ''}`}
                    onClick={() => toggleWorkspace(workspace.id)}
                  >
                    {getWorkspaceIcon(workspace)}
                    <span className="workspace-name">{workspace.name}</span>
                    {expandedWorkspaces[workspace.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                  
                  {expandedWorkspaces[workspace.id] && (
                    <div className="workspace-submenu">
                      <button 
                        className={`submenu-item ${selectedWorkspace?.id === workspace.id && activeView === 'boards' ? 'active' : ''}`}
                        onClick={() => handleWorkspaceSelect(workspace, 'boards')}
                      >
                        <LayoutGrid size={16} />
                        <span>Boards</span>
                      </button>
                      <button 
                        className={`submenu-item ${selectedWorkspace?.id === workspace.id && activeView === 'activity' ? 'active' : ''}`}
                        onClick={() => handleWorkspaceSelect(workspace, 'activity')}
                      >
                        <Activity size={16} />
                        <span>Activity</span>
                      </button>
                      <button 
                        className="submenu-item"
                        onClick={() => {
                          setEditingWorkspace(workspace);
                          setEditingWorkspaceName(workspace.name);
                          setShowWorkspaceSettings(true);
                        }}
                      >
                        <Settings size={16} />
                        <span>Settings</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button 
                className="btn-create-workspace-list"
                onClick={() => setShowCreateWorkspaceModal(true)}
                title="Create new workspace"
              >
                <Plus size={16} />
                <span>Create Workspace</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {selectedWorkspace && (
            <div className="dashboard-two-column">
              {/* Left Column - Workspace Content */}
              <div className="workspace-content-column">
                {/* Workspace Header */}
                <div className="organization-header">
                  <div className="org-info">
                    <div className="org-avatar-large">
                      {getWorkspaceIcon(selectedWorkspace)}
                    </div>
                    <div className="org-details">
                      <h1>{selectedWorkspace.name}</h1>
                    </div>
                  </div>
                </div>

                {/* Content based on active view */}
                {activeView === 'boards' && (
                  <section className="boards-section">
                    <div className="section-title">
                      <LayoutGrid size={20} />
                      <h2>Your boards</h2>
                    </div>

                    {boardsLoading ? (
                      <div className="loading">Loading boards...</div>
                    ) : (
                      <div className="boards-grid-modern">
                        {boards.map((board) => (
                          <BoardCard
                            key={board.id}
                            board={board}
                            onDelete={() => handleDeleteBoard(board.id)}
                          />
                        ))}
                        
                        <div className="create-board-card" onClick={() => setShowCreateModal(true)}>
                          <div className="create-board-content">
                            <Plus size={32} />
                            <h3>Create new board</h3>
                          </div>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {activeView === 'activity' && (
                  <section className="activity-section">
                    <div className="section-title">
                      <Activity size={20} />
                      <h2>Activity</h2>
                    </div>
                    {activitiesLoading ? (
                      <div className="loading">Loading activities...</div>
                    ) : activities.length === 0 ? (
                      <div className="empty-activity">
                        <p>No activity yet in this workspace</p>
                      </div>
                    ) : (
                      <div className="activity-timeline">
                        {activities.map((activity) => {
                          const { action, entityType } = getActivityText(activity);
                          return (
                            <div key={activity.id} className="activity-item">
                              <div className="activity-avatar">
                                {activity.profile_photo_url ? (
                                  <img src={activity.profile_photo_url} alt={activity.username} className="user-avatar-small-image" />
                                ) : (
                                  <div className="user-avatar-small" style={{ background: getUserAvatarColor(activity.username) }}>
                                    {activity.username?.substring(0, 2).toUpperCase() || 'U'}
                                  </div>
                                )}
                              </div>
                              <div className="activity-content">
                                <div className="activity-description">
                                  <strong>{activity.username}</strong> {action} {entityType} "{activity.entity_title}"
                                </div>
                                <div className="activity-time">
                                  {formatActivityTime(activity.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                )}
              </div>

              {/* Right Column - Streak Calendar */}
              <div className="streak-sidebar">
                <StreakCalendar
                  key={user?.id || 'guest'}
                  userId={user?.id}
                  onFirstLoginWelcome={({ streakCount, quote }) => {
                    setStreakWelcome({ streakCount, quote });
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {showWorkspaceSettings && editingWorkspace && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content" style={{ maxWidth: '400px' }}>
            <div className="settings-modal-header">
              <h2 style={{ color: '#1f2937' }}>Workspace Settings</h2>
              <button 
                className="btn-close-modal"
                onClick={() => setShowWorkspaceSettings(false)}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={editingWorkspaceName}
                  onChange={(e) => setEditingWorkspaceName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    color: '#1f2937'
                  }}
                  placeholder="Enter workspace name"
                />
              </div>

              <div style={{ 
                borderTop: '1px solid #e5e7eb', 
                paddingTop: '20px', 
                marginBottom: '20px' 
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937', marginBottom: '12px', marginTop: '0' }}>
                  Danger Zone
                </h3>
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${editingWorkspace.name}"? This action cannot be undone and will delete all boards and cards in this workspace.`)) {
                      try {
                        deleteWorkspace(editingWorkspace.id);
                        setShowWorkspaceSettings(false);
                        // Select another workspace if available
                        if (workspaces.length > 1) {
                          const nextWorkspace = workspaces.find(w => w.id !== editingWorkspace.id);
                          setSelectedWorkspace(nextWorkspace);
                        } else {
                          setSelectedWorkspace(null);
                        }
                      } catch (err) {
                        console.error('Failed to delete workspace:', err);
                      }
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#fecaca';
                    e.target.style.borderColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#fee2e2';
                    e.target.style.borderColor = '#fecaca';
                  }}
                >
                  Delete Workspace
                </button>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowWorkspaceSettings(false)}
                  style={{
                    padding: '10px 16px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    color: '#374151'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (editingWorkspaceName.trim()) {
                        await updateWorkspace(editingWorkspace.id, { name: editingWorkspaceName });
                        setShowWorkspaceSettings(false);
                      }
                    } catch (err) {
                      console.error('Failed to update workspace:', err);
                    }
                  }}
                  style={{
                    padding: '10px 16px',
                    background: '#0ea5e9',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showSettings && (
        <div className="settings-modal-overlay">
          <div className="settings-modal-content">
            <div className="settings-modal-header">
              <button 
                className="btn-close-modal"
                onClick={() => setShowSettings(false)}
                title="Close"
              >
                ×
              </button>
            </div>
            <SettingsPage />
          </div>
        </div>
      )}
      
      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreateBoard={handleCreateBoard}
        />
      )}
      
      {showCreateWorkspaceModal && (
        <CreateWorkspaceModal
          onClose={() => setShowCreateWorkspaceModal(false)}
          onCreateWorkspace={handleCreateWorkspace}
        />
      )}

      {showGitLabModal && (
        <GitLabIntegrationModal
          onClose={() => setShowGitLabModal(false)}
          onImportComplete={(workspace, board) => {
            // Close modal immediately
            setShowGitLabModal(false);
            
            // Navigate directly to the board if we have the boardId
            if (board && board.id) {
              navigate(`/board/${board.id}`);
            } else if (workspace) {
              // Fallback to workspace view and fetch boards
              fetchWorkspaces().then((freshWorkspaces) => {
                const gitlabWorkspace = workspace || (freshWorkspaces && freshWorkspaces.find(w => w.name === 'GitLab'));
                if (gitlabWorkspace) {
                  setSelectedWorkspace(gitlabWorkspace);
                  setActiveView('boards');
                  setExpandedWorkspaces({ ...expandedWorkspaces, [gitlabWorkspace.id]: true });
                }
                fetchBoards();
              });
            }
          }}
        />
      )}

      {streakWelcome && (
        <div className="streak-welcome-overlay">
          <div className="streak-welcome-modal">
            <h3>🔥 Streak {streakWelcome.streakCount}</h3>
            <p>{streakWelcome.quote}</p>
            
            {activitySummary && (
              <div className="activity-summary">
                <p className="summary-text">{activitySummary}</p>
              </div>
            )}
            
            <button
              className="streak-welcome-btn"
              onClick={() => setStreakWelcome(null)}
            >
              Let&apos;s Go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
