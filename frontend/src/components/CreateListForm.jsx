import React, { useState } from 'react';
import { X } from 'lucide-react';
import '../styles/components.css';

export default function CreateListForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      await onSubmit(title.trim());
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="create-list-form">
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter list name..."
          autoFocus
          required
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
