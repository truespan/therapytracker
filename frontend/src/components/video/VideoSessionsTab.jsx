import React, { useState, useEffect } from 'react';
import { videoSessionAPI } from '../../services/api';
import VideoSessionModal from './VideoSessionModal';
import StartSessionFromVideoModal from './StartSessionFromVideoModal';
import { Video, Calendar, Clock, User, Lock, Unlock, Copy, Check, Edit, Trash2, AlertCircle, FileText, CheckCircle } from 'lucide-react';
import { generateMeetingUrl, formatTimeUntilSession, canJoinSession } from '../../utils/jitsiHelper';

const VideoSessionsTab = ({ partnerId, users }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [copied, setCopied] = useState(null);
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [selectedVideoSession, setSelectedVideoSession] = useState(null);

  useEffect(() => {
    loadSessions();
  }, [partnerId]);

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
        setError(err.response.data.message || 'Video sessions are not available for your organization');
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
      alert('Failed to delete video session');
    }
  };

  const handleCopyLink = (session) => {
    const meetingUrl = generateMeetingUrl(session.meeting_room_id);
    const shareText = `Video Session: ${session.title}\n` +
      `Date: ${new Date(session.session_date).toLocaleString()}\n` +
      `Duration: ${session.duration_minutes} minutes\n` +
      `Meeting Link: ${meetingUrl}` +
      (session.password_enabled ? `\nPassword Required: Yes (contact therapist for password)` : '');
    
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

  const handleStartSession = (videoSession) => {
    setSelectedVideoSession(videoSession);
    setShowStartSessionModal(true);
  };

  const handleCloseStartSessionModal = () => {
    setShowStartSessionModal(false);
    setSelectedVideoSession(null);
  };

  const handleSessionCreated = () => {
    loadSessions();
    handleCloseStartSessionModal();
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
      return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">In Progress</span>;
    }
    if (now < start) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Scheduled</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Past</span>;
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
          <h2 className="text-2xl font-bold text-gray-900">Video Sessions</h2>
          <p className="text-gray-600 mt-1">Schedule and manage video sessions with your clients</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Video Sessions Yet</h3>
          <p className="text-gray-600 mb-4">
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
                  const meetingUrl = generateMeetingUrl(session.meeting_room_id);
                  const canJoin = canJoinSession(session.session_date);
                  
                  return (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                      {/* Desktop Layout */}
                      <div className="hidden lg:flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Video className="h-5 w-5 text-primary-600" />
                            <h4 className="font-semibold text-gray-900">{session.title}</h4>
                            {getStatusBadge(session)}
                            {session.password_enabled && (
                              <Lock className="h-4 w-4 text-yellow-600" title="Password protected" />
                            )}
                          </div>

                          <div className="space-y-1 text-sm text-gray-600 ml-8">
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
                            <p className="text-sm text-gray-600 mt-2 ml-8 italic">{session.notes}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <a
                            href={meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary text-sm"
                          >
                            Join Now
                          </a>
                          {session.has_therapy_session ? (
                            <button
                              disabled
                              className="btn btn-secondary text-sm flex items-center space-x-1 opacity-60 cursor-not-allowed"
                              title="Session already created"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Session Created</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartSession(session)}
                              className="btn btn-secondary text-sm flex items-center space-x-1"
                              title="Create therapy session"
                            >
                              <FileText className="h-4 w-4" />
                              <span>Create Session</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCopyLink(session)}
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
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
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
                            title="Edit session"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg"
                            title="Delete session"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="lg:hidden">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <Video className="h-5 w-5 text-primary-600" />
                              <h4 className="font-semibold text-gray-900">{session.title}</h4>
                            </div>
                            <div className="flex items-center space-x-2 flex-wrap gap-1">
                              {getStatusBadge(session)}
                              {session.password_enabled && (
                                <Lock className="h-4 w-4 text-yellow-600" title="Password protected" />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 mb-3">
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

                        {/* Mobile Buttons - Vertical Stack */}
                        <div className="flex flex-col space-y-2 mb-3">
                          <a
                            href={meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-2 px-4 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition text-center"
                          >
                            Join Now
                          </a>
                          {session.has_therapy_session ? (
                            <button
                              disabled
                              className="w-full py-2 px-4 bg-gray-300 text-gray-600 text-sm rounded-lg opacity-60 cursor-not-allowed flex items-center justify-center space-x-2"
                              title="Session already created"
                            >
                              <FileText className="h-4 w-4" />
                              <span>Create Session</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartSession(session)}
                              className="w-full py-2 px-4 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 transition flex items-center justify-center space-x-2"
                              title="Create therapy session"
                            >
                              <FileText className="h-4 w-4" />
                              <span>Create Session</span>
                            </button>
                          )}
                        </div>

                        {/* Mobile Action Icons - Bottom Row */}
                        <div className="flex items-center justify-center space-x-6 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => handleCopyLink(session)}
                            className="p-2 text-gray-600 hover:text-primary-600 rounded-lg"
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
                            className="p-2 text-gray-600 hover:text-primary-600 rounded-lg"
                            title="Edit session"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSession(session.id)}
                            className="p-2 text-gray-600 hover:text-red-600 rounded-lg"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Past Sessions</h3>
              <div className="space-y-4">
                {past.map(session => {
                  const meetingUrl = generateMeetingUrl(session.meeting_room_id);
                  
                  return (
                    <div key={session.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <Video className="h-5 w-5 text-gray-400" />
                            <h4 className="font-semibold text-gray-700">{session.title}</h4>
                            {getStatusBadge(session)}
                            {session.password_enabled && (
                              <Lock className="h-4 w-4 text-yellow-600" title="Password protected" />
                            )}
                          </div>
                          
                          <div className="space-y-1 text-sm text-gray-600 ml-8">
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
                          <a
                            href={meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary text-sm"
                          >
                            Join Now
                          </a>
                          {session.has_therapy_session ? (
                            <button
                              disabled
                              className="btn btn-secondary text-sm flex items-center space-x-1 opacity-60 cursor-not-allowed"
                              title="Session already created"
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span>Session Created</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartSession(session)}
                              className="btn btn-secondary text-sm flex items-center space-x-1"
                              title="Create therapy session"
                            >
                              <FileText className="h-4 w-4" />
                              <span>Create Session</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleCopyLink(session)}
                            className="p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-100 rounded-lg"
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
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg"
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

      {showStartSessionModal && selectedVideoSession && (
        <StartSessionFromVideoModal
          videoSession={selectedVideoSession}
          partnerId={partnerId}
          onClose={handleCloseStartSessionModal}
          onSuccess={handleSessionCreated}
        />
      )}
    </div>
  );
};

export default VideoSessionsTab;

