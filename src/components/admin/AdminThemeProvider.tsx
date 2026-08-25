"use client";

import React, { createContext, useContext } from 'react';
import { useZone } from '@/hooks/useZone';
import { getZoneTheme, ZoneTheme } from '@/utils/zone-theme';

interface AdminThemeContextType {
  theme: ZoneTheme;
  zoneColor: string;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const { currentZone } = useZone();
  
  const theme = getZoneTheme(currentZone?.themeColor);
  
  return (
    <AdminThemeContext.Provider value={{ theme, zoneColor: currentZone?.themeColor || '#9333EA' }}>
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
