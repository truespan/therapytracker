import React, { useState, useEffect } from 'react';
import { X, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TherapistSignupModal = ({ isOpen, onClose }) => {
  const [signupToken, setSignupToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [referralCodeValid, setReferralCodeValid] = useState(null);
  const [referralDiscount, setReferralDiscount] = useState(null);
  const [referralOrgName, setReferralOrgName] = useState('');
  const [verifyingReferral, setVerifyingReferral] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      fetchTherapTrackToken();
    }
  }, [isOpen]);

  const fetchTherapTrackToken = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/organizations/theraptrack-token');
      if (response.data.success && response.data.token) {
        setSignupToken(response.data.token);
      } else {
        setError('Unable to generate signup token. Please try again later.');
      }
    } catch (err) {
      console.error('Error fetching TheraPTrack token:', err);
      setError(err.response?.data?.error || 'Failed to load signup form. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Verify referral code
  const verifyReferralCode = async (code) => {
    if (!code || code.trim() === '') {
      setReferralCodeValid(null);
      setReferralDiscount(null);
      setReferralOrgName('');
      return;
    }

    setVerifyingReferral(true);
    try {
      const response = await api.get(`/organizations/verify-referral-code/${code}`);
      if (response.data.valid) {
        setReferralCodeValid(true);
        setReferralOrgName(response.data.organization_name);
        setReferralDiscount(response.data.discount || response.data.discountInfo);
      } else {
        setReferralCodeValid(false);
        setReferralOrgName('');
        setReferralDiscount(null);
      }
    } catch (err) {
      console.error('Referral code verification error:', err);
      setReferralCodeValid(false);
      setReferralOrgName('');
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
      } else {
        setReferralCodeValid(null);
        setReferralDiscount(null);
        setReferralOrgName('');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [referralCode]);

  const handleNavigateToSignup = () => {
    // If referral code is provided and valid, use it (bypasses token system)
    if (referralCode && referralCodeValid) {
      onClose();
      navigate(`/therapist-signup?referral_code=${encodeURIComponent(referralCode)}`);
    } else if (signupToken) {
      // Use token-based flow if no referral code
      onClose();
      navigate(`/therapist-signup/${signupToken}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-primary-600 to-primary-700 dark:from-dark-primary-600 dark:to-dark-primary-700 px-6 py-8 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6" />
          </button>
          
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Join TheraP Track (3 Days Free Trial)</h2>
            <p className="text-primary-100 dark:text-primary-200">
              Start your journey as a therapist with us
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-dark-primary-500 mb-4"></div>
              <p className="text-gray-600 dark:text-dark-text-secondary">Loading signup form...</p>
            </div>
          )}

          {error && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4 mb-4">
              <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
              <button
                onClick={fetchTherapTrackToken}
                className="mt-3 text-sm text-error-700 dark:text-error-300 underline hover:no-underline"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && signupToken && (
            <div className="space-y-6">
              <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-3">
                  Welcome to TheraP Track!
                </h3>
                <p className="text-gray-700 dark:text-dark-text-secondary mb-4">
                  We're excited to have you join our community of mental health professionals. 
                  TheraP Track provides you with powerful tools to:
                </p>
                <ul className="space-y-2 text-gray-700 dark:text-dark-text-secondary">
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-dark-primary-500 mr-2">✓</span>
                    <span>Manage client appointments and sessions efficiently</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-dark-primary-500 mr-2">✓</span>
                    <span>Track client progress with visual mind-body assessments</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-dark-primary-500 mr-2">✓</span>
                    <span>Generate comprehensive session reports</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-dark-primary-500 mr-2">✓</span>
                    <span>Conduct secure video sessions with clients</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary-600 dark:text-dark-primary-500 mr-2">✓</span>
                    <span>Access analytics and insights on client outcomes</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                  What happens next?
                </h4>
                <ol className="space-y-2 text-sm text-gray-700 dark:text-dark-text-secondary">
                  <li className="flex items-start">
                    <span className="font-semibold text-primary-600 dark:text-dark-primary-500 mr-2">1.</span>
                    <span>Complete the therapist registration form</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-primary-600 dark:text-dark-primary-500 mr-2">2.</span>
                    <span>Verify your email address</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-primary-600 dark:text-dark-primary-500 mr-2">3.</span>
                    <span>Accept our Terms & Conditions</span>
                  </li>
                  <li className="flex items-start">
                    <span className="font-semibold text-primary-600 dark:text-dark-primary-500 mr-2">4.</span>
                    <span>Select your subscription plan and start using TheraP Track!</span>
                  </li>
                </ol>
              </div>

              {/* Referral Code Input (Optional) */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-primary mb-2">
                  Have a Referral Code? (Optional)
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
                  placeholder="Enter referral code (e.g., WELCOME2024)"
                  disabled={verifyingReferral}
                />
                {verifyingReferral && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-dark-text-tertiary">Verifying...</p>
                )}
                {referralCodeValid === true && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Valid referral code
                    </p>
                    {referralOrgName && (
                      <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Joining: {referralOrgName}
                      </p>
                    )}
                    {referralDiscount && referralDiscount.display && (
                      <p className="text-sm font-semibold text-green-700 dark:text-green-300">
                        🎉 {referralDiscount.display} on your subscription!
                      </p>
                    )}
                  </div>
                )}
                {referralCodeValid === false && (
                  <p className="mt-1 text-sm text-red-500 dark:text-red-400 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4" />
                    Invalid referral code
                  </p>
                )}
                <p className="text-xs text-gray-600 dark:text-dark-text-tertiary mt-2">
                  If you have a referral code, enter it here to join a specific organization and receive any associated discounts.
                </p>
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleNavigateToSignup}
                  disabled={referralCode && !referralCodeValid}
                  className="bg-primary-600 hover:bg-primary-700 dark:bg-dark-primary-600 dark:hover:bg-dark-primary-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue to Registration
                </button>
              </div>
              {referralCode && !referralCodeValid && (
                <p className="text-center text-sm text-red-500 dark:text-red-400 mt-2">
                  Please enter a valid referral code or leave it blank to continue
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TherapistSignupModal;

