import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Users } from 'lucide-react';
import CountryCodeSelect from '../common/CountryCodeSelect';
import ImageUpload from '../common/ImageUpload';

const EditPartnerModal = ({ isOpen, onClose, onSubmit, partner, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    sex: 'Male',
    age: '',
    email: '',
    countryCode: '+91',
    contact: '',
    address: '',
    photo_url: '',
  });

  const [errors, setErrors] = useState({});

  // Parse contact to extract country code and number
  const parseContact = (contact) => {
    if (!contact) return { countryCode: '+91', number: '' };

    const match = contact.match(/^(\+\d{1,3})(\d+)$/);
    if (match) {
      return { countryCode: match[1], number: match[2] };
    }
    return { countryCode: '+91', number: contact };
  };

  useEffect(() => {
    if (partner && isOpen) {
      const { countryCode, number } = parseContact(partner.contact);
      setFormData({
        name: partner.name || '',
        sex: partner.sex || 'Male',
        age: partner.age || '',
        email: partner.email || '',
        countryCode: countryCode,
        contact: number,
        address: partner.address || '',
        photo_url: partner.photo_url || '',
      });
    }
  }, [partner, isOpen]);

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
    } else if (formData.age < 18 || formData.age > 100) {
      newErrors.age = 'Age must be between 18 and 100';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else if (!/^\d{7,15}$/.test(formData.contact)) {
      newErrors.contact = 'Contact number must be 7-15 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Combine country code with contact number
      const submitData = {
        name: formData.name,
        sex: formData.sex,
        age: parseInt(formData.age),
        email: formData.email,
        contact: `${formData.countryCode}${formData.contact}`,
        address: formData.address,
        photo_url: formData.photo_url,
      };
      onSubmit(submitData);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600" />
            Edit Therapist
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
          {/* Partner ID Display */}
          {partner && partner.partner_id && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <span className="text-sm font-medium text-gray-700">Partner ID: </span>
              <span className="text-sm font-bold text-primary-600">{partner.partner_id}</span>
            </div>
          )}

          {/* Profile Picture Upload */}
          {partner && partner.id && (
            <ImageUpload
              currentImageUrl={formData.photo_url}
              onUpload={(photoUrl) => {
                setFormData(prev => ({ ...prev, photo_url: photoUrl }));
              }}
              onDelete={() => {
                setFormData(prev => ({ ...prev, photo_url: null }));
              }}
              label="Profile Picture"
              userType="partner"
              userId={partner.id}
              disabled={isLoading}
            />
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
                placeholder="Enter therapist's full name"
                disabled={isLoading}
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
                disabled={isLoading}
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
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors.age ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Age"
                  min="18"
                  max="100"
                  disabled={isLoading}
                />
              </div>
              {errors.age && <p className="mt-1 text-sm text-red-500">{errors.age}</p>}
            </div>
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
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="therapist@example.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            {partner && formData.email !== partner.email && (
              <p className="mt-1 text-xs text-amber-600">
                Changing email will require re-verification. A new verification email will be sent.
              </p>
            )}
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
                  disabled={isLoading}
                />
              </div>
            </div>
            {errors.contact && <p className="mt-1 text-sm text-red-500">{errors.contact}</p>}
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
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email Verification Status */}
          {partner && (
            <div className={`p-3 rounded-lg ${partner.email_verified ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <span className="text-sm font-medium">Email Verification: </span>
              <span className={`text-sm font-bold ${partner.email_verified ? 'text-green-700' : 'text-amber-700'}`}>
                {partner.email_verified ? 'Verified ✓' : 'Pending Verification'}
              </span>
            </div>
          )}

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
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? 'Updating...' : 'Update Therapist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPartnerModal;
