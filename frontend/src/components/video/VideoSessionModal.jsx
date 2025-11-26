import React, { useState, useEffect } from 'react';
import { videoSessionAPI } from '../../services/api';
import { X, Calendar, Clock, User, Lock, Unlock, Copy, Check, Video } from 'lucide-react';
import { generateMeetingUrl } from '../../utils/jitsiHelper';

const VideoSessionModal = ({ partnerId, users, selectedSlot, session, onClose, onSave }) => {
  // Helper function to format date for datetime-local input without timezone conversion
  const formatDateTimeLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [formData, setFormData] = useState({
    user_id: '',
    title: '',
    session_date: '',
    end_date: '',
    duration_minutes: 60,
    password_enabled: true,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdSession, setCreatedSession] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (session) {
      // Editing existing session
      const sessionDate = new Date(session.session_date);
      const endDate = new Date(session.end_date);
      
      // Validate dates before formatting
      if (!isNaN(sessionDate.getTime()) && !isNaN(endDate.getTime())) {
        setFormData({
          user_id: session.user_id,
          title: session.title,
          session_date: formatDateTimeLocal(sessionDate),
          end_date: formatDateTimeLocal(endDate),
          duration_minutes: session.duration_minutes,
          password_enabled: session.password_enabled,
          notes: session.notes || ''
        });
      }
    } else if (selectedSlot) {
      // Creating new session from calendar slot
      const start = new Date(selectedSlot.start);
      const end = new Date(selectedSlot.end);
      
      // Validate dates before formatting
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const duration = Math.round((end - start) / (1000 * 60));

        setFormData(prev => ({
          ...prev,
          session_date: formatDateTimeLocal(start),
          end_date: formatDateTimeLocal(end),
          duration_minutes: duration > 0 ? duration : 60
        }));
      }
    }
  }, [session, selectedSlot]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Auto-calculate end_date when session_date or duration changes
    if (name === 'session_date' || name === 'duration_minutes') {
      const startDate = name === 'session_date' ? new Date(value) : new Date(formData.session_date);
      const duration = name === 'duration_minutes' ? parseInt(value) : formData.duration_minutes;
      
      // Check if startDate is valid and duration is a valid number
      if (startDate && !isNaN(startDate.getTime()) && duration && !isNaN(duration)) {
        const endDate = new Date(startDate.getTime() + duration * 60000);
        
        // Check if endDate is valid before formatting
        if (!isNaN(endDate.getTime())) {
          setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
            end_date: formatDateTimeLocal(endDate)
          }));
          return;
        }
      }
    }
    
    // Default update for all other cases
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!formData.user_id) {
        setError('Please select a client');
        setLoading(false);
        return;
      }

      const sessionData = {
        partner_id: partnerId,
        ...formData
      };

      if (session) {
        // Update existing session
        await videoSessionAPI.update(session.id, {
          ...sessionData,
          partner_id: partnerId
        });
        onSave();
      } else {
        // Create new session
        const response = await videoSessionAPI.create(sessionData);
        setCreatedSession(response.data.session);
      }
    } catch (err) {
      console.error('Save video session error:', err);
      setError(err.response?.data?.error || 'Failed to save video session');
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (createdSession) {
      const meetingUrl = generateMeetingUrl(createdSession.meeting_room_id);
      const shareText = `Video Session: ${createdSession.title}\n` +
        `Date: ${new Date(createdSession.session_date).toLocaleString()}\n` +
        `Duration: ${createdSession.duration_minutes} minutes\n` +
        `Meeting Link: ${meetingUrl}` +
        (createdSession.password_enabled ? `\nPassword: ${createdSession.plain_password}` : '');
      
      navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    onSave();
    onClose();
  };

  if (createdSession) {
    const meetingUrl = generateMeetingUrl(createdSession.meeting_room_id);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Video Session Created!</h2>
              </div>
              <button onClick={handleFinish} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Session Details</h3>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Title:</span> {createdSession.title}</p>
                  <p><span className="font-medium">Date:</span> {new Date(createdSession.session_date).toLocaleString()}</p>
                  <p><span className="font-medium">Duration:</span> {createdSession.duration_minutes} minutes</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Meeting Link</h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={meetingUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="btn btn-secondary flex items-center space-x-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {createdSession.password_enabled && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Lock className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-semibold text-gray-900">Session Password</h3>
                  </div>
                  <p className="text-2xl font-mono font-bold text-gray-900 mb-2">
                    {createdSession.plain_password}
                  </p>
                  <p className="text-sm text-gray-600">
                    Share this password with your client. They will need it to join the session.
                  </p>
                </div>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Note:</strong> The session will automatically appear in your calendar. 
                  You can copy the meeting link and password to share with your client.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={handleCopyLink}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <Copy className="h-4 w-4" />
                  <span>Copy All Details</span>
                </button>
                <button onClick={handleFinish} className="btn btn-primary">
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Video className="h-6 w-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                {session ? 'Edit Video Session' : 'Schedule Video Session'}
              </h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <User className="inline h-4 w-4 mr-1" />
                Select Client *
              </label>
              <select
                name="user_id"
                value={formData.user_id}
                onChange={handleChange}
                required
                disabled={!!session}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Choose a client...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email || user.contact})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="e.g., Weekly Therapy Session"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Start Date & Time *
                </label>
                <input
                  type="datetime-local"
                  name="session_date"
                  value={formData.session_date}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Duration (minutes) *
                </label>
                <select
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="90">1.5 hours</option>
                  <option value="120">2 hours</option>
                  <option value="150">2.5 hours</option>
                  <option value="180">3 hours</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="password_enabled"
                  checked={formData.password_enabled}
                  onChange={handleChange}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    {formData.password_enabled ? (
                      <Lock className="h-5 w-5 text-primary-600" />
                    ) : (
                      <Unlock className="h-5 w-5 text-gray-400" />
                    )}
                    <span className="font-medium text-gray-900">Password Protection</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {formData.password_enabled
                      ? 'A password will be generated to secure this session'
                      : 'Anyone with the link can join this session'}
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                placeholder="Add any additional notes about this session..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : session ? 'Update Session' : 'Create Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VideoSessionModal;

