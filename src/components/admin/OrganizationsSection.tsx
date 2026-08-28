"use client";

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Search,
  Users,
  MapPin,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Edit2,
  X,
  Loader2,
  Globe2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { Organization } from '@/types/organization';
import { apiClient } from '@/lib/api-client';

export default function OrganizationsSection() {
  const {
    accessibleOrganizations,
    isSuperAdmin,
    createOrganization,
    switchOrganization,
    refreshOrganizations,
  } = useOrganizationStore();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isHq, setIsHq] = useState(false);
  const [adminUserId, setAdminUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchAllOrgs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: Organization[] }>('/organizations');
      if (res.success && Array.isArray(res.data)) {
        setOrganizations(res.data);
      } else {
        setOrganizations(accessibleOrganizations);
      }
    } catch {
      setOrganizations(accessibleOrganizations);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllOrgs();
  }, []);

  const filteredOrgs = organizations.filter((org) =>
    (org.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.region || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (org.country || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Organization name is required');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await apiClient.post<{ success: boolean; data: Organization }>('/organizations', {
        name: name.trim(),
        code: code.trim() || undefined,
        region: region.trim() || undefined,
        country: country.trim() || undefined,
        invitationCode: invitationCode.trim() || undefined,
        isHq,
        adminUserId: adminUserId.trim() || undefined,
      });

      if (res.success && res.data) {
        setFormSuccess('Organization successfully created!');
        setName('');
        setCode('');
        setRegion('');
        setCountry('');
        setInvitationCode('');
        setIsHq(false);
        setAdminUserId('');
        await fetchAllOrgs();
        await refreshOrganizations();
        setTimeout(() => {
          setShowCreateModal(false);
          setFormSuccess('');
        }, 1000);
      } else {
        setFormError('Failed to create organization');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error creating organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setIsSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      const res = await apiClient.patch<{ success: boolean; data: Organization }>(
        `/organizations/${editingOrg.id}`,
        {
          name: name.trim(),
          code: code.trim() || undefined,
          region: region.trim() || undefined,
          country: country.trim() || undefined,
          invitationCode: invitationCode.trim() || undefined,
        }
      );

      if (res.success) {
        setFormSuccess('Organization updated successfully!');
        await fetchAllOrgs();
        await refreshOrganizations();
        setTimeout(() => {
          setEditingOrg(null);
          setFormSuccess('');
        }, 1000);
      } else {
        setFormError('Failed to update organization');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error updating organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (org: Organization) => {
    setEditingOrg(org);
    setName(org.name || '');
    setCode(org.code || '');
    setRegion(org.region || '');
    setCountry(org.country || '');
    setInvitationCode(org.invitationCode || '');
    setIsHq(Boolean(org.isHq));
    setFormError('');
    setFormSuccess('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl text-indigo-300">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-black uppercase tracking-widest text-indigo-300">
              Platform Administration
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">Organization Management</h2>
          <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
            Dynamic tenant registry: create, manage, and assign organization administrators.
          </p>
        </div>

        <button
          onClick={() => {
            setName('');
            setCode('');
            setRegion('');
            setCountry('');
            setInvitationCode('');
            setIsHq(false);
            setAdminUserId('');
            setFormError('');
            setFormSuccess('');
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs transition-all shadow-lg shadow-indigo-600/30 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create Organization</span>
        </button>
      </div>

      {/* Search & Statistics Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/70 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search organizations by name, code, country, region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200/80 focus:bg-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 px-2 shrink-0">
          <Globe2 className="w-4 h-4 text-indigo-500" />
          <span>{filteredOrgs.length} Total Organizations</span>
        </div>
      </div>

      {/* Organizations Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <span className="text-xs font-bold">Loading organizations...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrgs.map((org) => (
            <div
              key={org.id}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 hover:border-indigo-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        {org.code || org.id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {org.isHq && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                        HQ
                      </span>
                    )}
                    <button
                      onClick={() => openEditModal(org)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all"
                      title="Edit Organization"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 font-medium mb-4">
                  {(org.region || org.country) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{[org.region, org.country].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {org.invitationCode && (
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] font-bold text-slate-700">Code: {org.invitationCode}</span>
                    </div>
                  )}
                  {Array.isArray(org.subgroups) && (
                    <div className="flex items-center gap-2">
                      <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{org.subgroups.length} Subgroups</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400">
                  ID: <span className="font-mono">{org.id}</span>
                </span>
                <button
                  onClick={() => switchOrganization(org.id)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 text-xs font-extrabold transition-all"
                >
                  Switch Scope
                </button>
              </div>
            </div>
          ))}

          {filteredOrgs.length === 0 && (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs font-semibold">
              No organizations found matching &ldquo;{searchQuery}&rdquo;
            </div>
          )}
        </div>
      )}

      {/* Modal: Create Organization */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Create New Organization</h3>
                  <p className="text-xs text-slate-500 font-medium">Add a dynamic tenant without code changes</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Canada Church, Kenya Zone"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code / Identifier</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CANADA"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invitation Code</label>
                  <input
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CAN2026"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="e.g. Canada"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. North America"
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Admin User ID (Optional)</label>
                <input
                  type="text"
                  value={adminUserId}
                  onChange={(e) => setAdminUserId(e.target.value)}
                  placeholder="e.g. usr_123 or user email"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white font-mono"
                />
              </div>

              {formError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </p>
              )}

              {formSuccess && (
                <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? 'Creating...' : 'Create Organization'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Organization */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Edit2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Edit Organization</h3>
                  <p className="text-xs text-slate-500 font-medium">{editingOrg.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingOrg(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Organization Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Invitation Code</label>
                  <input
                    type="text"
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-xs font-semibold text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-100 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </p>
              )}

              {formSuccess && (
                <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 p-3 rounded-2xl border border-emerald-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOrg(null)}
                  className="px-5 py-3 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 rounded-2xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
