import React, { useState } from 'react';
import { X, Loader } from 'lucide-react';
import '../styles/components.css';

const DEFAULT_IMAGES = [
  {
    id: 'img-1',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-2',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1500964757637-c85e8a162699?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-3',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1475776408506-9a5371e7a068?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1475776408506-9a5371e7a068?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-4',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-5',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1511884642898-4c92249e20b6?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-6',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-7',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-8',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
  {
    id: 'img-9',
    urls: { 
      thumb: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop', 
      full: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&h=800&fit=crop' 
    },
    user: { name: 'Unsplash' },
    links: { html: 'https://unsplash.com' }
  },
];

export default function CreateBoardModal({ onClose, onCreateBoard }) {
  const [title, setTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState(DEFAULT_IMAGES[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Board title is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await onCreateBoard({
        title: title.trim(),
        imageId: selectedImage.id,
        imageThumbUrl: selectedImage.urls.thumb,
        imageFullUrl: selectedImage.urls.full,
        imageUserName: selectedImage.user.name,
        imageLinkHTML: selectedImage.links.html,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="create-board-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-board-header">
          <h2>Create board</h2>
          <button className="modal-close-btn-red" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-board-form">
          {error && <div className="error-message">{error}</div>}
          
          {/* Image Grid */}
          <div className="background-image-grid">
            {DEFAULT_IMAGES.map((image) => (
              <div
                key={image.id}
                className={`background-image-option ${selectedImage.id === image.id ? 'selected' : ''}`}
                onClick={() => setSelectedImage(image)}
              >
                <img src={image.urls.thumb} alt="Background option" loading="lazy" />
                {selectedImage.id === image.id && (
                  <div className="selected-overlay">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Board Title Input */}
          <div className="board-title-section">
            <label htmlFor="board-title">Board title</label>
            <input
              id="board-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder=""
              disabled={loading}
              required
              className="board-title-input"
            />
          </div>

          {/* Create Button */}
          <button
            type="submit"
            className="btn-create-board"
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <>
                <Loader size={18} className="spinner" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
