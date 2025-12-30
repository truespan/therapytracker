import React, { useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import InactivityLogout from './components/InactivityLogout';
import Navbar from './components/layout/Navbar';
import AdminLayout from './components/layout/AdminLayout';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TherapistSignup from './pages/TherapistSignup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import GoogleCalendarCallback from './pages/GoogleCalendarCallback';
import UserDashboardPage from './pages/UserDashboardPage';
import PartnerDashboardPage from './pages/PartnerDashboardPage';
import OrganizationDashboardPage from './pages/OrganizationDashboardPage';
import AdminDashboard from './components/dashboard/AdminDashboard';
import ReportTemplatesTab from './components/admin/ReportTemplatesTab';
import SubscriptionPlansTab from './components/admin/SubscriptionPlansTab';
import CreatePlansTab from './components/admin/CreatePlansTab';
import PayoutsTab from './components/admin/PayoutsTab';
import BankAccountDetailsTab from './components/admin/BankAccountDetailsTab';
import EarningsUtilityTab from './components/admin/EarningsUtilityTab';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ChatWidget from './components/support/ChatWidget';

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

  // Memoize redirect path to prevent re-render loops
  // Use a stable key based on user ID and type to prevent unnecessary recalculations
  const userKey = user ? `${user.id}-${user.userType}` : null;
  const redirectPath = useMemo(() => {
    if (!user) return '/';
    if (user.userType === 'admin') return '/admin';
    return `/${user.userType}/dashboard`;
  }, [userKey]); // Only depend on userKey (id + type), not the entire user object

  return (
    <>
      <InactivityLogout />
      <ChatWidget />
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <Home />} />
      <Route path="/login" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <Signup />} />
      <Route path="/therapist-signup/:token" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <TherapistSignup />} />
      <Route path="/forgot-password" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <ResetPassword />} />
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
                <Route path="report-templates" element={<ReportTemplatesTab />} />
                <Route path="subscription-plans" element={<SubscriptionPlansTab />} />
                <Route path="create-plans" element={<CreatePlansTab />} />
                <Route path="bank-accounts" element={<BankAccountDetailsTab />} />
                <Route path="payouts" element={<PayoutsTab />} />
                <Route path="earnings-utility" element={<EarningsUtilityTab />} />
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
          <div className="min-h-screen bg-hudson-500 dark:bg-dark-bg-primary">
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
    </>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <ThemeProvider>
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

