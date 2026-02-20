import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useActivity } from '../hooks/useApi';
import { ArrowLeft, Clock, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import '../styles/Activity.css';

export default function ActivityPage() {
  const navigate = useNavigate();
  const { boardId, workspaceId } = useParams();
  const { activities, loading, error, fetchActivity } = useActivity();
  const [boardTitle, setBoardTitle] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (boardId) {
      // Fetch activities for specific board
      fetchActivity(boardId, null);
      // Fetch board title
      fetchBoardTitle();
    } else if (workspaceId) {
      // Fetch activities for specific workspace
      fetchActivity(null, workspaceId);
      // Fetch workspace name
      fetchWorkspaceName();
    } else {
      // Fetch all activities
      fetchActivity();
    }
  }, [boardId, workspaceId]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    if (boardId) {
      await fetchActivity(boardId, null);
    } else if (workspaceId) {
      await fetchActivity(null, workspaceId);
    } else {
      await fetchActivity();
    }
    setIsRefreshing(false);
  };

  const fetchBoardTitle = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/boards/${boardId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const board = await response.json();
        setBoardTitle(board.title);
      }
    } catch (err) {
      console.error('Error fetching board title:', err);
    }
  };

  const fetchWorkspaceName = async () => {
    try {
      const response = await fetch(`http://localhost:3000/api/workspaces/${workspaceId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const workspace = await response.json();
        setWorkspaceName(workspace.name);
      }
    } catch (err) {
      console.error('Error fetching workspace name:', err);
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      CREATE: 'Started',
      UPDATE: 'Updated',
      DELETE: 'Deleted',
    };
    return labels[action] || action;
  };

  const getEntityIcon = (entityType) => {
    const icons = {
      BOARD: '📋',
      LIST: '📝',
      CARD: '🔖',
      RAG: '🧠',
    };
    return icons[entityType] || '📌';
  };

  const getStatusLabel = (status) => {
    const labels = {
      processing: '⏳ Processing',
      completed: '✅ Completed',
      failed: '❌ Failed',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      processing: '#f59e0b',
      completed: '#10b981',
      failed: '#ef4444',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="activity-container">
      {/* Header */}
      <header className="activity-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            className="btn-back"
            onClick={() => {
              if (boardId) {
                navigate(`/board/${boardId}`);
              } else if (workspaceId) {
                navigate('/dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <button
            style={{
              padding: '8px 12px',
              backgroundColor: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: '#374151',
              transition: 'all 0.2s'
            }}
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            title="Refresh activity log"
          >
            <RefreshCw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
        </div>
        <div>
          <h1>
            {boardId && boardTitle
              ? `${boardTitle} - Activity`
              : workspaceId && workspaceName
              ? `${workspaceName} - Activity`
              : 'Activity Log'}
          </h1>
          <p>
            Track all your {boardId ? 'board' : workspaceId ? 'workspace' : 'board, list, and card'} activities
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="activity-main">
        {error && <div className="error-message">{error}</div>}

        {loading ? (
          <div className="loading">Loading activity log...</div>
        ) : activities.length === 0 ? (
          <div className="empty-state">
            <Clock size={48} />
            <p>No activities yet</p>
          </div>
        ) : (
          <div className="activity-timeline">
            {activities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">
                  {getEntityIcon(activity.entity_type)}
                </div>
                <div className="activity-content">
                  {activity.entity_type === 'RAG' ? (
                    // RAG Activity rendering
                    <>
                      <div className="activity-action">
                        <strong>
                          {activity.status === 'processing' ? 'Creating Knowledge Base' : activity.status === 'completed' ? 'Knowledge Base Created' : 'Knowledge Base Failed'}
                        </strong>
                      </div>
                      <div className="activity-title">
                        "{activity.entity_title}"
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                        <div 
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: getStatusColor(activity.status)
                          }}
                        />
                        <span style={{ fontSize: '13px', color: '#666' }}>
                          {getStatusLabel(activity.status)}
                        </span>
                      </div>
                      {activity.extra_data && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                          {activity.extra_data.documents && (
                            <>✓ {activity.extra_data.documents} documents, {activity.extra_data.chunks} chunks {activity.extra_data.totalTime && `(${activity.extra_data.totalTime}s)`}</>
                          )}
                          {activity.extra_data.error && (
                            <>Error: {activity.extra_data.error}</>
                          )}
                        </div>
                      )}
                      <div className="activity-time">
                        {format(new Date(activity.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                      </div>
                    </>
                  ) : (
                    // Regular activity rendering
                    <>
                      <div className="activity-action">
                        <strong>{getActionLabel(activity.action)}</strong>
                        {' '}
                        <span className="entity-type">{activity.entity_type.toLowerCase()}</span>
                      </div>
                      <div className="activity-title">
                        "{activity.entity_title}"
                      </div>
                      <div className="activity-time">
                        {format(new Date(activity.created_at), 'MMM d, yyyy \'at\' h:mm a')}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
