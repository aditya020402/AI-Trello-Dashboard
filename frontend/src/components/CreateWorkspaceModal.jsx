import React, { useState } from 'react';
import { X } from 'lucide-react';

const ICON_COLORS = [
  '#0ea5e9', // sky blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#6366f1', // indigo
  '#14b8a6', // teal 
];

export default function CreateWorkspaceModal({ onClose, onCreateWorkspace }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(ICON_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      alert('Please enter a workspace name');
      return;
    }

    setIsSubmitting(true); try {
      await onCreateWorkspace({
        name: name.trim(),
        description: description.trim(),
        iconColor: selectedColor
      });
      setName('');
      setDescription('');
      setSelectedColor(ICON_COLORS[0]);
    } catch (error) {
      console.error('Error creating workspace:', error);
      alert('Failed to create workspace');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-workspace-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Workspace</h2>
          <button className="btn-close" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="workspace-name">Workspace Name *</label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Workspace"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="workspace-description">Description (Optional)</label>
            <textarea
              id="workspace-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this workspace about?"
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label>Workspace Color</label>
            <div className="color-picker">
              {ICON_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-option ${selectedColor === color ? 'selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setSelectedColor(color)}
                  title={color}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-create-workspace" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
