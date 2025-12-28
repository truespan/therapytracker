import React, { useState, useEffect } from 'react';
import { X, Users, ArrowRight, User, CheckCircle } from 'lucide-react';

const ReassignClientsModal = ({
  isOpen,
  onClose,
  onSubmit,
  sourcePartner,
  clients,
  activePartners,
  isLoading
}) => {
  const [selectedClientIds, setSelectedClientIds] = useState([]);
  const [targetPartnerId, setTargetPartnerId] = useState('');
  const [error, setError] = useState('');
  const [selectAll, setSelectAll] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedClientIds([]);
      setTargetPartnerId('');
      setError('');
      setSelectAll(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectAll && clients) {
      setSelectedClientIds(clients.map(c => c.id));
    } else if (!selectAll) {
      setSelectedClientIds([]);
    }
  }, [selectAll, clients]);

  const handleClientToggle = (clientId) => {
    setSelectedClientIds(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
    setError('');
  };

  const handleSelectAll = () => {
    setSelectAll(!selectAll);
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (selectedClientIds.length === 0) {
      setError('Please select at least one client to reassign');
      return;
    }

    if (!targetPartnerId) {
      setError('Please select a therapist to reassign clients to');
      return;
    }

    if (parseInt(targetPartnerId) === sourcePartner?.id) {
      setError('Cannot reassign clients to the same therapist');
      return;
    }

    onSubmit({
      fromPartnerId: sourcePartner.id,
      toPartnerId: parseInt(targetPartnerId),
      clientIds: selectedClientIds
    });
  };

  const handleClose = () => {
    setSelectedClientIds([]);
    setTargetPartnerId('');
    setError('');
    setSelectAll(false);
    onClose();
  };

  if (!isOpen) return null;

  const availablePartners = activePartners?.filter(p => p.id !== sourcePartner?.id) || [];
  const hasClients = clients && clients.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600" />
            Reassign Clients
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Source Partner Info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">From Therapist</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {sourcePartner?.name}</p>
              <p><span className="font-medium">Partner ID:</span> {sourcePartner?.partner_id}</p>
              <p className="text-primary-600 font-medium">
                {clients?.length || 0} client{clients?.length !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>

          {/* Target Partner Selection */}
          {availablePartners.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                To Therapist <span className="text-red-500">*</span>
              </label>
              <select
                value={targetPartnerId}
                onChange={(e) => {
                  setTargetPartnerId(e.target.value);
                  setError('');
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="">-- Select a therapist --</option>
                {availablePartners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.partner_id}) - {p.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              No other active therapists available for reassignment.
            </div>
          )}

          {/* Client Selection */}
          {hasClients ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-900">
                  Select Clients to Reassign <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  disabled={isLoading}
                >
                  {selectAll ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {clients.map((client) => (
                    <label
                      key={client.id}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition ${
                        selectedClientIds.includes(client.id)
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClientIds.includes(client.id)}
                        onChange={() => handleClientToggle(client.id)}
                        className="h-4 w-4 text-primary-600 rounded focus:ring-primary-500"
                        disabled={isLoading}
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{client.name}</span>
                        </div>
                        {client.email && (
                          <p className="text-sm text-gray-600 ml-6">{client.email}</p>
                        )}
                        {client.assigned_at && (
                          <p className="text-xs text-gray-500 ml-6">
                            Assigned: {new Date(client.assigned_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {selectedClientIds.includes(client.id) && (
                        <CheckCircle className="h-5 w-5 text-primary-600" />
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {selectedClientIds.length > 0 && (
                <div className="mt-3 text-sm text-gray-600">
                  <span className="font-medium">{selectedClientIds.length}</span> client
                  {selectedClientIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-600">
              No clients assigned to this therapist
            </div>
          )}

          {/* Reassignment Preview */}
          {selectedClientIds.length > 0 && targetPartnerId && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Reassignment Summary</h4>
              <div className="flex items-center space-x-3 text-sm">
                <div className="flex-1">
                  <p className="font-medium text-gray-700">{sourcePartner?.name}</p>
                  <p className="text-gray-600">{selectedClientIds.length} client{selectedClientIds.length !== 1 ? 's' : ''}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-primary-700">
                    {availablePartners.find(p => p.id === parseInt(targetPartnerId))?.name}
                  </p>
                  <p className="text-gray-600">
                    {availablePartners.find(p => p.id === parseInt(targetPartnerId))?.partner_id}
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !hasClients || availablePartners.length === 0}
            >
              {isLoading ? 'Reassigning...' : `Reassign ${selectedClientIds.length} Client${selectedClientIds.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReassignClientsModal;
