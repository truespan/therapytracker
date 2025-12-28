import React from 'react';
import { AlertTriangle, Calendar, X } from 'lucide-react';

const ConflictWarningModal = ({ conflict, onProceed, onCancel }) => {
  if (!conflict || !conflict.conflicts || conflict.conflicts.length === 0) {
    return null;
  }

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-dark-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3" />
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-400">
                Google Calendar Conflict Detected
              </h3>
            </div>
            <button
              onClick={onCancel}
              className="text-red-600 hover:text-red-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-700 mb-3">
              This availability slot conflicts with {conflict.conflicts.length} existing
              {conflict.conflicts.length === 1 ? ' event' : ' events'} in your Google Calendar:
            </p>

            {/* List of conflicts */}
            <div className="space-y-3">
              {conflict.conflicts.map((item, index) => (
                <div key={index} className="bg-white rounded-md p-3 border border-yellow-300">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-medium text-gray-900">{item.title || 'Untitled Event'}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      item.type === 'video_session'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {item.type === 'video_session' ? 'Video Session' : 'Appointment'}
                    </span>
                  </div>

                  <div className="flex items-center text-sm text-gray-600 mb-1">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>
                      {formatDateTime(item.start)} - {formatDateTime(item.end)}
                    </span>
                  </div>

                  {item.user_name && (
                    <p className="text-sm text-gray-600">
                      With: <span className="font-medium">{item.user_name}</span>
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> You can still create this availability slot despite the conflict.
              However, be aware that you may have scheduling issues.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onProceed}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
            >
              Create Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConflictWarningModal;
