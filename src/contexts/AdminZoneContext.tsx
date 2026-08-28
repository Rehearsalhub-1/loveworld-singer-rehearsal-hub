"use client";

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { ZONES, Zone } from '@/config/zones';
import { useAuth } from '@/stores/authStore';
import { useZone } from '@/stores/zoneStore';
import { useOrganizationStore } from '@/stores/organizationStore';
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
  const { profile } = useAuth();
  const {
    activeOrganization,
    activeSubgroup,
    accessibleOrganizations,
    accessibleSubgroups,
    switchOrganization,
    switchSubgroup,
    capabilities,
    isSuperAdmin,
  } = useOrganizationStore();

  const isHQAdmin = Boolean(
    isSuperAdmin ||
    capabilities.canManagePlatform ||
    profile?.role === 'hq_admin' ||
    profile?.role === 'admin' ||
    profile?.role === 'boss' ||
    profile?.hasHqAccess ||
    (profile as any)?.has_hq_access
  );

  const selectedZoneId = activeOrganization?.id || 'zone-001';
  const selectedChurchId = activeSubgroup?.id || null;
  const isGlobalView = Boolean(activeOrganization?.isHq);
  const isChurchScope = Boolean(activeSubgroup?.id);

  const selectedZone = useMemo(() => {
    if (!activeOrganization) return null;
    return {
      id: activeOrganization.id,
      name: activeOrganization.name,
      code: activeOrganization.code || activeOrganization.region || 'ORG',
      region: activeOrganization.region || '',
      themeColor: activeOrganization.themeColor || '#7c3aed',
      isHQ: activeOrganization.isHq || false,
    } as unknown as Zone;
  }, [activeOrganization]);

  const selectedChurch = useMemo(() => {
    if (!activeSubgroup) return null;
    return {
      id: activeSubgroup.id,
      name: activeSubgroup.name,
      zoneId: activeSubgroup.organizationId || activeOrganization?.id,
      description: activeSubgroup.description,
    } as ChurchSubGroup;
  }, [activeSubgroup, activeOrganization]);

  const availableZones = useMemo(() => {
    return accessibleOrganizations.map((org) => ({
      id: org.id,
      name: org.name,
      code: org.code || org.region || 'ORG',
      region: org.region || '',
      themeColor: org.themeColor || '#7c3aed',
      isHQ: org.isHq || false,
    })) as unknown as Zone[];
  }, [accessibleOrganizations]);

  const userChurches = useMemo(() => {
    return accessibleSubgroups.map((sg) => ({
      id: sg.id,
      name: sg.name,
      zoneId: sg.organizationId || activeOrganization?.id,
      description: sg.description,
    })) as ChurchSubGroup[];
  }, [accessibleSubgroups, activeOrganization]);

  const setSelectedZoneId = useCallback((zoneId: string) => {
    if (zoneId === 'all') {
      // If HQ admin selects all, default to primary HQ organization
      const hqOrg = accessibleOrganizations.find((o) => o.isHq) || accessibleOrganizations[0];
      if (hqOrg) switchOrganization(hqOrg.id);
    } else {
      switchOrganization(zoneId);
    }
  }, [accessibleOrganizations, switchOrganization]);

  const setSelectedChurchId = useCallback((churchId: string | null) => {
    switchSubgroup(churchId);
  }, [switchSubgroup]);

  const refreshUserChurches = useCallback(async () => {
    useOrganizationStore.getState().refreshOrganizations();
  }, []);

  const zoneScopeLabel = isChurchScope
    ? (selectedChurch?.name || 'Church Scope')
    : isGlobalView
      ? (activeOrganization?.name || 'Global HQ')
      : (activeOrganization?.name || 'Zonal Scope');

  return (
    <AdminZoneContext.Provider
      value={{
        selectedZoneId,
        selectedZone,
        isGlobalView,
        setSelectedZoneId,
        availableZones,
        isHQAdmin,
        zoneScopeLabel,
        selectedChurchId,
        selectedChurch,
        isChurchScope,
        setSelectedChurchId,
        userChurches,
        isLoadingChurches: false,
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
