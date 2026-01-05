import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, Calendar, Award, FileText, CreditCard, Edit, X, Save, XCircle, Globe, Plus } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import CountryCodeSelect from '../common/CountryCodeSelect';
import { partnerAPI, subscriptionPlanAPI, organizationAPI, razorpayAPI } from '../../services/api';
import ChangePasswordSection from '../common/ChangePasswordSection';
import PlanSelectionModal from '../common/PlanSelectionModal';
import CancellationConfirmDialog from '../common/CancellationConfirmDialog';
import SubscriptionStatusBadge from '../common/SubscriptionStatusBadge';
import BankAccountForm from '../common/BankAccountForm';
import { initializeRazorpayCheckout } from '../../utils/razorpayHelper';
import { getPlanSelectionButtonText, canCancelSubscription } from '../../utils/subscriptionHelper';

const PartnerSettings = () => {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [organizationSubscription, setOrganizationSubscription] = useState(null);
  const [partnerSubscription, setPartnerSubscription] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);
  const [selectedLanguages, setSelectedLanguages] = useState([]);
  const [languageDropdownOpen, setLanguageDropdownOpen] = useState(false);

  // Form state for editable fields
  const [formData, setFormData] = useState({
    age: '',
    countryCode: '+91',
    contact: '',
    address: '',
    qualification: '',
    qualification_degree: '',
    license_id: '',
    work_experience: '',
    other_practice_details: '',
    fee_min: '',
    fee_max: '',
    fee_currency: 'INR',
    language_preferences: ''
  });

  // Initialize form data from user
  // Only reset form data when not in edit mode to prevent losing user's edits
  useEffect(() => {
    if (user && !isEditing) {
      // Parse contact to extract country code and number
      const parseContact = (contact) => {
        if (!contact) return { countryCode: '+91', number: '' };
        
        // Ensure contact is a string and trim whitespace
        const contactStr = String(contact).trim();
        
        // Handle numbers with + prefix (e.g., +917996336719, +91996336719, +11234567890)
        // Try common country codes first (prioritize +91, +1)
        if (contactStr.startsWith('+91')) {
          return { countryCode: '+91', number: contactStr.substring(3) };
        }
        if (contactStr.startsWith('+1')) {
          return { countryCode: '+1', number: contactStr.substring(2) };
        }
        
        // Fallback for other + prefixes
        const match = contactStr.match(/^(\+\d{1,3})(\d+)$/);
        if (match) {
          return { countryCode: match[1], number: match[2] };
        }

        // Handle numbers without + prefix but with country code (e.g., 91996336719)
        // Pattern: 91 followed by 9-10 digits (total 11-12 characters)
        // This handles Indian numbers with country code but no + prefix
        // Example: 91996336719 → countryCode: +91, number: 996336719
        const indiaMatch = contactStr.match(/^(91)(\d{9,10})$/);
        if (indiaMatch) {
          return { countryCode: '+91', number: indiaMatch[2] };
        }
        
        // Handle US numbers without + prefix (e.g., 11234567890)
        // Pattern: 1 followed by exactly 10 digits (total 11 characters)
        const usMatch = contactStr.match(/^(1)(\d{10})$/);
        if (usMatch) {
          return { countryCode: '+1', number: usMatch[2] };
        }

        // Handle numbers without country code (e.g., 77996336719 or 7996336719)
        // Check if it looks like an Indian number (starts with 6-9 and has 10-11 digits)
        // The regex /^[6-9]\d{9,10}$/ matches:
        // - 7996336719 (10 digits total: 7 followed by 9 more digits)
        // - 77996336719 (11 digits total: 7 followed by 10 more digits)
        // In both cases, we preserve ALL digits as they are part of the local number
        if (contactStr.match(/^[6-9]\d{9,10}$/)) {
          return { countryCode: '+91', number: contactStr };
        }

        // Default fallback - preserve the original contact as number
        // This ensures no digits are lost for unexpected formats
        return { countryCode: '+91', number: contactStr };
      };

      const { countryCode, number } = parseContact(user.contact);

      const initialFormData = {
        age: user.age || '',
        countryCode: countryCode,
        contact: number,
        address: user.address || '',
        qualification: user.qualification || '',
        qualification_degree: user.qualification_degree || '',
        license_id: user.license_id || '',
        work_experience: user.work_experience || '',
        other_practice_details: user.other_practice_details || '',
        fee_min: user.fee_min || '',
        fee_max: user.fee_max || '',
        fee_currency: user.fee_currency || 'INR',
        language_preferences: user.language_preferences || ''
      };
      setFormData(initialFormData);
      setOriginalFormData(initialFormData);
      
      // Parse language preferences from comma-separated string
      if (user.language_preferences) {
        const languages = user.language_preferences.split(',').map(lang => lang.trim()).filter(lang => lang);
        setSelectedLanguages(languages);
      } else {
        setSelectedLanguages([]);
      }
    }
  }, [user, isEditing]);

  useEffect(() => {
    loadOrganizationSubscription();
  }, [user]);

  const loadOrganizationSubscription = async () => {
    if (!user?.organization_id) return;
    
    try {
      const response = await partnerAPI.getById(user.id);
      const partnerData = response.data.partner;
      
      // Always load organization subscription if organization exists
      if (partnerData?.organization) {
        setOrganizationSubscription(partnerData.organization);
        
        // If organization is TheraPTrack controlled, also load partner's individual subscription
        if (partnerData.organization.theraptrack_controlled) {
          setPartnerSubscription(partnerData.subscription || null);
        } else {
          // For non-TheraPTrack controlled orgs, load partner's assigned subscription
          setPartnerSubscription(partnerData.subscription || null);
        }
      } else {
        setOrganizationSubscription(null);
        setPartnerSubscription(null);
      }
    } catch (err) {
      console.error('Failed to load organization subscription:', err);
      setOrganizationSubscription(null);
      setPartnerSubscription(null);
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear save message when user starts editing
    if (saveMessage.text) {
      setSaveMessage({ type: '', text: '' });
    }
  };

  // Language preferences handlers
  const availableLanguages = [
    'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 
    'Bengali', 'Gujarati', 'Marathi', 'Punjabi', 'Urdu', 'Spanish',
    'French', 'German', 'Mandarin', 'Japanese', 'Korean', 'Other'
  ];

  const handleAddLanguage = (language) => {
    if (!selectedLanguages.includes(language)) {
      const updatedLanguages = [...selectedLanguages, language];
      setSelectedLanguages(updatedLanguages);
      setFormData(prev => ({
        ...prev,
        language_preferences: updatedLanguages.join(', ')
      }));
      setLanguageDropdownOpen(false);
      if (saveMessage.text) {
        setSaveMessage({ type: '', text: '' });
      }
    }
  };

  const handleRemoveLanguage = (language) => {
    const updatedLanguages = selectedLanguages.filter(lang => lang !== language);
    setSelectedLanguages(updatedLanguages);
    setFormData(prev => ({
      ...prev,
      language_preferences: updatedLanguages.join(', ')
    }));
    if (saveMessage.text) {
      setSaveMessage({ type: '', text: '' });
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    // Store current form data as original when entering edit mode
    setOriginalFormData({ ...formData });
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (originalFormData) {
      setFormData({ ...originalFormData });
      // Reset selected languages
      if (originalFormData.language_preferences) {
        const languages = originalFormData.language_preferences.split(',').map(lang => lang.trim()).filter(lang => lang);
        setSelectedLanguages(languages);
      } else {
        setSelectedLanguages([]);
      }
    }
    setIsEditing(false);
    setSaveMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage({ type: '', text: '' });

    try {
      // Combine country code with contact number
      const contact = `${formData.countryCode}${formData.contact.trim()}`;

      const updateData = {
        age: formData.age ? parseInt(formData.age) : null,
        contact: contact,
        address: formData.address || null,
        qualification: formData.qualification || null,
        qualification_degree: formData.qualification_degree || null,
        license_id: formData.license_id || null,
        work_experience: formData.work_experience || null,
        other_practice_details: formData.other_practice_details || null,
        fee_min: formData.fee_min ? parseFloat(formData.fee_min) : null,
        fee_max: formData.fee_max ? parseFloat(formData.fee_max) : null,
        fee_currency: formData.fee_currency || 'INR',
        language_preferences: selectedLanguages.length > 0 ? selectedLanguages.join(', ') : null
      };

      await partnerAPI.update(user.id, updateData);
      
      // Refresh user data
      await refreshUser();
      
      // Update original form data to current values
      const updatedOriginalFormData = { ...formData };
      updatedOriginalFormData.language_preferences = selectedLanguages.length > 0 ? selectedLanguages.join(', ') : '';
      setOriginalFormData(updatedOriginalFormData);
      
      // Exit edit mode
      setIsEditing(false);
      
      setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setSaveMessage({ 
        type: 'error', 
        text: err.response?.data?.error || 'Failed to update profile. Please try again.' 
      });
    } finally {
      setSaving(false);
    }
  };

  // Load individual plans for selection
  // Only available for TheraPTrack controlled organizations
  const loadIndividualPlans = async () => {
    // Security check: Only allow loading plans for TheraPTrack controlled organizations
    if (!organizationSubscription?.theraptrack_controlled) {
      setSaveMessage({
        type: 'error',
        text: 'Subscription plan selection is not available for your organization. Your organization administrator will assign subscription plans to therapists.'
      });
      return [];
    }

    try {
      setLoadingPlans(true);
      const response = await subscriptionPlanAPI.getIndividualPlansForSelection();
      const plans = response.data.plans || [];
      setAvailablePlans(plans);
      return plans;
    } catch (err) {
      console.error('Failed to load individual plans:', err);
      setSaveMessage({
        type: 'error',
        text: 'Failed to load subscription plans. Please try again.'
      });
      return [];
    } finally {
      setLoadingPlans(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    try {
      setCancelling(true);
      setSaveMessage({ type: '', text: '' });

      await partnerAPI.cancelSubscription();

      setSaveMessage({
        type: 'success',
        text: 'Subscription cancelled successfully. You will retain access until the end of your billing period.'
      });

      setShowCancellationDialog(false);

      // Refresh subscription data
      await loadOrganizationSubscription();
      await refreshUser();

      setTimeout(() => setSaveMessage({ type: '', text: '' }), 8000);
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to cancel subscription. Please try again.'
      });
      setShowCancellationDialog(false);
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
    } finally {
      setCancelling(false);
    }
  };

  // Handle plan selection with Razorpay payment flow (or direct update for Free Plan)
  const handlePlanSelection = async (planId, billingPeriod) => {
    try {
      setSaving(true);
      setSaveMessage({ type: '', text: '' });

      // Security check: Only allow plan selection for TheraPTrack controlled organizations
      // This is a frontend guard - backend also enforces this check
      if (!organizationSubscription?.theraptrack_controlled) {
        setSaveMessage({
          type: 'error',
          text: 'Subscription plan selection is not available for your organization. Your organization administrator will assign subscription plans to therapists.'
        });
        setShowPlanModal(false);
        setSaving(false);
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
        return;
      }

      // Find the selected plan to check if it's Free Plan
      const selectedPlan = availablePlans.find(plan => plan.id === planId);
      const isFreePlan = selectedPlan && (
        selectedPlan.plan_name.toLowerCase() === 'free plan' ||
        (selectedPlan.individual_monthly_price === 0 && billingPeriod === 'monthly')
      );

      // If Free Plan, skip payment and directly update subscription
      if (isFreePlan) {
        await partnerAPI.selectSubscription({
          subscription_plan_id: planId,
          billing_period: billingPeriod
        });

        setSaveMessage({
          type: 'success',
          text: 'Free Plan activated successfully!'
        });

        setShowPlanModal(false);

        // Refresh subscription data
        await loadOrganizationSubscription();
        
        // Refresh user context to get updated subscription
        await refreshUser();

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSaveMessage({ type: '', text: '' });
        }, 5000);
        return;
      }

      // For paid plans, proceed with Razorpay payment flow
      // Step 1: Create Razorpay order
      const orderResponse = await razorpayAPI.createOrder({
        subscription_plan_id: planId,
        billing_period: billingPeriod
      });

      const order = orderResponse.data.order;

      // Step 2: Initialize Razorpay checkout
      let paymentDetails;
      try {
        paymentDetails = await initializeRazorpayCheckout(order, {
          name: 'Therapy Tracker',
          description: `Subscription Plan - ${billingPeriod}`,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.contact || '',
          },
        });
      } catch (paymentError) {
        // User cancelled or payment failed
        if (paymentError.message.includes('cancelled')) {
          setSaveMessage({
            type: 'info',
            text: 'Payment was cancelled. Please try again when ready.'
          });
        } else {
          setSaveMessage({
            type: 'error',
            text: paymentError.message || 'Payment initialization failed. Please try again.'
          });
        }
        setShowPlanModal(false);
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
        return;
      }

      // Step 3: Verify payment with backend
      try {
        await razorpayAPI.verifyPayment({
          razorpay_order_id: paymentDetails.razorpay_order_id,
          razorpay_payment_id: paymentDetails.razorpay_payment_id,
          razorpay_signature: paymentDetails.razorpay_signature,
        });

        // Payment verified successfully
        setSaveMessage({
          type: 'success',
          text: 'Payment successful! Subscription plan updated successfully!'
        });

        setShowPlanModal(false);

        // Wait a moment for backend to process the update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh subscription data (force reload)
        await loadOrganizationSubscription();
        
        // Refresh user context to get updated subscription
        await refreshUser();

        // Force another refresh after a moment to ensure UI is updated
        setTimeout(async () => {
          await loadOrganizationSubscription();
          await refreshUser();
        }, 1000);

        // Clear success message after 5 seconds
        setTimeout(() => {
          setSaveMessage({ type: '', text: '' });
        }, 5000);
      } catch (verifyError) {
        // Payment verification failed
        console.error('Payment verification failed:', verifyError);
        setSaveMessage({
          type: 'error',
          text: verifyError.response?.data?.error || 'Payment verification failed. Please contact support if payment was deducted.'
        });
        setShowPlanModal(false);
        setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
      }
    } catch (err) {
      console.error('Failed to process payment:', err);
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.error || err.message || 'Failed to process payment. Please try again.'
      });
      setShowPlanModal(false);
      setTimeout(() => setSaveMessage({ type: '', text: '' }), 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                <User className="h-6 w-6 mr-2 text-primary-600" />
                Profile Settings
              </h2>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Manage your profile information</p>
            </div>
            {!isEditing && (
              <button
                onClick={handleEdit}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Profile Picture Upload */}
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
              label="Profile Picture"
              userType="partner"
              userId={user?.id}
              disabled={false}
            />

            {/* Partner ID Display */}
            {user && user.partner_id && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 dark:bg-dark-bg-secondary dark:border-dark-border">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Therapist ID: </span>
                <span className="text-lg font-bold text-primary-600 dark:text-dark-primary-500">{user.partner_id}</span>
              </div>
            )}

            {/* Full Name, Sex, and Age - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  <input
                    type="text"
                    value={user?.name || ''}
                    className="input bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75"
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Sex
                </label>
                <input
                  type="text"
                  value={user?.sex || ''}
                  className="input bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75"
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Age (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      isEditing 
                        ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                        : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                    }`}
                    placeholder="Age"
                    min="18"
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Email and Contact Number - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    className="input pl-10 bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75"
                    disabled
                    readOnly
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Contact Number
                </label>
                <div className="flex space-x-2">
                  <CountryCodeSelect
                    value={formData.countryCode}
                    onChange={handleChange}
                    name="countryCode"
                    disabled={!isEditing}
                  />
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                    <input
                      type="tel"
                      name="contact"
                      value={formData.contact}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        isEditing 
                          ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                          : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                      }`}
                      placeholder="1234567890"
                    />
                  </div>
                </div>
              </div>
            </div>
            <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mt-1">
            Use your WhatsApp number so you can receive client bookings, appointments, updates and reminders.
            </p>

            {/* Location (Optional) - Renamed from Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Location (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows="3"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    isEditing 
                      ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                      : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                  }`}
                  placeholder="Enter location/address"
                />
              </div>
            </div>

            {/* Designation and Qualification - Side by side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Designation
                </label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      isEditing 
                        ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                        : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                    }`}
                    placeholder="e.g., Clinical Psychologist"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Qualification
                </label>
                <div className="relative">
                  <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  <input
                    type="text"
                    name="qualification_degree"
                    value={formData.qualification_degree || ''}
                    onChange={handleChange}
                    disabled={!isEditing}
                    className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      isEditing 
                        ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                        : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                    }`}
                    placeholder="e.g., M.A. Clinical Psychology"
                  />
                </div>
              </div>
            </div>

            {/* Practitioner License ID - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Practitioner License ID (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  name="license_id"
                  value={formData.license_id}
                  onChange={handleChange}
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    isEditing 
                      ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                      : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                  }`}
                  placeholder="e.g., PSY-12345, MED-67890"
                />
              </div>
            </div>

            {/* Work Experience - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Work Experience (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="work_experience"
                  value={formData.work_experience}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows="3"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    isEditing 
                      ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                      : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                  }`}
                  placeholder="Enter work experience details"
                />
              </div>
            </div>

            {/* Interest Areas (Optional) - Renamed from Other Practice Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Interest Areas (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="other_practice_details"
                  value={formData.other_practice_details}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows="3"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    isEditing 
                      ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                      : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                  }`}
                  placeholder="Enter interest areas"
                />
              </div>
            </div>

            {/* Language Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Language Preferences
              </label>
              <div className="space-y-2">
                {/* Selected Languages Display */}
                {selectedLanguages.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedLanguages.map((language) => (
                      <span
                        key={language}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200"
                      >
                        {language}
                        {isEditing && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLanguage(language)}
                            className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}

                {/* Language Dropdown */}
                {isEditing && (
                  <div className="relative">
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary z-10" />
                      <select
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddLanguage(e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary appearance-none ${
                          isEditing ? '' : 'bg-gray-50 cursor-not-allowed opacity-75'
                        }`}
                      >
                        <option value="">Select a language to add</option>
                        {availableLanguages
                          .filter(lang => !selectedLanguages.includes(lang))
                          .map((language) => (
                            <option key={language} value={language}>
                              {language}
                            </option>
                          ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Plus className="h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                      </div>
                    </div>
                  </div>
                )}
                {!isEditing && selectedLanguages.length === 0 && (
                  <div className="text-sm text-gray-500 dark:text-dark-text-tertiary italic">
                    No languages selected
                  </div>
                )}
              </div>
            </div>

            {/* Fee Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Fee Range (Optional)
              </label>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Min</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-tertiary font-medium">₹</span>
                      <input
                        type="number"
                        name="fee_min"
                        value={formData.fee_min}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          isEditing 
                            ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                            : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                        }`}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Max</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-dark-text-tertiary font-medium">₹</span>
                      <input
                        type="number"
                        name="fee_max"
                        value={formData.fee_max}
                        onChange={handleChange}
                        disabled={!isEditing}
                        className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          isEditing 
                            ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                            : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                        }`}
                        placeholder="0.00"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Currency</label>
                    <select
                      name="fee_currency"
                      value={formData.fee_currency}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        isEditing 
                          ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                          : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                      }`}
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                      <option value="CAD">CAD (C$)</option>
                      <option value="AUD">AUD (A$)</option>
                      <option value="JPY">JPY (¥)</option>
                      <option value="CNY">CNY (¥)</option>
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                  This information will appear on the therapist's profile as part of the search feature used by individual clients.
                </p>
              </div>
            </div>

            {/* Save Message */}
            {saveMessage.text && (
              <div className={`p-3 rounded-lg ${
                saveMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {saveMessage.text}
              </div>
            )}

            {/* Save and Cancel Buttons */}
            {isEditing && (
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 bg-gray-200 dark:bg-dark-bg-secondary text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-300 dark:hover:bg-dark-bg-primary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            )}

            {/* Email Verification Status */}
            {user && (
              <div className={`p-4 rounded-lg ${user.email_verified ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                <span className="text-sm font-medium dark:text-dark-text-primary">Email Verification: </span>
                <span className={`text-sm font-bold ${user.email_verified ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {user.email_verified ? 'Verified ✓' : 'Pending Verification'}
                </span>
              </div>
            )}

          </div>
        </form>

        {/* Bank Account Section */}
        {user?.organization?.theraptrack_controlled && (
          <div className="card mt-6">
            <div className="border-b border-gray-200 pb-4 mb-6">
              <div className="flex items-center">
                <CreditCard className="h-6 w-6 mr-2 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Bank Account Details
                </h3>
              </div>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-1 text-sm">
                Add your bank account details to receive payouts
              </p>
            </div>
            <BankAccountForm userType="partner" onUpdate={refreshUser} />
          </div>
        )}

        <ChangePasswordSection />

        {/* Subscription Details Section - Show for all partners with organizations */}
        {organizationSubscription && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center mb-4">
              <CreditCard className="h-6 w-6 mr-2 text-primary-600 dark:text-dark-primary-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Subscription Details</h3>
            </div>

            {/* For TheraPTrack Controlled Organizations: Show partner's individual subscription if exists */}
            {organizationSubscription.theraptrack_controlled && partnerSubscription && partnerSubscription.plan_name && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 dark:bg-indigo-900/20 dark:border-indigo-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Your Plan: </span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-dark-primary-500">
                      {partnerSubscription.plan_name}
                    </span>
                    {partnerSubscription.min_sessions !== null && partnerSubscription.max_sessions !== null && (
                      <span className="text-sm text-gray-600 dark:text-dark-text-secondary ml-2">
                        ({partnerSubscription.min_sessions === 0 && partnerSubscription.max_sessions === 0
                          ? 'No session limit'
                          : `${partnerSubscription.min_sessions} - ${partnerSubscription.max_sessions} sessions/month`})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {partnerSubscription.has_video && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Video Enabled
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Subscription Status Badge */}
                <div className="mb-3">
                  <SubscriptionStatusBadge subscription={partnerSubscription} showEndDate={true} />
                </div>
                {partnerSubscription.billing_period && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Billing Period: <span className="font-medium capitalize dark:text-dark-text-primary">{partnerSubscription.billing_period}</span>
                  </div>
                )}
                {partnerSubscription.assigned_at && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Assigned: <span className="dark:text-dark-text-primary">{new Date(partnerSubscription.assigned_at).toLocaleDateString()}</span>
                  </div>
                )}
                {partnerSubscription.video_hours && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Video Hours: <span className="font-medium">{partnerSubscription.video_hours} hrs/month</span>
                    {partnerSubscription.extra_video_rate && (
                      <span className="ml-2">(₹{partnerSubscription.extra_video_rate}/extra min)</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No subscription message for TheraPTrack controlled orgs */}
            {organizationSubscription.theraptrack_controlled && (!partnerSubscription || !partnerSubscription.plan_name) && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 dark:bg-dark-bg-secondary dark:border-dark-border">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">You don't have a subscription plan yet. Select a plan below to get started.</p>
              </div>
            )}

            {/* Select Plan / Upgrade Button for TheraPTrack Controlled Organizations - Always show button */}
            {organizationSubscription.theraptrack_controlled && (
              <div className="mt-4 flex items-center space-x-3">
                <button
                  onClick={async () => {
                    // Double-check organization status before opening modal (defense in depth)
                    if (!organizationSubscription?.theraptrack_controlled) {
                      setSaveMessage({
                        type: 'error',
                        text: 'Subscription plan selection is not available for your organization.'
                      });
                      return;
                    }
                    // Wait for plans to load before opening modal
                    const plans = await loadIndividualPlans();
                    // Open modal after plans are loaded (even if empty, user should see the state)
                    setShowPlanModal(true);
                  }}
                  disabled={loadingPlans || saving || !organizationSubscription?.theraptrack_controlled}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>
                    {loadingPlans 
                      ? 'Loading Plans...' 
                      : (partnerSubscription && partnerSubscription.plan_name)
                        ? 'Upgrade Plan'
                        : 'Select Plan'
                    }
                  </span>
                </button>
                
                {/* Cancel Subscription Button */}
                {canCancelSubscription(partnerSubscription) && (
                  <button
                    onClick={() => setShowCancellationDialog(true)}
                    disabled={saving || cancelling}
                    className="btn btn-secondary flex items-center space-x-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Cancel Subscription</span>
                  </button>
                )}
              </div>
            )}

            {/* For Non-TheraPTrack Controlled Organizations: Show partner's assigned subscription */}
            {!organizationSubscription.theraptrack_controlled && partnerSubscription?.plan_name && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4 dark:bg-dark-bg-secondary dark:border-dark-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Your Assigned Plan: </span>
                    <span className="text-lg font-bold text-primary-600 dark:text-dark-primary-500">
                      {partnerSubscription.plan_name}
                    </span>
                    {partnerSubscription.min_sessions !== null && partnerSubscription.max_sessions !== null && (
                      <span className="text-sm text-gray-600 dark:text-dark-text-secondary ml-2">
                        ({partnerSubscription.min_sessions} - {partnerSubscription.max_sessions} sessions/month)
                      </span>
                    )}
                  </div>
                  {partnerSubscription.has_video && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Video Enabled
                    </span>
                  )}
                </div>
                
                {/* Subscription Status Badge */}
                <div className="mb-3">
                  <SubscriptionStatusBadge subscription={partnerSubscription} showEndDate={true} />
                </div>
                
                {partnerSubscription.billing_period && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Billing Period: <span className="font-medium capitalize dark:text-dark-text-primary">{partnerSubscription.billing_period}</span>
                  </div>
                )}
                {partnerSubscription.assigned_at && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Assigned: <span className="dark:text-dark-text-primary">{new Date(partnerSubscription.assigned_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            )}

            {/* No subscription message for non-TheraPTrack controlled orgs */}
            {!organizationSubscription.theraptrack_controlled && !partnerSubscription?.plan_name && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 dark:bg-dark-bg-secondary dark:border-dark-border">
                <p className="text-sm text-gray-600 dark:text-dark-text-secondary">No subscription plan assigned to you.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Plan Selection Modal */}
      {showPlanModal && (
        <PlanSelectionModal
          currentPlanId={partnerSubscription?.subscription_plan_id}
          plans={availablePlans}
          userType="individual"
          onClose={() => setShowPlanModal(false)}
          onSelectPlan={handlePlanSelection}
          currentSubscription={partnerSubscription}
        />
      )}

      {/* Cancellation Confirmation Dialog */}
      {showCancellationDialog && (
        <CancellationConfirmDialog
          subscriptionEndDate={partnerSubscription?.subscription_end_date}
          planName={partnerSubscription?.plan_name}
          onConfirm={handleCancelSubscription}
          onCancel={() => setShowCancellationDialog(false)}
          isProcessing={cancelling}
        />
      )}
    </div>
  );
};

export default PartnerSettings;
