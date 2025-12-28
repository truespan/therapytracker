import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { Activity, Mail, Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Check for success message from email verification
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the state to prevent message from showing on page refresh
      navigate(location.pathname, { replace: true, state: {} });

      // Auto-dismiss success message after 10 seconds
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [location, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Trim email/phone before sending
    const trimmedData = {
      email: formData.email.trim(),
      password: formData.password,
    };

    const result = await login(trimmedData);

    if (result.success) {
      // Route based on user type
      if (result.user.userType === 'admin') {
        navigate('/admin');
      } else {
        navigate(`/${result.user.userType}/dashboard`);
      }
    } else {
      setError(result.error);
    }

    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setError('');
    setLoading(true);

    try {
      const result = await googleLogin(credentialResponse.credential);

      if (result.success) {
        // Route based on user type
        if (result.user.userType === 'admin') {
          navigate('/admin');
        } else {
          navigate(`/${result.user.userType}/dashboard`);
        }
      } else {
        // Handle different error cases
        if (result.details?.error === 'Additional information required') {
          // Redirect to signup with Google user data
          navigate('/signup', {
            state: {
              googleUser: result.details.googleUser,
              message: 'Please complete the signup form to create your account'
            }
          });
        } else {
          setError(result.error || 'Google login failed');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred during Google login');
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg-secondary dark:to-dark-bg-primary py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <Link to="/" className="inline-block mb-4">
              <div className="h-16 w-16 mx-auto bg-white rounded-full flex items-center justify-center p-2 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
                <img
                  src="/TheraPTrackLogoBgRemoved.png"
                  alt="TheraP Track Logo"
                  className="h-full w-full object-contain"
                />
              </div>
            </Link>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Welcome Back</h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-2">Sign in to your account</p>
          </div>

          {successMessage && (
            <div className="mb-4 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-lg flex items-center space-x-2 text-success-700 dark:text-success-300">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center space-x-2 text-error-700 dark:text-error-300">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">
                <Mail className="inline h-4 w-4 mr-1" />
                Email or Phone Number
              </label>
              <input
                type="text"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="email@example.com or 9876543210"
                required
              />
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                Enter phone number without country code (e.g., 9876543210)
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">
                  <Lock className="inline h-4 w-4 mr-1" />
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400 font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
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
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-dark-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-bg-tertiary text-gray-500 dark:text-dark-text-tertiary">Or continue with</span>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                theme="outline"
                size="large"
                text="signin_with"
                shape="rectangular"
                width={320}
              />
            </div>
          </div>

          <div className="mt-6 text-center space-y-3">
            <p className="text-gray-600 dark:text-dark-text-secondary">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400 font-medium">
                Sign up
              </Link>
            </p>
            <div className="pt-3 border-t border-gray-200 dark:border-dark-border">
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                Admin users should login with their admin credentials
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

