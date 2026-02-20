import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLists, useCards } from '../hooks/useApi';
import { ArrowLeft, Edit2, RefreshCw, Loader, Maximize2, Minimize2, Target, Pause, Play, RotateCcw } from 'lucide-react';
import ListColumn from '../components/ListColumn';
import CreateListForm from '../components/CreateListForm';
import ChatWidget from '../components/ChatWidget';
import apiClient from '../lib/apiClient';
import { useCards as useCardsHook } from '../hooks/useApi';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import '../styles/Board.css';

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lists, loading, error, fetchLists, createList, updateList, deleteList } = useLists(boardId);
  const [board, setBoard] = useState(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const [showCreateList, setShowCreateList] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [overListId, setOverListId] = useState(null);
  const [editingBoardTitle, setEditingBoardTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [isGitLabBoard, setIsGitLabBoard] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [prioritizeMode, setPrioritizeMode] = useState(false);
  const [showPrioritizePicker, setShowPrioritizePicker] = useState(false);
  const [showPrioritizeExitPrompt, setShowPrioritizeExitPrompt] = useState(false);
  const [prioritizeCardId, setPrioritizeCardId] = useState(null);
  const [prioritizeSearch, setPrioritizeSearch] = useState('');
  const [progressUpdateText, setProgressUpdateText] = useState('');
  const [savingProgressUpdate, setSavingProgressUpdate] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [allCards, setAllCards] = useState([]); // For multi-card selection in chat
  const [cardsByList, setCardsByList] = useState({});
  const [focusTimerSeconds, setFocusTimerSeconds] = useState(30 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchBoard();
    fetchLists();
    setCardsByList({});
  }, [boardId]);

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && showPrioritizePicker) {
        setShowPrioritizePicker(false);
        return;
      }

      if (e.key === 'Escape' && showPrioritizeExitPrompt) {
        setShowPrioritizeExitPrompt(false);
        return;
      }

      if (e.key === 'Escape' && prioritizeMode) {
        openPrioritizeExitPrompt();
        return;
      }

      if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
        setPrioritizeMode(false);
        setTimerRunning(false);
      }
    };

    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [focusMode, prioritizeMode, showPrioritizePicker, showPrioritizeExitPrompt, selectedCard]);

  useEffect(() => {
    if (!prioritizeMode || !timerRunning) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setFocusTimerSeconds((prevSeconds) => {
        if (prevSeconds <= 1) {
          window.clearInterval(timer);
          setTimerRunning(false);
          alert('Focus session complete! Great work.');
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [prioritizeMode, timerRunning]);

  // Collect all cards from all lists for multi-card selection
  useEffect(() => {
    const cardsFromLists = (lists || []).flatMap((list) =>
      (list.cards || []).map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description || '',
        status: card.status || 'To Do',
        listName: list.title,
        listId: list.id,
      }))
    );

    const cardsFromColumns = Object.values(cardsByList).flatMap((entry) =>
      (entry.cards || []).map((card) => ({
        id: card.id,
        title: card.title,
        description: card.description || '',
        status: card.status || 'To Do',
        listName: entry.listTitle,
        listId: entry.listId,
      }))
    );

    const mergedById = new Map();
    [...cardsFromLists, ...cardsFromColumns].forEach((card) => {
      mergedById.set(card.id, card);
    });

    setAllCards(Array.from(mergedById.values()));
  }, [lists, cardsByList]);

  const handleListCardsLoaded = useCallback((listId, listTitle, cards) => {
    setCardsByList((prev) => ({
      ...prev,
      [listId]: {
        listId,
        listTitle,
        cards: cards || [],
      },
    }));
  }, []);

  const filteredPrioritizeCards = useMemo(() => {
    return allCards.filter((card) => {
      const query = prioritizeSearch.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return (
        card.title.toLowerCase().includes(query) ||
        (card.description || '').toLowerCase().includes(query) ||
        (card.listName || '').toLowerCase().includes(query)
      );
    });
  }, [allCards, prioritizeSearch]);

  const selectedPrioritizeCard = allCards.find((card) => card.id === prioritizeCardId);

  useEffect(() => {
    if (!showPrioritizePicker) {
      return;
    }

    if (filteredPrioritizeCards.length === 0) {
      setPrioritizeCardId(null);
      return;
    }

    if (!filteredPrioritizeCards.some((card) => card.id === prioritizeCardId)) {
      setPrioritizeCardId(filteredPrioritizeCards[0].id);
    }
  }, [showPrioritizePicker, filteredPrioritizeCards, prioritizeCardId]);

  // Listen for AI-suggested ticket acceptance
  useEffect(() => {
    const handleAcceptAITicket = async (event) => {
      const { ticketData } = event.detail;
      try {
        // Find the target list (suggested list or first list)
        let targetListId = lists[0]?.id;
        if (ticketData.suggestedList) {
          const targetList = lists.find(
            (l) => l.title.toLowerCase() === ticketData.suggestedList.toLowerCase()
          );
          targetListId = targetList?.id || lists[0]?.id;
        }

        // Create the new card
        if (targetListId) {
          await apiClient.post(`/cards`, {
            listId: targetListId,
            title: ticketData.title,
            description: ticketData.description,
          });

          // Refresh lists to show the new card
          await fetchLists();
          alert(`✓ Ticket created: "${ticketData.title}"`);
        }
      } catch (err) {
        console.error('Error creating AI ticket:', err);
        alert('Failed to create ticket. Please try again.');
      }
    };

    window.addEventListener('acceptAITicket', handleAcceptAITicket);
    return () => {
      window.removeEventListener('acceptAITicket', handleAcceptAITicket);
    };
  }, [lists]);

  // Listen for AI-suggested edits on existing tickets
  useEffect(() => {
    const handleApplyAITicketEdit = async (event) => {
      const { cardId, updates } = event.detail || {};
      if (!cardId || !updates) {
        return;
      }

      try {
        await apiClient.patch(`/cards/${cardId}`, {
          title: updates.title,
          description: updates.description,
        });

        await fetchLists();
        const updatedTitle = updates.title || 'Ticket';
        alert(`✓ Ticket updated: "${updatedTitle}"`);
      } catch (err) {
        console.error('Error updating AI ticket:', err);
        alert('Failed to update ticket. Please try again.');
      }
    };

    window.addEventListener('applyAITicketEdit', handleApplyAITicketEdit);
    return () => {
      window.removeEventListener('applyAITicketEdit', handleApplyAITicketEdit);
    };
  }, [fetchLists]);

  const fetchBoard = async () => {
    try {
      const response = await apiClient.get(`/boards/${boardId}`);
      setBoard(response.data);
      setBoardTitle(response.data.title);
      // Check if this board belongs to a GitLab workspace
      setIsGitLabBoard(response.data.workspace_name === 'GitLab');
    } catch (err) {
      console.error('Failed to fetch board:', err);
      navigate('/dashboard');
    } finally {
      setBoardLoading(false);
    }
  };

  const handleSyncGitLabIssues = async () => {
    setSyncing(true);
    try {
      const response = await apiClient.post(`/gitlab/board/${boardId}/sync`);
      if (response.data.success) {
        // Refresh lists and cards
        await fetchLists();
        alert(`Synced successfully! ${response.data.cardsAdded} new issues added.`);
      }
    } catch (err) {
      console.error('Error syncing issues:', err);
      alert(err.response?.data?.error || 'Failed to sync GitLab issues');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateList = async (title) => {
    try {
      await createList(title);
      setShowCreateList(false);
    } catch (err) {
      console.error('Failed to create list:', err);
    }
  };

  const handleDeleteList = async (listId) => {
    if (window.confirm('Delete this list and all its cards?')) {
      try {
        await deleteList(listId);
      } catch (err) {
        console.error('Failed to delete list:', err);
      }
    }
  };

  const handleUpdateListOrder = async (listId, newOrder) => {
    try {
      await updateList(listId, { orderIndex: newOrder });
    } catch (err) {
      console.error('Failed to update list order:', err);
    }
  };

  const handleBoardTitleSave = async () => {
    if (boardTitle.trim() && boardTitle !== board.title) {
      try {
        const response = await apiClient.patch(`/boards/${boardId}`, { title: boardTitle });
        setBoard(response.data);
      } catch (err) {
        console.error('Failed to update board title:', err);
        setBoardTitle(board.title);
      }
    }
    setEditingBoardTitle(false);
  };

  const handleBoardTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleBoardTitleSave();
    } else if (e.key === 'Escape') {
      setBoardTitle(board.title);
      setEditingBoardTitle(false);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    
    if (!over) {
      setOverListId(null);
      return;
    }

    // Check if we're over a list container
    if (over.id.toString().startsWith('list-')) {
      const listId = parseInt(over.id.toString().replace('list-', ''));
      setOverListId(listId);
    }
    // If hovering over a card, we'll keep the current list context
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    
    let targetListId = null;

    if (over) {
      // Check if dropping on a list container
      if (over.id.toString().startsWith('list-')) {
        targetListId = parseInt(over.id.toString().replace('list-', ''));
      } else if (overListId) {
        // Use the list we were tracking during drag over
        targetListId = overListId;
      }
    }

    setOverListId(null);

    if (targetListId && active.id !== over?.id) {
      try {
        // Update card to new list
        await apiClient.patch(`/cards/${active.id}`, {
          listId: targetListId,
        });
        
        // Refresh lists to show updated cards
        await fetchLists();
      } catch (err) {
        console.error('Failed to move card:', err);
      }
    }
  };

  const handleBackToDashboard = () => {
    setShowPrioritizePicker(false);
    setShowPrioritizeExitPrompt(false);
    setPrioritizeMode(false);
    setFocusMode(false);
    setTimerRunning(false);

    navigate('/dashboard', { replace: true });

    window.setTimeout(() => {
      const dashboardRendered = Boolean(document.querySelector('.dashboard-layout'));
      if (window.location.pathname === '/dashboard' && !dashboardRendered) {
        window.location.assign('/dashboard');
      }
    }, 80);
  };

  const formatTimer = (totalSeconds) => {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${seconds}`;
  };

  const handleToggleFocusMode = () => {
    const nextFocus = !focusMode;
    setFocusMode(nextFocus);
    if (!nextFocus) {
      setPrioritizeMode(false);
      setTimerRunning(false);
    }
  };

  const handleStartPrioritizeMode = () => {
    if (allCards.length === 0) {
      alert('No tickets available to prioritize yet.');
      return;
    }

    setPrioritizeCardId(selectedCard?.id || allCards[0]?.id || null);
    setPrioritizeSearch('');
    setShowPrioritizePicker(true);
  };

  const handleConfirmPrioritizeMode = () => {
    if (!prioritizeCardId || !selectedPrioritizeCard) {
      alert('Select one ticket to start prioritize mode.');
      return;
    }

    setSelectedCard(selectedPrioritizeCard);
    setShowPrioritizePicker(false);
    setFocusMode(true);
    setPrioritizeMode(true);
    setFocusTimerSeconds(30 * 60);
    setTimerRunning(true);
  };

  const performExitPrioritizeMode = () => {
    setShowPrioritizeExitPrompt(false);
    setShowPrioritizePicker(false);
    setPrioritizeSearch('');
    setPrioritizeMode(false);
    setTimerRunning(false);
    setFocusTimerSeconds(30 * 60);
  };

  const openPrioritizeExitPrompt = () => {
    setProgressUpdateText(selectedCard?.description || '');
    setShowPrioritizeExitPrompt(true);
  };

  const handleExitWithoutUpdate = () => {
    performExitPrioritizeMode();
  };

  const handleSaveProgressAndExit = async () => {
    if (!selectedCard?.id) {
      performExitPrioritizeMode();
      return;
    }

    setSavingProgressUpdate(true);
    try {
      await apiClient.patch(`/cards/${selectedCard.id}`, {
        description: progressUpdateText,
      });

      setSelectedCard((prev) => (
        prev ? { ...prev, description: progressUpdateText } : prev
      ));
      await fetchLists();
      performExitPrioritizeMode();
    } catch (err) {
      console.error('Failed to save progress update:', err);
      alert('Failed to update issue description. Please try again.');
    } finally {
      setSavingProgressUpdate(false);
    }
  };

  const handleExitPrioritizeMode = () => {
    openPrioritizeExitPrompt();
  };

  const handleResetTimer = () => {
    setFocusTimerSeconds(30 * 60);
    setTimerRunning(false);
  };

  if (boardLoading) {
    return <div className="loading">Loading board...</div>;
  }

  if (!board) {
    return <div className="error-message">Board not found</div>;
  }

  // Gradient backgrounds for GitLab boards
  const gitlabBackgrounds = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
    'linear-gradient(135deg, #ff9a56 0%, #ff6a88 100%)',
    'linear-gradient(135deg, #2e2e78 0%, #16213e 100%)',
    'linear-gradient(135deg, #8ec5fc 0%, #e0c3fc 100%)',
  ];

  // Inline styles for background image
  let boardStyle = {};
  
  if (board.image_full_url) {
    boardStyle = {
      backgroundImage: `url(${board.image_full_url})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      minHeight: '100vh'
    };
  } else if (board.workspace_name === 'GitLab') {
    // Apply gradient for GitLab boards
    const backgroundIndex = board.id % gitlabBackgrounds.length;
    boardStyle = {
      background: gitlabBackgrounds[backgroundIndex],
      minHeight: '100vh'
    };
  }

  return (
    <div className="board-container" style={boardStyle}>
      <div className="board-overlay">
        {boardLoading && (
          <div className="board-loading-overlay">
            <div className="loading-content">
              <Loader size={40} className="spinner" />
              <p>Loading board...</p>
            </div>
          </div>
        )}
        {!boardLoading && (
          <>
        <header className={`board-header ${focusMode ? 'focus-mode-hidden' : ''}`}>
          <button
            className="btn-back"
            onClick={handleBackToDashboard}
            title="Back to dashboard"
          >
            <ArrowLeft size={20} />
            Back
          </button>
          <div className="board-header-content">
            {editingBoardTitle ? (
              <input
                type="text"
                className="board-title-input"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                onBlur={handleBoardTitleSave}
                onKeyDown={handleBoardTitleKeyPress}
                autoFocus
              />
            ) : (
              <div className="board-title-container">
                <h1 onClick={() => setEditingBoardTitle(true)}>{board.title}</h1>
                <button 
                  className="btn-edit-title"
                  onClick={() => setEditingBoardTitle(true)}
                  title="Rename board"
                >
                  <Edit2 size={16} />
                </button>
                {isGitLabBoard && (
                  <button 
                    className="btn-sync-gitlab"
                    onClick={handleSyncGitLabIssues}
                    disabled={syncing}
                    title="Sync with GitLab"
                  >
                    {syncing ? <Loader size={16} className="spinner" /> : <RefreshCw size={16} />}
                  </button>
                )}
              </div>
            )}
          </div>
          <button
            className={`btn-prioritize-mode ${allCards.length === 0 ? 'disabled' : ''}`}
            onClick={prioritizeMode ? handleExitPrioritizeMode : handleStartPrioritizeMode}
            title={prioritizeMode ? 'Exit prioritize mode' : 'Choose a ticket and start prioritize mode (30 min)'}
            disabled={allCards.length === 0 && !prioritizeMode}
          >
            <Target size={18} />
            {prioritizeMode ? 'Exit Prioritize' : 'Prioritize'}
          </button>
          <button
            className="btn-focus-mode"
            onClick={handleToggleFocusMode}
            title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
          >
            {focusMode ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
        </header>

        {/* Main Content */}
        <main className={`board-main ${focusMode ? 'focus-mode-active' : ''}`}>
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className={`lists-container ${prioritizeMode ? 'prioritize-layout' : ''}`}>
            {error && <div className="error-message">{error}</div>}

            {prioritizeMode && selectedCard && (
              <div className="prioritize-panel">
                <div className="prioritize-header">
                  <h2>Prioritize Mode</h2>
                  <div className="prioritize-timer">{formatTimer(focusTimerSeconds)}</div>
                </div>
                <div className="prioritize-controls">
                  <button
                    className="prioritize-control-btn"
                    onClick={() => setTimerRunning((prev) => !prev)}
                    title={timerRunning ? 'Pause timer' : 'Resume timer'}
                  >
                    {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                    {timerRunning ? 'Pause' : 'Resume'}
                  </button>
                  <button
                    className="prioritize-control-btn"
                    onClick={handleResetTimer}
                    title="Reset timer to 30:00"
                  >
                    <RotateCcw size={16} />
                    Reset
                  </button>
                  <button
                    className="prioritize-control-btn"
                    onClick={handleExitPrioritizeMode}
                    title="Exit prioritize mode"
                  >
                    <Minimize2 size={16} />
                    Exit
                  </button>
                </div>
                <div className="prioritize-ticket">
                  <h3>{selectedCard.title}</h3>
                  <p>{selectedCard.description || 'No description provided for this ticket.'}</p>
                </div>
              </div>
            )}

            {loading ? (
              <div className="loading">Loading lists...</div>
            ) : lists.length === 0 ? (
              <div className="empty-state">
                <p>No lists yet. Create one to get started!</p>
              </div>
            ) : (
              !prioritizeMode &&
              lists
                .sort((a, b) => a.order_index - b.order_index)
                .map((list) => (
                  <ListColumn
                    key={list.id}
                    list={list}
                    onDeleteList={() => handleDeleteList(list.id)}
                    boardId={boardId}
                    isOver={overListId === list.id}
                    onSelectCard={setSelectedCard}
                    onCardsLoaded={handleListCardsLoaded}
                  />
                ))
            )}

            {/* Create List Form */}
            {!prioritizeMode && (showCreateList ? (
              <CreateListForm
                onSubmit={handleCreateList}
                onCancel={() => setShowCreateList(false)}
              />
            ) : (
              <button
                className="btn-add-list"
                onClick={() => setShowCreateList(true)}
              >
                + Add List
              </button>
            ))}
          </div>
        </DndContext>
      </main>
      {!prioritizeMode && (
        <ChatWidget 
          cardContent={selectedCard} 
          cardId={selectedCard?.id} 
          availableCards={allCards} 
          workspaceId={board?.workspace_id}
        />
      )}
      {showPrioritizePicker && !prioritizeMode && (
        <div className="prioritize-picker-overlay" role="dialog" aria-modal="true" aria-label="Select issue for prioritize mode">
          <div className="prioritize-picker-modal">
            <h3>Select issue to focus on</h3>
            <p>Pick one ticket before starting the 30-minute timer.</p>
            <input
              type="text"
              className="prioritize-picker-search"
              placeholder="Search issues by title, description, or list"
              value={prioritizeSearch}
              onChange={(e) => setPrioritizeSearch(e.target.value)}
            />
            <select
              className="prioritize-picker-select"
              value={prioritizeCardId || ''}
              onChange={(e) => setPrioritizeCardId(Number(e.target.value))}
            >
              {filteredPrioritizeCards.length === 0 ? (
                <option value="" disabled>
                  No issues match your search
                </option>
              ) : (
                filteredPrioritizeCards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.title} — {card.listName}
                  </option>
                ))
              )}
            </select>
            <div className="prioritize-picker-actions">
              <button className="prioritize-picker-btn secondary" onClick={() => setShowPrioritizePicker(false)}>
                Cancel
              </button>
              <button
                className="prioritize-picker-btn primary"
                onClick={handleConfirmPrioritizeMode}
                disabled={!prioritizeCardId || filteredPrioritizeCards.length === 0}
              >
                Start 30:00 Focus
              </button>
            </div>
          </div>
        </div>
      )}
      {showPrioritizeExitPrompt && prioritizeMode && (
        <div className="prioritize-picker-overlay" role="dialog" aria-modal="true" aria-label="Update issue progress before exit">
          <div className="prioritize-picker-modal prioritize-exit-modal">
            <h3>Update issue before exit?</h3>
            <p>You can save your progress to this issue description before leaving prioritize mode.</p>
            <textarea
              className="prioritize-progress-textarea"
              value={progressUpdateText}
              onChange={(e) => setProgressUpdateText(e.target.value)}
              rows={8}
              placeholder="Add your progress notes here..."
            />
            <div className="prioritize-picker-actions">
              <button
                className="prioritize-picker-btn secondary"
                onClick={() => setShowPrioritizeExitPrompt(false)}
                disabled={savingProgressUpdate}
              >
                Continue Working
              </button>
              <button
                className="prioritize-picker-btn secondary"
                onClick={handleExitWithoutUpdate}
                disabled={savingProgressUpdate}
              >
                Exit Without Update
              </button>
              <button
                className="prioritize-picker-btn primary"
                onClick={handleSaveProgressAndExit}
                disabled={savingProgressUpdate}
              >
                {savingProgressUpdate ? 'Saving...' : 'Save & Exit'}
              </button>
            </div>
          </div>
        </div>
      )}
          </>
        )}
      </div>
    </div>
  );
}
