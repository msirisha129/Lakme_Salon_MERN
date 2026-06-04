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
    const payload = { email: (email || '').trim().toLowerCase(), password };
    const { data } = await API.post('/auth/login', payload);
    localStorage.setItem('lakme_token', data.token);
    localStorage.setItem('lakme_user', JSON.stringify(data.user));
    setUser(data.user);
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
    <AuthContext.Provider value={{ user, login, register, logout, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};
