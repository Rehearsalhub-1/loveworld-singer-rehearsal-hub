// Zone utilities — data lives in the DB (zones table via API /organizations)
// This file only contains type definitions and runtime utility functions.
// DO NOT add hardcoded zone arrays here. All zone data comes from the API.

export type ZoneType = 'hq_group' | 'regional_zone';

export interface StreamConfig {
  id: string;
  name: string;
  publicId: string;
  playerLink: string;
}

export interface Zone {
  id: string;
  name: string;
  slug?: string;
  region?: string;
  code?: string;
  invitationCode?: string;
  themeColor?: string;
  type?: ZoneType;
  isHq?: boolean;
  streams?: StreamConfig[];
}

// Known HQ group IDs — used as a fallback when isHq field is not available from DB.
// Source of truth is the zones table (is_hq column). Do not extend this list — add via DB.
const KNOWN_HQ_IDS = new Set([
  'zone-001', 'zone-002', 'zone-003', 'zone-004', 'zone-005',
  'zone-orchestra', 'zone-president', 'zone-president-2',
  'zone-director', 'zone-oftp', 'zone-oftd',
  'zone-national', 'zone-international', 'zone-sa-1', 'zone-boss',
  'loveworld-singers-hq', 'hq',
]);

/**
 * Returns true if the given zone ID is an HQ group.
 * Prefers the `isHq` field from the DB record when available.
 */
export function isHQGroup(zoneId: string | undefined, isHqFromDb?: boolean): boolean {
  if (!zoneId) return false;
  if (isHqFromDb === true) return true;
  if (isHqFromDb === false) return false;
  const clean = zoneId.toLowerCase().trim();
  return KNOWN_HQ_IDS.has(zoneId) || KNOWN_HQ_IDS.has(clean) || clean === 'hq';
}

export function isCoordinatorCode(code: string): boolean {
  return code.startsWith('ZNL');
}

export function isBossCode(code: string): boolean {
  return code === 'BOSS101';
}

export function getZoneRole(code: string): 'coordinator' | 'member' | 'boss' {
  if (code === 'BOSS101') return 'boss';
  return code.startsWith('ZNL') ? 'coordinator' : 'member';
}

export function isSuperAdmin(email: string | null | undefined, uid: string | null | undefined): boolean {
  if (!email && !uid) return false;
  if (email === 'superadmin@lwsrh.com') return true;
  if (uid === 'super-admin-bypass') return true;
  return false;
}

export const BOSS_ZONE_ID = 'zone-boss';
export const SUPER_ADMIN_EMAIL = 'superadmin@lwsrh.com';
export const SUPER_ADMIN_UID = 'super-admin-bypass';

export function hasBossAccess(role: string | undefined, zoneId: string | undefined): boolean {
  return isHQGroup(zoneId) || role === 'admin' || role === 'boss';
}

// Legacy utility functions — kept for backward compat, logic no longer relies on hardcoded array
export function bypassesFeatureGates(zoneId: string | undefined): boolean {
  return isHQGroup(zoneId) || zoneId === 'zone-088';
}

export function requiresSubscription(zoneId: string | undefined): boolean {
  return !bypassesFeatureGates(zoneId);
}

export function isBossZone(zoneId: string | undefined): boolean {
  return isHQGroup(zoneId);
}

export function usesFirebaseDatabase(_zoneId: string | undefined): boolean {
  return false; // All data now comes from Prisma/Postgres
}

// getZoneById / getZoneBySlug / getZoneByInvitationCode — now resolve from DB.
// These stubs prevent import errors in components that haven't migrated yet.
// They return null; components should use the allZones state from the API instead.
export function getZoneById(_id: string | undefined): Zone | undefined {
  return undefined;
}

export function getZoneBySlug(_slug: string | undefined): Zone | undefined {
  return undefined;
}

export function getZoneByInvitationCode(_code: string | undefined): Zone | undefined {
  return undefined;
}

export function getHqGroups(): Zone[] {
  return [];
}

export function getRegionalZones(): Zone[] {
  return [];
}

// HQ_GROUP_IDS exported as a Set for backward compat (ActivityLogsPage uses it)
export const HQ_GROUP_IDS = new Set([
  'zone-001', 'zone-002', 'zone-003', 'zone-004', 'zone-005',
  'zone-orchestra', 'zone-president', 'zone-president-2',
  'zone-director', 'zone-oftp', 'zone-oftd',
  'zone-national', 'zone-international', 'zone-sa-1', 'zone-boss',
]);

// ZONES exported as empty array — components must use API data instead
export const ZONES: Zone[] = [];