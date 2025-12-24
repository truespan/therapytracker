import React, { useState } from 'react';
import { therapySessionAPI } from '../../services/api';
import { X, FileText, DollarSign, User, Calendar, Clock, Video } from 'lucide-react';

const StartSessionFromVideoModal = ({ videoSession, partnerId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    session_title: videoSession.title || '',
    session_notes: '',
    payment_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.session_title.trim()) {
      setError('Session title is required');
      return;
    }

    // Show confirmation dialog first
    setShowConfirmDialog(true);
  };

  const handleConfirmCreate = async () => {
    setShowConfirmDialog(false);
    setLoading(true);

    try {
      // Use override time if provided, otherwise use scheduled time
      const sessionDate = videoSession.overrideSessionTime
        ? videoSession.overrideSessionTime
        : videoSession.session_date;

      await therapySessionAPI.createStandalone({
        partner_id: partnerId,
        user_id: videoSession.user_id,
        session_title: formData.session_title,
        session_date: sessionDate,
        session_duration: videoSession.duration_minutes,
        session_notes: formData.session_notes || null,
        payment_notes: formData.payment_notes || null,
        video_session_id: videoSession.id
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Create session error:', err);
      setError(err.response?.data?.error || 'Failed to create session');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Video className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Start Session from Video</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Video Session Info Display */}
          <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900 border border-purple-200 dark:border-purple-700 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Video Session Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <User className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                <span className="font-medium mr-2">Client:</span>
                <span>{videoSession.user_name}</span>
              </div>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <Calendar className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                <span className="font-medium mr-2">Date:</span>
                <span>{new Date(videoSession.session_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-gray-700 dark:text-gray-300">
                <Clock className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                <span className="font-medium mr-2">Time:</span>
                <span>{new Date(videoSession.session_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Session Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FileText className="inline h-4 w-4 mr-1" />
                Session Title *
              </label>
              <input
                type="text"
                name="session_title"
                value={formData.session_title}
                onChange={handleChange}
                required
                placeholder="Enter session title..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                This field is mandatory and describes the main topic or focus of the session
              </p>
            </div>

            {/* Session Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Session Description / Notes (Optional)
              </label>
              <textarea
                name="session_notes"
                value={formData.session_notes}
                onChange={handleChange}
                rows="4"
                placeholder="Add detailed notes about the session, key discussion points, observations, etc..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Payment Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Payment Related Notes (Optional)
              </label>
              <input
                type="text"
                name="payment_notes"
                value={formData.payment_notes}
                onChange={handleChange}
                placeholder="₹5000 paid..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-600">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'Creating Session...' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-yellow-100 dark:bg-yellow-900">
                  <FileText className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Confirm Session Creation
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Once a session is created, it <strong>cannot be deleted</strong>. The session will be permanently recorded in the client's session history.
                </p>
              </div>
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={loading}
                className="text-gray-400 dark:text-gray-300 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-xs text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> You can edit session notes later.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={loading}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Yes, Create Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StartSessionFromVideoModal;
