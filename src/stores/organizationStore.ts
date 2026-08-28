"use client";

/**
 * CANONICAL ORGANIZATION STORE
 * Single Source of Truth for Multi-Tenant Organization, Membership, and Subgroup state.
 * Rule: PERMISSION = USER + MEMBERSHIP + SCOPE
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { apiClient } from '@/lib/api-client';
import {
  Organization,
  Membership,
  Subgroup,
  OrganizationCapabilities,
  getMembershipCapabilities,
} from '@/types/organization';

interface OrganizationState {
  // State
  activeOrganization: Organization | null;
  activeOrganizationId: string | null;
  activeMembership: Membership | null;
  accessibleOrganizations: Organization[];
  activeSubgroup: Subgroup | null;
  accessibleSubgroups: Subgroup[];
  userMemberships: Membership[];
  capabilities: OrganizationCapabilities;
  isSuperAdmin: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  _lastLoadedUserId: string | null;

  // Actions
  loadOrganizations: (
    userId: string,
    memberships: Membership[],
    email?: string,
    isSuper?: boolean
  ) => Promise<void>;
  switchOrganization: (organizationId: string) => Promise<boolean>;
  switchSubgroup: (subgroupId: string | null) => void;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (payload: {
    name: string;
    code?: string;
    country?: string;
    region?: string;
    invitationCode?: string;
    isHq?: boolean;
    adminUserId?: string;
  }) => Promise<{ success: boolean; data?: Organization; error?: string }>;
  clearOrganizationState: () => void;
}

function getUserOrgPrefKey(userId: string) {
  return `lwsrh-user-org-${userId}`;
}

function getStoredOrgId(userId?: string | null): string | null {
  if (typeof window === 'undefined') return null;
  try {
    if (userId) {
      const pref = localStorage.getItem(getUserOrgPrefKey(userId));
      if (pref) return pref;
    }
    return (
      localStorage.getItem('lwsrh_active_organization_id') ||
      localStorage.getItem('lwsrh_active_zone_id') ||
      null
    );
  } catch {
    return null;
  }
}

function setStoredOrgId(userId: string | null | undefined, orgId: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (orgId) {
      if (userId) localStorage.setItem(getUserOrgPrefKey(userId), orgId);
      localStorage.setItem('lwsrh_active_organization_id', orgId);
      localStorage.setItem('lwsrh_active_zone_id', orgId);
      sessionStorage.setItem('admin_selected_zone_id', orgId);
    } else {
      if (userId) localStorage.removeItem(getUserOrgPrefKey(userId));
      localStorage.removeItem('lwsrh_active_organization_id');
      localStorage.removeItem('lwsrh_active_zone_id');
      sessionStorage.removeItem('admin_selected_zone_id');
    }
  } catch {}
}

const defaultCapabilities: OrganizationCapabilities = {
  canManagePlatform: false,
  canManageOrganization: false,
  canManageSubgroup: false,
  canManageMembers: false,
  canManageSongs: false,
  canManagePrograms: false,
  canBroadcast: false,
  canManageMedia: false,
};

let _isFetchingOrgs = false;

export const useOrganizationStore = create<OrganizationState>()(
  subscribeWithSelector((set, get) => ({
    activeOrganization: null,
    activeOrganizationId: null,
    activeMembership: null,
    accessibleOrganizations: [],
    activeSubgroup: null,
    accessibleSubgroups: [],
    userMemberships: [],
    capabilities: defaultCapabilities,
    isSuperAdmin: false,
    isLoading: false,
    isInitialized: false,
    _lastLoadedUserId: null,

    clearOrganizationState: () => {
      setStoredOrgId(get()._lastLoadedUserId, null);
      apiClient.setActiveScope({
        zoneId: null,
        churchId: null,
        scope: 'global',
      });
      set({
        activeOrganization: null,
        activeOrganizationId: null,
        activeMembership: null,
        accessibleOrganizations: [],
        activeSubgroup: null,
        accessibleSubgroups: [],
        userMemberships: [],
        capabilities: defaultCapabilities,
        isSuperAdmin: false,
        isLoading: false,
        isInitialized: false,
        _lastLoadedUserId: null,
      });
    },

    loadOrganizations: async (
      userId: string,
      memberships: Membership[],
      email = '',
      isSuper = false
    ) => {
      if (_isFetchingOrgs) return;
      _isFetchingOrgs = true;

      set({ isLoading: true, userMemberships: memberships, isSuperAdmin: isSuper });

      try {
        // Dynamically fetch all registered organizations from database
        const res = await apiClient
          .get<{ success: boolean; data: Organization[] }>('/organizations')
          .catch(() =>
            apiClient.get<{ success: boolean; data: Organization[] }>('/zones').catch(() => ({
              success: false,
              data: [],
            }))
          );

        const allDbOrgs: Organization[] = Array.isArray(res?.data) ? res.data : [];

        // Determine accessible organizations
        let accessibleOrgs: Organization[] = [];
        if (isSuper) {
          accessibleOrgs = allDbOrgs;
        } else {
          const userOrgIds = new Set(memberships.map((m) => m.organizationId));
          accessibleOrgs = allDbOrgs.filter((org) => userOrgIds.has(org.id));
        }

        // NO DEFAULT TENANT: If user has 0 memberships and is not super admin, resolve to null
        if (accessibleOrgs.length === 0) {
          setStoredOrgId(userId, null);
          apiClient.setActiveScope({
            zoneId: null,
            churchId: null,
            scope: 'global',
          });
          set({
            activeOrganization: null,
            activeOrganizationId: null,
            activeMembership: null,
            accessibleOrganizations: [],
            activeSubgroup: null,
            accessibleSubgroups: [],
            capabilities: isSuper
              ? getMembershipCapabilities(null, true)
              : defaultCapabilities,
            isLoading: false,
            isInitialized: true,
            _lastLoadedUserId: userId,
          });
          return;
        }

        // Resolve active organization
        const preferredOrgId = getStoredOrgId(userId);
        let targetOrg =
          accessibleOrgs.find((o) => o.id === preferredOrgId) || accessibleOrgs[0];

        // Resolve membership for active organization
        const activeMembership =
          memberships.find((m) => m.organizationId === targetOrg.id) || null;

        const capabilities = getMembershipCapabilities(activeMembership, isSuper);
        const accessibleSubgroups = targetOrg.subgroups || [];

        setStoredOrgId(userId, targetOrg.id);
        apiClient.setActiveScope({
          zoneId: targetOrg.id,
          churchId: null,
          scope: 'zone',
        });

        set({
          activeOrganization: targetOrg,
          activeOrganizationId: targetOrg.id,
          activeMembership,
          accessibleOrganizations: accessibleOrgs,
          activeSubgroup: null,
          accessibleSubgroups,
          capabilities,
          isLoading: false,
          isInitialized: true,
          _lastLoadedUserId: userId,
        });
      } catch (err) {
        console.error('[OrganizationStore] Failed to load organizations:', err);
        set({ isLoading: false, isInitialized: true });
      } finally {
        _isFetchingOrgs = false;
      }
    },

    switchOrganization: async (organizationId: string) => {
      const { accessibleOrganizations, userMemberships, isSuperAdmin, _lastLoadedUserId } =
        get();
      const targetOrg = accessibleOrganizations.find((o) => o.id === organizationId);
      if (!targetOrg) {
        console.warn(
          `[OrganizationStore] Target organization ${organizationId} not in accessible organizations`
        );
        return false;
      }

      const activeMembership =
        userMemberships.find((m) => m.organizationId === targetOrg.id) || null;
      const capabilities = getMembershipCapabilities(activeMembership, isSuperAdmin);
      const accessibleSubgroups = targetOrg.subgroups || [];

      setStoredOrgId(_lastLoadedUserId, targetOrg.id);
      apiClient.setActiveScope({
        zoneId: targetOrg.id,
        churchId: null,
        scope: 'zone',
      });

      set({
        activeOrganization: targetOrg,
        activeOrganizationId: targetOrg.id,
        activeMembership,
        activeSubgroup: null,
        accessibleSubgroups,
        capabilities,
      });

      // Notify window / listeners of tenant switch to clear stale views
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lwsrh:organization-changed', {
            detail: { organizationId: targetOrg.id },
          })
        );
      }

      return true;
    },

    switchSubgroup: (subgroupId: string | null) => {
      const { activeOrganization, accessibleSubgroups } = get();
      if (!activeOrganization) return;

      const targetSubgroup = subgroupId
        ? accessibleSubgroups.find((s) => s.id === subgroupId) || null
        : null;

      apiClient.setActiveScope({
        zoneId: activeOrganization.id,
        churchId: targetSubgroup?.id || null,
        scope: targetSubgroup ? 'church' : 'zone',
      });

      set({ activeSubgroup: targetSubgroup });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('lwsrh:subgroup-changed', {
            detail: { subgroupId: targetSubgroup?.id || null },
          })
        );
      }
    },

    refreshOrganizations: async () => {
      const { _lastLoadedUserId, userMemberships, isSuperAdmin } = get();
      if (!_lastLoadedUserId) return;
      await get().loadOrganizations(_lastLoadedUserId, userMemberships, '', isSuperAdmin);
    },

    createOrganization: async (payload) => {
      try {
        const res = await apiClient.post<{ success: boolean; data: Organization }>(
          '/organizations',
          payload
        );
        if (res.success && res.data) {
          await get().refreshOrganizations();
          return { success: true, data: res.data };
        }
        return { success: false, error: 'Failed to create organization' };
      } catch (err: any) {
        return { success: false, error: err.message || 'Error creating organization' };
      }
    },
  }))
);

// Backward-compatible hook alias for existing components
export function useOrganization() {
  return useOrganizationStore();
}
