import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Trash2, GripVertical, MessageCircle, Edit2, X, Check } from 'lucide-react';
import '../styles/components.css';

export default function CardItem({ card, listId, onDelete, onMove, onSelect, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      alert('Title cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await onUpdate(card.id, {
        title: editTitle,
        description: editDescription,
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update card:', err);
      alert('Failed to update card');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(card.title);
    setEditDescription(card.description || '');
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="card-item editing"
      >
        <div className="card-edit-form">
          <input
            type="text"
            className="card-edit-title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Card title"
            autoFocus
          />
          <textarea
            className="card-edit-description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Card description"
            rows="3"
          />
          <div className="card-edit-actions">
            <button
              className="card-edit-save"
              onClick={handleSaveEdit}
              disabled={isSaving}
            >
              <Check size={16} />
              Save
            </button>
            <button
              className="card-edit-cancel"
              onClick={handleCancelEdit}
              disabled={isSaving}
            >
              <X size={16} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-item ${isDragging ? 'dragging' : ''}`}
    >
      <div className="card-drag-handle" {...attributes} {...listeners}>
        <GripVertical size={16} />
      </div>
      <div className="card-content">
        <h4>{card.title}</h4>
        {card.description && <p>{card.description}</p>}
      </div>
      <div className="card-actions">
        <button
          className="card-edit-btn"
          onClick={() => setIsEditing(true)}
          title="Edit card"
        >
          <Edit2 size={16} />
        </button>
        <button
          className="card-chat-btn"
          onClick={() => onSelect(card)}
          title="Chat about this card"
        >
          <MessageCircle size={16} />
        </button>
        <button
          className="card-delete-btn"
          onClick={onDelete}
          title="Delete card"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
