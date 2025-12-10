import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, Calendar, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle, Link2, Unlink } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import { googleCalendarAPI } from '../../services/api';

const PartnerSettings = () => {
  const { user, refreshUser } = useAuth();
  const [googleCalendarStatus, setGoogleCalendarStatus] = useState(null);
  const [connectingCalendar, setConnectingCalendar] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

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

  // Parse contact to extract country code and number for display
  const parseContact = (contact) => {
    if (!contact) return { countryCode: '+91', number: '' };
    const match = contact.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
      return { countryCode: match[1], number: match[2] };
    }
    return { countryCode: '+91', number: contact };
  };

  const { countryCode, number } = parseContact(user?.contact);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="border-b border-gray-200 pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <User className="h-6 w-6 mr-2 text-primary-600" />
            Profile Settings
          </h2>
          <p className="text-gray-600 mt-1">Manage your profile picture and view your information</p>
        </div>

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

          {/* Sex and Age - Read Only */}
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
                Age
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={user?.age || ''}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                  disabled
                  readOnly
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

          {/* Contact Number - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={user?.contact || ''}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
          </div>

          {/* Address - Read Only */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                value={user?.address || 'Not provided'}
                rows="3"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-not-allowed"
                disabled
                readOnly
              />
            </div>
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
      </div>
    </div>
  );
};

export default PartnerSettings;
