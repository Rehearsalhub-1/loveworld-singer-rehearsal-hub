"use client";

/**
 * Church Admin — Programs (Rehearsal Setlists)
 * API endpoints:
 *   GET    /subgroups/praise-nights?subGroupId=<id>  — list programs
 *   POST   /subgroups/praise-nights                  — create program
 *   PATCH  /programs/:id                             — update name/status
 *   DELETE /programs/:id                             — delete program
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layers, Pencil, Trash2, X, RefreshCw, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useSubGroup } from '@/hooks/useSubGroup';
import CustomLoader from '@/components/CustomLoader';
import { useSearchParams } from 'next/navigation';

interface Program {
  id: string;
  name: string;
  status?: string;
  category?: string;
  songCount?: number;
  date?: string;
  [key: string]: any;
}

const STATUS_COLORS: Record<string, string> = {
  ongoing:        'bg-emerald-50 text-emerald-700 border-emerald-100',
  'pre-rehearsal':'bg-amber-50 text-amber-700 border-amber-100',
  archive:        'bg-slate-100 text-slate-500 border-slate-200',
  unassigned:     'bg-slate-50 text-slate-400 border-slate-200',
};

export default function ChurchProgramsPage() {
  const searchParams = useSearchParams();
  const { coordinatedSubGroups, isLoading: sgLoading } = useSubGroup();
  const church = coordinatedSubGroups[0] ?? null;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Create / edit modal
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Program | null>(null);
  const [formName, setFormName] = useState('');
  const [formStatus, setFormStatus] = useState('ongoing');
  const [saving, setSaving] = useState(false);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadPrograms = useCallback(async () => {
    if (!church?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/subgroups/praise-nights?subGroupId=${church.id}`);
      setPrograms(Array.isArray(res?.data) ? res.data : []);
    } catch { setPrograms([]); } finally { setLoading(false); }
  }, [church?.id]);

  useEffect(() => { loadPrograms(); }, [loadPrograms]);

  // Auto-open create form if ?create=1
  useEffect(() => {
    if (searchParams?.get('create') === '1') openCreate();
  }, [searchParams]);

  const openCreate = () => {
    setEditTarget(null);
    setFormName('');
    setFormStatus('ongoing');
    setShowForm(true);
  };

  const openEdit = (prog: Program) => {
    setEditTarget(prog);
    setFormName(prog.name);
    setFormStatus(prog.status || prog.category || 'ongoing');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !church?.id) return;
    setSaving(true);
    try {
      if (editTarget) {
        await apiClient.patch(`/programs/${editTarget.id}`, { name: formName.trim(), status: formStatus, category: formStatus });
        setPrograms(prev => prev.map(p => p.id === editTarget.id ? { ...p, name: formName.trim(), status: formStatus, category: formStatus } : p));
        showMsg('Program updated');
      } else {
        const res = await apiClient.post<any>('/subgroups/praise-nights', {
          name: formName.trim(),
          category: formStatus,
          subGroupId: church.id,
          zoneId: church.zoneId || church.organizationId,
        });
        const created = res?.data || res;
        if (created?.id) setPrograms(prev => [created, ...prev]);
        showMsg('Program created');
      }
      setShowForm(false);
    } catch { showMsg('Failed to save program'); } finally { setSaving(false); }
  };

  const deleteProgram = async (prog: Program) => {
    if (!confirm(`Delete "${prog.name}"? This cannot be undone.`)) return;
    try {
      await apiClient.delete(`/programs/${prog.id}`);
      setPrograms(prev => prev.filter(p => p.id !== prog.id));
      showMsg('Program deleted');
    } catch { showMsg('Failed to delete program'); }
  };

  if (sgLoading) return <div className="py-24 flex justify-center"><CustomLoader message="Loading..." /></div>;
  if (!church) return <div className="py-24 text-center text-sm text-slate-500">No church assigned.</div>;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-base font-black text-slate-900">Programs ({programs.length})</h2>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          New Program
        </button>
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><CustomLoader message="Loading programs..." /></div>
      ) : programs.length === 0 ? (
        <div className="py-16 text-center">
          <Layers className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">No programs yet.</p>
          <p className="text-xs text-slate-400 mt-1">Create a rehearsal program for your church.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {programs.map(prog => {
              const statusKey = (prog.status || prog.category || 'unassigned').toLowerCase();
              const badge = STATUS_COLORS[statusKey] || STATUS_COLORS.unassigned;
              return (
                <div key={prog.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{prog.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badge}`}>
                        {statusKey}
                      </span>
                      {prog.songCount != null && prog.songCount > 0 && (
                        <span className="text-[10px] text-slate-400">{prog.songCount} songs</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(prog)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => deleteProgram(prog)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {editTarget ? 'Edit Program' : 'New Program'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Program Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Sunday Service Rehearsal"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Status</label>
                <div className="relative">
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value)}
                    className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    <option value="ongoing">Ongoing</option>
                    <option value="pre-rehearsal">Pre-rehearsal</option>
                    <option value="archive">Archive</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 transition-all"
                >
                  {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  {saving ? 'Saving…' : (editTarget ? 'Update' : 'Create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
