// User Role Utilities
// Determines user permissions based on database profile fields and zone context

import type { UserProfile } from '@/types/supabase'

/**
 * Check if user is a Boss or Super Admin (has Boss/Admin status across all zones)
 */
export function isBoss(user: UserProfile | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  return role === 'boss' || role === 'super_admin' || user.hasHqAccess === true || (user as any).has_hq_access === true;
}

/**
 * Check if user is a Zone Leader / Coordinator
 */
export function isZoneLeader(user: UserProfile | null): boolean {
  if (!user) return false;
  const role = String(user.role || '').toLowerCase();
  const admin = String(user.administration || '').toLowerCase();
  return (
    role === 'zone_coordinator' ||
    role === 'zone_admin' ||
    role === 'coordinator' ||
    admin === 'coordinator' ||
    admin === 'zone leader'
  );
}

/**
 * Check if user can see upgrade prompts
 */
export function canSeeUpgradePrompts(user: UserProfile | null): boolean {
  return isZoneLeader(user);
}

/**
 * Check if user is a zone coordinator
 * Zone coordinators have administrative privileges within their zone
 */
export function isZoneCoordinator(user: UserProfile | null): boolean {
  return isZoneLeader(user);
}

/**
 * Check if user can manage zone subscription
 */
export function canManageZoneSubscription(user: UserProfile | null): boolean {
  return isZoneCoordinator(user) || isBoss(user);
}

/**
 * Get user display role for UI
 */
export function getUserDisplayRole(user: UserProfile | null): string {
  if (!user) return 'Guest';

  if (isBoss(user)) return 'Central Admin';
  if (isZoneLeader(user)) return 'Zone Coordinator';
  if (user.administration === 'Assistant Coordinator') return 'Assistant Coordinator';
  if (user.administration) return user.administration;
  if (user.role === 'admin' || user.role === 'hq_admin') return 'HQ Admin';

  return 'Member';
}

/**
 * Check if user has elevated permissions in zone
 */
export function hasZoneElevatedPermissions(user: UserProfile | null): boolean {
  return isZoneLeader(user) || isBoss(user);
}

/**
 * Get user permissions summary
 */
export function getUserPermissions(user: UserProfile | null) {
  return {
    isBoss: isBoss(user),
    isZoneLeader: isZoneLeader(user),
    isZoneCoordinator: isZoneCoordinator(user),
    canSeeUpgradePrompts: canSeeUpgradePrompts(user),
    canManageSubscription: canManageZoneSubscription(user),
    hasElevatedPermissions: hasZoneElevatedPermissions(user),
    displayRole: getUserDisplayRole(user)
  };
}