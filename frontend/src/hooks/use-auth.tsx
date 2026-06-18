'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'GUEST' | 'MAINTENANCE' | 'ACCOUNTANT';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  registerUser: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    // Attempt auto-login using stored token
    const token = api.getToken();
    if (token) {
      // Decode JWT locally to extract initial user details
      try {
        const payloadBase64 = token.split('.')[1];
        const payload = JSON.parse(atob(payloadBase64));
        
        // Check if token expired
        if (payload.exp * 1000 < Date.now()) {
          api.setToken(null);
          setUser(null);
        } else {
          setUser({
            id: payload.id,
            email: payload.email,
            firstName: payload.firstName,
            lastName: payload.lastName,
            role: payload.role
          });
        }
      } catch (e) {
        api.setToken(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { accessToken, user: userData } = res.data;
      api.setToken(accessToken);
      setUser(userData);
      router.push('/dashboard');
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.message || 'Identifiants incorrects.');
    } finally {
      setLoading(false);
    }
  };

  const registerUser = async (data: any) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', data);
      const { accessToken, user: userData } = res.data;
      api.setToken(accessToken);
      setUser(userData);
      router.push('/dashboard');
    } catch (error: any) {
      setLoading(false);
      throw new Error(error.message || 'Erreur lors de la création de compte.');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      // Ignore network failures on logout
    } finally {
      api.setToken(null);
      setUser(null);
      setLoading(false);
      router.push('/');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAuthenticated: !!user, login, registerUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
