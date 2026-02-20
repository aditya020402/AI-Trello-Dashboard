import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBoards } from '../hooks/useApi';
import { Plus, LogOut, Activity, ChevronDown, Menu, X } from 'lucide-react';
import BoardCard from '../components/BoardCard';
import CreateBoardModal from '../components/CreateBoardModal';
import '../styles/Dashboard.css';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { boards, loading, error, fetchBoards, createBoard, updateBoard, deleteBoard } = useBoards();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('');
  const [editingWorkspace, setEditingWorkspace] = useState(false);

  useEffect(() => {
    fetchBoards();
    // Load workspace name from localStorage
    const savedWorkspaceName = localStorage.getItem('workspaceName');
    setWorkspaceName(savedWorkspaceName || (user?.username ? `${user.username}'s Workspace` : 'Your Workspace'));
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreateBoard = async (boardData) => {
    try {
      await createBoard(boardData);
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

  const handleWorkspaceNameSave = () => {
    localStorage.setItem('workspaceName', workspaceName);
    setEditingWorkspace(false);
  };

  const handleWorkspaceNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleWorkspaceNameSave();
    } else if (e.key === 'Escape') {
      const savedWorkspaceName = localStorage.getItem('workspaceName');
      setWorkspaceName(savedWorkspaceName || (user?.username ? `${user.username}'s Workspace` : 'Your Workspace'));
      setEditingWorkspace(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    return user?.username?.substring(0, 2).toUpperCase() || 'TT';
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
          <div className="user-avatar" onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}>
            {getUserInitials()}
          </div>
          
          {orgDropdownOpen && (
            <div className="user-dropdown">
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
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-section">
            <div className="section-header">
              <h3>Your Boards</h3>
              <button className="btn-icon" onClick={() => setShowCreateModal(true)}>
                <Plus size={16} />
              </button>
            </div>
            
            <div className="boards-list">
              {boards.map((board) => (
                <div key={board.id} className="sidebar-board-item">
                  <div 
                    className="sidebar-board-link"
                    onClick={() => navigate(`/board/${board.id}`)}
                  >
                    {board.image_thumb_url ? (
                      <div 
                        className="sidebar-board-icon"
                        style={{
                          backgroundImage: `url(${board.image_thumb_url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      />
                    ) : (
                      <div className="sidebar-board-icon default">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="white">
                          <rect x="3" y="3" width="7" height="18" rx="1"/>
                          <rect x="13" y="3" width="3" height="18" rx="1"/>
                          <rect x="19" y="3" width="2" height="18" rx="1"/>
                        </svg>
                      </div>
                    )}
                    <span className="sidebar-board-name">{board.title}</span>
                  </div>
                  <button 
                    className="board-activity-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/board/${board.id}/activity`);
                    }}
                    title="View activity"
                  >
                    <Activity size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          {/* Organization Header */}
          <div className="organization-header">
            <div className="org-info">
              <div className="org-avatar">
                <svg viewBox="0 0 80 80" width="64" height="64">
                  <rect width="80" height="80" rx="12" fill="#0ea5e9"/>
                  <circle cx="40" cy="40" r="24" fill="white" opacity="0.3"/>
                </svg>
              </div>
              <div className="org-details">
                {editingWorkspace ? (
                  <input
                    type="text"
                    className="workspace-name-input"
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    onBlur={handleWorkspaceNameSave}
                    onKeyDown={handleWorkspaceNameKeyPress}
                    autoFocus
                  />
                ) : (
                  <h1 onClick={() => setEditingWorkspace(true)} className="workspace-name-editable">
                    {workspaceName}
                  </h1>
                )}
                <p className="org-subtitle">Manage your boards and tasks</p>
              </div>
            </div>
          </div>

          {/* Boards Section */}
          <section className="boards-section">
            <div className="section-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <h2>Your boards</h2>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
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
        </main>
      </div>

      {/* Create Board Modal */}
      {showCreateModal && (
        <CreateBoardModal
          onClose={() => setShowCreateModal(false)}
          onCreateBoard={handleCreateBoard}
        />
      )}
    </div>
  );
}
