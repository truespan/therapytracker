import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Activity, Menu, X, Copy, Check } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
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

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo - Responsive */}
          <Link to={getDashboardLink()} className="flex items-center space-x-2">
            <Activity className="h-8 w-8 text-primary-600" />
            <span className="text-lg sm:text-xl font-bold text-gray-900">
              <span className="hidden sm:inline">Therapy Tracker</span>
              <span className="sm:hidden">TT</span>
            </span>
          </Link>

          {user && (
            <>
              {/* Desktop Menu - Hidden on mobile */}
              <div className="hidden md:flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-gray-700">
                  <User className="h-5 w-5" />
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-gray-500">({user.userType})</span>
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
                  <p className="font-medium">{user.name}</p>
                  <p className="text-sm text-gray-500">{user.userType}</p>
                </div>
              </div>
            </div>

            {/* Partner ID Section - Only for partners */}
            {user.userType === 'partner' && user.partner_id && (
              <div className="px-4 py-3 bg-primary-50 border-2 border-primary-200 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Your Partner ID</p>
                <div className="flex items-center justify-between">
                  <p className="text-lg font-bold text-primary-700 tracking-wider">
                    {user.partner_id}
                  </p>
                  <button
                    onClick={handleCopyPartnerId}
                    className="p-2 hover:bg-primary-100 rounded transition-colors"
                    title="Copy Partner ID"
                  >
                    {copied ? (
                      <Check className="h-5 w-5 text-green-600" />
                    ) : (
                      <Copy className="h-5 w-5 text-primary-600" />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="text-xs text-green-600 mt-1">Copied to clipboard!</p>
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

