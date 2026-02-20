import React, { useEffect, useState } from 'react';
import { useCards, useLists } from '../hooks/useApi';
import { Trash2, Plus } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import CardItem from './CardItem';
import CreateCardForm from './CreateCardForm';
import '../styles/components.css';

export default function ListColumn({ list, onDeleteList, boardId, isOver, onSelectCard, onCardsLoaded }) {
  const { cards, loading, fetchCards, createCard, updateCard, deleteCard } = useCards(list.id);
  const { updateList } = useLists(boardId);
  const [showCreateCard, setShowCreateCard] = useState(false);
  
  const { setNodeRef } = useDroppable({
    id: `list-${list.id}`,
  });

  useEffect(() => {
    fetchCards();
  }, [list.id]);

  useEffect(() => {
    if (onCardsLoaded) {
      onCardsLoaded(list.id, list.title, cards);
    }
  }, [cards, list.id, list.title, onCardsLoaded]);

  const handleCreateCard = async (title, description) => {
    try {
      await createCard(title, description);
      setShowCreateCard(false);
    } catch (err) {
      console.error('Failed to create card:', err);
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Delete this card?')) {
      try {
        await deleteCard(cardId);
      } catch (err) {
        console.error('Failed to delete card:', err);
      }
    }
  };

  const handleMoveCard = async (cardId, newListId, newOrder) => {
    try {
      await updateCard(cardId, {
        listId: newListId,
        orderIndex: newOrder,
      });
    } catch (err) {
      console.error('Failed to move card:', err);
    }
  };

  return (
    <div className="list-column">
      <div className="list-header">
        <h3>{list.title}</h3>
        <button
          className="list-delete-btn"
          onClick={onDeleteList}
          title="Delete list"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className={`list-content ${isOver ? 'drag-over' : ''}`} ref={setNodeRef} style={{ minHeight: '300px' }}>
        <SortableContext
          items={cards.map(c => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {loading ? (
            <div className="loading-small">Loading cards...</div>
          ) : cards.length === 0 ? (
            <div className="empty-list">No cards yet</div>
          ) : (
            <div className="cards-container">
              {cards
                .sort((a, b) => a.order_index - b.order_index)
                .map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    listId={list.id}
                    onDelete={() => handleDeleteCard(card.id)}
                    onMove={handleMoveCard}
                    onSelect={onSelectCard}
                    onUpdate={updateCard}
                  />
                ))}
            </div>
          )}
        </SortableContext>
      </div>

      {/* Create Card Form */}
      <div className="list-footer">
        {showCreateCard ? (
          <CreateCardForm
            onSubmit={handleCreateCard}
            onCancel={() => setShowCreateCard(false)}
          />
        ) : (
          <button
            className="btn-add-card"
            onClick={() => setShowCreateCard(true)}
          >
            <Plus size={16} />
            Add Card
          </button>
        )}
      </div>
    </div>
  );
}
