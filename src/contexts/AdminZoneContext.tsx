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
  /** The org this admin is LOCKED to as admin. Cannot be changed except by HQ admins for view switching. */
  adminLockedOrgId: string | null;
}

const AdminZoneContext = createContext<AdminZoneContextType | undefined>(undefined);

export function AdminZoneProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const {
    activeOrganization,
    accessibleOrganizations,
    accessibleSubgroups,
    userMemberships,
    switchOrganization,
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
  const isGlobalView = Boolean(activeOrganization?.isHq);

  // Admin church scope is LOCAL to admin context — does NOT write to global org store
  // This prevents the singer portal from seeing admin church switches
  const [adminChurchId, setAdminChurchId] = useState<string | null>(null);

  const selectedChurchId = adminChurchId;
  const isChurchScope = Boolean(adminChurchId);

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
    if (!adminChurchId) return null;
    const sg = accessibleSubgroups.find(s => s.id === adminChurchId);
    if (!sg) return null;
    return {
      id: sg.id,
      name: sg.name,
      zoneId: sg.organizationId || activeOrganization?.id,
      description: sg.description,
    } as ChurchSubGroup;
  }, [adminChurchId, accessibleSubgroups, activeOrganization]);

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
    // Only show churches where the user has an actual membership (subgroupId set)
    // Admins manage ALL churches but only SEE the ones they're personally a member/coordinator of
    const userSubgroupIds = new Set(
      userMemberships
        .filter((m) => m.subgroupId)
        .map((m) => m.subgroupId!)
    );
    // Only show churches the user personally belongs to — no fallback to all
    const subgroupsToShow = accessibleSubgroups.filter((sg) => userSubgroupIds.has(sg.id));
    return subgroupsToShow.map((sg) => ({
      id: sg.id,
      name: sg.name,
      zoneId: sg.organizationId || activeOrganization?.id,
      description: sg.description,
    })) as ChurchSubGroup[];
  }, [accessibleSubgroups, userMemberships, activeOrganization]);

  const setSelectedZoneId = useCallback((zoneId: string) => {
    // Zone switching is disabled for non-HQ admins — they are locked to their org.
    // HQ admins can switch between zones for viewing purposes only.
    if (!isHQAdmin) {
      console.warn('[AdminZoneContext] Zone switching blocked — non-HQ admin cannot change org scope');
      return;
    }
    if (zoneId === 'all') {
      const hqOrg = accessibleOrganizations.find((o) => o.isHq) || accessibleOrganizations[0];
      if (hqOrg) switchOrganization(hqOrg.id);
    } else {
      switchOrganization(zoneId);
    }
  }, [accessibleOrganizations, switchOrganization, isHQAdmin]);

  const setSelectedChurchId = useCallback((churchId: string | null) => {
    setAdminChurchId(churchId);
    // Update API client headers for admin requests without touching global store
    apiClient.setActiveScope({
      organizationId: activeOrganization?.id || null,
      subgroupId: churchId,
      zoneId: activeOrganization?.id || null,
      churchId: churchId,
      scope: churchId ? 'church' : (activeOrganization?.isHq ? 'global' : 'zone'),
    });
  }, [activeOrganization?.id, activeOrganization?.isHq]);

  const refreshUserChurches = useCallback(async () => {
    useOrganizationStore.getState().refreshOrganizations();
  }, []);

  // The org this admin is locked to as an admin (not just as a member)
  const adminLockedOrgId = activeOrganization?.id || null;

  // Keep the API client org-level headers in sync when org changes.
  // Church/subgroup scope is managed locally by setSelectedChurchId — not here.
  useEffect(() => {
    apiClient.setActiveScope({
      organizationId: activeOrganization?.id || null,
      zoneId: activeOrganization?.id || null,
      subgroupId: adminChurchId,
      churchId: adminChurchId,
      scope: adminChurchId ? 'church' : (activeOrganization?.isHq ? 'global' : 'zone'),
    });
  }, [activeOrganization?.id, activeOrganization?.isHq, adminChurchId]);

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
        adminLockedOrgId,
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
