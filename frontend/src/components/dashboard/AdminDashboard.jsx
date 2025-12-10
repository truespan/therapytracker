import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Edit2, 
  Trash2, 
  TrendingUp, 
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Users,
  UserCheck,
  Activity
} from 'lucide-react';
import { adminAPI } from '../../services/api';
import CreateOrganizationModal from '../admin/CreateOrganizationModal';
import EditOrganizationModal from '../admin/EditOrganizationModal';
import OrganizationMetricsModal from '../admin/OrganizationMetricsModal';

const AdminDashboard = () => {
  const [organizations, setOrganizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, inactive
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [metricsData, setMetricsData] = useState(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMetricsModal, setShowMetricsModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Helper function to format plan display names
  const getPlanDisplayName = (plan) => {
    const planMap = {
      'basic': 'Plan Basic',
      'basic_silver': 'Plan Basic - Silver',
      'basic_gold': 'Plan Basic - Gold',
      'pro_silver': 'Plan Pro - Silver',
      'pro_gold': 'Plan Pro - Gold',
      'pro_platinum': 'Plan Pro - Platinum'
    };
    return planMap[plan] || plan;
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [orgsResponse, statsResponse] = await Promise.all([
        adminAPI.getAllOrganizations(),
        adminAPI.getDashboardStats(),
      ]);
      setOrganizations(orgsResponse.data.organizations);
      setStats(statsResponse.data.stats);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (formData) => {
    try {
      setModalLoading(true);
      await adminAPI.createOrganization(formData);
      alert('Organization created successfully!');
      setShowCreateModal(false);
      loadDashboardData();
    } catch (error) {
      console.error('Error creating organization:', error);
      alert(error.response?.data?.error || 'Failed to create organization');
    } finally {
      setModalLoading(false);
    }
  };

  const handleUpdateOrganization = async (formData) => {
    try {
      setModalLoading(true);
      await adminAPI.updateOrganization(selectedOrg.id, formData);
      alert('Organization updated successfully!');
      setShowEditModal(false);
      setSelectedOrg(null);
      loadDashboardData();
    } catch (error) {
      console.error('Error updating organization:', error);
      alert(error.response?.data?.error || 'Failed to update organization');
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeactivateOrganization = async (org) => {
    if (!window.confirm(`Are you sure you want to deactivate "${org.name}"? They will not be able to login.`)) {
      return;
    }

    try {
      await adminAPI.deactivateOrganization(org.id);
      alert('Organization deactivated successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Error deactivating organization:', error);
      alert(error.response?.data?.error || 'Failed to deactivate organization');
    }
  };

  const handleActivateOrganization = async (org) => {
    try {
      await adminAPI.activateOrganization(org.id);
      alert('Organization activated successfully!');
      loadDashboardData();
    } catch (error) {
      console.error('Error activating organization:', error);
      alert(error.response?.data?.error || 'Failed to activate organization');
    }
  };

  const handleDeleteOrganization = async (org) => {
    if (!window.confirm(
      `⚠️ WARNING: Are you sure you want to PERMANENTLY DELETE "${org.name}"?\n\n` +
      `This will delete:\n` +
      `- All partners (${org.total_partners || 0})\n` +
      `- All clients (${org.total_clients || 0})\n` +
      `- All sessions (${org.total_sessions || 0})\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type the organization name to confirm.`
    )) {
      return;
    }

    const confirmation = window.prompt(`Please type "${org.name}" to confirm deletion:`);
    if (confirmation !== org.name) {
      alert('Organization name does not match. Deletion cancelled.');
      return;
    }

    try {
      await adminAPI.deleteOrganization(org.id);
      alert('Organization deleted permanently!');
      loadDashboardData();
    } catch (error) {
      console.error('Error deleting organization:', error);
      alert(error.response?.data?.error || 'Failed to delete organization');
    }
  };

  const handleViewMetrics = async (org) => {
    try {
      setSelectedOrg(org);
      setShowMetricsModal(true);
      setMetricsLoading(true);
      const response = await adminAPI.getOrganizationMetrics(org.id);
      setMetricsData(response.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
      alert('Failed to load organization metrics');
      setShowMetricsModal(false);
    } finally {
      setMetricsLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter((org) => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStatus === 'all' ||
                         (filterStatus === 'active' && org.is_active) ||
                         (filterStatus === 'inactive' && !org.is_active);
    
    return matchesSearch && matchesFilter;
  });

  const StatCard = ({ icon: Icon, label, value, subValue, color = 'indigo' }) => {
    // Icon color classes for dynamic colors
    const iconBgClass = {
      'indigo': 'bg-indigo-100',
      'blue': 'bg-primary-100',
      'green': 'bg-green-100',
      'purple': 'bg-purple-100'
    }[color] || 'bg-indigo-100';

    const iconColorClass = {
      'indigo': 'text-indigo-600',
      'blue': 'text-primary-700',
      'green': 'text-green-600',
      'purple': 'text-purple-600'
    }[color] || 'text-indigo-600';

    const borderClass = {
      'indigo': 'border-indigo-600',
      'blue': 'border-primary-600',
      'green': 'border-green-600',
      'purple': 'border-purple-600'
    }[color] || 'border-indigo-600';

    return (
      <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${borderClass} flex-shrink-0 w-full lg:w-auto`}>
        <div className="flex items-center justify-between h-full min-h-[120px]">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
            <div className="h-6">
              {subValue && <p className="text-sm text-gray-500 mt-1">{subValue}</p>}
            </div>
          </div>
          <div className={`${iconBgClass} p-4 rounded-full`}>
            <Icon className={`h-8 w-8 ${iconColorClass}`} />
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage organizations and view system statistics</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 font-medium shadow-md"
        >
          <Plus className="h-5 w-5" />
          <span>Create Organization</span>
        </button>
      </div>

      {/* Stats Overview */}
      {stats && (
        <>
          {/* Mobile: Horizontal Scrollable Cards */}
          <div className="lg:hidden overflow-x-auto -mx-4 px-4 scrollbar-thin scroll-smooth">
            <div className="flex gap-4 pb-2">
              <div className="w-[70%] flex-shrink-0">
                <StatCard
                  icon={Building2}
                  label="Total Organizations"
                  value={stats.total_organizations || 0}
                  subValue={`${stats.active_organizations || 0} active`}
                  color="indigo"
                />
              </div>
              <div className="w-[70%] flex-shrink-0">
                <StatCard
                  icon={UserCheck}
                  label="Total Partners"
                  value={stats.total_partners || 0}
                  color="blue"
                />
              </div>
              <div className="w-[70%] flex-shrink-0">
                <StatCard
                  icon={Users}
                  label="Total Clients"
                  value={stats.total_users || 0}
                  color="green"
                />
              </div>
              <div className="w-[70%] flex-shrink-0">
                <StatCard
                  icon={Activity}
                  label="Total Sessions"
                  value={stats.total_sessions || 0}
                  subValue={`${stats.sessions_this_month || 0} this month`}
                  color="purple"
                />
              </div>
            </div>
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Building2}
              label="Total Organizations"
              value={stats.total_organizations || 0}
              subValue={`${stats.active_organizations || 0} active`}
              color="indigo"
            />
            <StatCard
              icon={UserCheck}
              label="Total Partners"
              value={stats.total_partners || 0}
              color="blue"
            />
            <StatCard
              icon={Users}
              label="Total Clients"
              value={stats.total_users || 0}
              color="green"
            />
            <StatCard
              icon={Activity}
              label="Total Sessions"
              value={stats.total_sessions || 0}
              subValue={`${stats.sessions_this_month || 0} this month`}
              color="purple"
            />
          </div>
        </>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({organizations.length})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'active'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({organizations.filter(o => o.is_active).length})
            </button>
            <button
              onClick={() => setFilterStatus('inactive')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterStatus === 'inactive'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive ({organizations.filter(o => !o.is_active).length})
            </button>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partners
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Clients
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">
                      {searchTerm ? 'No organizations found matching your search' : 'No organizations yet'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{org.name}</div>
                          <div className="text-sm text-gray-500">{org.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{org.contact}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {org.subscription_plan ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {getPlanDisplayName(org.subscription_plan)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">No plan</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{org.total_partners || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{org.total_clients || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-semibold text-gray-900">{org.total_sessions || 0}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {org.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleViewMetrics(org)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="View Metrics"
                        >
                          <TrendingUp className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setShowEditModal(true);
                          }}
                          className="text-primary-700 hover:text-primary-900 p-1 rounded hover:bg-primary-50"
                          title="Edit"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        {org.is_active ? (
                          <button
                            onClick={() => handleDeactivateOrganization(org)}
                            className="text-orange-600 hover:text-orange-900 p-1 rounded hover:bg-orange-50"
                            title="Deactivate"
                          >
                            <AlertTriangle className="h-5 w-5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivateOrganization(org)}
                            className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                            title="Activate"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteOrganization(org)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete Permanently"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <CreateOrganizationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateOrganization}
        isLoading={modalLoading}
      />

      <EditOrganizationModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedOrg(null);
        }}
        onSubmit={handleUpdateOrganization}
        isLoading={modalLoading}
        organization={selectedOrg}
      />

      <OrganizationMetricsModal
        isOpen={showMetricsModal}
        onClose={() => {
          setShowMetricsModal(false);
          setSelectedOrg(null);
          setMetricsData(null);
        }}
        metrics={metricsData}
        isLoading={metricsLoading}
      />
    </div>
  );
};

export default AdminDashboard;

