import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AccountSetupModal = ({ setupToken, userId, onSuccess }) => {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, updateUser } = useAuth();
  const navigate = useNavigate();
  const backdropRef = useRef(null);

  // Prevent body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPosition = document.body.style.position;
    const scrollY = window.scrollY;
    
    document.body.style.overflow = 'hidden';
    if (window.innerWidth <= 768) {
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      if (window.innerWidth <= 768) {
        document.body.style.position = originalPosition;
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, scrollY);
      }
    };
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Clear error for this field
    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};

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

    if (!validateForm()) {
      return;
    }

    if (!setupToken) {
      setErrors({ password: 'Invalid setup token. Please contact support.' });
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.setupAccount(setupToken, formData.password);
      
      // Auto-login the user
      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('lastActivityTimestamp', Date.now().toString());
        
        // Update auth context
        if (updateUser) {
          updateUser(response.data.user);
        }
      }

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to dashboard
        navigate(`/user/dashboard`, { replace: true });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to set up account. Please try again.';
      setErrors({ password: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      ref={backdropRef}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        // Prevent closing on backdrop click
        e.stopPropagation();
      }}
    >
      <div 
        className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - No close button */}
        <div className="bg-primary-50 dark:bg-dark-bg-primary border-b border-primary-200 dark:border-dark-border px-6 py-4">
          <h3 className="text-lg font-semibold text-primary-900 dark:text-dark-text-primary">
            Set Up Your Account
          </h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            Create a password to access your account
          </p>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Info message */}
          <div className="bg-blue-50 dark:bg-dark-bg-primary border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              Your booking was successful! Please set a password to access your account and view your appointments.
            </p>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary ${
                  errors.password ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'
                }`}
                placeholder="Enter password (min. 6 characters)"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary ${
                  errors.confirmPassword ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'
                }`}
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-dark-text-tertiary dark:hover:text-dark-text-secondary"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.confirmPassword}
              </p>
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Setting up...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Set Up Account
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AccountSetupModal;
