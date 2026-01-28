import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Shift } from '../types';
import { getCurrentShift } from '../api';
import { useAuth } from './AuthContext';

interface ShiftContextType {
  currentShift: Shift | null;
  setCurrentShift: (shift: Shift | null) => void;
  refreshShift: () => Promise<void>;
  isLoading: boolean;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const refreshShift = async () => {
    if (!user) {
      setCurrentShift(null);
      setIsLoading(false);
      return;
    }
    
    try {
      const shift = await getCurrentShift();
      setCurrentShift(shift);
    } catch {
      setCurrentShift(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshShift();
  }, [user]);

  return (
    <ShiftContext.Provider value={{ currentShift, setCurrentShift, refreshShift, isLoading }}>
      {children}
    </ShiftContext.Provider>
  );
};

export const useShift = () => {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShift must be used within a ShiftProvider');
  }
  return context;
};
