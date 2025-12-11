import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, Calendar, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, Link2, Unlink, Award, FileText } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import CountryCodeSelect from '../common/CountryCodeSelect';
import { googleCalendarAPI, partnerAPI } from '../../services/api';

const PartnerSettings = () => {
  const { user, refreshUser } = useAuth();
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState({ type: '', text: '' });

  // Form state for editable fields
  const [formData, setFormData] = useState({
    age: '',
    countryCode: '+91',
    contact: '',
    address: '',
    qualification: '',
    work_experience: '',
    other_practice_details: ''
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
        work_experience: user.work_experience || '',
        other_practice_details: user.other_practice_details || ''
      });
    }
  }, [user]);

  // Load Google Calendar status
  useEffect(() => {
    checkGoogleCalendarStatus();
  }, []);

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
        work_experience: formData.work_experience || null,
        other_practice_details: formData.other_practice_details || null
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <User className="h-6 w-6 mr-2 text-primary-600" />
            Profile Settings
          </h2>
          <p className="text-gray-600 mt-1">Manage your profile information</p>
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
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <span className="text-sm font-medium text-gray-700">Partner ID: </span>
                <span className="text-lg font-bold text-primary-600">{user.partner_id}</span>
              </div>
            )}

            {/* Name - Read Only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={user?.name || ''}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  disabled
                  readOnly
                />
              </div>
            </div>

            {/* Sex and Age */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
                </label>
                <input
                  type="text"
                  value={user?.sex || ''}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  disabled
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Age"
                    min="18"
                    max="100"
                  />
                </div>
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
              <div className="flex space-x-2">
                <CountryCodeSelect
                  value={formData.countryCode}
                  onChange={handleChange}
                  name="countryCode"
                />
                <div className="relative flex-1">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="1234567890"
                  />
                </div>
              </div>
            </div>

            {/* Qualification - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Qualification
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="e.g., M.D. Psychiatry, Clinical Psychologist"
                />
              </div>
            </div>

            {/* Address - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter full address"
                />
              </div>
            </div>

            {/* Work Experience - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work Experience (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  name="work_experience"
                  value={formData.work_experience}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter work experience details"
                />
              </div>
            </div>

            {/* Other Practice Details - Editable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Other Practice Details (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  name="other_practice_details"
                  value={formData.other_practice_details}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter other significant work related details"
                />
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
              <div className={`p-4 rounded-lg ${user.email_verified ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <span className="text-sm font-medium">Email Verification: </span>
                <span className={`text-sm font-bold ${user.email_verified ? 'text-green-700' : 'text-amber-700'}`}>
                  {user.email_verified ? 'Verified ✓' : 'Pending Verification'}
                </span>
              </div>
            )}

            {/* Google Calendar Integration */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center mb-4">
                <CalendarIcon className="h-6 w-6 mr-2 text-primary-600" />
                <h3 className="text-lg font-semibold text-gray-900">Google Calendar Integration</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Connect your Google Calendar to automatically sync appointments. When you create or update appointments, they will appear in your Google Calendar.
              </p>

              {loadingStatus ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : googleCalendarStatus?.connected ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Google Calendar Connected</span>
                      </div>
                      <button
                        onClick={disconnectGoogleCalendar}
                        className="text-sm text-red-600 hover:text-red-700 flex items-center space-x-1"
                      >
                        <Unlink className="h-4 w-4" />
                        <span>Disconnect</span>
                      </button>
                    </div>
                    {googleCalendarStatus.connectedAt && (
                      <p className="text-xs text-gray-600 mt-2">
                        Connected on {new Date(googleCalendarStatus.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Sync Enabled</p>
                      <p className="text-xs text-gray-500 mt-1">
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
                    <p className="text-xs text-gray-500">
                      Last synced: {new Date(googleCalendarStatus.lastSyncedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-primary-700" />
                        <span className="text-sm font-medium text-primary-800">Not Connected</span>
                      </div>
                      <p className="text-xs text-gray-600 mb-4">
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
      </div>
    </div>
  );
};

export default PartnerSettings;
