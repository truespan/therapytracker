import React, { useState, useEffect } from 'react';
import { adminAPI, bankAccountAPI } from '../../services/api';
import {
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Search,
  CheckSquare,
  Square,
  Building2,
  User,
  Loader,
  Calendar,
  CreditCard,
  Eye,
  Shield
} from 'lucide-react';

const PayoutsTab = () => {
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, partner, organization
  const [activeSection, setActiveSection] = useState('candidates'); // candidates or history
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [payoutNotes, setPayoutNotes] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [selectedCandidateForVerification, setSelectedCandidateForVerification] = useState(null);
  const [bankAccountDetails, setBankAccountDetails] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadCandidates();
    loadPayoutHistory();
  }, []);

  useEffect(() => {
    filterCandidates();
  }, [candidates, searchTerm, filterType]);

  const loadCandidates = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getPayoutCandidates();
      setCandidates(response.data.data || []);
    } catch (err) {
      console.error('Failed to load payout candidates:', err);
      setError(err.response?.data?.error || 'Failed to load payout candidates');
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await adminAPI.getPayoutHistory({ limit: 100 });
      setPayoutHistory(response.data.data || []);
    } catch (err) {
      console.error('Failed to load payout history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filterCandidates = () => {
    let filtered = candidates;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(c => c.type === filterType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.contact?.includes(term)
      );
    }

    setFilteredCandidates(filtered);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleSelectCandidate = (candidateId, candidateType) => {
    const candidate = candidates.find(c => c.id === candidateId && c.type === candidateType);
    if (!candidate || !candidate.eligible_for_payout) return;

    const key = `${candidate.type}_${candidate.id}`;
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const eligibleCandidates = filteredCandidates.filter(c => c.eligible_for_payout);
    const allSelected = eligibleCandidates.every(c => selectedCandidates.has(`${c.type}_${c.id}`));

    if (allSelected) {
      // Deselect all
      setSelectedCandidates(new Set());
    } else {
      // Select all eligible
      const newSet = new Set(selectedCandidates);
      eligibleCandidates.forEach(c => {
        newSet.add(`${c.type}_${c.id}`);
      });
      setSelectedCandidates(newSet);
    }
  };

  const getSelectedCandidatesData = () => {
    return Array.from(selectedCandidates).map(key => {
      const [type, id] = key.split('_');
      return candidates.find(c => c.id === parseInt(id) && c.type === type);
    }).filter(Boolean);
  };

  const handleInitiatePayout = () => {
    const selected = getSelectedCandidatesData();
    if (selected.length === 0) return;
    setShowConfirmModal(true);
  };

  const handleOpenVerificationModal = (candidate) => {
    setSelectedCandidateForVerification(candidate);
    setShowVerificationModal(true);
    // Use candidate data which already has bank account info
    setBankAccountDetails({
      bank_account_holder_name: candidate.bank_account_holder_name,
      bank_account_number: candidate.bank_account_number, // This is masked in the API response
      bank_ifsc_code: candidate.bank_ifsc_code,
      bank_name: candidate.bank_name,
      bank_account_verified: candidate.bank_account_verified
    });
    setError('');
  };

  const handleCloseVerificationModal = () => {
    setShowVerificationModal(false);
    setSelectedCandidateForVerification(null);
    setBankAccountDetails(null);
    setError('');
  };

  const handleVerifyBankAccount = async () => {
    if (!selectedCandidateForVerification) return;

    try {
      setVerifying(true);
      setError('');
      
      const response = await bankAccountAPI.verifyBankAccount(
        selectedCandidateForVerification.type,
        selectedCandidateForVerification.id
      );

      if (response.data.success) {
        setSuccess(`Bank account verified successfully for ${selectedCandidateForVerification.name}`);
        handleCloseVerificationModal();
        // Reload candidates to update verification status
        await loadCandidates();
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

  const confirmPayout = async () => {
    const selected = getSelectedCandidatesData();
    if (selected.length === 0) return;

    try {
      setProcessing(true);
      setError('');
      setSuccess('');

      const recipientIds = selected.map(c => c.id);
      const recipientTypes = selected.map(c => c.type);

      const response = await adminAPI.createPayout({
        recipient_ids: recipientIds,
        recipient_types: recipientTypes,
        notes: payoutNotes || undefined
      });

      if (response.data.errors && response.data.errors.length > 0) {
        setError(`${response.data.message}. Some payouts failed. Check details.`);
      } else {
        setSuccess(response.data.message || `Successfully initiated ${response.data.data.created.length} payout(s)`);
      }

      setShowConfirmModal(false);
      setSelectedCandidates(new Set());
      setPayoutNotes('');
      
      // Reload data
      await loadCandidates();
      await loadPayoutHistory();
    } catch (err) {
      console.error('Failed to create payout:', err);
      setError(err.response?.data?.error || 'Failed to initiate payout');
      setShowConfirmModal(false);
    } finally {
      setProcessing(false);
    }
  };

  const getTotalPayoutAmount = () => {
    const selected = getSelectedCandidatesData();
    return selected.reduce((sum, c) => sum + c.available_balance, 0);
  };

  const getTotalNetAmount = () => {
    const selected = getSelectedCandidatesData();
    return selected.reduce((sum, c) => sum + (c.net_amount || c.fee_breakdown?.netAmount || 0), 0);
  };

  const getTotalFees = () => {
    const selected = getSelectedCandidatesData();
    return selected.reduce((sum, c) => {
      if (c.fee_breakdown) {
        return sum + c.fee_breakdown.totalFee;
      }
      return sum;
    }, 0);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', label: 'Pending' },
      processing: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', label: 'Processing' },
      completed: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', label: 'Completed' },
      failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', label: 'Failed' },
      cancelled: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', label: 'Cancelled' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading payout candidates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">Payouts Management</h1>
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

      {/* Section Tabs */}
      <div className="border-b border-gray-200 dark:border-dark-border">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveSection('candidates')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'candidates'
                ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Payout Candidates
          </button>
          <button
            onClick={() => setActiveSection('history')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeSection === 'history'
                ? 'border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Payout History
          </button>
        </nav>
      </div>

      {/* Candidates Section */}
      {activeSection === 'candidates' && (
        <div className="space-y-4">
          {/* Filters and Actions */}
          <div className="card p-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-col sm:flex-row gap-4 flex-1">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or contact..."
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
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {getSelectedCandidatesData().length > 0 && (
                  <button
                    onClick={handleInitiatePayout}
                    disabled={processing}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <DollarSign className="h-5 w-5" />
                    <span>Initiate Payout ({getSelectedCandidatesData().length})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Selected Summary */}
            {getSelectedCandidatesData().length > 0 && (
              <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary-900 dark:text-primary-200">
                      {getSelectedCandidatesData().length} candidate(s) selected
                    </span>
                    <div className="text-right">
                      <div className="text-xs text-primary-700 dark:text-primary-300">
                        Gross Amount: {formatCurrency(getTotalPayoutAmount())}
                      </div>
                      <div className="text-xs text-primary-700 dark:text-primary-300">
                        Fees: {formatCurrency(getTotalFees())}
                      </div>
                      <div className="text-lg font-bold text-primary-900 dark:text-primary-200">
                        Net Payout: {formatCurrency(getTotalNetAmount())}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Candidates Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                <thead className="bg-gray-50 dark:bg-dark-bg-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center space-x-2"
                      >
                        {filteredCandidates.filter(c => c.eligible_for_payout).every(c =>
                          selectedCandidates.has(`${c.type}_${c.id}`)
                        ) && filteredCandidates.filter(c => c.eligible_for_payout).length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-primary-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Select
                        </span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Available Balance
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Net Amount (After Fees)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Bank Account Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Pending
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Withdrawn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Earnings
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
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="px-6 py-8 text-center text-gray-500">
                        No candidates found
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((candidate) => {
                      const key = `${candidate.type}_${candidate.id}`;
                      const isSelected = selectedCandidates.has(key);
                      const isEligible = candidate.eligible_for_payout;

                      return (
                        <tr
                          key={key}
                          className={isSelected ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                        >
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleSelectCandidate(candidate.id, candidate.type)}
                              disabled={!isEligible}
                              className={!isEligible ? 'cursor-not-allowed opacity-50' : ''}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-5 w-5 text-primary-600" />
                              ) : (
                                <Square className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                              {candidate.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {candidate.type === 'partner' ? (
                                <User className="h-4 w-4 text-gray-400" />
                              ) : (
                                <Building2 className="h-4 w-4 text-gray-400" />
                              )}
                              <span className="text-sm text-gray-900 dark:text-dark-text-primary capitalize">
                                {candidate.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-bold ${
                              candidate.available_balance > 0
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-gray-400'
                            }`}>
                              {formatCurrency(candidate.available_balance)}
                            </div>
                            {!isEligible && candidate.total_earnings > 0 && (
                              <div className="text-xs text-gray-500">Not eligible</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {candidate.fee_breakdown ? (
                              <div>
                                <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                  {formatCurrency(candidate.net_amount || candidate.fee_breakdown.netAmount)}
                                </div>
                                <div className="text-xs text-gray-500">
                                  Fee: {formatCurrency(candidate.fee_breakdown.totalFee)}
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-400">-</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {candidate.bank_account_verified ? (
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
                            <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                              {formatCurrency(candidate.pending_earnings)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-dark-text-primary">
                              {formatCurrency(candidate.withdrawn_amount)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                              {formatCurrency(candidate.total_earnings)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div>{candidate.email || '-'}</div>
                              <div className="text-xs">{candidate.contact || '-'}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {!candidate.bank_account_verified && candidate.bank_account_number && (
                              <button
                                onClick={() => handleOpenVerificationModal(candidate)}
                                className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
                                title="View and verify bank account details"
                              >
                                <Shield className="h-3 w-3 mr-1" />
                                Verify Account
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* History Section */}
      {activeSection === 'history' && (
        <div className="card overflow-hidden">
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-8 w-8 text-primary-600 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                <thead className="bg-gray-50 dark:bg-dark-bg-secondary">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Recipient
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Gross Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Net Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fees
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Transaction ID
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-dark-bg-primary divide-y divide-gray-200 dark:divide-dark-border">
                  {payoutHistory.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
                        No payout history found
                      </td>
                    </tr>
                  ) : (
                    payoutHistory.map((payout) => (
                      <tr key={payout.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900 dark:text-dark-text-primary">
                              {formatDate(payout.payout_date)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                            {payout.recipient_name || 'Unknown'}
                          </div>
                          {payout.recipient_email && (
                            <div className="text-xs text-gray-500">{payout.recipient_email}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 dark:text-dark-text-primary capitalize">
                            {payout.recipient_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                            {formatCurrency(parseFloat(payout.gross_amount || payout.amount || 0))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                            {formatCurrency(parseFloat(payout.net_amount || payout.amount || 0))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div>Fee: {formatCurrency(parseFloat(payout.transaction_fee || 0))}</div>
                            <div className="text-xs">GST: {formatCurrency(parseFloat(payout.gst_on_fee || 0))}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(payout.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                            {payout.transaction_id || '-'}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
                Confirm Payout Initiation
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    You are about to initiate payouts for {getSelectedCandidatesData().length} candidate(s):
                  </p>
                  <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-dark-border rounded p-2">
                    <ul className="space-y-1">
                      {getSelectedCandidatesData().map(candidate => (
                        <li key={`${candidate.type}_${candidate.id}`} className="text-sm text-gray-900 dark:text-dark-text-primary">
                          {candidate.name} ({candidate.type}) - {formatCurrency(candidate.available_balance)}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Gross Amount:</span>
                    <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                      {formatCurrency(getTotalPayoutAmount())}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Transaction Fees:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">
                      -{formatCurrency(getTotalFees())}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-dark-border pt-2 flex justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-dark-text-primary">
                      Net Payout Amount:
                    </span>
                    <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                      {formatCurrency(getTotalNetAmount())}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes (optional)
                  </label>
                  <textarea
                    value={payoutNotes}
                    onChange={(e) => setPayoutNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-primary dark:text-dark-text-primary"
                    placeholder="Add any notes for this payout..."
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPayoutNotes('');
                  }}
                  disabled={processing}
                  className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmPayout}
                  disabled={processing}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {processing ? (
                    <>
                      <Loader className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bank Account Verification Modal */}
      {showVerificationModal && selectedCandidateForVerification && (
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
                        {selectedCandidateForVerification.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Type:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-dark-text-primary capitalize">
                        {selectedCandidateForVerification.type}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Email:</span>
                      <span className="ml-2 text-gray-900 dark:text-dark-text-primary">
                        {selectedCandidateForVerification.email || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Contact:</span>
                      <span className="ml-2 text-gray-900 dark:text-dark-text-primary">
                        {selectedCandidateForVerification.contact || '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {bankAccountDetails && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Bank Account Details
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Account Holder Name:</span>
                        <div className="text-sm font-medium text-gray-900 dark:text-dark-text-primary mt-1">
                          {bankAccountDetails.bank_account_holder_name || '-'}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Account Number:</span>
                        <div className="text-sm font-mono text-gray-900 dark:text-dark-text-primary mt-1">
                          {bankAccountDetails.bank_account_number || '-'}
                        </div>
                        {bankAccountDetails.bank_account_number && bankAccountDetails.bank_account_number.includes('*') && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Note: Account number is masked for security. Full details are stored securely.
                          </p>
                        )}
                      </div>
                      <div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">IFSC Code:</span>
                        <div className="text-sm font-mono text-gray-900 dark:text-dark-text-primary mt-1">
                          {bankAccountDetails.bank_ifsc_code || '-'}
                        </div>
                      </div>
                      {bankAccountDetails.bank_name && (
                        <div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">Bank Name:</span>
                          <div className="text-sm text-gray-900 dark:text-dark-text-primary mt-1">
                            {bankAccountDetails.bank_name}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

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
                    disabled={verifying || !bankAccountDetails}
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

export default PayoutsTab;

