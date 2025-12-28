import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, UserX, Users, ArrowRight } from 'lucide-react';

const DeactivatePartnerModal = ({
  isOpen,
  onClose,
  onSubmit,
  partner,
  clients,
  activePartners,
  isLoading
}) => {
  const [deactivationType, setDeactivationType] = useState('simple');
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setDeactivationType('simple');
      setSelectedPartnerId('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (deactivationType === 'reassign') {
      if (!selectedPartnerId) {
        setError('Please select a therapist to reassign clients to');
        return;
      }

      if (clients && clients.length > 0) {
        onSubmit({
          reassignToPartnerId: parseInt(selectedPartnerId),
          clientIds: clients.map(c => c.id)
        });
      } else {
        // No clients to reassign, just deactivate
        onSubmit({});
      }
    } else {
      // Simple deactivation
      onSubmit({});
    }
  };

  const handleClose = () => {
    setDeactivationType('simple');
    setSelectedPartnerId('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  // Filter out the current partner from available partners
  const availablePartners = activePartners?.filter(p => p.id !== partner?.id) || [];
  const hasClients = clients && clients.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-red-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-red-900 dark:text-red-400 flex items-center">
            <UserX className="h-6 w-6 mr-2 text-red-600" />
            Deactivate Therapist
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Are you sure you want to deactivate this therapist?
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {partner?.name} will no longer be able to log in or access the system.
              </p>
            </div>
          </div>

          {/* Partner Details */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Therapist Details</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Name:</span> {partner?.name}</p>
              <p><span className="font-medium">Email:</span> {partner?.email}</p>
              <p><span className="font-medium">Partner ID:</span> {partner?.partner_id}</p>
              {hasClients && (
                <p className="text-primary-600 font-medium mt-2">
                  <Users className="h-4 w-4 inline mr-1" />
                  {clients.length} client{clients.length !== 1 ? 's' : ''} currently assigned
                </p>
              )}
            </div>
          </div>

          {/* Deactivation Options */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Deactivation Options
            </label>

            {/* Option 1: Simple Deactivation */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                deactivationType === 'simple'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onClick={() => !isLoading && setDeactivationType('simple')}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="deactivationType"
                  value="simple"
                  checked={deactivationType === 'simple'}
                  onChange={(e) => setDeactivationType(e.target.value)}
                  className="mt-1"
                  disabled={isLoading}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Simple Deactivation</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Deactivate the therapist's account only. Client assignments will remain unchanged.
                  </p>
                  {hasClients && deactivationType === 'simple' && (
                    <p className="text-sm text-amber-600 mt-2">
                      Note: {clients.length} client{clients.length !== 1 ? 's' : ''} will still be assigned to this therapist.
                      They won't be able to receive services until reassigned.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Option 2: Deactivation with Reassignment */}
            <div
              className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                deactivationType === 'reassign'
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-300 hover:border-gray-400'
              } ${!hasClients || availablePartners.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isLoading && hasClients && availablePartners.length > 0) {
                  setDeactivationType('reassign');
                }
              }}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  name="deactivationType"
                  value="reassign"
                  checked={deactivationType === 'reassign'}
                  onChange={(e) => setDeactivationType(e.target.value)}
                  className="mt-1"
                  disabled={isLoading || !hasClients || availablePartners.length === 0}
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Deactivate with Client Reassignment</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Reassign all clients to another active therapist before deactivation.
                  </p>
                  {!hasClients && (
                    <p className="text-sm text-gray-500 mt-2">
                      No clients to reassign.
                    </p>
                  )}
                  {hasClients && availablePartners.length === 0 && (
                    <p className="text-sm text-red-600 mt-2">
                      No other active therapists available for reassignment.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Reassignment Partner Selection */}
          {deactivationType === 'reassign' && hasClients && availablePartners.length > 0 && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Select Therapist for Reassignment <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPartnerId}
                onChange={(e) => {
                  setSelectedPartnerId(e.target.value);
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
              {selectedPartnerId && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-primary-300">
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="font-medium text-gray-700">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-primary-600">
                      {availablePartners.find(p => p.id === parseInt(selectedPartnerId))?.name}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center space-x-2 text-red-700">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
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
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Deactivating...' : 'Deactivate Therapist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DeactivatePartnerModal;
