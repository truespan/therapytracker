import React, { useState, useEffect, useMemo } from 'react';
import { organizationAPI } from '../../services/api';
import api from '../../services/api';
import {
  CreditCard, Users, CheckCircle, XCircle, AlertCircle,
  Loader, Filter, Gift, X, Search
} from 'lucide-react';
import { detectUserLocale } from '../../utils/localeDetection';

const SubscriptionManagement = ({ organizationId, isTheraPTrackControlled, disableTherapistPlanChange }) => {
  const [partners, setPartners] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [trialPlans, setTrialPlans] = useState([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [selectedTrialPlan, setSelectedTrialPlan] = useState(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (isTheraPTrackControlled && organizationId) {
      loadData();
      loadTrialPlans();
    }
  }, [organizationId, isTheraPTrackControlled]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [partnersRes, subscriptionsRes] = await Promise.all([
        organizationAPI.getPartners(organizationId),
        organizationAPI.getPartnerSubscriptions(organizationId)
      ]);

      setPartners(partnersRes.data.partners || []);
      setSubscriptions(subscriptionsRes.data.subscriptions || []);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError(err.response?.data?.error || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const loadTrialPlans = async () => {
    try {
      // Detect user locale
      const { locale, countryCode } = detectUserLocale();
      
      // Use /active endpoint to get all active plans (not filtered by individual_monthly_enabled)
      // This ensures we get all trial plans including "1 Day Trial" even if individual_monthly_enabled is FALSE
      const response = await api.get('/subscription-plans/active', {
        params: {
          locale: locale,
          country_code: countryCode
        }
      });
      if (response.data.success) {
        // Filter to plans that have "Trial" word mentioned in their name
        // Use case-insensitive comparison
        const availablePlans = response.data.plans.filter(p => {
          const planName = (p.plan_name || '').toLowerCase().trim();
          return planName.includes('trial');
        });
        setTrialPlans(availablePlans);
      }
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  };

  const getBillingPeriodLabel = (period) => {
    const labels = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[period] || period;
  };

  // Format date and time for display
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Never';
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

  // Check if partner is eligible for trial (no plan, Free Plan, or trial plan only)
  // Partners on paid plans are NOT eligible
  const isEligibleForTrial = (partner) => {
    const subscription = subscriptions.find(s => s.partner_id === partner.id);
    if (!subscription) return true; // No plan - eligible
    
    const planName = (subscription.plan_name || '').toLowerCase().trim();
    const isFreePlan = planName === 'free plan';
    if (isFreePlan) return true; // Free Plan - eligible
    
    // Check if this is a trial plan by checking if it exists in trialPlans
    const isTrialPlan = trialPlans.some(tp => {
      const trialPlanName = (tp.plan_name || '').toLowerCase().trim();
      return trialPlanName === planName;
    });
    if (isTrialPlan) return true; // Trial plan - eligible
    
    // If it's not Free Plan and not a trial plan, it's a paid plan - NOT eligible
    return false;
  };

  // Handle plan assignment
  const handleAssignTrial = async () => {
    if (!selectedPartner || !selectedTrialPlan) return;

    try {
      setAssigning(true);
      setError('');
      
      const response = await organizationAPI.assignTrialPlan(
        organizationId,
        selectedPartner.id,
        selectedTrialPlan.id,
        'monthly' // Default billing period (monthly for both trial plans and Free Plan)
      );
      
      if (response.data.warning) {
        setSuccessMessage(`${response.data.message} - Warning: ${response.data.warning}`);
      } else {
        setSuccessMessage(response.data.message);
      }
      
      setShowAssignModal(false);
      setSelectedPartner(null);
      setSelectedTrialPlan(null);
      loadData(); // Refresh
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign plan');
    } finally {
      setAssigning(false);
    }
  };

  // Extract unique plan names from subscriptions
  const availablePlans = useMemo(() => {
    const planSet = new Set();
    subscriptions.forEach(sub => {
      if (sub.plan_name) {
        planSet.add(sub.plan_name);
      }
    });
    return Array.from(planSet).sort();
  }, [subscriptions]);

  // Filter partners based on selected plan and search query
  const filteredPartners = useMemo(() => {
    let filtered = partners;

    // First filter by plan
    if (selectedPlanFilter === 'no_plan') {
      filtered = partners.filter(partner => {
        const subscription = subscriptions.find(s => s.partner_id === partner.id);
        return !subscription || !subscription.plan_name;
      });
    } else if (selectedPlanFilter !== 'all') {
      filtered = partners.filter(partner => {
        const subscription = subscriptions.find(s => s.partner_id === partner.id);
        return subscription && subscription.plan_name === selectedPlanFilter;
      });
    }

    // Then filter by search query (case-insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(partner => {
        const name = (partner.name || '').toLowerCase();
        const partnerId = (partner.partner_id || '').toLowerCase();
        return name.includes(query) || partnerId.includes(query);
      });
    }

    return filtered;
  }, [partners, subscriptions, selectedPlanFilter, searchQuery]);

  if (!isTheraPTrackControlled) {
    return null;
  }

  if (loading) {
    return (
      <div className="card p-8 text-center">
        <Loader className="h-8 w-8 text-primary-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600">Loading subscription management...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <CreditCard className="h-6 w-6 mr-2 text-indigo-600 dark:text-dark-primary-500" />
            Therapist Subscription Management
          </h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            Change plans for therapists in your organization. You can assign Free Plan or trial plans. Therapists can also select their own subscription plans.
          </p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className="ml-auto">
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2 text-red-700 dark:text-red-300">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Partner List with Trial Assignment */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary flex items-center">
            <Users className="h-5 w-5 mr-2 text-indigo-600 dark:text-dark-primary-500" />
            Therapists ({filteredPartners.length}{partners.length !== filteredPartners.length ? ` of ${partners.length}` : ''})
          </h3>
          
          {/* Search and Filter Controls */}
          {partners.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-initial sm:min-w-[250px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-primary-500"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-dark-text-tertiary" />
                <select
                  value={selectedPlanFilter}
                  onChange={(e) => setSelectedPlanFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-dark-primary-500"
                >
                  <option value="all">All Plans</option>
                  <option value="no_plan">No Plan</option>
                  {availablePlans.map(plan => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {partners.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-dark-text-tertiary">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-dark-text-tertiary" />
            <p>No therapists in your organization yet</p>
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-dark-text-tertiary">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-dark-text-tertiary" />
            <p>
              {searchQuery.trim() 
                ? `No therapists found matching "${searchQuery}"`
                : 'No therapists found with the selected plan filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPartners.map((partner) => {
              const subscription = subscriptions.find(s => s.partner_id === partner.id);
              const eligible = isEligibleForTrial(partner);

              return (
                <div
                  key={partner.id}
                  className="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-dark-bg-secondary"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary">
                          {partner.name}
                        </h4>
                        {partner.partner_id && (
                          <span className="text-xs text-gray-500 dark:text-dark-text-tertiary font-mono">
                            (ID: {partner.partner_id})
                          </span>
                        )}
                      </div>
                      <div className="mb-2 text-sm">
                        <span className="text-gray-600 dark:text-dark-text-secondary">Last login:</span>
                        <span className="font-medium text-gray-900 dark:text-dark-text-primary ml-2">
                          {formatDateTime(partner.last_login)}
                        </span>
                      </div>
                      <div className="mb-2 text-sm">
                        <span className="text-gray-600 dark:text-dark-text-secondary">First login:</span>
                        <span className="font-medium text-gray-900 dark:text-dark-text-primary ml-2">
                          {formatDateTime(partner.first_login)}
                        </span>
                      </div>
                      {subscription ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600 dark:text-dark-text-secondary">Current Plan:</span>
                            <span className="font-medium text-indigo-600 dark:text-dark-primary-500">
                              {subscription.plan_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600 dark:text-dark-text-secondary">Billing Period:</span>
                            <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                              {getBillingPeriodLabel(subscription.billing_period)}
                            </span>
                          </div>
                          {subscription.subscription_start_date && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600 dark:text-dark-text-secondary">Plan start date and time:</span>
                              <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                                {formatDateTime(subscription.subscription_start_date)}
                              </span>
                            </div>
                          )}
                          {subscription.subscription_end_date && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600 dark:text-dark-text-secondary">Plan end date and time:</span>
                              <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                                {formatDateTime(subscription.subscription_end_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">No plan assigned</p>
                      )}
                    </div>
                    
                    {/* Plan Assignment Button */}
                    <div className="ml-4">
                      {eligible ? (
                        <button
                          onClick={() => {
                            setSelectedPartner(partner);
                            setShowAssignModal(true);
                          }}
                          disabled={disableTherapistPlanChange}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                            disableTherapistPlanChange
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                          title={disableTherapistPlanChange ? 'Plan change has been disabled for this organization' : ''}
                        >
                          <Gift className="h-4 w-4" />
                          <span>Change Plan</span>
                        </button>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-dark-text-tertiary italic">
                          On paid plan
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trial Assignment Modal */}
      {showAssignModal && selectedPartner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-primary rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                Change Plan
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedPartner(null);
                  setSelectedTrialPlan(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-primary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-2">
                Therapist: <span className="font-semibold">{selectedPartner.name}</span>
              </p>
            </div>

            {trialPlans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-2" />
                <p>No plans available</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Select Plan
                  </label>
                  <select
                    value={selectedTrialPlan?.id || ''}
                    onChange={(e) => {
                      const plan = trialPlans.find(p => p.id === parseInt(e.target.value));
                      setSelectedTrialPlan(plan);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select a plan --</option>
                    {trialPlans.map(plan => {
                      const planName = (plan.plan_name || '').trim();
                      const isFreePlan = planName.toLowerCase() === 'free plan';
                      const displayText = isFreePlan 
                        ? planName 
                        : `${planName} (${plan.plan_duration_days} days)`;
                      return (
                        <option key={plan.id} value={plan.id}>
                          {displayText}
                        </option>
                      );
                    })}
                  </select>
                  {selectedTrialPlan && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                      {(selectedTrialPlan.plan_name || '').toLowerCase().trim() === 'free plan'
                        ? 'Free Plan has no expiration date.'
                        : `This trial will expire in ${selectedTrialPlan.plan_duration_days} days from assignment.`
                      }
                    </p>
                  )}
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedPartner(null);
                      setSelectedTrialPlan(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-dark-border text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
                    disabled={assigning}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignTrial}
                    disabled={!selectedTrialPlan || assigning}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {assigning ? 'Changing...' : 'Change Plan'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManagement;
