import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, LayoutDashboard, FileText, CreditCard } from 'lucide-react';

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/report-templates', label: 'Reports Template', icon: FileText },
    { path: '/admin/subscription-plans', label: 'Subscription Plans', icon: CreditCard },
  ];

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-hudson-500">
      {/* Header */}
      <nav className="bg-gradient-to-r from-primary-600 to-primary-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/admin" className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center p-1.5 shadow-md">
                  <img
                    src="/TheraPTrackLogoBgRemoved.png"
                    alt="TheraP Track Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <span className="text-xl font-bold text-white">Admin Panel</span>
                  <p className="text-xs text-primary-100">TheraP Track</p>
                </div>
              </Link>
            </div>

            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-white">
                  <User className="h-5 w-5" />
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-primary-100">(Admin)</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-white text-primary-700 hover:bg-primary-50 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors font-medium"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="bg-porcelain-500 rounded-lg shadow-sm mb-6">
          <div className="border-b border-porcelain-300 -mx-4 px-4 sm:mx-0 sm:px-0">
            <nav className="flex -mb-px space-x-6 overflow-x-auto scrollbar-thin scroll-smooth pb-px">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex flex-col lg:flex-row items-center gap-1 lg:gap-2 flex-shrink-0 transition-colors
                      ${
                        active
                          ? 'border-primary-600 text-primary-700'
                          : 'border-transparent text-umbra-500 hover:text-umbra-700'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs lg:text-sm">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default AdminLayout;

