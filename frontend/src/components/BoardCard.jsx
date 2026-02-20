import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import '../styles/components.css';

// Random gradient backgrounds for GitLab boards
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

export default function BoardCard({ board, onDelete }) {
  const navigate = useNavigate();

  // Check if this is a GitLab board by checking workspace name
  const isGitLabBoard = board.workspace_name === 'GitLab';

  const getBackgroundStyle = () => {
    if (board.image_thumb_url) {
      return {
        backgroundImage: `url(${board.image_thumb_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }

    if (isGitLabBoard) {
      // Generate a consistent background for this board based on its ID
      const backgroundIndex = board.id % gitlabBackgrounds.length;
      return {
        background: gitlabBackgrounds[backgroundIndex],
      };
    }

    return {};
  };

  const handleClick = (e) => {
    if (e.target.closest('.board-delete-btn')) return;
    navigate(`/board/${board.id}`);
  };

  return (
    <div
      className="board-card"
      onClick={handleClick}
      style={getBackgroundStyle()}
    >
      <div className="board-card-overlay">
        <h3>{board.title}</h3>
        <button
          className="board-delete-btn"
          onClick={onDelete}
          title="Delete board"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
}
