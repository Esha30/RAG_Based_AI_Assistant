'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, User } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('rag_token');
    if (stored) {
      setToken(stored);
      api.auth.me()
        .then(setUser)
        .catch(() => { localStorage.removeItem('rag_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login(email, password);
    localStorage.setItem('rag_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    router.push('/dashboard');
  };

  const register = async (email: string, username: string, password: string) => {
    const res = await api.auth.register(email, username, password);
    localStorage.setItem('rag_token', res.access_token);
    setToken(res.access_token);
    setUser(res.user);
    router.push('/dashboard');
  };

  const logout = () => {
    localStorage.removeItem('rag_token');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
