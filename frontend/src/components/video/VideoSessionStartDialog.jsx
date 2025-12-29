import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';

const VideoSessionStartDialog = ({ onConfirm, onCancel, mode = 'manual' }) => {
  // mode can be 'manual' (therapist clicked Complete Session) or 'auto' (auto-completion)
  const isAutoMode = mode === 'auto';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isAutoMode 
                ? 'bg-orange-100 dark:bg-orange-900/30' 
                : 'bg-green-100 dark:bg-green-900/30'
            }`}>
              {isAutoMode ? (
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              {isAutoMode 
                ? 'Therapy Session Auto-Created' 
                : 'Complete Video Session'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              {isAutoMode 
                ? 'A therapy session has been automatically created for this video session since it was not manually completed. You can add notes and update the session details later.'
                : 'A therapy session will be created for this video session. You can add notes and update the session details after creation.'}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex justify-end space-x-3">
          {isAutoMode && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-bg-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors"
            >
              Close
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg transition-colors ${
              isAutoMode
                ? 'bg-primary-600 dark:bg-dark-primary-600 text-white hover:bg-primary-700 dark:hover:bg-dark-primary-700'
                : 'bg-green-600 dark:bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-700'
            }`}
          >
            {isAutoMode ? 'View Session' : 'Create Session'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoSessionStartDialog;

