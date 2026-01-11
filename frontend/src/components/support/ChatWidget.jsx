import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supportAPI } from '../../services/api';
import SupportChat from './SupportChat';
import { MessageCircle, X, Minimize2 } from 'lucide-react';

const ChatWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadMessageId, setLastReadMessageId] = useState(null);
  const [conversation, setConversation] = useState(null);
  const widgetRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Check if user is eligible for chat widget
  // Users with query_resolver flag (support team members) should not see the widget
  // as they already have the Support tab in their dashboard
  const isEligible = () => {
    if (!user) return false;
    if (user.userType === 'admin') return false;
    // If user is a query resolver (support team member), they should not see the chat widget
    if (user.query_resolver === true) return false;
    if (user.userType === 'partner') return true;
    if (user.userType === 'organization' && !user.theraptrack_controlled) return true;
    return false;
  };

  // Load conversation
  useEffect(() => {
    if (!isEligible()) return;
    
    // Check if token is available before making API calls
    const token = localStorage.getItem('token');
    if (!token) {
      console.warn('No authentication token available, skipping conversation load');
      return;
    }

    const loadConversation = async () => {
      try {
        const response = await supportAPI.getOrCreateConversation();
        setConversation(response.data.conversation);
        // Load initial messages to set last read
        await loadMessagesForUnread(response.data.conversation.id);
      } catch (err) {
        // Only log error if it's not a 401 (unauthorized) - that's expected if token is missing/invalid
        if (err.response?.status !== 401) {
          console.error('Failed to load conversation:', err);
        }
      }
    };

    loadConversation();
  }, [user]);

  // Load messages for unread count tracking
  const loadMessagesForUnread = async (conversationId) => {
    if (!conversationId) return;
    
    // Check if token is available before making API calls
    const token = localStorage.getItem('token');
    if (!token) {
      return; // Silently skip if no token
    }
    
    try {
      const response = await supportAPI.getConversationMessages(conversationId);
      const loadedMessages = response.data.messages || [];
      
      if (loadedMessages.length > 0) {
        const latestMessage = loadedMessages[loadedMessages.length - 1];
        
        if (isOpen) {
          // When widget is open, mark as read
          if (latestMessage.id !== lastReadMessageId) {
            setLastReadMessageId(latestMessage.id);
            setUnreadCount(0);
            try {
              await supportAPI.markMessagesAsRead(conversationId);
            } catch (err) {
              // Only log non-401 errors
              if (err.response?.status !== 401) {
                console.error('Failed to mark messages as read:', err);
              }
            }
          }
        } else {
          // When widget is closed, count unread messages
          const unreadMessages = loadedMessages.filter(
            (msg) => !lastReadMessageId || msg.id > lastReadMessageId
          );
          setUnreadCount(unreadMessages.length);
        }
      }
    } catch (err) {
      // Only log non-401 errors - 401 is expected if user is not authenticated
      if (err.response?.status !== 401) {
        console.error('Failed to load messages:', err);
      }
    }
  };

  // Poll for new messages when widget is minimized
  useEffect(() => {
    if (!conversation || isOpen) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    // Poll every 5 seconds when widget is minimized
    pollIntervalRef.current = setInterval(() => {
      loadMessagesForUnread(conversation.id);
    }, 5000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [conversation, isOpen, lastReadMessageId]);

  // Load messages when widget opens to mark as read
  useEffect(() => {
    if (isOpen && conversation) {
      loadMessagesForUnread(conversation.id);
    }
  }, [isOpen, conversation]);

  // Load persisted state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('chatWidgetOpen');
    if (savedState === 'true') {
      setIsOpen(true);
    }
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('chatWidgetOpen', isOpen.toString());
  }, [isOpen]);

  // Handle click outside to close (mobile only)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (widgetRef.current && !widgetRef.current.contains(event.target) && isOpen) {
        // Only close on mobile
        if (window.innerWidth < 768) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const toggleWidget = () => {
    setIsOpen(!isOpen);
    if (!isOpen && conversation) {
      // Mark messages as read when opening
      loadMessagesForUnread(conversation.id);
    }
  };

  const handleMinimize = () => {
    setIsOpen(false);
  };

  if (!isEligible()) {
    return null;
  }

  return (
    <div ref={widgetRef} className="fixed bottom-4 right-4 z-[1000]">
      {/* Floating Bubble Button */}
      {!isOpen && (
        <button
          onClick={toggleWidget}
          className="relative bg-primary-600 hover:bg-primary-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Open support chat"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden animate-in slide-in-from-bottom-5 duration-300 md:animate-in md:slide-in-from-bottom-0 md:duration-300">
          {/* Mobile: Full screen */}
          <div 
            className="md:hidden fixed inset-0 bg-white dark:bg-dark-bg-secondary z-[1001] flex flex-col"
            style={{
              height: '100vh',
              height: '100dvh', // Dynamic viewport height for mobile
              maxHeight: '100vh',
              maxHeight: '100dvh'
            }}
          >
            {/* Header with minimize button */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-primary-600 dark:bg-dark-primary-900 flex-shrink-0">
              <h3 className="text-lg font-semibold text-white">
                Technical Support
              </h3>
              <button
                onClick={handleMinimize}
                className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded p-1"
                aria-label="Minimize chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {/* Chat content */}
            <div className="flex-1 overflow-hidden min-h-0">
              <SupportChat />
            </div>
          </div>

          {/* Desktop: Floating window */}
          <div className="hidden md:flex flex-col bg-white dark:bg-dark-bg-secondary" style={{ width: '400px', height: '600px', maxHeight: '80vh' }}>
            {/* Header with minimize button */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-border flex items-center justify-between bg-primary-600 dark:bg-dark-primary-900">
              <h3 className="text-lg font-semibold text-white">
                Technical Support
              </h3>
              <button
                onClick={handleMinimize}
                className="text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white rounded p-1"
                aria-label="Minimize chat"
              >
                <Minimize2 className="h-5 w-5" />
              </button>
            </div>
            {/* Chat content */}
            <div className="flex-1 overflow-hidden">
              <SupportChat />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWidget;

