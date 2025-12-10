import React, { useState, useEffect } from 'react';
import { backgroundAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';

const PartnerReportsTab = () => {
  const { user } = useAuth();
  const [backgrounds, setBackgrounds] = useState([]);
  const [backgroundImages, setBackgroundImages] = useState({}); // Store blob URLs
  const [selectedBackground, setSelectedBackground] = useState(null);
  const [defaultBackground, setDefaultBackground] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    loadBackgrounds();
    loadDefaultBackground();
  }, []);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(backgroundImages).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
    };
  }, [backgroundImages]);

  const loadBackgrounds = async () => {
    try {
      setLoading(true);
      const response = await backgroundAPI.getAvailable();
      const backgroundList = response.data.backgrounds || [];
      setBackgrounds(backgroundList);

      // Fetch actual images with authentication and create blob URLs
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const imagePromises = backgroundList.map(async (bg) => {
        try {
          const token = localStorage.getItem('token');
          // Remove '/api' from bg.path since API_BASE_URL already includes it
          const imagePath = bg.path.replace('/api', '');
          const imageResponse = await axios.get(`${API_BASE_URL}${imagePath}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            responseType: 'blob'
          });
          const blobUrl = URL.createObjectURL(imageResponse.data);
          return { filename: bg.filename, url: blobUrl };
        } catch (err) {
          console.error(`Failed to load image ${bg.filename}:`, err);
          return { filename: bg.filename, url: null };
        }
      });

      const imageResults = await Promise.all(imagePromises);
      const imageMap = {};
      imageResults.forEach(({ filename, url }) => {
        imageMap[filename] = url;
      });
      setBackgroundImages(imageMap);

      // Auto-select first background if none selected
      if (backgroundList.length > 0 && !selectedBackground) {
        setSelectedBackground(backgroundList[0].filename);
      }
    } catch (err) {
      console.error('Failed to load backgrounds:', err);
      setError('Failed to load background images. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultBackground = async () => {
    try {
      const response = await backgroundAPI.getDefault(user.id);
      const defaultBg = response.data.default_background;
      setDefaultBackground(defaultBg);
      setSelectedBackground(defaultBg);
    } catch (err) {
      console.error('Failed to load default background:', err);
    }
  };

  const handleSaveBackground = async () => {
    if (!selectedBackground) {
      setError('Please select a background image');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await backgroundAPI.setDefault(user.id, selectedBackground);

      setDefaultBackground(selectedBackground);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      console.error('Failed to save background:', err);
      setError(err.response?.data?.error || 'Failed to save background selection. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="ml-4 text-gray-600">Loading background images...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Report Background Selection
        </h3>
        <p className="text-gray-600 text-sm">
          Choose a background image for your client reports. Click on an image to select it.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
          <p className="text-green-800 text-sm font-medium">
            Background image saved successfully!
          </p>
        </div>
      )}

      {/* Current Default Display */}
      {defaultBackground && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <p className="text-primary-900 text-sm">
            <span className="font-medium">Current default: </span>
            {defaultBackground}
          </p>
        </div>
      )}

      {/* Image Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {backgrounds.map((bg) => (
          <div
            key={bg.filename}
            className={`relative border-2 rounded-lg overflow-hidden cursor-pointer transition-all ${
              selectedBackground === bg.filename
                ? 'border-primary-600 shadow-lg ring-2 ring-primary-200'
                : 'border-gray-300 hover:border-primary-400'
            }`}
            onClick={() => setSelectedBackground(bg.filename)}
          >
            {/* Radio Button Overlay */}
            <div className="absolute top-2 right-2 z-10">
              <input
                type="radio"
                name="background"
                checked={selectedBackground === bg.filename}
                onChange={() => setSelectedBackground(bg.filename)}
                className="h-5 w-5 text-primary-600 focus:ring-primary-500"
              />
            </div>

            {/* Image Preview */}
            <div className="aspect-[210/297] bg-gray-100 flex items-center justify-center">
              {backgroundImages[bg.filename] ? (
                <img
                  src={backgroundImages[bg.filename]}
                  alt={bg.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center text-gray-400">
                  <FileText className="h-12 w-12" />
                </div>
              )}
            </div>

            {/* Filename Label */}
            <div className={`p-2 text-center text-xs font-medium ${
              selectedBackground === bg.filename
                ? 'bg-primary-50 text-primary-900'
                : 'bg-gray-50 text-gray-700'
            }`}>
              {bg.filename}
            </div>

            {/* Selected Indicator */}
            {selectedBackground === bg.filename && (
              <div className="absolute inset-0 bg-primary-600 bg-opacity-10 pointer-events-none flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-primary-600" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* No Backgrounds Available */}
      {backgrounds.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">No background images available</p>
          <p className="text-gray-500 text-sm mt-2">
            Contact your administrator to add background images
          </p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <button
          onClick={handleSaveBackground}
          disabled={saving || !selectedBackground}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
        >
          {saving ? 'Saving...' : 'Save Background Selection'}
        </button>
      </div>
    </div>
  );
};

export default PartnerReportsTab;
