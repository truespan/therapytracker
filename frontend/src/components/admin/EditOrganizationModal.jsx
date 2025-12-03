import React, { useState, useEffect } from 'react';
import { X, Building2, Mail, Phone, MapPin, FileText, CreditCard } from 'lucide-react';
import ImageUpload from '../common/ImageUpload';

const EditOrganizationModal = ({ isOpen, onClose, onSubmit, isLoading, organization }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    address: '',
    gst_no: '',
    subscription_plan: '',
    video_sessions_enabled: true,
    photo_url: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || '',
        email: organization.email || '',
        contact: organization.contact || '',
        address: organization.address || '',
        gst_no: organization.gst_no || '',
        subscription_plan: organization.subscription_plan || '',
        video_sessions_enabled: organization.video_sessions_enabled ?? true,
        photo_url: organization.photo_url || '',
      });
    }
  }, [organization]);

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
      newErrors.name = 'Organization name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\d{10}$/.test(formData.contact.replace(/\D/g, ''))) {
      newErrors.contact = 'Contact number must be 10 digits';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
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

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-indigo-600" />
            Edit Organization
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Organization Logo Upload */}
          {organization && organization.id && (
            <ImageUpload
              currentImageUrl={formData.photo_url}
              onUpload={(photoUrl) => {
                setFormData(prev => ({ ...prev, photo_url: photoUrl }));
              }}
              onDelete={() => {
                setFormData(prev => ({ ...prev, photo_url: null }));
              }}
              label="Organization Logo"
              userType="organization"
              userId={organization.id}
              disabled={isLoading}
            />
          )}

          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter organization name"
                disabled={isLoading}
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="organization@example.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.contact ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="1234567890"
                disabled={isLoading}
              />
            </div>
            {errors.contact && <p className="mt-1 text-sm text-red-500">{errors.contact}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  errors.address ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter full address"
                disabled={isLoading}
              />
            </div>
            {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address}</p>}
          </div>

          {/* GST Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Number (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="gst_no"
                value={formData.gst_no}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="GST registration number"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Subscription Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subscription Plan
            </label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                name="subscription_plan"
                value={formData.subscription_plan}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                disabled={isLoading}
              >
                <option value="">No plan</option>
                <option value="basic">Plan Basic</option>
                <option value="basic_silver">Plan Basic - Silver</option>
                <option value="basic_gold">Plan Basic - Gold</option>
                <option value="pro_silver">Plan Pro - Silver</option>
                <option value="pro_gold">Plan Pro - Gold</option>
                <option value="pro_platinum">Plan Pro - Platinum</option>
              </select>
            </div>
          </div>

          {/* Video Sessions Toggle */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  name="video_sessions_enabled"
                  checked={formData.video_sessions_enabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
                  disabled={isLoading}
                />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  Enable Video Sessions
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  Allow partners in this organization to create and manage video sessions with their clients.
                  When disabled, existing sessions remain accessible via direct link but cannot be managed.
                </p>
              </div>
            </label>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Changes to email will require the organization to use the new email for login.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditOrganizationModal;

