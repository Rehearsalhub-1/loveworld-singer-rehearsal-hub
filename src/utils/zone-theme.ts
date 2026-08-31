/**
 * Zone Theme Utilities
 * 
 * Provides zone-aware colors and terminology for the admin interface
 */

import { isHQGroup } from '@/config/zones';

export interface ZoneTheme {
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
  text: string;
  textHover: string;
  border: string;
  borderHover: string;
  bg: string;
  bgHover: string;
  focusRing: string;
  focusBorder: string;
  focusBg: string;
}

const PURPLE_THEME: ZoneTheme = {
  primary: 'bg-purple-600',
  primaryHover: 'hover:bg-purple-700',
  primaryLight: 'bg-purple-50',
  primaryDark: 'bg-purple-100',
  text: 'text-purple-600',
  textHover: 'hover:text-purple-700',
  border: 'border-purple-200',
  borderHover: 'hover:border-purple-300',
  bg: 'bg-purple-50',
  bgHover: 'hover:bg-purple-100',
  focusRing: 'focus:ring-purple-500',
  focusBorder: 'focus:border-purple-500',
  focusBg: 'focus:bg-white',
};

/**
 * Get theme colors — unified Royal Purple design system
 */
export function getZoneTheme(_zoneColor?: string): ZoneTheme {
  return PURPLE_THEME;
}

/**
 * Get role terminology based on zone type
 * HQ Groups use "Pastor" while regular zones use "Coordinator"
 */
export function getRoleTerminology(zoneId?: string): {
  singular: string;
  plural: string;
  title: string;
} {
  if (zoneId && isHQGroup(zoneId)) {
    return {
      singular: 'Pastor',
      plural: 'Pastors',
      title: 'HQ Pastor'
    };
  }

  return {
    singular: 'Coordinator',
    plural: 'Coordinators',
    title: 'Zone Coordinator'
  };
}

/**
 * Get full role name for display
 */
export function getFullRoleName(zoneId?: string, firstName?: string, lastName?: string): string {
  const role = getRoleTerminology(zoneId);
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  
  if (fullName) {
    return fullName;
  }
  
  return role.title;
}
