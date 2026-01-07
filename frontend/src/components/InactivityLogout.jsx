import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Component to handle navigation after logout due to inactivity
 * This component listens for the custom logout event and redirects to login page
 */
const InactivityLogout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const previousUserRef = useRef(user);

  useEffect(() => {
    // Listen for custom logout event (triggered by inactivity)
    const handleInactivityLogout = () => {
      // Only navigate if we're on a protected route
      const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/', '/privacy-policy', '/terms-of-service'];
      const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
      
      if (!isPublicRoute) {
        // Show a brief message before navigating (optional - you can customize this)
        navigate('/login', { 
          state: { 
            message: 'You have been logged out due to inactivity. Please sign in again.' 
          },
          replace: true 
        });
      }
    };

    // Handle unauthorized errors (401) from API calls
    const handleUnauthorized = () => {
      const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/', '/privacy-policy', '/terms-of-service'];
      const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
      
      if (!isPublicRoute) {
        navigate('/login', { 
          state: { 
            message: 'Your session has expired. Please sign in again.' 
          },
          replace: true 
        });
      }
    };

    // Listen for the custom events
    window.addEventListener('userLoggedOut', handleInactivityLogout);
    window.addEventListener('unauthorized', handleUnauthorized);

    // Also check if user was logged out (state changed from user to null)
    if (previousUserRef.current && !user && location.pathname !== '/login') {
      const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/', '/privacy-policy', '/terms-of-service'];
      const isPublicRoute = publicRoutes.some(route => location.pathname.startsWith(route));
      
      if (!isPublicRoute) {
        navigate('/login', { 
          state: { 
            message: 'You have been logged out. Please sign in again.' 
          },
          replace: true 
        });
      }
    }

    // Update previous user reference
    previousUserRef.current = user;

    return () => {
      window.removeEventListener('userLoggedOut', handleInactivityLogout);
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, [user, navigate, location]);

  // This component doesn't render anything
  return null;
};

export default InactivityLogout;

