import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { appointmentAPI, chartAPI, videoSessionAPI, questionnaireAPI, userAPI, generatedReportAPI, eventAPI, googleCalendarAPI } from '../../services/api';
import SharedChartViewer from '../charts/SharedChartViewer';
import VideoSessionJoin from '../video/VideoSessionJoin';
import UserQuestionnaireView from '../questionnaires/UserQuestionnaireView';
import QuestionnaireChart from '../questionnaires/QuestionnaireChart';
import UserReportsTab from '../reports/UserReportsTab';
import ClientAvailabilityTab from '../availability/ClientAvailabilityTab';
import TherapistProfileTab from '../profile/TherapistProfileTab';
import UserSettings from '../user/UserSettings';
import ClientEventsTab from '../events/ClientEventsTab';
import { Activity, Calendar, BarChart3, Video, Clock, User as UserIcon, FileText, FileCheck, CalendarClock, Settings, CalendarDays, UserPlus, CheckCircle, Calendar as CalendarIcon } from 'lucide-react';
import { canJoinSession, formatTimeUntilSession } from '../../utils/jitsiHelper';
import { format } from 'date-fns';
import DarkModeToggle from '../common/DarkModeToggle';

const UserDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [sharedCharts, setSharedCharts] = useState([]);
  const [videoSessions, setVideoSessions] = useState([]);
  const [selectedVideoSession, setSelectedVideoSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('availability');
  const [questionnaireAssignments, setQuestionnaireAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [viewingQuestionnaireChart, setViewingQuestionnaireChart] = useState(null);
  const [videoSessionsEnabled, setVideoSessionsEnabled] = useState(false);
  const [latestSharedChart, setLatestSharedChart] = useState(null);
  const [reportsCount, setReportsCount] = useState(0);
  const [partners, setPartners] = useState([]);
  const [hasEventsTab, setHasEventsTab] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const [showLinkTherapistModal, setShowLinkTherapistModal] = useState(false);
  const [linkTherapistPartnerId, setLinkTherapistPartnerId] = useState('');
  const [linkTherapistError, setLinkTherapistError] = useState('');
  const [linkTherapistLoading, setLinkTherapistLoading] = useState(false);
  
  // Google Calendar state
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [loadingCalendarStatus, setLoadingCalendarStatus] = useState(true);

  // Format date and time in user's local timezone to match therapist dashboard
  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Initialize selected partner from localStorage or default to first partner
  useEffect(() => {
    if (partners.length > 0) {
      const savedPartnerId = localStorage.getItem(`selectedPartnerId_${user.id}`);
      const partnerId = savedPartnerId ? parseInt(savedPartnerId) : (partners[0]?.id || null);
      if (partnerId && partners.some(p => p.id === partnerId)) {
        setSelectedPartnerId(partnerId);
      } else if (partners.length > 0) {
        setSelectedPartnerId(partners[0].id);
      }
    }
  }, [partners, user.id]);

  // Load all data when partner selection changes
  useEffect(() => {
    if (selectedPartnerId !== null) {
      localStorage.setItem(`selectedPartnerId_${user.id}`, selectedPartnerId.toString());
      loadAllData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartnerId, user.id]);

  // Initial load
  useEffect(() => {
    loadPartners();
    checkGoogleCalendarStatus();
  }, [user.id]);
  
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

  const loadAllData = async () => {
    if (selectedPartnerId === null) return;
    
    await Promise.all([
      loadData(),
      loadAppointments(),
      loadQuestionnaireAssignments(),
      checkVideoSessionsAccess(),
      loadLatestChart(),
      loadReportsCount(),
    ]);
  };

  const checkForEvents = async (partnersList) => {
    try {
      const partnersToCheck = partnersList || partners;
      if (partnersToCheck.length > 0) {
        console.log('[Events] Checking events for partners:', partnersToCheck.map(p => ({ id: p.id, name: p.name })));
        const checks = await Promise.all(
          partnersToCheck.map(async (partner) => {
            try {
              const result = await eventAPI.checkPartnerHasEvents(partner.id);
              console.log(`[Events] Partner ${partner.id} (${partner.name}):`, result.data);
              return result;
            } catch (err) {
              console.error(`[Events] Error checking partner ${partner.id}:`, err);
              return { data: { hasEvents: false } };
            }
          })
        );
        const hasEvents = checks.some(check => check.data && check.data.hasEvents);
        console.log('[Events] Final result - hasEventsTab:', hasEvents);
        setHasEventsTab(hasEvents);
      } else {
        console.log('[Events] No partners found, hiding Events tab');
        setHasEventsTab(false);
      }
    } catch (err) {
      console.error('[Events] Failed to check for events:', err);
      setHasEventsTab(false);
    }
  };

  useEffect(() => {
    // Check for events after partners are loaded
    if (partners.length > 0) {
      checkForEvents(partners);
    } else {
      setHasEventsTab(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners]);

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
      const chartsResponse = await chartAPI.getUserCharts(user.id, selectedPartnerId);
      setSharedCharts(chartsResponse.data.charts || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load user data:', err);
      setLoading(false);
    }
  };

  const loadAppointments = async () => {
    try {
      const response = await appointmentAPI.getByUser(user.id, selectedPartnerId);
      setAppointments(response.data.appointments || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    }
  };

  const loadVideoSessions = async () => {
    try {
      const response = await videoSessionAPI.getByUser(user.id, selectedPartnerId);
      setVideoSessions(response.data.sessions || []);
    } catch (err) {
      console.error('Failed to load video sessions:', err);
    }
  };

  const loadQuestionnaireAssignments = async () => {
    try {
      const response = await questionnaireAPI.getUserAssignments(user.id, selectedPartnerId);
      setQuestionnaireAssignments(response.data || []);
    } catch (err) {
      console.error('Failed to load questionnaire assignments:', err);
    }
  };

  const loadLatestChart = async () => {
    try {
      const response = await chartAPI.getLatestUserChart(user.id, selectedPartnerId);
      setLatestSharedChart(response.data.chart || null);
    } catch (err) {
      console.error('Failed to load latest shared chart:', err);
    }
  };

  const loadReportsCount = async () => {
    try {
      const response = await generatedReportAPI.getUnreadCount();
      setReportsCount(response.data.count || 0);
    } catch (err) {
      console.error('Failed to load reports count:', err);
    }
  };

  const loadPartners = async () => {
    try {
      const response = await userAPI.getPartners(user.id);
      setPartners(response.data.partners || []);
      // The useEffect hook will handle checking for events when partners state updates
    } catch (err) {
      console.error('Failed to load partners:', err);
    }
  };

  const handleLinkTherapist = async () => {
    if (!linkTherapistPartnerId.trim()) {
      setLinkTherapistError('Partner ID is required');
      return;
    }

    setLinkTherapistLoading(true);
    setLinkTherapistError('');

    try {
      await userAPI.linkToTherapist(linkTherapistPartnerId.trim().toUpperCase());
      // Reload partners list
      await loadPartners();
      // Close modal and reset form
      setShowLinkTherapistModal(false);
      setLinkTherapistPartnerId('');
    } catch (err) {
      setLinkTherapistError(err.response?.data?.error || 'Failed to link to therapist');
    } finally {
      setLinkTherapistLoading(false);
    }
  };

  if (loading && partners.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Don't show dashboard if no partners and still loading
  if (partners.length === 0 && !loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="card text-center py-12">
          <UserIcon className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No Therapists Linked</h3>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
            You need to link to a therapist to get started.
          </p>
          <button
            onClick={() => setShowLinkTherapistModal(true)}
            className="btn btn-primary"
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Link to Therapist
          </button>
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Welcome, {user.name}</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Track your therapy progress</p>
          </div>
        </div>
      </div>

      {/* Mobile Welcome Section */}
      <div className="lg:hidden mb-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Welcome, {user.name}</h1>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1 text-sm">Track your therapy progress</p>
          </div>
          {/* Select Therapist - Show next to Welcome on mobile */}
          {partners.length > 1 && (
            <div className="flex-shrink-0">
              <select
                value={selectedPartnerId || ''}
                onChange={(e) => setSelectedPartnerId(parseInt(e.target.value))}
                className="input text-sm"
              >
                {partners.map((partner) => (
                  <option key={partner.id} value={partner.id}>
                    {partner.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        
        {/* Dark Mode, Link New, and Connect GCal Buttons - Mobile only */}
        <div className="flex items-center mb-3">
          <div className="flex-shrink-0">
            <DarkModeToggle variant="button" showLabel />
          </div>
          <div className="flex-1 flex items-center justify-center">
            {/* Link New Button - Show if multiple therapists */}
            {partners.length > 1 && (
              <button
                onClick={() => setShowLinkTherapistModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Link New</span>
              </button>
            )}
            {/* Link Another Therapist Button - Show if only one therapist */}
            {partners.length === 1 && (
              <button
                onClick={() => setShowLinkTherapistModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Link Another</span>
              </button>
            )}
          </div>
          <div className="flex-shrink-0">
            {/* Google Calendar Connect Button */}
            {loadingCalendarStatus ? (
              <div className="flex items-center justify-center py-1 px-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
              </div>
            ) : googleCalendarStatus?.connected ? (
              <button
                onClick={disconnectGoogleCalendar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 whitespace-nowrap"
                title="Disconnect Google Calendar"
              >
                <CheckCircle className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                <span>GCal</span>
              </button>
            ) : (
              <button
                onClick={connectGoogleCalendar}
                disabled={connectingCalendar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-xs font-medium dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 whitespace-nowrap"
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
          </div>
        </div>
      </div>

      {/* Select Therapist - Show under Welcome section for desktop */}
      {partners.length > 1 && (
        <div className="hidden lg:block mb-6 card">
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Select Therapist
            </label>
            <select
              value={selectedPartnerId || ''}
              onChange={(e) => setSelectedPartnerId(parseInt(e.target.value))}
              className="input w-auto max-w-md"
            >
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Scrollable Tabs - Mobile & Tablet */}
      <div className="lg:hidden border-b border-gray-200 dark:border-dark-border mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <nav className="flex space-x-6 overflow-x-auto scrollbar-thin scroll-smooth pb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <Activity className="h-5 w-5" />
            <span className="text-xs">Overview</span>
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
          <button
            onClick={() => setActiveTab('questionnaires')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'questionnaires'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <FileText className="h-5 w-5" />
            <span className="text-xs">Questionnaires</span>
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 relative ${
              activeTab === 'reports'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <FileCheck className="h-5 w-5" />
            <span className="text-xs">Reports</span>
            {reportsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {reportsCount}
              </span>
            )}
          </button>
          {hasEventsTab && (
            <button
              onClick={() => setActiveTab('events')}
              className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
                activeTab === 'events'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
              }`}
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs">Events</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('therapist')}
            className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col items-center gap-1 flex-shrink-0 ${
              activeTab === 'therapist'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 dark:text-dark-text-tertiary'
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span className="text-xs">Therapist</span>
          </button>
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
      <div className="hidden lg:block border-b border-gray-200 dark:border-dark-border mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('availability')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'availability'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <CalendarClock className="inline h-5 w-5 mr-2" />
            Book a Session
          </button>
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
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
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
              }`}
            >
              <Video className="inline h-5 w-5 mr-2" />
              Video
            </button>
          )}
          <button
            onClick={() => setActiveTab('charts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'charts'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <BarChart3 className="inline h-5 w-5 mr-2" />
            Charts
          </button>
          <button
            onClick={() => setActiveTab('questionnaires')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'questionnaires'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <FileText className="inline h-5 w-5 mr-2" />
            Questionnaires
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-4 px-1 border-b-2 font-medium text-sm relative ${
              activeTab === 'reports'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <FileCheck className="inline h-5 w-5 mr-2" />
            Reports
            {reportsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 dark:bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {reportsCount}
              </span>
            )}
          </button>
          {hasEventsTab && (
            <button
              onClick={() => setActiveTab('events')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'events'
                  ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
              }`}
            >
              <CalendarDays className="inline h-5 w-5 mr-2" />
              Events
            </button>
          )}
          <button
            onClick={() => setActiveTab('therapist')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'therapist'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <UserIcon className="inline h-5 w-5 mr-2" />
            Therapist Profile
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-primary-600 text-primary-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <Settings className="inline h-5 w-5 mr-2" />
            Edit Profile
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                  Upcoming Appointments
                </h3>
                <div className="space-y-3">
                  {allUpcoming.slice(0, 5).map((apt, index) => (
                    <div key={apt.isVideoSession ? `video-${apt.id}` : `apt-${apt.id}`} className="flex items-center justify-between p-3 bg-primary-50 dark:bg-dark-bg-secondary rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {apt.isVideoSession && <Video className="h-4 w-4 text-primary-700" />}
                          <p className="font-medium text-gray-900 dark:text-dark-text-primary">{apt.title}</p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                          {formatDateTime(apt.appointment_date)}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">with {apt.partner_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {allUpcoming.length > 5 && (
                  <div className="mt-4 text-center text-sm text-gray-500 dark:text-dark-text-tertiary">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-600 dark:text-dark-text-secondary" />
                  Past Appointments
                </h3>
                <div className="space-y-3">
                  {allPast.slice(0, 3).map((apt, index) => (
                    <div key={apt.isVideoSession ? `video-${apt.id}` : `apt-${apt.id}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          {apt.isVideoSession && <Video className="h-4 w-4 text-gray-600 dark:text-dark-text-secondary" />}
                          <p className="font-medium text-gray-700 dark:text-dark-text-secondary">{apt.title}</p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">
                          {formatDateTime(apt.appointment_date)}
                        </p>
                        <p className="text-sm text-gray-400 dark:text-dark-text-tertiary">with {apt.partner_name}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {allPast.length > 3 && (
                  <div className="mt-4 text-center text-sm text-gray-500 dark:text-dark-text-tertiary">
                    + {allPast.length - 3} more past appointments
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {/* Pending Questionnaires Widget */}
          {questionnaireAssignments.filter(a => a.status === 'pending').length > 0 && (
            <div className="card mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Pending Questionnaires
              </h3>
              <div className="space-y-3">
                {questionnaireAssignments
                  .filter(a => a.status === 'pending')
                  .slice(0, 3)
                  .map(assignment => (
                    <div key={assignment.id} className="p-4 bg-yellow-50 dark:bg-dark-bg-secondary border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <FileText className="h-5 w-5 text-yellow-600" />
                            <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary">{assignment.name}</h4>
                          </div>
                          {assignment.description && (
                            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2 ml-7">{assignment.description}</p>
                          )}
                          <div className="text-xs text-gray-500 dark:text-dark-text-tertiary ml-7 space-y-1">
                            <p>Assigned by: {assignment.partner_name}</p>
                            <p>Date: {format(new Date(assignment.assigned_at), 'MMM d, yyyy h:mm a')}</p>
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

          {/* Shared Reports Widget */}
          {reportsCount > 0 && (
            <div className="card mb-6 border-l-4 border-l-green-500 bg-green-50 dark:bg-dark-bg-secondary">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2 flex items-center">
                    <FileCheck className="h-5 w-5 mr-2 text-green-600" />
                    New Reports Shared with You
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-dark-text-secondary mb-3">
                    You have {reportsCount} new report{reportsCount > 1 ? 's' : ''} shared by your therapist
                  </p>
                  <button
                    onClick={() => setActiveTab('reports')}
                    className="btn btn-primary text-sm"
                  >
                    View Reports
                  </button>
                </div>
                <div className="ml-4">
                  <div className="bg-green-600 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold">
                    {reportsCount}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Latest Shared Chart Notification */}
          {latestSharedChart && (
            <div className="card mb-6 border-l-4 border-l-primary-600 bg-primary-50 dark:bg-dark-bg-secondary">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-primary-700" />
                    New Chart Shared with You
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700 dark:text-dark-text-secondary">
                    <p>
                      <span className="font-medium">{latestSharedChart.partner_name}</span> has shared a new comparison chart with you
                    </p>
                    {latestSharedChart.questionnaire_name && (
                      <p className="text-gray-600 dark:text-dark-text-secondary">
                        Questionnaire: {latestSharedChart.questionnaire_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                      Shared on {format(new Date(latestSharedChart.sent_at), 'MMM d, yyyy h:mm a')}
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
              <Activity className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">Welcome to Your Dashboard</h3>
              <p className="text-gray-600 dark:text-dark-text-secondary">
                Your upcoming appointments, questionnaires, and shared charts will appear here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Availability Tab */}
      {activeTab === 'availability' && (
        <ClientAvailabilityTab userId={user.id} partners={partners} defaultPartnerId={selectedPartnerId} />
      )}

      {activeTab === 'video' && videoSessionsEnabled && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-6">Video Sessions</h2>
          {videoSessions.length === 0 ? (
            <div className="card text-center py-12">
              <Video className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No Video Sessions Scheduled</h3>
              <p className="text-gray-600 dark:text-dark-text-secondary">
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
                            <span>{formatDateTime(session.session_date)}</span>
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
                          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-3 ml-9 italic bg-gray-50 dark:bg-dark-bg-secondary p-3 rounded-lg">
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-6">Charts from Your Therapist</h2>
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
                className="mb-4 text-primary-700 hover:text-primary-800 font-medium"
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
                  showTotalSum={false}
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-6">My Questionnaires</h2>

              {questionnaireAssignments.length === 0 ? (
                <div className="card text-center py-12">
                  <FileText className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">No Questionnaires Yet</h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    Your therapist will assign questionnaires for you to complete. They will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pending Questionnaires */}
                  {questionnaireAssignments.filter(a => a.status === 'pending').length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Pending</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {questionnaireAssignments
                          .filter(a => a.status === 'pending')
                          .map(assignment => (
                            <div key={assignment.id} className="card border-l-4 border-l-yellow-500">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary">{assignment.name}</h4>
                                  {assignment.description && (
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{assignment.description}</p>
                                  )}
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                  Pending
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-3">
                                <p>Assigned by: {assignment.partner_name}</p>
                                <p>Date: {format(new Date(assignment.assigned_at), 'MMM d, yyyy h:mm a')}</p>
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
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-dark-text-primary mb-3">Completed</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {questionnaireAssignments
                          .filter(a => a.status === 'completed')
                          .map(assignment => (
                            <div key={assignment.id} className="card border-l-4 border-l-green-500">
                              <div className="flex justify-between items-start mb-3">
                                <div>
                                  <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary">{assignment.name}</h4>
                                  {assignment.description && (
                                    <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{assignment.description}</p>
                                  )}
                                </div>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Completed
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-3">
                                <p>Assigned by: {assignment.partner_name}</p>
                                <p>Completed: {format(new Date(assignment.completed_at || assignment.assigned_at), 'MMM d, yyyy h:mm a')}</p>
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

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <UserReportsTab userId={user.id} onReportViewed={loadReportsCount} />
      )}

      {/* Events Tab */}
      {activeTab === 'events' && hasEventsTab && (
        <ClientEventsTab userId={user.id} partnerId={selectedPartnerId} />
      )}

      {activeTab === 'therapist' && (
        <TherapistProfileTab userId={user.id} partnerId={selectedPartnerId} />
      )}

      {activeTab === 'settings' && (
        <UserSettings />
      )}

      {/* Link Therapist Modal */}
      {showLinkTherapistModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              Link to New Therapist
            </h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
              Enter the Partner ID provided by your therapist to link your account.
            </p>
            
            {linkTherapistError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                {linkTherapistError}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Partner ID
              </label>
              <input
                type="text"
                value={linkTherapistPartnerId}
                onChange={(e) => {
                  setLinkTherapistPartnerId(e.target.value.toUpperCase());
                  setLinkTherapistError('');
                }}
                placeholder="e.g., AB12345"
                maxLength="7"
                className="input w-full"
                disabled={linkTherapistLoading}
              />
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                Enter the 7-character Partner ID (2 letters + 5 digits)
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowLinkTherapistModal(false);
                  setLinkTherapistPartnerId('');
                  setLinkTherapistError('');
                }}
                className="btn btn-secondary"
                disabled={linkTherapistLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleLinkTherapist}
                className="btn btn-primary"
                disabled={linkTherapistLoading || !linkTherapistPartnerId.trim()}
              >
                {linkTherapistLoading ? 'Linking...' : 'Link Therapist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
