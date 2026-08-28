"use client";

/**
 * ZONE STORE — Single Source of Truth for Zone State
 * Synchronized with rehearsalhubv2 useUser.tsx zone and group membership management
 */

import { create } from 'zustand'
import { persist, createJSONStorage, subscribeWithSelector } from 'zustand/middleware'
import { ZONES, Zone, isSuperAdmin, isHQGroup, getZoneByInvitationCode } from '@/config/zones'
import { UserRole, hasPermission as checkPermission } from '@/config/roles'
import { apiClient } from '@/lib/api-client'
import { useAuthStore } from './authStore'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ZoneState {
  // Data
  currentZone: Zone | null
  userZones: Zone[]
  userRole: UserRole
  currentZoneMembership: any
  isSuperAdmin: boolean

  // Loading
  isLoading: boolean
  isInitialized: boolean
  _lastLoadedUserId: string | null

  // Actions
  loadUserZones: (userId: string, email: string) => Promise<void>
  switchZone: (zoneId: string, userId: string, email: string) => Promise<boolean>
  joinZone: (code: string) => Promise<{ success: boolean; message: string }>
  refreshZones: (userId: string, email: string) => Promise<void>
  clearZoneState: () => void
  hasPermission: (permission: string) => boolean
}

// ─── localStorage zone preference (per user) ─────────────────────────────────

function getUserZonePrefKey(userId: string) {
  return `lwsrh-user-zone-${userId}`
}

function getUserZonePref(userId?: string | null): string | null {
  if (typeof window === 'undefined') return null
  try {
    if (userId) {
      const userVal = localStorage.getItem(getUserZonePrefKey(userId))
      if (userVal) return userVal
    }
    const globalVal = localStorage.getItem('lwsrh_active_zone_id')
    if (globalVal) return globalVal
    const adminVal = sessionStorage.getItem('admin_selected_zone_id')
    if (adminVal && adminVal !== 'all') return adminVal
    return null
  } catch {
    return null
  }
}

function setUserZonePref(userId: string | null | undefined, zoneId: string) {
  if (typeof window === 'undefined') return
  try {
    if (userId) {
      localStorage.setItem(getUserZonePrefKey(userId), zoneId)
    }
    localStorage.setItem('lwsrh_active_zone_id', zoneId)
    sessionStorage.setItem('admin_selected_zone_id', zoneId)
  } catch {}
}

// ─── In-flight dedup guard ────────────────────────────────────────────────────
let _isFetchingZones = false

// ─── Store ───────────────────────────────────────────────────────────────────

export const useZoneStore = create<ZoneState>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // Initial state
        currentZone: null,
        userZones: [],
        userRole: 'zone_member',
        currentZoneMembership: null,
        isSuperAdmin: false,
        isLoading: true,
        isInitialized: false,
        _lastLoadedUserId: null,

        // ── hasPermission ─────────────────────────────────────────────────────
        hasPermission: (permission: string) =>
          checkPermission(get().userRole, permission as any),

        // ── clearZoneState ────────────────────────────────────────────────────
        clearZoneState: () => {
          set({
            currentZone: null,
            userZones: [],
            userRole: 'zone_member',
            currentZoneMembership: null,
            isSuperAdmin: false,
            isLoading: false,
            isInitialized: false,
            _lastLoadedUserId: null,
          })
        },

        // ── loadUserZones ─────────────────────────────────────────────────────
        loadUserZones: async (userId: string, email: string) => {
          const { _lastLoadedUserId, userZones, isInitialized } = get()

          if (_lastLoadedUserId === userId && userZones.length > 0 && isInitialized && get().currentZone) {
            return
          }

          if (_isFetchingZones) return
          _isFetchingZones = true

          set({ isLoading: true })

          const savedZoneId = getUserZonePref(userId) || get().currentZone?.id

          try {
            const profile = useAuthStore.getState().profile
            const isSuper = profile?.role === 'super_admin' || profile?.role === 'boss' || isSuperAdmin(email, userId)

            // Dynamically fetch database organizations
            const dbOrgsRes = await apiClient.get<{ success: boolean; data: any[] }>('/organizations')
              .catch(() => apiClient.get<{ success: boolean; data: any[] }>('/zones').catch(() => ({ success: false, data: [] })));
            const allDbOrgs: any[] = Array.isArray(dbOrgsRes?.data) ? dbOrgsRes.data : [];

            if (isSuper) {
              const targetZone = (savedZoneId ? allDbOrgs.find((z) => z.id === savedZoneId || z.invitationCode === savedZoneId) : null) || allDbOrgs[0] || null;

              set({
                currentZone: targetZone,
                userZones: allDbOrgs,
                userRole: 'super_admin',
                isSuperAdmin: true,
                isLoading: false,
                isInitialized: true,
                _lastLoadedUserId: userId,
              });
              return;
            }

            // Fetch zone memberships from /members/mine or /auth/me
            const res = await apiClient.get<{ success: boolean; data?: { zoneMembers?: any[]; hqMembers?: any[]; memberships?: any[] } }>('/members/mine')
              .catch(() => apiClient.get<{ success: boolean; data?: any }>('/auth/me').catch(() => ({ success: false, data: null })));
            
            let allMemberships: any[] = [];
            if (res.success && res.data) {
              if (Array.isArray(res.data.memberships)) {
                allMemberships = res.data.memberships;
              } else {
                allMemberships = [
                  ...(res.data.zoneMembers || []),
                  ...(res.data.hqMembers || [])
                ];
              }
            }

            const zones: any[] = [];
            for (const mem of allMemberships) {
              const zId = mem.organizationId || mem.zoneId || mem.hqGroupId;
              if (zId) {
                const dbOrg = allDbOrgs.find(z => z.id === zId || z.invitationCode === zId || z.code === zId);
                const zoneObj = dbOrg || (mem.organization ? { ...mem.organization } : null);
                if (zoneObj && !zones.some(z => z.id === zoneObj.id)) {
                  zones.push({
                    ...zoneObj,
                    membershipId: mem.id,
                    role: mem.role || 'member'
                  });
                }
              }
            }

            // NO SILENT DEFAULT: If user has 0 memberships, resolve to null
            const targetZone = (savedZoneId
              ? zones.find((z) => z.id === savedZoneId || z.invitationCode === savedZoneId)
              : null) || (zones.length > 0 ? zones[0] : null);

            const targetMembership = allMemberships.find(
              (m: any) => m.zoneId === targetZone?.id || m.hqGroupId === targetZone?.id
            )

            let role: UserRole = 'zone_member'
            const profileRole = String(profile?.role || '').toLowerCase()
            const membershipRole = String(targetMembership?.role || '').toLowerCase()
            if (profileRole === 'super_admin' || profileRole === 'boss') {
              role = 'super_admin'
            } else if (profileRole === 'hq_admin' || profile?.hasHqAccess === true || (profile as any)?.has_hq_access === true) {
              role = 'hq_admin'
            } else if (
              profileRole === 'zone_coordinator' ||
              profileRole === 'zone_admin' ||
              profileRole === 'coordinator' ||
              profileRole === 'church_coordinator' ||
              profileRole === 'subgroup_admin' ||
              profileRole === 'subgroup_coordinator' ||
              membershipRole === 'coordinator' ||
              membershipRole === 'admin' ||
              membershipRole === 'zone_admin' ||
              membershipRole === 'zone_coordinator'
            ) {
              role = 'zone_coordinator'
            } else if (targetZone && isHQGroup(targetZone.id)) {
              role = 'hq_member'
            }

            set({
              currentZone: targetZone || null,
              userZones: zones,
              userRole: role,
              currentZoneMembership: targetMembership || null,
              isSuperAdmin: false,
              isLoading: false,
              isInitialized: true,
              _lastLoadedUserId: userId,
            })
          } catch (error) {
            console.error('[ZoneStore] Error loading zones:', error)
            const fallbackZone = ZONES[0]
            set({
              currentZone: fallbackZone,
              userZones: [fallbackZone],
              userRole: 'zone_member',
              isLoading: false,
              isInitialized: true,
              _lastLoadedUserId: userId,
            })
          } finally {
            _isFetchingZones = false
          }
        },

        // ── switchZone ────────────────────────────────────────────────────────
        switchZone: async (zoneId: string, userId?: string, email?: string) => {
          const authState = useAuthStore.getState()
          const uId = userId || authState.user?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '')
          const uEmail = email || authState.user?.email || ''

          const { userZones } = get()
          const zone = ZONES.find((z) => z.id === zoneId || z.invitationCode === zoneId || z.slug === zoneId) || userZones.find((z) => z.id === zoneId)
          if (!zone) return false

          set({ currentZone: zone })
          setUserZonePref(uId, zone.id)

          try {
            if (uId && zone.invitationCode) {
              await apiClient.patch(`/profiles/${uId}`, { zone_code: zone.invitationCode }).catch(() => {})
            }
          } catch {}

          try {
            const res = await apiClient.get<{ success: boolean; data?: { zoneMembers?: any[]; hqMembers?: any[] } }>('/members/mine')
            const allMemberships = [
              ...(res?.data?.zoneMembers || []),
              ...(res?.data?.hqMembers || [])
            ]
            const membership = allMemberships.find((m: any) => m.zoneId === zone.id || m.hqGroupId === zone.id)

            let role: UserRole = 'zone_member'
            const profRole = String(authState.profile?.role || '').toLowerCase()
            if (profRole === 'hq_admin' || profRole === 'super_admin' || profRole === 'boss' || authState.profile?.hasHqAccess === true || (authState.profile as any)?.has_hq_access === true) {
              role = 'hq_admin'
            } else if (membership?.role === 'coordinator' || profRole === 'zone_coordinator' || profRole === 'zone_admin') {
              role = 'zone_coordinator'
            } else if (isHQGroup(zone.id)) {
              role = 'hq_member'
            }

            set({ currentZoneMembership: membership || null, userRole: role })
          } catch (error) {
            console.error('[ZoneStore] switchZone membership fetch failed:', error)
          }

          return true
        },

        // ── joinZone (mirrors rehearsalhubv2 joinZone) ────────────────────────
        joinZone: async (code: string) => {
          const authState = useAuthStore.getState()
          const userId = authState.user?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '')
          if (!userId) return { success: false, message: 'Not logged in' }

          try {
            const cleanCode = code.trim().toUpperCase()
            const zone = getZoneByInvitationCode(cleanCode) || ZONES.find(z => z.invitationCode.toUpperCase() === cleanCode || z.id.toUpperCase() === cleanCode)
            if (!zone) return { success: false, message: 'Invalid invitation code.' }

            const { userZones, refreshZones, switchZone } = get()
            if (userZones.some(z => z.id === zone.id)) {
              await switchZone(zone.id, userId, authState.user?.email || '')
              return { success: true, message: `Switched to ${zone.name}.` }
            }

            const profile = authState.profile
            const userName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Member' : 'Member'
            const userEmail = profile?.email || authState.user?.email || ''
            const isHQ = isHQGroup(zone.id)

            await apiClient.post('/members/zone-join', {
              zone_id: zone.id,
              is_hq: isHQ,
              user_email: userEmail,
              user_name: userName,
            })

            await refreshZones(userId, userEmail)
            await switchZone(zone.id, userId, userEmail)
            return { success: true, message: `Welcome to ${zone.name}!` }
          } catch (e) {
            console.error('[ZoneStore] Failed to join zone:', e)
            return { success: false, message: 'Failed to join zone. Please check the code.' }
          }
        },

        // ── refreshZones (force re-fetch) ─────────────────────────────────────
        refreshZones: async (userId: string, email: string) => {
          set({ _lastLoadedUserId: null })
          await get().loadUserZones(userId, email)
        },
      }),
      {
        name: 'lwsrh-zone-store-v4',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          currentZone: state.currentZone,
          userZones: state.userZones.slice(0, 20),
          userRole: state.userRole,
          isSuperAdmin: state.isSuperAdmin,
          _lastLoadedUserId: state._lastLoadedUserId,
        }),
      }
    )
  )
)

// ─── Typed selectors (prevent unnecessary re-renders) ────────────────────────

export const selectCurrentZone = (s: ZoneState) => s.currentZone
export const selectUserZones = (s: ZoneState) => s.userZones
export const selectUserRole = (s: ZoneState) => s.userRole
export const selectZoneLoading = (s: ZoneState) => s.isLoading
export const selectIsSuperAdmin = (s: ZoneState) => s.isSuperAdmin
export const selectZoneInitialized = (s: ZoneState) => s.isInitialized

// ─── Convenience hook (drop-in replacement for useZone) ──────────────────────
export function useZone() {
  const currentZone = useZoneStore(selectCurrentZone)
  const userZones = useZoneStore(selectUserZones)
  const userRole = useZoneStore(selectUserRole)
  const isLoading = useZoneStore(selectZoneLoading)
  const isSuperAdminUser = useZoneStore(selectIsSuperAdmin)
  const isInitialized = useZoneStore(selectZoneInitialized)
  const currentZoneMembership = useZoneStore((s) => s.currentZoneMembership)
  const storeSwitchZone = useZoneStore((s) => s.switchZone)
  const storeJoinZone = useZoneStore((s) => s.joinZone)
  const storeRefreshZones = useZoneStore((s) => s.refreshZones)

  const switchZone = async (zoneId: string, userId?: string, email?: string) => {
    const authState = useAuthStore.getState()
    const uId = userId || authState.user?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '')
    const uEmail = email || authState.user?.email || ''
    return storeSwitchZone(zoneId, uId, uEmail)
  }

  const joinZone = async (code: string) => {
    return storeJoinZone(code)
  }

  const refreshZones = async (userId?: string, email?: string) => {
    const authState = useAuthStore.getState()
    const uId = userId || authState.user?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '')
    const uEmail = email || authState.user?.email || ''
    return storeRefreshZones(uId, uEmail)
  }

  return {
    currentZone,
    userZones,
    userRole,
    currentZoneMembership,
    isSuperAdmin: isSuperAdminUser,
    isZoneCoordinator: userRole === 'zone_coordinator' || userRole === 'super_admin' || userRole === 'hq_admin',
    isHQAdmin: userRole === 'hq_admin' || userRole === 'super_admin',
    isLoading: isLoading && !currentZone,
    isInitialized,
    switchZone,
    joinZone,
    refreshZones,
  }
}
