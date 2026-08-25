"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { ZONES, Zone } from '@/config/zones';
import { useAuth } from '@/stores/authStore';
import { useZone, useZoneStore } from '@/stores/zoneStore';

interface AdminZoneContextType {
  selectedZoneId: string; // 'all' or specific zone id
  selectedZone: Zone | null; // null if 'all'
  isGlobalView: boolean;
  setSelectedZoneId: (zoneId: string) => void;
  availableZones: Zone[];
  isHQAdmin: boolean;
  zoneScopeLabel: string;
}

const AdminZoneContext = createContext<AdminZoneContextType | undefined>(undefined);

export function AdminZoneProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const { currentZone, isSuperAdmin, switchZone } = useZone();

  const isHQAdmin = Boolean(
    isSuperAdmin ||
    profile?.role === 'hq_admin' ||
    profile?.role === 'admin' ||
    profile?.hasHqAccess ||
    (profile as any)?.has_hq_access
  );

  const [selectedZoneId, setSelectedZoneIdState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('admin_selected_zone_id') || localStorage.getItem('lwsrh_active_zone_id');
      if (saved) return saved;
    }
    return currentZone?.id || (isHQAdmin ? 'all' : 'BLWZN1');
  });

  // Sync with currentZone when currentZone changes from user-facing or switcher
  useEffect(() => {
    if (currentZone?.id) {
      setSelectedZoneIdState(currentZone.id);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('admin_selected_zone_id', currentZone.id);
        localStorage.setItem('lwsrh_active_zone_id', currentZone.id);
      }
    }
  }, [currentZone?.id]);

  const setSelectedZoneId = (zoneId: string) => {
    setSelectedZoneIdState(zoneId);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_selected_zone_id', zoneId);
    }
    if (zoneId !== 'all') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lwsrh_active_zone_id', zoneId);
      }
      switchZone(zoneId);
    }
  };

  const selectedZone = useMemo(() => {
    if (selectedZoneId === 'all') return null;
    return ZONES.find(z => z.id === selectedZoneId || z.invitationCode === selectedZoneId || z.slug === selectedZoneId) || currentZone || null;
  }, [selectedZoneId, currentZone]);

  const isGlobalView = selectedZoneId === 'all';

  const zoneScopeLabel = isGlobalView
    ? 'All Zones (Global HQ)'
    : (selectedZone?.name || 'Selected Zone');

  return (
    <AdminZoneContext.Provider
      value={{
        selectedZoneId,
        selectedZone,
        isGlobalView,
        setSelectedZoneId,
        availableZones: ZONES,
        isHQAdmin,
        zoneScopeLabel,
      }}
    >
      {children}
    </AdminZoneContext.Provider>
  );
}

export function useAdminZone() {
  const context = useContext(AdminZoneContext);
  if (!context) {
    throw new Error('useAdminZone must be used within an AdminZoneProvider');
  }
  return context;
}
