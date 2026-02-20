import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../lib/apiClient';
import { Camera, Save, AlertCircle } from 'lucide-react';
import '../styles/Settings.css';

const STATUS_OPTIONS = [
  { value: 'available', label: '🟢 Available' },
  { value: 'focusing', label: '🔴 Focusing' },
  { value: 'relaxing', label: '🟡 Relaxing' },
  { value: 'working', label: '🔵 Working' },
];

export default function SettingsPage() {
  const { user, setUser } = useAuth();
  const [formData, setFormData] = useState({
    username: user?.username || '',
    status: user?.status || 'available',
    bio: user?.bio || '',
    profilePhotoUrl: user?.profile_photo_url || '',
    isDyslexic: user?.is_dyslexic || false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(user?.profile_photo_url || '');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        status: user.status || 'available',
        bio: user.bio || '',
        profilePhotoUrl: user.profile_photo_url || '',
        isDyslexic: user.is_dyslexic || false,
      });
      setPreviewUrl(user.profile_photo_url || '');
    }
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError(null);
    setSuccess(false);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // For now, just use a data URL for the preview
      // In production, you'd upload to a server and get a URL back
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
        setFormData(prev => ({
          ...prev,
          profilePhotoUrl: reader.result
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('Submitting profile update:', formData);
      
      const response = await apiClient.patch('/users/profile', {
        username: formData.username || user?.username,
        status: formData.status || 'available',
        bio: formData.bio || '',
        profilePhotoUrl: formData.profilePhotoUrl || null,
        isDyslexic: formData.isDyslexic,
      });

      console.log('Profile update response:', response);

      if (response.data && response.data.user) {
        setUser(response.data.user);
        // Save updated user to localStorage
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        // Apply or remove dyslexic mode class
        if (response.data.user.is_dyslexic) {
          document.body.classList.add('dyslexic-mode');
        } else {
          document.body.classList.remove('dyslexic-mode');
        }
        
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Unexpected response from server');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h1>Profile Settings</h1>
          <p>Manage your personal information and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="settings-form">
          {/* Profile Photo Section */}
          <div className="settings-section">
            <h2>Profile Photo</h2>
            <div className="photo-upload">
              <div className="photo-preview">
                {previewUrl ? (
                  <img src={previewUrl} alt="Profile" />
                ) : (
                  <div className="photo-placeholder">
                    {user?.username?.substring(0, 2).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <div className="photo-upload-controls">
                <label htmlFor="photo-input" className="btn-upload">
                  <Camera size={18} />
                  Upload Photo
                </label>
                <input
                  id="photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  style={{ display: 'none' }}
                />
                <p className="upload-hint">JPG, PNG or GIF (Max 5MB)</p>
              </div>
            </div>
          </div>

          {/* Username Section */}
          <div className="settings-section">
            <label htmlFor="username" className="form-label">
              Username
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Enter your username"
            />
            <p className="form-hint">Your unique username on the platform</p>
          </div>

          {/* Status Section */}
          <div className="settings-section">
            <label htmlFor="status" className="form-label">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="form-select"
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="form-hint">Let others know what you're up to</p>
          </div>

          {/* Bio Section */}
          <div className="settings-section">
            <label htmlFor="bio" className="form-label">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Write something about yourself... e.g., 'Hi! I'm a developer who loves to code'"
              rows="4"
              maxLength="150"
            />
            <p className="form-hint">
              {formData.bio.length}/150 characters
            </p>
          </div>

          {/* Accessibility Section */}
          <div className="settings-section">
            <h2>Accessibility</h2>
            <div className="checkbox-wrapper">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="isDyslexic"
                  checked={formData.isDyslexic}
                  onChange={handleInputChange}
                  className="form-checkbox"
                />
                <span className="checkbox-text">
                  <strong>Enable dyslexic-friendly font (OpenDyslexic)</strong>
                  <p className="form-hint" style={{ margin: '4px 0 0 0' }}>
                    This will change the font across the entire application to OpenDyslexic, 
                    which is designed to make reading easier for people with dyslexia.
                  </p>
                </span>
              </label>
            </div>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="alert alert-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success">
              <span>✓ Profile updated successfully!</span>
            </div>
          )}

          {/* Submit Button */}
          <div className="settings-actions">
            <button
              type="submit"
              disabled={loading}
              className="btn-save"
            >
              <Save size={18} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
