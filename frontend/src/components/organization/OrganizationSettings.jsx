import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Mail, Phone, MapPin, FileText, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, Save, CreditCard, Users, Calculator, Sun, Video, Edit, X } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import CountryCodeSelect from '../common/CountryCodeSelect';
import { googleCalendarAPI, organizationAPI, subscriptionPlanAPI } from '../../services/api';
import ChangePasswordSection from '../common/ChangePasswordSection';
import NonControlledSubscriptionManagement from './NonControlledSubscriptionManagement';
import DarkModeToggle from '../common/DarkModeToggle';
import TherapistVideoSettings from './TherapistVideoSettings';
import TherapistBlogPermissions from './TherapistBlogPermissions';
import BankAccountForm from '../common/BankAccountForm';

const OrganizationSettings = () => {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    countryCode: '+91',
    contact: ''
  });
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);
  
  // Subscription state
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);

  // Initialize form fields when user data is available
  useEffect(() => {
    if (user) {
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

      const { countryCode, number } = parseContact(user.contact || '');
      
      const initialFormData = {
        countryCode: countryCode,
        contact: number
      };
      setFormData(initialFormData);
      setOriginalFormData({ ...initialFormData, address: user.address || '' });
      setAddress(user.address || '');
      loadSubscriptionDetails();
    }
  }, [user]);


  const loadSubscriptionDetails = async () => {
    if (!user?.id) return;
    try {
      const response = await organizationAPI.getSubscriptionDetails(user.id);
      setSubscriptionDetails(response.data.subscription);
    } catch (err) {
      console.error('Failed to load subscription details:', err);
    }
  };







  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'address') {
      setAddress(value);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
    // Clear messages when user starts editing
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  const handleEdit = () => {
    setIsEditing(true);
    // Store current form data as original when entering edit mode
    setOriginalFormData({ ...formData, address: address });
  };

  const handleCancel = () => {
    // Reset form data to original values
    if (originalFormData) {
      setFormData({
        countryCode: originalFormData.countryCode,
        contact: originalFormData.contact
      });
      setAddress(originalFormData.address || '');
    }
    setIsEditing(false);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSave = async () => {
    if (!user?.id) return;

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Combine country code with contact number
      const contact = `${formData.countryCode}${formData.contact.trim()}`;

      // Validate contact format if provided (should include country code)
      if (contact && contact.trim()) {
        const contactRegex = /^\+\d{1,3}\d{7,15}$/;
        if (!contactRegex.test(contact.trim())) {
          setErrorMessage('Invalid contact format. Phone number must be 7-15 digits.');
          setLoading(false);
          return;
        }
      }

      // Prepare update data - ensure both fields are explicitly sent
      const trimmedAddress = address.trim();
      
      const updateData = {
        // Always include contact field
        contact: contact || null,
        // Always include address field - use empty string instead of null for better compatibility
        address: trimmedAddress || ''
      };
      
      console.log('Updating organization with data:', updateData);
      console.log('Address value:', updateData.address, 'Type:', typeof updateData.address);
      
      await organizationAPI.update(user.id, updateData);

      // Update original form data to current values
      setOriginalFormData({ ...formData, address: address });
      
      // Exit edit mode
      setIsEditing(false);

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
    // Parse current contact to compare
    const parseContact = (contact) => {
      if (!contact) return { countryCode: '+91', number: '' };
      const match = contact.match(/^(\+\d{1,3})(\d+)$/);
      if (match) {
        return { countryCode: match[1], number: match[2] };
      }
      return { countryCode: '+91', number: contact };
    };

    const currentContact = parseContact(user?.contact || '');
    const currentAddress = user?.address || '';
    return formData.countryCode !== currentContact.countryCode || 
           formData.contact !== currentContact.number || 
           address !== currentAddress;
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card dark:bg-dark-bg-tertiary">
        <div className="border-b border-gray-200 dark:border-dark-border pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                <Building2 className="h-6 w-6 mr-2 text-indigo-600 dark:text-dark-primary-500" />
                Organization Settings
              </h2>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-1">Manage your organization logo and view your information</p>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
              Organization Name
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="text"
                value={user?.name || ''}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed dark:text-dark-text-primary opacity-75"
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Email - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="email"
                value={user?.email || ''}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed dark:text-dark-text-primary opacity-75"
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Contact Number - Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
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
                  placeholder="1234567890"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    isEditing 
                      ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                      : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                  }`}
                />
              </div>
            </div>
            <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mt-1">
              Use your WhatsApp number so we can send updates and reminders
            </p>
          </div>

          {/* Address - Editable */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <textarea
                name="address"
                value={address}
                onChange={handleChange}
                disabled={!isEditing}
                rows="3"
                placeholder="Enter organization address"
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none dark:placeholder-dark-text-tertiary resize-y ${
                  isEditing 
                    ? 'bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary' 
                    : 'bg-gray-50 dark:bg-dark-bg-primary dark:text-dark-text-primary cursor-not-allowed opacity-75'
                }`}
              />
            </div>
          </div>

          {/* Save and Cancel Buttons */}
          {isEditing && (
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
              <button
                type="button"
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 bg-gray-200 dark:bg-dark-bg-secondary text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-300 dark:hover:bg-dark-bg-primary transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="h-4 w-4" />
                <span>Cancel</span>
              </button>
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
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{errorMessage}</span>
              <button onClick={() => setErrorMessage('')} className="ml-auto text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          )}

          <ChangePasswordSection />

          {/* Appearance Section */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <div className="flex items-center mb-4">
              <Sun className="h-5 w-5 mr-2 text-primary-600 dark:text-dark-primary-500" />
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

          {/* GST Number - Read Only */}
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
              GST Number
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="text"
                value={user?.gst_no || 'Not provided'}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed dark:text-dark-text-primary"
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Bank Account Section - Only show for non-TheraPTrack controlled organizations */}
          {!subscriptionDetails?.theraptrack_controlled && (
            <div className="border-t border-gray-200 dark:border-dark-border pt-6">
              <div className="flex items-center mb-4">
                <CreditCard className="h-6 w-6 mr-2 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Bank Account Details
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
                Add your bank account details to receive payouts
              </p>
              <BankAccountForm userType="organization" onUpdate={refreshUser} />
            </div>
          )}

          {/* Subscription Section - Only show for non-TheraPTrack controlled organizations */}
          {!subscriptionDetails?.theraptrack_controlled && (
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <div className="flex items-center mb-4">
              <CreditCard className="h-6 w-6 mr-2 text-indigo-600 dark:text-dark-primary-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">Subscription Management</h3>
            </div>

            {/* Current Subscription Plan */}
            {subscriptionDetails?.plan_name && (
              <div className="bg-indigo-50 dark:bg-dark-primary-600/20 border border-indigo-200 dark:border-dark-primary-600 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Current Organization Plan: </span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-dark-primary-500">
                      {subscriptionDetails.plan_name}
                    </span>
                    {subscriptionDetails.min_sessions !== null && subscriptionDetails.max_sessions !== null && (
                      <span className="text-sm text-gray-600 dark:text-dark-text-tertiary ml-2">
                        ({subscriptionDetails.min_sessions} - {subscriptionDetails.max_sessions} sessions/month)
                      </span>
                    )}
                  </div>
                  {subscriptionDetails.has_video && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                      Video Enabled
                    </span>
                  )}
                </div>
                {subscriptionDetails.subscription_billing_period && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Billing Period: <span className="font-medium capitalize">{subscriptionDetails.subscription_billing_period}</span>
                  </div>
                )}
                {subscriptionDetails.subscription_start_date && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                    Start Date: {new Date(subscriptionDetails.subscription_start_date).toLocaleDateString()}
                  </div>
                )}
                {subscriptionDetails.subscription_end_date && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-dark-text-secondary">
                    End Date: {new Date(subscriptionDetails.subscription_end_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* Therapist Subscription Management */}
            <div className="mt-6">
              <NonControlledSubscriptionManagement
                organizationId={user.id}
                organizationName={user.name}
              />
            </div>
          </div>
        )}

        {/* Therapist Video Session Management - Only for TheraPTrack controlled organizations */}
        {subscriptionDetails?.theraptrack_controlled && (
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <div className="flex items-center mb-4">
              <Video className="h-6 w-6 mr-2 text-indigo-600 dark:text-dark-primary-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Therapist Video Session Management
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              Control video session access for individual therapists in your organization
            </p>
            
            <TherapistVideoSettings
              organizationId={user.id}
              organizationName={user.name}
            />
          </div>
        )}

        {/* Therapist Blog Permission Management - Only for TheraPTrack controlled organizations */}
        {subscriptionDetails?.theraptrack_controlled && (
          <div className="border-t border-gray-200 dark:border-dark-border pt-6">
            <div className="flex items-center mb-4">
              <FileText className="h-6 w-6 mr-2 text-primary-600 dark:text-dark-primary-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Therapist Blog Permission Management
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
              Grant or revoke blog posting permissions for therapists in your organization. Only therapists with permission can create and edit blog posts.
            </p>
            
            <TherapistBlogPermissions
              organizationId={user.id}
              organizationName={user.name}
            />
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default OrganizationSettings;
