/**
 * CivicMind — Citizen App Auth Context
 * Manages guest/citizen session state, persisted in localStorage.
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthState {
  token: string | null;
  userId: string | null;
  isGuest: boolean;
  isLoggedIn: boolean;
  loginTimestamp?: number;
}

interface AuthContextValue extends AuthState {
  loginAsGuest: (token: string, userId: string) => void;
  loginAsCitizen: (token: string, userId: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LS_KEY = 'civicmind_citizen_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AuthState;
        // 7 days expiry
        if (parsed.loginTimestamp && Date.now() - parsed.loginTimestamp > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem(LS_KEY);
          return { token: null, userId: null, isGuest: false, isLoggedIn: false };
        }
        return parsed;
      }
    } catch { /* ignore */ }
    return { token: null, userId: null, isGuest: false, isLoggedIn: false };
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(auth));
  }, [auth]);

  const loginAsGuest = (token: string, userId: string) =>
    setAuth({ token, userId, isGuest: true, isLoggedIn: true, loginTimestamp: Date.now() });

  const loginAsCitizen = (token: string, userId: string) =>
    setAuth({ token, userId, isGuest: false, isLoggedIn: true, loginTimestamp: Date.now() });

  const logout = () => {
    localStorage.removeItem(LS_KEY);
    setAuth({ token: null, userId: null, isGuest: false, isLoggedIn: false });
  };

  return (
    <AuthContext.Provider value={{ ...auth, loginAsGuest, loginAsCitizen, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
