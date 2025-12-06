import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/layout/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import GoogleCalendarCallback from './pages/GoogleCalendarCallback';
import UserDashboardPage from './pages/UserDashboardPage';
import PartnerDashboardPage from './pages/PartnerDashboardPage';
import OrganizationDashboardPage from './pages/OrganizationDashboardPage';
import AdminDashboard from './components/dashboard/AdminDashboard';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    return <Navigate to="/" />;
  }

  return children;
};

function AppRoutes() {
  const { user } = useAuth();

  // Helper to get redirect path based on user type
  const getRedirectPath = () => {
    if (!user) return '/';
    if (user.userType === 'admin') return '/admin';
    return `/${user.userType}/dashboard`;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to={getRedirectPath()} /> : <Home />} />
      <Route path="/login" element={user ? <Navigate to={getRedirectPath()} /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={getRedirectPath()} /> : <Signup />} />
      <Route path="/forgot-password" element={user ? <Navigate to={getRedirectPath()} /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to={getRedirectPath()} /> : <ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      
      {/* Admin Routes - Use AdminLayout instead of Navbar */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout>
              <Routes>
                <Route index element={<AdminDashboard />} />
                <Route path="organizations" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/admin" />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      
      {/* User/Partner/Organization Routes - Use Navbar */}
      <Route
        path="/*"
        element={
          <div className="min-h-screen bg-gray-50">
            <Navbar />
            <Routes>
              <Route
                path="/user/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['user']}>
                    <UserDashboardPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/partner/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['partner']}>
                    <PartnerDashboardPage />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/organization/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['organization']}>
                    <OrganizationDashboardPage />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}

export default App;

