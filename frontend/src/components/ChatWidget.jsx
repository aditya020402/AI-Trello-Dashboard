import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader, Plus, Trash2, Edit2, BookOpen } from 'lucide-react';
import apiClient from '../lib/apiClient';
import '../styles/ChatWidget.css';

export default function ChatWidget({ cardContent, cardId, availableCards = [], workspaceId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCards, setSelectedCards] = useState([]);
  const [showCardSelector, setShowCardSelector] = useState(false);
  const [ticketSuggestion, setTicketSuggestion] = useState(null);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [editSuggestion, setEditSuggestion] = useState(null);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  const [ragStatus, setRagStatus] = useState(null);
  const [ragSources, setRagSources] = useState([]);
  const [lastAgentType, setLastAgentType] = useState(null); // Track which agent produced last response
  const [lastResponse, setLastResponse] = useState(null); // Track the full response from agent
  const messagesEndRef = useRef(null);

  // Fetch RAG status for workspace
  useEffect(() => {
    if (workspaceId) {
      fetchRAGStatus();
    }
  }, [workspaceId]);

  const fetchRAGStatus = async () => {
    try {
      const response = await apiClient.get(`/rag/status/${workspaceId}`);
      if (response.data.ragEnabled) {
        setRagStatus(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch RAG status:', err);
      // RAG not available for this workspace
      setRagStatus(null);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-select single card when clicked
  useEffect(() => {
    if (cardId && !selectedCards.find(c => c.id === cardId)) {
      setSelectedCards(prev => [...prev, { id: cardId, title: cardContent?.title, description: cardContent?.description, status: cardContent?.status, listName: cardContent?.listName }]);
    }
  }, [cardId, cardContent]);

  const handleToggleCard = (card) => {
    const isSelected = selectedCards.find(c => c.id === card.id);
    if (isSelected) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handleRemoveSelectedCard = (cardId) => {
    setSelectedCards(selectedCards.filter(c => c.id !== cardId));
  };

  const getAssistantMessage = (agentType, responseData) => {
    switch (agentType) {
      case 'ticket_creation':
        return `I've prepared a new ticket for you: "${responseData?.data?.title || 'New Ticket'}". Click the button below to review and create it.`;
      case 'ticket_update':
        return `I've prepared suggested edits for this ticket. Click the button below to review the changes.`;
      case 'knowledge':
        return responseData?.answer || responseData?.response || 'Here\'s what I found:';
      default:
        return responseData?.response || responseData?.answer || 'Done!';
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();

    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    const userMessageObj = { role: 'user', content: userMessage };
    setMessages([...messages, userMessageObj]);
    setInputValue('');
    setLoading(true);
    setError(null);
    setTicketSuggestion(null);
    setEditSuggestion(null);
    setRagSources([]);
    setLastAgentType(null);
    setLastResponse(null);

    try {
      let endpoint, payload, response;

      if (useRAG) {
        // RAG mode - query knowledge base
        endpoint = '/rag/query';
        payload = {
          workspaceId,
          question: userMessage,
        };
        
        response = await apiClient.post(endpoint, payload);
        
        if (response.data.success) {
          const assistantMessage = {
            role: 'assistant',
            content: response.data.answer,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setRagSources(response.data.sources || []);
        } else {
          setError('Failed to get answer from knowledge base');
          setMessages((prev) => prev.slice(0, -1));
        }
      } else if (selectedCards.length === 0) {
        // No cards selected - try RAG first if available, then fall back to general agent
        const ragAvailable = ragStatus?.ragEnabled && ragStatus?.rag_status === 'completed';
        
        if (ragAvailable) {
          // Try RAG query first
          endpoint = '/rag/query';
          payload = {
            workspaceId,
            question: userMessage,
          };
          
          response = await apiClient.post(endpoint, payload);
          
          if (response.data.success && response.data.sources && response.data.sources.length > 0) {
            // RAG found relevant sources - use the answer
            const assistantMessage = {
              role: 'assistant',
              content: response.data.answer,
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setRagSources(response.data.sources || []);
            setLastAgentType('knowledge');
          } else {
            // RAG has no relevant sources - fall back to general agent
            endpoint = '/chat/orchestrate';
            payload = {
              message: userMessage,
              selectedCards: [],
              workspaceId,
            };
            
            response = await apiClient.post(endpoint, payload);
            
            if (response.data.success) {
              const assistantMessage = {
                role: 'assistant',
                content: getAssistantMessage(response.data.agentType, response.data),
              };
              setMessages((prev) => [...prev, assistantMessage]);
              
              // Track agent type and response for button display
              setLastAgentType(response.data.agentType);
              setLastResponse(response.data);
              
              // Show ticket creation suggestion if agent returned one
              if (response.data.agentType === 'ticket_creation' && response.data.data) {
                setTicketSuggestion(response.data.data);
              }
            } else {
              setError('Failed to get response');
              setMessages((prev) => prev.slice(0, -1));
            }
          }
        } else {
          // RAG not available - use general agent directly
          endpoint = '/chat/orchestrate';
          payload = {
            message: userMessage,
            selectedCards: [],
            workspaceId,
          };
          
          response = await apiClient.post(endpoint, payload);
          
          if (response.data.success) {
            const assistantMessage = {
              role: 'assistant',
              content: getAssistantMessage(response.data.agentType, response.data),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            
            // Track agent type and response for button display
            setLastAgentType(response.data.agentType);
            setLastResponse(response.data);
            
            // Show ticket creation suggestion if agent returned one
            if (response.data.agentType === 'ticket_creation' && response.data.data) {
              setTicketSuggestion(response.data.data);
            }
          } else {
            setError('Failed to get response');
            setMessages((prev) => prev.slice(0, -1));
          }
        }
      } else {
        // Cards are selected - use card-based endpoints
        if (selectedCards.length === 1) {
          // Single card - use original endpoint
          endpoint = `/chat/card/${selectedCards[0].id}`;
          payload = {
            message: userMessage,
            cardContent: selectedCards[0],
          };
        } else {
          // Multiple cards - use new endpoint
          endpoint = '/chat/multi-card';
          payload = {
            message: userMessage,
            cardsContent: selectedCards.map(card => ({
              id: card.id,
              title: card.title,
              description: card.description,
              status: card.status,
              listName: card.listName
            }))
          };
        }

        response = await apiClient.post(endpoint, payload);

        if (response.data.success) {
          const assistantMessage = {
            role: 'assistant',
            content: getAssistantMessage(response.data.agentType, response.data),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          
          // Track agent type and response for button display
          setLastAgentType(response.data.agentType);
          setLastResponse(response.data);
          
          // Show appropriate suggestions based on agent type
          if (response.data.agentType === 'ticket_update' && response.data.fullResult?.data) {
            setEditSuggestion({ ...response.data.fullResult.data, cardId: selectedCards[0].id });
          } else if (response.data.agentType === 'ticket_creation' && response.data.fullResult?.data) {
            setTicketSuggestion(response.data.fullResult.data);
          }
        } else {
          setError('Failed to get response');
          setMessages((prev) => prev.slice(0, -1));
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(err.response?.data?.error || 'Failed to send message');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicketFromAI = async () => {
    if (!inputValue.trim()) return;

    setCreatingTicket(true);
    setError(null);

    try {
      const response = await apiClient.post('/chat/create-ticket', {
        userRequest: inputValue,
        boardContext: selectedCards.length > 0 ? `Current cards: ${selectedCards.map(c => c.title).join(', ')}` : ''
      });

      if (response.data.success) {
        setTicketSuggestion(response.data.ticketData);
      } else {
        setError('Failed to create ticket suggestion');
      }
    } catch (err) {
      console.error('Ticket creation error:', err);
      setError(err.response?.data?.error || 'Failed to create ticket');
    } finally {
      setCreatingTicket(false);
    }
  };

  const handleEditTicketFromAI = async () => {
    if (!inputValue.trim()) return;
    if (selectedCards.length !== 1) {
      setError('Please select a single card to edit');
      return;
    }

    setUpdatingTicket(true);
    setError(null);

    try {
      const targetCard = selectedCards[0];
      const response = await apiClient.post('/chat/edit-ticket', {
        userRequest: inputValue,
        cardContent: {
          id: targetCard.id,
          title: targetCard.title,
          description: targetCard.description,
          status: targetCard.status,
          listName: targetCard.listName,
        },
      });

      if (response.data.success) {
        setEditSuggestion({ ...response.data.ticketData, cardId: targetCard.id });
      } else {
        setError('Failed to create edit suggestion');
      }
    } catch (err) {
      console.error('Ticket edit error:', err);
      setError(err.response?.data?.error || 'Failed to create edit suggestion');
    } finally {
      setUpdatingTicket(false);
    }
  };

  const handleApplyTicketEdit = () => {
    if (editSuggestion?.cardId) {
      window.dispatchEvent(
        new CustomEvent('applyAITicketEdit', {
          detail: {
            cardId: editSuggestion.cardId,
            updates: {
              title: editSuggestion.title,
              description: editSuggestion.description,
            },
          },
        })
      );
      setEditSuggestion(null);
      setInputValue('');
    }
  };

  const handleAcceptTicket = () => {
    // This will trigger parent component logic to create the ticket
    if (ticketSuggestion) {
      // Dispatch event or callback to parent
      window.dispatchEvent(new CustomEvent('acceptAITicket', { detail: { ticketData: ticketSuggestion } }));
      setTicketSuggestion(null);
      setInputValue('');
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setError(null);
    setTicketSuggestion(null);
    setEditSuggestion(null);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleOpen = () => {
    setIsOpen(true);
    setError(null);
  };

  const isSingleCardSelected = selectedCards.length === 1;

  return (
    <>
      {/* Chat Bubble Button */}
      {!isOpen && (
        <button
          className="chat-bubble-btn"
          onClick={handleOpen}
          title="Open AI Assistant"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="chat-widget">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-title">
              <MessageCircle size={18} />
              <span>AI Assistant</span>
            </div>
            <button
              className="chat-close-btn"
              onClick={handleClose}
              title="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* RAG Mode Toggle */}
          {ragStatus?.ragEnabled && ragStatus?.status === 'completed' && (
            <div className="rag-mode-toggle">
              <button
                className={`rag-toggle-btn ${useRAG ? 'active' : ''}`}
                onClick={() => {
                  setUseRAG(!useRAG);
                  setRagSources([]);
                }}
                title={useRAG ? "Switch to card chat" : "Switch to knowledge base"}
              >
                <BookOpen size={16} />
                <span>{useRAG ? 'Knowledge Base' : 'Card Chat'}</span>
              </button>
              {useRAG && (
                <small className="rag-mode-hint">
                  Ask questions about your project docs, wikis, MRs, and issues
                </small>
              )}
            </div>
          )}

          {/* Selected Cards Info */}
          {!useRAG && (
            <div className="chat-selected-cards">
              {selectedCards.length > 0 && (
              <>
                <div className="cards-header">
                  <span className="cards-count">{selectedCards.length} card(s) selected</span>
                  <button 
                    className="btn-add-card"
                    onClick={() => setShowCardSelector(!showCardSelector)}
                    title="Add more cards"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="selected-cards-list">
                  {selectedCards.map((card) => (
                    <div key={card.id} className="selected-card-chip">
                      <span>{card.title}</span>
                      <button
                        onClick={() => handleRemoveSelectedCard(card.id)}
                        className="remove-card-btn"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

              {/* Show card selector button when no cards selected */}
              {selectedCards.length === 0 && availableCards.length > 0 && !showCardSelector && (
                <button 
                  className="btn-select-cards"
                  onClick={() => setShowCardSelector(true)}
                  title="Select cards to discuss"
                >
                  <Plus size={16} /> Select Cards
                </button>
              )}

            {showCardSelector && availableCards.length > 0 && (
              <div className="card-selector">
                <div className="selector-title">Select Cards to Discuss</div>
                <div className="cards-list">
                  {availableCards.map((card) => (
                    <label key={card.id} className="card-checkbox">
                      <input
                        type="checkbox"
                        checked={!!selectedCards.find(c => c.id === card.id)}
                        onChange={() => handleToggleCard(card)}
                      />
                      <span className="card-label">{card.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}

          {/* Messages Container */}
          <div className="chat-messages">
            {messages.length === 0 && useRAG && (
              <div className="chat-empty-state">
                <p>Ask questions about your project knowledge base:</p>
                <ul>
                  <li>What are the main features of this project?</li>
                  <li>How do I set up the development environment?</li>
                  <li>What are the recent changes or updates?</li>
                  <li>Explain the architecture</li>
                </ul>
                <small className="rag-status-info">
                  📚 Knowledge base includes: {ragStatus?.totalDocuments || 0} documents, {ragStatus?.totalChunks || 0} chunks
                </small>
              </div>
            )}

            {messages.length === 0 && !useRAG && selectedCards.length > 0 && (
              <div className="chat-empty-state">
                <p>
                  {selectedCards.length === 1
                    ? 'Start by asking questions about this card:'
                    : `You have ${selectedCards.length} cards selected. Ask questions about them!`}
                </p>
                <ul>
                  <li>Summarize these issues</li>
                  <li>Identify common themes</li>
                  <li>Suggest priorities</li>
                  {selectedCards.length === 1 && <li>Edit this ticket with AI</li>}
                  <li>Create a new ticket from AI</li>
                </ul>
              </div>
            )}

            {messages.length === 0 && !useRAG && selectedCards.length === 0 && (
              <div className="chat-empty-state">
                <p>Ask AI anything or create a new ticket</p>
                <ul>
                  <li>Create a new ticket: "Add dark mode support"</li>
                  <li>Ask general questions: "How do I set up the project?"</li>
                  <li>Or select cards to discuss specific issues</li>
                </ul>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.role}`}>
                <div className="message-content">{msg.content}</div>
              </div>
            ))}

            {loading && (
              <div className="chat-message assistant">
                <div className="message-content loading">
                  <Loader size={16} className="spinner" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}

            {creatingTicket && (
              <div className="chat-message assistant">
                <div className="message-content loading">
                  <Loader size={16} className="spinner" />
                  <span>Creating ticket...</span>
                </div>
              </div>
            )}

            {updatingTicket && (
              <div className="chat-message assistant">
                <div className="message-content loading">
                  <Loader size={16} className="spinner" />
                  <span>Preparing edits...</span>
                </div>
              </div>
            )}

            {editSuggestion && (
              <div className="ticket-suggestion ticket-edit-suggestion">
                <div className="suggestion-header">✨ AI Suggested Edits</div>
                <div className="suggestion-content">
                  <div className="suggestion-field">
                    <label>Title:</label>
                    <p className="suggestion-value">{editSuggestion.title}</p>
                  </div>
                  <div className="suggestion-field">
                    <label>Description:</label>
                    <p className="suggestion-value">{editSuggestion.description}</p>
                  </div>
                  {editSuggestion.reasoning && (
                    <div className="suggestion-field">
                      <label>Reasoning:</label>
                      <p className="suggestion-value">{editSuggestion.reasoning}</p>
                    </div>
                  )}
                </div>
                <div className="suggestion-actions">
                  <button
                    className="btn-apply-ticket"
                    onClick={handleApplyTicketEdit}
                  >
                    Apply Changes
                  </button>
                  <button
                    className="btn-reject-ticket"
                    onClick={() => setEditSuggestion(null)}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* Ticket Suggestion Display */}
            {ticketSuggestion && (
              <div className="ticket-suggestion">
                <div className="suggestion-header">✨ AI Suggested Ticket</div>
                <div className="suggestion-content">
                  <div className="suggestion-field">
                    <label>Title:</label>
                    <p className="suggestion-value">{ticketSuggestion.title}</p>
                  </div>
                  <div className="suggestion-field">
                    <label>Description:</label>
                    <p className="suggestion-value">{ticketSuggestion.description}</p>
                  </div>
                  <div className="suggestion-field">
                    <label>List:</label>
                    <p className="suggestion-value">{ticketSuggestion.suggestedList}</p>
                  </div>
                  <div className="suggestion-field">
                    <label>Priority:</label>
                    <p className="suggestion-value">{ticketSuggestion.priority}</p>
                  </div>
                </div>
                <div className="suggestion-actions">
                  <button 
                    className="btn-accept-ticket"
                    onClick={handleAcceptTicket}
                  >
                    Create Ticket
                  </button>
                  <button 
                    className="btn-reject-ticket"
                    onClick={() => setTicketSuggestion(null)}
                  >
                    Discard
                  </button>
                </div>
              </div>
            )}

            {/* RAG Sources Display */}
            {ragSources.length > 0 && (
              <div className="rag-sources">
                <div className="sources-header">📚 Sources:</div>
                <div className="sources-list">
                  {ragSources.map((source, idx) => (
                    <div key={idx} className="source-item">
                      <div className="source-header">
                        <div className="source-type-and-title">
                          <span className="source-type">
                            {source.type === 'wiki' && '📖'}
                            {source.type === 'merge_request' && '🔀'}
                            {source.type === 'issue_comment' && '🐛'}
                            {!['wiki', 'merge_request', 'issue_comment'].includes(source.type) && '📄'}
                            {' '}
                            {source.type === 'merge_request' ? 'Merge Request' : source.type === 'issue_comment' ? 'Issue' : source.type === 'wiki' ? 'Wiki' : source.type}
                          </span>
                          {source.metadata?.title && (
                            <span className="source-title">{source.metadata.title}</span>
                          )}
                        </div>
                        <span className="source-similarity">{Math.round(source.similarity * 100)}% match</span>
                      </div>
                      {source.metadata?.author && (
                        <div className="source-meta">👤 {source.metadata.author}</div>
                      )}
                      {source.url && (
                        <a 
                          href={source.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="source-link"
                        >
                          View source →
                        </a>
                      )}
                      <p className="source-preview">{source.preview}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="chat-error">
                <p>{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form className="chat-input-form" onSubmit={handleSendMessage}>
            <input
              type="text"
              className="chat-input"
              placeholder={useRAG ? "Ask about your project documentation..." : "Ask AI something or request a new ticket..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading || creatingTicket || updatingTicket}
            />
            {/* Create Ticket Button - Show when last agent created a ticket or when not in RAG mode */}
            {!useRAG && (
              <button
                type="button"
                className="chat-create-ticket-btn"
                onClick={handleCreateTicketFromAI}
                disabled={creatingTicket || loading || updatingTicket || !inputValue.trim()}
                title="Create new ticket with AI"
              >
                {creatingTicket ? <Loader size={18} className="spinner" /> : <Plus size={18} />}
              </button>
            )}
            {/* Edit Ticket Button - Show when last agent updated a ticket or when single card is selected */}
            {!useRAG && isSingleCardSelected && (
              <button
                type="button"
                className="chat-edit-ticket-btn"
                onClick={handleEditTicketFromAI}
                disabled={updatingTicket || loading || creatingTicket || !inputValue.trim()}
                title="Edit selected ticket with AI"
              >
                {updatingTicket ? <Loader size={18} className="spinner" /> : <Edit2 size={18} />}
              </button>
            )}
            <button
              type="submit"
              className="chat-send-btn"
              disabled={loading || creatingTicket || updatingTicket || !inputValue.trim()}
              title="Send message"
            >
              {loading ? (
                <Loader size={18} className="spinner" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </form>

          {/* Clear Chat Button */}
          {messages.length > 0 && (
            <button
              className="chat-clear-btn"
              onClick={handleClearChat}
              title="Clear conversation"
            >
              Clear Chat
            </button>
          )}
        </div>
      )}
    </>
  );
}
