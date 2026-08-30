"use client";

import React from 'react';
import { Building2 } from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAdminZone } from '@/contexts/AdminZoneContext';

/**
 * AdminScopeDisplay — used ONLY in the admin portal header.
 * Shows the admin locked org as a non-clickable label.
 * No org switching in admin — admin is locked to their ONE admin org.
 * Only shows church/subgroup switcher for managing sub-orgs.
 */
export default function AdminScopeDisplay() {
  const { activeOrganization, activeSubgroup, accessibleSubgroups, capabilities, isSuperAdmin, switchSubgroup } = useOrganizationStore();
  const { isHQAdmin } = useAdminZone();

  const canManageSubgroups = capabilities.canManageOrganization || capabilities.canManagePlatform || isSuperAdmin || capabilities.canManageSubgroup;
  const showSubgroupSwitcher = canManageSubgroups && accessibleSubgroups.length > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Locked admin org — display only, NOT clickable */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
        <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
          <Building2 className="w-3 h-3" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-800 truncate max-w-[160px]">
            {isHQAdmin ? (activeOrganization?.name || 'HQ') : (activeOrganization?.name || 'Your Zone')}
          </span>
          {activeOrganization?.isHq && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0">
              HQ
            </span>
          )}
        </div>
        {!isHQAdmin && (
          <span className="text-[9px] text-slate-400 font-bold border border-slate-200 rounded px-1 py-0.5 flex-shrink-0">
            Admin
          </span>
        )}
      </div>

      {/* Church/Subgroup switcher — admin manages which church scope they view */}
      {showSubgroupSwitcher && (
        <select
          value={activeSubgroup?.id || ''}
          onChange={(e) => switchSubgroup(e.target.value || null)}
          className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-400 cursor-pointer max-w-[160px]"
          aria-label="Switch Church / Subgroup"
        >
          <option value="">All Churches</option>
          {accessibleSubgroups.map((sg) => (
            <option key={sg.id} value={sg.id}>{sg.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}