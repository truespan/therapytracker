import React, { useState, useEffect, useMemo } from 'react';
import { organizationAPI } from '../../services/api';
import {
  CreditCard, Users, CheckCircle, XCircle, AlertCircle,
  Loader, Filter
} from 'lucide-react';

const SubscriptionManagement = ({ organizationId, isTheraPTrackControlled }) => {
  const [partners, setPartners] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('all');

  useEffect(() => {
    if (isTheraPTrackControlled && organizationId) {
      loadData();
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

  // Note: For TheraPTrack controlled orgs, organizations can only view therapist subscriptions
  // Therapists select their own plans, so no assignment/removal functions needed here

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

  // Filter partners based on selected plan
  const filteredPartners = useMemo(() => {
    if (selectedPlanFilter === 'all') {
      return partners;
    }
    if (selectedPlanFilter === 'no_plan') {
      return partners.filter(partner => {
        const subscription = subscriptions.find(s => s.partner_id === partner.id);
        return !subscription || !subscription.plan_name;
      });
    }
    return partners.filter(partner => {
      const subscription = subscriptions.find(s => s.partner_id === partner.id);
      return subscription && subscription.plan_name === selectedPlanFilter;
    });
  }, [partners, subscriptions, selectedPlanFilter]);

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
            View subscription plans assigned to therapists in your organization. Therapists select their own subscription plans.
          </p>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-300">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
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

      {/* Partner List with Individual Select Buttons */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary flex items-center">
            <Users className="h-5 w-5 mr-2 text-indigo-600 dark:text-dark-primary-500" />
            Therapists ({filteredPartners.length}{partners.length !== filteredPartners.length ? ` of ${partners.length}` : ''})
          </h3>
          
          {/* Filter Dropdown */}
          {partners.length > 0 && (
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
            <p>No therapists found with the selected plan filter</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPartners.map((partner) => {
              const subscription = subscriptions.find(s => s.partner_id === partner.id);

              return (
                <div
                  key={partner.id}
                  className="border border-gray-200 dark:border-dark-border rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-dark-bg-secondary"
                >
                  <div className="flex items-center justify-between">
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
                          {subscription.video_hours && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600 dark:text-dark-text-secondary">Video Hours:</span>
                              <span className="text-gray-900 dark:text-dark-text-primary">
                                {subscription.video_hours} hrs/month
                              </span>
                            </div>
                          )}
                          {subscription.has_video && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 mt-1">
                              Video Enabled
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-dark-text-tertiary">No plan assigned</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-dark-border space-y-1 text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 dark:text-dark-text-secondary">Therapist account created:</span>
                          <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                            {formatDateTime(partner.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 dark:text-dark-text-secondary">System last used:</span>
                          <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                            {formatDateTime(partner.last_login || partner.last_session_date)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600 dark:text-dark-text-secondary">Login success:</span>
                          <span className={`font-medium ${
                            partner.is_active && partner.email_verified 
                              ? 'text-green-600 dark:text-green-400' 
                              : 'text-red-600 dark:text-red-400'
                          }`}>
                            {partner.is_active && partner.email_verified ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* For TheraPTrack controlled orgs: View only, no change/remove buttons */}
                    {/* Organizations can only view therapist plans, therapists select their own plans */}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* No plan selection modal for TheraPTrack controlled orgs - view only */}
    </div>
  );
};

export default SubscriptionManagement;




















