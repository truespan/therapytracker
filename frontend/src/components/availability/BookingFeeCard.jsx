import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Edit } from 'lucide-react';
import { partnerAPI } from '../../services/api';
import { CurrencyIcon } from '../../utils/currencyIcon';

const BookingFeeCard = ({ partnerId }) => {
  const [feeData, setFeeData] = useState({
    session_fee: '',
    booking_fee: '',
    fee_currency: 'INR'
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasSubmittedFees, setHasSubmittedFees] = useState(false);

  // Currency options
  const currencies = [
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  ];

  useEffect(() => {
    loadFeeSettings();
  }, [partnerId]);

  /**
   * Load existing fee settings
   */
  const loadFeeSettings = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await partnerAPI.getFeeSettings(partnerId);
      
      const sessionFee = response.data.feeSettings.session_fee;
      const bookingFee = response.data.feeSettings.booking_fee;
      const hasFees = (sessionFee !== null && sessionFee !== '') || (bookingFee !== null && bookingFee !== '');
      
      setFeeData({
        session_fee: sessionFee || '',
        booking_fee: bookingFee || '',
        fee_currency: response.data.feeSettings.fee_currency || 'INR'
      });
      
      // If fees have been submitted, set view mode (read-only)
      setHasSubmittedFees(hasFees);
      setIsEditMode(!hasFees); // If no fees exist, start in edit mode
    } catch (error) {
      console.error('Failed to load fee settings:', error);
      setError('Failed to load fee settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle input changes
   */
  const handleChange = (field, value) => {
    setFeeData(prev => ({
      ...prev,
      [field]: value
    }));
    setError('');
    setSuccessMessage('');
  };

  /**
   * Validate and submit fee settings
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    // Validation
    const sessionFee = parseFloat(feeData.session_fee);
    const bookingFee = parseFloat(feeData.booking_fee);

    if (feeData.session_fee && (isNaN(sessionFee) || sessionFee < 0)) {
      setError('Session fee must be a valid non-negative number');
      return;
    }

    if (feeData.booking_fee && (isNaN(bookingFee) || bookingFee < 0)) {
      setError('Booking fee must be a valid non-negative number');
      return;
    }

    if (!feeData.session_fee && !feeData.booking_fee) {
      setError('Please enter at least one fee amount');
      return;
    }

    try {
      setSaving(true);

      const payload = {
        session_fee: feeData.session_fee ? parseFloat(feeData.session_fee) : null,
        booking_fee: feeData.booking_fee ? parseFloat(feeData.booking_fee) : null,
        fee_currency: feeData.fee_currency
      };

      await partnerAPI.updateFeeSettings(partnerId, payload);
      
      setSuccessMessage('Fee settings saved successfully!');
      setHasSubmittedFees(true);
      setIsEditMode(false); // Switch back to view mode after successful submission
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (error) {
      console.error('Failed to save fee settings:', error);
      const errorMessage = error.response?.data?.error || 'Failed to save fee settings. Please try again.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle edit button click
   */
  const handleEditClick = () => {
    setIsEditMode(true);
    setError('');
    setSuccessMessage('');
  };

  const selectedCurrency = currencies.find(c => c.code === feeData.fee_currency);

  return (
    <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center text-gray-900 dark:text-dark-text-primary">
        <CurrencyIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-dark-primary-500" />
        Set Booking Fee
      </h3>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 text-gray-400 dark:text-dark-text-tertiary animate-spin" />
          <span className="ml-2 text-gray-600 dark:text-dark-text-secondary">Loading fee settings...</span>
        </div>
      ) : (
        <>
          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-md">
              <p className="text-sm text-error-700 dark:text-error-400">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 rounded-md">
              <p className="text-sm text-success-700 dark:text-success-400">{successMessage}</p>
            </div>
          )}

          {!isEditMode && hasSubmittedFees ? (
            /* View Mode - Read-only display */
            <div>
              <div className="space-y-4">
                {/* Currency Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Currency
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-gray-50 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary">
                    {selectedCurrency?.symbol} - {selectedCurrency?.name} ({selectedCurrency?.code})
                  </div>
                </div>

                {/* Session Fee Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Fee per session
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-gray-50 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary">
                    {selectedCurrency?.symbol}{feeData.session_fee !== '' && feeData.session_fee !== null ? parseFloat(feeData.session_fee).toFixed(2) : '0.00'}
                  </div>
                </div>

                {/* Booking Fee Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Booking Fee
                  </label>
                  <div className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md bg-gray-50 dark:bg-dark-bg-tertiary text-gray-700 dark:text-dark-text-primary">
                    {selectedCurrency?.symbol}{feeData.booking_fee !== '' && feeData.booking_fee !== null ? parseFloat(feeData.booking_fee).toFixed(2) : '0.00'}
                  </div>
                </div>
              </div>

              {/* Edit Button */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleEditClick}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
              </div>
            </div>
          ) : (
            /* Edit Mode - Editable form */
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Currency Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Currency
                  </label>
                  <select
                    value={feeData.fee_currency}
                    onChange={(e) => handleChange('fee_currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} - {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Fee per session
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary">
                      {selectedCurrency?.symbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeData.session_fee}
                      onChange={(e) => handleChange('session_fee', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                    />
                  </div>
                </div>

                {/* Booking Fee */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                    Booking Fee
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary">
                      {selectedCurrency?.symbol}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={feeData.booking_fee}
                      onChange={(e) => handleChange('booking_fee', e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-dark-text-tertiary">
                    Booking fee can be a percentage of the total session fee
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className={`w-full flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
                    saving ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Submit'}
                </button>
              </div>

              {/* Info Note */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-dark-bg-tertiary border border-blue-200 dark:border-blue-800 rounded-md">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Note:</strong> Booking fee can be a percentage of the total session fee
                </p>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
};

export default BookingFeeCard;

