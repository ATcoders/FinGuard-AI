import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, onAuthLost, refreshSession } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    onAuthLost(() => setUser(null));
    refreshSession()
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setBooting(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const d = await api.login(email, password);
    setUser(d.user);
  }, []);

  const register = useCallback(async (payload) => {
    const d = await api.register(payload);
    setUser(d.user);
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } finally { setUser(null); }
  }, []);

  return (
    <AuthContext.Provider value={{ user, booting, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
