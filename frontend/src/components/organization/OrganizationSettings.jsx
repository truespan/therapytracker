import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Building2, Mail, Phone, MapPin, FileText, Calendar as CalendarIcon, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';
import { googleCalendarAPI } from '../../services/api';

const OrganizationSettings = () => {
  const { user, refreshUser } = useAuth();

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
