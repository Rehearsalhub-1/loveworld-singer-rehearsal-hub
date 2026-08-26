"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ZONES, Zone } from '@/config/zones';
import { useAuth } from '@/stores/authStore';
import { useZone } from '@/stores/zoneStore';
import { apiClient } from '@/lib/api-client';

export interface ChurchSubGroup {
  id: string;
  name: string;
  type?: string;
  status?: string;
  zoneId?: string;
  coordinatorId?: string;
  coordinatorName?: string;
  description?: string;
  memberCount?: number;
  [key: string]: any;
}

interface AdminZoneContextType {
  selectedZoneId: string; // 'all' or specific zone id
  selectedZone: Zone | null; // null if 'all'
  isGlobalView: boolean;
  setSelectedZoneId: (zoneId: string) => void;
  availableZones: Zone[];
  isHQAdmin: boolean;
  zoneScopeLabel: string;

  // Church / Subgroup Scoping
  selectedChurchId: string | null;
  selectedChurch: ChurchSubGroup | null;
  isChurchScope: boolean;
  setSelectedChurchId: (churchId: string | null) => void;
  userChurches: ChurchSubGroup[];
  isLoadingChurches: boolean;
  refreshUserChurches: () => Promise<void>;
}

const AdminZoneContext = createContext<AdminZoneContextType | undefined>(undefined);

export function AdminZoneProvider({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth();
  const { currentZone, isSuperAdmin, switchZone } = useZone();

  const isHQAdmin = Boolean(
    isSuperAdmin ||
    profile?.role === 'hq_admin' ||
    profile?.role === 'admin' ||
    profile?.role === 'boss' ||
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

  const [selectedChurchId, setSelectedChurchIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlChurch = urlParams.get('churchId') || urlParams.get('subgroupId');
      if (urlChurch) return urlChurch;
      const saved = sessionStorage.getItem('admin_selected_church_id');
      if (saved) return saved;
    }
    return null;
  });

  const [userChurches, setUserChurches] = useState<ChurchSubGroup[]>([]);
  const [isLoadingChurches, setIsLoadingChurches] = useState(false);

  // Fetch coordinated & member churches for the active admin/user
  const refreshUserChurches = useCallback(async () => {
    if (!user?.id) return;
    setIsLoadingChurches(true);
    try {
      const [coordRes, mineRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: ChurchSubGroup[] }>('/subgroups/coordinated').catch(() => ({ data: [] })),
        apiClient.get<{ success: boolean; data: ChurchSubGroup[] }>('/subgroups/mine').catch(() => ({ data: [] })),
      ]);

      const coord = Array.isArray(coordRes?.data) ? coordRes.data : [];
      const mine = Array.isArray(mineRes?.data) ? mineRes.data : [];
      const combined = [...coord, ...mine.filter((m) => !coord.some((c) => c.id === m.id))];
      setUserChurches(combined);

      // If URL specified scope=church or Church Admin without specific ID, auto-select first church
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const scope = urlParams.get('scope');
        const churchParam = urlParams.get('churchId') || urlParams.get('subgroupId');
        if (!churchParam && scope === 'church' && combined.length > 0) {
          setSelectedChurchIdState(combined[0].id);
          sessionStorage.setItem('admin_selected_church_id', combined[0].id);
        }
      }
    } catch (err) {
      console.error('[AdminZoneProvider] Failed to load user churches:', err);
    } finally {
      setIsLoadingChurches(false);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshUserChurches();
  }, [refreshUserChurches]);

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
    setSelectedChurchIdState(null); // Clear church scope when switching zones explicitly
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('admin_selected_zone_id', zoneId);
      sessionStorage.removeItem('admin_selected_church_id');
    }
    // ── Update the API client scope store so all future requests carry the right headers
    apiClient.setActiveScope({
      zoneId: zoneId !== 'all' ? zoneId : null,
      churchId: null,
      scope: zoneId !== 'all' ? 'zone' : 'global',
    });
    if (zoneId !== 'all') {
      if (typeof window !== 'undefined') {
        localStorage.setItem('lwsrh_active_zone_id', zoneId);
      }
      switchZone(zoneId);
    }
  };

  const setSelectedChurchId = (churchId: string | null) => {
    setSelectedChurchIdState(churchId);
    if (typeof window !== 'undefined') {
      if (churchId) {
        sessionStorage.setItem('admin_selected_church_id', churchId);
      } else {
        sessionStorage.removeItem('admin_selected_church_id');
      }
    }
    // ── Update the API client scope store so all future requests carry the right headers
    apiClient.setActiveScope({
      zoneId: churchId ? (selectedZoneId !== 'all' ? selectedZoneId : null) : (selectedZoneId !== 'all' ? selectedZoneId : null),
      churchId: churchId || null,
      scope: churchId ? 'church' : (selectedZoneId !== 'all' ? 'zone' : 'global'),
    });
  };

  const selectedZone = useMemo(() => {
    if (selectedZoneId === 'all') return null;
    return ZONES.find(z => z.id === selectedZoneId || z.invitationCode === selectedZoneId || z.slug === selectedZoneId) || currentZone || null;
  }, [selectedZoneId, currentZone]);

  const selectedChurch = useMemo(() => {
    if (!selectedChurchId) return null;
    return userChurches.find(c => c.id === selectedChurchId) || null;
  }, [selectedChurchId, userChurches]);

  const isChurchScope = Boolean(selectedChurchId && selectedChurchId !== 'all');
  const isGlobalView = selectedZoneId === 'all' && !isChurchScope;

  const zoneScopeLabel = isChurchScope
    ? (selectedChurch?.name ? `Church: ${selectedChurch.name}` : 'Church Admin Scope')
    : isGlobalView
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
        selectedChurchId,
        selectedChurch,
        isChurchScope,
        setSelectedChurchId,
        userChurches,
        isLoadingChurches,
        refreshUserChurches,
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
