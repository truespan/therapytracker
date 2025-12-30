import React, { createContext, useState, useContext, useEffect, useRef, useCallback } from 'react';
import { authAPI, userAPI } from '../services/api';

const AuthContext = createContext(null);

// Inactivity timeout: 5 minutes = 300,000 milliseconds
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const inactivityTimerRef = useRef(null);
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  const logout = useCallback((shouldNavigate = false) => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastActivityTimestamp');
    setUser(null);
    
    // Clear inactivity timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }

    // If logout is due to inactivity, trigger a custom event for navigation
    if (shouldNavigate) {
      window.dispatchEvent(new CustomEvent('userLoggedOut'));
    }
  }, []);

  // Set up activity event listeners and inactivity timer
  useEffect(() => {
    if (!user) {
      // Clear timer if user is not logged in
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    // Function to reset the inactivity timer
    const resetInactivityTimer = () => {
      // Store current timestamp as last activity
      localStorage.setItem('lastActivityTimestamp', Date.now().toString());
      
      // Clear existing timer
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      // Set new timer
      inactivityTimerRef.current = setTimeout(() => {
        // Logout user after inactivity timeout
        logout(true); // Pass true to indicate inactivity logout
      }, INACTIVITY_TIMEOUT);
    };

    // Reset timer on initial mount when user is logged in
    resetInactivityTimer();

    // Add event listeners for user activity
    const handleActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, true);
    });

    // Cleanup: remove event listeners and clear timer
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity, true);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [user, logout]);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    const lastActivityTimestamp = localStorage.getItem('lastActivityTimestamp');
    
    if (token && savedUser) {
      // Check if user has been inactive for too long (e.g., overnight)
      if (lastActivityTimestamp) {
        const timeSinceLastActivity = Date.now() - parseInt(lastActivityTimestamp, 10);
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          // User has been inactive longer than timeout, log them out
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('lastActivityTimestamp');
          setUser(null);
          setLoading(false);
          // Trigger logout event for navigation
          window.dispatchEvent(new CustomEvent('userLoggedOut'));
          return;
        }
      }
      
      // User is still within inactivity timeout, restore session
      setUser(JSON.parse(savedUser));
      // Update last activity timestamp to now since we're restoring the session
      localStorage.setItem('lastActivityTimestamp', Date.now().toString());
      
      // Refresh user data from server to get latest organization info
      authAPI.getCurrentUser()
        .then(response => {
          const updatedUser = response.data.user;
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
          setLoading(false);
        })
        .catch(error => {
          console.error('Failed to refresh user data:', error);
          // If token is invalid, logout
          if (error.response?.status === 401) {
            logout(false);
          }
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials);
      const { token, user: userData } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('lastActivityTimestamp', Date.now().toString());
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const googleLogin = async (token) => {
    try {
      console.log('[AuthContext] Starting Google login...');
      const response = await authAPI.googleAuth(token);
      const { token: jwtToken, user: userData } = response.data;
      console.log('[AuthContext] Google auth response received:', { userType: userData.userType, id: userData.id });
      
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('lastActivityTimestamp', Date.now().toString());
      
      // Fetch complete user data BEFORE setting state (to avoid double state update)
      let finalUserData = userData;
      try {
        console.log('[AuthContext] Fetching additional user data...');
        // For users, use getUserById to get videoSessionsEnabled; for others use getCurrentUser
        if (userData.userType === 'user') {
          const refreshResponse = await userAPI.getById(userData.id);
          finalUserData = { 
            ...userData, // Keep all original data
            ...refreshResponse.data.user, // Merge with refreshed data
            videoSessionsEnabled: refreshResponse.data.videoSessionsEnabled,
            userType: userData.userType, // Ensure userType is preserved
            id: userData.id // Ensure id is preserved
          };
          console.log('[AuthContext] User data refreshed with videoSessionsEnabled:', finalUserData.videoSessionsEnabled);
        } else {
          const refreshResponse = await authAPI.getCurrentUser();
          finalUserData = { ...userData, ...refreshResponse.data.user };
          console.log('[AuthContext] User data refreshed for partner/org');
        }
      } catch (refreshError) {
        console.error('[AuthContext] Failed to refresh user data after Google login:', refreshError);
        // If refresh fails, use initial user data
        finalUserData = userData;
      }
      
      // Set user state ONCE with complete data
      localStorage.setItem('user', JSON.stringify(finalUserData));
      setUser(finalUserData);
      console.log('[AuthContext] User state set with complete data');
      
      return { success: true, user: finalUserData };
    } catch (error) {
      console.error('[AuthContext] Google login error:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Google login failed',
        details: error.response?.data
      };
    }
  };

  const signup = async (userData) => {
    try {
      const response = await authAPI.signup(userData);
      const { token, user: newUser } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('lastActivityTimestamp', Date.now().toString());
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Signup failed' 
      };
    }
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await authAPI.getCurrentUser();
      const userData = response.data.user;

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return { success: false, error: 'Failed to refresh user data' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, googleLogin, logout, updateUser, refreshUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;

