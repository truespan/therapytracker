import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { trackPageView, trackDashboardViewed } from './services/analytics';
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
import WhatsAppSettingsTab from './components/admin/WhatsAppSettingsTab';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import PublicTherapistProfile from './pages/PublicTherapistProfile';
import ChatWidget from './components/support/ChatWidget';
import TermsConditionsModal from './components/modals/TermsConditionsModal';
import SubscriptionPlanModal from './components/modals/SubscriptionPlanModal';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (allowedRoles && !allowedRoles.includes(user.userType)) {
    return <Navigate to="/" />;
  }

  // Free Plan users and ended trial users (who fall back to Free Plan) can login but will see subscription modal

  return children;
};

function AppRoutes() {
  const { user, updateUser, needsTermsAcceptance, needsSubscription, logout } = useAuth();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const location = useLocation();
  const subscriptionJustCompletedRef = useRef(false);

  // Track page views on route changes
  useEffect(() => {
    const path = location.pathname;
    const pageTitle = document.title;
    
    // Track page view with user context
    trackPageView(path, pageTitle, {
      user_type: user?.userType || 'anonymous',
    });

    // Track dashboard views specifically
    if (path.includes('/dashboard')) {
      const userType = user?.userType || 'anonymous';
      trackDashboardViewed(userType);
    }
  }, [location.pathname, user?.userType]);

  // Check if modals need to be shown
  useEffect(() => {
    // Don't auto-show subscription modal if we just completed a subscription
    if (subscriptionJustCompletedRef.current) {
      // Reset flag after a small delay to allow state to settle
      const timer = setTimeout(() => {
        subscriptionJustCompletedRef.current = false;
      }, 500);
      // Don't update modal state if subscription just completed
      if (user) {
        const needsTerms = needsTermsAcceptance(user);
        setShowTermsModal(needsTerms);
        // Explicitly keep subscription modal closed
        setShowSubscriptionModal(false);
      } else {
        setShowTermsModal(false);
        setShowSubscriptionModal(false);
      }
      return () => clearTimeout(timer);
    }
    
    if (user) {
      const needsTerms = needsTermsAcceptance(user);
      const needsSub = needsSubscription(user);
      
      setShowTermsModal(needsTerms);
      setShowSubscriptionModal(!needsTerms && needsSub);
    } else {
      setShowTermsModal(false);
      setShowSubscriptionModal(false);
    }
  }, [user, needsTermsAcceptance, needsSubscription]);

  const handleTermsAccepted = (updatedUser) => {
    // Update user in context
    updateUser(updatedUser);
    setShowTermsModal(false);
    
    // Check if subscription is needed after terms acceptance
    const needsSub = needsSubscription(updatedUser);
    setShowSubscriptionModal(needsSub);
  };

  const handleSubscriptionComplete = (updatedUser) => {
    // Set flag to prevent useEffect from reopening modal
    subscriptionJustCompletedRef.current = true;
    // Close modal first to prevent flicker from useEffect re-evaluation
    setShowSubscriptionModal(false);
    // Update user in context after closing modal
    updateUser(updatedUser);
  };

  const handleSubscriptionClose = () => {
    // Check if user is on Free Plan
    const isFreePlan = user?.subscription?.plan_name?.toLowerCase().includes('free');
    
    // Check if trial has ended
    const isOnTrialPlan = user?.subscription?.plan_duration_days && user?.subscription?.plan_duration_days > 0;
    const isTrialEnded = isOnTrialPlan && user?.subscription_end_date && new Date(user.subscription_end_date) <= new Date();
    
    if (isFreePlan || isTrialEnded) {
      // Free Plan users or ended trial users: Logout immediately when they close the modal
      logout();
      setShowSubscriptionModal(false);
    } else {
      // Active Trial Plan users or no plans available: Just close the modal
      setShowSubscriptionModal(false);
    }
  };

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
      
      {/* Terms & Conditions Modal */}
      <TermsConditionsModal 
        isOpen={showTermsModal}
        user={user}
        onAccept={handleTermsAccepted}
      />
      
      {/* Subscription Plan Modal */}
      <SubscriptionPlanModal 
        isOpen={showSubscriptionModal}
        user={user}
        onSubscriptionComplete={handleSubscriptionComplete}
        onClose={handleSubscriptionClose}
      />
      
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <Home />} />
      <Route path="/login" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <Login />} />
      <Route path="/signup" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <Signup />} />
      <Route path="/therapist-signup/:token?" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <TherapistSignup />} />
      <Route path="/forgot-password" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <ForgotPassword />} />
      <Route path="/reset-password" element={user ? <Navigate to={redirectPath} replace key={userKey} /> : <ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/google/callback" element={<GoogleCalendarCallback />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/therapist/:partner_id" element={<PublicTherapistProfile />} />
      
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
                <Route path="whatsapp-settings" element={<WhatsAppSettingsTab />} />
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

