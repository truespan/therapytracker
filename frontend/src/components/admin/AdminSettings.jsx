import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings as SettingsIcon, User, Lock, Shield, Eye, EyeOff } from 'lucide-react';
import DarkModeToggle from '../common/DarkModeToggle';
import { authAPI } from '../../services/api';

const AdminSettings = () => {
  const { user } = useAuth();
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    try {
      setChangingPassword(true);
      await authAPI.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      setPasswordSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordError(error.response?.data?.error || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card dark:bg-dark-bg-tertiary">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-dark-border pb-4 mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
            <SettingsIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-dark-primary-500" />
            Admin Settings
          </h2>
          <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
            Manage your administrative account settings and preferences
          </p>
        </div>

        {/* Admin Profile Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Shield className="h-5 w-5 mr-2 text-primary-600 dark:text-dark-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Administrator Profile
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label dark:text-dark-text-primary">Admin Name</label>
              <input
                type="text"
                value={user?.name || 'Administrator'}
                disabled
                className="input bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
              />
            </div>

            <div>
              <label className="label dark:text-dark-text-primary">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="input bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
              />
            </div>

            <div>
              <label className="label dark:text-dark-text-primary">Role</label>
              <input
                type="text"
                value="System Administrator"
                disabled
                className="input bg-gray-50 dark:bg-dark-bg-primary cursor-not-allowed opacity-75"
              />
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="border-t border-gray-200 dark:border-dark-border pt-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
            Appearance
          </h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-4">
            Customize how the admin panel looks
          </p>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border">
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-dark-text-primary">
                Dark Mode
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                Toggle between light and dark themes
              </p>
            </div>
            <DarkModeToggle variant="switch" />
          </div>
        </div>

        {/* Password Change Section */}
        <div className="border-t border-gray-200 dark:border-dark-border pt-6">
          <div className="flex items-center mb-4">
            <Lock className="h-5 w-5 mr-2 text-primary-600 dark:text-dark-primary-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
              Change Password
            </h3>
          </div>

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 text-sm">
              {passwordSuccess}
            </div>
          )}

          {passwordError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
              {passwordError}
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="label dark:text-dark-text-primary">Current Password</label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className="input pr-10"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label dark:text-dark-text-primary">New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  className="input pr-10"
                  placeholder="Enter new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label dark:text-dark-text-primary">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  className="input pr-10"
                  placeholder="Confirm new password"
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                >
                  {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="btn btn-primary w-full sm:w-auto"
            >
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
