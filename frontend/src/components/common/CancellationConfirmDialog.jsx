import React from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { formatEndDate } from '../../utils/subscriptionHelper';

const CancellationConfirmDialog = ({ 
  subscriptionEndDate, 
  planName = 'subscription',
  onConfirm, 
  onCancel,
  isProcessing = false
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
              Cancel Subscription
            </h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-secondary rounded-lg transition-colors"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-dark-text-tertiary" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-dark-text-secondary">
              Are you sure you want to cancel your <span className="font-semibold">{planName}</span> subscription?
            </p>

            <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                Important Information:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>Your subscription will remain active until <strong>{formatEndDate(subscriptionEndDate)}</strong></li>
                <li>You will continue to have full access to all features until that date</li>
                <li>No refund will be issued for the remaining period</li>
                <li>After cancellation, you won't be charged again</li>
              </ul>
            </div>

            <p className="text-sm text-gray-600 dark:text-dark-text-tertiary">
              You can always resubscribe later if you change your mind.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-border flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-secondary transition-colors font-medium"
          >
            Keep Subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Cancelling...' : 'Yes, Cancel Subscription'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancellationConfirmDialog;









