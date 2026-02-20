import React, { useState } from 'react';
import { X } from 'lucide-react';
import '../styles/components.css';

export default function CreateCardForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      onSubmit(title.trim(), description.trim());
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="create-card-form">
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title..."
          autoFocus
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Card description (optional)"
          rows="2"
        />
        <div className="form-actions">
          <button type="submit" className="btn-primary btn-sm">
            Create
          </button>
          <button type="button" className="btn-secondary btn-sm" onClick={onCancel}>
            <X size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
