import React, { useState, useRef } from 'react';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// For production: https://therapy-tracker-api.onrender.com/api -> https://therapy-tracker-api.onrender.com
// For localhost: http://localhost:5000/api -> http://localhost:5000
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

// Helper function to construct image URL
const getImageUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;

  // If photoUrl starts with /, it's a relative path
  if (photoUrl.startsWith('/')) {
    return `${SERVER_BASE_URL}${photoUrl}`;
  }

  // Otherwise, prepend the base URL
  return `${SERVER_BASE_URL}/${photoUrl}`;
};

const ImageUpload = ({
  currentImageUrl,
  onUpload,
  onDelete,
  label = "Profile Picture",
  userType,
  userId,
  disabled = false
}) => {
  const [preview, setPreview] = useState(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append('profilePicture', file);
      formData.append('userType', userType);
      formData.append('userId', userId);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/upload/profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();

      if (onUpload) {
        onUpload(data.photo_url);
      }

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
      setPreview(currentImageUrl); // Revert preview on error
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this profile picture?')) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/upload/profile-picture`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userType,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      setPreview(null);

      if (onDelete) {
        onDelete();
      }

    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete image');
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>

      <div className="flex items-center space-x-4">
        {/* Image Preview */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300 flex items-center justify-center">
            {preview ? (
              <img
                src={getImageUrl(preview)}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Image load error:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <svg
                className="w-12 h-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            )}
          </div>

          {/* Loading Overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled || uploading}
          />

          <button
            type="button"
            onClick={handleButtonClick}
            disabled={disabled || uploading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
          >
            {uploading ? 'Uploading...' : preview ? 'Change Picture' : 'Upload Picture'}
          </button>

          {preview && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={disabled || uploading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm transition-colors"
            >
              Delete Picture
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 mt-2">
          {error}
        </p>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
        Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
      </p>
    </div>
  );
};

export default ImageUpload;
