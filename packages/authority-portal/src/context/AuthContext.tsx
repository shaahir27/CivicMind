/**
 * Authority Portal Auth Context
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { LoginResponse } from '../../../shared/src/api-client.js';

interface AuthState {
  token: string | null;
  user: LoginResponse | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem('civicmind_auth_session');
      if (stored) return JSON.parse(stored) as AuthState;
    } catch { /* ignore */ }
    return { token: null, user: null };
  });

  useEffect(() => {
    if (auth.token) localStorage.setItem('civicmind_auth_session', JSON.stringify(auth));
    else localStorage.removeItem('civicmind_auth_session');
  }, [auth]);

  return (
    <AuthContext.Provider value={{
      ...auth,
      login: (token, user) => setAuth({ token, user }),
      logout: () => setAuth({ token: null, user: null })
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
