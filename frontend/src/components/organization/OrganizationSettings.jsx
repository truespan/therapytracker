import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Mail, Phone, MapPin, FileText, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, Save } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import { googleCalendarAPI, organizationAPI } from '../../services/api';

const OrganizationSettings = () => {
  const { user, refreshUser } = useAuth();
  const [contact, setContact] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize form fields when user data is available
  useEffect(() => {
    if (user) {
      setContact(user.contact || '');
      setAddress(user.address || '');
    }
  }, [user]);

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

          {/* Subscription Plan Display */}
          {user && user.subscription_plan && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <span className="text-sm font-medium text-gray-700">Subscription Plan: </span>
              <span className="text-lg font-bold text-indigo-600 uppercase">
                {user.subscription_plan.replace(/_/g, ' ')}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrganizationSettings;
