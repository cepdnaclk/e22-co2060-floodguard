'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dams, setDams] = useState([]);
  const [selectedDamId, setSelectedDamId] = useState('');
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // 'online' | 'stale' | 'connecting'

  // Check auth session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
          }
        }
      } catch {
        // Not authenticated
      } finally {
        setAuthLoading(false);
      }
    };
    checkAuth();
  }, []);

  // Fetch dams list
  useEffect(() => {
    const fetchDams = async () => {
      try {
        const res = await fetch('/api/dams');
        if (res.ok) {
          const data = await res.json();
          setDams(data);
          if (data.length > 0 && !selectedDamId) {
            setSelectedDamId(data[0].dam_id.toString());
          }
          setConnectionStatus('online');
        } else {
          setConnectionStatus('stale');
        }
      } catch {
        setConnectionStatus('stale');
      }
    };
    fetchDams();
  }, [selectedDamId]);

  const login = useCallback(async (name, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });

    if (res.ok) {
      const data = await res.json();
      setUser(data);
      return { success: true };
    } else {
      const data = await res.json();
      return { success: false, error: data.error || 'Login failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    }
    setUser(null);
  }, []);

  const selectedDam = dams.find((d) => String(d.dam_id) === String(selectedDamId)) || dams[0] || null;

  return (
    <AppContext.Provider
      value={{
        user,
        authLoading,
        dams,
        selectedDamId,
        setSelectedDamId,
        selectedDam,
        connectionStatus,
        login,
        logout,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
