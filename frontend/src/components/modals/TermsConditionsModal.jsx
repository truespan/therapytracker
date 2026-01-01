import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { authAPI } from '../../services/api';

const TermsConditionsModal = ({ isOpen, user, onAccept }) => {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Reset scroll state when modal opens
      setHasScrolledToBottom(false);
      setError('');
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      // Check if scrolled to bottom (with 10px threshold)
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      if (isAtBottom && !hasScrolledToBottom) {
        setHasScrolledToBottom(true);
      }
    }
  };

  const handleAccept = async () => {
    try {
      setAccepting(true);
      setError('');
      
      const response = await authAPI.acceptTerms();
      
      if (response.data && response.data.success) {
        onAccept(response.data.user);
      } else {
        setError(response.data?.error || response.data?.message || 'Failed to accept terms. Please try again.');
      }
    } catch (err) {
      console.error('Error accepting terms:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || err.message || 'Failed to accept terms. Please try again.';
      setError(errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      {/* Modal Content */}
      <div className="relative bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-dark-primary-600 dark:to-dark-primary-700 px-6 py-6 text-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-8 w-8" />
            <div>
              <h2 className="text-2xl font-bold">Terms and Conditions</h2>
              <p className="text-primary-100 dark:text-primary-200 text-sm mt-1">
                Please read and accept to continue
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-6 space-y-4"
        >
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-dark-text-secondary leading-relaxed">
              By proceeding, you acknowledge and agree that:
            </p>

            <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6 space-y-4 mt-4">
              <p className="text-gray-800 dark:text-dark-text-primary">
                You are using <strong>TheraP Track</strong> subject to our Terms of Service and Privacy Policy.
              </p>

              <p className="text-gray-800 dark:text-dark-text-primary">
                We implement technical and organizational safeguards intended to protect user data as per HIPAA guidelines; however, 
                TheraP Track does not represent or warrant HIPAA certification.
              </p>

              <p className="text-gray-800 dark:text-dark-text-primary">
                While we make every reasonable effort to provide secure, reliable, and continuous service, 
                the platform may be affected by unforeseen events, outages, or third-party failures.
              </p>

              <p className="text-gray-800 dark:text-dark-text-primary">
                We will take all reasonable and industry-standard technical and organizational measures to 
                safeguard data and to maintain secure and reliable service. However, you understand that 
                no system is completely free from risk or interruption. Accordingly, the 
                organization will not be liable for service interruptions, data loss, or for any indirect, 
                incidental, or consequential damages arising from the use or inability to use the platform, 
                except to the extent required by applicable law.
              </p>

              <p className="text-gray-800 dark:text-dark-text-primary">
                All services are provided on an <strong>"as is"</strong> and <strong>"as available"</strong> basis, 
                without warranties of any kind, whether express or implied.
              </p>

              <p className="text-gray-800 dark:text-dark-text-primary">
                You are responsible for how you use the platform and for complying with all applicable 
                professional, regulatory, and legal obligations in your jurisdiction.
              </p>

              <p className="text-gray-800 dark:text-dark-text-primary font-semibold">
                Your continued use of TheraP Track constitutes acceptance of these terms.
              </p>
            </div>

            {!hasScrolledToBottom && (
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Please scroll to the bottom to read all terms before accepting.
                </p>
              </div>
            )}

            {hasScrolledToBottom && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-200">
                  You have read all the terms. You may now accept to continue.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-dark-border px-6 py-4 bg-gray-50 dark:bg-dark-bg-tertiary rounded-b-2xl">
          {error && (
            <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
              <span className="text-sm text-error-700 dark:text-error-300">{error}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-dark-text-tertiary">
              You must accept the terms to use TheraP Track
            </p>
            <button
              onClick={handleAccept}
              disabled={!hasScrolledToBottom || accepting}
              className={`px-8 py-3 rounded-lg font-semibold text-white transition-all ${
                hasScrolledToBottom && !accepting
                  ? 'bg-primary-600 hover:bg-primary-700 dark:bg-dark-primary-600 dark:hover:bg-dark-primary-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
              }`}
            >
              {accepting ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Accepting...</span>
                </span>
              ) : (
                'I Accept'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsConditionsModal;

