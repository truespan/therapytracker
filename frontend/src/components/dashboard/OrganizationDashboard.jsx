import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { organizationAPI } from '../../services/api';
import {
  Building2, Users, UserCheck, Activity, Plus, Edit, UserX,
  UserPlus, ArrowRightLeft, CheckCircle, XCircle, Mail, Filter,
  AlertCircle, Send, Trash2
} from 'lucide-react';
import CreatePartnerModal from '../organization/CreatePartnerModal';
import EditPartnerModal from '../organization/EditPartnerModal';
import DeactivatePartnerModal from '../organization/DeactivatePartnerModal';
import ReassignClientsModal from '../organization/ReassignClientsModal';

const OrganizationDashboard = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [filteredPartners, setFilteredPartners] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [partnerClients, setPartnerClients] = useState([]);
  const [partnerClientCounts, setPartnerClientCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, inactive
  const [verificationFilter, setVerificationFilter] = useState('all'); // all, verified, unverified

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [modalPartner, setModalPartner] = useState(null);

  const [stats, setStats] = useState({
    totalPartners: 0,
    activePartners: 0,
    inactivePartners: 0,
    totalUsers: 0
  });

  useEffect(() => {
    loadOrganizationData();
  }, [user.id]);

  useEffect(() => {
    applyFilters();
  }, [partners, statusFilter, verificationFilter]);

  const applyFilters = () => {
    let filtered = [...partners];

    // Status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(p => p.is_active);
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(p => !p.is_active);
    }

    // Verification filter
    if (verificationFilter === 'verified') {
      filtered = filtered.filter(p => p.email_verified);
    } else if (verificationFilter === 'unverified') {
      filtered = filtered.filter(p => !p.email_verified);
    }

    setFilteredPartners(filtered);
  };

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
    await loadPartnerClients(partner.id);
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
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center">
              <Building2 className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 mr-2 sm:mr-3" />
              <span className="break-words">{user.name}</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Organization Overview and Management</p>
          </div>
          {/* Add Therapist Button - Hidden on mobile, visible on desktop */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="hidden lg:flex items-center space-x-2 btn btn-primary whitespace-nowrap"
          >
            <Plus className="h-5 w-5" />
            <span>Add Therapist</span>
          </button>
        </div>

        {/* Add Therapist Button - Mobile Only (Floating Action Button style) */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="lg:hidden fixed bottom-6 right-6 z-50 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors flex items-center justify-center"
          title="Add Therapist"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
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

      {/* Stats Cards - Horizontal scroll on mobile, grid on desktop */}
      <div className="mb-6 lg:mb-8">
        {/* Mobile: Horizontal Scrollable */}
        <div className="lg:hidden overflow-x-auto -mx-4 px-4 scrollbar-thin scroll-smooth">
          <div className="flex gap-4 pb-2">
            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 mb-2">Total Therapists</p>
                <UserCheck className="h-12 w-12 text-primary-600 mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.totalPartners}</p>
              </div>
            </div>

            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 mb-2">Active</p>
                <CheckCircle className="h-12 w-12 text-green-600 mb-2" />
                <p className="text-3xl font-bold text-green-600">{stats.activePartners}</p>
              </div>
            </div>

            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 mb-2">Inactive</p>
                <XCircle className="h-12 w-12 text-red-600 mb-2" />
                <p className="text-3xl font-bold text-red-600">{stats.inactivePartners}</p>
              </div>
            </div>

            <div className="card p-5 flex-shrink-0 w-[200px]">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm text-gray-600 mb-2">Total Clients</p>
                <Users className="h-12 w-12 text-primary-600 mb-2" />
                <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop: Grid Layout */}
        <div className="hidden lg:grid grid-cols-4 gap-6">
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Therapists</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalPartners}</p>
              </div>
              <UserCheck className="h-12 w-12 text-primary-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.activePartners}</p>
              </div>
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Inactive</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.inactivePartners}</p>
              </div>
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalUsers}</p>
              </div>
              <Users className="h-12 w-12 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: Therapist list first, then clients */}
      {/* Desktop: Side by side layout */}
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6">
        {/* Partners List - Appears first on mobile, sidebar on desktop */}
        <div className="order-1 lg:col-span-1">
          <div className="card lg:sticky lg:top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                <UserCheck className="h-5 w-5 mr-2" />
                Therapists
              </h2>
              <button
                onClick={() => {}}
                className="p-1 hover:bg-gray-100 rounded"
                title="Filters"
              >
                <Filter className="h-5 w-5 text-gray-600" />
              </button>
            </div>

            {/* Filters */}
            <div className="mb-4 space-y-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>

              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Verification</option>
                <option value="verified">Verified Only</option>
                <option value="unverified">Unverified Only</option>
              </select>
            </div>

            {filteredPartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No therapists found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {filteredPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedPartner?.id === partner.id
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => handlePartnerSelect(partner)}
                      className="w-full text-left"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{partner.name}</p>
                          {partner.partner_id && (
                            <p className="text-xs font-mono text-primary-600 font-semibold mt-1">
                              ID: {partner.partner_id}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{partnerClientCounts[partner.id] || 0} client{partnerClientCounts[partner.id] !== 1 ? 's' : ''}</span>
                          </p>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          {partner.is_active ? (
                            <CheckCircle className="h-4 w-4 text-green-600" title="Active" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600" title="Inactive" />
                          )}
                          {partner.email_verified ? (
                            <Mail className="h-4 w-4 text-green-600" title="Email Verified" />
                          ) : (
                            <Mail className="h-4 w-4 text-amber-600" title="Email Not Verified" />
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{partner.email}</p>
                    </button>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1 mt-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => openEditModal(partner)}
                        className="flex-1 p-2 text-xs text-gray-700 hover:bg-gray-100 rounded flex items-center justify-center space-x-1"
                        title="Edit"
                      >
                        <Edit className="h-3 w-3" />
                        <span>Edit</span>
                      </button>

                      {(partnerClientCounts[partner.id] === 0) && (
                        <button
                          onClick={() => handleDeletePartner(partner)}
                          className="flex-1 p-2 text-xs text-red-700 hover:bg-red-50 rounded flex items-center justify-center space-x-1"
                          title="Delete Therapist"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </button>
                      )}

                      {!partner.email_verified && (
                        <button
                          onClick={() => handleResendVerification(partner)}
                          className="flex-1 p-2 text-xs text-blue-700 hover:bg-blue-50 rounded flex items-center justify-center space-x-1"
                          title="Resend Verification Email"
                        >
                          <Send className="h-3 w-3" />
                          <span>Resend</span>
                        </button>
                      )}

                      {partner.is_active ? (
                        <button
                          onClick={() => openDeactivateModal(partner)}
                          className="flex-1 p-2 text-xs text-orange-700 hover:bg-orange-50 rounded flex items-center justify-center space-x-1"
                          title="Deactivate"
                        >
                          <UserX className="h-3 w-3" />
                          <span>Deactivate</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleActivatePartner(partner)}
                          className="flex-1 p-2 text-xs text-green-700 hover:bg-green-50 rounded flex items-center justify-center space-x-1"
                          title="Activate"
                        >
                          <UserPlus className="h-3 w-3" />
                          <span>Activate</span>
                        </button>
                      )}

                      <button
                        onClick={() => openReassignModal(partner)}
                        className="flex-1 p-2 text-xs text-primary-700 hover:bg-primary-50 rounded flex items-center justify-center space-x-1"
                        title="Reassign Clients"
                      >
                        <ArrowRightLeft className="h-3 w-3" />
                        <span>Reassign</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Partner's Clients - Appears second on mobile, main content on desktop */}
        <div className="order-2 lg:col-span-3">
          {selectedPartner ? (
            <div className="card">
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedPartner.name}'s Clients ({partnerClients.length})
                    </h2>
                    <div className="flex items-center space-x-4 mt-2 text-sm">
                      {selectedPartner.partner_id && (
                        <span className="text-gray-600">
                          ID: <span className="font-mono font-semibold text-primary-600">{selectedPartner.partner_id}</span>
                        </span>
                      )}
                      <span className={`flex items-center space-x-1 ${selectedPartner.is_active ? 'text-green-600' : 'text-red-600'}`}>
                        {selectedPartner.is_active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        <span>{selectedPartner.is_active ? 'Active' : 'Inactive'}</span>
                      </span>
                      <span className={`flex items-center space-x-1 ${selectedPartner.email_verified ? 'text-green-600' : 'text-amber-600'}`}>
                        <Mail className="h-4 w-4" />
                        <span>{selectedPartner.email_verified ? 'Email Verified' : 'Email Pending'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {partnerClients.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <p>No clients assigned to this therapist yet</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {partnerClients.map((client) => (
                    <div
                      key={client.id}
                      className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-300 transition"
                    >
                      <p className="font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-600">{client.sex}, {client.age} years</p>
                      {client.email && <p className="text-sm text-gray-600 mt-1">{client.email}</p>}
                      {client.assigned_at && (
                        <p className="text-xs text-gray-500 mt-2">
                          Assigned: {new Date(client.assigned_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="card text-center py-16">
              <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">Select a therapist to view their clients</p>
              <p className="text-gray-500 text-sm mt-2">Use the action buttons to manage therapists</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
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
    </div>
  );
};

export default OrganizationDashboard;
