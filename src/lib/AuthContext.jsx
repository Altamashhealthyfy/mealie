import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(false); // Not used anymore — always false
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);

      // Redirect from root based on user type
      const currentPath = window.location.pathname;
      const isOnRoot = currentPath === '/' || currentPath === '';
      if (isOnRoot) {
        const userType = currentUser?.user_type;
        if (userType === 'client') {
          window.location.replace('/ClientDashboard');
        } else if (['super_admin', 'student_coach', 'team_member', 'student_team_member'].includes(userType)) {
          window.location.replace('/DietitianDashboard');
        } else {
          window.location.replace('/Home');
        }
      }
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);

      const status = error?.status || error?.response?.status;
      if (status === 401 || status === 403) {
        if (error?.data?.extra_data?.reason === 'user_not_registered') {
          setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
        } else {
          setAuthError({ type: 'auth_required', message: 'Authentication required' });
        }
      }
      // For other errors (network etc), just let the app load without auth — don't block UI
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      base44.auth.logout(window.location.href);
    } else {
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      logout,
      navigateToLogin,
      checkAppState
    }}>
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