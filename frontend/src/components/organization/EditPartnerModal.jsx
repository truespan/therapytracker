import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, Users, Award, FileText } from 'lucide-react';
import CountryCodeSelect from '../common/CountryCodeSelect';
import ImageUpload from '../common/ImageUpload';
import { CurrencyIcon } from '../../utils/currencyIcon';

const EditPartnerModal = ({ isOpen, onClose, onSubmit, partner, isLoading }) => {
  const [formData, setFormData] = useState({
    name: '',
    sex: 'Male',
    age: '',
    email: '',
    countryCode: '+91',
    contact: '',
    qualification: '',
    license_id: '',
    address: '',
    photo_url: '',
    work_experience: '',
    other_practice_details: '',
    fee_min: '',
    fee_max: '',
    fee_currency: 'INR',
  });

  const [errors, setErrors] = useState({});

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
        qualification: partner.qualification || '',
        license_id: partner.license_id || '',
        address: partner.address || '',
        photo_url: partner.photo_url || '',
        work_experience: partner.work_experience || '',
        other_practice_details: partner.other_practice_details || '',
        fee_min: partner.fee_min || '',
        fee_max: partner.fee_max || '',
        fee_currency: partner.fee_currency || 'INR',
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

    // Age is now optional, but if provided, must be valid
    if (formData.age && (formData.age < 18 || formData.age > 100)) {
      newErrors.age = 'Age must be between 18 and 100';
    }

    // Fee range validation (optional, but if provided, must be valid)
    if (formData.fee_min || formData.fee_max) {
      if (formData.fee_min && (isNaN(formData.fee_min) || parseFloat(formData.fee_min) < 0)) {
        newErrors.fee_min = 'Minimum fee must be a valid positive number';
      }
      if (formData.fee_max && (isNaN(formData.fee_max) || parseFloat(formData.fee_max) < 0)) {
        newErrors.fee_max = 'Maximum fee must be a valid positive number';
      }
      if (formData.fee_min && formData.fee_max && parseFloat(formData.fee_min) > parseFloat(formData.fee_max)) {
        newErrors.fee_max = 'Maximum fee must be greater than or equal to minimum fee';
      }
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

    if (!formData.qualification.trim()) {
      newErrors.qualification = 'Qualification is required';
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
        age: formData.age ? parseInt(formData.age) : null,
        email: formData.email,
        contact: `${formData.countryCode}${formData.contact}`,
        qualification: formData.qualification,
        license_id: formData.license_id,
        address: formData.address,
        photo_url: formData.photo_url,
        work_experience: formData.work_experience,
        other_practice_details: formData.other_practice_details,
        fee_min: formData.fee_min ? parseFloat(formData.fee_min) : null,
        fee_max: formData.fee_max ? parseFloat(formData.fee_max) : null,
        fee_currency: formData.fee_currency,
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
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600" />
            Edit Therapist
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
          {/* Partner ID Display */}
          {partner && partner.partner_id && (
            <div className="bg-gray-50 dark:bg-dark-bg-secondary border border-gray-200 dark:border-dark-border rounded-lg p-3">
              <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Partner ID: </span>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
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
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Sex <span className="text-red-500">*</span>
              </label>
              <select
                name="sex"
                value={formData.sex}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border ${
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
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                Age (Optional)
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
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
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="therapist@example.com"
                disabled={isLoading}
              />
            </div>
            {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
            {partner && formData.email !== partner.email && (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                Changing email will require re-verification. A new verification email will be sent.
              </p>
            )}
          </div>

          {/* Contact Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Contact Number <span className="text-red-500">*</span>
            </label>
            <div className="flex space-x-2">
              <CountryCodeSelect
                value={formData.countryCode}
                onChange={handleChange}
                name="countryCode"
              />
              <div className="relative flex-1">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="tel"
                  name="contact"
                  value={formData.contact}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
                    errors.contact ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="1234567890"
                  disabled={isLoading}
                />
              </div>
            </div>
            {errors.contact && <p className="mt-1 text-sm text-red-500">{errors.contact}</p>}
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
              Use your WhatsApp number so we can send updates and reminders
            </p>
          </div>

          {/* Qualification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Qualification <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="text"
                name="qualification"
                value={formData.qualification}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
                  errors.qualification ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., M.D. Psychiatry, Clinical Psychologist"
                disabled={isLoading}
              />
            </div>
            {errors.qualification && <p className="mt-1 text-sm text-red-500">{errors.qualification}</p>}
          </div>

          {/* Practitioner License ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Practitioner License ID (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="text"
                name="license_id"
                value={formData.license_id}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                placeholder="e.g., PSY-12345, MED-67890"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Address (Optional)
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                placeholder="Enter full address"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Work Experience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Work Experience (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <textarea
                name="work_experience"
                value={formData.work_experience}
                onChange={handleChange}
                rows="3"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                placeholder="Enter work experience details"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Other Practice Details */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Other Practice Details (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <textarea
                name="other_practice_details"
                value={formData.other_practice_details}
                onChange={handleChange}
                rows="3"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                placeholder="Enter other significant work related details"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Fee Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Fee Range (Optional)
            </label>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Min</label>
                  <div className="relative">
                    <CurrencyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                    <input
                      type="number"
                      name="fee_min"
                      value={formData.fee_min}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
                        errors.fee_min ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.fee_min && <p className="mt-1 text-xs text-red-500">{errors.fee_min}</p>}
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Max</label>
                  <div className="relative">
                    <CurrencyIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                    <input
                      type="number"
                      name="fee_max"
                      value={formData.fee_max}
                      onChange={handleChange}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
                        errors.fee_max ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.fee_max && <p className="mt-1 text-xs text-red-500">{errors.fee_max}</p>}
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Currency</label>
                  <select
                    name="fee_currency"
                    value={formData.fee_currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                    disabled={isLoading}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="JPY">JPY (¥)</option>
                    <option value="CNY">CNY (¥)</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                This information will appear on the therapist's profile as part of the search feature used by individual clients.
              </p>
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
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 dark:text-dark-text-primary bg-gray-100 dark:bg-dark-bg-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors font-medium"
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
