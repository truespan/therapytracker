import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, AlertCircle } from 'lucide-react';
import { organizationAPI } from '../services/api';

const Signup = () => {
  const [userType, setUserType] = useState('user');
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
    organization_id: '',
    partner_id: '',
  });
  const [organizations, setOrganizations] = useState([]);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  // Fetch organizations from API for partner signup
  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoadingOrgs(true);
      setApiError('');
      try {
        const response = await organizationAPI.getAll();
        setOrganizations(response.data.organizations);
        if (response.data.organizations.length === 0) {
          setApiError('No organizations available. Please contact your administrator.');
        }
      } catch (error) {
        console.error('Failed to fetch organizations:', error);
        setApiError('Failed to load organizations. Please refresh the page.');
        setOrganizations([]);
      } finally {
        setLoadingOrgs(false);
      }
    };

    // Only fetch when user selects partner type
    if (userType === 'partner') {
      fetchOrganizations();
    } else {
      setOrganizations([]);
      setApiError('');
    }
  }, [userType]);

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
    
    // Email validation - now required
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      // Validate email format
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

    // User and Partner specific validations
    if (userType === 'user' || userType === 'partner') {
      if (!formData.age) newErrors.age = 'Age is required';
      if (formData.age < 1 || formData.age > 150) newErrors.age = 'Invalid age';
    }

    // User specific validations
    if (userType === 'user') {
      if (!formData.partner_id.trim()) {
        newErrors.partner_id = 'Partner ID is required';
      } else {
        // Validate Partner ID format (2 uppercase letters + 5 digits)
        const partnerIdRegex = /^[A-Z]{2}\d{5}$/;
        if (!partnerIdRegex.test(formData.partner_id.trim())) {
          newErrors.partner_id = 'Partner ID must be 2 uppercase letters followed by 5 digits (e.g., AB12345)';
        }
      }
    }

    // Partner specific validations
    if (userType === 'partner') {
      if (!formData.organization_id) newErrors.organization_id = 'Organization is required';
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

    // Prepare data based on user type
    const submitData = {
      userType,
      email: formData.email,
      contact: `${formData.countryCode}${formData.contact}`, // Combine country code with phone number
      password: formData.password,
      name: formData.name,
      contact: formData.contact,
      address: formData.address || null,
    };

    if (userType === 'user' || userType === 'partner') {
      submitData.sex = formData.sex;
      submitData.age = parseInt(formData.age);
    }

    if (userType === 'user') {
      submitData.partner_id = formData.partner_id.trim().toUpperCase();
    }

    if (userType === 'partner') {
      submitData.organization_id = parseInt(formData.organization_id);
    }

    const result = await signup(submitData);
    
    if (result.success) {
      navigate(`/${result.user.userType}/dashboard`);
    } else {
      setApiError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <Activity className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
            <p className="text-gray-600 mt-2">Join Therapy Tracker today</p>
          </div>

          {/* User Type Selection */}
          <div className="mb-6">
            <label className="label">I am a</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('user')}
                className={`p-3 rounded-lg border-2 font-medium transition ${
                  userType === 'user'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                User/Patient
              </button>
              <button
                type="button"
                onClick={() => setUserType('partner')}
                className={`p-3 rounded-lg border-2 font-medium transition ${
                  userType === 'partner'
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Therapist
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Organizations should be created by system administrators through the admin panel.
            </p>
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="label">Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input"
                  placeholder="Full name"
                />
                {errors.name && <p className="text-red-600 text-sm mt-1">{errors.name}</p>}
              </div>

              {/* Sex (for user and partner) */}
              {(userType === 'user' || userType === 'partner') && (
                <div>
                  <label className="label">Sex *</label>
                  <select name="sex" value={formData.sex} onChange={handleChange} className="input">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Others">Others</option>
                  </select>
                </div>
              )}

              {/* Age (for user and partner) */}
              {(userType === 'user' || userType === 'partner') && (
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
                  {errors.age && <p className="text-red-600 text-sm mt-1">{errors.age}</p>}
                </div>
              )}

              {/* Email */}
              <div>
                <label className="label">Email *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                  placeholder="you@example.com"
                  required
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </div>

              {/* Contact */}
              <div>
                <label className="label">Contact Number *</label>
                <div className="flex space-x-2">
                  <select
                    name="countryCode"
                    value={formData.countryCode}
                    onChange={handleChange}
                    className="input w-24 text-sm px-2"
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
                {errors.contact && <p className="text-red-600 text-sm mt-1">{errors.contact}</p>}
                <p className="text-gray-500 text-xs mt-1">Enter phone number without country code</p>
              </div>

              {/* Partner ID (for user) */}
              {userType === 'user' && (
                <div className="md:col-span-2">
                  <label className="label">Partner ID *</label>
                  <input
                    type="text"
                    name="partner_id"
                    value={formData.partner_id}
                    onChange={handleChange}
                    className="input"
                    placeholder="e.g., AB12345"
                    maxLength="7"
                  />
                  {errors.partner_id && <p className="text-red-600 text-sm mt-1">{errors.partner_id}</p>}
                  <p className="text-gray-500 text-xs mt-1">
                    Enter the 7-character Partner ID provided by your therapist (2 letters + 5 digits)
                  </p>
                </div>
              )}

              {/* Organization (for partner) */}
              {userType === 'partner' && (
                <div className="md:col-span-2">
                  <label className="label">Organization *</label>
                  <select
                    name="organization_id"
                    value={formData.organization_id}
                    onChange={handleChange}
                    className="input"
                    disabled={loadingOrgs}
                  >
                    <option value="">
                      {loadingOrgs ? 'Loading organizations...' : 'Select an organization'}
                    </option>
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {errors.organization_id && (
                    <p className="text-red-600 text-sm mt-1">{errors.organization_id}</p>
                  )}
                  {!loadingOrgs && organizations.length === 0 && !apiError && (
                    <p className="text-amber-600 text-sm mt-1">
                      No organizations available. Please contact your administrator.
                    </p>
                  )}
                </div>
              )}

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
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input"
                  placeholder="••••••••"
                />
                {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="label">Confirm Password *</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input"
                  placeholder="••••••••"
                />
                {errors.confirmPassword && (
                  <p className="text-red-600 text-sm mt-1">{errors.confirmPassword}</p>
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
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
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

