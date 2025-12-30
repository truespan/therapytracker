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
  const [partnerIdOverride, setPartnerIdOverride] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  const handleCheck = async () => {
    if (!paymentId.trim()) {
      setError('Please enter a payment ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setResult(null);

      const requestData = {
        razorpay_payment_id: paymentId.trim()
      };
      if (partnerIdOverride.trim()) {
        requestData.partner_id_override = partnerIdOverride.trim();
      }
      const response = await adminAPI.checkAndCreateEarnings(requestData);

      setResult(response.data);
    } catch (err) {
      console.error('Error checking earnings:', err);
      setError(err.response?.data?.error || 'Failed to check/create earnings');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const handleBackfill = async () => {
    if (!window.confirm('This will fetch missing order notes from Razorpay for all orders that have empty notes in the database. This may take a few minutes. Continue?')) {
      return;
    }

    try {
      setBackfilling(true);
      setBackfillResult(null);
      setError('');

      const response = await adminAPI.backfillOrderNotes();
      setBackfillResult(response.data);
    } catch (err) {
      console.error('Error backfilling order notes:', err);
      setError(err.response?.data?.error || 'Failed to backfill order notes');
      setBackfillResult(null);
    } finally {
      setBackfilling(false);
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
            Earnings Utility
          </h1>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            Check and create missing earnings records for payments
          </p>
        </div>
        <button
          onClick={handleBackfill}
          disabled={backfilling}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {backfilling ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              <span>Backfilling...</span>
            </>
          ) : (
            <>
              <Search className="h-4 w-4" />
              <span>Backfill Missing Notes</span>
            </>
          )}
        </button>
      </div>

      {/* Search Form */}
      <div className="card p-6">
        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Razorpay Payment ID <span className="text-red-500">*</span>
              </label>
              <div className="relative">
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Partner ID Override (Optional)
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                  Use if partner_id is missing from order notes (e.g., TH78079)
                </span>
              </label>
              <input
                type="text"
                placeholder="Enter partner ID if missing from order (e.g., TH78079)"
                value={partnerIdOverride}
                onChange={(e) => setPartnerIdOverride(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCheck()}
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
              />
            </div>
            <div>
              <button
                onClick={handleCheck}
                disabled={loading || !paymentId.trim()}
                className="w-full px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">{error}</span>
            </div>
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

      {/* Backfill Result */}
      {backfillResult && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
            Backfill Results
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-dark-bg-primary p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Processed</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                  {backfillResult.processed || 0}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Successfully Updated</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {backfillResult.updated || 0}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Failed</div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {backfillResult.failed || 0}
                </div>
              </div>
            </div>

            {backfillResult.message && (
              <div className={`p-4 rounded-lg ${
                backfillResult.failed === 0
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                  : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
              }`}>
                <p className={backfillResult.failed === 0 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
                  {backfillResult.message}
                </p>
              </div>
            )}

            {backfillResult.errors && backfillResult.errors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
                <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">Errors (showing first 10):</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-red-700 dark:text-red-300">
                  {backfillResult.errors.map((err, idx) => (
                    <li key={idx}>
                      Order {err.order_id}: {err.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EarningsUtilityTab;

