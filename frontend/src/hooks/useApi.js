import { useState, useCallback, useEffect } from 'react';
import apiClient from '../lib/apiClient';

/**
 * Hook for fetching workspaces
 */
export const useWorkspaces = () => {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get('/workspaces');
      setWorkspaces(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkspace = useCallback(async (workspaceData) => {
    try {
      const response = await apiClient.post('/workspaces', workspaceData);
      setWorkspaces((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateWorkspace = useCallback(async (workspaceId, updates) => {
    try {
      const response = await apiClient.patch(`/workspaces/${workspaceId}`, updates);
      setWorkspaces((prev) =>
        prev.map((ws) => (ws.id === workspaceId ? response.data : ws))
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteWorkspace = useCallback(async (workspaceId) => {
    try {
      await apiClient.delete(`/workspaces/${workspaceId}`);
      setWorkspaces((prev) => prev.filter((ws) => ws.id !== workspaceId));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    workspaces,
    loading,
    error,
    fetchWorkspaces,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
};

/**
 * Hook for fetching boards
 */
export const useBoards = (workspaceId = null) => {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = workspaceId ? { workspaceId } : {};
      const response = await apiClient.get('/boards', { params });
      setBoards(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const createBoard = useCallback(async (boardData) => {
    try {
      const response = await apiClient.post('/boards', boardData);
      setBoards((prev) => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateBoard = useCallback(async (boardId, updates) => {
    try {
      const response = await apiClient.patch(`/boards/${boardId}`, updates);
      setBoards((prev) =>
        prev.map((board) => (board.id === boardId ? response.data : board))
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteBoard = useCallback(async (boardId) => {
    try {
      await apiClient.delete(`/boards/${boardId}`);
      setBoards((prev) => prev.filter((board) => board.id !== boardId));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    boards,
    loading,
    error,
    fetchBoards,
    createBoard,
    updateBoard,
    deleteBoard,
  };
};

/**
 * Hook for fetching lists
 */
export const useLists = (boardId) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLists = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/lists/board/${boardId}`);
      setLists(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  const createList = useCallback(async (title) => {
    try {
      const response = await apiClient.post('/lists', {
        boardId,
        title,
      });
      setLists((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [boardId]);

  const updateList = useCallback(async (listId, updates) => {
    try {
      const response = await apiClient.patch(`/lists/${listId}`, updates);
      setLists((prev) =>
        prev.map((list) => (list.id === listId ? response.data : list))
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteList = useCallback(async (listId) => {
    try {
      await apiClient.delete(`/lists/${listId}`);
      setLists((prev) => prev.filter((list) => list.id !== listId));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    lists,
    loading,
    error,
    fetchLists,
    createList,
    updateList,
    deleteList,
  };
};

/**
 * Hook for fetching cards
 */
export const useCards = (listId) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCards = useCallback(async () => {
    if (!listId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.get(`/cards/list/${listId}`);
      setCards(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [listId]);

  const createCard = useCallback(async (title, description = '') => {
    try {
      const response = await apiClient.post('/cards', {
        listId,
        title,
        description,
      });
      setCards((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      throw err;
    }
  }, [listId]);

  const updateCard = useCallback(async (cardId, updates) => {
    try {
      const response = await apiClient.patch(`/cards/${cardId}`, updates);
      setCards((prev) =>
        prev.map((card) => (card.id === cardId ? response.data : card))
      );
      return response.data;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteCard = useCallback(async (cardId) => {
    try {
      await apiClient.delete(`/cards/${cardId}`);
      setCards((prev) => prev.filter((card) => card.id !== cardId));
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    cards,
    loading,
    error,
    fetchCards,
    createCard,
    updateCard,
    deleteCard,
  };
};

/**
 * Hook for fetching activity logs
 */
export const useActivity = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchActivity = useCallback(async (boardId = null, workspaceId = null, limit = 50, offset = 0) => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit, offset };
      if (boardId) {
        params.boardId = boardId;
      }
      if (workspaceId) {
        params.workspaceId = workspaceId;
      }
      const response = await apiClient.get('/activity', { params });
      setActivities(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    activities,
    loading,
    error,
    fetchActivity,
  };
};
