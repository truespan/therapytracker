import React, { useState, useEffect } from 'react';
import { questionnaireAPI, partnerAPI } from '../../services/api';

const AssignQuestionnaireModal = ({ questionnaire, partnerId, onClose, onSuccess }) => {
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, [partnerId]);

  const loadUsers = async () => {
    try {
      const response = await partnerAPI.getUsers(partnerId);
      // Handle both response.data.users and response.data formats
      const usersList = response.data.users || response.data || [];
      setUsers(Array.isArray(usersList) ? usersList : []);
    } catch (err) {
      setError('Failed to load users');
      console.error(err);
    }
  };

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleSelectAll = () => {
    const filteredUserIds = filteredUsers.map(u => u.id);
    if (selectedUsers.length === filteredUserIds.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUserIds);
    }
  };

  const handleAssign = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one user');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await questionnaireAPI.assign({
        questionnaire_id: questionnaire.id,
        user_ids: selectedUsers
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign questionnaire');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = Array.isArray(users) ? users.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Assign Questionnaire</h2>
              <p className="text-gray-600 mt-1">{questionnaire.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Search Bar */}
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Select All */}
          <div className="mb-4 flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 text-primary-700 rounded focus:ring-2 focus:ring-primary-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">
                Select All ({filteredUsers.length} users)
              </span>
            </label>
            <span className="text-sm text-gray-600">
              {selectedUsers.length} selected
            </span>
          </div>

          {/* User List */}
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No users found matching your search' : 'No users available'}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center p-3 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleUserToggle(user.id)}
                    className="w-4 h-4 text-primary-700 rounded focus:ring-2 focus:ring-primary-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-800">{user.name}</div>
                    <div className="text-sm text-gray-600">{user.email}</div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedUsers.length > 0 && (
                <span>
                  Assigning to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading || selectedUsers.length === 0}
              >
                {loading ? 'Assigning...' : 'Assign Questionnaire'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignQuestionnaireModal;

