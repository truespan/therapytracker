import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, User, Lock, Eye, EyeOff, Phone, MapPin, Mail, Save, CheckCircle, XCircle, AlertCircle, Edit, X } from 'lucide-react';
import DarkModeToggle from '../common/DarkModeToggle';
import CountryCodeSelect from '../common/CountryCodeSelect';
import { authAPI, userAPI } from '../../services/api';

const UserSettings = () => {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    countryCode: '+91',
    contact: '',
    address: ''
  });
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [originalFormData, setOriginalFormData] = useState(null);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Initialize form data from user
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

      const { countryCode, number } = parseContact(user.contact);

      const initialFormData = {
        countryCode: countryCode,
        contact: number,
        address: user.address || ''
      };
      setFormData(initialFormData);
      setOriginalFormData(initialFormData);
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear messages when user starts editing
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
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

      // Prepare update data
      const updateData = {
        contact: contact || null,
        address: formData.address.trim() || null
      };
      
      await userAPI.update(user.id, updateData);

      // Update original form data to current values
      setOriginalFormData({ ...formData });
      
      // Exit edit mode
      setIsEditing(false);

      setSuccessMessage('Settings saved successfully!');
      
      // Refresh user data to get updated values
      await refreshUser();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Failed to update user settings:', error);
      setErrorMessage(error.response?.data?.error || 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = () => {
    // Parse current contact to compare
    const parseContact = (contact) => {
      if (!contact) return { countryCode: '+91', number: '' };
      const contactStr = String(contact).trim();
      if (contactStr.startsWith('+91')) {
        return { countryCode: '+91', number: contactStr.substring(3) };
      }
      if (contactStr.startsWith('+1')) {
        return { countryCode: '+1', number: contactStr.substring(2) };
      }
      const match = contactStr.match(/^(\+\d{1,3})(\d+)$/);
      if (match) {
        return { countryCode: match[1], number: match[2] };
      }
      return { countryCode: '+91', number: contactStr };
    };

    const currentContact = parseContact(user?.contact || '');
    const currentAddress = user?.address || '';
    return formData.countryCode !== currentContact.countryCode || 
           formData.contact !== currentContact.number || 
           formData.address !== currentAddress;
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card dark:bg-dark-bg-tertiary">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-dark-border pb-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
                <SettingsIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-dark-primary-500" />
                User Settings
              </h2>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
                Manage your preferences and account settings
              </p>
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

        {/* Profile Information Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 mr-2 text-primary-600 dark:text-dark-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Profile Information
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label dark:text-dark-text-primary">Name</label>
              <input
                type="text"
                value={user?.name || ''}
                disabled
                className="input bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
              />
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                Contact your therapist to update your name
              </p>
            </div>

            <div>
              <label className="label dark:text-dark-text-primary">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input pl-10 bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                Contact your therapist to update your email
              </p>
            </div>

            {/* Contact Number - Editable */}
            <div>
              <label className="label dark:text-dark-text-primary">
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
                        : 'bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75'
                    }`}
                    placeholder="1234567890"
                  />
                </div>
              </div>
              <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mt-1">Enter phone number without country code</p>
            </div>

            {/* Address - Editable */}
            <div>
              <label className="label dark:text-dark-text-primary">
                Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows="3"
                  placeholder="Enter your address"
                  className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:placeholder-dark-text-tertiary resize-y ${
                    isEditing 
                      ? 'dark:bg-dark-bg-secondary dark:text-dark-text-primary' 
                      : 'bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75'
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
          </div>
        </div>

        {/* Appearance Section */}
        <div className="border-t border-gray-200 dark:border-dark-border pt-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
            Appearance
          </h3>
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

        {/* Password Change Section */}
        <div className="border-t border-gray-200 dark:border-dark-border pt-6">
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 mr-2 text-primary-600 dark:text-dark-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Change Password
            </h3>
          </div>

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label dark:text-dark-text-primary">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className="input pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label dark:text-dark-text-primary">New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  className="input pr-10"
                  placeholder="Enter new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label dark:text-dark-text-primary">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  className="input pr-10"
                  placeholder="Confirm new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="btn btn-primary w-full sm:w-auto"
            >
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
