import React, { useState, useEffect } from 'react';
import { subscriptionPlanAPI } from '../../services/api';
import { Plus, Edit2, Trash2, Save, X, AlertCircle, CheckCircle, Check, X as XIcon } from 'lucide-react';

const SubscriptionPlansTab = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Default plan state
  const [defaultPlan, setDefaultPlan] = useState(null);
  const [selectedDefaultPlan, setSelectedDefaultPlan] = useState('');
  const [savingDefault, setSavingDefault] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    plan_name: '',
    plan_type: 'individual',
    min_sessions: '0',
    max_sessions: '',
    has_video: false,
    has_whatsapp: false,
    has_advanced_assessments: false,
    has_report_generation: false,
    has_custom_branding: false,
    has_advanced_analytics: false,
    has_blogs_events_announcements: false,
    has_customized_feature_support: false,
    has_priority_support: false,
    has_email_support: false,
    min_therapists: '',
    max_therapists: '',
    plan_order: '',
    plan_duration_days: '',
    individual_yearly_price: '',
    individual_quarterly_price: '',
    individual_monthly_price: '',
    organization_yearly_price: '',
    organization_quarterly_price: '',
    organization_monthly_price: '',
    is_active: true,
    individual_yearly_enabled: true,
    individual_quarterly_enabled: true,
    individual_monthly_enabled: true,
    organization_yearly_enabled: true,
    organization_quarterly_enabled: true,
    organization_monthly_enabled: true
  });

  useEffect(() => {
    loadPlans();
    loadDefaultPlan();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const response = await subscriptionPlanAPI.getAll();
      setPlans(response.data.plans || []);
    } catch (err) {
      console.error('Failed to load subscription plans:', err);
      setError('Failed to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultPlan = async () => {
    try {
      const response = await subscriptionPlanAPI.getDefaultPlan();
      if (response.data.default_plan) {
        setDefaultPlan(response.data.default_plan);
        setSelectedDefaultPlan(response.data.default_plan.id.toString());
      }
    } catch (err) {
      console.error('Failed to load default plan:', err);
    }
  };

  const handleSaveDefaultPlan = async () => {
    try {
      setSavingDefault(true);
      await subscriptionPlanAPI.setDefaultPlan(selectedDefaultPlan ? parseInt(selectedDefaultPlan) : null);
      setSuccess('Default subscription plan updated successfully');
      loadDefaultPlan();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update default plan');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSavingDefault(false);
    }
  };

  const resetForm = () => {
    setFormData({
      plan_name: '',
      plan_type: 'individual',
      min_sessions: '0',
      max_sessions: '',
      has_video: false,
      has_whatsapp: false,
      has_advanced_assessments: false,
      has_report_generation: false,
      has_custom_branding: false,
      has_advanced_analytics: false,
      has_blogs_events_announcements: false,
      has_customized_feature_support: false,
      has_priority_support: false,
      has_email_support: false,
      min_therapists: '',
      max_therapists: '',
      plan_order: '',
      plan_duration_days: '',
      individual_yearly_price: '',
      individual_quarterly_price: '',
      individual_monthly_price: '',
      organization_yearly_price: '',
      organization_quarterly_price: '',
      organization_monthly_price: '',
      is_active: true,
      individual_yearly_enabled: true,
      individual_quarterly_enabled: true,
      individual_monthly_enabled: true,
      organization_yearly_enabled: true,
      organization_quarterly_enabled: true,
      organization_monthly_enabled: true
    });
    setError(null);
    setSuccess(null);
  };

  const handleCreate = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEdit = (plan) => {
    setEditingPlan(plan);

    // For Free Plan, force disable quarterly/yearly options
    const isFreePlan = plan.plan_name && plan.plan_name.toLowerCase() === 'free plan';

    setFormData({
      plan_name: plan.plan_name || '',
      plan_type: plan.plan_type || 'individual',
      min_sessions: plan.min_sessions !== null && plan.min_sessions !== undefined ? plan.min_sessions : '0',
      max_sessions: plan.max_sessions !== null && plan.max_sessions !== undefined ? plan.max_sessions : '',
      has_video: plan.has_video || false,
      has_whatsapp: plan.has_whatsapp || false,
      has_advanced_assessments: plan.has_advanced_assessments || false,
      has_report_generation: plan.has_report_generation || false,
      has_custom_branding: plan.has_custom_branding || false,
      has_advanced_analytics: plan.has_advanced_analytics || false,
      has_blogs_events_announcements: plan.has_blogs_events_announcements || false,
      has_customized_feature_support: plan.has_customized_feature_support || false,
      has_priority_support: plan.has_priority_support || false,
      has_email_support: plan.has_email_support || false,
      min_therapists: plan.min_therapists || '',
      max_therapists: plan.max_therapists || '',
      plan_order: plan.plan_order || '',
      plan_duration_days: plan.plan_duration_days || '',
      individual_yearly_price: plan.individual_yearly_price || '',
      individual_quarterly_price: plan.individual_quarterly_price || '',
      individual_monthly_price: plan.individual_monthly_price || '',
      organization_yearly_price: plan.organization_yearly_price || '',
      organization_quarterly_price: plan.organization_quarterly_price || '',
      organization_monthly_price: plan.organization_monthly_price || '',
      is_active: plan.is_active !== undefined ? plan.is_active : true,
      individual_yearly_enabled: isFreePlan ? false : (plan.individual_yearly_enabled !== undefined ? plan.individual_yearly_enabled : true),
      individual_quarterly_enabled: isFreePlan ? false : (plan.individual_quarterly_enabled !== undefined ? plan.individual_quarterly_enabled : true),
      individual_monthly_enabled: plan.individual_monthly_enabled !== undefined ? plan.individual_monthly_enabled : true,
      organization_yearly_enabled: isFreePlan ? false : (plan.organization_yearly_enabled !== undefined ? plan.organization_yearly_enabled : true),
      organization_quarterly_enabled: isFreePlan ? false : (plan.organization_quarterly_enabled !== undefined ? plan.organization_quarterly_enabled : true),
      organization_monthly_enabled: plan.organization_monthly_enabled !== undefined ? plan.organization_monthly_enabled : true
    });
    setShowEditModal(true);
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Are you sure you want to delete "${plan.plan_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await subscriptionPlanAPI.delete(plan.id);
      setSuccess('Plan deleted successfully');
      await loadPlans();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to delete plan:', err);
      setError(err.response?.data?.error || 'Failed to delete plan. Please try again.');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form
      if (!formData.plan_name || formData.plan_name.trim() === '') {
        setError('Plan name is required');
        setSaving(false);
        return;
      }

      if (formData.min_sessions === null || formData.min_sessions === undefined || formData.min_sessions === '') {
        setError('Min sessions is required');
        setSaving(false);
        return;
      }

      if (parseInt(formData.min_sessions) < 0) {
        setError('Min sessions must be >= 0');
        setSaving(false);
        return;
      }

      if (formData.max_sessions && parseInt(formData.max_sessions) < parseInt(formData.min_sessions)) {
        setError('Invalid session limits. Max must be >= min, or leave empty for unlimited');
        setSaving(false);
        return;
      }

      // Validate organization plan therapist ranges
      if (formData.plan_type === 'organization') {
        if (!formData.min_therapists || !formData.max_therapists) {
          setError('Organization plans require therapist range (min and max therapists)');
          setSaving(false);
          return;
        }
        if (parseInt(formData.min_therapists) < 1 || parseInt(formData.max_therapists) < parseInt(formData.min_therapists)) {
          setError('Invalid therapist range. Max must be >= min, and min must be >= 1');
          setSaving(false);
          return;
        }
      }


      // Validate all prices
      const priceFields = [
        'individual_yearly_price',
        'individual_quarterly_price',
        'individual_monthly_price',
        'organization_yearly_price',
        'organization_quarterly_price',
        'organization_monthly_price'
      ];

      for (const field of priceFields) {
        if (!formData[field] || parseFloat(formData[field]) < 0) {
          setError(`All price fields are required and must be >= 0`);
          setSaving(false);
          return;
        }
      }

      // Prepare data
      const submitData = {
        plan_name: formData.plan_name,
        plan_type: formData.plan_type,
        min_sessions: parseInt(formData.min_sessions),
        max_sessions: formData.max_sessions ? parseInt(formData.max_sessions) : null,
        has_video: formData.has_video,
        has_whatsapp: formData.has_whatsapp,
        has_advanced_assessments: formData.has_advanced_assessments,
        has_report_generation: formData.has_report_generation,
        has_custom_branding: formData.has_custom_branding,
        has_advanced_analytics: formData.has_advanced_analytics,
        has_blogs_events_announcements: formData.has_blogs_events_announcements,
        has_customized_feature_support: formData.has_customized_feature_support,
        has_priority_support: formData.has_priority_support,
        has_email_support: formData.has_email_support,
        plan_order: formData.plan_order ? parseInt(formData.plan_order) : 0,
        plan_duration_days: formData.plan_duration_days ? parseInt(formData.plan_duration_days) : null,
        individual_yearly_price: parseFloat(formData.individual_yearly_price),
        individual_quarterly_price: parseFloat(formData.individual_quarterly_price),
        individual_monthly_price: parseFloat(formData.individual_monthly_price),
        organization_yearly_price: parseFloat(formData.organization_yearly_price),
        organization_quarterly_price: parseFloat(formData.organization_quarterly_price),
        organization_monthly_price: parseFloat(formData.organization_monthly_price),
        is_active: formData.is_active,
        individual_yearly_enabled: formData.individual_yearly_enabled,
        individual_quarterly_enabled: formData.individual_quarterly_enabled,
        individual_monthly_enabled: formData.individual_monthly_enabled,
        organization_yearly_enabled: formData.organization_yearly_enabled,
        organization_quarterly_enabled: formData.organization_quarterly_enabled,
        organization_monthly_enabled: formData.organization_monthly_enabled
      };


      // Add therapist range for organization plans
      if (formData.plan_type === 'organization') {
        submitData.min_therapists = parseInt(formData.min_therapists);
        submitData.max_therapists = parseInt(formData.max_therapists);
      } else {
        submitData.min_therapists = null;
        submitData.max_therapists = null;
      }

      if (editingPlan) {
        await subscriptionPlanAPI.update(editingPlan.id, submitData);
        setSuccess('Plan updated successfully');
      } else {
        await subscriptionPlanAPI.create(submitData);
        setSuccess('Plan created successfully');
      }

      await loadPlans();
      resetForm();
      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingPlan(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save plan:', err);
      setError(err.response?.data?.error || 'Failed to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Special handling for Free Plan - prevent enabling quarterly/yearly
    if (formData.plan_name && formData.plan_name.toLowerCase() === 'free plan') {
      if (name === 'individual_yearly_enabled' || name === 'individual_quarterly_enabled' ||
          name === 'organization_yearly_enabled' || name === 'organization_quarterly_enabled') {
        // Force these to remain false for Free Plan
        setFormData(prev => ({
          ...prev,
          [name]: false
        }));
        return;
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formatPrice = (price) => {
    if (!price) return '₹0.00';
    return `₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Plans</h1>
          <p className="text-gray-600 mt-1">Manage subscription plans and pricing</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-primary-700 text-white px-6 py-3 rounded-lg hover:bg-primary-800 transition-colors flex items-center space-x-2 font-medium shadow-md"
        >
          <Plus className="h-5 w-5" />
          <span>Create Plan</span>
        </button>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Default Subscription Plan Configuration */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
          Default Subscription Plan
        </h3>
        <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
          Select the default plan for new TheraPTrack-controlled therapists and non-controlled organizations.
          <br />
          <span className="font-medium text-blue-700 dark:text-blue-400">
            Only applicable for TheraPTrack controlled Therapist and Other Organizations account creation
          </span>
        </p>
        
        <div className="flex items-center space-x-4">
          <select
            value={selectedDefaultPlan}
            onChange={(e) => setSelectedDefaultPlan(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="">No Default (Use Free Plan)</option>
            {plans
              .filter(plan => {
                const isFreePlan = plan.plan_name.toLowerCase().includes('free');
                const isTrialPlan = plan.plan_duration_days && plan.plan_duration_days > 0;
                return isFreePlan || isTrialPlan;
              })
              .map(plan => (
                <option key={plan.id} value={plan.id}>
                  {plan.plan_name}
                  {plan.plan_duration_days ? ` (${plan.plan_duration_days} days trial)` : ''}
                </option>
              ))}
          </select>
          
          <button
            onClick={handleSaveDefaultPlan}
            disabled={savingDefault}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {savingDefault ? 'Saving...' : 'Save Default'}
          </button>
        </div>
        
        {defaultPlan && (
          <div className="mt-3 text-sm text-gray-700 dark:text-dark-text-secondary">
            Current default: <span className="font-semibold">{defaultPlan.plan_name}</span>
          </div>
        )}
      </div>

      {/* Plans Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan Name
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Video
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Therapist Range
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Individual (Monthly)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Organization (Monthly)
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {plans.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-12 text-center">
                    <p className="text-gray-600">No subscription plans found. Create your first plan to get started.</p>
                  </td>
                </tr>
              ) : (
                plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900 font-medium">{plan.plan_order || 0}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{plan.plan_name}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        plan.plan_type === 'organization'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {plan.plan_type === 'organization' ? 'Org' : 'Ind'}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">
                        {plan.max_sessions === null || plan.max_sessions === undefined || plan.max_sessions >= 999999 
                          ? 'Unlimited Sessions' 
                          : `${plan.min_sessions} - ${plan.max_sessions} sessions`}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {plan.has_video ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {plan.plan_type === 'organization' && plan.min_therapists && plan.max_therapists ? (
                        <div className="text-sm text-gray-900">
                          {plan.min_therapists} - {plan.max_therapists}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{formatPrice(plan.individual_monthly_price)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-900">{formatPrice(plan.organization_monthly_price)}</div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      {plan.is_active ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="text-primary-700 hover:text-primary-900 p-1 rounded hover:bg-primary-50"
                          title="Edit"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(plan)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete"
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

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-bg-secondary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                {editingPlan ? 'Edit Subscription Plan' : 'Create Subscription Plan'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setEditingPlan(null);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 dark:bg-dark-bg-secondary">
              {/* Plan Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Plan Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="plan_name"
                  value={formData.plan_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                  placeholder="e.g., Plan 1, Plan 2"
                  required
                />
              </div>

              {/* Plan Type and Order */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Plan Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="plan_type"
                    value={formData.plan_type}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                    required
                  >
                    <option value="individual">Individual</option>
                    <option value="organization">Organization</option>
                    <option value="common">Common (Both)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Display Order
                  </label>
                  <input
                    type="number"
                    name="plan_order"
                    value={formData.plan_order}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>

              {/* Session Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Min Sessions <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="min_sessions"
                    value={formData.min_sessions}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                    Max Sessions {formData.max_sessions === '' || formData.max_sessions === null ? '(Unlimited)' : ''}
                  </label>
                  <input
                    type="number"
                    name="max_sessions"
                    value={formData.max_sessions}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                    placeholder="Leave empty for unlimited"
                    min="0"
                  />
                </div>
              </div>

              {/* Plan Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Plan Duration (Days)
                </label>
                <input
                  type="number"
                  name="plan_duration_days"
                  value={formData.plan_duration_days}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                  placeholder="Leave empty for no limit (e.g., 7 for Free Plan)"
                  min="1"
                />
              </div>

              {/* Feature Summary Box */}
              <div className="bg-gray-50 dark:bg-dark-bg-tertiary border border-gray-200 dark:border-dark-border rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary mb-3">Plan Features Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    { key: 'has_video', label: 'Video Feature' },
                    { key: 'has_whatsapp', label: 'WhatsApp' },
                    { key: 'has_advanced_assessments', label: 'Advanced Assessments' },
                    { key: 'has_report_generation', label: 'Report Generation' },
                    { key: 'has_custom_branding', label: 'Custom Branding' },
                    { key: 'has_advanced_analytics', label: 'Advanced Analytics' },
                    { key: 'has_blogs_events_announcements', label: 'Blogs, Events & Announcements' },
                    { key: 'has_customized_feature_support', label: 'Customized Feature Support' },
                    { key: 'has_priority_support', label: 'Priority Support' },
                    { key: 'has_email_support', label: 'Chat and Email Support' }
                  ].map((feature) => (
                    <div key={feature.key} className="flex items-center space-x-2">
                      {formData[feature.key] ? (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <XIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className={`text-sm ${formData[feature.key] ? 'text-green-700 dark:text-green-300 font-medium' : 'text-red-700 dark:text-red-300'}`}>
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Feature Toggles */}
              <div className="border-t border-gray-200 dark:border-dark-border pt-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Feature Toggles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_video"
                      checked={formData.has_video}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Video Feature</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_whatsapp"
                      checked={formData.has_whatsapp}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">WhatsApp</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_advanced_assessments"
                      checked={formData.has_advanced_assessments}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Advanced Assessments</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_report_generation"
                      checked={formData.has_report_generation}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Report Generation</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_custom_branding"
                      checked={formData.has_custom_branding}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Custom Branding</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_advanced_analytics"
                      checked={formData.has_advanced_analytics}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Advanced Analytics</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_blogs_events_announcements"
                      checked={formData.has_blogs_events_announcements}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Blogs, Events & Announcements</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_customized_feature_support"
                      checked={formData.has_customized_feature_support}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Customized Feature Support</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_priority_support"
                      checked={formData.has_priority_support}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Priority Support</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer p-2 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
                    <input
                      type="checkbox"
                      name="has_email_support"
                      checked={formData.has_email_support}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Chat and Email Support</span>
                  </label>
                </div>
              </div>


              {/* Therapist Range (conditional on plan_type=organization) */}
              {formData.plan_type === 'organization' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Min Therapists <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="min_therapists"
                      value={formData.min_therapists}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="2"
                      min="1"
                      required={formData.plan_type === 'organization'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Therapists <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="max_therapists"
                      value={formData.max_therapists}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="5"
                      min="1"
                      required={formData.plan_type === 'organization'}
                    />
                  </div>
                </div>
              )}

              {/* Individual Therapist Prices */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Individual Therapist Prices</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yearly <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        name="individual_yearly_price"
                        value={formData.individual_yearly_price}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        name="individual_yearly_enabled"
                        checked={formData.individual_yearly_enabled}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-xs text-gray-600">
                        Enable Yearly Billing
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quarterly <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        name="individual_quarterly_price"
                        value={formData.individual_quarterly_price}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        name="individual_quarterly_enabled"
                        checked={formData.individual_quarterly_enabled}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-xs text-gray-600">
                        Enable Quarterly Billing
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        name="individual_monthly_price"
                        value={formData.individual_monthly_price}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        name="individual_monthly_enabled"
                        checked={formData.individual_monthly_enabled}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                        disabled
                      />
                      <label className="ml-2 block text-xs text-gray-600">
                        Enable Monthly Billing (Always Enabled)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Organization Prices */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Organization Prices (per Therapist)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Yearly <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        name="organization_yearly_price"
                        value={formData.organization_yearly_price}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        name="organization_yearly_enabled"
                        checked={formData.organization_yearly_enabled}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-xs text-gray-600">
                        Enable Yearly Billing
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quarterly <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        name="organization_quarterly_price"
                        value={formData.organization_quarterly_price}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        name="organization_quarterly_enabled"
                        checked={formData.organization_quarterly_enabled}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-xs text-gray-600">
                        Enable Quarterly Billing
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                      <input
                        type="number"
                        name="organization_monthly_price"
                        value={formData.organization_monthly_price}
                        onChange={handleChange}
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        required
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        name="organization_monthly_enabled"
                        checked={formData.organization_monthly_enabled}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                        disabled
                      />
                      <label className="ml-2 block text-xs text-gray-600">
                        Enable Monthly Billing (Always Enabled)
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-dark-text-secondary">
                  Plan is Active
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setEditingPlan(null);
                    resetForm();
                  }}
                  className="px-6 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : editingPlan ? 'Update Plan' : 'Create Plan'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPlansTab;





