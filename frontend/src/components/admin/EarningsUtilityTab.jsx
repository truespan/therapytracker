import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import {
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  DollarSign,
  User,
  Building2
} from 'lucide-react';

const EarningsUtilityTab = () => {
  const [paymentId, setPaymentId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleCheck = async () => {
    if (!paymentId.trim()) {
      setError('Please enter a payment ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const response = await adminAPI.checkAndCreateEarnings({
        razorpay_payment_id: paymentId.trim()
      });

      setResult(response.data);
    } catch (err) {
      console.error('Error checking earnings:', err);
      setError(err.response?.data?.error || 'Failed to check/create earnings');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
          Earnings Utility
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
          Check and create missing earnings records for payments
        </p>
      </div>

      {/* Search Form */}
      <div className="card p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Razorpay Payment ID
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter Razorpay payment ID (e.g., pay_xxxxx)"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                />
              </div>
              <button
                onClick={handleCheck}
                disabled={loading || !paymentId.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Checking...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Check & Create</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card p-6">
          {result.message && (
            <div className={`mb-4 p-4 rounded-lg ${
              result.message.includes('already exists')
                ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
            }`}>
              <div className={`flex items-center space-x-2 ${
                result.message.includes('already exists')
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">{result.message}</span>
              </div>
            </div>
          )}

          {result.earnings && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                Earnings Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-dark-bg-primary p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Earnings ID</div>
                  <div className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">
                    #{result.earnings.id}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-dark-bg-primary p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount</div>
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(result.earnings.amount)} {result.earnings.currency}
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-dark-bg-primary p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Recipient</div>
                  <div className="flex items-center space-x-2">
                    {result.earnings.recipient_type === 'partner' ? (
                      <User className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Building2 className="h-4 w-4 text-gray-400" />
                    )}
                    <div>
                      <div className="text-lg font-medium text-gray-900 dark:text-dark-text-primary">
                        {result.earnings.partner_name || 'N/A'}
                      </div>
                      {result.earnings.partner_id_string && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {result.earnings.partner_id_string}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-dark-bg-primary p-4 rounded-lg">
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Status</div>
                  <div>
                    {result.earnings.status === 'pending' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </span>
                    ) : result.earnings.status === 'available' ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Available
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {result.earnings.status}
                      </span>
                    )}
                  </div>
                </div>

                {result.earnings.created_at && (
                  <div className="bg-gray-50 dark:bg-dark-bg-primary p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Created At</div>
                    <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                      {new Date(result.earnings.created_at).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EarningsUtilityTab;

