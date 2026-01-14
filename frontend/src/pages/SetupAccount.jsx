import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const SetupAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { updateUser } = useAuth();

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid setup link. Please contact your therapist for a new link.');
        setVerifying(false);
        return;
      }

      try {
        const response = await authAPI.verifySetupToken(token);
        setUserInfo(response.data.user);
        setVerifying(false);
      } catch (err) {
        setError(err.response?.data?.error || 'Invalid or expired setup link. Please contact your therapist for a new link.');
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!token) {
      setError('Invalid setup link. Please contact your therapist for a new link.');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.setupAccount(token, formData.password);
      
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

      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/user/dashboard', { replace: true });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set up account. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Verifying setup link...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="h-16 w-16 mx-auto mb-4 bg-white rounded-full flex items-center justify-center p-2 shadow-md">
              <img
                src="/TheraPTrackLogoBgRemoved.png"
                alt="TheraP Track Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <h2 className="text-3xl font-bold text-gray-900">Set Up Your Account</h2>
            {userInfo && (
              <p className="text-gray-600 mt-2">Welcome, {userInfo.name}!</p>
            )}
            <p className="text-gray-600 mt-1">Create a password to access your account</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Account setup successful!</p>
                <p>Redirecting to dashboard...</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="label">
                <Lock className="inline h-4 w-4 mr-1" />
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Enter password (min. 6 characters)"
                  required
                  disabled={success || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={success || loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">
                <Lock className="inline h-4 w-4 mr-1" />
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder="Confirm your password"
                  required
                  disabled={success || loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={success || loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  Set Up Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/login" 
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupAccount;
