import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Loader, CreditCard } from 'lucide-react';
import { bankAccountAPI } from '../../services/api';

const BankAccountForm = ({ userType, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bankData, setBankData] = useState({
    bank_account_holder_name: '',
    bank_account_number: '',
    bank_ifsc_code: '',
    bank_name: ''
  });
  const [bankAccountInfo, setBankAccountInfo] = useState(null);

  useEffect(() => {
    loadBankAccount();
  }, []);

  const loadBankAccount = async () => {
    try {
      setLoading(true);
      setError('');
      const response = userType === 'partner' 
        ? await bankAccountAPI.getPartner()
        : await bankAccountAPI.getOrganization();
      
      if (response.data.success) {
        setBankAccountInfo(response.data.data);
        // Pre-fill form if account exists (but we can't show full account number)
        if (response.data.data.bank_account_holder_name) {
          setBankData({
            bank_account_holder_name: response.data.data.bank_account_holder_name || '',
            bank_account_number: '', // Don't pre-fill for security
            bank_ifsc_code: response.data.data.bank_ifsc_code || '',
            bank_name: response.data.data.bank_name || ''
          });
        }
      }
    } catch (err) {
      console.error('Failed to load bank account:', err);
      setError(err.response?.data?.error || 'Failed to load bank account details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBankData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const validateIFSC = (ifsc) => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  };

  const validateAccountNumber = (accountNumber) => {
    const accountRegex = /^\d{9,18}$/;
    return accountRegex.test(accountNumber);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    // Validation
    if (!bankData.bank_account_holder_name.trim()) {
      setError('Account holder name is required');
      setSaving(false);
      return;
    }

    if (!bankData.bank_account_number.trim()) {
      setError('Account number is required');
      setSaving(false);
      return;
    }

    if (!validateAccountNumber(bankData.bank_account_number)) {
      setError('Account number must be 9-18 digits only');
      setSaving(false);
      return;
    }

    if (!bankData.bank_ifsc_code.trim()) {
      setError('IFSC code is required');
      setSaving(false);
      return;
    }

    if (!validateIFSC(bankData.bank_ifsc_code)) {
      setError('Invalid IFSC code format. Must be 11 characters (e.g., HDFC0001234)');
      setSaving(false);
      return;
    }

    try {
      const response = userType === 'partner'
        ? await bankAccountAPI.updatePartner(bankData)
        : await bankAccountAPI.updateOrganization(bankData);

      if (response.data.success) {
        setSuccess(response.data.message || 'Bank account details updated successfully');
        setBankAccountInfo(response.data.data);
        // Clear account number from form for security
        setBankData(prev => ({ ...prev, bank_account_number: '' }));
        if (onUpdate) {
          onUpdate();
        }
        // Reload after a short delay
        setTimeout(() => {
          loadBankAccount();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to update bank account:', err);
      setError(err.response?.data?.error || 'Failed to update bank account details');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Verification Status */}
      {bankAccountInfo && (
        <div className={`p-4 rounded-lg border ${
          bankAccountInfo.bank_account_verified
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center space-x-2">
            {bankAccountInfo.bank_account_verified ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Bank account verified
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Bank account pending verification
                </span>
              </>
            )}
          </div>
          {bankAccountInfo.bank_account_verified_at && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Verified on {new Date(bankAccountInfo.bank_account_verified_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <XCircle className="h-5 w-5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm">{success}</span>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Account Holder Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bank_account_holder_name"
            value={bankData.bank_account_holder_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
            placeholder="Enter account holder name"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Account Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bank_account_number"
            value={bankData.bank_account_number}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary font-mono"
            placeholder={bankAccountInfo?.bank_account_number ? "Enter new account number" : "Enter account number"}
            required
            maxLength={18}
            pattern="[0-9]{9,18}"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            9-18 digits only. {bankAccountInfo?.bank_account_number && "Leave blank to keep existing."}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            IFSC Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="bank_ifsc_code"
            value={bankData.bank_ifsc_code}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary uppercase"
            placeholder="HDFC0001234"
            required
            maxLength={11}
            style={{ textTransform: 'uppercase' }}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            11 characters: 4 letters + 0 + 6 alphanumeric (e.g., HDFC0001234)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Bank Name
          </label>
          <input
            type="text"
            name="bank_name"
            value={bankData.bank_name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
            placeholder="Enter bank name (optional)"
          />
        </div>

        {/* Display masked account number if exists */}
        {bankAccountInfo?.bank_account_number && (
          <div className="p-3 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Account Number:</p>
            <p className="text-sm font-mono text-gray-900 dark:text-dark-text-primary">
              {bankAccountInfo.bank_account_number}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {saving ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <CreditCard className="h-4 w-4" />
                <span>Save Bank Account Details</span>
              </>
            )}
          </button>
        </div>
      </form>

      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Your bank account details will be verified by an administrator before you can receive payouts. 
          You will be notified once verification is complete.
        </p>
      </div>
    </div>
  );
};

export default BankAccountForm;

