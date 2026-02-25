import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User } from '../types';
import { getMe, getMyModules, EnabledModule, autoClockIn, autoClockOut } from '../api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  enabledModules: EnabledModule[];
  login: (token: string, user: User) => void;
  logout: () => Promise<void>;
  isLoading: boolean;
  refreshModules: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [enabledModules, setEnabledModules] = useState<EnabledModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadModules = async () => {
    try {
      const modules = await getMyModules();
      setEnabledModules(modules);
    } catch (e) {
      console.error('Error loading modules:', e);
      setEnabledModules([]);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      
      Promise.all([getMe(), getMyModules()])
        .then(([userData, modules]) => {
          setUser(userData);
          setEnabledModules(modules);
          localStorage.setItem('user', JSON.stringify(userData));
        })
        .catch(() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
          setEnabledModules([]);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (newToken: string, newUser: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    // Load modules and auto clock-in after login
    try {
      const [modules] = await Promise.all([
        getMyModules(),
        autoClockIn().catch(e => console.error('Auto clock-in error:', e))
      ]);
      setEnabledModules(modules);
    } catch (e) {
      console.error('Error loading modules:', e);
    }
  };

  const logout = async () => {
    // Auto clock-out before clearing session
    try {
      await autoClockOut();
    } catch (e) {
      console.error('Auto clock-out error:', e);
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setEnabledModules([]);
  };

  const refreshModules = async () => {
    await loadModules();
  };

  return (
    <AuthContext.Provider value={{ user, token, enabledModules, login, logout, isLoading, refreshModules }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
