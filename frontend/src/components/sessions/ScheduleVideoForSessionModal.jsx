import React, { useState, useEffect } from 'react';
import { videoSessionAPI } from '../../services/api';
import { X, Video, Calendar, Clock, AlertCircle } from 'lucide-react';

const ScheduleVideoForSessionModal = ({ session, partnerId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: '',
    session_date: '',
    session_time: '',
    duration_minutes: 60,
    password_enabled: true,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session) {
      // Pre-fill form with session data
      const sessionDate = new Date(session.session_date);
      const dateStr = sessionDate.toISOString().split('T')[0];
      const timeStr = sessionDate.toTimeString().slice(0, 5);
      
      setFormData({
        title: session.session_title || '',
        session_date: dateStr,
        session_time: timeStr,
        duration_minutes: session.session_duration || 60,
        password_enabled: true,
        notes: `Video session for: ${session.session_title}`
      });
    }
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Combine date and time
      const sessionDateTime = new Date(`${formData.session_date}T${formData.session_time}`);
      const endDateTime = new Date(sessionDateTime.getTime() + formData.duration_minutes * 60000);

      const videoSessionData = {
        partner_id: partnerId,
        user_id: session.user_id,
        therapy_session_id: session.id, // Link to therapy session
        title: formData.title,
        session_date: sessionDateTime.toISOString(),
        end_date: endDateTime.toISOString(),
        duration_minutes: formData.duration_minutes,
        password_enabled: formData.password_enabled,
        notes: formData.notes
      };

      await videoSessionAPI.create(videoSessionData);
      
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Failed to create video session:', err);
      
      // Handle Google Calendar not connected error
      if (err.response?.data?.error === 'google_calendar_not_connected') {
        setError(
          'Google Calendar connection required. Please connect your Google Calendar in Settings > Calendar Integration to schedule video sessions with Google Meet links.'
        );
      } else if (err.response?.status === 409) {
        setError('Time slot conflicts with existing video session. Please choose a different time.');
      } else {
        setError(err.response?.data?.error || 'Failed to create video session. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
              <Video className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
                Schedule Video Session
              </h2>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                For: {session?.session_title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Session Title *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              placeholder="e.g., Therapy Session with Client"
            />
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                <Calendar className="h-4 w-4 inline mr-1 text-gray-700 dark:text-white" />
                Date *
              </label>
              <input
                type="date"
                name="session_date"
                value={formData.session_date}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                <Clock className="h-4 w-4 inline mr-1 text-gray-700 dark:text-white" />
                Time *
              </label>
              <input
                type="time"
                name="session_time"
                value={formData.session_time}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              />
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Duration (minutes) *
            </label>
            <select
              name="duration_minutes"
              value={formData.duration_minutes}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
            >
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>60 minutes</option>
              <option value={90}>90 minutes</option>
              <option value={120}>120 minutes</option>
            </select>
          </div>

          {/* Password Protection */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="password_enabled"
              name="password_enabled"
              checked={formData.password_enabled}
              onChange={handleChange}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="password_enabled" className="text-sm text-gray-700 dark:text-dark-text-secondary">
              Enable password protection (recommended)
            </label>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              placeholder="Add any additional notes about this video session..."
            />
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Note:</strong> A Google Meet link will be automatically created for this video session. 
              The session will be added to your Google Calendar, and an appointment will be created automatically.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
            >
              <Video className="h-4 w-4" />
              <span>{loading ? 'Creating...' : 'Schedule Video Session'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleVideoForSessionModal;

