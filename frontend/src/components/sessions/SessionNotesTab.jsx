import React, { useState, useEffect, useRef } from 'react';
import { therapySessionAPI } from '../../services/api';
import { StickyNote, RefreshCw } from 'lucide-react';
import SessionNoteCard from './SessionNoteCard';

const SessionNotesTab = ({
  partnerId,
  userId,
  userName,
  initialEditSessionId = null,
  onNoteChanged
}) => {
  // State
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(initialEditSessionId);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [newNoteSessionId, setNewNoteSessionId] = useState(null); // Track if we're creating a new note

  // Refs
  const noteRefs = useRef({});
  const hasProcessedInitialEdit = useRef(false);

  // Load sessions on mount
  useEffect(() => {
    loadSessionsWithNotes();
  }, [partnerId, userId]);

  // Handle initial edit session
  useEffect(() => {
    if (initialEditSessionId && !loading && !hasProcessedInitialEdit.current) {
      const session = sessions.find(s => s.id === initialEditSessionId);

      if (session) {
        // Session with note exists - edit it
        setEditingSessionId(initialEditSessionId);
        setEditContent(session.session_notes || '');
        hasProcessedInitialEdit.current = true;

        setTimeout(() => {
          scrollToNote(initialEditSessionId);
        }, 100);
      } else {
        // Session doesn't have a note yet - we need to fetch it to create a note
        fetchSessionForNewNote(initialEditSessionId);
        hasProcessedInitialEdit.current = true;
      }
    }
  }, [initialEditSessionId, sessions, loading]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && editingSessionId) {
        e.preventDefault();
        handleSaveNote(editingSessionId, editContent);
      }

      // Escape to cancel
      if (e.key === 'Escape' && editingSessionId) {
        handleCancelEdit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSessionId, editContent]);

  const loadSessionsWithNotes = async () => {
    try {
      setLoading(true);
      const response = await therapySessionAPI.getByPartnerAndUser(partnerId, userId);

      // Get all sessions to calculate correct session numbers
      const allSessions = (response.data.sessions || [])
        .sort((a, b) => new Date(a.session_date) - new Date(b.session_date)); // Sort chronologically

      // Assign session numbers based on chronological order
      const sessionsWithNumbers = allSessions.map((session, index) => ({
        ...session,
        session_number: index + 1
      }));

      // Filter to only sessions that have notes
      const sessionsWithNotes = sessionsWithNumbers.filter(
        session => session.session_notes && session.session_notes.trim().length > 0
      );

      // Sort back to newest first for display
      sessionsWithNotes.sort((a, b) => new Date(b.session_date) - new Date(a.session_date));

      setSessions(sessionsWithNotes);
    } catch (err) {
      console.error('Failed to load session notes:', err);
      alert('Failed to load session notes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionForNewNote = async (sessionId) => {
    try {
      // Check if already in sessions list to avoid duplicates
      const existingSession = sessions.find(s => s.id === sessionId);
      if (existingSession) {
        // Already in list, just enter edit mode
        setEditingSessionId(sessionId);
        setEditContent('');
        setNewNoteSessionId(sessionId);
        return;
      }

      // Fetch all sessions to calculate correct session number
      const response = await therapySessionAPI.getByPartnerAndUser(partnerId, userId);
      const allSessions = (response.data.sessions || [])
        .sort((a, b) => new Date(a.session_date) - new Date(b.session_date)); // Sort chronologically

      // Assign session numbers
      const sessionsWithNumbers = allSessions.map((session, index) => ({
        ...session,
        session_number: index + 1
      }));

      const targetSession = sessionsWithNumbers.find(s => s.id === sessionId);

      if (targetSession) {
        // Add this session temporarily to the list for editing (at the beginning since display is newest first)
        setSessions(prev => [targetSession, ...prev]);

        // Enter edit mode for creating a new note
        setEditingSessionId(sessionId);
        setEditContent('');
        setNewNoteSessionId(sessionId);

        // Scroll to the new note after it's rendered
        setTimeout(() => {
          scrollToNote(sessionId);
        }, 100);
      }
    } catch (err) {
      console.error('Failed to fetch session for new note:', err);
      alert('Failed to open session for note creation. Please try again.');
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadSessionsWithNotes();
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveNote = async (sessionId, content) => {
    const trimmedContent = content.trim();

    if (trimmedContent.length === 0) {
      const confirmed = window.confirm(
        'The note is empty. Do you want to delete this note?'
      );

      if (!confirmed) {
        return;
      }

      await handleDeleteNote(sessionId);
      return;
    }

    if (trimmedContent.length > 10000) {
      alert('Session note cannot exceed 10,000 characters');
      return;
    }

    const previousSessions = [...sessions];

    try {
      setSaving(true);

      // Optimistic update
      setSessions(prev => prev.map(s =>
        s.id === sessionId
          ? { ...s, session_notes: trimmedContent, updated_at: new Date().toISOString() }
          : s
      ));

      const response = await therapySessionAPI.update(sessionId, {
        session_notes: trimmedContent
      });

      // Update with server response
      setSessions(prev => prev.map(s =>
        s.id === sessionId ? response.data.session : s
      ));

      setEditingSessionId(null);
      setEditContent('');
      setNewNoteSessionId(null); // Clear new note flag after saving

      // Notify parent that note has changed
      if (onNoteChanged) {
        onNoteChanged();
      }
    } catch (err) {
      // Rollback on failure
      setSessions(previousSessions);
      console.error('Failed to save note:', err);
      alert('Failed to save note: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (sessionId) => {
    try {
      setSaving(true);
      console.log('Deleting note for session:', sessionId);

      const response = await therapySessionAPI.update(sessionId, {
        session_notes: null
      });
      console.log('Delete response:', response.data);

      // Remove from list
      setSessions(prev => prev.filter(s => s.id !== sessionId));

      // Clear edit state if was editing deleted session
      if (editingSessionId === sessionId) {
        setEditingSessionId(null);
        setEditContent('');
      }

      // Notify parent that note has changed
      console.log('Calling onNoteChanged callback');
      if (onNoteChanged) {
        onNoteChanged();
      } else {
        console.warn('onNoteChanged callback not provided');
      }
    } catch (err) {
      console.error('Failed to delete note:', err);
      alert('Failed to delete note: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleStartEdit = (sessionId, currentContent) => {
    setEditingSessionId(sessionId);
    setEditContent(currentContent || '');
  };

  const handleCancelEdit = () => {
    // If we're canceling a new note, remove it from the list
    if (newNoteSessionId === editingSessionId) {
      setSessions(prev => prev.filter(s => s.id !== editingSessionId));
      setNewNoteSessionId(null);
    }

    setEditingSessionId(null);
    setEditContent('');
  };

  const scrollToNote = (sessionId) => {
    const element = noteRefs.current[sessionId];
    if (element) {
      // Highlight animation
      element.classList.add('ring-2', 'ring-primary-400', 'ring-offset-2');

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });

      // Remove highlight after animation
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-primary-400', 'ring-offset-2');
      }, 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary flex items-center space-x-2">
            <StickyNote className="h-5 w-5 text-primary-600" />
            <span>Session Notes for {userName}</span>
          </h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} with notes
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 text-gray-600 dark:text-dark-text-tertiary hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          title="Refresh notes"
        >
          <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="card text-center py-16">
          <StickyNote className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
            No Session Notes Yet
          </h3>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
            Session notes will appear here once you add them to your sessions.
          </p>
          <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">
            Go to Session Details tab and click "Take Notes" on any session to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionNoteCard
              key={session.id}
              session={session}
              sessionNumber={session.session_number}
              isEditing={editingSessionId === session.id}
              editContent={editContent}
              onEditContentChange={setEditContent}
              onStartEdit={handleStartEdit}
              onSave={handleSaveNote}
              onCancel={handleCancelEdit}
              onDelete={handleDeleteNote}
              saving={saving}
              ref={(el) => noteRefs.current[session.id] = el}
            />
          ))}
        </div>
      )}

      {/* Screen reader announcement for state changes */}
      <div role="status" aria-live="polite" className="sr-only">
        {saving && 'Saving note...'}
        {!saving && editingSessionId && 'Note saved successfully'}
      </div>
    </div>
  );
};

export default SessionNotesTab;
