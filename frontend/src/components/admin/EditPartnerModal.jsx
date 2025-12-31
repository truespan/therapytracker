import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MessageCircle, Building2 } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';

const EditPartnerModal = ({ isOpen, onClose, onSubmit, isLoading, partner }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    query_resolver: false,
    photo_url: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (partner) {
      setFormData({
        name: partner.name || '',
        email: partner.email || '',
        contact: partner.contact || '',
        query_resolver: partner.query_resolver ?? false,
        photo_url: partner.photo_url || '',
      });
    }
  }, [partner]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Partner name is required';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (formData.contact && !/^\+\d{1,4}\d{7,15}$/.test(formData.contact)) {
      newErrors.contact = 'Contact must be in format: +[country code][number] (e.g., +919876543210)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen || !partner) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <User className="h-6 w-6 mr-2 text-primary-700" />
            Edit Partner
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Partner Photo Upload */}
          {partner && partner.id && (
            <ImageUpload
              currentImageUrl={formData.photo_url}
              onUpload={(photoUrl) => {
                setFormData(prev => ({ ...prev, photo_url: photoUrl }));
              }}
              onDelete={() => {
                setFormData(prev => ({ ...prev, photo_url: null }));
              }}
              label="Partner Photo"
              userType="partner"
              userId={partner.id}
              disabled={isLoading}
            />
          )}

          {/* Organization Info (Read-only) */}
          {partner.organization_name && (
            <div className="bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg p-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-text-secondary">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">Organization:</span>
                <span>{partner.organization_name}</span>
                {partner.theraptrack_controlled && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded">
                    TheraPTrack Controlled
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Partner Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Partner Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:border-dark-border dark:text-dark-text-primary ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter partner name"
                disabled={isLoading}
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:border-dark-border dark:text-dark-text-primary ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="partner@example.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Contact Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:border-dark-border dark:text-dark-text-primary ${
                  errors.contact ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="+919876543210"
                disabled={isLoading}
              />
            </div>
            {errors.contact && <p className="mt-1 text-sm text-red-500">{errors.contact}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
              Format: +[country code][number] (e.g., +919876543210)
            </p>
          </div>

          {/* Query Resolver - Only shown if organization is TheraPTrack Controlled */}
          {partner.theraptrack_controlled && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="query_resolver"
                    checked={formData.query_resolver}
                    onChange={handleChange}
                    className="w-4 h-4 text-primary-700 bg-white border-gray-300 rounded focus:ring-primary-500 focus:ring-2 dark:bg-dark-bg-secondary dark:border-dark-border"
                    disabled={isLoading}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <MessageCircle className="h-4 w-4 text-primary-700 dark:text-dark-primary-500 mr-2" />
                    <span className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                      Query Resolver (Support Team Member)
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                    Enable this partner to respond to support chat queries from users. 
                    Only available for partners in TheraPTrack controlled organizations.
                  </p>
                </div>
              </label>
            </div>
          )}

          {!partner.theraptrack_controlled && (
            <div className="bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
                <strong>Note:</strong> Query Resolver can only be enabled for partners in TheraPTrack controlled organizations.
                This partner's organization is not TheraPTrack controlled.
              </p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
            <p className="text-sm text-primary-900 dark:text-primary-200">
              <strong>Note:</strong> Changes to email will require the partner to use the new email for login.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-bg-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Partner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPartnerModal;



