import React, { useState, useEffect } from 'react';
import { organizationAPI, subscriptionPlanAPI } from '../../services/api';
import { 
  CreditCard, Users, CheckCircle, XCircle, AlertCircle, 
  Save, Trash2, Edit, Plus, Calendar, Loader
} from 'lucide-react';

const SubscriptionManagement = ({ organizationId, isTheraPTrackControlled }) => {
  const [partners, setPartners] = useState([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Assignment form state
  const [selectedPartners, setSelectedPartners] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState('monthly');
  const [showAssignForm, setShowAssignForm] = useState(false);

  // Edit state
  const [editingSubscription, setEditingSubscription] = useState(null);

  useEffect(() => {
    if (isTheraPTrackControlled && organizationId) {
      loadData();
    }
  }, [organizationId, isTheraPTrackControlled]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [partnersRes, plansRes, subscriptionsRes] = await Promise.all([
        organizationAPI.getPartners(organizationId),
        subscriptionPlanAPI.getActive(),
        organizationAPI.getPartnerSubscriptions(organizationId)
      ]);

      setPartners(partnersRes.data.partners || []);
      setSubscriptionPlans(plansRes.data.plans || []);
      setSubscriptions(subscriptionsRes.data.subscriptions || []);
    } catch (err) {
      console.error('Failed to load subscription data:', err);
      setError(err.response?.data?.error || 'Failed to load subscription data');
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerToggle = (partnerId) => {
    setSelectedPartners(prev => {
      if (prev.includes(partnerId)) {
        return prev.filter(id => id !== partnerId);
      } else {
        return [...prev, partnerId];
      }
    });
  };

  const handleAssignSubscriptions = async () => {
    if (selectedPartners.length === 0) {
      setError('Please select at least one therapist');
      return;
    }

    if (!selectedPlanId) {
      setError('Please select a subscription plan');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      await organizationAPI.assignPartnerSubscriptions(organizationId, {
        partner_ids: selectedPartners,
        subscription_plan_id: parseInt(selectedPlanId),
        billing_period: selectedBillingPeriod
      });

      setSuccessMessage(`Subscription assigned to ${selectedPartners.length} therapist(s) successfully`);
      setSelectedPartners([]);
      setSelectedPlanId('');
      setSelectedBillingPeriod('monthly');
      setShowAssignForm(false);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to assign subscriptions:', err);
      setError(err.response?.data?.error || 'Failed to assign subscriptions');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!editingSubscription) return;

    if (!selectedPlanId) {
      setError('Please select a subscription plan');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      await organizationAPI.updatePartnerSubscription(
        organizationId,
        editingSubscription.id,
        {
          subscription_plan_id: parseInt(selectedPlanId),
          billing_period: selectedBillingPeriod
        }
      );

      setSuccessMessage('Subscription updated successfully');
      setEditingSubscription(null);
      setSelectedPlanId('');
      setSelectedBillingPeriod('monthly');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to update subscription:', err);
      setError(err.response?.data?.error || 'Failed to update subscription');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubscriptions = async (subscriptionIds) => {
    if (!window.confirm('Are you sure you want to remove these subscription assignments?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      await organizationAPI.removePartnerSubscriptions(organizationId, {
        subscription_ids: subscriptionIds
      });

      setSuccessMessage('Subscription assignments removed successfully');
      await loadData();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (err) {
      console.error('Failed to remove subscriptions:', err);
      setError(err.response?.data?.error || 'Failed to remove subscriptions');
    } finally {
      setSaving(false);
    }
  };

  const openEditForm = (subscription) => {
    setEditingSubscription(subscription);
    setSelectedPlanId(subscription.subscription_plan_id.toString());
    setSelectedBillingPeriod(subscription.billing_period);
    setShowAssignForm(false);
  };

  const cancelEdit = () => {
    setEditingSubscription(null);
    setSelectedPlanId('');
    setSelectedBillingPeriod('monthly');
  };

  const getPlanName = (planId) => {
    const plan = subscriptionPlans.find(p => p.id === planId);
    return plan ? plan.plan_name : 'Unknown Plan';
  };

  const getBillingPeriodLabel = (period) => {
    const labels = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[period] || period;
  };

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
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <CreditCard className="h-6 w-6 mr-2 text-indigo-600" />
            Therapist Subscription Management
          </h2>
          <p className="text-gray-600 mt-1">
            Assign subscription plans to therapists in your organization
          </p>
        </div>
        {!showAssignForm && !editingSubscription && (
          <button
            onClick={() => setShowAssignForm(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>Assign Subscription</span>
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

      {/* Assign/Edit Form */}
      {(showAssignForm || editingSubscription) && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSubscription ? 'Edit Subscription' : 'Assign Subscription to Therapists'}
          </h3>

          {!editingSubscription && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Therapists <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-64 overflow-y-auto">
                {partners.length === 0 ? (
                  <p className="text-gray-500 text-sm">No therapists available</p>
                ) : (
                  <div className="space-y-2">
                    {partners.map((partner) => {
                      const hasSubscription = subscriptions.some(
                        s => s.partner_id === partner.id
                      );
                      return (
                        <label
                          key={partner.id}
                          className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPartners.includes(partner.id)}
                            onChange={() => handlePartnerToggle(partner.id)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">
                              {partner.name}
                            </span>
                            {partner.partner_id && (
                              <span className="text-xs text-gray-500 ml-2">
                                (ID: {partner.partner_id})
                              </span>
                            )}
                            {hasSubscription && (
                              <span className="text-xs text-green-600 ml-2">
                                (Has subscription)
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {editingSubscription && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Therapist:</p>
              <p className="font-medium text-gray-900">
                {editingSubscription.partner_name}
                {editingSubscription.partner_code && (
                  <span className="text-sm text-gray-500 ml-2">
                    (ID: {editingSubscription.partner_code})
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Plan <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select a plan</option>
              {subscriptionPlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.plan_name} ({plan.min_sessions} - {plan.max_sessions} sessions/month)
                  {plan.has_video ? ' - With Video' : ' - No Video'}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Billing Period <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBillingPeriod}
              onChange={(e) => setSelectedBillingPeriod(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={editingSubscription ? cancelEdit : () => setShowAssignForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={editingSubscription ? handleUpdateSubscription : handleAssignSubscriptions}
              disabled={saving || !selectedPlanId || (!editingSubscription && selectedPartners.length === 0)}
              className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : editingSubscription ? 'Update' : 'Assign'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Current Subscriptions */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-indigo-600" />
          Current Subscriptions ({subscriptions.length})
        </h3>

        {subscriptions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <p>No subscription assignments yet</p>
            <p className="text-sm mt-2">Click "Assign Subscription" to get started</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subscriptions.map((subscription) => (
              <div
                key={subscription.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        {subscription.partner_name}
                      </h4>
                      {subscription.partner_code && (
                        <span className="text-xs text-gray-500 font-mono">
                          (ID: {subscription.partner_code})
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Plan:</span>
                        <span className="font-medium text-gray-900">
                          {subscription.plan_name}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">Billing Period:</span>
                        <span className="font-medium text-gray-900">
                          {getBillingPeriodLabel(subscription.billing_period)}
                        </span>
                      </div>
                      {subscription.min_sessions !== null && subscription.max_sessions !== null && (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">Sessions:</span>
                          <span className="text-gray-900">
                            {subscription.min_sessions} - {subscription.max_sessions} per month
                          </span>
                        </div>
                      )}
                      {subscription.has_video && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Video Enabled
                        </span>
                      )}
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" />
                        <span>
                          Assigned: {new Date(subscription.assigned_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => openEditForm(subscription)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Edit subscription"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveSubscriptions([subscription.id])}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove subscription"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionManagement;


