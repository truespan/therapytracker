import React from 'react';
import { X, Clock, AlertCircle } from 'lucide-react';
import { formatTimeDifference, formatDateTime } from '../../utils/sessionTimeValidation';

const TimeConfirmationModal = ({
  isOpen,
  scheduledTime,
  minutesDifference,
  onConfirm,
  onDecline,
  onCancel,
  loading = false
}) => {
  if (!isOpen) return null;

  const currentTime = new Date();
  const timeDiffText = formatTimeDifference(minutesDifference);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-1">
              Session Time Confirmation
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              You are starting this session {timeDiffText}. Would you like to update the session time to the current time?
            </p>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Time Details */}
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Scheduled Time:</span>
            <span className="text-gray-900 dark:text-dark-text-primary">{formatDateTime(scheduledTime)}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium text-gray-700 dark:text-dark-text-secondary">Current Time:</span>
            <span className="text-gray-900 dark:text-dark-text-primary">{formatDateTime(currentTime)}</span>
          </div>
          <div className="pt-2 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm font-medium">
                You are {timeDiffText}
              </span>
            </div>
          </div>
        </div>

        {/* Information Note */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-xs text-blue-800 dark:text-blue-400">
            <strong>Note:</strong> If you choose to update, the session will be recorded with the current time instead of the scheduled time.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-bg-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onDecline}
            disabled={loading}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-white dark:bg-dark-bg-secondary border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            No, Keep Original Time
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
          >
            {loading ? 'Processing...' : 'Yes, Update to Current Time'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeConfirmationModal;
