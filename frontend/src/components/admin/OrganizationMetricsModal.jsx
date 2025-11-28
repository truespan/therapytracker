import React from 'react';
import { X, Users, UserCheck, Activity, CheckCircle, Clock, Calendar, TrendingUp } from 'lucide-react';

const OrganizationMetricsModal = ({ isOpen, onClose, metrics, isLoading }) => {
  if (!isOpen) return null;

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

  const StatCard = ({ icon: Icon, label, value, color = 'indigo' }) => (
    <div className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:border-indigo-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p className={`text-3xl font-bold text-${color}-600 mt-1`}>{value}</p>
        </div>
        <div className={`bg-${color}-100 p-3 rounded-full`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-indigo-600" />
              Organization Metrics
            </h2>
            {metrics?.organization && (
              <p className="text-sm text-gray-500 mt-1">{metrics.organization.name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : metrics ? (
            <div className="space-y-6">
              {/* Overview Stats */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Overview Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={UserCheck}
                    label="Total Partners"
                    value={metrics.metrics?.total_partners || 0}
                    color="blue"
                  />
                  <StatCard
                    icon={Users}
                    label="Total Clients"
                    value={metrics.metrics?.total_clients || 0}
                    color="green"
                  />
                  <StatCard
                    icon={Activity}
                    label="Total Sessions"
                    value={metrics.metrics?.total_sessions || 0}
                    color="purple"
                  />
                  <StatCard
                    icon={Calendar}
                    label="Sessions This Month"
                    value={metrics.metrics?.sessions_this_month || 0}
                    color="orange"
                  />
                </div>
              </div>

              {/* Session Breakdown */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-lg border-2 border-green-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-700">Completed Sessions</p>
                        <p className="text-3xl font-bold text-green-600 mt-1">
                          {metrics.metrics?.completed_sessions || 0}
                        </p>
                      </div>
                      <div className="bg-green-200 p-3 rounded-full">
                        <CheckCircle className="h-6 w-6 text-green-700" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 rounded-lg border-2 border-amber-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-amber-700">Active Sessions</p>
                        <p className="text-3xl font-bold text-amber-600 mt-1">
                          {metrics.metrics?.active_sessions || 0}
                        </p>
                      </div>
                      <div className="bg-amber-200 p-3 rounded-full">
                        <Clock className="h-6 w-6 text-amber-700" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Partner Breakdown */}
              {metrics.partnerBreakdown && metrics.partnerBreakdown.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Partner Breakdown</h3>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Partner Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Partner ID
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Clients
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Total Sessions
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Completed
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              This Month
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {metrics.partnerBreakdown.map((partner) => (
                            <tr key={partner.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                                {partner.email && (
                                  <div className="text-sm text-gray-500">{partner.email}</div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                  {partner.partner_id}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-semibold text-gray-900">
                                  {partner.total_clients || 0}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-semibold text-gray-900">
                                  {partner.total_sessions || 0}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {partner.completed_sessions || 0}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="text-sm font-semibold text-orange-600">
                                  {partner.sessions_this_month || 0}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">No partners found for this organization</p>
                </div>
              )}

              {/* Organization Details */}
              {metrics.organization && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Organization Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-sm font-medium text-gray-900">{metrics.organization.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Contact</p>
                      <p className="text-sm font-medium text-gray-900">{metrics.organization.contact}</p>
                    </div>
                    {metrics.organization.subscription_plan && (
                      <div>
                        <p className="text-sm text-gray-600">Subscription Plan</p>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {getPlanDisplayName(metrics.organization.subscription_plan)}
                        </span>
                      </div>
                    )}
                    {metrics.organization.gst_no && (
                      <div>
                        <p className="text-sm text-gray-600">GST Number</p>
                        <p className="text-sm font-medium text-gray-900">{metrics.organization.gst_no}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No metrics data available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrganizationMetricsModal;

