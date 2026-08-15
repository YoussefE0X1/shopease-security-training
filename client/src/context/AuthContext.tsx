import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api, { markSessionExpiredHandled } from '../services/api';
import type { User } from '../types';

interface AuthContextType {
  user: User | null; token: string | null; loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void; isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  // When the API decides the session is dead (401 + failed refresh), clear the
  // in-memory state so the router drops the user back to the login page
  // without a full page reload.
  useEffect(() => {
    const onSessionExpired = () => {
      markSessionExpiredHandled();
      setUser(null);
      setToken(null);
    };
    window.addEventListener('app:session-expired', onSessionExpired);
    return () => window.removeEventListener('app:session-expired', onSessionExpired);
  }, []);

  // Refresh the stored user from the API on mount so a role change (e.g. being
  // promoted to admin) takes effect immediately without re-login
  useEffect(() => {
    const refreshUser = async () => {
      if (!localStorage.getItem('token')) {
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.get('/users/profile');
        const fresh = data.data;
        setUser(fresh);
        localStorage.setItem('user', JSON.stringify(fresh));
      } catch {
        // keep the stored user on failure (e.g. offline)
      }
      setLoading(false);
    };
    refreshUser();
  }, []);

  const saveAuth = (userData: User, accessToken: string, refreshToken?: string) => {
    setUser(userData);
    setToken(accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
  };

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    saveAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    saveAuth(data.data.user, data.data.accessToken, data.data.refreshToken);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
