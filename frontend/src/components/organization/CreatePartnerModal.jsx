import React, { useState } from 'react';
import { X, User, Mail, Phone, MapPin, Lock, Calendar, Users, Award, FileText, Eye, EyeOff, AlertCircle } from 'lucide-react';
import CountryCodeSelect from '../common/CountryCodeSelect';

const CreatePartnerModal = ({ isOpen, onClose, onSubmit, isLoading }) => {
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
    password: '',
    confirmPassword: '',
    photo_url: '',
    work_experience: '',
    other_practice_details: '',
    fee_min: '',
    fee_max: '',
    fee_currency: 'INR',
    language_preferences: '',
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      // Combine country code with contact number
      const submitData = {
        ...formData,
        contact: `${formData.countryCode}${formData.contact}`,
      };
      delete submitData.countryCode;
      delete submitData.confirmPassword;
      onSubmit(submitData);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      sex: 'Male',
      age: '',
      email: '',
      countryCode: '+91',
      contact: '',
      qualification: '',
      license_id: '',
      address: '',
      password: '',
      confirmPassword: '',
      photo_url: '',
      work_experience: '',
      other_practice_details: '',
      fee_min: '',
      fee_max: '',
      fee_currency: 'INR',
      language_preferences: '',
    });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <Users className="h-6 w-6 mr-2 text-primary-600 dark:text-dark-primary-500" />
            Add New Therapist
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
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
              A verification email will be sent to this address
            </p>
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">₹</span>
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
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 font-medium">₹</span>
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
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                <strong>Note:</strong> This data will be displayed to your clients as part of your profile in client's dashboard.
              </p>
            </div>
          </div>

          {/* Language Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Language Preferences (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type="text"
                name="language_preferences"
                value={formData.language_preferences}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                placeholder="e.g., English, Hindi, Tamil"
                disabled={isLoading}
              />
            </div>
            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
              <strong>Note:</strong> This data will be displayed to your clients as part of your profile in client's dashboard.
            </p>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Initial Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter initial password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 flex items-center">
              <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>The therapist will use this password for initial login <strong>after email verification</strong></span>
            </p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary dark:border-dark-border dark:placeholder-dark-text-tertiary ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Confirm password"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>}
          </div>

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
              {isLoading ? 'Creating...' : 'Create Therapist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePartnerModal;
