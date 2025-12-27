import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationAPI, therapySessionAPI } from '../../services/api';
import {
  Building2, Users, UserCheck, Activity, Plus, Edit, UserX,
  UserPlus, ArrowRightLeft, CheckCircle, XCircle, Mail,
  AlertCircle, Send, Trash2, Settings, Calendar as CalendarIcon,
  Clock, Video as VideoIcon, User as UserIcon, ClipboardList, CreditCard, Link as LinkIcon, Copy
} from 'lucide-react';
import CreatePartnerModal from '../organization/CreatePartnerModal';
import EditPartnerModal from '../organization/EditPartnerModal';
import DeactivatePartnerModal from '../organization/DeactivatePartnerModal';
import ReassignClientsModal from '../organization/ReassignClientsModal';
import DeleteClientModal from '../organization/DeleteClientModal';
import OrganizationSettings from '../organization/OrganizationSettings';
import QuestionnaireList from '../questionnaires/QuestionnaireList';
import QuestionnaireBuilder from '../questionnaires/QuestionnaireBuilder';
import ShareQuestionnaireModal from '../questionnaires/ShareQuestionnaireModal';
import SubscriptionManagement from '../organization/SubscriptionManagement';
import EarningsTab from '../earnings/EarningsTab';
import DarkModeToggle from '../common/DarkModeToggle';
import { CurrencyIcon } from '../../utils/currencyIcon';

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

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerClients, setPartnerClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientSessions, setClientSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [partnerClientCounts, setPartnerClientCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Debug logging for production
  useEffect(() => {
    console.log('OrganizationDashboard - API_BASE_URL:', API_BASE_URL);
    console.log('OrganizationDashboard - SERVER_BASE_URL:', SERVER_BASE_URL);
    console.log('OrganizationDashboard - user.photo_url:', user?.photo_url);
    if (user?.photo_url) {
      const finalUrl = user.photo_url.startsWith('http') ? user.photo_url : `${SERVER_BASE_URL}${user.photo_url}`;
      console.log('OrganizationDashboard - Final image URL:', finalUrl);
    }
  }, [user]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showDeleteClientModal, setShowDeleteClientModal] = useState(false);
  const [modalPartner, setModalPartner] = useState(null);
  const [clientToDelete, setClientToDelete] = useState(null);

  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    inactivePartners: 0,
    totalUsers: 0
  });

  const [activeView, setActiveView] = useState('partners'); // 'partners', 'settings', or 'questionnaires'

  // Questionnaire states
  const [questionnaireView, setQuestionnaireView] = useState('list'); // 'list', 'create', 'edit'
  const [editingQuestionnaireId, setEditingQuestionnaireId] = useState(null);
  const [sharingQuestionnaire, setSharingQuestionnaire] = useState(null);

  // Therapist signup URL states
  const [showSignupUrlModal, setShowSignupUrlModal] = useState(false);
  const [signupUrl, setSignupUrl] = useState('');
  const [loadingSignupUrl, setLoadingSignupUrl] = useState(false);

  const handleQuestionnaireCopy = () => {
    // Reload is handled by QuestionnaireList
  };

  useEffect(() => {
    loadOrganizationData();
  }, [user.id]);

  useEffect(() => {
    // Show all partners without filtering
    setFilteredPartners(partners);
  }, [partners]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);
      const [partnersResponse, usersResponse] = await Promise.all([
        organizationAPI.getPartners(user.id),
        organizationAPI.getUsers(user.id)
      ]);

      const partnersData = partnersResponse.data.partners || [];
      const usersData = usersResponse.data.users || [];

      setPartners(partnersData);
      setAllUsers(usersData);

      // Load client counts for each partner
      const clientCounts = {};
      await Promise.all(
        partnersData.map(async (partner) => {
          try {
            const response = await organizationAPI.getPartnerClients(user.id, partner.id);
            clientCounts[partner.id] = response.data.clients?.length || 0;
          } catch (err) {
            console.error(`Failed to load clients for partner ${partner.id}:`, err);
            clientCounts[partner.id] = 0;
          }
        })
      );
      setPartnerClientCounts(clientCounts);

      const activeCount = partnersData.filter(p => p.is_active).length;
      setStats({
        totalPartners: partnersData.length,
        activePartners: activeCount,
        inactivePartners: partnersData.length - activeCount,
        totalUsers: usersData.length
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to load organization data:', err);
      setError('Failed to load organization data');
      setLoading(false);
    }
  };

  const loadPartnerClients = async (partnerId) => {
    try {
      setLoading(true);
      const response = await organizationAPI.getPartnerClients(user.id, partnerId);
      const clients = response.data.clients || [];
      setPartnerClients(clients);

      // Update client count for this partner
      setPartnerClientCounts(prev => ({
        ...prev,
        [partnerId]: clients.length
      }));

      setLoading(false);
    } catch (err) {
      console.error('Failed to load partner clients:', err);
      setPartnerClients([]);
      setLoading(false);
    }
  };

  const handlePartnerSelect = async (partner) => {
    setSelectedPartner(partner);
    setSelectedClient(null);
    setClientSessions([]);
    await loadPartnerClients(partner.id);
  };

  const handleClientSelect = async (client) => {
    if (!client || !selectedPartner) return;

    setSelectedClient(client);
    setSessionsLoading(true);

    try {
      const response = await therapySessionAPI.getByPartnerAndUser(selectedPartner.id, client.id);
      setClientSessions(response.data.sessions || []);
    } catch (err) {
      console.error('Failed to load client sessions:', err);
      setClientSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleCreatePartner = async (partnerData) => {
    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.createPartner(user.id, partnerData);
      setSuccessMessage('Therapist created successfully! Verification email sent.');
      setShowCreateModal(false);
      await loadOrganizationData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to create partner:', err);
      setError(err.response?.data?.error || 'Failed to create therapist');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditPartner = async (partnerData) => {
    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.updatePartner(user.id, modalPartner.id, partnerData);
      setSuccessMessage('Therapist updated successfully!');
      setShowEditModal(false);
      setModalPartner(null);
      await loadOrganizationData();
      if (selectedPartner && selectedPartner.id === modalPartner.id) {
        const updatedPartner = partners.find(p => p.id === modalPartner.id);
        setSelectedPartner(updatedPartner);
      }
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to update partner:', err);
      setError(err.response?.data?.error || 'Failed to update therapist');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeactivatePartner = async (deactivationData) => {
    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.deactivatePartner(user.id, modalPartner.id, deactivationData);
      setSuccessMessage('Therapist deactivated successfully!');
      setShowDeactivateModal(false);
      setModalPartner(null);
      if (selectedPartner && selectedPartner.id === modalPartner.id) {
        setSelectedPartner(null);
        setPartnerClients([]);
      }
      await loadOrganizationData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to deactivate partner:', err);
      setError(err.response?.data?.error || 'Failed to deactivate therapist');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivatePartner = async (partner) => {
    if (!window.confirm(`Are you sure you want to activate ${partner.name}?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.activatePartner(user.id, partner.id);
      setSuccessMessage('Therapist activated successfully!');
      await loadOrganizationData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to activate partner:', err);
      setError(err.response?.data?.error || 'Failed to activate therapist');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReassignClients = async (reassignmentData) => {
    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.reassignClients(user.id, reassignmentData);
      setSuccessMessage('Clients reassigned successfully!');
      setShowReassignModal(false);
      setModalPartner(null);
      if (selectedPartner && selectedPartner.id === reassignmentData.fromPartnerId) {
        await loadPartnerClients(selectedPartner.id);
      }
      await loadOrganizationData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to reassign clients:', err);
      setError(err.response?.data?.error || 'Failed to reassign clients');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendVerification = async (partner) => {
    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.resendVerificationEmail(user.id, partner.id);
      setSuccessMessage(`Verification email sent successfully to ${partner.email}! Please check inbox.`);
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to resend verification email:', err);
      setError(err.response?.data?.error || 'Failed to resend verification email');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePartner = async (partner) => {
    const clientCount = partnerClientCounts[partner.id] || 0;

    if (clientCount > 0) {
      setError(`Cannot delete ${partner.name} - they have ${clientCount} client(s) assigned. Please reassign clients first.`);
      return;
    }

    if (!window.confirm(
      `Are you sure you want to permanently delete ${partner.name}?\n\n` +
      `This action cannot be undone. Their account and login credentials will be removed.`
    )) {
      return;
    }

    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.deletePartner(user.id, partner.id);
      setSuccessMessage(`Therapist ${partner.name} deleted successfully!`);

      if (selectedPartner && selectedPartner.id === partner.id) {
        setSelectedPartner(null);
        setPartnerClients([]);
      }

      await loadOrganizationData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to delete partner:', err);
      setError(err.response?.data?.message || err.response?.data?.error || 'Failed to delete therapist');
    } finally {
      setActionLoading(false);
    }
  };

  const openEditModal = (partner) => {
    setModalPartner(partner);
    setShowEditModal(true);
  };

  const openDeactivateModal = async (partner) => {
    setModalPartner(partner);
    await loadPartnerClients(partner.id);
    setShowDeactivateModal(true);
  };

  const openReassignModal = async (partner) => {
    setModalPartner(partner);
    await loadPartnerClients(partner.id);
    setShowReassignModal(true);
  };

  const openDeleteClientModal = (client) => {
    setClientToDelete(client);
    setShowDeleteClientModal(true);
  };

  const handleDeleteClient = async (clientId) => {
    try {
      setActionLoading(true);
      setError('');
      await organizationAPI.deleteClient(user.id, clientId);
      setSuccessMessage('Client deleted successfully! All associated data has been removed.');
      setShowDeleteClientModal(false);
      setClientToDelete(null);

      // Clear selected client if it was the one deleted
      if (selectedClient && selectedClient.id === clientId) {
        setSelectedClient(null);
        setClientSessions([]);
      }

      // Reload partner clients if a partner is selected
      if (selectedPartner) {
        await loadPartnerClients(selectedPartner.id);
      }

      // Reload organization data to update stats
      await loadOrganizationData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to delete client:', err);
      setError(err.response?.data?.error || 'Failed to delete client');
      setShowDeleteClientModal(false);
      setClientToDelete(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleGetSignupUrl = async () => {
    try {
      setLoadingSignupUrl(true);
      setError('');
      const response = await organizationAPI.getTherapistSignupToken(user.id);
      setSignupUrl(response.data.signup_url);
      setShowSignupUrlModal(true);
    } catch (err) {
      console.error('Failed to get signup URL:', err);
      setError(err.response?.data?.error || 'Failed to generate signup URL');
    } finally {
      setLoadingSignupUrl(false);
    }
  };

  const handleCopySignupUrl = () => {
    navigator.clipboard.writeText(signupUrl);
    setSuccessMessage('Signup URL copied to clipboard!');
    setTimeout(() => setSuccessMessage(''), 3000);
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

  const activePartners = partners.filter(p => p.is_active);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 flex items-center space-x-3 sm:space-x-4">
            {/* Organization Logo */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-300 flex-shrink-0">
              {user.photo_url ? (
                <img
                  src={getImageUrl(user.photo_url)}
                  alt={user.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Organization profile image load error:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-100">
                  <Building2 className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-indigo-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-dark-text-primary truncate">
                {user.name}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary mt-1">Organization Overview and Management</p>
            </div>
          </div>
          {/* Action Buttons - Hidden on mobile, visible on desktop */}
          <div className="hidden lg:flex items-center space-x-3">
            {user.theraptrack_controlled && (
              <button
                onClick={handleGetSignupUrl}
                disabled={loadingSignupUrl}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50"
                title="Get signup URL for therapists to join your organization"
              >
                <LinkIcon className="h-5 w-5" />
                <span>Get Therapist Signup URL</span>
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 btn btn-primary whitespace-nowrap"
            >
              <Plus className="h-5 w-5" />
              <span>Add Therapist</span>
            </button>
          </div>
        </div>

        {/* Add Therapist Button - Mobile Only (Floating Action Button style) */}
        {activeView === 'partners' && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="lg:hidden fixed bottom-6 right-6 z-50 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
            title="Add Therapist"
          >
            <Plus className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border mb-6">
        {/* Mobile Dark Mode Toggle */}
        <div className="lg:hidden border-b border-gray-200 dark:border-dark-border py-3 px-4">
          <DarkModeToggle variant="button" showLabel />
        </div>

        <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveView('partners')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
              activeView === 'partners'
                ? 'border-indigo-600 text-indigo-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <Users className="inline h-5 w-5 mr-2" />
            Therapists Management
          </button>
          {user.theraptrack_controlled && (
            <button
              onClick={() => setActiveView('subscriptions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeView === 'subscriptions'
                  ? 'border-indigo-600 text-indigo-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
              }`}
            >
              <CreditCard className="inline h-5 w-5 mr-2" />
              Subscription Management
            </button>
          )}
          <button
            onClick={() => setActiveView('questionnaires')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
              activeView === 'questionnaires'
                ? 'border-indigo-600 text-indigo-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <ClipboardList className="inline h-5 w-5 mr-2" />
            Questionnaires
          </button>
          {!user.theraptrack_controlled && (
            <button
              onClick={() => setActiveView('earnings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
                activeView === 'earnings'
                  ? 'border-indigo-600 text-indigo-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
              }`}
            >
              <CurrencyIcon className="inline h-5 w-5 mr-2" />
              Earnings
            </button>
          )}
          <button
            onClick={() => setActiveView('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex-shrink-0 ${
              activeView === 'settings'
                ? 'border-indigo-600 text-indigo-600 dark:border-dark-primary-500 dark:text-dark-primary-500'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary dark:hover:border-dark-border'
            }`}
          >
            <Settings className="inline h-5 w-5 mr-2" />
            Settings
          </button>
        </nav>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-dark-bg-secondary border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Partners Management View */}
      {activeView === 'partners' && (
        <>
      {/* Stats Cards - Horizontal scroll on mobile, grid on desktop */}
      <div className="mb-6 lg:mb-8">
        {/* Mobile: Horizontal Scrollable */}
        <div className="lg:hidden overflow-x-auto -mx-4 px-4 scrollbar-thin scroll-smooth">
          <div className="flex gap-4 pb-2">
            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">Total Therapists</p>
                <UserCheck className="h-12 w-12 text-primary-600 mb-2" />
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalPartners}</p>
              </div>
            </div>

            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">Active</p>
                <CheckCircle className="h-12 w-12 text-green-600 mb-2" />
                <p className="text-3xl font-bold text-green-600">{stats.activePartners}</p>
              </div>
            </div>

            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">Inactive</p>
                <XCircle className="h-12 w-12 text-red-600 mb-2" />
                <p className="text-3xl font-bold text-red-600">{stats.inactivePartners}</p>
              </div>
            </div>

            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">Total Clients</p>
                <Users className="h-12 w-12 text-primary-600 mb-2" />
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden lg:grid grid-cols-4 gap-6">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Therapists</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mt-1">{stats.totalPartners}</p>
              </div>
              <UserCheck className="h-12 w-12 text-primary-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.activePartners}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Inactive</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.inactivePartners}</p>
              </div>
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary mt-1">{stats.totalUsers}</p>
              </div>
              <Users className="h-12 w-12 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Therapist Dropdown and Details */}
      <div className="space-y-6">
        {/* Therapist Selector */}
        <div className="card">
          <div className="mb-4">
            <h2 className="text-lg font-semibold flex items-center mb-3 text-gray-900 dark:text-dark-text-primary">
              <UserCheck className="h-5 w-5 mr-2" />
              Select Therapist
            </h2>

            {filteredPartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
                <UserCheck className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-dark-text-tertiary" />
                <p className="text-sm">No therapists found</p>
              </div>
            ) : (
              <select
                value={selectedPartner?.id || ''}
                onChange={(e) => {
                  const partner = filteredPartners.find(p => p.id === parseInt(e.target.value));
                  if (partner) {
                    handlePartnerSelect(partner);
                  } else {
                    setSelectedPartner(null);
                    setPartnerClients([]);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
              >
                <option value="" className="bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary">-- Select a therapist --</option>
                {filteredPartners.map((partner) => (
                  <option key={partner.id} value={partner.id} className="bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary">
                    {partner.name} - ID: {partner.partner_id} ({partnerClientCounts[partner.id] || 0} client{partnerClientCounts[partner.id] !== 1 ? 's' : ''})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Selected Therapist Details */}
          {selectedPartner && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="space-y-4">
                {/* Therapist Info */}
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">{selectedPartner.name}</h3>
                      {selectedPartner.partner_id && (
                        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
                          ID: <span className="font-mono font-semibold text-primary-600">{selectedPartner.partner_id}</span>
                        </p>
                      )}
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">{selectedPartner.email}</p>
                      <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mt-1 flex items-center space-x-1">
                        <Users className="h-4 w-4" />
                        <span>{partnerClientCounts[selectedPartner.id] || 0} client{partnerClientCounts[selectedPartner.id] !== 1 ? 's' : ''}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`flex items-center space-x-1 text-sm ${selectedPartner.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        <CheckCircle className="h-4 w-4" />
                        <span>{selectedPartner.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                      <span className={`flex items-center space-x-1 text-sm ${selectedPartner.email_verified ? 'text-green-600' : 'text-amber-600'}`}>
                        <Mail className="h-4 w-4" />
                        <span>{selectedPartner.email_verified ? 'Verified' : 'Pending'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openEditModal(selectedPartner)}
                    className="px-3 py-2 text-xs sm:text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition"
                  >
                    <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Edit</span>
                  </button>

                  {(partnerClientCounts[selectedPartner.id] === 0) && (
                    <button
                      onClick={() => handleDeletePartner(selectedPartner)}
                      className="px-3 py-2 text-xs sm:text-sm text-red-700 bg-red-50 hover:bg-red-100 rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Delete</span>
                    </button>
                  )}

                  {!selectedPartner.email_verified && (
                    <button
                      onClick={() => handleResendVerification(selectedPartner)}
                      className="px-3 py-2 text-xs sm:text-sm text-primary-800 dark:text-dark-primary-400 bg-primary-50 dark:bg-dark-bg-secondary hover:bg-primary-100 dark:hover:bg-dark-bg-tertiary rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition"
                    >
                      <Send className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Resend Email</span>
                      <span className="sm:hidden">Resend</span>
                    </button>
                  )}

                  {selectedPartner.is_active ? (
                    <button
                      onClick={() => openDeactivateModal(selectedPartner)}
                      className="px-3 py-2 text-xs sm:text-sm text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition"
                    >
                      <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Deactivate</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleActivatePartner(selectedPartner)}
                      className="px-3 py-2 text-xs sm:text-sm text-green-700 dark:text-green-300 bg-green-50 dark:bg-dark-bg-secondary hover:bg-green-100 dark:hover:bg-dark-bg-tertiary rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition"
                    >
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Activate</span>
                    </button>
                  )}

                  <button
                    onClick={() => openReassignModal(selectedPartner)}
                    className="px-3 py-2 text-xs sm:text-sm text-primary-700 dark:text-dark-primary-400 bg-primary-50 dark:bg-dark-bg-secondary hover:bg-primary-100 dark:hover:bg-dark-bg-tertiary rounded-lg flex items-center justify-center space-x-1 sm:space-x-2 transition"
                  >
                    <ArrowRightLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span>Reassign</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Therapist's Clients */}
        {selectedPartner && (
          <div className="card">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                <Users className="h-6 w-6 mr-2" />
                {selectedPartner.name}'s Clients ({partnerClients.length})
              </h2>
            </div>

            {partnerClients.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-dark-text-tertiary">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-dark-text-tertiary" />
                <p>No clients assigned to this therapist yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Client List with Delete Buttons */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-3">
                    Client List ({partnerClients.length})
                  </h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {partnerClients.map((client) => (
                      <div
                        key={client.id}
                        className={`flex items-center justify-between p-3 sm:p-4 border rounded-lg transition-all ${
                          selectedClient?.id === client.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-dark-bg-secondary'
                            : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg-secondary hover:border-gray-300 dark:hover:border-dark-border hover:shadow-sm'
                        }`}
                      >
                        <button
                          onClick={() => handleClientSelect(client)}
                          className="flex-1 text-left min-w-0"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm sm:text-base font-medium text-gray-900 dark:text-dark-text-primary truncate">
                                {client.name}
                              </p>
                              <p className="text-xs sm:text-sm text-gray-500 dark:text-dark-text-tertiary">
                                {client.sex}, {client.age} years
                              </p>
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => openDeleteClientModal(client)}
                          className="flex-shrink-0 ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete client"
                        >
                          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Session Details */}
                {selectedClient && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2 text-primary-600" />
                      Sessions for {selectedClient.name}
                    </h3>

                    {sessionsLoading ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        <p className="text-gray-600 dark:text-dark-text-secondary mt-2">Loading sessions...</p>
                      </div>
                    ) : clientSessions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-dark-text-tertiary" />
                        <p>No sessions found for this client</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {clientSessions.map((session) => (
                          <div
                            key={session.id}
                            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                          >
                            {/* Client Info */}
                            <div className="mb-3 pb-3 border-b border-gray-200">
                              <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary flex items-center mb-2">
                                <UserIcon className="h-4 w-4 mr-2 text-primary-600" />
                                {selectedClient.name}
                              </h4>
                              <div className="text-sm text-gray-600 dark:text-dark-text-secondary space-y-1">
                                <p>{selectedClient.sex}, {selectedClient.age} years</p>
                                {selectedClient.email && (
                                  <p className="text-xs truncate">{selectedClient.email}</p>
                                )}
                              </div>
                            </div>

                            {/* Session Details */}
                            <div className="space-y-2 text-sm">
                              {/* Assigned Date */}
                              {selectedClient.assigned_at && (
                                <div className="flex items-start">
                                  <span className="font-medium text-gray-700 dark:text-dark-text-secondary min-w-[100px]">Assigned:</span>
                                  <span className="text-gray-600 dark:text-dark-text-secondary">
                                    {new Date(selectedClient.assigned_at).toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              )}

                              {/* Session Date */}
                              <div className="flex items-start">
                                <span className="font-medium text-gray-700 dark:text-dark-text-secondary min-w-[100px]">Session Date:</span>
                                <span className="text-gray-600 dark:text-dark-text-secondary">
                                  {new Date(session.session_date).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>

                              {/* Time & Duration */}
                              {session.session_time && (
                                <div className="flex items-start">
                                  <span className="font-medium text-gray-700 dark:text-dark-text-secondary min-w-[100px] flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Time:
                                  </span>
                                  <span className="text-gray-600 dark:text-dark-text-secondary">
                                    {session.session_time}
                                    {session.duration && ` (${session.duration} min)`}
                                  </span>
                                </div>
                              )}

                              {/* Session Type */}
                              <div className="flex items-start">
                                <span className="font-medium text-gray-700 dark:text-dark-text-secondary min-w-[100px] flex items-center">
                                  <VideoIcon className="h-3 w-3 mr-1" />
                                  Type:
                                </span>
                                <span className="text-gray-600 dark:text-dark-text-secondary capitalize">
                                  {session.session_type === 'video' ? 'Video Call' : 'In-Person'}
                                </span>
                              </div>

                              {/* Topic */}
                              {session.topic && (
                                <div className="flex items-start">
                                  <span className="font-medium text-gray-700 dark:text-dark-text-secondary min-w-[100px]">Topic:</span>
                                  <span className="text-gray-600 dark:text-dark-text-secondary">{session.topic}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* Settings View */}
      {activeView === 'questionnaires' && (
        <div>
          {questionnaireView === 'list' && (
            <QuestionnaireList
              ownerType="organization"
              ownerId={user.id}
              onEdit={(id) => {
                setEditingQuestionnaireId(id);
                setQuestionnaireView('edit');
              }}
              onShare={setSharingQuestionnaire}
              onCopy={handleQuestionnaireCopy}
              onCreateNew={() => setQuestionnaireView('create')}
            />
          )}
          {questionnaireView === 'create' && (
            <QuestionnaireBuilder
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
          {questionnaireView === 'edit' && editingQuestionnaireId && (
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
        </div>
      )}

      {activeView === 'subscriptions' && (
        <SubscriptionManagement 
          organizationId={user.id} 
          isTheraPTrackControlled={user.theraptrack_controlled}
        />
      )}

      {activeView === 'earnings' && !user.theraptrack_controlled && (
        <EarningsTab />
      )}

      {activeView === 'settings' && (
        <OrganizationSettings />
      )}

      {/* Modals */}
      {sharingQuestionnaire && (
        <ShareQuestionnaireModal
          isOpen={!!sharingQuestionnaire}
          onClose={(success) => {
            setSharingQuestionnaire(null);
            if (success) {
              // Optionally reload questionnaires
            }
          }}
          questionnaire={sharingQuestionnaire}
          ownerType="organization"
          ownerId={user.id}
        />
      )}
      <CreatePartnerModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePartner}
        isLoading={actionLoading}
      />

      <EditPartnerModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setModalPartner(null);
        }}
        onSubmit={handleEditPartner}
        partner={modalPartner}
        isLoading={actionLoading}
      />

      <DeactivatePartnerModal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setModalPartner(null);
        }}
        onSubmit={handleDeactivatePartner}
        partner={modalPartner}
        clients={partnerClients}
        activePartners={activePartners}
        isLoading={actionLoading}
      />

      <ReassignClientsModal
        isOpen={showReassignModal}
        onClose={() => {
          setShowReassignModal(false);
          setModalPartner(null);
        }}
        onSubmit={handleReassignClients}
        sourcePartner={modalPartner}
        clients={partnerClients}
        activePartners={activePartners}
        isLoading={actionLoading}
      />

      <DeleteClientModal
        isOpen={showDeleteClientModal}
        onClose={() => {
          setShowDeleteClientModal(false);
          setClientToDelete(null);
        }}
        onConfirm={handleDeleteClient}
        client={clientToDelete}
        isLoading={actionLoading}
      />

      {/* Therapist Signup URL Modal */}
      {showSignupUrlModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 flex items-center">
                <LinkIcon className="h-6 w-6 mr-2 text-green-600" />
                Therapist Signup URL
              </h2>
              <button
                onClick={() => setShowSignupUrlModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Share this URL with therapists who want to join your organization. They can use it to create their account and will be automatically linked to your organization.
              </p>

              <div className="bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm text-gray-500 mb-1">Signup URL:</p>
                    <p className="text-sm font-mono text-gray-900 break-all">{signupUrl}</p>
                  </div>
                  <button
                    onClick={handleCopySignupUrl}
                    className="ml-4 flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
                  >
                    <Copy className="h-4 w-4" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">Important Notes:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>This URL is unique to your organization and can be used multiple times</li>
                    <li>Therapists who sign up using this link will NOT see your organization name during signup</li>
                    <li>They will be automatically linked to your organization after account creation</li>
                    <li>Therapists will need to verify their email address before they can log in</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowSignupUrlModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationDashboard;
