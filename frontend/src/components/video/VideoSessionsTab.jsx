import React, { useState, useEffect } from 'react';
import { videoSessionAPI, therapySessionAPI } from '../../services/api';
import VideoSessionModal from './VideoSessionModal';
import VideoSessionStartDialog from './VideoSessionStartDialog';
import { Video, Calendar, Clock, User, Lock, Unlock, Copy, Check, Edit, Trash2, AlertCircle, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { getMeetLink, formatTimeUntilSession, canJoinSession, generateShareText, openMeetLink } from '../../utils/videoHelper';

const VideoSessionsTab = ({ partnerId, users }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [selectedVideoSessionForStart, setSelectedVideoSessionForStart] = useState(null);
  const [dialogMode, setDialogMode] = useState('manual'); // 'manual' or 'auto'

  useEffect(() => {
    loadSessions();
    checkAutoCompleteSessions();
  }, [partnerId]);

  const checkAutoCompleteSessions = async () => {
    try {
      // Check for sessions that need auto-completion (ended more than 24 hours ago)
      const response = await therapySessionAPI.checkAutoComplete(partnerId);
      const autoCompletedSessions = response.data.autoCompletedSessions || [];
      
      if (autoCompletedSessions.length > 0) {
        // Show dialog for first auto-completed session
        const firstSession = autoCompletedSessions[0];
        setDialogMode('auto');
        setSelectedVideoSessionForStart(firstSession);
        setShowStartDialog(true);
        
        // Reload sessions to update UI
        loadSessions();
      }
    } catch (err) {
      console.error('Failed to check auto-complete sessions:', err);
    }
  };

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await videoSessionAPI.getByPartner(partnerId);
      setSessions(response.data.sessions || []);
      setError('');
    } catch (err) {
      console.error('Failed to load video sessions:', err);

      // Check if feature is disabled
      if (err.response?.data?.featureDisabled) {
        if (err.response.data.reason === 'therapist_disabled') {
          setError('Video sessions are not enabled for your account. Please contact your organization administrator.');
        } else {
          setError(err.response.data.message || 'Video sessions are not available for your organization');
        }
      } else {
        setError('Failed to load video sessions');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    setSelectedSession(null);
    setShowModal(true);
  };

  const handleEditSession = (session) => {
    setSelectedSession(session);
    setShowModal(true);
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this video session?')) {
      return;
    }

    try {
      await videoSessionAPI.delete(sessionId);
      loadSessions();
    } catch (err) {
      console.error('Failed to delete video session:', err);
      const errorMessage = err.response?.data?.error || 'Failed to delete video session';
      alert(errorMessage);
    }
  };

  const handleCopyLink = (session) => {
    const shareText = generateShareText(session);
    
    navigator.clipboard.writeText(shareText);
    setCopied(session.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSession(null);
  };

  const handleSaveSession = () => {
    loadSessions();
    handleCloseModal();
  };

  const handleOpenMeet = async (session) => {
    const meetLink = getMeetLink(session);
    if (!meetLink) {
      alert('No Google Meet link available for this session');
      return;
    }

    // If therapy session already exists, just open Meet
    if (session.has_therapy_session || session.therapy_session_id) {
      openMeetLink(meetLink);
      return;
    }

    // Mark video session as 'in_progress' if not already
    if (session.status !== 'in_progress') {
      try {
        await videoSessionAPI.updateStatus(session.id, 'in_progress');
        // Reload to update UI
        loadSessions();
      } catch (err) {
        console.error('Failed to update session status:', err);
      }
    }

    // Open Google Meet
    openMeetLink(meetLink);
  };

  const handleCompleteSession = async (session) => {
    // Check if session already exists
    if (session.has_therapy_session || session.therapy_session_id) {
      // Just mark video session as completed
      try {
        await videoSessionAPI.updateStatus(session.id, 'completed');
        loadSessions();
      } catch (err) {
        console.error('Failed to update session status:', err);
        alert('Failed to update session status. Please try again.');
      }
      return;
    }

    // Show dialog for manual completion
    setDialogMode('manual');
    setSelectedVideoSessionForStart(session);
    setShowStartDialog(true);
  };

  const handleDialogConfirm = async () => {
    setShowStartDialog(false);
    if (selectedVideoSessionForStart) {
      if (dialogMode === 'auto') {
        // For auto mode, just close - session already created
        setSelectedVideoSessionForStart(null);
        // Reload to show updated status
        loadSessions();
      } else {
        // For manual mode, create the session
        await createTherapySession(selectedVideoSessionForStart);
        setSelectedVideoSessionForStart(null);
      }
    }
  };

  const handleDialogCancel = () => {
    setShowStartDialog(false);
    setSelectedVideoSessionForStart(null);
  };

  const createTherapySession = async (session) => {
    try {
      // Create therapy session from video session
      await therapySessionAPI.createFromVideoSession(session.id);

      // Mark video session as completed
      await videoSessionAPI.updateStatus(session.id, 'completed');

      // Reload sessions to update UI
      loadSessions();
    } catch (err) {
      console.error('Failed to create therapy session:', err);
      
      // Handle case where session already exists
      if (err.response?.status === 409) {
        // Session already exists, just mark as completed
        try {
          await videoSessionAPI.updateStatus(session.id, 'completed');
          loadSessions();
        } catch (updateErr) {
          console.error('Failed to update session status:', updateErr);
        }
      } else {
        const errorMessage = err.response?.data?.error || 'Failed to create session. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const getStatusBadge = (session) => {
    const now = new Date();
    const start = new Date(session.session_date);
    const end = new Date(session.end_date);

    if (session.status === 'cancelled') {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Cancelled</span>;
    }
    if (session.status === 'completed') {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Completed</span>;
    }
    if (now >= start && now <= end) {
      return <span className="px-2 py-1 text-xs font-medium bg-primary-100 text-primary-900 rounded-full">In Progress</span>;
    }
    if (now < start) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Scheduled</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-full">Past</span>;
  };

  const groupSessionsByStatus = () => {
    const now = new Date();
    const upcoming = [];
    const past = [];

    sessions.forEach(session => {
      const start = new Date(session.session_date);
      if (start > now && session.status !== 'cancelled' && session.status !== 'completed') {
        upcoming.push(session);
      } else {
        past.push(session);
      }
    });

    return { upcoming, past };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Video className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading video sessions...</p>
        </div>
      </div>
    );
  }

  const { upcoming, past } = groupSessionsByStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Video Sessions</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Schedule and manage video sessions with your clients</p>
        </div>
        <button
          onClick={handleCreateSession}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Video className="h-5 w-5" />
          <span>Schedule Session</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="card text-center py-12">
          <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No Video Sessions Yet</h3>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
            Schedule your first video session with a client
          </p>
          <button onClick={handleCreateSession} className="btn btn-primary">
            Schedule Video Session
          </button>
        </div>
      ) : (
        <>
          {/* Upcoming Sessions */}
          {upcoming.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Sessions</h3>
              <div className="space-y-4">
                {upcoming.map(session => {
                  const meetLink = getMeetLink(session);
                  const canJoin = canJoinSession(session.session_date);

                  return (
                    <div key={session.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition">
                      {/* Desktop Layout */}
                      <div className="hidden md:flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Video className="h-5 w-5 text-primary-600" />
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100">{session.title}</h4>
                            {getStatusBadge(session)}
                            {session.password_enabled && (
                              <Lock className="h-4 w-4 text-yellow-600" title="Password protected" />
                            )}
                          </div>

                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 ml-8">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>{session.user_name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(session.session_date).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>{session.duration_minutes} minutes</span>
                            </div>
                            {!canJoin && (
                              <div className="text-primary-600 font-medium">
                                Starts in: {formatTimeUntilSession(session.session_date)}
                              </div>
                            )}
                          </div>

                          {session.notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-8 italic">{session.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {meetLink ? (
                            <button
                              onClick={() => handleOpenMeet(session)}
                              className="btn btn-primary text-sm flex items-center space-x-1"
                              title="Open Google Meet"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>Open Meet</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">No Meet link</span>
                          )}
                          {/* Show Complete Session button for in_progress or past sessions without therapy session */}
                          {!session.has_therapy_session && !session.therapy_session_id && 
                           (session.status === 'in_progress' || new Date(session.end_date) < new Date()) && (
                            <button
                              onClick={() => handleCompleteSession(session)}
                              className="btn bg-green-600 hover:bg-green-700 text-white text-sm flex items-center space-x-1"
                              title="Complete session and create therapy session"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Complete Session</span>
                            </button>
                          )}
                          {/* Show warning for past sessions without therapy session */}
                          {!session.has_therapy_session && !session.therapy_session_id && 
                           new Date(session.end_date) < new Date() && 
                           session.status !== 'in_progress' && (
                            <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                              <AlertCircle className="h-4 w-4" />
                              <button
                                onClick={() => handleCompleteSession(session)}
                                className="text-sm font-medium underline"
                              >
                                Complete Required
                              </button>
                            </div>
                          )}
                          {session.has_therapy_session && (
                            <div className="flex items-center space-x-1 text-green-700 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {session.therapy_session_status === 'completed' ? 'Session Completed' : 'Session Created'}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => handleCopyLink(session)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Copy session link"
                          >
                            {copied === session.id ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditSession(session)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Edit session"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Delete session"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-center space-x-2 mb-2">
                          <Video className="h-4 w-4 text-primary-600 flex-shrink-0" />
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{session.title}</h4>
                          {getStatusBadge(session)}
                          {session.password_enabled && (
                            <Lock className="h-3 w-3 text-yellow-600 flex-shrink-0" title="Password protected" />
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 mb-3">
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span>{session.user_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{new Date(session.session_date).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{session.duration_minutes} minutes</span>
                          </div>
                          {!canJoin && (
                            <div className="text-primary-600 font-medium text-xs">
                              Starts in: {formatTimeUntilSession(session.session_date)}
                            </div>
                          )}
                        </div>

                        {/* Mobile Buttons - Vertical Stack with smaller size */}
                        <div className="flex flex-col space-y-2 mb-3">
                          {meetLink ? (
                            <button
                              onClick={() => handleOpenMeet(session)}
                              className="w-full py-1.5 px-3 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 transition text-center flex items-center justify-center space-x-1"
                              title="Open Google Meet"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Open Meet</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 text-center">No Meet link</span>
                          )}
                          {session.has_therapy_session && (
                            <div className="flex items-center justify-center space-x-1 text-green-700 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                {session.therapy_session_status === 'completed' ? 'Session Completed' : 'Session Created'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Mobile Action Icons - Bottom Row */}
                        <div className="flex items-center justify-center space-x-8 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => handleCopyLink(session)}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg flex flex-col items-center"
                            title="Copy session link"
                          >
                            {copied === session.id ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleEditSession(session)}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg flex flex-col items-center"
                            title="Edit session"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg flex flex-col items-center"
                            title="Delete session"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Sessions */}
          {past.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Past Sessions</h3>
              <div className="space-y-4">
                {past.map(session => {
                  const meetLink = getMeetLink(session);

                  return (
                    <div key={session.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700 hover:shadow-md transition">
                      {/* Desktop Layout */}
                      <div className="hidden md:flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Video className="h-5 w-5 text-gray-400 dark:text-gray-400" />
                            <h4 className="font-semibold text-gray-700 dark:text-gray-200">{session.title}</h4>
                            {getStatusBadge(session)}
                            {session.password_enabled && (
                              <Lock className="h-4 w-4 text-yellow-600" title="Password protected" />
                            )}
                          </div>

                          <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300 ml-8">
                            <div className="flex items-center space-x-2">
                              <User className="h-4 w-4" />
                              <span>{session.user_name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(session.session_date).toLocaleString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4" />
                              <span>{session.duration_minutes} minutes</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          {meetLink ? (
                            <button
                              onClick={() => handleOpenMeet(session)}
                              className="btn btn-primary text-sm flex items-center space-x-1"
                              title="Open Google Meet"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>Open Meet</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500">No Meet link</span>
                          )}
                          {/* Show Complete Session button for past sessions without therapy session */}
                          {!session.has_therapy_session && !session.therapy_session_id && (
                            <button
                              onClick={() => handleCompleteSession(session)}
                              className="btn bg-green-600 hover:bg-green-700 text-white text-sm flex items-center space-x-1"
                              title="Complete session and create therapy session"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Complete Session</span>
                            </button>
                          )}
                          {session.has_therapy_session && (
                            <div className="flex items-center space-x-1 text-green-700 dark:text-green-400">
                              <CheckCircle className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {session.therapy_session_status === 'completed' ? 'Session Completed' : 'Session Created'}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => handleCopyLink(session)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Copy session link"
                          >
                            {copied === session.id ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            title="Delete session"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="md:hidden">
                        <div className="flex items-center space-x-2 mb-2">
                          <Video className="h-4 w-4 text-gray-400 dark:text-gray-400 flex-shrink-0" />
                          <h4 className="font-medium text-gray-700 dark:text-gray-200 text-sm">{session.title}</h4>
                          {getStatusBadge(session)}
                          {session.password_enabled && (
                            <Lock className="h-3 w-3 text-yellow-600 flex-shrink-0" title="Password protected" />
                          )}
                        </div>

                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-300 mb-3">
                          <div className="flex items-center space-x-2">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span>{session.user_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-3 w-3 flex-shrink-0" />
                            <span>{new Date(session.session_date).toLocaleString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span>{session.duration_minutes} minutes</span>
                          </div>
                        </div>

                        {/* Mobile Buttons - Vertical Stack with smaller size */}
                        <div className="flex flex-col space-y-2 mb-3">
                          {meetLink ? (
                            <button
                              onClick={() => handleOpenMeet(session)}
                              className="w-full py-1.5 px-3 bg-primary-600 text-white text-xs font-medium rounded-md hover:bg-primary-700 transition text-center flex items-center justify-center space-x-1"
                              title="Open Google Meet"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Open Meet</span>
                            </button>
                          ) : (
                            <span className="text-xs text-gray-500 text-center">No Meet link</span>
                          )}
                          {/* Show Complete Session button for past sessions without therapy session */}
                          {!session.has_therapy_session && !session.therapy_session_id && (
                            <button
                              onClick={() => handleCompleteSession(session)}
                              className="w-full py-1.5 px-3 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 transition text-center flex items-center justify-center space-x-1"
                              title="Complete session and create therapy session"
                            >
                              <CheckCircle className="h-3 w-3" />
                              <span>Complete Session</span>
                            </button>
                          )}
                          {session.has_therapy_session && (
                            <div className="flex items-center justify-center space-x-1 text-green-700 dark:text-green-400">
                              <CheckCircle className="h-3 w-3" />
                              <span className="text-xs font-medium">
                                {session.therapy_session_status === 'completed' ? 'Session Completed' : 'Session Created'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Mobile Action Icons - Bottom Row */}
                        <div className="flex items-center justify-center space-x-8 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => handleCopyLink(session)}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg flex flex-col items-center"
                            title="Copy session link"
                          >
                            {copied === session.id ? (
                              <Check className="h-5 w-5 text-green-600" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg flex flex-col items-center"
                            title="Delete session"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <VideoSessionModal
          partnerId={partnerId}
          users={users}
          session={selectedSession}
          onClose={handleCloseModal}
          onSave={handleSaveSession}
        />
      )}

      {showStartDialog && selectedVideoSessionForStart && (
        <VideoSessionStartDialog
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
          mode={dialogMode}
        />
      )}
    </div>
  );
};

export default VideoSessionsTab;

