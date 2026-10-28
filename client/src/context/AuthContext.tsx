import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { User } from '../lib/types';

type Status = 'loading' | 'signed-in' | 'signed-out';

interface AuthState {
  user: User | null;
  status: Status;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  const refresh = useCallback(async () => {
    try {
      const { user } = await api<{ user: User }>('/me');
      setUser(user);
      setStatus('signed-in');
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) console.error(err);
      setUser(null);
      setStatus('signed-out');
    }
  }, []);

  const logout = useCallback(async () => {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
    setStatus('signed-out');
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, status, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
