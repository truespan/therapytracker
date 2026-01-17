import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supportAPI } from '../../services/api';
import { MessageCircle, X, Search, Filter, AlertCircle, CheckCircle, Clock, Settings, User, Upload, Save } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

const getImageUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  if (photoUrl.startsWith('/')) {
    return `${SERVER_BASE_URL}${photoUrl}`;
  }
  return `${SERVER_BASE_URL}/${photoUrl}`;
};

const getPriorityBadge = (priority) => {
  if (priority >= 5) {
    return { label: 'High', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' };
  } else if (priority >= 3) {
    return { label: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' };
  } else {
    return { label: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' };
  }
};

const SupportDashboard = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'open', 'closed'
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [supportSettings, setSupportSettings] = useState({
    support_display_name: '',
    support_photo_url: '',
    name: '',
    photo_url: ''
  });
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  useEffect(() => {
    loadConversations();
    loadSupportSettings();
    // Poll for new conversations every 10 seconds
    const interval = setInterval(() => {
      loadConversations();
    }, 10000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => {
        loadMessages();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  useEffect(() => {
    filterConversations();
  }, [conversations, statusFilter, searchQuery]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const params = statusFilter !== 'all' ? statusFilter : undefined;
      const response = await supportAPI.getConversations(params);
      setConversations(response.data.conversations || []);
      setError('');
    } catch (err) {
      console.error('Failed to load conversations:', err);
      setError(err.response?.data?.error || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;
    try {
      const response = await supportAPI.getConversationMessages(selectedConversation.id);
      setMessages(response.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const filterConversations = () => {
    let filtered = conversations;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(conv => {
        const requesterName = conv.requester?.name?.toLowerCase() || '';
        const requesterEmail = conv.requester?.email?.toLowerCase() || '';
        return requesterName.includes(query) || requesterEmail.includes(query);
      });
    }

    setFilteredConversations(filtered);
  };

  const handleSelectConversation = (conv) => {
    setSelectedConversation(conv);
    setNewMessage('');
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !selectedConversation) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      await supportAPI.sendMessage(selectedConversation.id, messageText);
      await loadMessages();
      await loadConversations(); // Refresh to update last_message_at
      setError('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.error || 'Failed to send message');
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation || selectedConversation.status === 'closed') return;

    if (!window.confirm('Are you sure you want to close this conversation?')) {
      return;
    }

    try {
      await supportAPI.closeConversation(selectedConversation.id);
      await loadConversations();
      setSelectedConversation(null);
      setMessages([]);
    } catch (err) {
      console.error('Failed to close conversation:', err);
      setError(err.response?.data?.error || 'Failed to close conversation');
    }
  };

  const formatMessageTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  const formatConversationTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return format(date, 'MMM d');
    } catch {
      return '';
    }
  };

  const isOwnMessage = (message) => {
    if (message.sender_type === 'admin') {
      return message.sender_id === user.id;
    }
    if (message.sender_type === user.userType) {
      return message.sender_id === user.id;
    }
    return false;
  };

  const loadSupportSettings = async () => {
    try {
      setLoadingSettings(true);
      const response = await supportAPI.getSupportSettings();
      setSupportSettings({
        support_display_name: response.data.support_display_name || '',
        support_photo_url: response.data.support_photo_url || '',
        name: response.data.name || '',
        photo_url: response.data.photo_url || ''
      });
      setSettingsError('');
    } catch (err) {
      console.error('Failed to load support settings:', err);
      setSettingsError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setSettingsError('');
      await supportAPI.updateSupportSettings({
        support_display_name: supportSettings.support_display_name || null,
        support_photo_url: supportSettings.support_photo_url || null
      });
      await loadSupportSettings();
      setShowSettings(false);
      // Reload messages to reflect the new display name/photo
      if (selectedConversation) {
        loadMessages();
      }
    } catch (err) {
      console.error('Failed to save support settings:', err);
      setSettingsError(err.response?.data?.error || 'Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="flex h-full bg-white dark:bg-dark-bg-secondary rounded-lg shadow-sm border border-gray-200 dark:border-dark-border">
      {/* Conversations list */}
      <div className="w-1/3 border-r border-gray-200 dark:border-dark-border flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary-600 dark:text-dark-primary-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Support Conversations
              </h2>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-lg transition-colors"
              title="Support Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-bg-tertiary dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-tertiary text-sm"
            />
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 text-xs font-medium rounded ${
                statusFilter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-secondary'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1 ${
                statusFilter === 'open'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-secondary'
              }`}
            >
              <Clock className="h-3 w-3" />
              Open
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-3 py-1 text-xs font-medium rounded flex items-center gap-1 ${
                statusFilter === 'closed'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-secondary hover:bg-gray-200 dark:hover:bg-dark-bg-secondary'
              }`}
            >
              <CheckCircle className="h-3 w-3" />
              Closed
            </button>
          </div>
        </div>

        {/* Conversations list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 dark:text-dark-text-tertiary">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-dark-text-tertiary">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const priorityBadge = getPriorityBadge(conv.priority || 0);
              const requesterPhoto = getImageUrl(conv.requester?.photo_url);
              const isSelected = selectedConversation?.id === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`p-4 border-b border-gray-200 dark:border-dark-border cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary ${
                    isSelected ? 'bg-primary-50 dark:bg-dark-bg-tertiary' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {requesterPhoto ? (
                        <img
                          src={requesterPhoto}
                          alt={conv.requester?.name}
                          className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-dark-bg-tertiary flex-shrink-0 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-dark-text-primary truncate">
                          {conv.requester?.name || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-dark-text-tertiary truncate">
                          {conv.requester?.email || ''}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded flex-shrink-0 ${priorityBadge.color}`}>
                      {priorityBadge.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-dark-text-tertiary">
                    <span className={conv.status === 'open' ? 'text-green-600 dark:text-green-400' : ''}>
                      {conv.status === 'open' ? 'Open' : 'Closed'}
                    </span>
                    <span>{formatConversationTime(conv.last_message_at || conv.created_at)}</span>
                  </div>
                  {conv.unread_count > 0 && (
                    <div className="mt-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-dark-primary-900 dark:text-dark-primary-300">
                        {conv.unread_count} unread
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-gray-200 dark:border-dark-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getImageUrl(selectedConversation.requester?.photo_url) ? (
                  <img
                    src={getImageUrl(selectedConversation.requester?.photo_url)}
                    alt={selectedConversation.requester?.name}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-dark-bg-tertiary flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  </div>
                )}
                <div>
                  <div className="font-medium text-gray-900 dark:text-dark-text-primary">
                    {selectedConversation.requester?.name || 'Unknown'}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                    {selectedConversation.requester?.email || ''}
                  </div>
                </div>
                {selectedConversation.plan_name && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded">
                    {selectedConversation.plan_name}
                  </span>
                )}
              </div>
              {selectedConversation.status === 'open' && (
                <button
                  onClick={handleCloseConversation}
                  className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Close
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const own = isOwnMessage(message);
                const senderPhoto = getImageUrl(message.sender_photo_url);
                const senderName = message.sender_name || 'Support Team';

                return (
                  <div key={message.id} className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0">
                      {senderPhoto ? (
                        <img
                          src={senderPhoto}
                          alt={senderName}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-dark-primary-900 flex items-center justify-center">
                          <MessageCircle className="h-5 w-5 text-primary-600 dark:text-dark-primary-500" />
                        </div>
                      )}
                    </div>
                    <div className={`flex-1 ${own ? 'flex flex-col items-end' : ''}`}>
                      <div
                        className={`inline-block max-w-md px-4 py-2 rounded-lg ${
                          own
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary'
                        }`}
                      >
                        {!own && (
                          <div className="text-xs font-medium mb-1 opacity-75 dark:opacity-90">{senderName}</div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{message.message}</p>
                      </div>
                      <div className={`text-xs text-gray-500 dark:text-dark-text-tertiary mt-1 ${own ? 'text-right' : ''}`}>
                        {formatMessageTime(message.created_at)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message input */}
            {selectedConversation.status === 'open' && (
              <div className="p-4 border-t border-gray-200 dark:border-dark-border">
                {error && (
                  <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                    {error}
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-bg-tertiary dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-tertiary"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sending}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-dark-text-tertiary">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        )}
      </div>

      {/* Support Settings Modal */}
      {showSettings && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowSettings(false)}
        >
          <div 
            className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Support Chat Settings
              </h3>
              <button
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              Set a custom display name and photo that will be shown to users when you reply to support chats.
            </p>

            {settingsError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
                {settingsError}
              </div>
            )}

            <div className="space-y-4">
              {/* Current Display Info */}
              <div className="p-3 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg">
                <div className="text-xs font-medium text-gray-500 dark:text-dark-text-tertiary mb-2">
                  Current Profile (Fallback)
                </div>
                <div className="flex items-center gap-3">
                  {supportSettings.photo_url && getImageUrl(supportSettings.photo_url) ? (
                    <img
                      src={getImageUrl(supportSettings.photo_url)}
                      alt={supportSettings.name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-dark-bg-tertiary flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-gray-900 dark:text-dark-text-primary">
                      {supportSettings.name || 'No name'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                      {supportSettings.photo_url 
                        ? 'Used if support display name/photo not set'
                        : 'No profile photo available'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Support Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Support Display Name
                </label>
                <input
                  type="text"
                  value={supportSettings.support_display_name}
                  onChange={(e) => setSupportSettings({ ...supportSettings, support_display_name: e.target.value })}
                  placeholder={supportSettings.name || 'Enter display name'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-bg-tertiary dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-tertiary"
                  disabled={loadingSettings || savingSettings}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
                  Leave empty to use your regular name
                </p>
              </div>

              {/* Support Photo URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Support Photo URL
                </label>
                <input
                  type="text"
                  value={supportSettings.support_photo_url}
                  onChange={(e) => setSupportSettings({ ...supportSettings, support_photo_url: e.target.value })}
                  placeholder={supportSettings.photo_url || 'Enter photo URL'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-dark-bg-tertiary dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-tertiary"
                  disabled={loadingSettings || savingSettings}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
                  Leave empty to use your regular photo
                </p>
                {supportSettings.support_photo_url && (
                  <div className="mt-2">
                    <img
                      src={getImageUrl(supportSettings.support_photo_url)}
                      alt="Preview"
                      className="h-16 w-16 rounded-full object-cover border-2 border-gray-300 dark:border-dark-border"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-bg-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors"
                disabled={savingSettings}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={loadingSettings || savingSettings}
                className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingSettings ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportDashboard;

