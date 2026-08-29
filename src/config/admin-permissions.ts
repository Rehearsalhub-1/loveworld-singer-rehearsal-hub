export type AdminRole =
  | 'super_admin'
  | 'admin'
  | 'hq_admin'
  | 'boss'
  | 'zone_admin'
  | 'zone_coordinator'
  | 'coordinator'
  | 'subgroup_admin'
  | 'subgroup_coordinator'
  | 'church_coordinator'
  | 'member'

export type AdminSection =
  | 'Dashboard'
  | 'Analytics'
  | 'Support Chat'
  | 'Pages'
  | 'Categories'
  | 'Page Categories'
  | 'Master Library'
  | 'Submitted Songs'
  | 'Schedule Manager'
  | 'Members'
  | 'Attendance'
  | 'Churches'
  | 'Media'
  | 'Playback Mode'
  | 'Calendar'
  | 'Notifications'
  | 'Payments'
  | 'Activity Logs'
  | 'App Updates'
  | 'Geofence Config'

export type AdminAction =
  | 'editMemberDetails'
  | 'manageMemberFeatures'

const ALL_SECTIONS: AdminSection[] = [
  'Dashboard', 'Analytics', 'Support Chat', 'Pages', 'Categories', 'Page Categories',
  'Master Library', 'Submitted Songs', 'Schedule Manager', 'Members', 'Attendance',
  'Churches', 'Media', 'Playback Mode', 'Calendar', 'Notifications', 'Payments',
  'Activity Logs', 'App Updates', 'Geofence Config',
]

const HQ_SECTIONS = new Set<AdminSection>([
  'Analytics', 'Support Chat', 'Master Library', 'Playback Mode', 'Calendar',
  'Notifications', 'Payments', 'Activity Logs', 'App Updates', 'Geofence Config',
])

const ZONE_SECTIONS = new Set<AdminSection>([
  'Dashboard', 'Pages', 'Categories', 'Page Categories', 'Submitted Songs',
  'Schedule Manager', 'Members', 'Attendance', 'Churches', 'Media',
])

export interface AdminPermissions {
  role: AdminRole
  isHQ: boolean
  canAccessAdmin: boolean
  canViewAllZones: boolean
  sections: ReadonlySet<AdminSection>
}

export function getAdminPermissions(
  roleValue: unknown,
  hasHqAccess = false,
  hiddenFeatures?: Record<string, boolean>,
): AdminPermissions {
  const role = String(roleValue || 'member').toLowerCase() as AdminRole
  const isHQ = hasHqAccess || role === 'super_admin' || role === 'admin' || role === 'hq_admin' || role === 'boss'
  const canAccessAdmin = isHQ || role === 'zone_admin' || role === 'zone_coordinator' || role === 'coordinator' ||
    role === 'subgroup_admin' || role === 'subgroup_coordinator' || role === 'church_coordinator'

  if (!canAccessAdmin) {
    return { role, isHQ: false, canAccessAdmin: false, canViewAllZones: false, sections: new Set() }
  }

  let baseSections = new Set<AdminSection>(isHQ ? ALL_SECTIONS : ZONE_SECTIONS);

  // Apply dynamic boolean feature filters if configured for this admin
  if (hiddenFeatures && role !== 'super_admin') {
    if (hiddenFeatures.hideAdmin_canManageMasterLibrary) {
      baseSections.delete('Master Library');
    }
    if (hiddenFeatures.hideAdmin_canManageMedia) {
      baseSections.delete('Media');
    }
    if (hiddenFeatures.hideAdmin_canManageSchedules) {
      baseSections.delete('Schedule Manager');
    }
    if (hiddenFeatures.hideAdmin_canManageMembers) {
      baseSections.delete('Members');
    }
    if (hiddenFeatures.hideAdmin_canManageAttendance) {
      baseSections.delete('Attendance');
    }
  }

  return { role, isHQ, canAccessAdmin: true, canViewAllZones: isHQ, sections: baseSections }
}

export function canAccessAdminSection(
  permissions: AdminPermissions,
  section: string,
): boolean {
  return permissions.sections.has(section as AdminSection)
}

export function canPerformAdminAction(
  permissions: AdminPermissions,
  action: AdminAction,
): boolean {
  if (!permissions.canAccessAdmin || permissions.role === 'boss') return false

  if (action === 'editMemberDetails' || action === 'manageMemberFeatures') {
    return (
      permissions.role === 'super_admin' ||
      permissions.role === 'admin' ||
      permissions.role === 'hq_admin' ||
      permissions.role === 'zone_admin' ||
      permissions.role === 'zone_coordinator' ||
      permissions.role === 'coordinator' ||
      permissions.role === 'subgroup_admin' ||
      permissions.role === 'subgroup_coordinator' ||
      permissions.role === 'church_coordinator'
    )
  }

  return false
}

export { HQ_SECTIONS }
