import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

const VideoSessionStartDialog = ({ onConfirm, onCancel }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleConfirm = () => {
    if (dontShowAgain) {
      localStorage.setItem('videoSessionAutoCreateWarningDismissed', 'true');
    }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              Session Will Be Created Automatically
            </h3>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              A corresponding Session will get created automatically when you open the Google Meet link.
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-dark-border dark:bg-dark-bg-primary"
            />
            <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
              Don't show this next time
            </span>
          </label>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-bg-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoSessionStartDialog;

