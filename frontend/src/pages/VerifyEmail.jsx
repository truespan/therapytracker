import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, Activity, ArrowRight } from 'lucide-react';
import { authAPI } from '../services/api';

const VerifyEmail = () => {
  console.log('VerifyEmail component rendered!');
  console.log('🔵 Current URL:', window.location.href);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [partnerInfo, setPartnerInfo] = useState(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (!token || !type) {
        setStatus('error');
        setMessage('Invalid verification link. Please check your email and try again.');
        return;
      }

      try {
        console.log('🔵 Calling backend API to verify email...');
        console.log('🔵 Token:', token?.substring(0, 10) + '...');
        console.log('🔵 Type:', type);

        const response = await authAPI.verifyEmail(token, type);

        console.log('✅ Verification API response:', response.data);

        setStatus('success');
        setMessage(response.data.message);
        setPartnerInfo(response.data.partner);

        // Check if email was verified successfully
        if (response.data.partner?.email_verified) {
          console.log('✅ Email verified successfully! Partner:', response.data.partner.name);
          console.log('✅ Redirecting to login page in 3 seconds...');

          // Navigate to login page after a short delay to show success message
          setTimeout(() => {
            navigate('/login', {
              state: {
                message: 'Email verified successfully! You can now log in with your credentials.',
                emailVerified: true
              }
            });
          }, 3000); // 3 second delay to show success message
        }
      } catch (error) {
        console.error('❌ Email verification error:', error);
        console.error('❌ Error response:', error.response?.data);
        console.error('❌ Error status:', error.response?.status);
        console.error('❌ Error details:', error.message);

        setStatus('error');
        setMessage(
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Email verification failed. The link may be invalid or expired.'
        );
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Activity className="h-10 w-10 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Therapy Tracker</h1>
          </div>
          <h2 className="text-xl font-semibold text-gray-700">Email Verification</h2>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {status === 'verifying' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <Loader className="h-16 w-16 text-primary-600 animate-spin" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Verifying Your Email
              </h3>
              <p className="text-gray-600">
                Please wait while we verify your email address...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Email Verified Successfully!
              </h3>
              <p className="text-gray-600 mb-6">{message}</p>

              {partnerInfo && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Your Account Details</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-gray-600">Name:</span>{' '}
                      <span className="font-medium text-gray-900">{partnerInfo.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>{' '}
                      <span className="font-medium text-gray-900">{partnerInfo.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Partner ID:</span>{' '}
                      <span className="font-medium text-primary-600">{partnerInfo.partner_id}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="font-medium">Email Verified</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleLoginRedirect}
                className="w-full btn btn-primary flex items-center justify-center space-x-2"
              >
                <span>Continue to Login</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <XCircle className="h-16 w-16 text-red-600" />
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h3>
              <p className="text-gray-600 mb-6">{message}</p>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 text-left">
                <h4 className="text-sm font-medium text-amber-900 mb-2">What to do next:</h4>
                <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                  <li>Check if you clicked the latest verification email</li>
                  <li>Verification links expire after 1 hour</li>
                  <li>Contact your organization administrator to resend the verification email</li>
                </ul>
              </div>

              <Link
                to="/login"
                className="w-full btn btn-secondary flex items-center justify-center space-x-2"
              >
                <span>Back to Login</span>
              </Link>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
