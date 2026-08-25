"use client";

/**
 * Rehearsal Scope Badge Component
 * Shows whether a rehearsal is zone-level or church-level
 */

import React from 'react';
import { Building2, Users } from 'lucide-react';

interface RehearsalScopeBadgeProps {
  scope: 'zone' | 'subgroup';
  label?: string;
  size?: 'sm' | 'md';
}

export default function RehearsalScopeBadge({
  scope,
  label,
  size = 'sm'
}: RehearsalScopeBadgeProps) {
  const isZone = scope === 'zone';
  const Icon = isZone ? Building2 : Users;
  const defaultLabel = isZone ? 'Zone' : 'Church';
  const displayLabel = label || defaultLabel;

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs gap-1'
    : 'px-2.5 py-1 text-sm gap-1.5';

  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${sizeClasses}
        ${isZone
          ? 'bg-blue-100 text-blue-700'
          : 'bg-purple-100 text-purple-700'
        }
      `}
    >
      <Icon className={iconSize} />
      {displayLabel}
    </span>
  );
}
