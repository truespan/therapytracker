import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const TherapistSignupModal = ({ isOpen, onClose }) => {
  const [signupToken, setSignupToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const handleNavigateToSignup = () => {
    if (signupToken) {
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
            <h2 className="text-3xl font-bold mb-2">Join TheraP Track</h2>
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

              <div className="flex justify-center pt-4">
                <button
                  onClick={handleNavigateToSignup}
                  className="bg-primary-600 hover:bg-primary-700 dark:bg-dark-primary-600 dark:hover:bg-dark-primary-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
                >
                  Continue to Registration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TherapistSignupModal;

