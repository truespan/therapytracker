import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Mail, Phone, MapPin, FileText, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, Save, CreditCard, Users, Calculator } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import { googleCalendarAPI, organizationAPI, subscriptionPlanAPI } from '../../services/api';
import ChangePasswordSection from '../common/ChangePasswordSection';

const OrganizationSettings = () => {
  const { user, refreshUser } = useAuth();
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Subscription state
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [numberOfTherapists, setNumberOfTherapists] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [calculatedPrice, setCalculatedPrice] = useState(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [subscriptionSaving, setSubscriptionSaving] = useState(false);

  // Initialize form fields when user data is available
  useEffect(() => {
    if (user) {
      setContact(user.contact || '');
      setAddress(user.address || '');
      setNumberOfTherapists(user.number_of_therapists || '');
      setSelectedPlanId(user.subscription_plan_id || '');
      setBillingPeriod(user.subscription_billing_period || 'monthly');
      loadSubscriptionDetails();
      loadSubscriptionPlans();
    }
  }, [user]);

  // Reset billing period when plan changes to ensure it's valid
  useEffect(() => {
    if (selectedPlanId && subscriptionPlans.length > 0) {
      const availablePeriods = getAvailableBillingPeriods(selectedPlanId);
      if (!availablePeriods.includes(billingPeriod)) {
        setBillingPeriod('monthly'); // Reset to monthly if current period is not available
      }
    }
  }, [selectedPlanId, subscriptionPlans, billingPeriod]);

  const loadSubscriptionDetails = async () => {
    if (!user?.id) return;
    try {
      const response = await organizationAPI.getSubscriptionDetails(user.id);
      setSubscriptionDetails(response.data.subscription);
    } catch (err) {
      console.error('Failed to load subscription details:', err);
    }
  };

  const loadSubscriptionPlans = async () => {
    try {
      const response = await subscriptionPlanAPI.getActive();
      setSubscriptionPlans(response.data.plans || []);
    } catch (err) {
      console.error('Failed to load subscription plans:', err);
    }
  };

  const calculatePrice = async () => {
    if (!selectedPlanId || !numberOfTherapists || numberOfTherapists < 1) {
      setCalculatedPrice(null);
      return;
    }

    try {
      setSubscriptionLoading(true);
      const response = await organizationAPI.calculateSubscriptionPrice(user.id, {
        plan_id: selectedPlanId,
        number_of_therapists: parseInt(numberOfTherapists),
        billing_period: billingPeriod
      });
      setCalculatedPrice(response.data);
    } catch (err) {
      console.error('Failed to calculate price:', err);
      setCalculatedPrice(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const getAvailableBillingPeriods = (planId) => {
    console.log('Getting available periods for planId:', planId);
    console.log('Available plans:', subscriptionPlans);
    
    if (!planId) return ['monthly'];
    
    const plan = subscriptionPlans.find(p => {
      const match = p.id === parseInt(planId);
      console.log(`Comparing ${p.id} (${typeof p.id}) with ${parseInt(planId)} (${typeof parseInt(planId)}): ${match}`);
      return match;
    });
    
    console.log('Found plan:', plan);
    
    if (!plan) {
      console.log('No plan found, returning default monthly');
      return ['monthly']; // Default to monthly only
    }
    
    // Special handling for Free Plan - only monthly allowed
    if (plan.plan_name && plan.plan_name.toLowerCase() === 'free plan') {
      console.log('Free Plan detected, returning only monthly');
      return ['monthly'];
    }
    
    const periods = ['monthly']; // Always include monthly
    
    // Check organization-specific enable flags
    if (plan.organization_quarterly_enabled) {
      console.log('Quarterly enabled for organization');
      periods.push('quarterly');
    }
    if (plan.organization_yearly_enabled) {
      console.log('Yearly enabled for organization');
      periods.push('yearly');
    }
    
    console.log('Available periods:', periods);
    return periods;
  };

  const getBillingPeriodLabel = (period) => {
    const labels = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[period] || period;
  };

  useEffect(() => {
    if (selectedPlanId && numberOfTherapists && billingPeriod) {
      calculatePrice();
    } else {
      setCalculatedPrice(null);
    }
  }, [selectedPlanId, numberOfTherapists, billingPeriod]);

  const handleSubscriptionUpdate = async () => {
    if (!user?.id) return;

    setSubscriptionSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const updateData = {
        subscription_plan_id: selectedPlanId || null,
        number_of_therapists: numberOfTherapists ? parseInt(numberOfTherapists) : null,
        subscription_billing_period: billingPeriod || null
      };

      await organizationAPI.updateSubscription(user.id, updateData);
      setSuccessMessage('Subscription updated successfully!');
      await refreshUser();
      await loadSubscriptionDetails();
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Failed to update subscription:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to update subscription. Please try again.');
    } finally {
      setSubscriptionSaving(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Validate contact format if provided (should include country code)
      if (contact && contact.trim()) {
        const contactRegex = /^\+\d{1,3}\d{7,15}$/;
        if (!contactRegex.test(contact.trim())) {
          setErrorMessage('Invalid contact format. Must include country code (e.g., +911234567890)');
          setLoading(false);
          return;
        }
      }

      // Prepare update data - ensure both fields are explicitly sent
      const trimmedContact = contact.trim();
      const trimmedAddress = address.trim();
      
      const updateData = {
        // Always include contact field
        contact: trimmedContact || null,
        // Always include address field - use empty string instead of null for better compatibility
        address: trimmedAddress || ''
      };
      
      console.log('Updating organization with data:', updateData);
      console.log('Address value:', updateData.address, 'Type:', typeof updateData.address);
      
      await organizationAPI.update(user.id, updateData);

      setSuccessMessage('Settings saved successfully!');
      
      // Refresh user data to get updated values
      await refreshUser();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Failed to update organization settings:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    const currentContact = user?.contact || '';
    const currentAddress = user?.address || '';
    return contact !== currentContact || address !== currentAddress;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-indigo-600" />
            Organization Settings
          </h2>
          <p className="text-gray-600 mt-1">Manage your organization logo and view your information</p>
        </div>

        <div className="space-y-6">
          {/* Organization Logo Upload */}
          <ImageUpload
            currentImageUrl={user?.photo_url}
            onUpload={(photoUrl) => {
              // Refresh user data to update the context
              refreshUser();
            }}
            onDelete={() => {
              // Refresh user data to update the context
              refreshUser();
            }}
            label="Organization Logo"
            userType="organization"
            userId={user?.id}
            disabled={false}
          />

          {/* Organization Name - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={user?.name || ''}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Email - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={user?.email || ''}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Contact Number - Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="+911234567890"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <p className="text-gray-500 text-xs mt-1">Include country code (e.g., +91 for India)</p>
          </div>

          {/* Address - Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows="3"
                placeholder="Enter organization address"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end pt-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={loading || !hasChanges()}
              className={`btn btn-primary flex items-center space-x-2 ${
                loading || !hasChanges() ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Save className="h-4 w-4" />
              <span>{loading ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="ml-auto">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          <ChangePasswordSection />

          {/* GST Number - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={user?.gst_no || 'Not provided'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Subscription Section - Only show for non-TheraPTrack controlled organizations */}
          {!subscriptionDetails?.theraptrack_controlled && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center mb-4">
              <CreditCard className="h-6 w-6 mr-2 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">Subscription Management</h3>
            </div>

            {/* Current Subscription Plan */}
            {subscriptionDetails?.plan_name && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700">Current Plan: </span>
                    <span className="text-lg font-bold text-indigo-600">
                      {subscriptionDetails.plan_name}
                    </span>
                    {subscriptionDetails.min_sessions !== null && subscriptionDetails.max_sessions !== null && (
                      <span className="text-sm text-gray-600 ml-2">
                        ({subscriptionDetails.min_sessions} - {subscriptionDetails.max_sessions} sessions/month)
                      </span>
                    )}
                  </div>
                  {subscriptionDetails.has_video && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Video Enabled
                    </span>
                  )}
                </div>
                {subscriptionDetails.subscription_billing_period && (
                  <div className="mt-2 text-sm text-gray-600">
                    Billing Period: <span className="font-medium capitalize">{subscriptionDetails.subscription_billing_period}</span>
                  </div>
                )}
                {subscriptionDetails.subscription_start_date && (
                  <div className="mt-1 text-sm text-gray-600">
                    Start Date: {new Date(subscriptionDetails.subscription_start_date).toLocaleDateString()}
                  </div>
                )}
                {subscriptionDetails.subscription_end_date && (
                  <div className="mt-1 text-sm text-gray-600">
                    End Date: {new Date(subscriptionDetails.subscription_end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Subscription Plan Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription Plan
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

            {/* Number of Therapists */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Number of Therapists <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  value={numberOfTherapists}
                  onChange={(e) => setNumberOfTherapists(e.target.value)}
                  placeholder="Enter number of therapists"
                  min="1"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <p className="text-gray-500 text-xs mt-1">This will be used to calculate the total subscription amount</p>
            </div>

            {/* Billing Period */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Period
              </label>
              <select
                value={billingPeriod}
                onChange={(e) => setBillingPeriod(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {getAvailableBillingPeriods(selectedPlanId).map(period => (
                  <option key={period} value={period}>
                    {getBillingPeriodLabel(period)}
                  </option>
                ))}
              </select>
            </div>

            {/* Calculated Price */}
            {calculatedPrice && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-2">
                  <Calculator className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Calculated Price:</span>
                </div>
                <div className="text-2xl font-bold text-green-700">
                  ₹{parseFloat(calculatedPrice.total_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  ₹{parseFloat(calculatedPrice.price_per_therapist).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per therapist × {calculatedPrice.number_of_therapists} therapists ({calculatedPrice.billing_period})
                </div>
              </div>
            )}

            {/* Update Subscription Button */}
            <div className="flex justify-end">
              <button
                onClick={handleSubscriptionUpdate}
                disabled={subscriptionSaving || !selectedPlanId || !numberOfTherapists || numberOfTherapists < 1}
                className={`px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                  subscriptionSaving || !selectedPlanId || !numberOfTherapists || numberOfTherapists < 1 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Save className="h-4 w-4" />
                <span>{subscriptionSaving ? 'Saving...' : 'Update Subscription'}</span>
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
