import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import AccountSetupModal from '../components/auth/AccountSetupModal';

const SetupAccount = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [userInfo, setUserInfo] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');

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

  const handleSuccess = () => {
    // Redirect to dashboard after successful setup
    navigate('/user/dashboard', { replace: true });
  };

  // Determine username: email > whatsapp_number > contact
  const username = userInfo?.email || userInfo?.whatsapp_number || userInfo?.contact || '';

  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-dark-text-secondary">Verifying setup link...</p>
        </div>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary px-4">
        <div className="max-w-md w-full bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl p-8 text-center">
          <div className="mb-4">
            <div className="h-16 w-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
              Invalid Setup Link
            </h2>
            <p className="text-gray-600 dark:text-dark-text-secondary">
              {error || 'The setup link is invalid or has expired. Please contact your therapist for a new link.'}
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Use the same AccountSetupModal component used in PaymentSuccess
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-primary">
      <AccountSetupModal
        setupToken={token}
        userId={userInfo?.id}
        username={username}
        onSuccess={handleSuccess}
        message="Please set a password to access your account and view your appointments."
      />
    </div>
  );
};

export default SetupAccount;
