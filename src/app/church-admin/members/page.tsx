"use client";

/**
 * Church Admin — Members
 * API endpoints:
 *   GET    /subgroups/:id/members                   — list members
 *   GET    /profiles/directory?zone_code=<zoneCode> — search zone profiles to add
 *   POST   /subgroups/members { subGroupId, userId } — add a member
 *   DELETE /subgroups/members?subGroupId=&userId=   — remove a member
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, UserMinus, X, RefreshCw, Users } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useSubGroup } from '@/hooks/useSubGroup';
import CustomLoader from '@/components/CustomLoader';
import { useSearchParams } from 'next/navigation';

interface Member {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  username?: string;
  profileImageUrl?: string;
  role?: string;
  [key: string]: any;
}

function MemberAvatar({ member }: { member: Member }) {
  const initials = [member.firstName?.[0], member.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  if (member.profileImageUrl) {
    return <img src={member.profileImageUrl} alt={initials} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black flex-shrink-0">
      {initials}
    </div>
  );
}

export default function ChurchMembersPage() {
  const searchParams = useSearchParams();
  const { coordinatedSubGroups, isLoading: sgLoading } = useSubGroup();
  const church = coordinatedSubGroups[0] ?? null;

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Add member modal
  const [showAdd, setShowAdd] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addSearchResults, setAddSearchResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const showMsg = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadMembers = useCallback(async () => {
    if (!church?.id) return;
    setLoading(true);
    try {
      const res = await apiClient.get<any>(`/subgroups/${church.id}/members`);
      const list = Array.isArray(res?.data) ? res.data : [];
      setMembers(list);
    } catch { setMembers([]); } finally { setLoading(false); }
  }, [church?.id]);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Auto-open add panel if ?add=1
  useEffect(() => {
    if (searchParams?.get('add') === '1') setShowAdd(true);
  }, [searchParams]);

  // Debounced zone profile search
  useEffect(() => {
    if (!addSearch.trim() || addSearch.length < 2) { setAddSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ search: addSearch });
        if (church?.zoneId || church?.organizationId) {
          params.set('zone_code', church.zoneId || church.organizationId);
        }
        const res = await apiClient.get<any>(`/profiles/directory?${params}`);
        const all = Array.isArray(res?.data) ? res.data : [];
        // Exclude already-members
        const memberIds = new Set(members.map(m => m.id));
        setAddSearchResults(all.filter((p: Member) => !memberIds.has(p.id)).slice(0, 15));
      } catch { setAddSearchResults([]); } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(timer);
  }, [addSearch, church?.zoneId, church?.organizationId, members]);

  const addMember = async (userId: string) => {
    if (!church?.id) return;
    setAdding(userId);
    try {
      await apiClient.post('/subgroups/members', { subGroupId: church.id, userId, role: 'member' });
      showMsg('Member added successfully');
      setAddSearchResults(prev => prev.filter(p => p.id !== userId));
      await loadMembers();
    } catch (e: any) {
      showMsg(e?.message || 'Failed to add member');
    } finally { setAdding(null); }
  };

  const removeMember = async (member: Member) => {
    const name = [member.firstName, member.lastName].filter(Boolean).join(' ') || member.email || 'this member';
    if (!confirm(`Remove ${name} from your church?`)) return;
    try {
      await apiClient.delete(`/subgroups/members?subGroupId=${church?.id}&userId=${member.id}`);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      showMsg('Member removed');
    } catch { showMsg('Failed to remove member'); }
  };

  const filtered = members.filter(m => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = `${m.firstName || ''} ${m.lastName || ''}`.toLowerCase();
    return name.includes(q) || (m.email || '').toLowerCase().includes(q) || (m.username || '').toLowerCase().includes(q);
  });

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
        <h2 className="text-base font-black text-slate-900">Members ({members.length})</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Add Member
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search members..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
        />
      </div>

      {loading ? (
        <div className="py-16 flex justify-center"><CustomLoader message="Loading members..." /></div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Users className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-500">{search ? 'No members match your search.' : 'No members yet.'}</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-slate-100">
            {filtered.map(member => (
              <div key={member.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-all">
                <MemberAvatar member={member} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {[member.firstName, member.lastName].filter(Boolean).join(' ') || member.username || 'Singer'}
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">{member.email || ''}</p>
                </div>
                <button
                  onClick={() => removeMember(member)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all"
                  title="Remove from church"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Add Member</h3>
                <p className="text-xs text-slate-400 mt-0.5">Search your zone to find a singer</p>
              </div>
              <button onClick={() => { setShowAdd(false); setAddSearch(''); setAddSearchResults([]); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by name, email, or username..."
                  value={addSearch}
                  onChange={e => setAddSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5">
              {searching ? (
                <div className="py-8 flex justify-center"><RefreshCw className="w-5 h-5 text-slate-300 animate-spin" /></div>
              ) : addSearch.length >= 2 && addSearchResults.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No singers found matching "{addSearch}"</div>
              ) : addSearch.length < 2 ? (
                <div className="py-8 text-center text-xs text-slate-400">Type at least 2 characters to search</div>
              ) : (
                addSearchResults.map(person => (
                  <div key={person.id} className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all">
                    <MemberAvatar member={person} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {[person.firstName, person.lastName].filter(Boolean).join(' ') || person.username || 'Singer'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">{person.email || ''}</p>
                    </div>
                    <button
                      onClick={() => addMember(person.id)}
                      disabled={adding === person.id}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold disabled:opacity-50 transition-all"
                    >
                      {adding === person.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                      Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
