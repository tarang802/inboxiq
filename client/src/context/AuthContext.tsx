import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../lib/api';
import type { User } from '../lib/types';

type Status = 'loading' | 'signed-in' | 'signed-out';

interface AuthState {
  user: User | null;
  status: Status;
  // false when google has revoked or expired our access
  gmailConnected: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [gmailConnected, setGmailConnected] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user, gmailConnected } = await api<{ user: User; gmailConnected: boolean }>('/me');
      setUser(user);
      setGmailConnected(gmailConnected);
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

  // the server removes everything and clears the session cookie. the caller decides
  // where to go next and then calls refresh, so protected pages don't redirect first
  const deleteAccount = useCallback(async () => {
    await api('/me', { method: 'DELETE' });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, status, gmailConnected, refresh, logout, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
