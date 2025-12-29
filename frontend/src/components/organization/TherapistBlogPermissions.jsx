import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FileText, Users, ToggleLeft, ToggleRight, Search, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { organizationAPI } from '../../services/api';

const TherapistBlogPermissions = ({ organizationId, organizationName }) => {
  const { user } = useAuth();
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingTherapists, setUpdatingTherapists] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    loadTherapists();
  }, [organizationId]);

  const loadTherapists = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await organizationAPI.getTherapistsBlogPermissions(organizationId);
      setTherapists(response.data.therapists);
    } catch (err) {
      console.error('Failed to load therapists:', err);
      setError(err.response?.data?.error || 'Failed to load therapist blog permissions');
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async (therapistId) => {
    try {
      setUpdatingTherapists(prev => new Set(prev).add(therapistId));
      setError('');
      setSuccessMessage('');

      const response = await organizationAPI.grantBlogPermission(organizationId, therapistId);

      // Update local state
      setTherapists(prev => prev.map(therapist => 
        therapist.id === therapistId 
          ? { ...therapist, can_post_blogs: true }
          : therapist
      ));

      setSuccessMessage(`Blog permission granted to ${response.data.therapist.name}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to grant blog permission:', err);
      setError(err.response?.data?.error || 'Failed to grant blog permission');
    } finally {
      setUpdatingTherapists(prev => {
        const newSet = new Set(prev);
        newSet.delete(therapistId);
        return newSet;
      });
    }
  };

  const handleRevokePermission = async (therapistId) => {
    try {
      setUpdatingTherapists(prev => new Set(prev).add(therapistId));
      setError('');
      setSuccessMessage('');

      const response = await organizationAPI.revokeBlogPermission(organizationId, therapistId);

      // Update local state
      setTherapists(prev => prev.map(therapist => 
        therapist.id === therapistId 
          ? { ...therapist, can_post_blogs: false }
          : therapist
      ));

      setSuccessMessage(`Blog permission revoked from ${response.data.therapist.name}`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Failed to revoke blog permission:', err);
      setError(err.response?.data?.error || 'Failed to revoke blog permission');
    } finally {
      setUpdatingTherapists(prev => {
        const newSet = new Set(prev);
        newSet.delete(therapistId);
        return newSet;
      });
    }
  };

  const filteredTherapists = therapists.filter(therapist => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      therapist.name.toLowerCase().includes(searchLower) ||
      (therapist.email && therapist.email.toLowerCase().includes(searchLower)) ||
      (therapist.partner_id && therapist.partner_id.toLowerCase().includes(searchLower))
    );
  });

  const enabledCount = therapists.filter(t => t.can_post_blogs).length;
  const disabledCount = therapists.length - enabledCount;

  // Collapsible view: show first 10 when collapsed, all when expanded
  const INITIAL_DISPLAY_COUNT = 10;
  const displayTherapists = isExpanded 
    ? filteredTherapists 
    : filteredTherapists.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMoreTherapists = filteredTherapists.length > INITIAL_DISPLAY_COUNT;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
              With Permission: {enabledCount}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
            <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
              Without Permission: {disabledCount}
            </span>
          </div>
        </div>
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
          {displayTherapists.map(therapist => (
            <div
              key={therapist.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="font-medium text-gray-900 dark:text-dark-text-primary">
                    {therapist.name}
                  </h4>
                  {therapist.partner_id && (
                    <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      {therapist.partner_id}
                    </span>
                  )}
                  {therapist.can_post_blogs ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                      Can Post Blogs
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      No Blog Access
                    </span>
                  )}
                </div>
                {therapist.email && (
                  <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                    {therapist.email}
                  </p>
                )}
              </div>
              
              <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                {therapist.can_post_blogs ? (
                  <button
                    onClick={() => handleRevokePermission(therapist.id)}
                    disabled={updatingTherapists.has(therapist.id)}
                    className="px-4 py-2 text-sm bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 rounded-md hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingTherapists.has(therapist.id) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600 dark:border-red-400"></div>
                    ) : (
                      'Revoke'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleGrantPermission(therapist.id)}
                    disabled={updatingTherapists.has(therapist.id)}
                    className="px-4 py-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-md hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatingTherapists.has(therapist.id) ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 dark:border-green-400"></div>
                    ) : (
                      'Grant'
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* Collapsible toggle button */}
          {hasMoreTherapists && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400 hover:bg-primary-50 dark:hover:bg-dark-bg-secondary rounded-lg transition-colors"
              >
                <span>
                  {isExpanded 
                    ? `Show Less (${INITIAL_DISPLAY_COUNT} of ${filteredTherapists.length})` 
                    : `Show All (${filteredTherapists.length - INITIAL_DISPLAY_COUNT} more)`}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TherapistBlogPermissions;


