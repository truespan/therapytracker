import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userAPI, appointmentAPI } from '../../services/api';
import RadarChartComponent from '../charts/RadarChart';
import ProgressComparison from '../charts/ProgressComparison';
import SessionList from '../sessions/SessionList';
import SessionDetail from '../sessions/SessionDetail';
import ProfileQuestionnaire from '../profile/ProfileQuestionnaire';
import SessionFeedback from '../sessions/SessionFeedback';
import CustomFieldManager from '../profile/CustomFieldManager';
import AssessmentQuestionnaire from '../profile/AssessmentQuestionnaire';
import { Activity, TrendingUp, List, ClipboardList, Calendar } from 'lucide-react';

const UserDashboard = () => {
  const { user } = useAuth();
  const [profileHistory, setProfileHistory] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [partners, setPartners] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showNewSession, setShowNewSession] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSessionForDetail, setSelectedSessionForDetail] = useState(null);
  const refreshQuestionnaireRef = useRef({});

  useEffect(() => {
    loadData();
    loadAppointments();
  }, [user.id]);

  const loadData = async () => {
    try {
      const [profileResponse, sessionsResponse, partnersResponse] = await Promise.all([
        userAPI.getProfile(user.id),
        userAPI.getSessions(user.id),
        userAPI.getPartners(user.id)
      ]);

      setProfileHistory(profileResponse.data.profileHistory || []);
      setSessions(sessionsResponse.data.sessions || []);
      setPartners(partnersResponse.data.partners || []);
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
            onClick={() => setActiveTab('comparison')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'comparison'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="inline h-5 w-5 mr-2" />
            Compare Progress
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

              {/* Mind & Body Profile - Full Width at Bottom */}
              {profileHistory.length > 0 && (
                <div className="mt-8">
                  <RadarChartComponent profileHistory={profileHistory} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'comparison' && (
        <ProgressComparison profileHistory={profileHistory} />
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

