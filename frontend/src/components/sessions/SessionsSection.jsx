import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { therapySessionAPI } from '../../services/api';
import { ChevronDown, ChevronUp, FileText, Plus } from 'lucide-react';
import SessionCard from './SessionCard';
import CreateSessionModal from './CreateSessionModal';
import EditSessionModal from './EditSessionModal';
import AssignQuestionnaireToSessionModal from './AssignQuestionnaireToSessionModal';

const SessionsSection = forwardRef(({ partnerId, userId, userName, onNavigateToNotes, onGenerateReport }, ref) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (userId && partnerId) {
      loadSessions();
    }
  }, [userId, partnerId]);

  // Expose loadSessions to parent via ref
  useImperativeHandle(ref, () => ({
    loadSessions
  }));

  const loadSessions = async () => {
    try {
      setLoading(true);
      console.log('SessionsSection: Loading sessions for user:', userId, 'partner:', partnerId);
      const response = await therapySessionAPI.getByPartnerAndUser(partnerId, userId);
      console.log('SessionsSection: Sessions loaded:', response.data.sessions);

      // Sort sessions by date (newest first) - session_number is already stored in database
      const sortedSessions = (response.data.sessions || [])
        .sort((a, b) => new Date(b.session_date) - new Date(a.session_date));

      console.log('SessionsSection: Sorted sessions with stored session numbers:', sortedSessions);
      setSessions(sortedSessions);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    setShowCreateModal(true);
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setShowEditModal(true);
  };

  const handleAssignQuestionnaire = (session) => {
    setSelectedSession(session);
    setShowAssignModal(true);
  };

  const handleModalClose = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowAssignModal(false);
    setSelectedSession(null);
  };

  const handleModalSuccess = () => {
    // Reload sessions after any modal action
    loadSessions();
  };

  return (
    <div className="card">
      {/* Header - Always Visible */}
      <div className="p-4">
        {/* Mobile: Top row with title and button */}
        <div className="lg:hidden flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6 text-primary-600" />
            <div className="text-left">
              <h3 className="text-lg font-semibold text-gray-900">
                Therapy Sessions
              </h3>
              <p className="text-sm text-gray-600">
                {sessions.length === 0
                  ? 'No sessions recorded yet'
                  : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded`
                }
              </p>
            </div>
          </div>
          {/* Action Buttons - Mobile (Small) */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleCreateSession}
              className="flex items-center space-x-1 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Create</span>
            </button>
          </div>
        </div>

        {/* Mobile: Show sessions toggle */}
        {sessions.length > 0 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="lg:hidden w-full flex items-center justify-between px-2 py-2 hover:bg-gray-50 transition-colors rounded-lg"
          >
            <span className="text-sm text-gray-500">
              {isExpanded ? 'Hide' : 'Show'} sessions
            </span>
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
        )}

        {/* Desktop: Original layout */}
        <div className="hidden lg:flex items-center justify-between">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 flex items-center justify-between hover:bg-gray-50 transition-colors rounded-lg -m-2 p-2"
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-primary-600" />
              <div className="text-left">
                <h3 className="text-lg font-semibold text-gray-900">
                  Therapy Sessions
                </h3>
                <p className="text-sm text-gray-600">
                  {sessions.length === 0
                    ? 'No sessions recorded yet'
                    : `${sessions.length} session${sessions.length !== 1 ? 's' : ''} recorded`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {sessions.length > 0 && (
                <span className="text-sm text-gray-500 mr-2">
                  {isExpanded ? 'Hide' : 'Show'} sessions
                </span>
              )}
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </button>

          {/* Action Buttons - Desktop */}
          <div className="ml-4 flex items-center space-x-3">
            <button
              onClick={handleCreateSession}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 mt-2">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading sessions...</span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>No therapy sessions have been recorded for {userName} yet.</p>
              <p className="text-sm mt-2">Click "Create Session" to add a new session.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {sessions.map(session => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onEdit={handleEditSession}
                  onAssignQuestionnaire={handleAssignQuestionnaire}
                  onQuestionnaireDeleted={loadSessions}
                  onCreateNote={onNavigateToNotes}
                  onViewNote={onNavigateToNotes}
                  onGenerateReport={() => onGenerateReport(session.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateSessionModal
          partnerId={partnerId}
          selectedUser={{ id: userId, name: userName }}
          clients={[{ id: userId, name: userName, email: '' }]}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {showEditModal && selectedSession && (
        <EditSessionModal
          session={selectedSession}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}

      {showAssignModal && selectedSession && (
        <AssignQuestionnaireToSessionModal
          session={selectedSession}
          partnerId={partnerId}
          userId={userId}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
});

SessionsSection.displayName = 'SessionsSection';

export default SessionsSection;
