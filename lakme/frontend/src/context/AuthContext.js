import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../utils/api';

const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('lakme_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const payload = { email: (email || '').trim().toLowerCase(), password };
      console.log('AuthContext: Sending login request to backend with payload:', payload);
      const { data } = await API.post('/auth/login', payload);

      // If 2FA is required, do NOT set the user state or token yet
      if (data.requires2FA) {
        localStorage.setItem('lakme_2fa_email', payload.email);
        return data;
      }

      // Normal login path (if 2FA was disabled or not triggered)
      console.log('AuthContext: Backend response (no 2FA required):', data);
      localStorage.setItem('lakme_token', data.token);
      localStorage.setItem('lakme_user', JSON.stringify(data.user));
      setUser(data.user);
      console.log('AuthContext: localStorage after login (no 2FA):');
      console.log('  lakme_token:', localStorage.getItem('lakme_token'));
      console.log('  lakme_user:', localStorage.getItem('lakme_user'));
      console.log('  lakme_2fa_email:', localStorage.getItem('lakme_2fa_email'));

      return data;
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    setLoading(true);
    try {
      const { data } = await API.post('/auth/verify-otp', { email, otp });
      localStorage.setItem('lakme_token', data.token);
      localStorage.setItem('lakme_user', JSON.stringify(data.user));
      setUser(data.user);
      localStorage.removeItem('lakme_2fa_email');
      return data;
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async (email) => {
    setLoading(true);
    const { data } = await API.post('/auth/generate-otp', { email });
    setLoading(false);
    return data;
  };

  const register = async (formData) => {
    const payload = { ...formData, email: (formData.email || '').trim().toLowerCase() };
    const { data } = await API.post('/auth/register', payload);
    localStorage.setItem('lakme_token', data.token);
    localStorage.setItem('lakme_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('lakme_token');
    localStorage.removeItem('lakme_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, login, verifyOtp, resendOtp, register, logout, 
      loading, isAdmin: user?.role === 'admin' 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
