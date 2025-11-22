import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, appointmentAPI, chartAPI, videoSessionAPI } from '../../services/api';
import SessionList from '../sessions/SessionList';
import SessionDetail from '../sessions/SessionDetail';
import ProfileQuestionnaire from '../profile/ProfileQuestionnaire';
import SessionFeedback from '../sessions/SessionFeedback';
import CustomFieldManager from '../profile/CustomFieldManager';
import AssessmentQuestionnaire from '../profile/AssessmentQuestionnaire';
import SharedChartViewer from '../charts/SharedChartViewer';
import VideoSessionJoin from '../video/VideoSessionJoin';
import { Activity, List, ClipboardList, Calendar, BarChart3, Video, Clock, User as UserIcon } from 'lucide-react';
import { generateMeetingUrl, canJoinSession, formatTimeUntilSession } from '../../utils/jitsiHelper';

const UserDashboard = () => {
  const { user } = useAuth();
  const [profileHistory, setProfileHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [partners, setPartners] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [sharedCharts, setSharedCharts] = useState([]);
  const [videoSessions, setVideoSessions] = useState([]);
  const [selectedVideoSession, setSelectedVideoSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewSession, setShowNewSession] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState(null);
  const refreshQuestionnaireRef = useRef({});

  useEffect(() => {
    loadData();
    loadAppointments();
    loadVideoSessions();
  }, [user.id]);

  const loadData = async () => {
    try {
      const [profileResponse, sessionsResponse, partnersResponse, chartsResponse] = await Promise.all([
        userAPI.getProfile(user.id),
        userAPI.getSessions(user.id),
        userAPI.getPartners(user.id),
        chartAPI.getUserCharts(user.id)
      ]);

      setProfileHistory(profileResponse.data.profileHistory || []);
      setSessions(sessionsResponse.data.sessions || []);
      setPartners(partnersResponse.data.partners || []);
      setSharedCharts(chartsResponse.data.charts || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await appointmentAPI.getByUser(user.id);
      setAppointments(response.data.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    }
  };

  const loadVideoSessions = async () => {
    try {
      const response = await videoSessionAPI.getByUser(user.id);
      setVideoSessions(response.data.sessions || []);
    } catch (err) {
      console.error('Failed to load video sessions:', err);
    }
  };


  const handleSessionComplete = () => {
    setShowNewSession(false);
    setCurrentSession(null);
    loadData();
  };

  const handleFieldAdded = (sessionId) => {
    // Trigger refresh of the specific questionnaire
    if (refreshQuestionnaireRef.current[sessionId]) {
      refreshQuestionnaireRef.current[sessionId]();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (selectedVideoSession) {
    return (
      <VideoSessionJoin
        sessionId={selectedVideoSession.id}
        userName={user.name}
        onLeave={() => setSelectedVideoSession(null)}
      />
    );
  }

  if (selectedSessionForDetail) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SessionDetail
          sessionId={selectedSessionForDetail.id}
          onBack={() => setSelectedSessionForDetail(null)}
        />
      </div>
    );
  }

  if (showNewSession && currentSession) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Session {currentSession.session_number} - Assessment
          </h2>
          <p className="text-gray-600 mt-1">Please rate yourself on the following aspects</p>
        </div>
        
        <ProfileQuestionnaire
          userId={user.id}
          sessionId={currentSession.id}
          showPreviousRatings={true}
          onComplete={() => {
            // Show feedback form after completing questionnaire
            setActiveTab('feedback');
          }}
        />

        {activeTab === 'feedback' && (
          <div className="mt-8">
            <SessionFeedback
              sessionId={currentSession.id}
              onSaved={handleSessionComplete}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>
        <p className="text-gray-600 mt-1">Track your therapy progress</p>
        {partners.length > 0 && (
          <p className="text-gray-700 mt-2">
            <span className="font-medium">Therapist:</span>{' '}
            <span className="text-gray-900">{partners[0].name}</span>
          </p>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="inline h-5 w-5 mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'video'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Video className="inline h-5 w-5 mr-2" />
            Video Sessions
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'charts'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline h-5 w-5 mr-2" />
            Charts & Insights
          </button>
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assessments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardList className="inline h-5 w-5 mr-2" />
            Assessments
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sessions'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <List className="inline h-5 w-5 mr-2" />
            All Sessions
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Upcoming Video Sessions Widget */}
          {videoSessions.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Video className="h-5 w-5 mr-2 text-primary-600" />
                Upcoming Video Sessions
              </h3>
              <div className="space-y-3">
                {videoSessions.slice(0, 3).map(session => {
                  const canJoin = canJoinSession(session.session_date);
                  const timeUntil = formatTimeUntilSession(session.session_date);
                  
                  return (
                    <div key={session.id} className="flex items-center justify-between p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Video className="h-5 w-5 text-purple-600" />
                          <p className="font-medium text-gray-900">{session.title}</p>
                        </div>
                        <p className="text-sm text-gray-600">
                          {new Date(session.session_date).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <div className="flex items-center space-x-4 mt-1">
                          <p className="text-sm text-gray-500 flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            with {session.partner_name}
                          </p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {session.duration_minutes} min
                          </p>
                        </div>
                        {!canJoin && (
                          <p className="text-xs text-purple-600 font-medium mt-1">
                            Starts in: {timeUntil}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setSelectedVideoSession(session)}
                        className={`btn ${canJoin ? 'btn-primary' : 'btn-secondary'} ml-4`}
                      >
                        {canJoin ? 'Join Now' : 'View Details'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Upcoming Appointments Widget */}
          {appointments.length > 0 && (
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                Upcoming Appointments
              </h3>
              <div className="space-y-3">
                {appointments.slice(0, 3).map(apt => (
                  <div key={apt.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{apt.title}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(apt.appointment_date).toLocaleString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-sm text-gray-500">with {apt.partner_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {sessions.length === 0 ? (
            <div className="card text-center py-12">
              <ClipboardList className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
              <p className="text-gray-600">
                Your therapist will create sessions for you. You'll be able to complete assessments here.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions Summary</h3>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Mind & Body Assessments</h2>
              </div>
              
              <div className="space-y-6">
                {/* Sort sessions by session_number DESC (latest first) */}
                {[...sessions]
                  .sort((a, b) => b.session_number - a.session_number)
                  .map((session, index) => (
                    <div key={session.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Left Column - Session Card */}
                      <div className="lg:col-span-4">
                        <div
                          className={`card cursor-pointer transition-all hover:shadow-md ${
                            session.completed ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-yellow-500'
                          }`}
                          onClick={() => {
                            // Scroll to the corresponding assessment card
                            const element = document.getElementById(`assessment-${session.id}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                Session {session.session_number}
                              </h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {new Date(session.session_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                with {partners[0]?.name || 'Therapist'}
                              </p>
                            </div>
                            <div>
                              {session.completed ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Completed
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  In Progress
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Assessment */}
                      <div className="lg:col-span-8" id={`assessment-${session.id}`}>
                        <AssessmentQuestionnaire
                          userId={user.id}
                          sessionId={session.id}
                          sessionNumber={session.session_number}
                          viewOnly={session.completed}
                          onComplete={loadData}
                          onFieldAdded={(refreshFn) => {
                            // Store refresh function for this session
                            refreshQuestionnaireRef.current[session.id] = refreshFn;
                          }}
                        />
                        
                        {/* Show Custom Field Manager only for the latest incomplete session */}
                        {index === 0 && !session.completed && (
                          <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-4">Customize Your Profile</h3>
                            <CustomFieldManager 
                              sessionId={session.id}
                              userId={user.id}
                              onFieldAdded={() => handleFieldAdded(session.id)} 
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'video' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Video Sessions</h2>
          {videoSessions.length === 0 ? (
            <div className="card text-center py-12">
              <Video className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Video Sessions Scheduled</h3>
              <p className="text-gray-600">
                Your therapist will schedule video sessions with you. They will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {videoSessions.map(session => {
                const canJoin = canJoinSession(session.session_date);
                const timeUntil = formatTimeUntilSession(session.session_date);
                
                return (
                  <div key={session.id} className="card">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Video className="h-6 w-6 text-primary-600" />
                          <h3 className="text-xl font-semibold text-gray-900">{session.title}</h3>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600 ml-9">
                          <div className="flex items-center space-x-2">
                            <UserIcon className="h-4 w-4" />
                            <span>with {session.partner_name}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(session.session_date).toLocaleString('en-US', {
                              weekday: 'long',
                              month: 'long',
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
                              Starts in: {timeUntil}
                            </div>
                          )}
                        </div>

                        {session.notes && (
                          <p className="text-sm text-gray-600 mt-3 ml-9 italic bg-gray-50 p-3 rounded-lg">
                            {session.notes}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedVideoSession(session)}
                        className={`btn ${canJoin ? 'btn-primary' : 'btn-secondary'} ml-4`}
                      >
                        {canJoin ? 'Join Now' : 'View Details'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'charts' && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Charts from Your Therapist</h2>
          <SharedChartViewer charts={sharedCharts} profileHistory={profileHistory} />
        </div>
      )}

      {activeTab === 'assessments' && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mind & Body Assessments</h2>
          
          {sessions.length === 0 ? (
            <div className="card text-center py-12">
              <ClipboardList className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Sessions Yet</h3>
              <p className="text-gray-600">
                Your therapist will create sessions for you. You'll be able to complete assessments here.
              </p>
            </div>
          ) : (
            // Sort sessions by session_number DESC (latest first)
            [...sessions]
              .sort((a, b) => b.session_number - a.session_number)
              .map((session) => (
                <div key={session.id} className="mb-6">
                  <AssessmentQuestionnaire
                    userId={user.id}
                    sessionId={session.id}
                    sessionNumber={session.session_number}
                    viewOnly={session.completed}
                    onComplete={loadData}
                  />
                </div>
              ))
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <SessionList
          sessions={sessions}
          onSessionClick={(session) => setSelectedSessionForDetail(session)}
        />
      )}
    </div>
  );
};

export default UserDashboard;

