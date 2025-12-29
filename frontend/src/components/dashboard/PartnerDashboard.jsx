import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { partnerAPI, chartAPI, questionnaireAPI } from '../../services/api';
import QuestionnaireComparison from '../charts/QuestionnaireComparison';
import PartnerCalendar from '../calendar/PartnerCalendar';
import VideoSessionsTab from '../video/VideoSessionsTab';
import QuestionnaireList from '../questionnaires/QuestionnaireList';
import QuestionnaireBuilder from '../questionnaires/QuestionnaireBuilder';
import AssignQuestionnaireModal from '../questionnaires/AssignQuestionnaireModal';
import ShareQuestionnaireModal from '../questionnaires/ShareQuestionnaireModal';
import LatestChartDisplay from '../charts/LatestChartDisplay';
import UserAssignmentsSection from '../questionnaires/UserAssignmentsSection';
import SessionsSection from '../sessions/SessionsSection';
import AppointmentsTab from '../appointments/AppointmentsTab';
import PartnerSettings from '../partner/PartnerSettings';
import CaseHistoryForm from '../casehistory/CaseHistoryForm';
import MentalStatusExaminationForm from '../mentalstatus/MentalStatusExaminationForm';
import SessionNotesTab from '../sessions/SessionNotesTab';
import PartnerReportsTab from '../reports/PartnerReportsTab';
import ClientReportsTab from '../reports/ClientReportsTab';
import AvailabilityTab from '../availability/AvailabilityTab';
import EarningsTab from '../earnings/EarningsTab';
import BlogManagement from '../blogs/BlogManagement';
import { Users, Activity, User, Calendar, BarChart3, CheckCircle, Video, ClipboardList, CalendarDays, ChevronDown, Copy, Check, Settings, FileText, Brain, StickyNote, UserPlus, Link as LinkIcon, CalendarClock, Edit } from 'lucide-react';
import { CurrencyIcon } from '../../utils/currencyIcon';
import CreatePatientModal from '../partner/CreatePatientModal';
import EditClientModal from '../partner/EditClientModal';
import DarkModeToggle from '../common/DarkModeToggle';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
// For production: https://therapy-tracker-api.onrender.com/api -> https://therapy-tracker-api.onrender.com
// For localhost: http://localhost:5000/api -> http://localhost:5000
const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

// Helper function to construct image URL
const getImageUrl = (photoUrl) => {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;

  // If photoUrl starts with /, it's a relative path
  if (photoUrl.startsWith('/')) {
    return `${SERVER_BASE_URL}${photoUrl}`;
  }

  // Otherwise, prepend the base URL
  return `${SERVER_BASE_URL}/${photoUrl}`;
};

const PartnerDashboard = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sentCharts, setSentCharts] = useState([]);

  // Debug logging for production
  useEffect(() => {
    console.log('PartnerDashboard - API_BASE_URL:', API_BASE_URL);
    console.log('PartnerDashboard - SERVER_BASE_URL:', SERVER_BASE_URL);
    console.log('PartnerDashboard - user.photo_url:', user?.photo_url);
    if (user?.photo_url) {
      const finalUrl = user.photo_url.startsWith('http') ? user.photo_url : `${SERVER_BASE_URL}${user.photo_url}`;
      console.log('PartnerDashboard - Final image URL:', finalUrl);
    }
  }, [user]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('appointments');
  const [videoSessionsEnabled, setVideoSessionsEnabled] = useState(false);
  const [copiedPartnerId, setCopiedPartnerId] = useState(false);
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [copiedSignupUrl, setCopiedSignupUrl] = useState(false);

  // Questionnaire state
  const [questionnaireView, setQuestionnaireView] = useState('list'); // 'list', 'create', 'edit'
  const [editingQuestionnaireId, setEditingQuestionnaireId] = useState(null);
  const [assigningQuestionnaire, setAssigningQuestionnaire] = useState(null);

  // Client detail tabs state
  const [clientDetailTab, setClientDetailTab] = useState('sessionDetails');
  const [editingNoteSessionId, setEditingNoteSessionId] = useState(null);
  const [reportSessionId, setReportSessionId] = useState(null);
  const sessionsSectionRef = useRef(null);

  useEffect(() => {
    loadPartnerUsers();
    // Debug: Log user organization data
    console.log('PartnerDashboard - User object:', user);
    console.log('PartnerDashboard - Organization:', user?.organization);
    console.log('PartnerDashboard - theraptrack_controlled:', user?.organization?.theraptrack_controlled);
  }, [user.id, user?.organization]);

  useEffect(() => {
    // Check if video sessions are enabled for this partner's organization
    setVideoSessionsEnabled(!!user?.organization_video_sessions_enabled);
  }, [user?.organization_video_sessions_enabled]);

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

  const handleNavigateToNotes = (sessionId) => {
    setClientDetailTab('sessionNotes');
    setEditingNoteSessionId(sessionId);
  };

  const handleNoteChanged = () => {
    // Refresh sessions list when a note is created/updated/deleted
    console.log('handleNoteChanged called, refreshing sessions...');
    if (sessionsSectionRef.current && sessionsSectionRef.current.loadSessions) {
      console.log('Calling loadSessions on SessionsSection');
      sessionsSectionRef.current.loadSessions();
    } else {
      console.warn('SessionsSection ref not available');
    }
  };

  const handleGenerateReport = (sessionId) => {
    setClientDetailTab('reports');
    setReportSessionId(sessionId);
  };

  const handleNavigateToSession = async (userId, sessionId) => {
    // Find and select the user
    const userToSelect = users.find(u => u.id === userId);
    if (userToSelect) {
      // Load user data (charts, etc.) similar to handleUserSelect
      try {
        setLoading(true);
        setSelectedUser(userToSelect);
        const chartsResponse = await chartAPI.getPartnerUserCharts(user.id, userId);
        setSentCharts(chartsResponse.data.charts || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load user data:', err);
        setLoading(false);
      }
      
      // Switch to Clients tab
      setActiveTab('clients');
      // Switch to Session Details tab
      setClientDetailTab('sessionDetails');
      
      // Wait for SessionsSection to load, then expand and scroll to session
      // Use multiple timeouts to ensure the component is fully rendered
      setTimeout(() => {
        if (sessionsSectionRef.current) {
          // Expand the sessions section if it has a method to do so
          if (sessionsSectionRef.current.expandAndScrollToSession) {
            sessionsSectionRef.current.expandAndScrollToSession(sessionId);
          }
        }
      }, 500);
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

  const handleCopyPartnerId = () => {
    if (user?.partner_id) {
      navigator.clipboard.writeText(user.partner_id);
      setCopiedPartnerId(true);
      setTimeout(() => setCopiedPartnerId(false), 2000);
    }
  };

  const handleCreatePatientSuccess = () => {
    // Reload the users list after creating a new patient
    loadPartnerUsers();
  };

  const handleEditClientSuccess = (updatedClient) => {
    // Update the selected user in state
    setSelectedUser(updatedClient);
    // Reload the users list to reflect the changes
    loadPartnerUsers();
  };

  const handleCopySignupUrl = () => {
    if (user?.partner_id) {
      const baseUrl = window.location.origin;
      const signupUrl = `${baseUrl}/signup?therapist_id=${user.partner_id}`;
      navigator.clipboard.writeText(signupUrl);
      setCopiedSignupUrl(true);
      setTimeout(() => setCopiedSignupUrl(false), 2000);
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
      {/* Welcome Section & Partner ID - Hidden on mobile, visible on desktop/tablet */}
      <div className="hidden lg:flex lg:items-center lg:justify-between mb-8">
        <div className="flex items-center space-x-4">
          {/* Profile Picture */}
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300 flex-shrink-0">
            {user.photo_url ? (
              <img
                src={getImageUrl(user.photo_url)}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Partner profile image load error:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-100">
                <User className="w-8 h-8 text-primary-600" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Welcome, {user.name}</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Manage your clients and track their progress</p>
          </div>
        </div>
        {user.partner_id && (
          <div className="ml-6">
            <div className="card bg-primary-50 dark:bg-dark-bg-secondary border-2 border-primary-200 dark:border-dark-primary-700 mb-2">
              <div>
                <p className="text-xs text-gray-600 dark:text-dark-text-tertiary mb-1">Your Partner ID</p>
                <div className="flex items-center space-x-2">
                  <p className="text-xl font-bold text-primary-700 tracking-wider">
                    {user.partner_id}
                  </p>
                  <button
                    onClick={handleCopyPartnerId}
                    className="p-1.5 hover:bg-primary-100 rounded-lg transition-colors"
                    title="Copy Partner ID"
                  >
                    {copiedPartnerId ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-primary-600" />
                    )}
                  </button>
                </div>
                {copiedPartnerId && (
                  <p className="text-xs text-green-600 mt-1">Copied!</p>
                )}
              </div>
            </div>
            <button
              onClick={handleCopySignupUrl}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              {copiedSignupUrl ? (
                <>
                  <Check className="h-4 w-4" />
                  URL Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Get Signup URL
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Welcome Section - Mobile only (hidden on desktop) */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center space-x-3">
          {/* Profile Picture */}
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300 flex-shrink-0">
            {user.photo_url ? (
              <img
                src={getImageUrl(user.photo_url)}
                alt={user.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  console.error('Partner mobile profile image load error:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary-100">
                <User className="w-7 h-7 text-primary-600" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">Welcome, {user.name}</h1>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Manage your clients</p>
          </div>
        </div>
      </div>

      {/* Partner ID Section - Tablet only (mobile shows in hamburger, desktop shows above) */}
      {user.partner_id && (
        <div className="hidden sm:block lg:hidden mb-6">
          <div className="card bg-primary-50 dark:bg-dark-bg-secondary border-2 border-primary-200 dark:border-dark-primary-700 mb-2">
            <div>
              <p className="text-xs text-gray-600 dark:text-dark-text-tertiary mb-1">Your Partner ID</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-primary-700 tracking-wider">
                  {user.partner_id}
                </p>
                <button
                  onClick={handleCopyPartnerId}
                  className="p-1.5 hover:bg-primary-100 rounded-lg transition-colors"
                  title="Copy Partner ID"
                >
                  {copiedPartnerId ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-primary-600" />
                  )}
                </button>
              </div>
              {copiedPartnerId && (
                <p className="text-xs text-green-600 mt-1">Copied!</p>
              )}
            </div>
          </div>
          <button
            onClick={handleCopySignupUrl}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
          >
            {copiedSignupUrl ? (
              <>
                <Check className="h-4 w-4" />
                URL Copied!
              </>
            ) : (
              <>
                <LinkIcon className="h-4 w-4" />
                Get Signup URL
              </>
            )}
          </button>
        </div>
      )}

      {/* Scrollable Tabs - Mobile & Tablet */}
      <div className="lg:hidden border-b border-gray-200 dark:border-dark-border mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="border-b border-gray-200 dark:border-dark-border py-3 px-4 -mx-4 sm:mx-0 sm:px-0 flex items-center justify-between">
          <DarkModeToggle variant="button" showLabel />
          {/* Show button next to Dark Mode only on mobile (below sm), not on tablet */}
          {user.partner_id && (
            <button
              onClick={handleCopySignupUrl}
              className="sm:hidden flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              {copiedSignupUrl ? (
                <>
                  <Check className="h-4 w-4" />
                  URL Copied!
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  Get Signup URL
                </>
              )}
            </button>
          )}
        </div>
        <nav className="flex space-x-6 overflow-x-auto scrollbar-thin scroll-smooth pb-px">
          <button
            onClick={() => setActiveTab('appointments')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'appointments'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <CalendarDays className="h-5 w-5" />
            <span className="text-xs">Appointments</span>
          </button>
          <button
            onClick={() => setActiveTab('clients')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'clients'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Clients</span>
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'availability'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <CalendarClock className="h-5 w-5" />
            <span className="text-xs">Availability</span>
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'charts'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs">Charts</span>
          </button>
          {videoSessionsEnabled && (
            <button
              onClick={() => setActiveTab('video')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
                activeTab === 'video'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
              }`}
            >
              <Video className="h-5 w-5" />
              <span className="text-xs">Video</span>
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('questionnaires');
              setQuestionnaireView('list');
            }}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'questionnaires'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <ClipboardList className="h-5 w-5" />
            <span className="text-xs">Questionnaires</span>
          </button>
          {user?.can_post_blogs && (
            <button
              onClick={() => setActiveTab('blogs')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
                activeTab === 'blogs'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">Blogs</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'calendar'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <Calendar className="h-5 w-5" />
            <span className="text-xs">Calendar</span>
          </button>
          {user?.organization?.theraptrack_controlled && (
            <button
              onClick={() => setActiveTab('earnings')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
                activeTab === 'earnings'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
              }`}
            >
              <CurrencyIcon className="h-5 w-5" />
              <span className="text-xs">Earnings</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'settings'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-xs">Settings</span>
          </button>
        </nav>
      </div>

      {/* Desktop Tabs */}
      <div className="hidden lg:block border-b border-gray-200 mb-6">
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
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <Users className="inline h-5 w-5 mr-2" />
            Clients
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'availability'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <CalendarClock className="inline h-5 w-5 mr-2" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'charts'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <BarChart3 className="inline h-5 w-5 mr-2" />
            Charts
          </button>
          {videoSessionsEnabled && (
            <button
              onClick={() => setActiveTab('video')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'video'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
              }`}
            >
              <Video className="inline h-5 w-5 mr-2" />
              Video
            </button>
          )}
          <button
            onClick={() => {
              setActiveTab('questionnaires');
              setQuestionnaireView('list');
            }}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questionnaires'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <ClipboardList className="inline h-5 w-5 mr-2" />
            Questionnaires
          </button>
          {user?.can_post_blogs && (
            <button
              onClick={() => setActiveTab('blogs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'blogs'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
              }`}
            >
              <FileText className="inline h-5 w-5 mr-2" />
              Blogs
            </button>
          )}
          <button
            onClick={() => setActiveTab('calendar')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'calendar'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <Calendar className="inline h-5 w-5 mr-2" />
            Calendar
          </button>
          {user?.organization?.theraptrack_controlled && (
            <button
              onClick={() => setActiveTab('earnings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'earnings'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
              }`}
            >
              <CurrencyIcon className="inline h-5 w-5 mr-2" />
              Earnings
            </button>
          )}
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <Settings className="inline h-5 w-5 mr-2" />
            Settings
          </button>
        </nav>
      </div>

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <AppointmentsTab
          partnerId={user.id}
          videoSessionsEnabled={videoSessionsEnabled}
          onNavigateToSession={handleNavigateToSession}
        />
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowCreatePatientModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              <UserPlus className="h-5 w-5" />
              Create New Client
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Mobile Dropdown - Show only on mobile/tablet */}
        <div className="lg:hidden mb-4">
          {users.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
              <Users className="h-10 w-10 mx-auto mb-3 text-gray-400 dark:text-dark-text-tertiary" />
              <p className="text-sm">No clients assigned yet</p>
            </div>
          ) : (
            <div className="relative">
              <select
                value={selectedUser?.id || ''}
                onChange={(e) => handleUserSelect(parseInt(e.target.value))}
                className="w-full px-4 py-3 text-base font-medium border-2 border-primary-600 rounded-lg appearance-none bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                style={{ paddingRight: '2.5rem' }}
              >
                <option value="">Select a Client</option>
                {users.map((client) => (
                  <option key={client.id} value={client.id} className="py-2">
                    {client.name} - {client.sex}, {client.age} yrs
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-600 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Desktop Users List - Hidden on mobile/tablet */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="card lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold flex items-center text-gray-900 dark:text-dark-text-primary">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Your Clients ({users.length})
              </h2>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
                <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-400 dark:text-dark-text-tertiary" />
                <p className="text-sm sm:text-base">No clients assigned yet</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ minHeight: '240px', maxHeight: '500px' }}>
                {users.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => handleUserSelect(client.id)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedUser?.id === client.id
                        ? 'border-primary-600 bg-primary-50 dark:bg-dark-bg-secondary'
                        : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-base text-gray-900 dark:text-dark-text-primary truncate">{client.name}</p>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{client.sex}, {client.age} years</p>
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
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-dark-text-primary truncate">{selectedUser.name}</h2>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary space-y-1 sm:space-y-0">
                      <span>{selectedUser.sex}, {selectedUser.age} years</span>
                      {selectedUser.email && <span className="truncate">{selectedUser.email}</span>}
                      {selectedUser.contact && (() => {
                        // Format phone number for display - ensure full number is shown with proper formatting
                        const contact = selectedUser.contact || '';
                        // If contact starts with +, it already has country code, display as is
                        // Otherwise, ensure we're displaying the full number
                        if (contact.startsWith('+')) {
                          return <span>{contact}</span>;
                        } else {
                          // If no country code, display as is (shouldn't happen but handle it)
                          return <span>{contact}</span>;
                        }
                      })()}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEditClientModal(true)}
                    className="p-2 text-primary-600 dark:text-dark-primary-500 hover:bg-primary-50 dark:hover:bg-dark-bg-secondary rounded-lg transition-colors"
                    title="Edit Client Details"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-6 overflow-x-auto scrollbar-thin scroll-smooth pb-px">
                  <button
                    onClick={() => setClientDetailTab('sessionDetails')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      clientDetailTab === 'sessionDetails'
                        ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                    }`}
                  >
                    <ClipboardList className="h-4 w-4" />
                    <span>Session Details</span>
                  </button>
                  <button
                    onClick={() => setClientDetailTab('caseHistory')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      clientDetailTab === 'caseHistory'
                        ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Case History</span>
                  </button>
                  <button
                    onClick={() => setClientDetailTab('mentalStatus')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      clientDetailTab === 'mentalStatus'
                        ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                    }`}
                  >
                    <Brain className="h-4 w-4" />
                    <span>Mental Status Examination</span>
                  </button>
                  <button
                    onClick={() => {
                      setClientDetailTab('sessionNotes');
                      setEditingNoteSessionId(null);
                    }}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      clientDetailTab === 'sessionNotes'
                        ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                    }`}
                  >
                    <StickyNote className="h-4 w-4" />
                    <span>Session Notes</span>
                  </button>
                  <button
                    onClick={() => {
                      setClientDetailTab('reports');
                      setReportSessionId(null);
                    }}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      clientDetailTab === 'reports'
                        ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Reports</span>
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-6">
                {/* Case History Tab */}
                {clientDetailTab === 'caseHistory' && selectedUser && (
                  <CaseHistoryForm key={selectedUser.id} userId={selectedUser.id} partnerId={user.id} userName={selectedUser.name} />
                )}

                {/* Mental Status Examination & BO Tab */}
                {clientDetailTab === 'mentalStatus' && selectedUser && (
                  <MentalStatusExaminationForm key={selectedUser.id} userId={selectedUser.id} partnerId={user.id} userName={selectedUser.name} />
                )}

                {/* General Notes Tab */}
                {clientDetailTab === 'sessionDetails' && (
                  <div className="space-y-6">
                    {/* Therapy Sessions */}
                    <SessionsSection
                      ref={sessionsSectionRef}
                      partnerId={user.id}
                      userId={selectedUser.id}
                      userName={selectedUser.name}
                      onNavigateToNotes={handleNavigateToNotes}
                      onGenerateReport={handleGenerateReport}
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
                )}

                {/* Session Notes Tab */}
                {clientDetailTab === 'sessionNotes' && selectedUser && (
                  <SessionNotesTab
                    partnerId={user.id}
                    userId={selectedUser.id}
                    userName={selectedUser.name}
                    initialEditSessionId={editingNoteSessionId}
                    onNoteChanged={handleNoteChanged}
                  />
                )}

                {/* Reports Tab */}
                {clientDetailTab === 'reports' && selectedUser && (
                  <ClientReportsTab
                    partnerId={user.id}
                    userId={selectedUser.id}
                    userName={selectedUser.name}
                    sessionId={reportSessionId}
                    onReportCreated={() => {
                      setReportSessionId(null);
                    }}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="card text-center py-16">
              <Users className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
              <p className="text-gray-600 dark:text-dark-text-secondary text-lg">Select a client to view their progress</p>
            </div>
          )}
        </div>
          </div>
        </div>
      )}

      {/* Availability Tab */}
      {activeTab === 'availability' && (
        <AvailabilityTab partnerId={user.id} />
      )}

      {/* Create Patient Modal */}
      <CreatePatientModal
        isOpen={showCreatePatientModal}
        onClose={() => setShowCreatePatientModal(false)}
        partnerId={user?.partner_id}
        onSuccess={handleCreatePatientSuccess}
      />

      {/* Edit Client Modal */}
      <EditClientModal
        isOpen={showEditClientModal}
        onClose={() => setShowEditClientModal(false)}
        client={selectedUser}
        onSuccess={handleEditClientSuccess}
      />

      {/* Charts Tab */}
      {activeTab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Mobile Dropdown - Show only on mobile/tablet */}
          <div className="lg:hidden mb-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
                <Users className="h-10 w-10 mx-auto mb-3 text-gray-400 dark:text-dark-text-tertiary" />
                <p className="text-sm">No clients assigned yet</p>
              </div>
            ) : (
              <div className="relative">
                <select
                  value={selectedUser?.id || ''}
                  onChange={(e) => handleUserSelect(parseInt(e.target.value))}
                  className="w-full px-4 py-3 text-base font-medium border-2 border-primary-600 rounded-lg appearance-none bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                  style={{ paddingRight: '2.5rem' }}
                >
                  <option value="">Select a Client</option>
                  {users.map((client) => (
                    <option key={client.id} value={client.id} className="py-2">
                      {client.name} - {client.sex}, {client.age} yrs
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-600 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Desktop Users List - Hidden on mobile/tablet */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="card lg:sticky lg:top-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base sm:text-lg font-semibold flex items-center text-gray-900 dark:text-dark-text-primary">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Your Clients ({users.length})
                </h2>
              </div>

              {users.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 text-gray-400 dark:text-dark-text-tertiary" />
                  <p className="text-sm sm:text-base">No clients assigned yet</p>
                </div>
              ) : (
                <div className="space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100" style={{ minHeight: '240px', maxHeight: '500px' }}>
                  {users.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => handleUserSelect(client.id)}
                      className={`w-full text-left p-3 rounded-lg border-2 transition ${
                        selectedUser?.id === client.id
                          ? 'border-primary-600 bg-primary-50 dark:bg-dark-bg-secondary'
                          : 'border-gray-200 dark:border-dark-border hover:border-gray-300 dark:hover:border-dark-border'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-base text-gray-900 dark:text-dark-text-primary truncate">{client.name}</p>
                          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{client.sex}, {client.age} years</p>
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
                <BarChart3 className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
                <p className="text-gray-600 dark:text-dark-text-secondary text-lg">Select a client to create and send questionnaire comparison charts</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Video Tab */}
      {activeTab === 'video' && videoSessionsEnabled && (
        <VideoSessionsTab
          partnerId={user.id}
          users={users}
        />
      )}

      {/* Questionnaires Tab */}
      {activeTab === 'questionnaires' && (
        <div className="space-y-8">
          {questionnaireView === 'list' && (
            <>
              {/* Questionnaires Section */}
              <div>
                <QuestionnaireList
                  ownerType="partner"
                  ownerId={user.id}
                  onCreateNew={() => {
                    setQuestionnaireView('create');
                    setEditingQuestionnaireId(null);
                  }}
                  onEdit={(questionnaireId) => {
                    setQuestionnaireView('edit');
                    setEditingQuestionnaireId(questionnaireId);
                  }}
                  onCopy={() => {
                    // Reload is handled by QuestionnaireList
                  }}
                  onAssign={(questionnaire) => {
                    setAssigningQuestionnaire(questionnaire);
                  }}
                />
              </div>

              {/* Reports Section */}
              <div className="border-t-4 border-gray-200 pt-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Reports</h2>
                  <p className="text-gray-600 dark:text-dark-text-secondary">Manage default report template settings</p>
                </div>
                <PartnerReportsTab />
              </div>
            </>
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

      {/* Blogs Tab */}
      {activeTab === 'blogs' && user?.can_post_blogs && (
        <BlogManagement />
      )}

      {/* Calendar Tab */}
      {activeTab === 'calendar' && (
        <PartnerCalendar
          partnerId={user.id}
          users={users}
        />
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && user?.organization?.theraptrack_controlled && (
        <EarningsTab />
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <PartnerSettings />
      )}
    </div>
  );
};

export default PartnerDashboard;

