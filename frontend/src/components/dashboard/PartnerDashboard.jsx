import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { partnerAPI, userAPI, sessionAPI, chartAPI } from '../../services/api';
import RadarChartComponent from '../charts/RadarChart';
import ProgressComparison from '../charts/ProgressComparison';
import SessionList from '../sessions/SessionList';
import PartnerCalendar from '../calendar/PartnerCalendar';
import { Users, Activity, User, Calendar, Copy, Check, BarChart3, CheckCircle } from 'lucide-react';

const PartnerDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userSessions, setUserSessions] = useState([]);
  const [sentCharts, setSentCharts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('clients');

  useEffect(() => {
    loadPartnerUsers();
  }, [user.id]);

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
      const [profileResponse, sessionsResponse, chartsResponse] = await Promise.all([
        partnerAPI.getUserProfile(user.id, selectedUserId),
        userAPI.getSessions(selectedUserId),
        chartAPI.getPartnerUserCharts(user.id, selectedUserId)
      ]);

      setSelectedUser(profileResponse.data.user);
      setUserProfile(profileResponse.data.profileHistory || []);
      setUserSessions(sessionsResponse.data.sessions || []);
      setSentCharts(chartsResponse.data.charts || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setLoading(false);
    }
  };

  const handleCreateSession = async (userId) => {
    try {
      await sessionAPI.create({
        user_id: userId,
        partner_id: user.id
      });
      
      alert('Session created successfully! The user can now complete their assessment.');
      
      // Reload user data
      if (selectedUser && selectedUser.id === userId) {
        handleUserSelect(userId);
      }
    } catch (err) {
      console.error('Failed to create session:', err);
      const errorMessage = err.response?.data?.error || 'Failed to create session';
      if (errorMessage.includes('incomplete session') || errorMessage.includes('in progress')) {
        alert('Cannot create a new session because an existing session is still in progress');
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }
    
    try {
      await sessionAPI.delete(sessionId);
      alert('Session deleted successfully');
      // Reload user sessions
      if (selectedUser) {
        handleUserSelect(selectedUser.id);
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      alert('Failed to delete session');
    }
  };

  const copyPartnerIdToClipboard = () => {
    if (user.partner_id) {
      navigator.clipboard.writeText(user.partner_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
        
        {/* Partner ID Display */}
        {user.partner_id && (
          <div className="mt-4 inline-flex items-center bg-primary-50 border-2 border-primary-200 rounded-lg px-4 py-3">
            <div className="mr-3">
              <p className="text-xs text-gray-600 font-medium">Your Partner ID</p>
              <p className="text-2xl font-bold text-primary-700 tracking-wider">{user.partner_id}</p>
            </div>
            <button
              onClick={copyPartnerIdToClipboard}
              className="p-2 hover:bg-primary-100 rounded-md transition-colors"
              title="Copy Partner ID"
            >
              {copied ? (
                <Check className="h-5 w-5 text-green-600" />
              ) : (
                <Copy className="h-5 w-5 text-primary-600" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
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

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="grid lg:grid-cols-3 gap-6">
        {/* Users List */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Your Clients ({users.length})
              </h2>
            </div>
            
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>No clients assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleUserSelect(client.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedUser?.id === client.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-600">{client.sex}, {client.age} years</p>
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
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                    <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                      <span>{selectedUser.sex}, {selectedUser.age} years</span>
                      {selectedUser.email && <span>{selectedUser.email}</span>}
                      {selectedUser.contact && <span>{selectedUser.contact}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleCreateSession(selectedUser.id)}
                    className="btn btn-primary flex items-center space-x-2"
                  >
                    <Calendar className="h-4 w-4" />
                    <span>New Session</span>
                  </button>
                </div>
              </div>

              {/* Progress Chart */}
              <RadarChartComponent 
                profileHistory={userProfile}
                title={`${selectedUser.name}'s Progress`}
              />

              {/* Sessions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Session History</h3>
                <SessionList 
                  sessions={userSessions} 
                  onDeleteSession={handleDeleteSession}
                  canDelete={true}
                />
              </div>
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
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-1">
            <div className="card sticky top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Your Clients ({users.length})
                </h2>
              </div>
              
              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>No clients assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {users.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleUserSelect(client.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedUser?.id === client.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-600">{client.sex}, {client.age} years</p>
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
              <div className="space-y-6">
                {/* User Info Card */}
                <div className="card">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedUser.name}</h2>
                  <p className="text-sm text-gray-600 mt-2">
                    Create and send custom charts to your client
                  </p>
                </div>

                {/* Progress Comparison with Send Button */}
                {userProfile && userProfile.length > 0 ? (
                  <ProgressComparison 
                    profileHistory={userProfile}
                    onSendChart={handleSendChart}
                    showSendButton={true}
                  />
                ) : (
                  <div className="card text-center py-12 text-gray-500">
                    <p>No profile data available for this client yet</p>
                  </div>
                )}

                {/* Sent Charts List */}
                {sentCharts.length > 0 && (
                  <div className="card">
                    <h3 className="text-lg font-semibold mb-4">Charts Sent to {selectedUser.name}</h3>
                    <div className="space-y-3">
                      {sentCharts.map((chart) => {
                        const chartDate = new Date(chart.sent_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div key={chart.id} className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center space-x-3">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="font-medium text-gray-900">
                                  {chart.chart_type === 'radar_default' ? 'Progress Overview' : 'Session Comparison'}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {chart.chart_type === 'comparison' && chart.selected_sessions && (
                                    <span>Sessions: {chart.selected_sessions.join(', ')} • </span>
                                  )}
                                  Sent on {chartDate}
                                </p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Sent
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="card text-center py-16">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 text-lg">Select a client to create and send charts</p>
              </div>
            )}
          </div>
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

