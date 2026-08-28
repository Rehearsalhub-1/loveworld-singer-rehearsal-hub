"use client";

import React, { useState } from 'react';
import {
  Building2,
  ChevronDown,
  Plus,
  Check,
  Search,
  Users,
  Layers,
  Sparkles,
  Shield,
  KeyRound,
  X,
  Loader2,
} from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { apiClient } from '@/lib/api-client';

export default function OrganizationSwitcher() {
  const {
    activeOrganization,
    activeSubgroup,
    accessibleOrganizations,
    accessibleSubgroups,
    capabilities,
    isSuperAdmin,
    isLoading,
    switchOrganization,
    switchSubgroup,
    createOrganization,
  } = useOrganizationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Create Form State
  const [orgName, setOrgName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [orgRegion, setOrgRegion] = useState('');
  const [orgCountry, setOrgCountry] = useState('');
  const [isHqFlag, setIsHqFlag] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Join Form State
  const [joinCode, setJoinCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');

  const filteredOrgs = accessibleOrganizations.filter((o) =>
    (o.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.region || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectOrg = async (orgId: string) => {
    await switchOrganization(orgId);
    setIsOpen(false);
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      setCreateError('Organization name is required');
      return;
    }

    setIsSubmitting(true);
    setCreateError('');

    const res = await createOrganization({
      name: orgName.trim(),
      code: orgCode.trim() || undefined,
      region: orgRegion.trim() || undefined,
      country: orgCountry.trim() || undefined,
      isHq: isHqFlag,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setShowCreateModal(false);
      setOrgName('');
      setOrgCode('');
      setOrgRegion('');
      setOrgCountry('');
      setIsHqFlag(false);
      await switchOrganization(res.data.id);
    } else {
      setCreateError(res.error || 'Failed to create organization');
    }
  };

  const handleJoinOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setJoinError('Please enter a valid invitation code');
      return;
    }

    setIsJoining(true);
    setJoinError('');
    setJoinSuccess('');

    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>('/writes/zone-join', {
        code: joinCode.trim(),
      });

      if (res.success) {
        setJoinSuccess('Successfully joined organization!');
        setTimeout(() => {
          setShowJoinModal(false);
          setJoinCode('');
          setJoinSuccess('');
          useOrganizationStore.getState().refreshOrganizations();
        }, 1200);
      } else {
        setJoinError(res.message || 'Invalid invitation code');
      }
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join organization');
    } finally {
      setIsJoining(false);
    }
  };

  // If no accessible organizations (e.g. new user with 0 memberships)
  if (!activeOrganization && accessibleOrganizations.length === 0 && !isLoading) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold hover:bg-amber-100 transition-all shadow-sm"
        >
          <KeyRound className="w-3.5 h-3.5 text-amber-600" />
          <span>Join Organization</span>
        </button>

        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <KeyRound className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">Join Organization</h3>
                    <p className="text-xs text-slate-500 font-medium">Enter your invitation code</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleJoinOrg} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Invitation Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CANADA, BLWZN1, UK"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-sm tracking-wider uppercase"
                    required
                  />
                </div>

                {joinError && (
                  <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    {joinError}
                  </p>
                )}

                {joinSuccess && (
                  <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                    {joinSuccess}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isJoining}
                    className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
                  >
                    {isJoining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isJoining ? 'Joining...' : 'Join'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5">
        {/* Main Organization Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/90 border border-slate-200/80 hover:border-indigo-400 hover:bg-indigo-50/40 text-slate-900 transition-all shadow-sm active:scale-95 group"
        >
          <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
            <Building2 className="w-3.5 h-3.5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-slate-900 truncate max-w-[140px] sm:max-w-[180px]">
                {activeOrganization?.name || 'Select Organization'}
              </span>
              {activeOrganization?.isHq && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                  HQ
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-400 -mt-0.5">
              {activeSubgroup ? activeSubgroup.name : 'Organization Scope'}
            </p>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
        </button>

        {/* Optional Subgroup Dropdown */}
        {accessibleSubgroups.length > 0 && (
          <select
            value={activeSubgroup?.id || ''}
            onChange={(e) => switchSubgroup(e.target.value || null)}
            className="text-xs font-bold bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:bg-white cursor-pointer"
          >
            <option value="">All Subgroups</option>
            {accessibleSubgroups.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Organization Switcher Dropdown Modal */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header & Search */}
            <div className="px-2 py-1.5 mb-2 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">Switch Organization</h4>
                <p className="text-xs text-slate-600 font-semibold">{accessibleOrganizations.length} accessible organizations</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowJoinModal(true);
                  }}
                  className="p-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                  title="Join with Invitation Code"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowCreateModal(true);
                    }}
                    className="p-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm"
                    title="Create New Organization"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative mb-2.5">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200/80 focus:bg-white focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Organizations List */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
              {filteredOrgs.map((org) => {
                const isSelected = org.id === activeOrganization?.id;
                return (
                  <button
                    key={org.id}
                    onClick={() => handleSelectOrg(org.id)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-extrabold ring-1 ring-indigo-500/20'
                        : 'hover:bg-slate-50 text-slate-700 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs truncate">{org.name}</span>
                          {org.isHq && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-purple-100 text-purple-700">
                              HQ
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {org.code || org.region || 'Organization'}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 shrink-0 ml-2" />}
                  </button>
                );
              })}

              {filteredOrgs.length === 0 && (
                <div className="py-6 text-center text-xs text-slate-400 font-medium">
                  No organizations found matching &ldquo;{searchQuery}&rdquo;
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal: Dynamic Organization Creation */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Create Organization</h3>
                  <p className="text-xs text-slate-500 font-medium">Add a new dynamic tenant</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrg} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Canada Church, Kenya Zone"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code / Identifier</label>
                  <input
                    type="text"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CANADA"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={orgRegion}
                    onChange={(e) => setOrgRegion(e.target.value)}
                    placeholder="e.g. North America"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {createError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  {createError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? 'Creating...' : 'Create Organization'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Join Organization with Code */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Join Organization</h3>
                  <p className="text-xs text-slate-500 font-medium">Enter your invitation code</p>
                </div>
              </div>
              <button
                onClick={() => setShowJoinModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleJoinOrg} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Invitation Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CANADA, BLWZN1, UK"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono text-sm tracking-wider uppercase"
                  required
                />
              </div>

              {joinError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                  {joinError}
                </p>
              )}

              {joinSuccess && (
                <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                  {joinSuccess}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isJoining}
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-md shadow-indigo-600/20"
                >
                  {isJoining && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isJoining ? 'Joining...' : 'Join'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
