"use client";

import React, { createContext, useContext } from 'react';
import { getZoneTheme, ZoneTheme } from '@/utils/zone-theme';

interface AdminThemeContextType {
  theme: ZoneTheme;
  zoneColor: string;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = getZoneTheme();
  
  return (
    <AdminThemeContext.Provider value={{ theme, zoneColor: '#9333EA' }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within AdminThemeProvider');
  }
  return context;
}
