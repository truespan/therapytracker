import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, MapPin, Calendar } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';

const PartnerSettings = () => {
  const { user, refreshUser } = useAuth();

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
        </div>
      </div>
    </div>
  );
};

export default PartnerSettings;
