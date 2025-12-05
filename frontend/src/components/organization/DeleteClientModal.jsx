import React, { useState } from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';

const DeleteClientModal = ({ isOpen, onClose, onConfirm, client, isLoading }) => {
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen || !client) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (confirmText === 'DELETE') {
      onConfirm(client.id);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-red-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-red-900">
              Delete Client
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 sm:p-6 space-y-4">
            {/* Warning Message */}
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-800 mb-1">
                    Warning: This action cannot be reversed
                  </h3>
                  <p className="text-sm text-red-700">
                    Deleting this client will permanently remove all associated data including:
                  </p>
                </div>
              </div>
            </div>

            {/* Client Info */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">Client Details</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium text-gray-700">Name:</span> {client.name}</p>
                <p><span className="font-medium text-gray-700">Age:</span> {client.age} years</p>
                <p><span className="font-medium text-gray-700">Sex:</span> {client.sex}</p>
                {client.email && (
                  <p className="truncate"><span className="font-medium text-gray-700">Email:</span> {client.email}</p>
                )}
                {client.contact && (
                  <p><span className="font-medium text-gray-700">Contact:</span> {client.contact}</p>
                )}
              </div>
            </div>

            {/* Data to be deleted list */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 text-sm">The following data will be permanently deleted:</h4>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>Client profile and personal information</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>All therapy session records</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>All appointments (scheduled and completed)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>All questionnaire responses</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>Login credentials and authentication data</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-600 font-bold">•</span>
                  <span>Client-partner assignment records</span>
                </li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">
                To confirm deletion, type <span className="font-bold text-red-600">DELETE</span> below:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
                placeholder="Type DELETE to confirm"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={confirmText !== 'DELETE' || isLoading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Client Permanently</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeleteClientModal;
