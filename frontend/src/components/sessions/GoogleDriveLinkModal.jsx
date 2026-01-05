import React, { useState, useEffect } from 'react';
import { therapySessionAPI } from '../../services/api';
import { X, Link2, ExternalLink, Save, Plus, Trash2, Edit } from 'lucide-react';

const GoogleDriveLinkModal = ({ session, onClose, onSuccess }) => {
  // Parse google_drive_link - handle both old format (string) and new format (array)
  const parseLinks = (links) => {
    if (!links) return [];
    if (typeof links === 'string') {
      // Old format: single string, convert to array
      if (links.trim() === '') return [];
      return [{ url: links, label: '' }];
    }
    if (Array.isArray(links)) {
      return links;
    }
    return [];
  };

  const [links, setLinks] = useState(parseLinks(session?.google_drive_link));
  const [editingIndex, setEditingIndex] = useState(null);
  const [newLink, setNewLink] = useState({ url: '', label: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (session?.google_drive_link) {
      setLinks(parseLinks(session.google_drive_link));
    }
  }, [session]);

  const isValidUrl = (string) => {
    if (!string || !string.trim()) return false;
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const handleAddLink = () => {
    setError('');
    
    if (!newLink.url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(newLink.url.trim())) {
      setError('Please enter a valid URL');
      return;
    }

    // Check for duplicate URLs
    if (links.some(link => link.url === newLink.url.trim())) {
      setError('This URL is already added');
      return;
    }

    setLinks([...links, { url: newLink.url.trim(), label: newLink.label.trim() }]);
    setNewLink({ url: '', label: '' });
    setError('');
  };

  const handleEditLink = (index) => {
    setEditingIndex(index);
    setNewLink({ ...links[index] });
  };

  const handleUpdateLink = () => {
    setError('');

    if (!newLink.url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!isValidUrl(newLink.url.trim())) {
      setError('Please enter a valid URL');
      return;
    }

    // Check for duplicate URLs (excluding the one being edited)
    const duplicateIndex = links.findIndex(
      (link, idx) => link.url === newLink.url.trim() && idx !== editingIndex
    );
    if (duplicateIndex !== -1) {
      setError('This URL is already added');
      return;
    }

    const updatedLinks = [...links];
    updatedLinks[editingIndex] = {
      url: newLink.url.trim(),
      label: newLink.label.trim()
    };
    setLinks(updatedLinks);
    setEditingIndex(null);
    setNewLink({ url: '', label: '' });
    setError('');
  };

  const handleRemoveLink = (index) => {
    const updatedLinks = links.filter((_, idx) => idx !== index);
    setLinks(updatedLinks);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setNewLink({ url: '', label: '' });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate all links
    for (const link of links) {
      if (!isValidUrl(link.url)) {
        setError(`Invalid URL: ${link.url}`);
        return;
      }
    }

    setLoading(true);

    try {
      // Send as array format
      await therapySessionAPI.update(session.id, {
        google_drive_link: links.length > 0 ? links : []
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error('Update Google Drive links error:', err);
      setError(err.response?.data?.error || 'Failed to save Google Drive links');
      setLoading(false);
    }
  };

  const handleOpenLink = (url) => {
    if (url && isValidUrl(url)) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Link2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                Google Drive Links
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 dark:text-white hover:text-gray-600 dark:hover:text-gray-300"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Session Info */}
          <div className="mb-4 p-3 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg">
            <p className="text-sm text-gray-700 dark:text-dark-text-secondary">
              <span className="font-semibold">Session:</span> {session?.session_title}
            </p>
            {session?.session_number && (
              <p className="text-sm text-gray-700 dark:text-dark-text-secondary mt-1">
                <span className="font-semibold">Session #:</span> {session.session_number}
              </p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Existing Links List */}
            {links.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Saved Links ({links.length})
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {links.map((link, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border"
                    >
                      {editingIndex === index ? (
                        <div className="space-y-2">
                          <div>
                            <input
                              type="url"
                              value={newLink.url}
                              onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                              placeholder="https://drive.google.com/file/d/..."
                              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary text-sm"
                            />
                          </div>
                          <div>
                            <input
                              type="text"
                              value={newLink.label}
                              onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                              placeholder="Optional label (e.g., Session Notes, Prescription)"
                              className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary text-sm"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={handleUpdateLink}
                              className="px-3 py-1.5 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 text-sm"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-primary text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            {link.label && (
                              <p className="text-sm font-medium text-gray-900 dark:text-dark-text-primary mb-1">
                                {link.label}
                              </p>
                            )}
                            <div className="flex items-center space-x-2">
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-sm break-all"
                              >
                                {link.url}
                              </a>
                              <button
                                type="button"
                                onClick={() => handleOpenLink(link.url)}
                                className="p-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors flex-shrink-0"
                                title="Open in new tab"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            <button
                              type="button"
                              onClick={() => handleEditLink(index)}
                              className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                              title="Edit link"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveLink(index)}
                              className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Remove link"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Add New Link */}
            {editingIndex === null && (
              <div className="border-t dark:border-dark-border pt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  <Link2 className="inline h-4 w-4 mr-1 text-gray-700 dark:text-white" />
                  Add New Link
                </label>
                <div className="space-y-2">
                  <input
                    type="url"
                    value={newLink.url}
                    onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                    disabled={loading}
                  />
                  <input
                    type="text"
                    value={newLink.label}
                    onChange={(e) => setNewLink({ ...newLink, label: e.target.value })}
                    placeholder="Optional label (e.g., Session Notes, Prescription)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-dark-bg-secondary text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-primary transition-colors flex items-center justify-center space-x-2"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Link</span>
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-dark-text-tertiary">
                  You can add multiple Google Drive links. Each link can have an optional label to help identify it.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-dark-border">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-primary transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                disabled={loading || editingIndex !== null}
              >
                <Save className="h-4 w-4" />
                <span>{loading ? 'Saving...' : 'Save Links'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default GoogleDriveLinkModal;
