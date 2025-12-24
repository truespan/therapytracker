import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, Calendar, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, Link2, Unlink, Award, FileText, CreditCard, Sun } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import CountryCodeSelect from '../common/CountryCodeSelect';
import DarkModeToggle from '../common/DarkModeToggle';
import { googleCalendarAPI, partnerAPI, subscriptionPlanAPI, organizationAPI } from '../../services/api';
import ChangePasswordSection from '../common/ChangePasswordSection';
import PlanSelectionModal from '../common/PlanSelectionModal';

const PartnerSettings = () => {
  const { user, refreshUser } = useAuth();
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });
  const [organizationSubscription, setOrganizationSubscription] = useState(null);
  const [partnerSubscription, setPartnerSubscription] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Form state for editable fields
  const [formData, setFormData] = useState({
    age: '',
    countryCode: '+91',
    contact: '',
    address: '',
    qualification: '',
    license_id: '',
    work_experience: '',
    other_practice_details: '',
    fee_min: '',
    fee_max: '',
    fee_currency: 'INR'
  });

  // Initialize form data from user
  useEffect(() => {
    if (user) {
      // Parse contact to extract country code and number
      const parseContact = (contact) => {
        if (!contact) return { countryCode: '+91', number: '' };
        const match = contact.match(/^(\+\d{1,3})(\d+)$/);
        if (match) {
          return { countryCode: match[1], number: match[2] };
        }
        return { countryCode: '+91', number: contact };
      };

      const { countryCode, number } = parseContact(user.contact);

      setFormData({
        age: user.age || '',
        countryCode: countryCode,
        contact: number,
        address: user.address || '',
        qualification: user.qualification || '',
        license_id: user.license_id || '',
        work_experience: user.work_experience || '',
        other_practice_details: user.other_practice_details || '',
        fee_min: user.fee_min || '',
        fee_max: user.fee_max || '',
        fee_currency: user.fee_currency || 'INR'
      });
    }
  }, [user]);

  // Load Google Calendar status
  useEffect(() => {
    checkGoogleCalendarStatus();
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


  const checkGoogleCalendarStatus = async () => {
    try {
      setLoadingStatus(true);
      const response = await googleCalendarAPI.getStatus();
      setGoogleCalendarStatus(response.data);
    } catch (err) {
      console.error('Failed to check Google Calendar status:', err);
      setGoogleCalendarStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  const connectGoogleCalendar = async () => {
    try {
      setConnectingCalendar(true);
      const response = await googleCalendarAPI.initiateAuth();
      // Redirect to Google OAuth page
      window.location.href = response.data.authUrl;
    } catch (err) {
      console.error('Failed to initiate Google Calendar auth:', err);
      alert('Failed to connect Google Calendar. Please try again.');
      setConnectingCalendar(false);
    }
  };

  const disconnectGoogleCalendar = async () => {
    if (!window.confirm('Are you sure you want to disconnect Google Calendar? Appointments will no longer sync automatically.')) {
      return;
    }

    try {
      await googleCalendarAPI.disconnect();
      setGoogleCalendarStatus({ connected: false });
      alert('Google Calendar disconnected successfully.');
    } catch (err) {
      console.error('Failed to disconnect Google Calendar:', err);
      alert('Failed to disconnect Google Calendar. Please try again.');
    }
  };

  const toggleSync = async (enabled) => {
    try {
      await googleCalendarAPI.toggleSync(enabled);
      setGoogleCalendarStatus(prev => ({ ...prev, syncEnabled: enabled }));
    } catch (err) {
      console.error('Failed to toggle sync:', err);
      alert('Failed to update sync settings. Please try again.');
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
        license_id: formData.license_id || null,
        work_experience: formData.work_experience || null,
        other_practice_details: formData.other_practice_details || null,
        fee_min: formData.fee_min ? parseFloat(formData.fee_min) : null,
        fee_max: formData.fee_max ? parseFloat(formData.fee_max) : null,
        fee_currency: formData.fee_currency || 'INR'
      };

      await partnerAPI.update(user.id, updateData);
      
      // Refresh user data
      await refreshUser();
      
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
  const loadIndividualPlans = async () => {
    try {
      setLoadingPlans(true);
      const response = await subscriptionPlanAPI.getIndividualPlansForSelection();
      setAvailablePlans(response.data.plans || []);
    } catch (err) {
      console.error('Failed to load individual plans:', err);
      setSaveMessage({
        type: 'error',
        text: 'Failed to load subscription plans. Please try again.'
      });
    } finally {
      setLoadingPlans(false);
    }
  };

  // Handle plan selection
  const handlePlanSelection = async (planId, billingPeriod) => {
    try {
      setSaving(true);
      setSaveMessage({ type: '', text: '' });

      // Assign the plan to this partner
      await organizationAPI.assignPartnerSubscriptions(user.organization_id, {
        partner_ids: [user.id],
        subscription_plan_id: planId,
        billing_period: billingPeriod
      });

      setSaveMessage({
        type: 'success',
        text: 'Subscription plan updated successfully!'
      });

      setShowPlanModal(false);

      // Refresh subscription data
      await loadOrganizationSubscription();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSaveMessage({ type: '', text: '' });
      }, 5000);
    } catch (err) {
      console.error('Failed to assign plan:', err);
      setSaveMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update subscription plan. Please try again.'
      });
      setShowPlanModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <User className="h-6 w-6 mr-2 text-primary-600" />
            Profile Settings
          </h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Manage your profile information</p>
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
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Partner ID: </span>
                <span className="text-lg font-bold text-primary-600 dark:text-dark-primary-500">{user.partner_id}</span>
              </div>
            )}

            {/* Name - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  value={user?.name || ''}
                  className="input bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Sex and Age */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                  Sex
                </label>
                <input
                  type="text"
                  value={user?.sex || ''}
                  className="input bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
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
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                    placeholder="Age"
                    min="18"
                    max="100"
                  />
                </div>
              </div>
            </div>

            {/* Email - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="email"
                  value={user?.email || ''}
                  className="input bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Contact Number - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Contact Number
              </label>
              <div className="flex space-x-2">
                <CountryCodeSelect
                  value={formData.countryCode}
                  onChange={handleChange}
                  name="countryCode"
                />
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Qualification - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Qualification
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  placeholder="e.g., M.D. Psychiatry, Clinical Psychologist"
                />
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
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  placeholder="e.g., PSY-12345, MED-67890"
                />
              </div>
            </div>

            {/* Address - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  placeholder="Enter full address"
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
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  placeholder="Enter work experience details"
                />
              </div>
            </div>

            {/* Other Practice Details - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Other Practice Details (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="other_practice_details"
                  value={formData.other_practice_details}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  placeholder="Enter other significant work related details"
                />
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
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
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
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
                      className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
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

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Email Verification Status */}
            {user && (
              <div className={`p-4 rounded-lg ${user.email_verified ? 'bg-green-50 border border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'}`}>
                <span className="text-sm font-medium dark:text-dark-text-primary">Email Verification: </span>
                <span className={`text-sm font-bold ${user.email_verified ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {user.email_verified ? 'Verified ✓' : 'Pending Verification'}
                </span>
              </div>
            )}

            {/* Appearance Settings */}
            <div className="border-t border-gray-200 dark:border-dark-border pt-6 mt-6">
              <div className="flex items-center mb-4">
                <Sun className="h-6 w-6 mr-2 text-primary-600 dark:text-dark-primary-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Appearance
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                Customize how the application looks
              </p>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                    Dark Mode
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                    Toggle between light and dark themes
                  </p>
                </div>
                <DarkModeToggle variant="switch" />
              </div>
            </div>

            {/* Google Calendar Integration */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center mb-4">
                <CalendarIcon className="h-6 w-6 mr-2 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Google Calendar Integration</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-text-primary mb-4">
                Connect your Google Calendar to automatically sync appointments when you create or update them.
              </p>

              {loadingStatus ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : googleCalendarStatus?.connected ? (
                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Google Calendar Connected</span>
                      </div>
                      <button
                        onClick={disconnectGoogleCalendar}
                        className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center space-x-1"
                      >
                        <Unlink className="h-4 w-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                    {googleCalendarStatus.connectedAt && (
                      <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-2">
                        Connected on {new Date(googleCalendarStatus.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">Sync Enabled</p>
                      <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                        {googleCalendarStatus.syncEnabled
                          ? 'Appointments will automatically sync to your Google Calendar'
                          : 'Sync is currently disabled'}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={googleCalendarStatus.syncEnabled}
                        onChange={(e) => toggleSync(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  {googleCalendarStatus.lastSyncedAt && (
                    <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                      Last synced: {new Date(googleCalendarStatus.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-primary-50 dark:bg-dark-bg-secondary border border-primary-200 dark:border-dark-border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-primary-700 dark:text-dark-primary-500" />
                        <span className="text-sm font-medium text-primary-800 dark:text-dark-text-primary">Not Connected</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-dark-text-secondary mb-4">
                        Connect your Google Calendar to automatically sync appointments when you create or update them.
                      </p>
                      <button
                        onClick={connectGoogleCalendar}
                        disabled={connectingCalendar}
                        className="btn btn-primary flex items-center space-x-2"
                      >
                        {connectingCalendar ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="h-4 w-4" />
                            <span>Connect Google Calendar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </form>

        <ChangePasswordSection />

        {/* Subscription Details Section - Show for all partners with organizations */}
        {organizationSubscription && (
          <div className="border-t border-gray-200 pt-6 mt-6">
            <div className="flex items-center mb-4">
              <CreditCard className="h-6 w-6 mr-2 text-primary-600 dark:text-dark-primary-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Subscription Details</h3>
            </div>

            {/* For TheraPTrack Controlled Organizations: Always show partner's individual subscription (Free Plan if not explicitly assigned) */}
            {organizationSubscription.theraptrack_controlled && partnerSubscription && partnerSubscription.plan_name && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 dark:bg-indigo-900/20 dark:border-indigo-800">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Your Assigned Plan: </span>
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
                  {partnerSubscription.has_video && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Video Enabled
                    </span>
                  )}
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

            {/* Select Plan Button for TheraPTrack Controlled Organizations */}
            {organizationSubscription.theraptrack_controlled && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    loadIndividualPlans();
                    setShowPlanModal(true);
                  }}
                  disabled={loadingPlans || saving}
                  className="btn btn-primary flex items-center space-x-2"
                >
                  <CreditCard className="h-4 w-4" />
                  <span>{loadingPlans ? 'Loading Plans...' : 'Select Plan'}</span>
                </button>
              </div>
            )}

            {/* For Non-TheraPTrack Controlled Organizations: Show partner's assigned subscription */}
            {!organizationSubscription.theraptrack_controlled && partnerSubscription?.plan_name && (
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4 dark:bg-dark-bg-secondary dark:border-dark-border">
                <div className="flex items-center justify-between">
                  <div>
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
        />
      )}
    </div>
  );
};

export default PartnerSettings;
