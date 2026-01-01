import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Edit, AlertCircle } from 'lucide-react';
import CountryCodeSelect from '../common/CountryCodeSelect';
import { userAPI } from '../../services/api';

const EditClientModal = ({ isOpen, onClose, client, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    sex: 'Male',
    age: '',
    email: '',
    countryCode: '+91',
    contact: '',
    address: '',
  });

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  // Populate form when client data is available
  useEffect(() => {
    if (client) {
      // Parse contact number to separate country code and phone number
      let countryCode = '+91';
      let contactNumber = client.contact || '';
      
      if (contactNumber && contactNumber.startsWith('+')) {
        // Find the country code (everything up to the first space or end of string)
        const spaceIndex = contactNumber.indexOf(' ');
        if (spaceIndex > 0) {
          countryCode = contactNumber.substring(0, spaceIndex);
          contactNumber = contactNumber.substring(spaceIndex + 1);
        } else {
          // No space, try to extract country code from the number
          // Common country codes: +1 (US/CA), +44 (UK), +61 (AU), +91 (IN), etc.
          if (contactNumber.startsWith('+1')) {
            countryCode = '+1';
            contactNumber = contactNumber.substring(2);
          } else if (contactNumber.startsWith('+44')) {
            countryCode = '+44';
            contactNumber = contactNumber.substring(3);
          } else if (contactNumber.startsWith('+61')) {
            countryCode = '+61';
            contactNumber = contactNumber.substring(3);
          } else if (contactNumber.startsWith('+91')) {
            countryCode = '+91';
            contactNumber = contactNumber.substring(3);
          } else {
            // Default to +91 if we can't determine
            countryCode = '+91';
          }
        }
      }

      setFormData({
        name: client.name || '',
        sex: client.sex || 'Male',
        age: client.age || '',
        email: client.email || '',
        countryCode: countryCode,
        contact: contactNumber,
        address: client.address || '',
      });
    }
  }, [client]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    setApiError('');
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.sex) {
      newErrors.sex = 'Sex is required';
    }

    if (!formData.age) {
      newErrors.age = 'Age is required';
    } else if (formData.age < 1 || formData.age > 150) {
      newErrors.age = 'Age must be between 1 and 150';
    }

    // Email is optional, but if provided, validate format
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\d{7,15}$/.test(formData.contact.trim())) {
      newErrors.contact = 'Contact number must be 7-15 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const updates = {
        name: formData.name.trim(),
        sex: formData.sex,
        age: parseInt(formData.age),
        email: formData.email.trim() || null,
        contact: `${formData.countryCode}${formData.contact.trim()}`,
        address: formData.address ? formData.address.trim() : null,
      };

      const response = await userAPI.update(client.id, updates);

      if (response.data && response.data.user) {
        // Success - close modal and trigger success callback
        handleClose();
        if (onSuccess) {
          onSuccess(response.data.user);
        }
      }
    } catch (err) {
      console.error('Failed to update client:', err);
      setApiError(err.response?.data?.error || 'Failed to update client details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setApiError('');
    onClose();
  };

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <Edit className="h-6 w-6 mr-2 text-primary-600" />
            Edit Client Details
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 dark:text-dark-text-tertiary hover:text-gray-600 dark:hover:text-dark-text-secondary transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {apiError && (
            <div className="mb-4 p-3 bg-error-50 border border-error-200 rounded-lg flex items-center space-x-2 text-error-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{apiError}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter client's full name"
                disabled={loading}
              />
            </div>
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Sex and Age */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sex <span className="text-red-500">*</span>
              </label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.sex ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Others">Others</option>
              </select>
              {errors.sex && <p className="mt-1 text-sm text-red-500">{errors.sex}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.age ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Age"
                min="1"
                max="150"
                disabled={loading}
              />
              {errors.age && <p className="mt-1 text-sm text-red-500">{errors.age}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email (Optional)
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="client@example.com (optional)"
                disabled={loading}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contact Number <span className="text-red-500">*</span>
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
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.contact ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1234567890"
                  disabled={loading}
                />
              </div>
            </div>
            {errors.contact && <p className="mt-1 text-sm text-red-500">{errors.contact}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
            Use your WhatsApp number so you can receive client bookings, appointments, updates and reminders.
            </p>
          </div>

          {/* Address */}
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
                disabled={loading}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditClientModal;