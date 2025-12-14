import React from 'react';
import { X, AlertTriangle, Clock, User, Calendar } from 'lucide-react';
import moment from 'moment-timezone';

const ConflictConfirmationModal = ({
  isOpen,
  conflicts,
  proposedTime,
  proposedEndTime,
  onCreateAppointment,
  onSkipAppointment,
  onCancel,
  loading = false
}) => {
  if (!isOpen) return null;

  const formatTime = (dateTime) => {
    return moment(dateTime).format('MMM D, YYYY h:mm A');
  };

  const formatTimeRange = (start, end) => {
    const startMoment = moment(start);
    const endMoment = moment(end);
    if (startMoment.isSame(endMoment, 'day')) {
      return `${startMoment.format('h:mm A')} - ${endMoment.format('h:mm A')}`;
    }
    return `${startMoment.format('MMM D, h:mm A')} - ${endMoment.format('MMM D, h:mm A')}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Scheduling Conflict Detected
            </h3>
            <p className="text-sm text-gray-600">
              The proposed session time conflicts with existing appointment{conflicts.length > 1 ? 's' : ''}.
              Would you like to create an appointment for this session anyway?
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Proposed Time */}
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Proposed Session Time:</span>
          </div>
          <div className="ml-6 text-sm text-blue-800">
            {formatTimeRange(proposedTime, proposedEndTime)}
          </div>
        </div>

        {/* Conflicts List */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Conflicting Appointment{conflicts.length > 1 ? 's' : ''} ({conflicts.length}):
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                className="p-3 bg-red-50 border border-red-200 rounded-lg"
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-3.5 w-3.5 text-red-600 flex-shrink-0" />
                      <span className="font-medium text-red-900">{conflict.user_name}</span>
                      {conflict.conflict_type === 'video_session' && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          Video Session
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-red-700">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{formatTimeRange(conflict.appointment_date, conflict.end_date)}</span>
                    </div>
                    {conflict.title && (
                      <div className="text-xs text-red-600 ml-5">
                        {conflict.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Information Note */}
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-xs text-gray-700">
            <strong>Note:</strong> The therapy session will be created regardless of your choice.
            This only determines whether a calendar appointment is also created.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSkipAppointment}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Skip Appointment Creation
          </button>
          <button
            onClick={onCreateAppointment}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Creating...' : 'Create Appointment Anyway'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictConfirmationModal;
