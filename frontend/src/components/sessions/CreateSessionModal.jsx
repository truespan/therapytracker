import React, { useState } from 'react';
import { therapySessionAPI } from '../../services/api';
import { X, FileText, DollarSign, User, Calendar, Clock } from 'lucide-react';

const CreateSessionModal = ({ partnerId, selectedUser, clients, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    user_id: selectedUser?.id || '',
    session_title: '',
    session_date: '',
    session_time: '',
    session_duration: '',
    session_notes: '',
    payment_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    if (!formData.user_id) {
      setError('Please select a client');
      return;
    }

    if (!formData.session_title.trim()) {
      setError('Session title is required');
      return;
    }

    if (!formData.session_date || !formData.session_time) {
      setError('Session date and time are required');
      return;
    }

    setLoading(true);

    try {
      // Combine date and time into a single timestamp
      const sessionDateTime = `${formData.session_date}T${formData.session_time}:00`;

      await therapySessionAPI.createStandalone({
        partner_id: partnerId,
        user_id: formData.user_id,
        session_title: formData.session_title,
        session_date: sessionDateTime,
        session_duration: formData.session_duration ? parseInt(formData.session_duration) : null,
        session_notes: formData.session_notes || null,
        payment_notes: formData.payment_notes || null
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <FileText className="h-6 w-6 text-primary-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Create New Session</h2>
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
            {/* Client Selection */}
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
                disabled={!!selectedUser}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">-- Select a client --</option>
                {clients && clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Session Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Session Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Session Date *
                </label>
                <input
                  type="date"
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
                  Session Time *
                </label>
                <input
                  type="time"
                  name="session_time"
                  value={formData.session_time}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Session Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Clock className="inline h-4 w-4 mr-1" />
                Duration (minutes) - Optional
              </label>
              <input
                type="number"
                name="session_duration"
                value={formData.session_duration}
                onChange={handleChange}
                min="1"
                placeholder="e.g., 60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Session Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Description / Notes (Optional)
              </label>
              <textarea
                name="session_notes"
                value={formData.session_notes}
                onChange={handleChange}
                rows="4"
                placeholder="Add detailed notes about the session, key discussion points, observations, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Payment Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <DollarSign className="inline h-4 w-4 mr-1" />
                Payment Related Notes (Optional)
              </label>
              <input
                type="text"
                name="payment_notes"
                value={formData.payment_notes}
                onChange={handleChange}
                placeholder="Payment status, amount, method, etc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
    </div>
  );
};

export default CreateSessionModal;
