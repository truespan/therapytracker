import React, { useState } from 'react';
import { therapySessionAPI } from '../../services/api';
import { X, FileText, DollarSign, User, Calendar, Clock } from 'lucide-react';

const StartSessionModal = ({ appointment, partnerId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    session_title: appointment.title || '',
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

    if (!formData.session_title.trim()) {
      setError('Session title is required');
      return;
    }

    setLoading(true);

    try {
      await therapySessionAPI.create({
        appointment_id: appointment.id,
        partner_id: partnerId,
        user_id: appointment.user_id,
        session_title: formData.session_title,
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
              <h2 className="text-2xl font-bold text-gray-900">Start Session</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Appointment Info Display */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-3">Appointment Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-700">
                <User className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium mr-2">Client:</span>
                <span>{appointment.user_name}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium mr-2">Date:</span>
                <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <Clock className="h-4 w-4 mr-2 text-blue-600" />
                <span className="font-medium mr-2">Time:</span>
                <span>{new Date(appointment.appointment_date).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <p className="mt-1 text-xs text-gray-500">
                This field is mandatory and describes the main topic or focus of the session
              </p>
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
                {loading ? 'Creating Session...' : 'Submit Session'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StartSessionModal;
