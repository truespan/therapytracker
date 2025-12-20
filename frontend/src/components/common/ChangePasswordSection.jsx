import React, { useState } from 'react';
import { authAPI } from '../../services/api';
import { Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const ChangePasswordSection = ({
  title = 'Change Password',
  description = 'Update your password to keep your account secure.'
}) => {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (status.message) {
      setStatus({ type: '', message: '' });
    }
  };

  const handleChangePassword = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setStatus({ type: 'error', message: 'All password fields are required.' });
      return;
    }

    if (form.newPassword.length < 8) {
      setStatus({ type: 'error', message: 'New password must be at least 8 characters long.' });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setStatus({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    if (form.newPassword === form.currentPassword) {
      setStatus({ type: 'error', message: 'New password must be different from the current password.' });
      return;
    }

    try {
      setLoading(true);
      await authAPI.changePassword(form.currentPassword, form.newPassword);
      setStatus({ type: 'success', message: 'Password updated successfully.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setStatus({ type: '', message: '' }), 5000);
    } catch (error) {
      setStatus({
        type: 'error',
        message: error.response?.data?.error || 'Failed to update password. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-dark-border pt-6">
      <div className="flex items-center mb-2">
        <Lock className="h-5 w-5 text-primary-600 dark:text-dark-primary-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">{title}</h3>
      </div>
      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">{description}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Current Password</label>
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg-secondary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Enter current password"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">New Password</label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg-secondary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="At least 8 characters"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">Confirm New Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border dark:bg-dark-bg-secondary dark:text-dark-text-primary rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="Re-enter new password"
          />
        </div>
      </div>

      {status.message && (
        <div
          className={`mt-4 flex items-center space-x-2 p-3 rounded-lg ${
            status.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {status.type === 'success' ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm">{status.message}</span>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button
          type="button"
          onClick={handleChangePassword}
          disabled={loading}
          className="btn btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Updating...</span>
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <span>Update Password</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChangePasswordSection;


