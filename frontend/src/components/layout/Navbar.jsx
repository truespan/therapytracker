import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Menu, X, Copy, Check } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleCopyPartnerId = () => {
    if (user?.partner_id) {
      navigator.clipboard.writeText(user.partner_id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    switch (user.userType) {
      case 'user':
        return '/user/dashboard';
      case 'partner':
        return '/partner/dashboard';
      case 'organization':
        return '/organization/dashboard';
      default:
        return '/';
    }
  };

  // Get username (email or mobile) used for authentication
  const getUsername = () => {
    if (!user) return '';
    // user.email is the email or phone used as username (from auth_credentials)
    return user.email || '';
  };

  // Get role display text based on user type
  const getRoleText = () => {
    if (!user) return '';
    if (user.userType === 'partner') {
      return 'Therapist';
    }
    return null; // No role for user, organization
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Responsive */}
          <Link to={getDashboardLink()} className="flex items-center space-x-2">
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center p-1.5 shadow-md">
              <img
                src="/TheraPTrackLogoBgRemoved.png"
                alt="TheraP Track Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">
              TheraP Track
            </span>
          </Link>

          {user && (
            <>
              {/* Desktop Menu - Hidden on mobile */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="h-5 w-5" />
                  <span className="font-medium">{getUsername()}</span>
                  {getRoleText() && (
                    <span className="text-sm text-gray-500">({getRoleText()})</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="btn btn-secondary flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Dropdown */}
        {user && mobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-3">
            <div className="px-4 py-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-2 text-gray-700">
                <User className="h-5 w-5" />
                <div>
                  <p className="font-medium">{getUsername()}</p>
                  {getRoleText() && (
                    <p className="text-sm text-gray-500">{getRoleText()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Partner ID Section - Only for partners */}
            {user.userType === 'partner' && user.partner_id && (
              <div className="px-4 py-3 bg-primary-50 border-2 border-primary-500 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-umbra-900 mb-0.5">Therapist ID: <span className="text-base font-bold text-primary-500">{user.partner_id}</span></p>
                  </div>
                  <button
                    onClick={handleCopyPartnerId}
                    className="p-2 hover:bg-primary-100 rounded transition-colors"
                    title="Copy Partner ID"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-success-500" />
                    ) : (
                      <Copy className="h-5 w-5 text-primary-500" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-success-500 mt-1">Copied to clipboard!</p>
                )}
              </div>
            )}

            <button
              onClick={() => {
                handleLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full btn btn-secondary flex items-center justify-center space-x-2"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

