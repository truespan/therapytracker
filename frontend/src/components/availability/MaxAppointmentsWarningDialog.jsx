import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const MaxAppointmentsWarningDialog = ({
  isOpen,
  onClose,
  maxAppointments,
  dontShowAgain = false,
  onToggleDontShowAgain
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Appointment Limit Warning
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <p className="text-gray-700 dark:text-dark-text-secondary">
            Max allowed appointments only <strong>#{maxAppointments}</strong>.
          </p>
          <p className="text-sm text-gray-600 dark:text-dark-text-tertiary">
            You can create as many availability slots as you need, but only up to this limit can be booked as
            appointments in the current month.
          </p>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-dark-text-secondary select-none">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => onToggleDontShowAgain && onToggleDontShowAgain(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
            />
            Don't show again
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={onClose}
            className="px-4 py-2 text-white rounded-md transition-colors bg-orange-600 hover:bg-orange-700"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaxAppointmentsWarningDialog;


