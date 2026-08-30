"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check, Search } from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAdminZone } from '@/contexts/AdminZoneContext';

/**
 * AdminScopeDisplay — admin header org + church switcher.
 *
 * Admins CAN switch between orgs they belong to (they are still members of
 * multiple zones). When inside the admin section the data shown is always
 * scoped to the currently selected org.
 * Church / subgroup switcher is shown when the admin manages sub-orgs.
 */
export default function AdminScopeDisplay() {
  const {
    activeOrganization,
    activeSubgroup,
    accessibleOrganizations,
    accessibleSubgroups,
    capabilities,
    isSuperAdmin,
    switchOrganization,
    switchSubgroup,
  } = useOrganizationStore();
  const { isHQAdmin } = useAdminZone();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredOrgs = accessibleOrganizations.filter((o) =>
    (o.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.code || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const canManageSubgroups =
    capabilities.canManageOrganization || capabilities.canManagePlatform ||
    isSuperAdmin || capabilities.canManageSubgroup;
  const showSubgroupSwitcher = canManageSubgroups && accessibleSubgroups.length > 0;

  const hasMultipleOrgs = accessibleOrganizations.length > 1;

  return (
    <div className="flex items-center gap-2">
      {/* Org selector */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => hasMultipleOrgs && setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 transition-all ${
            hasMultipleOrgs
              ? 'hover:border-indigo-300 hover:bg-indigo-50/40 cursor-pointer active:scale-95'
              : 'cursor-default'
          }`}
          title={hasMultipleOrgs ? 'Switch organization' : activeOrganization?.name || ''}
        >
          <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
            <Building2 className="w-3 h-3" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">
              {activeOrganization?.name || 'Select Organization'}
            </span>
            {activeOrganization?.isHq && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0">
                HQ
              </span>
            )}
          </div>
          {hasMultipleOrgs && (
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
          )}
        </button>

        {/* Dropdown */}
        {isOpen && hasMultipleOrgs && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setIsOpen(false); setSearchQuery(''); }} />
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 pb-2">
                Switch Organization
              </p>
              {accessibleOrganizations.length > 4 && (
                <div className="relative mb-2">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
                  />
                </div>
              )}
              <div className="max-h-56 overflow-y-auto space-y-0.5 custom-scrollbar">
                {filteredOrgs.map((org) => {
                  const isSelected = org.id === activeOrganization?.id;
                  return (
                    <button
                      key={org.id}
                      onClick={() => { switchOrganization(org.id); setIsOpen(false); setSearchQuery(''); }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-900 font-extrabold'
                          : 'hover:bg-slate-50 text-slate-700 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="truncate">{org.name}</span>
                            {org.isHq && <span className="text-[8px] font-black bg-purple-100 text-purple-700 px-1 rounded flex-shrink-0">HQ</span>}
                          </div>
                          {org.code && <span className="text-[10px] text-slate-400">{org.code}</span>}
                        </div>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 flex-shrink-0" />}
                    </button>
                  );
                })}
                {filteredOrgs.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No organizations found</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Church/Subgroup switcher */}
      {showSubgroupSwitcher && (
        <select
          value={activeSubgroup?.id || ''}
          onChange={(e) => switchSubgroup(e.target.value || null)}
          className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-400 cursor-pointer max-w-[150px]"
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