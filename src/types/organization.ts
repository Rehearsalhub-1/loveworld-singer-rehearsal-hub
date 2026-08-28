/**
 * CANONICAL MULTI-TENANT TYPES
 * Model: PLATFORM -> ORGANIZATION -> MEMBERSHIP -> optional SUBGROUP -> DATA
 * Rule: PERMISSION = USER + MEMBERSHIP + SCOPE
 */

export interface Organization {
  id: string;
  name: string;
  code?: string | null;
  country?: string | null;
  region?: string | null;
  isHq?: boolean;
  invitationCode?: string | null;
  isActive?: boolean;
  themeColor?: string;
  subgroups?: Subgroup[];
  [key: string]: any;
}

export interface Subgroup {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  type?: string | null;
  status?: string | null;
  memberCount?: number;
  [key: string]: any;
}

export type CanonicalRole =
  | 'PLATFORM_ADMIN'
  | 'ORGANIZATION_ADMIN'
  | 'SUBGROUP_ADMIN'
  | 'MEMBER'
  | 'GUEST';

export interface Membership {
  id: string;
  userId: string;
  organizationId: string;
  subgroupId: string | null;
  role: string;
  status: string;
  hasHqAccess: boolean;
  organization: Organization;
  subgroup?: Subgroup | null;
}

export interface OrganizationCapabilities {
  canManagePlatform: boolean;
  canManageOrganization: boolean;
  canManageSubgroup: boolean;
  canManageMembers: boolean;
  canManageSongs: boolean;
  canManagePrograms: boolean;
  canBroadcast: boolean;
  canManageMedia: boolean;
}

/**
 * Normalizes any legacy or canonical role string into standard capabilities
 * based strictly on the active Membership and scope.
 */
export function getMembershipCapabilities(
  membership: Membership | null | undefined,
  isPlatformSuperAdmin = false
): OrganizationCapabilities {
  if (isPlatformSuperAdmin) {
    return {
      canManagePlatform: true,
      canManageOrganization: true,
      canManageSubgroup: true,
      canManageMembers: true,
      canManageSongs: true,
      canManagePrograms: true,
      canBroadcast: true,
      canManageMedia: true,
    };
  }

  if (!membership) {
    return {
      canManagePlatform: false,
      canManageOrganization: false,
      canManageSubgroup: false,
      canManageMembers: false,
      canManageSongs: false,
      canManagePrograms: false,
      canBroadcast: false,
      canManageMedia: false,
    };
  }

  const rawRole = String(membership.role || '').toUpperCase();
  const isOrgAdmin =
    rawRole === 'ORGANIZATION_ADMIN' ||
    rawRole === 'ORG_ADMIN' ||
    rawRole === 'HQ_ADMIN' ||
    rawRole === 'ZONE_ADMIN' ||
    rawRole === 'ADMIN' ||
    rawRole === 'SUPER_ADMIN' ||
    rawRole === 'BOSS' ||
    membership.hasHqAccess === true;

  const isSubgroupAdmin =
    isOrgAdmin ||
    rawRole === 'SUBGROUP_ADMIN' ||
    rawRole === 'CHURCH_ADMIN' ||
    rawRole === 'COORDINATOR' ||
    rawRole === 'ZONE_COORDINATOR';

  return {
    canManagePlatform: false,
    canManageOrganization: isOrgAdmin,
    canManageSubgroup: isSubgroupAdmin,
    canManageMembers: isOrgAdmin || isSubgroupAdmin,
    canManageSongs: isOrgAdmin || isSubgroupAdmin,
    canManagePrograms: isOrgAdmin,
    canBroadcast: isOrgAdmin,
    canManageMedia: isOrgAdmin || isSubgroupAdmin,
  };
}
