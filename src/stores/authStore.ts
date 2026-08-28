"use client";

/**
 * AUTH STORE — Single Source of Truth for Authentication
 * Synchronized with rehearsalhubv2 profile parser and payload structure
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { apiClient, clearAccessToken, SessionExpiredError } from '@/lib/api-client'
import { useOrganizationStore } from './organizationStore'
import type { UserProfile } from '@/types/supabase'

// ─── Profile Parser (matches rehearsalhubv2 useUser.tsx) ────────────────────

export function parseProfile(uid: string, rawInput: Record<string, any>): UserProfile {
  if (!rawInput) {
    return {
      id: uid,
      uid,
      email: '',
      role: 'member',
      profile_completed: false,
      email_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as UserProfile;
  }

  let rawData = rawInput.rawData || rawInput.raw_data || {};
  if (typeof rawData === 'string') {
    try { rawData = JSON.parse(rawData); } catch (e) {}
  }
  const d = { ...rawInput, ...rawData };

  const firstName = d.firstName || d.first_name || '';
  const lastName = d.lastName || d.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim() || d.displayName || d.display_name || d.name || 'Member';
  const avatar = d.profile_image_url || d.avatar_url || d.photoURL || d.avatar || d.avatarUrl || '';
  const zoneCode = d.zone_code || d.zoneCode || d.zone || '';

  return {
    ...d,
    id: uid,
    uid,
    firstName,
    first_name: firstName,
    middleName: d.middle_name || d.middleName || '',
    middle_name: d.middle_name || d.middleName || '',
    lastName,
    last_name: lastName,
    fullName,
    display_name: fullName,
    displayName: fullName,
    email: d.email || '',
    username: d.username || d.user_name || d.alias || '',
    alias: d.alias || d.username || '',
    phoneNumber: d.phone_number || d.phoneNumber || '',
    phone_number: d.phone_number || d.phoneNumber || '',
    gender: d.gender || '',
    birthday: d.birthday || '',
    region: d.region || '',
    zoneCode,
    zone_code: zoneCode,
    zone: zoneCode,
    church: d.church || '',
    kingschatId: d.kingschat_id || d.kingschatId || '',
    designation: d.designation || '',
    administration: d.administration || '',
    avatar,
    avatar_url: avatar,
    profile_image_url: avatar,
    photoURL: avatar,
    role: d.role || 'member',
    hasHqAccess: !!(d.has_hq_access || d.hasHqAccess),
    has_hq_access: !!(d.has_hq_access || d.hasHqAccess),
    rehearsalCount: d.rehearsalCount || 0,
    expoPushToken: d.expoPushToken || d.expo_push_token || '',
    created_at: d.created_at || d.createdAt || new Date().toISOString(),
    updated_at: d.updated_at || d.updatedAt || new Date().toISOString(),
    profile_completed: true,
    email_verified: true,
    raw: rawInput,
  } as UserProfile;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthState {
  // Core state
  user: { id: string; uid?: string; email: string; role: string; zoneId: string | null; firstName?: string | null; lastName?: string | null; [key: string]: any } | null
  profile: UserProfile | null
  loading: boolean
  backendOffline: boolean
  isInitialized: boolean

  // Internal plumbing
  _presenceInterval: ReturnType<typeof setInterval> | null
  _authUnsubscribe: (() => void) | null

  // Actions
  setUser: (user: { id: string; uid?: string; email: string; role: string; zoneId: string | null; [key: string]: any } | null) => void
  setProfile: (profile: UserProfile | null) => void
  setLoading: (loading: boolean) => void
  setBackendOffline: (offline: boolean) => void

  // Public methods
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  initialize: () => void
  cleanup: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function setSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax'
}

function clearSessionCookie() {
  if (typeof document === 'undefined') return
  document.cookie = 'lwsrh_is_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
}

// Profile caching
let _profileCacheUserId: string | null = null
let _profileCacheData: UserProfile | null = null
let _profileCacheTime = 0
const PROFILE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function getCachedProfile(userId: string): UserProfile | null {
  if (
    _profileCacheUserId === userId &&
    _profileCacheData &&
    Date.now() - _profileCacheTime < PROFILE_CACHE_TTL
  ) {
    return _profileCacheData
  }
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`user_profile_cache_${userId}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        _profileCacheUserId = userId;
        _profileCacheData = parsed;
        _profileCacheTime = Date.now();
        return parsed;
      }
    } catch {}
  }
  return null
}

function setCachedProfile(userId: string, profile: UserProfile) {
  _profileCacheUserId = userId
  _profileCacheData = profile
  _profileCacheTime = Date.now()
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(`user_profile_cache_${userId}`, JSON.stringify(profile));
    } catch {}
  }
}

function clearProfileCache() {
  _profileCacheUserId = null
  _profileCacheData = null
  _profileCacheTime = 0
  if (typeof window !== 'undefined') {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith('user_profile_cache_'));
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    user: null,
    profile: null,
    loading: true,
    backendOffline: false,
    isInitialized: false,
    _presenceInterval: null,
    _authUnsubscribe: null,

    setUser: (user) => set({ user: user ? { ...user, uid: user.uid || user.id } : null }),
    setProfile: (profile) => set({ profile }),
    setLoading: (loading) => set({ loading }),
    setBackendOffline: (backendOffline) => set({ backendOffline }),

    // ── Sign Out ─────────────────────────────────────────────────────────────
    signOut: async () => {
      const { _presenceInterval } = get()

      if (_presenceInterval) {
        clearInterval(_presenceInterval)
      }

      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem('isLoggingOut', 'true')
          localStorage.setItem('logging_out', 'true')
        }

        try {
          await apiClient.post('/auth/logout', {}).catch(() => {})
        } catch {}

        clearAccessToken()
        clearProfileCache()
        useOrganizationStore.getState().clearOrganizationState()

        if (typeof window !== 'undefined') {
          const preservedKeys = [
            'lwsrh-zone-store-v4',
            'lwsrh-subscription-cache-v1',
            'lwsrh_device_id',
            'lwsrh_is_exempt'
          ]
          const preservedData: Record<string, string> = {}
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key) {
              if (
                preservedKeys.includes(key) ||
                key.startsWith('lwsrh-user-zone') ||
                key.startsWith('offline_') ||
                key.startsWith('lwsrh_perf_')
              ) {
                preservedData[key] = localStorage.getItem(key) || ''
              }
            }
          }
          localStorage.clear()
          sessionStorage.clear()
          Object.entries(preservedData).forEach(([k, v]) => {
            localStorage.setItem(k, v)
          })
        }
        clearSessionCookie()

        set({
          user: null,
          profile: null,
          _presenceInterval: null,
          backendOffline: false,
        })

        window.location.replace('/auth')
      } catch (error) {
        console.error('[AuthStore] Sign out error:', error)
        window.location.replace('/auth')
      }
    },

    // ── Refresh Profile ───────────────────────────────────────────────────────
    refreshProfile: async () => {
      const { user } = get()
      const userId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('userId') : null)
      if (!userId) return

      try {
        const result = await apiClient.get<{ success: boolean; data?: any }>(`/profiles/${userId}`)
        if (result.success && result.data) {
          const parsed = parseProfile(userId, result.data)
          setCachedProfile(userId, parsed)
          set({ profile: parsed })
        }
      } catch (err) {
        console.error('[AuthStore] refreshProfile failed:', err)
      }
    },

    // ── Cleanup ───────────────────────────────────────────────────────────────
    cleanup: () => {
      const { _presenceInterval, _authUnsubscribe } = get()
      if (_presenceInterval) clearInterval(_presenceInterval)
      if (_authUnsubscribe) _authUnsubscribe()
      set({ _presenceInterval: null, _authUnsubscribe: null })
    },

    // ── Initialize (call once at app boot) ────────────────────────────────────
    initialize: () => {
      const { isInitialized } = get()
      const hasJwt = typeof window !== 'undefined' && (
        localStorage.getItem('jwt') ||
        sessionStorage.getItem('jwt') ||
        localStorage.getItem('refreshToken') ||
        sessionStorage.getItem('refreshToken') ||
        localStorage.getItem('userId') ||
        document.cookie.includes('lwsrh_jwt') ||
        document.cookie.includes('lwsrh_is_logged_in=true') ||
        localStorage.getItem('lwsrh_has_user') === 'true'
      );

      if (!hasJwt) {
        set({ isInitialized: true, user: null, profile: null, loading: false, backendOffline: false });
        return;
      }

      // Early hydration from storage
      if (typeof window !== 'undefined') {
        const storedUserId = localStorage.getItem('userId');
        if (storedUserId) {
          const cachedProfile = getCachedProfile(storedUserId);
          if (cachedProfile) {
            set({
              user: { id: storedUserId, email: cachedProfile.email || '', role: cachedProfile.role || 'member', zoneId: cachedProfile.zoneCode || null },
              profile: cachedProfile,
              loading: false,
            });
          }
        }
      }

      set({ isInitialized: true });

      // Fetch current user and memberships from API
      apiClient.get<{
        success: boolean;
        data?: {
          id: string;
          email: string;
          role: string;
          zoneId: string | null;
          firstName?: string;
          lastName?: string;
          memberships?: any[];
        };
      }>('/auth/me')
        .then(async (result) => {
          if (!result.success || !result.data) {
            clearProfileCache();
            useOrganizationStore.getState().clearOrganizationState();
            set({ user: null, profile: null, loading: false, backendOffline: false });
            return;
          }

          const apiUser = result.data;
          set({ user: apiUser });
          if (apiUser.id) {
            apiClient.setUserId(apiUser.id);
          }

          let userProfile: UserProfile | null = getCachedProfile(apiUser.id);
          try {
            const profileResult = await apiClient.get<{ success: boolean; data?: any }>(`/profiles/${apiUser.id}`);
            if (profileResult.success && profileResult.data) {
              userProfile = parseProfile(apiUser.id, profileResult.data);
              setCachedProfile(apiUser.id, userProfile);
            }
          } catch (pErr) {
            console.warn('[AuthStore] Failed to fetch full profile:', pErr);
          }

          if (!userProfile) {
            userProfile = parseProfile(apiUser.id, {
              id: apiUser.id,
              email: apiUser.email,
              role: apiUser.role,
              firstName: apiUser.firstName,
              lastName: apiUser.lastName,
            });
          }

          set({ profile: userProfile, backendOffline: false });

          // Load Organization and Membership context
          const memberships = Array.isArray(apiUser.memberships) ? apiUser.memberships : [];
          const isSuper = userProfile.role === 'super_admin' || userProfile.role === 'boss';
          useOrganizationStore.getState().loadOrganizations(apiUser.id, memberships, apiUser.email, isSuper);

          if (typeof window !== 'undefined') {
            localStorage.setItem('lwsrh_has_user', 'true');
            setSessionCookie();
          }
        })
        .catch((err) => {
          clearProfileCache();
          if (err instanceof SessionExpiredError || (err as any)?.status === 401 || (err as any)?.status === 403) {
            set({ user: null, profile: null, loading: false, backendOffline: false });
          } else {
            console.warn('[AuthStore] API check error:', err);
            set({ user: null, profile: null, loading: false, backendOffline: false });
          }
        })
        .finally(() => {
          set({ loading: false });
        });
    },
  }))
)

// ─── Typed selectors (prevent unnecessary re-renders) ────────────────────────

export const selectUser = (s: AuthState) => s.user
export const selectProfile = (s: AuthState) => s.profile
export const selectAuthLoading = (s: AuthState) => s.loading
export const selectBackendOffline = (s: AuthState) => s.backendOffline
export const selectSignOut = (s: AuthState) => s.signOut
export const selectRefreshProfile = (s: AuthState) => s.refreshProfile

// ─── Convenience hook (drop-in replacement for useAuth) ──────────────────────
export function useAuth() {
  const user = useAuthStore(selectUser)
  const profile = useAuthStore(selectProfile)
  const loading = useAuthStore(selectAuthLoading)
  const signOut = useAuthStore(selectSignOut)
  const refreshProfile = useAuthStore(selectRefreshProfile)
  const backendOffline = useAuthStore(selectBackendOffline)

  return {
    user,
    profile,
    isLoading: loading && !user,
    isProfileLoading: false,
    loading,
    signOut,
    refreshProfile,
    backendOffline,
    initialLoadComplete: !loading,
  }
}
