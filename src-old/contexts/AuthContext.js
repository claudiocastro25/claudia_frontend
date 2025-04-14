import React, { createContext, useState, useEffect, useContext } from 'react';
import { getCurrentUser, isAuthenticated } from '../services/authService';

// Create the authentication context
export const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in
    const checkAuthStatus = () => {
      try {
        // Use the direct localStorage approach from your authService
        if (isAuthenticated()) {
          const userInfo = getCurrentUser();
          if (userInfo) {
            setCurrentUser(userInfo);
          }
        }
      } catch (error) {
        console.error("Authentication error:", error);
        // Clear token if there's an error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  // Authentication context values
  const value = {
    currentUser,
    setCurrentUser,
    loading,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;