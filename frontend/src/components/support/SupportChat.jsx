import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supportAPI } from '../../services/api';
import { MessageCircle, Send, Loader2, User } from 'lucide-react';
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

const SupportChat = () => {
  const { user } = useAuth();
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [supportTeamMembers, setSupportTeamMembers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadConversation();
    loadSupportTeamMembers();
  }, []);

  useEffect(() => {
    if (conversation) {
      loadMessages();
      // Poll for new messages every 5 seconds
      const interval = setInterval(() => {
        loadMessages();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const response = await supportAPI.getOrCreateConversation();
      setConversation(response.data.conversation);
      setError('');
    } catch (err) {
      console.error('Failed to load conversation:', err);
      setError(err.response?.data?.error || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (preserveOptimistic = false) => {
    if (!conversation) return;
    try {
      const response = await supportAPI.getConversationMessages(conversation.id);
      const loadedMessages = response.data.messages || [];
      if (preserveOptimistic) {
        // Merge with existing messages to preserve any optimistic updates
        setMessages(prev => {
          const messageIds = new Set(loadedMessages.map(m => m.id));
          const optimisticMessages = prev.filter(m => !m.id || !messageIds.has(m.id));
          return [...loadedMessages, ...optimisticMessages].sort((a, b) => {
            if (!a.created_at) return 1;
            if (!b.created_at) return -1;
            return new Date(a.created_at) - new Date(b.created_at);
          });
        });
      } else {
        setMessages(loadedMessages);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const loadSupportTeamMembers = async () => {
    try {
      const response = await supportAPI.getSupportTeamMembers();
      setSupportTeamMembers(response.data.members || []);
    } catch (err) {
      console.error('Failed to load support team members:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending || !conversation) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await supportAPI.sendMessage(conversation.id, messageText);
      // Add the sent message optimistically to the messages array
      if (response.data && response.data.data) {
        const newMessageObj = response.data.data;
        // Ensure the message has the correct structure for isOwnMessage to work
        const optimisticMessage = {
          ...newMessageObj,
          sender_type: user.userType,
          sender_id: user.id,
          sender_name: user.name || newMessageObj.sender_name,
          sender_photo_url: user.photo_url || newMessageObj.sender_photo_url
        };
        setMessages(prev => [...prev, optimisticMessage]);
        // Scroll to bottom to show the new message
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
      // Reload messages after a short delay to get the full message from database
      setTimeout(async () => {
        await loadMessages(true); // Preserve optimistic message if DB hasn't updated yet
      }, 500);
      setError('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.response?.data?.error || 'Failed to send message');
      setNewMessage(messageText); // Restore message on error
    } finally {
      setSending(false);
      messageInputRef.current?.focus();
    }
  };

  const formatMessageTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'MMM d, h:mm a');
    } catch {
      return '';
    }
  };

  const isOwnMessage = (message) => {
    if (!message || !user) return false;
    if (message.sender_type === 'admin') return false;
    // For partners and organizations, check if sender_type and sender_id match
    if (message.sender_type === user.userType) {
      return parseInt(message.sender_id) === parseInt(user.id);
    }
    return false;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (error && !conversation) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-dark-bg-secondary">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-dark-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageCircle className="h-6 w-6 text-primary-600 dark:text-dark-primary-500" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Technical Support
              </h2>
              <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                {conversation?.status === 'open' ? 'Open conversation' : 'Closed conversation'}
              </p>
            </div>
          </div>
          {conversation?.status === 'closed' && (
            <span className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-dark-bg-tertiary text-gray-600 dark:text-dark-text-secondary rounded-full">
              Closed
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-gray-400 dark:text-dark-text-tertiary mb-4" />
            <p className="text-gray-500 dark:text-dark-text-tertiary">
              No messages yet. Start a conversation with our technical support team.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const own = isOwnMessage(message);
            const senderPhoto = getImageUrl(message.sender_photo_url);
            const senderName = message.sender_name || 'Support Team';

            return (
              <div
                key={message.id}
                className={`flex gap-3 ${own ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {senderPhoto ? (
                    <img
                      src={senderPhoto}
                      alt={senderName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-dark-primary-900 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-600 dark:text-dark-primary-500" />
                    </div>
                  )}
                </div>

                {/* Message content */}
                <div className={`flex-1 ${own ? 'flex flex-col items-end' : ''}`}>
                  <div
                    className={`inline-block max-w-md px-4 py-2 rounded-lg ${
                      own
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-dark-bg-tertiary text-gray-900 dark:text-dark-text-primary'
                    }`}
                  >
                    {!own && (
                      <div className={`text-xs font-medium mb-1 opacity-75 dark:opacity-90 ${own ? '' : 'text-gray-700 dark:text-dark-text-secondary'}`}>
                        {senderName}
                      </div>
                    )}
                    <p className={`whitespace-pre-wrap break-words ${own ? 'text-white' : 'text-gray-900 dark:text-dark-text-primary'}`}>{message.message}</p>
                  </div>
                  <div className={`text-xs text-gray-500 dark:text-dark-text-tertiary mt-1 ${own ? 'text-right' : ''}`}>
                    {formatMessageTime(message.created_at)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message input */}
      {conversation?.status === 'open' && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border">
          {error && (
            <div className="mb-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={messageInputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 bg-white dark:bg-dark-bg-tertiary dark:text-dark-text-primary placeholder-gray-400 dark:placeholder-dark-text-tertiary"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Send
            </button>
          </form>
        </div>
      )}

      {conversation?.status === 'closed' && (
        <div className="px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg-tertiary">
          <p className="text-sm text-gray-500 dark:text-dark-text-secondary text-center">
            This conversation is closed. Please start a new conversation if you need further assistance.
          </p>
        </div>
      )}
    </div>
  );
};

export default SupportChat;

