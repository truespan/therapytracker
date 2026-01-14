import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle, Copy, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AccountSetupModal from '../components/auth/AccountSetupModal';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [paymentData, setPaymentData] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [accountSetupComplete, setAccountSetupComplete] = useState(false);

  useEffect(() => {
    // Get payment and booking data from location state
    if (location.state?.payment) {
      setPaymentData(location.state.payment);
    }
    if (location.state?.booking) {
      setBookingData(location.state.booking);
    }
    
    if (!location.state?.payment) {
      // If no payment data, redirect to dashboard
      navigate(user?.userType === 'admin' ? '/admin' : `/${user?.userType || 'user'}/dashboard`, { replace: true });
    }
  }, [location.state, navigate, user]);

  // Auto-redirect countdown (only if account setup is not needed or completed)
  useEffect(() => {
    if (!paymentData || (bookingData?.needs_account_setup && !accountSetupComplete)) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleGoToDashboard();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentData, bookingData, accountSetupComplete]);

  const handleCopyPaymentId = () => {
    if (paymentData?.razorpay_payment_id) {
      navigator.clipboard.writeText(paymentData.razorpay_payment_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToDashboard = () => {
    const dashboardPath = user?.userType === 'admin' 
      ? '/admin' 
      : `/${user?.userType || 'user'}/dashboard`;
    navigate(dashboardPath, { replace: true });
  };

  const handleAccountSetupSuccess = () => {
    setAccountSetupComplete(true);
    // Redirect to client dashboard after account setup
    navigate('/user/dashboard', { replace: true });
  };

  if (!paymentData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary">
        <div className="text-center">
          <p className="text-gray-600 dark:text-dark-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  const currencySymbol = paymentData.currency === 'INR' ? '₹' : 
                         paymentData.currency === 'USD' ? '$' : 
                         paymentData.currency === 'EUR' ? '€' : 
                         paymentData.currency || '₹';

  // Determine username: email > whatsapp_number > contact
  const username = bookingData?.user?.email || bookingData?.user?.whatsapp_number || bookingData?.user?.contact || '';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-primary px-4 py-8">
      <div className="max-w-md w-full bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl p-8 text-center">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-green-100 dark:bg-green-900 rounded-full animate-ping opacity-75"></div>
            <CheckCircle className="h-20 w-20 text-green-500 dark:text-green-400 relative z-10" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
          Your payment has been processed successfully.
        </p>

        {/* Payment Details Card */}
        <div className="bg-gray-50 dark:bg-dark-bg-primary rounded-lg p-6 mb-6 text-left">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
            Payment Details
          </h2>
          
          <div className="space-y-3">
            {/* Amount */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Amount Paid:</span>
              <span className="text-lg font-bold text-gray-900 dark:text-dark-text-primary">
                {currencySymbol}{parseFloat(paymentData.amount).toFixed(2)}
              </span>
            </div>

            {/* Payment Status */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Status:</span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300 rounded-full text-sm font-medium capitalize">
                {paymentData.status}
              </span>
            </div>

            {/* Razorpay Payment ID */}
            <div className="pt-3 border-t border-gray-200 dark:border-dark-border">
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <span className="text-sm text-gray-600 dark:text-dark-text-secondary block mb-1">
                    Razorpay Payment ID:
                  </span>
                  <code className="text-sm font-mono text-gray-900 dark:text-dark-text-primary break-all">
                    {paymentData.razorpay_payment_id || 'N/A'}
                  </code>
                </div>
                {paymentData.razorpay_payment_id && (
                  <button
                    onClick={handleCopyPaymentId}
                    className="flex-shrink-0 p-2 text-gray-600 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-dark-bg-tertiary rounded-md transition-colors"
                    title="Copy Payment ID"
                  >
                    {copied ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Copy className="h-5 w-5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleGoToDashboard}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          Go to Dashboard
          <ArrowRight className="h-5 w-5" />
        </button>

        {/* Auto-redirect notice */}
        {!bookingData?.needs_account_setup && (
          <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mt-4">
            Redirecting to dashboard in {countdown} seconds...
          </p>
        )}
      </div>

      {/* Account Setup Modal - Show on top if needed */}
      {bookingData?.needs_account_setup && !accountSetupComplete && bookingData?.setup_token && (
        <AccountSetupModal
          setupToken={bookingData.setup_token}
          userId={bookingData.user_id}
          username={username}
          onSuccess={handleAccountSetupSuccess}
        />
      )}
    </div>
  );
};

export default PaymentSuccess;
