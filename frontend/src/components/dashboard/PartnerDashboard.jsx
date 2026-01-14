import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { partnerAPI, chartAPI, questionnaireAPI, googleCalendarAPI, authAPI } from '../../services/api';
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
import PlanOfAssessmentForm from '../planofassessment/PlanOfAssessmentForm';
import PartnerReportsTab from '../reports/PartnerReportsTab';
import ClientReportsTab from '../reports/ClientReportsTab';
import AvailabilityTab from '../availability/AvailabilityTab';
import EarningsTab from '../earnings/EarningsTab';
import BlogManagement from '../blogs/BlogManagement';
import SupportDashboard from '../support/SupportDashboard';
import ReviewsTab from '../reviews/ReviewsTab';
import { Users, Activity, User, Calendar, BarChart3, CheckCircle, Video, ClipboardList, CalendarDays, ChevronDown, Copy, Check, Settings, FileText, Brain, UserPlus, Share, CalendarClock, Edit, Headphones, Sun, Calendar as CalendarIcon, AlertCircle, Link2, Unlink, Star, KeyRound } from 'lucide-react';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sentCharts, setSentCharts] = useState([]);

  // Free Plan users and ended trial users (who fall back to Free Plan) can access dashboard but will see subscription modal

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
  const [showCreatePatientModal, setShowCreatePatientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [copiedSignupUrl, setCopiedSignupUrl] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copiedProfileUrl, setCopiedProfileUrl] = useState(false);
  const [showProfileShareMenu, setShowProfileShareMenu] = useState(false);
  const [setupLink, setSetupLink] = useState(null);
  const [setupLinkLoading, setSetupLinkLoading] = useState(false);
  const [copiedSetupLink, setCopiedSetupLink] = useState(false);

  // Questionnaire state
  const [questionnaireView, setQuestionnaireView] = useState('list'); // 'list', 'create', 'edit'
  const [editingQuestionnaireId, setEditingQuestionnaireId] = useState(null);
  const [assigningQuestionnaire, setAssigningQuestionnaire] = useState(null);

  // Client detail tabs state
  const [clientDetailTab, setClientDetailTab] = useState('sessionDetails');
  const [reportSessionId, setReportSessionId] = useState(null);
  const sessionsSectionRef = useRef(null);

  // Google Calendar state
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [loadingCalendarStatus, setLoadingCalendarStatus] = useState(true);

  useEffect(() => {
    loadPartnerUsers();
    checkGoogleCalendarStatus();
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
      
      // Reset setup link when selecting different user
      setSetupLink(null);
      setCopiedSetupLink(false);

      // Load charts sent to this user
      const chartsResponse = await chartAPI.getPartnerUserCharts(user.id, selectedUserId);
      setSentCharts(chartsResponse.data.charts || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setLoading(false);
    }
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

  const handleShareSignupUrl = async () => {
    if (!user?.partner_id) return;

    const baseUrl = window.location.origin;
    const signupUrl = `${baseUrl}/signup?therapist_id=${user.partner_id}`;
    const shareText = `Sign up for therapy sessions with me: ${signupUrl}`;

    // Check if Web Share API is available (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Signup & Appointment Link',
          text: shareText,
          url: signupUrl
        });
        return;
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fall back to share menu on error
        } else {
          // User cancelled, don't show menu
          return;
        }
      }
    }

    // Desktop: Show share menu
    setShowShareMenu(true);
  };

  const handleShareViaWhatsApp = () => {
    const baseUrl = window.location.origin;
    const signupUrl = `${baseUrl}/signup?therapist_id=${user.partner_id}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Sign up for therapy sessions: ${signupUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleShareViaEmail = () => {
    const baseUrl = window.location.origin;
    const signupUrl = `${baseUrl}/signup?therapist_id=${user.partner_id}`;
    const subject = encodeURIComponent('Signup & Appointment Link');
    const body = encodeURIComponent(`Sign up for therapy sessions with me: ${signupUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowShareMenu(false);
  };

  const handleCopyLink = async () => {
    const baseUrl = window.location.origin;
    const signupUrl = `${baseUrl}/signup?therapist_id=${user.partner_id}`;
    try {
      await navigator.clipboard.writeText(signupUrl);
      setCopiedSignupUrl(true);
      setTimeout(() => setCopiedSignupUrl(false), 2000);
      setShowShareMenu(false);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = signupUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedSignupUrl(true);
        setTimeout(() => setCopiedSignupUrl(false), 2000);
        setShowShareMenu(false);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        alert('Please copy this link manually: ' + signupUrl);
      }
      document.body.removeChild(textArea);
    }
  };

  const handleShareProfileUrl = async () => {
    if (!user.partner_id) return;

    const baseUrl = window.location.origin;
    const profileUrl = `${baseUrl}/therapist/${user.partner_id}`;
    const shareText = `Check my availability and book an appointment: ${profileUrl}`;

    // Check if Web Share API is available (mobile browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Share Availability-Public Link',
          text: shareText,
          url: profileUrl
        });
        return;
      } catch (err) {
        // User cancelled or error occurred
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fall back to share menu on error
        } else {
          // User cancelled, don't show menu
          return;
        }
      }
    }

    // Desktop: Show share menu
    setShowProfileShareMenu(true);
  };

  const handleShareProfileViaWhatsApp = () => {
    const baseUrl = window.location.origin;
    const profileUrl = `${baseUrl}/therapist/${user.partner_id}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check my availability and book an appointment: ${profileUrl}`)}`;
    window.open(whatsappUrl, '_blank');
    setShowProfileShareMenu(false);
  };

  const handleShareProfileViaEmail = () => {
    const baseUrl = window.location.origin;
    const profileUrl = `${baseUrl}/therapist/${user.partner_id}`;
    const subject = encodeURIComponent('Share Availability-Public Link');
    const body = encodeURIComponent(`Check my availability and book an appointment: ${profileUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowProfileShareMenu(false);
  };

  const handleCopyProfileLink = async () => {
    const baseUrl = window.location.origin;
    const profileUrl = `${baseUrl}/therapist/${user.partner_id}`;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopiedProfileUrl(true);
      setTimeout(() => setCopiedProfileUrl(false), 2000);
      setShowProfileShareMenu(false);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = profileUrl;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedProfileUrl(true);
        setTimeout(() => setCopiedProfileUrl(false), 2000);
        setShowProfileShareMenu(false);
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr);
        alert('Please copy this link manually: ' + profileUrl);
      }
      document.body.removeChild(textArea);
    }
  };

  const checkGoogleCalendarStatus = async () => {
    try {
      setLoadingCalendarStatus(true);
      const response = await googleCalendarAPI.getStatus();
      setGoogleCalendarStatus(response.data);
    } catch (err) {
      console.error('Failed to check Google Calendar status:', err);
      setGoogleCalendarStatus({ connected: false });
    } finally {
      setLoadingCalendarStatus(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setConnectingCalendar(true);
      const response = await googleCalendarAPI.initiateAuth();
      // Redirect to Google OAuth page
      window.location.href = response.data.authUrl;
    } catch (err) {
      console.error('Failed to initiate Google Calendar auth:', err);
      alert('Failed to connect Google Calendar. Please try again.');
      setConnectingCalendar(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar? Appointments will no longer sync automatically.')) {
      return;
    }

    try {
      await googleCalendarAPI.disconnect();
      setGoogleCalendarStatus({ connected: false });
      alert('Google Calendar disconnected successfully.');
    } catch (err) {
      console.error('Failed to disconnect Google Calendar:', err);
      alert('Failed to disconnect Google Calendar. Please try again.');
    }
  };

  const toggleSync = async (enabled) => {
    try {
      await googleCalendarAPI.toggleSync(enabled);
      setGoogleCalendarStatus(prev => ({ ...prev, syncEnabled: enabled }));
    } catch (err) {
      console.error('Failed to toggle sync:', err);
      alert('Failed to update sync settings. Please try again.');
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
      <div className="hidden lg:flex lg:items-start lg:justify-between mb-8">
        <div className="flex items-start space-x-4">
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
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{user.name}</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">{user.qualification || 'Manage your clients and track their progress'}</p>
            
            {/* Appearance Settings */}
            <div className="mt-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border w-fit">
                <div className="flex items-center space-x-2">
                  <Sun className="h-4 w-4 text-primary-600 dark:text-dark-primary-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">Dark Mode</span>
                </div>
                <DarkModeToggle variant="switch" />
              </div>
            </div>
          </div>
        </div>
        {user.partner_id && (
          <div className="ml-6 flex flex-col items-end gap-3">
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
              Your Therapist ID: <span className="font-semibold text-gray-900 dark:text-dark-text-primary">{user.partner_id}</span>
            </p>
            
            {/* Google Calendar Integration */}
            <div className="w-full mt-2">
              {loadingCalendarStatus ? (
                <div className="flex items-center justify-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                </div>
              ) : googleCalendarStatus?.connected ? (
                <div className="space-y-2">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                        <span className="text-xs font-medium text-green-700 dark:text-green-400">Calendar Connected</span>
                      </div>
                      <button
                        onClick={disconnectGoogleCalendar}
                        className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center space-x-1"
                      >
                        <Unlink className="h-3 w-3" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-dark-text-primary">Sync Enabled</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={googleCalendarStatus.syncEnabled}
                        onChange={(e) => toggleSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectGoogleCalendar}
                  disabled={connectingCalendar}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {connectingCalendar ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="h-4 w-4" />
                      <span>Connect Google Calendar</span>
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Share Profile Link */}
            {user.partner_id && (
              <div className="w-full mt-2">
                <button
                  onClick={handleShareProfileUrl}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  <Link2 className="h-4 w-4" />
                  Share Availability-Public Link
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Welcome Section - Mobile only (hidden on desktop) */}
      <div className="lg:hidden mb-2">
        <div className="flex items-start space-x-3 mb-2">
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
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary">{user.qualification || 'Manage your clients'}</p>
          </div>
        </div>
        
        {/* GCal, Dark Mode Toggle, and Share Availability-Public Link - Mobile only, same row */}
        {user.partner_id && (
          <div className="sm:hidden flex items-center justify-end gap-1.5 flex-nowrap overflow-x-auto">
            {/* Google Calendar Connect Button */}
            {loadingCalendarStatus ? (
              <div className="flex items-center justify-center py-1 px-2 flex-shrink-0">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
              </div>
            ) : googleCalendarStatus?.connected ? (
              <button
                onClick={disconnectGoogleCalendar}
                className="flex items-center gap-1 px-2 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 whitespace-nowrap flex-shrink-0"
                title="Disconnect Google Calendar"
              >
                <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span>GCal</span>
              </button>
            ) : (
              <button
                onClick={connectGoogleCalendar}
                disabled={connectingCalendar}
                className="flex items-center gap-1 px-2 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
              >
                {connectingCalendar ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                    <span>Connecting...</span>
                  </>
                ) : (
                  <>
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>Connect GCal</span>
                  </>
                )}
              </button>
            )}
            
            {/* Dark Mode Toggle */}
            <div className="flex-shrink-0">
              <DarkModeToggle variant="button" showLabel />
            </div>
            
            {/* Share Availability-Public Link Button */}
            <button
              onClick={handleShareProfileUrl}
              className="flex items-center gap-1 px-2 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 whitespace-nowrap flex-shrink-0"
            >
              <Link2 className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Share Availability</span>
            </button>
          </div>
        )}
      </div>

      {/* Partner ID Section - Tablet only (mobile shows in hamburger, desktop shows above) */}
      {user.partner_id && (
        <div className="hidden sm:block lg:hidden mb-6">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
            Your Therapist ID: <span className="font-semibold text-gray-900 dark:text-dark-text-primary">{user.partner_id}</span>
          </p>
          
          {/* Google Calendar Integration */}
          {loadingCalendarStatus ? (
            <div className="flex items-center justify-center py-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
            </div>
          ) : googleCalendarStatus?.connected ? (
            <div className="space-y-2">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Calendar Connected</span>
                  </div>
                  <button
                    onClick={disconnectGoogleCalendar}
                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center space-x-1"
                  >
                    <Unlink className="h-3 w-3" />
                    <span>Disconnect</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border">
                <div>
                  <p className="text-xs font-medium text-gray-700 dark:text-dark-text-primary">Sync Enabled</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={googleCalendarStatus.syncEnabled}
                    onChange={(e) => toggleSync(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          ) : (
            <button
              onClick={connectGoogleCalendar}
              disabled={connectingCalendar}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {connectingCalendar ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <CalendarIcon className="h-4 w-4" />
                  <span>Connect Google Calendar</span>
                </>
              )}
            </button>
          )}
          
          {/* Share Profile Link - Tablet */}
          {user.partner_id && (
            <div className="w-full mt-2">
              <button
                onClick={handleShareProfileUrl}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                <Link2 className="h-4 w-4" />
                Share Availability-Public Link
              </button>
            </div>
          )}
        </div>
      )}

      {/* Scrollable Tabs - Mobile & Tablet */}
      <div className="lg:hidden border-b border-gray-200 dark:border-dark-border mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex space-x-6 overflow-x-auto scrollbar-thin scroll-smooth pb-px pt-1">
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
            onClick={() => setActiveTab('clients')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'clients'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <Users className="h-5 w-5" />
            <span className="text-xs">Client Details</span>
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
              <span className="text-xs">Events</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'reviews'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <Star className="h-5 w-5" />
            <span className="text-xs">Reviews</span>
          </button>
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
          {user?.query_resolver && (
            <button
              onClick={() => setActiveTab('support-dashboard')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
                activeTab === 'support-dashboard'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
              }`}
            >
              <Headphones className="h-5 w-5" />
              <span className="text-xs">Support</span>
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
            <span className="text-xs">Edit Profile</span>
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
            onClick={() => setActiveTab('clients')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'clients'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <Users className="inline h-5 w-5 mr-2" />
            Client Details
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
              Events
            </button>
          )}
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reviews'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
            }`}
          >
            <Star className="inline h-5 w-5 mr-2" />
            Reviews
          </button>
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
          {user?.query_resolver && (
            <button
              onClick={() => setActiveTab('support-dashboard')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'support-dashboard'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
              }`}
            >
              <Headphones className="inline h-5 w-5 mr-2" />
              Support
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
            Edit Profile
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              onClick={() => setShowCreatePatientModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              title="For adding existing clients who booked manually, not through the app."
            >
              <UserPlus className="h-5 w-5" />
              Create New Client
            </button>
            {user.partner_id && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <button
                  onClick={handleShareSignupUrl}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                >
                  {copiedSignupUrl ? (
                    <>
                      <Check className="h-4 w-4" />
                      URL Copied!
                    </>
                  ) : (
                    <>
                      <Share className="h-4 w-4" />
                      Share Signup & Appointment Link
                    </>
                  )}
                </button>
                <span className="text-sm text-gray-600 dark:text-dark-text-secondary text-center sm:text-left">
                  Send to known clients for sign up
                </span>
              </div>
            )}
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
                    {client.name} {!client.has_auth_credentials ? '⚠️' : ''} - {client.sex}, {client.age} yrs
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-base text-gray-900 dark:text-dark-text-primary truncate">{client.name}</p>
                          {!client.has_auth_credentials && (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 flex-shrink-0"
                              title="Client needs to set up account"
                            >
                              <KeyRound className="h-3 w-3 mr-1" />
                              Setup Required
                            </span>
                          )}
                        </div>
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

              {/* Account Setup Link Section */}
              {selectedUser && !selectedUser.has_auth_credentials && (
                <div className="card bg-yellow-50 dark:bg-dark-bg-secondary border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-300">
                        Account Setup Required
                      </h3>
                    </div>
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-4">
                    This client needs to set up their account password. Generate a setup link to share with them.
                  </p>
                  {setupLinkLoading ? (
                    <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-300">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      Generating link...
                    </div>
                  ) : setupLink ? (
                    <div className="space-y-3">
                      <div className="bg-white dark:bg-dark-bg-primary rounded-md p-3 border border-yellow-300 dark:border-yellow-700">
                        <label className="block text-xs font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Account Setup Link
                        </label>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs text-gray-900 dark:text-dark-text-primary break-all">
                            {setupLink}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(setupLink);
                              setCopiedSetupLink(true);
                              setTimeout(() => setCopiedSetupLink(false), 2000);
                            }}
                            className="flex-shrink-0 p-2 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-100 dark:hover:bg-yellow-900 rounded-md transition-colors"
                            title="Copy link"
                          >
                            {copiedSetupLink ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <Copy className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setSetupLinkLoading(true);
                          try {
                            const response = await authAPI.generateSetupLink(selectedUser.id);
                            setSetupLink(response.data.url);
                          } catch (err) {
                            console.error('Failed to generate setup link:', err);
                            alert(err.response?.data?.error || 'Failed to generate setup link');
                          } finally {
                            setSetupLinkLoading(false);
                          }
                        }}
                        className="text-sm text-yellow-700 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 underline"
                      >
                        Generate New Link
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        setSetupLinkLoading(true);
                        try {
                          const response = await authAPI.generateSetupLink(selectedUser.id);
                          setSetupLink(response.data.url);
                        } catch (err) {
                          console.error('Failed to generate setup link:', err);
                          alert(err.response?.data?.error || 'Failed to generate setup link');
                        } finally {
                          setSetupLinkLoading(false);
                        }
                      }}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                    >
                      <KeyRound className="h-4 w-4" />
                      Generate Setup Link
                    </button>
                  )}
                </div>
              )}

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
                    <span>MSE</span>
                  </button>
                  <button
                    onClick={() => setClientDetailTab('planOfAssessment')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      clientDetailTab === 'planOfAssessment'
                        ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <span>Plan of Assessment</span>
                  </button>
                  <button
                    onClick={() => setClientDetailTab('charts')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
                      clientDetailTab === 'charts'
                        ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Charts</span>
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

                {/* MSE & BO Tab */}
                {clientDetailTab === 'mentalStatus' && selectedUser && (
                  <MentalStatusExaminationForm key={selectedUser.id} userId={selectedUser.id} partnerId={user.id} userName={selectedUser.name} />
                )}

                {/* Plan of Assessment Tab */}
                {clientDetailTab === 'planOfAssessment' && selectedUser && (
                  <PlanOfAssessmentForm key={selectedUser.id} userId={selectedUser.id} partnerId={user.id} userName={selectedUser.name} />
                )}

                {/* Charts Tab */}
                {clientDetailTab === 'charts' && selectedUser && (
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
                      onGenerateReport={handleGenerateReport}
                      onNoteChanged={handleNoteChanged}
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

                {/* Reports Tab */}
                {clientDetailTab === 'reports' && selectedUser && (
                  <div className="space-y-8">
                    {/* Client Reports Section */}
                    <ClientReportsTab
                      partnerId={user.id}
                      userId={selectedUser.id}
                      userName={selectedUser.name}
                      sessionId={reportSessionId}
                      onReportCreated={() => {
                        setReportSessionId(null);
                      }}
                    />
                    
                    {/* Report Template Settings Section */}
                    <div className="border-t-4 border-gray-200 dark:border-dark-border pt-8">
                      <div className="mb-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Report Template Settings</h2>
                        <p className="text-gray-600 dark:text-dark-text-secondary">Manage default report template settings</p>
                      </div>
                      <PartnerReportsTab />
                    </div>
                  </div>
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

      {/* Reviews Tab */}
      {activeTab === 'reviews' && (
        <ReviewsTab />
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

      {/* Support Dashboard Tab (for query_resolver partners) */}
      {activeTab === 'support-dashboard' && user?.query_resolver && (
        <div className="h-[calc(100vh-200px)]">
          <SupportDashboard />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <PartnerSettings />
      )}

      {/* Share Menu Modal */}
      {showShareMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowShareMenu(false)}
        >
          <div 
            className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-sm w-full p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
              Share Link
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleShareViaWhatsApp}
                className="w-full flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-gray-900 dark:text-dark-text-primary font-medium">Share via WhatsApp</span>
              </button>
              <button
                onClick={handleShareViaEmail}
                className="w-full flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-900 dark:text-dark-text-primary font-medium">Share via Email</span>
              </button>
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Copy className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-dark-text-primary font-medium">Copy Link</span>
              </button>
            </div>
            <button
              onClick={() => setShowShareMenu(false)}
              className="mt-4 w-full px-4 py-2 text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Share Profile Menu Modal */}
      {showProfileShareMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" 
          onClick={() => setShowProfileShareMenu(false)}
        >
          <div 
            className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-sm w-full p-6" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
              Share Availability Link
            </h3>
            <div className="space-y-3">
              <button
                onClick={handleShareProfileViaWhatsApp}
                className="w-full flex items-center space-x-3 p-3 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-gray-900 dark:text-dark-text-primary font-medium">Share via WhatsApp</span>
              </button>
              <button
                onClick={handleShareProfileViaEmail}
                className="w-full flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-gray-900 dark:text-dark-text-primary font-medium">Share via Email</span>
              </button>
              <button
                onClick={handleCopyProfileLink}
                className="w-full flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                <Copy className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                <span className="text-gray-900 dark:text-dark-text-primary font-medium">Copy Link</span>
              </button>
            </div>
            <button
              onClick={() => setShowProfileShareMenu(false)}
              className="mt-4 w-full px-4 py-2 text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerDashboard;

