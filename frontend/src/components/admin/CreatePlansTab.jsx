import React, { useState } from 'react';
import { subscriptionPlanAPI } from '../../services/api';
import { Save, X, AlertCircle, CheckCircle, Eye, FileText, RefreshCw } from 'lucide-react';

const CreatePlansTab = () => {
  const [saving, setSaving] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    plan_name: '',
    plan_type: 'individual',
    min_sessions: '0',
    max_sessions: '',
    unlimited_sessions: false,
    has_video: false,
    has_whatsapp: false,
    has_advanced_assessments: false,
    has_report_generation: false,
    has_custom_branding: false,
    has_advanced_analytics: false,
    has_priority_support: false,
    has_email_support: false,
    min_therapists: '',
    max_therapists: '',
    plan_order: '0',
    plan_duration_days: '',
    individual_yearly_price: '0.00',
    individual_quarterly_price: '0.00',
    individual_monthly_price: '0.00',
    organization_yearly_price: '0.00',
    organization_quarterly_price: '0.00',
    organization_monthly_price: '0.00',
    is_active: true,
    individual_yearly_enabled: true,
    individual_quarterly_enabled: true,
    individual_monthly_enabled: true,
    organization_yearly_enabled: true,
    organization_quarterly_enabled: true,
    organization_monthly_enabled: true
  });

  const resetForm = () => {
    setFormData({
      plan_name: '',
      plan_type: 'individual',
      min_sessions: '0',
      max_sessions: '',
      unlimited_sessions: false,
      has_video: false,
      has_whatsapp: false,
      has_advanced_assessments: false,
      has_report_generation: false,
      has_custom_branding: false,
      has_advanced_analytics: false,
      has_priority_support: false,
      has_email_support: false,
      min_therapists: '',
      max_therapists: '',
      plan_order: '0',
      plan_duration_days: '',
      individual_yearly_price: '0.00',
      individual_quarterly_price: '0.00',
      individual_monthly_price: '0.00',
      organization_yearly_price: '0.00',
      organization_quarterly_price: '0.00',
      organization_monthly_price: '0.00',
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
    setShowPreview(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // Handle unlimited sessions
      if (name === 'unlimited_sessions') {
        newData.max_sessions = checked ? '' : prev.max_sessions;
      }

      // Clear max_sessions when unlimited is checked
      if (name === 'unlimited_sessions' && checked) {
        newData.max_sessions = '';
      }

      // Clear therapist fields when switching away from organization
      if (name === 'plan_type' && value !== 'organization') {
        newData.min_therapists = '';
        newData.max_therapists = '';
      }


      return newData;
    });
  };

  const validateForm = () => {
    // Basic validation
    if (!formData.plan_name.trim()) {
      setError('Plan name is required');
      return false;
    }

    if (!formData.min_sessions || parseInt(formData.min_sessions) < 0) {
      setError('Min sessions must be >= 0');
      return false;
    }

    if (!formData.unlimited_sessions) {
      if (!formData.max_sessions || parseInt(formData.max_sessions) < parseInt(formData.min_sessions)) {
        setError('Max sessions must be >= min sessions');
        return false;
      }
    }

    // Validate organization plan therapist ranges
    if (formData.plan_type === 'organization') {
      if (!formData.min_therapists || !formData.max_therapists) {
        setError('Organization plans require min and max therapists');
        return false;
      }
      if (parseInt(formData.min_therapists) < 1 || parseInt(formData.max_therapists) < parseInt(formData.min_therapists)) {
        setError('Invalid therapist range. Max must be >= min, and min must be >= 1');
        return false;
      }
    }

    // Validate common plan - therapist fields should be empty
    if (formData.plan_type === 'common') {
      if (formData.min_therapists || formData.max_therapists) {
        setError('Common plans must have empty therapist ranges');
        return false;
      }
    }


    // Validate plan_duration_days if provided
    if (formData.plan_duration_days && (parseInt(formData.plan_duration_days) < 1 || !Number.isInteger(parseFloat(formData.plan_duration_days)))) {
      setError('Plan duration days must be a positive integer');
      return false;
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
        return false;
      }
    }

    return true;
  };

  const prepareSubmitData = () => {
    const submitData = {
      plan_name: formData.plan_name.trim(),
      plan_type: formData.plan_type,
      min_sessions: parseInt(formData.min_sessions),
      max_sessions: formData.unlimited_sessions ? null : parseInt(formData.max_sessions),
      has_video: formData.has_video,
      has_whatsapp: formData.has_whatsapp,
      has_advanced_assessments: formData.has_advanced_assessments,
      has_report_generation: formData.has_report_generation,
      has_custom_branding: formData.has_custom_branding,
      has_advanced_analytics: formData.has_advanced_analytics,
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

    return submitData;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!validateForm()) {
      setSaving(false);
      return;
    }

    setSaving(true);

    try {
      const submitData = prepareSubmitData();
      await subscriptionPlanAPI.create(submitData);
      setSuccess('Plan created successfully!');
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch (err) {
      console.error('Failed to create plan:', err);
      setError(err.response?.data?.error || 'Failed to create plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setError(null);
    setSuccess(null);

    if (!formData.plan_name.trim()) {
      setError('Plan name is required to save as draft');
      return;
    }

    setSavingDraft(true);

    try {
      const submitData = prepareSubmitData();
      submitData.is_active = false; // Draft plans are inactive
      await subscriptionPlanAPI.create(submitData);
      setSuccess('Draft saved successfully!');
      setTimeout(() => {
        resetForm();
      }, 2000);
    } catch (err) {
      console.error('Failed to save draft:', err);
      setError(err.response?.data?.error || 'Failed to save draft. Please try again.');
    } finally {
      setSavingDraft(false);
    }
  };

  const getFeatureList = () => {
    const features = [];
    if (formData.has_video) features.push('Video Feature');
    if (formData.has_whatsapp) features.push('WhatsApp');
    if (formData.has_advanced_assessments) features.push('Advanced Assessments');
    if (formData.has_report_generation) features.push('Report Generation');
    if (formData.has_custom_branding) features.push('Custom Branding');
    if (formData.has_advanced_analytics) features.push('Advanced Analytics');
    if (formData.has_priority_support) features.push('Priority Support');
    if (formData.has_email_support) features.push('Email Support');
    return features.length > 0 ? features : ['None'];
  };

  const formatPrice = (price) => {
    if (!price) return '₹0.00';
    return `₹${parseFloat(price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Create Subscription Plan</h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
          Configure all features and settings for a new subscription plan
        </p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-700 dark:text-green-300">{success}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md p-6 space-y-8">
        {/* Basic Information Section */}
        <div className="border-b border-gray-200 dark:border-dark-border pb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                placeholder="e.g., Pro Plan, Starter Plan"
                required
              />
            </div>
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
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                placeholder="0"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Session Limits Section */}
        <div className="border-b border-gray-200 dark:border-dark-border pb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Session Limits</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                Max Sessions
              </label>
              <input
                type="number"
                name="max_sessions"
                value={formData.max_sessions}
                onChange={handleChange}
                disabled={formData.unlimited_sessions}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary disabled:bg-gray-100 dark:disabled:bg-dark-bg-tertiary disabled:cursor-not-allowed"
                placeholder="100"
                min="0"
                required={!formData.unlimited_sessions}
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="unlimited_sessions"
                  checked={formData.unlimited_sessions}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Unlimited Sessions</span>
              </label>
            </div>
          </div>
        </div>

        {/* Plan Duration Section */}
        <div className="border-b border-gray-200 dark:border-dark-border pb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Plan Duration</h2>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Duration (Days)
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
            <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
              Optional: Set a duration limit in days (e.g., 7 for trial plans). Leave empty for unlimited duration.
            </p>
          </div>
        </div>

        {/* Feature Toggles Section */}
        <div className="border-b border-gray-200 dark:border-dark-border pb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Feature Toggles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_video"
                checked={formData.has_video}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Video Feature</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_whatsapp"
                checked={formData.has_whatsapp}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">WhatsApp</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_advanced_assessments"
                checked={formData.has_advanced_assessments}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Advanced Assessments</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_report_generation"
                checked={formData.has_report_generation}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Report Generation</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_custom_branding"
                checked={formData.has_custom_branding}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Custom Branding</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_advanced_analytics"
                checked={formData.has_advanced_analytics}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Advanced Analytics</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_priority_support"
                checked={formData.has_priority_support}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Priority Support</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer p-3 border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors">
              <input
                type="checkbox"
                name="has_email_support"
                checked={formData.has_email_support}
                onChange={handleChange}
                className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Email Support</span>
            </label>
          </div>
        </div>


        {/* Therapist Range Section (Conditional - Organization only) */}
        {formData.plan_type === 'organization' && (
          <div className="border-b border-gray-200 dark:border-dark-border pb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Therapist Range</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Min Therapists <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="min_therapists"
                  value={formData.min_therapists}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                  placeholder="2"
                  min="1"
                  required={formData.plan_type === 'organization'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Max Therapists <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="max_therapists"
                  value={formData.max_therapists}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                  placeholder="5"
                  min="1"
                  required={formData.plan_type === 'organization'}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pricing Configuration Section */}
        <div className="border-b border-gray-200 dark:border-dark-border pb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4">Pricing Configuration</h2>
          
          {/* Individual Therapist Prices */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text-primary mb-3">Individual Therapist Prices</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['yearly', 'quarterly', 'monthly'].map((period) => (
                <div key={period}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1 capitalize">
                    {period} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      name={`individual_${period}_price`}
                      value={formData[`individual_${period}_price`]}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      name={`individual_${period}_enabled`}
                      checked={formData[`individual_${period}_enabled`]}
                      onChange={handleChange}
                      disabled={period === 'monthly'}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label className={`ml-2 block text-xs ${period === 'monthly' ? 'text-gray-400' : 'text-gray-600 dark:text-dark-text-tertiary'}`}>
                      Enable {period.charAt(0).toUpperCase() + period.slice(1)} Billing {period === 'monthly' && '(Always Enabled)'}
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Organization Prices */}
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text-primary mb-3">Organization Prices (per Therapist)</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['yearly', 'quarterly', 'monthly'].map((period) => (
                <div key={period}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1 capitalize">
                    {period} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">₹</span>
                    <input
                      type="number"
                      name={`organization_${period}_price`}
                      value={formData[`organization_${period}_price`]}
                      onChange={handleChange}
                      className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="mt-2 flex items-center">
                    <input
                      type="checkbox"
                      name={`organization_${period}_enabled`}
                      checked={formData[`organization_${period}_enabled`]}
                      onChange={handleChange}
                      disabled={period === 'monthly'}
                      className="h-4 w-4 text-primary-700 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <label className={`ml-2 block text-xs ${period === 'monthly' ? 'text-gray-400' : 'text-gray-600 dark:text-dark-text-tertiary'}`}>
                      Enable {period.charAt(0).toUpperCase() + period.slice(1)} Billing {period === 'monthly' && '(Always Enabled)'}
                    </label>
                  </div>
                </div>
              ))}
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

        {/* Form Actions */}
        <div className="flex flex-wrap justify-between items-center gap-4 pt-6 border-t border-gray-200 dark:border-dark-border">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors flex items-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>{showPreview ? 'Hide Preview' : 'Show Preview'}</span>
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary transition-colors flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Reset Form</span>
            </button>
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={savingDraft || saving}
              className="px-6 py-2 border border-primary-600 text-primary-700 dark:text-primary-400 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="h-4 w-4" />
              <span>{savingDraft ? 'Saving...' : 'Save as Draft'}</span>
            </button>
            <button
              type="submit"
              disabled={saving || savingDraft}
              className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Creating...' : 'Create Plan'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-bg-secondary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Plan Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Plan Name</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">{formData.plan_name || 'Not set'}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Plan Type</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary capitalize">{formData.plan_type}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Session Limits</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">
                  {formData.min_sessions} - {formData.unlimited_sessions ? 'Unlimited' : formData.max_sessions || 'Not set'}
                </p>
              </div>
              {formData.plan_duration_days && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Duration</h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary">{formData.plan_duration_days} days</p>
                </div>
              )}
              {formData.plan_type === 'organization' && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Therapist Range</h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary">
                    {formData.min_therapists || 'Not set'} - {formData.max_therapists || 'Not set'}
                  </p>
                </div>
              )}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Enabled Features</h3>
                <ul className="list-disc list-inside text-gray-600 dark:text-dark-text-secondary">
                  {getFeatureList().map((feature, idx) => (
                    <li key={idx}>{feature}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Individual Pricing (Monthly)</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">{formatPrice(formData.individual_monthly_price)}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Organization Pricing (Monthly per Therapist)</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">{formatPrice(formData.organization_monthly_price)}</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Status</h3>
                <p className="text-gray-600 dark:text-dark-text-secondary">{formData.is_active ? 'Active' : 'Inactive'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreatePlansTab;

