"use client";

import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, MapPin, KeyRound, Edit2, X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { Organization } from '@/types/organization';
import { apiClient } from '@/lib/api-client';

export default function OrganizationsSection() {
  const { accessibleOrganizations, refreshOrganizations, isSuperAdmin, capabilities } = useOrganizationStore();
  const isHQAdmin = isSuperAdmin || capabilities.canManagePlatform;

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [isHq, setIsHq] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchAllOrgs = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: Organization[] }>('/organizations');
      setOrganizations(res.success && Array.isArray(res.data) ? res.data : accessibleOrganizations);
    } catch {
      setOrganizations(accessibleOrganizations);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchAllOrgs(); }, []);

  const filtered = organizations.filter((o) =>
    (o.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.region || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.country || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setName(''); setCode(''); setRegion(''); setCountry('');
    setInvitationCode(''); setIsHq(false);
    setFormError(''); setFormSuccess('');
  };

  const openCreate = () => { resetForm(); setShowCreateModal(true); };
  const openEdit = (org: Organization) => {
    setEditingOrg(org);
    setName(org.name || ''); setCode(org.code || '');
    setRegion(org.region || ''); setCountry(org.country || '');
    setInvitationCode(org.invitationCode || ''); setIsHq(Boolean(org.isHq));
    setFormError(''); setFormSuccess('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setFormError('Name is required'); return; }
    setIsSubmitting(true); setFormError('');
    try {
      const res = await apiClient.post<{ success: boolean; data: Organization }>('/organizations', {
        name: name.trim(), code: code.trim() || undefined,
        region: region.trim() || undefined, country: country.trim() || undefined,
        invitationCode: invitationCode.trim() || undefined, isHq,
      });
      if (res.success && res.data) {
        setFormSuccess('Created!');
        await fetchAllOrgs(); await refreshOrganizations();
        setTimeout(() => { setShowCreateModal(false); setFormSuccess(''); }, 800);
      } else { setFormError('Failed to create'); }
    } catch (err: any) { setFormError(err.message || 'Error'); }
    finally { setIsSubmitting(false); }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;
    setIsSubmitting(true); setFormError('');
    try {
      const res = await apiClient.patch<{ success: boolean }>(
        `/organizations/${editingOrg.id}`,
        { name: name.trim(), code: code.trim() || undefined,
          region: region.trim() || undefined, country: country.trim() || undefined,
          invitationCode: invitationCode.trim() || undefined }
      );
      if (res.success) {
        setFormSuccess('Saved!');
        await fetchAllOrgs(); await refreshOrganizations();
        setTimeout(() => { setEditingOrg(null); setFormSuccess(''); }, 800);
      } else { setFormError('Failed to save'); }
    } catch (err: any) { setFormError(err.message || 'Error'); }
    finally { setIsSubmitting(false); }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 lg:px-6 pt-4 pb-3 border-b border-slate-200/80 bg-white flex items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">Zones</h1>
            <p className="text-[11px] text-slate-400 font-medium">{organizations.length} zones</p>
          </div>
        </div>
        {isHQAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Zone</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 lg:px-6 py-3 border-b border-slate-100 bg-white flex-shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search zones by name, code, region..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200/80 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none"
          />
        </div>
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs font-bold">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs font-bold text-slate-400">
            {searchQuery ? `No results for "${searchQuery}"` : 'No zones yet'}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((org) => (
              <div key={org.id} className="flex items-center justify-between px-4 lg:px-6 py-3.5 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate">{org.name}</span>
                      {org.isHq && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 flex-shrink-0">HQ</span>
                      )}
                      {org.code && (
                        <span className="text-[10px] font-mono font-bold text-slate-400">{org.code}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400 font-medium flex-wrap">
                      {(org.region || org.country) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {[org.region, org.country].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {org.invitationCode && (
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3" />
                          <span className="font-mono">{org.invitationCode}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isHQAdmin && (
                  <button
                    onClick={() => openEdit(org)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <OrgModal
          title="New Zone"
          name={name} setName={setName}
          code={code} setCode={setCode}
          region={region} setRegion={setRegion}
          country={country} setCountry={setCountry}
          invitationCode={invitationCode} setInvitationCode={setInvitationCode}
          isHq={isHq} setIsHq={setIsHq}
          isSubmitting={isSubmitting}
          formError={formError} formSuccess={formSuccess}
          onSubmit={handleCreate}
          onClose={() => setShowCreateModal(false)}
          submitLabel="Create"
        />
      )}

      {/* Edit Modal */}
      {editingOrg && (
        <OrgModal
          title={`Edit: ${editingOrg.name}`}
          name={name} setName={setName}
          code={code} setCode={setCode}
          region={region} setRegion={setRegion}
          country={country} setCountry={setCountry}
          invitationCode={invitationCode} setInvitationCode={setInvitationCode}
          isHq={isHq} setIsHq={setIsHq}
          isSubmitting={isSubmitting}
          formError={formError} formSuccess={formSuccess}
          onSubmit={handleUpdate}
          onClose={() => setEditingOrg(null)}
          submitLabel="Save Changes"
        />
      )}
    </div>
  );
}

interface OrgModalProps {
  title: string;
  name: string; setName: (v: string) => void;
  code: string; setCode: (v: string) => void;
  region: string; setRegion: (v: string) => void;
  country: string; setCountry: (v: string) => void;
  invitationCode: string; setInvitationCode: (v: string) => void;
  isHq: boolean; setIsHq: (v: boolean) => void;
  isSubmitting: boolean;
  formError: string; formSuccess: string;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  submitLabel: string;
}

function OrgModal({ title, name, setName, code, setCode, region, setRegion, country, setCountry, invitationCode, setInvitationCode, isHq, setIsHq, isSubmitting, formError, formSuccess, onSubmit, onClose, submitLabel }: OrgModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-black text-slate-900">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Canada Zone" required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Code</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="CANADA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none uppercase" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Invite Code</label>
              <input type="text" value={invitationCode} onChange={(e) => setInvitationCode(e.target.value.toUpperCase())} placeholder="CAN2026"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-mono bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Canada"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 uppercase tracking-wider">Region</label>
              <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} placeholder="North America"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-400 outline-none" />
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
            <input type="checkbox" checked={isHq} onChange={(e) => setIsHq(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer" />
            <span className="text-xs font-bold text-slate-700">Mark as HQ Organization</span>
          </label>

          {formError && (
            <p className="text-xs font-semibold text-rose-600 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{formError}
            </p>
          )}
          {formSuccess && (
            <p className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />{formSuccess}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-1.5 active:scale-95">
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}