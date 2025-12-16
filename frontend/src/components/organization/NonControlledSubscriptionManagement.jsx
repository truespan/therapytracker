import React, { useState, useEffect } from 'react';
import { organizationAPI, subscriptionPlanAPI } from '../../services/api';
import {
  CreditCard, Users, CheckCircle, XCircle, AlertCircle,
  Save, Trash2, Edit, Plus, Calendar, Loader, Building2
} from 'lucide-react';
import PlanSelectionModal from '../common/PlanSelectionModal';

const NonControlledSubscriptionManagement = ({ organizationId, organizationName }) => {
  const [partners, setPartners] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Plan selection modal state
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [organizationPlans, setOrganizationPlans] = useState([]);
  const [organizationTherapistCount, setOrganizationTherapistCount] = useState(0);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    if (organizationId) {
      loadData();
    }
  }, [organizationId]);

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

  const openPlanModalForPartner = async (partner) => {
    try {
      setLoadingPlans(true);
      setSelectedPartner(partner);
      setBulkMode(false);

      // Fetch organization details to get therapist count
      const orgResponse = await organizationAPI.getById(organizationId);
      const therapistCount = orgResponse.data.organization.number_of_therapists || partners.length;
      setOrganizationTherapistCount(therapistCount);

      // Fetch filtered organization plans based on therapist count
      const plansResponse = await subscriptionPlanAPI.getOrganizationPlansForSelection(therapistCount);
      setOrganizationPlans(plansResponse.data.plans || []);

      setShowPlanModal(true);
    } catch (err) {
      console.error('Failed to load organization plans:', err);
      setError(err.response?.data?.error || 'Failed to load subscription plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const openPlanModalForAll = async () => {
    try {
      setLoadingPlans(true);
      setSelectedPartner(null);
      setBulkMode(true);

      // Fetch organization details to get therapist count
      const orgResponse = await organizationAPI.getById(organizationId);
      const therapistCount = orgResponse.data.organization.number_of_therapists || partners.length;
      setOrganizationTherapistCount(therapistCount);

      // Fetch filtered organization plans based on therapist count
      const plansResponse = await subscriptionPlanAPI.getOrganizationPlansForSelection(therapistCount);
      setOrganizationPlans(plansResponse.data.plans || []);

      setShowPlanModal(true);
    } catch (err) {
      console.error('Failed to load organization plans:', err);
      setError(err.response?.data?.error || 'Failed to load subscription plans');
    } finally {
      setLoadingPlans(false);
    }
  };

  const handlePlanSelection = async (planId, billingPeriod) => {
    if (bulkMode) {
      await handleBulkAssignment(planId, billingPeriod);
    } else {
      await handleIndividualAssignment(planId, billingPeriod);
    }
  };

  const handleBulkAssignment = async (planId, billingPeriod) => {
    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      await organizationAPI.assignPartnerSubscriptionsToAll(organizationId, {
        subscription_plan_id: planId,
        billing_period: billingPeriod
      });

      setSuccessMessage(`Subscription plan assigned to all ${partners.length} therapist(s) successfully`);
      setShowPlanModal(false);
      setSelectedPartner(null);
      setBulkMode(false);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to assign plan to all partners:', err);
      setError(err.response?.data?.error || 'Failed to assign subscription plan to all partners');
      setShowPlanModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleIndividualAssignment = async (planId, billingPeriod) => {
    if (!selectedPartner) return;

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      await organizationAPI.assignPartnerSubscriptions(organizationId, {
        partner_ids: [selectedPartner.id],
        subscription_plan_id: planId,
        billing_period: billingPeriod
      });

      setSuccessMessage(`Subscription plan assigned to ${selectedPartner.name} successfully`);
      setShowPlanModal(false);
      setSelectedPartner(null);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to assign plan:', err);
      setError(err.response?.data?.error || 'Failed to assign subscription plan');
      setShowPlanModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubscriptions = async (subscriptionIds) => {
    if (!window.confirm('Are you sure you want to remove this subscription assignment?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      await organizationAPI.removePartnerSubscriptions(organizationId, {
        subscription_ids: subscriptionIds
      });

      setSuccessMessage('Subscription removed successfully');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to remove subscriptions:', err);
      setError(err.response?.data?.error || 'Failed to remove subscriptions');
    } finally {
      setSaving(false);
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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <CreditCard className="h-6 w-6 mr-2 text-indigo-600" />
            Therapist Subscription Management
          </h2>
          <p className="text-gray-600 mt-1">
            Assign subscription plans to therapists in your organization
          </p>
        </div>
        {partners.length > 0 && (
          <button
            onClick={openPlanModalForAll}
            disabled={loadingPlans || saving}
            className="btn btn-primary flex items-center space-x-2"
          >
            <CreditCard className="h-4 w-4" />
            <span>Apply to All Therapists</span>
          </button>
        )}
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Bulk Action Info */}
      {partners.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <Building2 className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Bulk Assignment Available</p>
              <p className="text-sm text-blue-700 mt-1">
                You can apply the same subscription plan to all {partners.length} therapist(s) at once, 
                or assign different plans to each therapist individually.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Partner List with Individual Select Buttons */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="h-5 w-5 mr-2 text-indigo-600" />
          Therapists ({partners.length})
        </h3>

        {partners.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>No therapists in your organization yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {partners.map((partner) => {
              const subscription = subscriptions.find(s => s.partner_id === partner.id);

              return (
                <div
                  key={partner.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {partner.name}
                        </h4>
                        {partner.partner_id && (
                          <span className="text-xs text-gray-500 font-mono">
                            (ID: {partner.partner_id})
                          </span>
                        )}
                      </div>
                      {subscription ? (
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Current Plan:</span>
                            <span className="font-medium text-indigo-600">
                              {subscription.plan_name}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-gray-600">Billing Period:</span>
                            <span className="font-medium text-gray-900">
                              {getBillingPeriodLabel(subscription.billing_period)}
                            </span>
                          </div>
                          {subscription.video_hours && (
                            <div className="flex items-center space-x-2">
                              <span className="text-gray-600">Video Hours:</span>
                              <span className="text-gray-900">
                                {subscription.video_hours} hrs/month
                              </span>
                            </div>
                          )}
                          {subscription.has_video && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                              Video Enabled
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No plan assigned</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => openPlanModalForPartner(partner)}
                        disabled={loadingPlans || saving}
                        className="btn btn-primary flex items-center space-x-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        <span>{subscription ? 'Change Plan' : 'Select Plan'}</span>
                      </button>
                      {subscription && (
                        <button
                          onClick={() => handleRemoveSubscriptions([subscription.id])}
                          disabled={saving}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Remove subscription"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Plan Selection Modal */}
      {showPlanModal && (
        <PlanSelectionModal
          currentPlanId={selectedPartner ? subscriptions.find(s => s.partner_id === selectedPartner.id)?.subscription_plan_id : null}
          plans={organizationPlans}
          userType="organization"
          onClose={() => {
            setShowPlanModal(false);
            setSelectedPartner(null);
            setBulkMode(false);
          }}
          onSelectPlan={handlePlanSelection}
          isBulkMode={bulkMode}
          organizationName={organizationName}
        />
      )}
    </div>
  );
};

export default NonControlledSubscriptionManagement;