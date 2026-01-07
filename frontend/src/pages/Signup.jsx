import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { Activity, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const partnerIdFromUrl = searchParams.get('therapist_id') || '';

  const [formData, setFormData] = useState({
    name: '',
    sex: 'Male',
    age: '',
    email: '',
    countryCode: '+91',
    contact: '',
    address: '',
    password: '',
    confirmPassword: '',
    partner_id: partnerIdFromUrl,
  });

  // Update partner_id when URL parameter changes
  useEffect(() => {
    if (partnerIdFromUrl) {
      setFormData(prev => ({
        ...prev,
        partner_id: partnerIdFromUrl,
      }));
    }
  }, [partnerIdFromUrl]);

  // Handle Google user data from login redirect
  useEffect(() => {
    if (location.state?.googleUser) {
      const { name, email } = location.state.googleUser;
      setFormData(prev => ({
        ...prev,
        name: name || '',
        email: email || '',
      }));
      setApiError(location.state.message || '');
    }
  }, [location]);

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signup, googleLogin } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error for this field
    setErrors({ ...errors, [e.target.name]: '' });
    setApiError('');
  };

  const validateForm = () => {
    const newErrors = {};

    // Common validations
    if (!formData.name.trim()) newErrors.name = 'Name is required';

    // Email is optional, but if provided, validate format
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Contact validation
    if (!formData.contact.trim()) {
      newErrors.contact = 'Contact number is required';
    } else {
      // Validate phone number (only digits, 7-15 digits)
      const phoneRegex = /^\d{7,15}$/;
      if (!phoneRegex.test(formData.contact.trim())) {
        newErrors.contact = 'Please enter a valid phone number (7-15 digits)';
      }
    }

    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // User specific validations
    if (!formData.age) newErrors.age = 'Age is required';
    if (formData.age < 1 || formData.age > 150) newErrors.age = 'Invalid age';

    if (!formData.partner_id.trim()) {
      newErrors.partner_id = 'Partner ID is required';
    } else {
      // Validate Partner ID format (2 uppercase letters + 5 digits)
      const partnerIdRegex = /^[A-Z]{2}\d{5}$/;
      if (!partnerIdRegex.test(formData.partner_id.trim())) {
        newErrors.partner_id = 'Partner ID must be 2 uppercase letters followed by 5 digits (e.g., AB12345)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    // Check if this is a Google signup (has Google token)
    if (location.state?.googleToken) {
      // Complete Google signup
      const result = await completeGoogleSignup();
      
      if (result.success) {
        navigate(`/${result.user.userType}/dashboard`);
      } else {
        setApiError(result.error);
      }
    } else {
      // Regular signup
      const submitData = {
        userType: 'user',
        email: formData.email.trim() || null,
        contact: `${formData.countryCode}${formData.contact.trim()}`,
        password: formData.password,
        name: formData.name.trim(),
        address: formData.address ? formData.address.trim() : null,
        sex: formData.sex,
        age: parseInt(formData.age),
        partner_id: formData.partner_id.trim().toUpperCase(),
      };

      const result = await signup(submitData);

      if (result.success) {
        navigate(`/${result.user.userType}/dashboard`);
      } else {
        setApiError(result.error);
      }
    }

    setLoading(false);
  };

  const completeGoogleSignup = async () => {
    try {
      const googleToken = location.state.googleToken;
      
      const submitData = {
        token: googleToken,
        partner_id: formData.partner_id.trim().toUpperCase(),
        contact: `${formData.countryCode}${formData.contact.trim()}`,
        age: parseInt(formData.age),
        sex: formData.sex,
        address: formData.address ? formData.address.trim() : null
      };

      const response = await authAPI.googleCompleteSignup(submitData);
      
      if (response.data.token) {
        // Store auth data
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('lastActivityTimestamp', Date.now().toString());
        
        return { success: true, user: response.data.user };
      }
      
      return { success: false, error: 'Signup failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Google signup failed'
      };
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setApiError('');
    setLoading(true);

    try {
      const result = await googleLogin(credentialResponse.credential);

      if (result.success) {
        // Redirect to dashboard if user exists
        navigate(`/${result.user.userType}/dashboard`);
      } else {
        // Handle different error cases
        if (result.details?.error === 'Additional information required') {
          // Pre-fill form with Google user data
          const { name, email } = result.details.googleUser;
          setFormData(prev => ({
            ...prev,
            name: name || '',
            email: email || '',
          }));
          setApiError('Please complete the additional required information below');
        } else {
          setApiError(result.error || 'Google signup failed');
        }
      }
    } catch (err) {
      setApiError('An unexpected error occurred during Google signup');
      console.error('Google signup error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setApiError('Google signup failed. Please try again or use the manual signup form.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg-secondary dark:to-dark-bg-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <button
              onClick={() => navigate('/')}
              className="h-14 w-14 sm:h-16 sm:w-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center p-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
            >
              <img
                src="/TheraPTrackLogoBgRemoved.png"
                alt="TheraP Track Logo"
                className="h-full w-full object-contain"
              />
            </button>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Create Client Account</h2>
            <p className="text-sm sm:text-base text-gray-600 dark:text-dark-text-secondary mt-2">Join TheraP Track today</p>
          </div>

          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
            <p className="text-xs sm:text-sm text-primary-900 dark:text-primary-200">
              <strong>Note:</strong> This signup is for patients/clients only and not for Therapists.
            </p>
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center space-x-2 text-error-700 dark:text-error-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{apiError}</span>
            </div>
          )}

          <div className="mb-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-dark-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-bg-tertiary text-gray-500 dark:text-dark-text-tertiary">Or sign up with</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signup_with"
                shape="rectangular"
                width={320}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="sm:col-span-2">
                <label className="label">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Full name"
                />
                {errors.name && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Sex */}
              <div>
                <label className="label">Sex *</label>
                <select name="sex" value={formData.sex} onChange={handleChange} className="input">
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="label">Age *</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="input"
                  placeholder="Age"
                />
                {errors.age && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.age}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="label">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="you@example.com (optional)"
                />
                {errors.email && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.email}</p>}
                <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mt-1">
                  Recommended: Email will be used for forgot password feature. If not provided, mobile number will be used as username for login
                </p>
              </div>

              {/* Contact */}
              <div>
                <label className="label">Contact Number *</label>
                <div className="flex space-x-2">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange}
                    className="input w-20 sm:w-24 text-xs sm:text-sm px-1 sm:px-2"
                  >
                    <option value="+91">🇮🇳 +91</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+61">🇦🇺 +61</option>
                    <option value="+81">🇯🇵 +81</option>
                    <option value="+86">🇨🇳 +86</option>
                    <option value="+49">🇩🇪 +49</option>
                    <option value="+33">🇫🇷 +33</option>
                    <option value="+39">🇮🇹 +39</option>
                    <option value="+7">🇷🇺 +7</option>
                    <option value="+55">🇧🇷 +55</option>
                    <option value="+27">🇿🇦 +27</option>
                    <option value="+82">🇰🇷 +82</option>
                    <option value="+65">🇸🇬 +65</option>
                    <option value="+60">🇲🇾 +60</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+966">🇸🇦 +966</option>
                    <option value="+20">🇪🇬 +20</option>
                    <option value="+234">🇳🇬 +234</option>
                    <option value="+52">🇲🇽 +52</option>
                  </select>
                  <input
                    type="tel"
                    name="contact"
                    value={formData.contact}
                    onChange={handleChange}
                    className="input flex-1"
                    placeholder="9876543210"
                    pattern="[0-9]*"
                  />
                </div>
                {errors.contact && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.contact}</p>}
                <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mt-1">Use your WhatsApp number so you can receive client bookings, appointments, updates and reminders.</p>
              </div>

              {/* Partner ID */}
              <div className="md:col-span-2">
                <label className="label">Partner ID *</label>
                <input
                  type="text"
                  name="partner_id"
                  value={formData.partner_id}
                  onChange={handleChange}
                  className={`input ${partnerIdFromUrl ? 'bg-gray-100 dark:bg-dark-bg-primary cursor-not-allowed' : ''}`}
                  placeholder="e.g., AB12345"
                  maxLength="7"
                  readOnly={!!partnerIdFromUrl}
                />
                {errors.partner_id && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.partner_id}</p>}
                <p className="text-gray-500 dark:text-dark-text-tertiary text-xs mt-1">
                  {partnerIdFromUrl
                    ? 'Partner ID has been pre-filled from the signup link'
                    : 'Enter the 7-character Partner ID provided by your therapist (2 letters + 5 digits)'}
                </p>
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="label">Address (Optional)</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="input"
                  rows="2"
                  placeholder="Street address, city, state, zip"
                />
              </div>

              {/* Password */}
              <div>
                <label className="label">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="label">Confirm Password *</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="input pr-10"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-dark-text-secondary">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
