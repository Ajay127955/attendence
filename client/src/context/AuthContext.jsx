import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import api, { request, setAccessToken, setUnauthorizedHandler, refreshSession } from '../lib/api';
import { connectSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    setUser(null);
    setStudent(null);
    setAccessToken(null);
    disconnectSocket();
  }, []);

  const loadMe = useCallback(async () => {
    const { data } = await request(api.get('/auth/me'));
    setUser(data.user);
    setStudent(data.student || null);
    return data;
  }, []);

  // On boot, try to restore the session from the refresh cookie.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // Deduplicated across React StrictMode double-invokes and any parallel
        // callers, so the rotating refresh token is only ever used once.
        const token = await refreshSession();
        if (!active || !token) return;
        await loadMe();
      } catch {
        if (active) clear();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clear, loadMe]);

  useEffect(() => {
    setUnauthorizedHandler(() => clear());
  }, [clear]);

  // Keep a live socket for authenticated users.
  useEffect(() => {
    if (user) connectSocket();
    else disconnectSocket();
  }, [user]);

  const login = useCallback(
    async (identifier, password) => {
      const res = await api.post('/auth/login', { identifier, password });
      const { user: u, accessToken } = res.data.data;
      setAccessToken(accessToken);
      setUser(u);
      connectSocket();
      await loadMe();
      return u;
    },
    [loadMe]
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    clear();
  }, [clear]);

  const refreshUser = useCallback(async () => {
    try {
      await loadMe();
    } catch {
      /* ignore */
    }
  }, [loadMe]);

  const value = useMemo(
    () => ({
      user,
      student,
      loading,
      isAuthenticated: Boolean(user),
      role: user?.role || null,
      login,
      logout,
      refreshUser,
      setUser,
    }),
    [user, student, loading, login, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
