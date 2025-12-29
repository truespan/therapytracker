import React, { useState, useEffect } from 'react';
import { bankAccountAPI } from '../../services/api';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  Building2,
  User,
  Loader,
  CreditCard,
  Shield
} from 'lucide-react';

const BankAccountDetailsTab = () => {
  const [accounts, setAccounts] = useState([]);
  const [filteredAccounts, setFilteredAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, partner, organization
  const [filterVerification, setFilterVerification] = useState('all'); // all, verified, unverified
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  useEffect(() => {
    filterAccounts();
  }, [accounts, searchTerm, filterType, filterVerification]);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await bankAccountAPI.getAllBankAccounts();
      setAccounts(response.data.data || []);
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
      setError(err.response?.data?.error || 'Failed to load bank accounts');
    } finally {
      setLoading(false);
    }
  };

  const filterAccounts = () => {
    let filtered = accounts;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(a => a.type === filterType);
    }

    // Filter by verification status
    if (filterVerification !== 'all') {
      if (filterVerification === 'verified') {
        filtered = filtered.filter(a => a.bank_account_verified === true);
      } else if (filterVerification === 'unverified') {
        filtered = filtered.filter(a => a.bank_account_verified === false);
      }
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        a.contact?.includes(term) ||
        a.bank_account_holder_name?.toLowerCase().includes(term) ||
        a.bank_ifsc_code?.toLowerCase().includes(term)
      );
    }

    setFilteredAccounts(filtered);
  };

  const handleOpenVerificationModal = (account) => {
    setSelectedAccount(account);
    setShowVerificationModal(true);
    setError('');
  };

  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    setSelectedAccount(null);
    setError('');
  };

  const handleVerifyBankAccount = async () => {
    if (!selectedAccount) return;

    try {
      setVerifying(true);
      setError('');
      
      const response = await bankAccountAPI.verifyBankAccount(
        selectedAccount.type,
        selectedAccount.id
      );

      if (response.data.success) {
        setSuccess(`Bank account verified successfully for ${selectedAccount.name}`);
        handleCloseVerificationModal();
        // Reload accounts to update verification status
        await loadBankAccounts();
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err) {
      console.error('Failed to verify bank account:', err);
      setError(err.response?.data?.error || 'Failed to verify bank account');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading bank account details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Bank Account Details</h1>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="card p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="card p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span>{success}</span>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, contact, account holder, or IFSC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
          >
            <option value="all">All Types</option>
            <option value="partner">Partners</option>
            <option value="organization">Organizations</option>
          </select>

          {/* Verification Status Filter */}
          <select
            value={filterVerification}
            onChange={(e) => setFilterVerification(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
          >
            <option value="all">All Status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
            <thead className="bg-gray-50 dark:bg-dark-bg-secondary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Account Holder
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Account Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  IFSC Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bank Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Verification Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-dark-bg-primary divide-y divide-gray-200 dark:divide-dark-border">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No bank accounts found
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account) => (
                  <tr key={`${account.type}_${account.id}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                        {account.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {account.type === 'partner' ? (
                          <User className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Building2 className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="text-sm text-gray-900 dark:text-dark-text-primary capitalize">
                          {account.type}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                        {account.organization_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                        {account.bank_account_holder_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-dark-text-primary">
                        {account.bank_account_number || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono text-gray-900 dark:text-dark-text-primary">
                        {account.bank_ifsc_code || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                        {account.bank_name || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account.bank_account_verified ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Not Verified
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <div>{account.email || '-'}</div>
                        <div className="text-xs">{account.contact || '-'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {!account.bank_account_verified && (
                        <button
                          onClick={() => handleOpenVerificationModal(account)}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                          title="View and verify bank account details"
                        >
                          <Shield className="h-3 w-3 mr-1" />
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bank Account Verification Modal */}
      {showVerificationModal && selectedAccount && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary flex items-center">
                  <Shield className="h-5 w-5 mr-2 text-primary-600" />
                  Verify Bank Account
                </h3>
                <button
                  onClick={handleCloseVerificationModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">{success}</span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-dark-bg-primary p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Recipient Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Name:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-dark-text-primary">
                        {selectedAccount.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-dark-text-primary capitalize">
                        {selectedAccount.type}
                      </span>
                    </div>
                    {selectedAccount.organization_name && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Organization:</span>
                        <span className="ml-2 text-gray-900 dark:text-dark-text-primary">
                          {selectedAccount.organization_name}
                        </span>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Email:</span>
                      <span className="ml-2 text-gray-900 dark:text-dark-text-primary">
                        {selectedAccount.email || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Contact:</span>
                      <span className="ml-2 text-gray-900 dark:text-dark-text-primary">
                        {selectedAccount.contact || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Bank Account Details
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Account Holder Name:</span>
                      <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary mt-1">
                        {selectedAccount.bank_account_holder_name || '-'}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Account Number:</span>
                      <div className="text-sm font-mono text-gray-900 dark:text-dark-text-primary mt-1">
                        {selectedAccount.bank_account_number || '-'}
                      </div>
                      {selectedAccount.bank_account_number && selectedAccount.bank_account_number.includes('*') && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Note: Account number is masked for security. Full details are stored securely.
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">IFSC Code:</span>
                      <div className="text-sm font-mono text-gray-900 dark:text-dark-text-primary mt-1">
                        {selectedAccount.bank_ifsc_code || '-'}
                      </div>
                    </div>
                    {selectedAccount.bank_name && (
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Bank Name:</span>
                        <div className="text-sm text-gray-900 dark:text-dark-text-primary mt-1">
                          {selectedAccount.bank_name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-medium mb-1">Verification Guidelines:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Verify that the account holder name matches the recipient name</li>
                        <li>Confirm the IFSC code is valid and matches the bank name</li>
                        <li>Ensure all required fields are present</li>
                        <li>Once verified, the recipient will be eligible for payouts</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-dark-border">
                  <button
                    onClick={handleCloseVerificationModal}
                    disabled={verifying}
                    className="px-4 py-2 bg-gray-200 dark:bg-dark-bg-primary text-gray-700 dark:text-dark-text-primary rounded-lg hover:bg-gray-300 dark:hover:bg-dark-bg-secondary transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleVerifyBankAccount}
                    disabled={verifying}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    {verifying ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Verify Bank Account</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountDetailsTab;

