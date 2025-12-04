import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, chartAPI, videoSessionAPI, questionnaireAPI, userAPI } from '../../services/api';
import SharedChartViewer from '../charts/SharedChartViewer';
import VideoSessionJoin from '../video/VideoSessionJoin';
import UserQuestionnaireView from '../questionnaires/UserQuestionnaireView';
import QuestionnaireChart from '../questionnaires/QuestionnaireChart';
import { Activity, Calendar, BarChart3, Video, Clock, User as UserIcon, FileText } from 'lucide-react';
import { canJoinSession, formatTimeUntilSession } from '../../utils/jitsiHelper';

const UserDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [sharedCharts, setSharedCharts] = useState([]);
  const [videoSessions, setVideoSessions] = useState([]);
  const [selectedVideoSession, setSelectedVideoSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [questionnaireAssignments, setQuestionnaireAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [viewingQuestionnaireChart, setViewingQuestionnaireChart] = useState(null);
  const [videoSessionsEnabled, setVideoSessionsEnabled] = useState(false);
  const [latestSharedChart, setLatestSharedChart] = useState(null);

  useEffect(() => {
    loadData();
    loadAppointments();
    loadQuestionnaireAssignments();
    checkVideoSessionsAccess();
    loadLatestChart();
  }, [user.id]);

  const checkVideoSessionsAccess = async () => {
    try {
      const response = await userAPI.getById(user.id);
      const hasAccess = response.data.videoSessionsEnabled || false;
      setVideoSessionsEnabled(hasAccess);

      // Only load video sessions if access is granted
      if (hasAccess) {
        loadVideoSessions();
      }
    } catch (err) {
      console.error('Failed to check video sessions access:', err);
      setVideoSessionsEnabled(false);
    }
  };

  const loadData = async () => {
    try {
      const chartsResponse = await chartAPI.getUserCharts(user.id);
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

  const loadQuestionnaireAssignments = async () => {
    try {
      const response = await questionnaireAPI.getUserAssignments(user.id);
      setQuestionnaireAssignments(response.data || []);
    } catch (err) {
      console.error('Failed to load questionnaire assignments:', err);
    }
  };

  const loadLatestChart = async () => {
    try {
      const response = await chartAPI.getLatestUserChart(user.id);
      setLatestSharedChart(response.data.chart || null);
    } catch (err) {
      console.error('Failed to load latest shared chart:', err);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section - Hidden on mobile, visible on desktop */}
      <div className="hidden lg:block mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>
        <p className="text-gray-600 mt-1">Track your therapy progress</p>
      </div>

      {/* Scrollable Tabs - Mobile & Tablet */}
      <div className="lg:hidden border-b border-gray-200 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex space-x-6 overflow-x-auto scrollbar-thin scroll-smooth pb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <Activity className="h-5 w-5" />
            <span className="text-xs">Overview</span>
          </button>
          {videoSessionsEnabled && (
            <button
              onClick={() => setActiveTab('video')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
                activeTab === 'video'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              <Video className="h-5 w-5" />
              <span className="text-xs">Video</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('charts')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'charts'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Charts</span>
          </button>
          <button
            onClick={() => setActiveTab('questionnaires')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'questionnaires'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Questionnaires</span>
          </button>
        </nav>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden lg:block border-b border-gray-200 mb-6">
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
          {videoSessionsEnabled && (
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
          )}
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
            onClick={() => setActiveTab('questionnaires')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questionnaires'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="inline h-5 w-5 mr-2" />
            Questionnaires
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div>
          {/* Upcoming Appointments & Video Sessions Widget - MOVED TO TOP */}
          {(() => {
            const now = new Date();
            const upcomingAppointments = appointments.filter(apt => new Date(apt.appointment_date) >= now);

            // Include upcoming video sessions
            const upcomingVideoSessions = videoSessionsEnabled
              ? videoSessions.filter(session => {
                  const sessionDate = new Date(session.session_date);
                  return sessionDate >= now && session.status !== 'cancelled';
                }).map(session => ({
                  ...session,
                  isVideoSession: true,
                  appointment_date: session.session_date,
                  title: session.title || 'Video Session',
                  partner_name: session.partner_name
                }))
              : [];

            // Combine and sort by date
            const allUpcoming = [...upcomingAppointments, ...upcomingVideoSessions]
              .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

            return allUpcoming.length > 0 ? (
              <div className="card mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                  Upcoming Appointments
                </h3>
                <div className="space-y-3">
                  {allUpcoming.slice(0, 5).map((apt, index) => (
                    <div key={apt.isVideoSession ? `video-${apt.id}` : `apt-${apt.id}`} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {apt.isVideoSession && <Video className="h-4 w-4 text-blue-600" />}
                          <p className="font-medium text-gray-900">{apt.title}</p>
                        </div>
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
                {allUpcoming.length > 5 && (
                  <div className="mt-4 text-center text-sm text-gray-500">
                    + {allUpcoming.length - 5} more upcoming appointments
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {/* Past Appointments & Video Sessions Widget */}
          {(() => {
            const now = new Date();
            const pastAppointments = appointments.filter(apt => new Date(apt.appointment_date) < now);

            // Include past video sessions
            const pastVideoSessions = videoSessionsEnabled
              ? videoSessions.filter(session => {
                  const sessionDate = new Date(session.session_date);
                  return sessionDate < now;
                }).map(session => ({
                  ...session,
                  isVideoSession: true,
                  appointment_date: session.session_date,
                  title: session.title || 'Video Session',
                  partner_name: session.partner_name
                }))
              : [];

            // Combine and sort by date (most recent first)
            const allPast = [...pastAppointments, ...pastVideoSessions]
              .sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

            return allPast.length > 0 ? (
              <div className="card mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-600" />
                  Past Appointments
                </h3>
                <div className="space-y-3">
                  {allPast.slice(0, 3).map((apt, index) => (
                    <div key={apt.isVideoSession ? `video-${apt.id}` : `apt-${apt.id}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          {apt.isVideoSession && <Video className="h-4 w-4 text-gray-600" />}
                          <p className="font-medium text-gray-700">{apt.title}</p>
                        </div>
                        <p className="text-sm text-gray-500">
                          {new Date(apt.appointment_date).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        <p className="text-sm text-gray-400">with {apt.partner_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {allPast.length > 3 && (
                  <div className="mt-4 text-center text-sm text-gray-500">
                    + {allPast.length - 3} more past appointments
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {/* Pending Questionnaires Widget */}
          {questionnaireAssignments.filter(a => a.status === 'pending').length > 0 && (
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Pending Questionnaires
              </h3>
              <div className="space-y-3">
                {questionnaireAssignments
                  .filter(a => a.status === 'pending')
                  .slice(0, 3)
                  .map(assignment => (
                    <div key={assignment.id} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <FileText className="h-5 w-5 text-yellow-600" />
                            <h4 className="font-semibold text-gray-900">{assignment.name}</h4>
                          </div>
                          {assignment.description && (
                            <p className="text-sm text-gray-600 mb-2 ml-7">{assignment.description}</p>
                          )}
                          <div className="text-xs text-gray-500 ml-7 space-y-1">
                            <p>Assigned by: {assignment.partner_name}</p>
                            <p>Date: {new Date(assignment.assigned_at).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">
                          Pending
                        </span>
                      </div>
                      <div className="flex justify-end mt-3">
                        <button
                          onClick={() => setActiveTab('questionnaires')}
                          className="px-4 py-2 btn btn-primary text-sm"
                        >
                          Complete Now
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
              {questionnaireAssignments.filter(a => a.status === 'pending').length > 3 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setActiveTab('questionnaires')}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View all {questionnaireAssignments.filter(a => a.status === 'pending').length} pending questionnaires →
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Latest Shared Chart Notification */}
          {latestSharedChart && (
            <div className="card mb-6 border-l-4 border-l-blue-500 bg-blue-50">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    New Chart Shared with You
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">{latestSharedChart.partner_name}</span> has shared a new comparison chart with you
                    </p>
                    {latestSharedChart.questionnaire_name && (
                      <p className="text-gray-600">
                        Questionnaire: {latestSharedChart.questionnaire_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      Shared on {new Date(latestSharedChart.sent_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('charts')}
                  className="btn btn-primary ml-4 whitespace-nowrap"
                >
                  View Chart →
                </button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {appointments.length === 0 && questionnaireAssignments.filter(a => a.status === 'pending').length === 0 && !latestSharedChart && (
            <div className="card text-center py-12">
              <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Your Dashboard</h3>
              <p className="text-gray-600">
                Your upcoming appointments, questionnaires, and shared charts will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'video' && videoSessionsEnabled && (
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
          <SharedChartViewer charts={sharedCharts} />
        </div>
      )}

      {activeTab === 'questionnaires' && (
        <div>
          {selectedAssignment ? (
            <div>
              <button
                onClick={() => {
                  setSelectedAssignment(null);
                  setViewingQuestionnaireChart(null);
                }}
                className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
              >
                ← Back to Questionnaires
              </button>
              
              {viewingQuestionnaireChart ? (
                <QuestionnaireChart
                  questionnaireId={viewingQuestionnaireChart.questionnaire_id}
                  userId={user.id}
                  questionnaireName={viewingQuestionnaireChart.name}
                />
              ) : (
                <UserQuestionnaireView
                  assignmentId={selectedAssignment.id}
                  viewOnly={selectedAssignment.status === 'completed'}
                  onComplete={() => {
                    loadQuestionnaireAssignments();
                    setSelectedAssignment(null);
                  }}
                  onCancel={() => setSelectedAssignment(null)}
                />
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Questionnaires</h2>
              
              {questionnaireAssignments.length === 0 ? (
                <div className="card text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Questionnaires Yet</h3>
                  <p className="text-gray-600">
                    Your therapist will assign questionnaires for you to complete. They will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pending Questionnaires */}
                  {questionnaireAssignments.filter(a => a.status === 'pending').length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Pending</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {questionnaireAssignments
                          .filter(a => a.status === 'pending')
                          .map(assignment => (
                            <div key={assignment.id} className="card border-l-4 border-l-yellow-500">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{assignment.name}</h4>
                                  {assignment.description && (
                                    <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                                  )}
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mb-3">
                                <p>Assigned by: {assignment.partner_name}</p>
                                <p>Date: {new Date(assignment.assigned_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}</p>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => setSelectedAssignment(assignment)}
                                  className="px-6 py-2 btn btn-primary"
                                >
                                  Complete Questionnaire
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Questionnaires */}
                  {questionnaireAssignments.filter(a => a.status === 'completed').length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">Completed</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {questionnaireAssignments
                          .filter(a => a.status === 'completed')
                          .map(assignment => (
                            <div key={assignment.id} className="card border-l-4 border-l-green-500">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-900">{assignment.name}</h4>
                                  {assignment.description && (
                                    <p className="text-sm text-gray-600 mt-1">{assignment.description}</p>
                                  )}
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Completed
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 mb-3">
                                <p>Assigned by: {assignment.partner_name}</p>
                                <p>Completed: {new Date(assignment.completed_at || assignment.assigned_at).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}</p>
                                <p>Responses: {assignment.response_count || 0}</p>
                              </div>
                              <div className="flex justify-center">
                                <button
                                  onClick={() => setSelectedAssignment(assignment)}
                                  className="px-6 py-2 btn btn-primary"
                                >
                                  View Responses
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserDashboard;

