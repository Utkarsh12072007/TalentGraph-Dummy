// Auth context: the SPA's single source of truth about the signed-in user.
// On load it asks the backend who we are (GET /api/auth/me) — the JWT itself
// lives in an HTTP-only cookie that JavaScript can never read.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // undefined = guest, null = still loading
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/api/auth/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(undefined);
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    await api.post('/api/auth/login', { email, password });
    return refresh();
  }, [refresh]);

  const register = useCallback(async (payload) => {
    await api.post('/api/auth/register', payload);
    return refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(undefined);
    }
  }, []);

  const membership = user?.memberships?.[0] || null;
  const company = membership?.company || null;
  const companyRole = membership?.role || null;
  const candidateProfile = user?.candidateProfile || null;

  // Where should this user land after signing in?
  // Reads the membership from the PASSED user, not from context state,
  // because context state is still stale inside the same login tick.
  const homeFor = (u) => {
    if (!u) return '/signin';
    if (u.role === 'PLATFORM_ADMIN') return '/admin';
    if (u.role === 'RECRUITER') {
      return u.memberships?.[0]?.company ? '/recruiter' : '/recruiter/company-setup';
    }
    return '/dashboard';
  };

  return (
    <AuthContext.Provider
      value={{
        user, loading, refresh, login, register, logout,
        membership, company, companyRole, candidateProfile, homeFor,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
