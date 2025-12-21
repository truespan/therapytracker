import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Video, Users, ToggleLeft, ToggleRight, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { organizationAPI } from '../../services/api';

const TherapistVideoSettings = ({ organizationId, organizationName }) => {
  const { user } = useAuth();
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingTherapists, setUpdatingTherapists] = useState(new Set());
  const [orgVideoSessionsEnabled, setOrgVideoSessionsEnabled] = useState(true);

  useEffect(() => {
    loadTherapists();
  }, [organizationId]);

  const loadTherapists = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await organizationAPI.getTherapistsVideoSettings(organizationId);
      setTherapists(response.data.therapists);
      setOrgVideoSessionsEnabled(response.data.organization_video_sessions_enabled);
    } catch (err) {
      console.error('Failed to load therapists:', err);
      setError(err.response?.data?.error || 'Failed to load therapist video settings');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVideoSessions = async (therapistId, currentStatus) => {
    try {
      setUpdatingTherapists(prev => new Set(prev).add(therapistId));
      setError('');
      setSuccessMessage('');

      const newStatus = !currentStatus;
      const response = await organizationAPI.updateTherapistVideoSettings(
        organizationId,
        therapistId,
        newStatus
      );

      // Update local state
      setTherapists(prev => prev.map(therapist => 
        therapist.id === therapistId 
          ? { ...therapist, video_sessions_enabled: newStatus }
          : therapist
      ));

      setSuccessMessage(`Video sessions ${newStatus ? 'enabled' : 'disabled'} for ${response.data.therapist.name}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to update therapist video settings:', err);
      setError(err.response?.data?.error || 'Failed to update therapist video settings');
    } finally {
      setUpdatingTherapists(prev => {
        const newSet = new Set(prev);
        newSet.delete(therapistId);
        return newSet;
      });
    }
  };

  const handleBulkUpdate = async (enabled) => {
    try {
      setLoading(true);
      setError('');
      setSuccessMessage('');

      const therapistIds = therapists.map(t => t.id);
      const response = await organizationAPI.bulkUpdateTherapistVideoSettings(
        organizationId,
        therapistIds,
        enabled
      );

      // Update local state
      setTherapists(prev => prev.map(therapist => ({
        ...therapist,
        video_sessions_enabled: enabled
      })));

      setSuccessMessage(`Video sessions ${enabled ? 'enabled' : 'disabled'} for all therapists`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to bulk update therapist video settings:', err);
      setError(err.response?.data?.error || 'Failed to bulk update therapist video settings');
    } finally {
      setLoading(false);
    }
  };

  const filteredTherapists = therapists.filter(therapist => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      therapist.name.toLowerCase().includes(searchLower) ||
      therapist.email.toLowerCase().includes(searchLower) ||
      therapist.partner_id.toLowerCase().includes(searchLower)
    );
  });

  const enabledCount = therapists.filter(t => t.video_sessions_enabled).length;
  const disabledCount = therapists.length - enabledCount;

  if (!orgVideoSessionsEnabled) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Organization Video Sessions Disabled
            </h3>
            <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
              Video sessions are currently disabled at the organization level. 
              Individual therapist settings will only take effect when organization video sessions are enabled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
              Enabled: {enabledCount}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Video className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
              Disabled: {disabledCount}
            </span>
          </div>
        </div>
        
        {/* Bulk actions */}
        {therapists.length > 0 && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleBulkUpdate(true)}
              disabled={loading}
              className="px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50"
            >
              Enable All
            </button>
            <button
              onClick={() => handleBulkUpdate(false)}
              disabled={loading}
              className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-400 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Disable All
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-text-tertiary" />
        <input
          type="text"
          placeholder="Search therapists by name, email, or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2 text-red-700 dark:text-red-400 text-sm">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Therapists list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-dark-primary-500"></div>
        </div>
      ) : filteredTherapists.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
          {searchTerm ? 'No therapists match your search' : 'No therapists found'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTherapists.map(therapist => (
            <div
              key={therapist.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900 dark:text-dark-text-primary">
                    {therapist.name}
                  </h4>
                  <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {therapist.partner_id}
                  </span>
                  {therapist.video_sessions_enabled ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                      Video Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      Video Disabled
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                  {therapist.email}
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-dark-text-tertiary">
                  <span>{therapist.total_clients || 0} clients</span>
                  <span>{therapist.total_sessions || 0} sessions</span>
                  <span>{therapist.completed_sessions || 0} completed</span>
                </div>
              </div>
              
              <button
                onClick={() => handleToggleVideoSessions(therapist.id, therapist.video_sessions_enabled)}
                disabled={updatingTherapists.has(therapist.id)}
                className="ml-4 flex-shrink-0"
              >
                {updatingTherapists.has(therapist.id) ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 dark:border-dark-primary-500"></div>
                ) : therapist.video_sessions_enabled ? (
                  <ToggleRight className="h-6 w-6 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300" />
                ) : (
                  <ToggleLeft className="h-6 w-6 text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-400" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TherapistVideoSettings;