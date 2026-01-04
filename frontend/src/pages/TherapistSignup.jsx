import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Lock, Calendar, Award, FileText, Eye, EyeOff, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import CountryCodeSelect from '../components/common/CountryCodeSelect';
import api from '../services/api';

const TherapistSignup = () => {
  const { token } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get referral code from query parameter (takes precedence over token)
  const referralCodeFromUrl = searchParams.get('referral_code');

  const [tokenValid, setTokenValid] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [referralCode, setReferralCode] = useState(referralCodeFromUrl || '');
  const [referralCodeValid, setReferralCodeValid] = useState(null);
  const [referralDiscount, setReferralDiscount] = useState(null);
  const [verifyingReferral, setVerifyingReferral] = useState(false);

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

  // Verify token on mount (only if no referral code is provided)
  useEffect(() => {
    // If referral code is provided via URL, skip token verification (referral code takes precedence)
    if (referralCodeFromUrl) {
      setTokenValid(null);
      setLoading(false);
      // Verify the referral code from URL immediately
      verifyReferralCode(referralCodeFromUrl);
      return;
    }

    const verifyToken = async () => {
      try {
        const response = await api.get(`/organizations/verify-signup-token/${token}`);
        if (response.data.valid) {
          setTokenValid(true);
          setOrganizationName(response.data.organization_name);
        } else {
          setTokenValid(false);
        }
      } catch (err) {
        console.error('Token verification error:', err);
        setTokenValid(false);
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      verifyToken();
    } else {
      // No token provided - allow signup with referral code
      setTokenValid(null);
      setLoading(false);
    }
  }, [token, referralCodeFromUrl]);

  // Verify referral code
  const verifyReferralCode = async (code) => {
    if (!code || code.trim() === '') {
      setReferralCodeValid(null);
      setReferralDiscount(null);
      setOrganizationName('');
      return;
    }

    setVerifyingReferral(true);
    try {
      const response = await api.get(`/organizations/verify-referral-code/${code}`);
      if (response.data.valid) {
        setReferralCodeValid(true);
        setOrganizationName(response.data.organization_name);
        setReferralDiscount(response.data.discount);
      } else {
        setReferralCodeValid(false);
        setOrganizationName('');
        setReferralDiscount(null);
      }
    } catch (err) {
      console.error('Referral code verification error:', err);
      setReferralCodeValid(false);
      setOrganizationName('');
      setReferralDiscount(null);
    } finally {
      setVerifyingReferral(false);
    }
  };

  // Handle referral code change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (referralCode) {
        verifyReferralCode(referralCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [referralCode]);

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

    // Age is optional, but if provided, must be valid
    if (formData.age && (formData.age < 18 || formData.age > 100)) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate that either token or referral code is provided
    // Referral code takes precedence - if provided, token is not needed
    if (referralCode && !referralCodeValid) {
      setError('Please enter a valid referral code');
      return;
    }
    
    if (!referralCode && !token) {
      setError('Please enter a valid referral code or use a signup link');
      return;
    }

    if (!validate()) {
      return;
    }

    try {
      setSubmitting(true);

      // Combine country code with contact number
      const submitData = {
        ...formData,
        contact: `${formData.countryCode}${formData.contact}`,
        // If referral code is provided, use it and don't send token (bypasses default org)
        // Otherwise, use token
        token: referralCode && referralCodeValid ? undefined : token,
        referral_code: referralCode && referralCodeValid ? referralCode : undefined
      };
      delete submitData.countryCode;
      delete submitData.confirmPassword;

      await api.post('/auth/therapist-signup', submitData);

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Therapist signup error:', err);
      setError(err.response?.data?.error || 'Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg-primary dark:to-dark-bg-secondary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-dark-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Verifying signup link...</p>
        </div>
      </div>
    );
  }

  if (tokenValid === false && !referralCodeValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg-primary dark:to-dark-bg-secondary flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="h-16 w-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Invalid Signup Link</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
            This signup link is invalid or has expired. Please contact your organization to get a new signup link or use a referral code.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg-primary dark:to-dark-bg-secondary flex items-center justify-center p-4">
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <CheckCircle className="h-16 w-16 text-green-500 dark:text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Account Created Successfully!</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
            Please check your email to verify your account. You will be redirected to the login page shortly.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg-primary dark:to-dark-bg-secondary py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary-600 dark:bg-dark-primary-600 text-white px-6 py-8 text-center">
            <Building2 className="h-12 w-12 mx-auto mb-3" />
            <h1 className="text-3xl font-bold mb-2">Join as a Therapist</h1>
            <p className="text-primary-100 dark:text-primary-200">Create your therapist account</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2 text-red-700 dark:text-red-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Organization Info */}
            {organizationName && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                  <Building2 className="h-5 w-5" />
                  <span className="font-medium">Joining: {organizationName}</span>
                </div>
                {referralDiscount && referralDiscount.display && (
                  <div className="mt-2 text-sm text-green-700 dark:text-green-300 font-medium">
                    🎉 {referralDiscount.display} on your subscription!
                  </div>
                )}
              </div>
            )}

            {/* Referral Code (show if no token OR if referral code is provided via URL) */}
            {(!token || referralCodeFromUrl) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                  Referral Code {!referralCodeFromUrl && <span className="text-red-500 dark:text-red-400">*</span>}
                </label>
                <input
                  type="text"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary uppercase ${
                    referralCodeValid === true
                      ? 'border-green-500 dark:border-green-400'
                      : referralCodeValid === false
                      ? 'border-red-500 dark:border-red-400'
                      : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="Enter referral code"
                  disabled={submitting || !!referralCodeFromUrl}
                  readOnly={!!referralCodeFromUrl}
                />
                {referralCodeFromUrl && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
                    Referral code provided - you'll join the organization associated with this code
                  </p>
                )}
                {verifyingReferral && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-tertiary">Verifying...</p>
                )}
                {referralCodeValid === true && (
                  <p className="mt-1 text-sm text-green-600 dark:text-green-400">✓ Valid referral code</p>
                )}
                {referralCodeValid === false && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400">Invalid referral code</p>
                )}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Full Name <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary ${
                    errors.name ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="Enter your full name"
                  disabled={submitting}
                />
              </div>
              {errors.name && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.name}</p>}
            </div>

            {/* Sex and Age */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                  Sex <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary ${
                    errors.sex ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  disabled={submitting}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Others">Others</option>
                </select>
                {errors.sex && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.sex}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                  Age (Optional)
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary ${
                      errors.age ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="Age"
                    min="18"
                    max="100"
                    disabled={submitting}
                  />
                </div>
                {errors.age && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.age}</p>}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Email <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary ${
                    errors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="your.email@example.com"
                  disabled={submitting}
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.email}</p>}
            </div>

            {/* Contact Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Contact Number <span className="text-red-500 dark:text-red-400">*</span>
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
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary ${
                      errors.contact ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                    }`}
                    placeholder="1234567890"
                    disabled={submitting}
                  />
                </div>
              </div>
              {errors.contact && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.contact}</p>}
              <p className="mt-1 text-xs text-primary-600 dark:text-primary-400 font-medium">
              Use your WhatsApp number so you can receive client bookings, appointments, updates and reminders.
              </p>
            </div>

            {/* Qualification */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Qualification <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <Award className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  name="qualification"
                  value={formData.qualification}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary ${
                    errors.qualification ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="e.g., M.D. Psychiatry, Clinical Psychologist"
                  disabled={submitting}
                />
              </div>
              {errors.qualification && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.qualification}</p>}
            </div>

            {/* License ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Practitioner License ID (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  name="license_id"
                  value={formData.license_id}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="e.g., PSY-12345, MED-67890"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Address (Optional)
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="Enter full address"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Work Experience */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Work Experience (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="work_experience"
                  value={formData.work_experience}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="Enter work experience details"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Other Practice Details */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Other Practice Details (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <textarea
                  name="other_practice_details"
                  value={formData.other_practice_details}
                  onChange={handleChange}
                  rows="3"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="Enter other significant work related details"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Fee Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Fee Range (Optional)
              </label>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Min</label>
                  <input
                    type="number"
                    name="fee_min"
                    value={formData.fee_min}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Max</label>
                  <input
                    type="number"
                    name="fee_max"
                    value={formData.fee_max}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    disabled={submitting}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-600 dark:text-dark-text-secondary mb-1">Currency</label>
                  <select
                    name="fee_currency"
                    value={formData.fee_currency}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary"
                    disabled={submitting}
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

            {/* Language Preferences */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Language Preferences (Optional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type="text"
                  name="language_preferences"
                  value={formData.language_preferences}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="e.g., English, Hindi, Tamil"
                  disabled={submitting}
                />
              </div>
              <p className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                <strong>Note:</strong> This data will be displayed to your clients as part of your profile in client's dashboard.
              </p>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Password <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary ${
                    errors.password ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="Enter password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.password}</p>}
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">Must be at least 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-1">
                Confirm Password <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-dark-text-tertiary" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary ${
                    errors.confirmPassword ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-dark-border'
                  }`}
                  placeholder="Confirm password"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-500 dark:text-red-400">{errors.confirmPassword}</p>}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                className="w-full px-6 py-3 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-dark-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400 font-medium">
                Login here
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TherapistSignup;
