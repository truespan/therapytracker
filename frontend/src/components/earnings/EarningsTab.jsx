import React, { useState, useEffect } from 'react';
import { earningsAPI } from '../../services/api';
import { Activity, TrendingUp, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CurrencyIcon } from '../../utils/currencyIcon';

const EarningsTab = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [earningsData, setEarningsData] = useState(null);

  useEffect(() => {
    loadEarningsData();
    // Debug: Log timezone detection
    console.log('EarningsTab - Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log('EarningsTab - Is Kolkata:', Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Kolkata');
  }, []);

  const loadEarningsData = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await earningsAPI.getSummary();
      setEarningsData(response.data.data);
    } catch (err) {
      console.error('Failed to load earnings data:', err);
      setError(err.response?.data?.error || 'Failed to load earnings data');
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

  const formatMonth = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading earnings data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-6">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!earningsData) {
    return (
      <div className="card p-6 text-center text-gray-500">
        <p>No earnings data available</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = earningsData.revenue_by_month
    .slice()
    .reverse()
    .map(item => ({
      month: formatMonth(item.month),
      revenue: parseFloat(item.revenue)
    }));

  return (
    <div className="space-y-6">
      {/* Payment Information Notice */}
      <div className="card bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
              Payments received via TheraPTrack's integrated payment gateways will be processed as follows:
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200 mb-1">
              <strong>Saturday:</strong> All payments received after last Saturday's payout.
            </p>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              You can read about payment gateway charges{' '}
              <a href="#" className="underline hover:text-blue-600 dark:hover:text-blue-300" target="_blank" rel="noopener noreferrer">
                here
              </a>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Earnings */}
        <div className="card p-6 bg-orange-50 dark:bg-orange-900/20 aspect-square">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex-shrink-0">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary truncate">Pending Earnings</p>
          </div>
          <div className="mb-3">
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              {formatCurrency(earningsData.pending_earnings || 0)}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Payment captured, waiting for Razorpay settlement (T+2/T+3 days)
          </p>
        </div>

        {/* Available Balance */}
        <div className="card p-6 bg-green-50 dark:bg-green-900/20 aspect-square">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex-shrink-0">
              <CurrencyIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary truncate">Available Balance</p>
          </div>
          <div className="mb-3">
            <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              {formatCurrency(earningsData.available_balance)}
            </p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Payment settled, ready for withdrawal (money in merchant account)
          </p>
        </div>

        {/* Total Earnings - Full width on mobile */}
        <div className="card p-6 col-span-2 md:col-span-1 lg:col-span-1 bg-purple-50 dark:bg-purple-900/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                {formatCurrency(earningsData.total_earnings)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CurrencyIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        {/* Withdrawn Amount - Full width on mobile */}
        <div className="card p-6 col-span-2 md:col-span-1 lg:col-span-1 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">Withdrawn Amount</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                {formatCurrency(earningsData.withdrawn_amount)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Total payment transferred to partner/organization bank account
          </p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        {/* Completed Sessions */}
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-1">Completed Sessions</p>
              <p className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                {earningsData.completed_sessions}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Revenue by Month Chart */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
            Revenue by Month
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#4f46e5" name="Revenue (INR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default EarningsTab;

