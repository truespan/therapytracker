import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { partnerAPI, chartAPI, questionnaireAPI } from '../../services/api';
import QuestionnaireComparison from '../charts/QuestionnaireComparison';
import PartnerCalendar from '../calendar/PartnerCalendar';
import VideoSessionsTab from '../video/VideoSessionsTab';
import QuestionnaireList from '../questionnaires/QuestionnaireList';
import QuestionnaireBuilder from '../questionnaires/QuestionnaireBuilder';
import AssignQuestionnaireModal from '../questionnaires/AssignQuestionnaireModal';
import LatestChartDisplay from '../charts/LatestChartDisplay';
import UserAssignmentsSection from '../questionnaires/UserAssignmentsSection';
import SessionsSection from '../sessions/SessionsSection';
import AppointmentsTab from '../appointments/AppointmentsTab';
import { Users, Activity, User, Calendar, BarChart3, CheckCircle, Video, ClipboardList, CalendarDays } from 'lucide-react';

const PartnerDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sentCharts, setSentCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments');
  const [videoSessionsEnabled, setVideoSessionsEnabled] = useState(true);

  // Questionnaire state
  const [questionnaireView, setQuestionnaireView] = useState('list'); // 'list', 'create', 'edit'
  const [editingQuestionnaireId, setEditingQuestionnaireId] = useState(null);
  const [assigningQuestionnaire, setAssigningQuestionnaire] = useState(null);

  useEffect(() => {
    loadPartnerUsers();
  }, [user.id]);

  useEffect(() => {
    // Check if video sessions are enabled for this partner's organization
    if (user && user.organization_video_sessions_enabled !== undefined) {
      setVideoSessionsEnabled(user.organization_video_sessions_enabled);
    }
  }, [user]);

  const loadPartnerUsers = async () => {
    try {
      const response = await partnerAPI.getUsers(user.id);
      setUsers(response.data.users || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load users:', err);
      setLoading(false);
    }
  };

  const handleUserSelect = async (selectedUserId) => {
    try {
      setLoading(true);
      // Find the selected user from the users list
      const selected = users.find(u => u.id === selectedUserId);
      setSelectedUser(selected);

      // Load charts sent to this user
      const chartsResponse = await chartAPI.getPartnerUserCharts(user.id, selectedUserId);
      setSentCharts(chartsResponse.data.charts || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setLoading(false);
    }
  };


  const handleSendChart = async (chartType, selectedSessions) => {
    if (!selectedUser) return;

    try {
      await chartAPI.shareChart({
        partner_id: user.id,
        user_id: selectedUser.id,
        chart_type: chartType,
        selected_sessions: selectedSessions
      });

      alert('Chart sent successfully to client!');
      
      // Reload sent charts
      const chartsResponse = await chartAPI.getPartnerUserCharts(user.id, selectedUser.id);
      setSentCharts(chartsResponse.data.charts || []);
    } catch (err) {
      console.error('Failed to send chart:', err);
      alert('Failed to send chart. Please try again.');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Welcome, {user.name}</h1>
        <p className="text-gray-600 mt-1">Manage your clients and track their progress</p>
      </div>

      {/* Mobile Dropdown */}
      <div className="md:hidden mb-6">
        <select
          value={activeTab}
          onChange={(e) => {
            setActiveTab(e.target.value);
            if (e.target.value === 'questionnaires') {
              setQuestionnaireView('list');
            }
          }}
          className="w-full input text-sm"
        >
          <option value="appointments">📅 Appointments</option>
          <option value="clients">👥 Clients</option>
          <option value="charts">📊 Charts & Insights</option>
          {videoSessionsEnabled && <option value="video">🎥 Video Sessions</option>}
          <option value="questionnaires">📋 Questionnaires</option>
          <option value="calendar">📆 Calendar</option>
        </select>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden md:block border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'appointments'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarDays className="inline h-5 w-5 mr-2" />
            Appointments
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clients'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="inline h-5 w-5 mr-2" />
            Clients
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
            onClick={() => {
              setActiveTab('questionnaires');
              setQuestionnaireView('list');
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questionnaires'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ClipboardList className="inline h-5 w-5 mr-2" />
            Questionnaires
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="inline h-5 w-5 mr-2" />
            Calendar
          </button>
        </nav>
      </div>

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <AppointmentsTab partnerId={user.id} />
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <div className="card lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Your Clients ({users.length})
              </h2>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm sm:text-base">No clients assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
                {users.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleUserSelect(client.id)}
                    className={`w-full text-left p-2 sm:p-3 rounded-lg border-2 transition ${
                      selectedUser?.id === client.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{client.name}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{client.sex}, {client.age} years</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="lg:col-span-2">
          {selectedUser ? (
            <div className="space-y-6">
              {/* User Info Card */}
              <div className="card">
                <div className="flex justify-between items-start mb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{selectedUser.name}</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm text-gray-600 space-y-1 sm:space-y-0">
                      <span>{selectedUser.sex}, {selectedUser.age} years</span>
                      {selectedUser.email && <span className="truncate">{selectedUser.email}</span>}
                      {selectedUser.contact && <span>{selectedUser.contact}</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Therapy Sessions */}
              <SessionsSection
                partnerId={user.id}
                userId={selectedUser.id}
                userName={selectedUser.name}
              />

              {/* Latest Chart Sent to Client */}
              <LatestChartDisplay
                sentCharts={sentCharts}
                userName={selectedUser.name}
              />

              {/* Questionnaires Assigned to Client */}
              <UserAssignmentsSection
                userId={selectedUser.id}
                userName={selectedUser.name}
              />
            </div>
          ) : (
            <div className="card text-center py-16">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Select a client to view their progress</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Charts & Insights Tab */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Users List */}
          <div className="lg:col-span-1">
            <div className="card lg:sticky lg:top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold flex items-center">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Your Clients ({users.length})
                </h2>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm sm:text-base">No clients assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto">
                  {users.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleUserSelect(client.id)}
                      className={`w-full text-left p-2 sm:p-3 rounded-lg border-2 transition ${
                        selectedUser?.id === client.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <User className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{client.name}</p>
                          <p className="text-xs sm:text-sm text-gray-600">{client.sex}, {client.age} years</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Charts Section */}
          <div className="lg:col-span-2">
            {selectedUser ? (
              <QuestionnaireComparison
                userId={selectedUser.id}
                partnerId={user.id}
                userName={selectedUser.name}
                sentCharts={sentCharts}
                onChartSent={async () => {
                  // Reload sent charts
                  const chartsResponse = await chartAPI.getPartnerUserCharts(user.id, selectedUser.id);
                  setSentCharts(chartsResponse.data.charts || []);
                }}
                onChartDeleted={async () => {
                  // Reload sent charts
                  const chartsResponse = await chartAPI.getPartnerUserCharts(user.id, selectedUser.id);
                  setSentCharts(chartsResponse.data.charts || []);
                }}
              />
            ) : (
              <div className="card text-center py-16">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Select a client to create and send questionnaire comparison charts</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Sessions Tab */}
      {activeTab === 'video' && videoSessionsEnabled && (
        <VideoSessionsTab
          partnerId={user.id}
          users={users}
        />
      )}

      {/* Questionnaires Tab */}
      {activeTab === 'questionnaires' && (
        <div>
          {questionnaireView === 'list' && (
            <QuestionnaireList
              partnerId={user.id}
              onCreateNew={() => {
                setQuestionnaireView('create');
                setEditingQuestionnaireId(null);
              }}
              onEdit={(questionnaireId) => {
                setQuestionnaireView('edit');
                setEditingQuestionnaireId(questionnaireId);
              }}
              onAssign={(questionnaire) => {
                setAssigningQuestionnaire(questionnaire);
              }}
            />
          )}

          {(questionnaireView === 'create' || questionnaireView === 'edit') && (
            <QuestionnaireBuilder
              questionnaireId={editingQuestionnaireId}
              onSave={() => {
                setQuestionnaireView('list');
                setEditingQuestionnaireId(null);
              }}
              onCancel={() => {
                setQuestionnaireView('list');
                setEditingQuestionnaireId(null);
              }}
            />
          )}

          {assigningQuestionnaire && (
            <AssignQuestionnaireModal
              questionnaire={assigningQuestionnaire}
              partnerId={user.id}
              onClose={() => setAssigningQuestionnaire(null)}
              onSuccess={() => {
                setAssigningQuestionnaire(null);
              }}
            />
          )}
        </div>
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <PartnerCalendar
          partnerId={user.id}
          users={users}
        />
      )}
    </div>
  );
};

export default PartnerDashboard;

