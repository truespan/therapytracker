import React, { useState, useEffect } from 'react';
import { X, Check, Search } from 'lucide-react';
import { questionnaireAPI, adminAPI, organizationAPI } from '../../services/api';

const ShareQuestionnaireModal = ({ isOpen, onClose, questionnaire, ownerType, ownerId }) => {
  const [recipients, setRecipients] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [alreadySharedIds, setAlreadySharedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && questionnaire) {
      loadRecipients();
      loadAlreadyShared();
    }
  }, [isOpen, questionnaire, ownerType, ownerId]);

  const loadRecipients = async () => {
    try {
      setLoading(true);
      let response;
      
      if (ownerType === 'admin') {
        // Load organizations for admin
        response = await adminAPI.getAllOrganizations();
        setRecipients(response.data.organizations || []);
      } else if (ownerType === 'organization') {
        // Load partners for organization
        response = await organizationAPI.getPartners(ownerId);
        setRecipients(response.data.partners || []);
      }
    } catch (err) {
      console.error('Failed to load recipients:', err);
      setError('Failed to load recipients');
    } finally {
      setLoading(false);
    }
  };

  const loadAlreadyShared = async () => {
    try {
      if (ownerType === 'admin') {
        const response = await questionnaireAPI.getSharedOrganizations(questionnaire.id);
        const sharedIds = (response.data || []).map(org => org.organization_id);
        setAlreadySharedIds(sharedIds);
        setSelectedIds(sharedIds); // Pre-select already shared ones
      } else if (ownerType === 'organization') {
        const response = await questionnaireAPI.getSharedPartners(questionnaire.id);
        const sharedIds = (response.data || []).map(partner => partner.partner_id);
        setAlreadySharedIds(sharedIds);
        setSelectedIds(sharedIds); // Pre-select already shared ones
      }
    } catch (err) {
      console.error('Failed to load already shared recipients:', err);
    }
  };

  const handleToggleSelection = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(selectedId => selectedId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      // Determine which IDs to share and which to unshare
      const toShare = selectedIds.filter(id => !alreadySharedIds.includes(id));
      const toUnshare = alreadySharedIds.filter(id => !selectedIds.includes(id));

      // Share new recipients
      if (toShare.length > 0) {
        if (ownerType === 'admin') {
          await questionnaireAPI.shareWithOrganizations(questionnaire.id, toShare);
        } else if (ownerType === 'organization') {
          await questionnaireAPI.shareWithPartners(questionnaire.id, toShare);
        }
      }

      // Unshare removed recipients
      if (toUnshare.length > 0) {
        if (ownerType === 'admin') {
          await questionnaireAPI.unshareFromOrganizations(questionnaire.id, toUnshare);
        } else if (ownerType === 'organization') {
          await questionnaireAPI.unshareFromPartners(questionnaire.id, toUnshare);
        }
      }

      onClose(true); // Pass true to indicate success
    } catch (err) {
      console.error('Failed to save sharing:', err);
      setError(err.response?.data?.error || 'Failed to save sharing');
    } finally {
      setSaving(false);
    }
  };

  const filteredRecipients = recipients.filter(recipient => {
    const name = recipient.name || '';
    const email = recipient.email || '';
    const searchLower = searchTerm.toLowerCase();
    return name.toLowerCase().includes(searchLower) || email.toLowerCase().includes(searchLower);
  });

  if (!isOpen) return null;

  const recipientType = ownerType === 'admin' ? 'Organizations' : 'Partners';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-dark-border">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">
            Share Questionnaire: {questionnaire?.name}
          </h2>
          <button
            onClick={() => onClose(false)}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <p className="text-sm text-gray-600 mb-4">
            Select {recipientType.toLowerCase()} to share this questionnaire with. They will see it in their "Preset Questionnaires" section.
          </p>

          {/* Search */}
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${recipientType.toLowerCase()}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Recipients List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredRecipients.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchTerm ? 'No recipients found matching your search' : `No ${recipientType.toLowerCase()} available`}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredRecipients.map((recipient) => {
                const isSelected = selectedIds.includes(recipient.id);
                const isAlreadyShared = alreadySharedIds.includes(recipient.id);
                const id = ownerType === 'admin' ? recipient.id : recipient.id;

                return (
                  <div
                    key={id}
                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary-50 border-primary-300'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleToggleSelection(id)}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mr-3 ${
                      isSelected
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800">{recipient.name}</div>
                      {recipient.email && (
                        <div className="text-sm text-gray-500 truncate">{recipient.email}</div>
                      )}
                      {isAlreadyShared && (
                        <div className="text-xs text-blue-600 mt-1">Already shared</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareQuestionnaireModal;

