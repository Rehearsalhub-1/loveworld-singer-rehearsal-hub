"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/stores/authStore';
import { apiClient } from '@/lib/api-client';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';
import { canPerformAdminAction, getAdminPermissions } from '@/config/admin-permissions';
import { useOrganizationStore } from '@/stores/organizationStore';
import CustomLoader from './CustomLoader';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  UserMinus,
  Edit2,
  Trash2,
  X,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Shield,
  Zap,
  Filter,
  Check,
  RefreshCw,
  Download,
  Building2,
  MapPin,
  Tag,
  AtSign,
  KeyRound,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

// In-memory cache for members data
const CACHE_TTL = 30 * 1000;
interface MembersCache {
  data: Member[];
  timestamp: number;
  zoneId: string;
  filterZone: string;
}
const membersCache = new Map<string, MembersCache>();

function getCacheKey(zoneId: string, filterZone: string): string {
  return `${zoneId}_${filterZone}`;
}

function isCacheValid(cache: MembersCache | undefined): boolean {
  if (!cache) return false;
  return Date.now() - cache.timestamp < CACHE_TTL;
}

export interface Member {
  id: string;
  membershipId?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
  username?: string;
  alias?: string;
  phone?: string;
  gender?: string;
  birthday?: string;
  region?: string;
  church?: string;
  designation?: string;
  administration?: string;
  profile_image_url?: string;
  created_at: string;
  updated_at: string;
  is_active?: boolean;
  groups?: string[];
  role?: string;
  zoneId?: string;
  zoneName?: string;
  can_access_pre_rehearsal?: boolean;
  has_hq_access?: boolean;
  canAnnotate?: boolean;
  canSeeArchive?: boolean;
  hiddenFeatures?: Record<string, boolean>;
  hidden_features?: Record<string, boolean>;
}

const LOCAL_STORAGE_KEY = 'lws_members_dir_v2';

function getStoredMembers(): Member[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveStoredMembers(list: Member[]) {
  if (typeof window === 'undefined' || !Array.isArray(list) || list.length === 0) return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

function friendlyMemberError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error || '');
  if (!msg) return 'Something went wrong. Please try again.';
  const lower = msg.toLowerCase();
  if (lower.includes('not found') || lower.includes('404')) return 'Member not found. They may have already been removed.';
  if (lower.includes('forbidden') || lower.includes('403')) return "You don't have permission to perform this action.";
  if (lower.includes('network') || lower.includes('fetch')) return 'Connection failed. Check your internet and try again.';
  if (msg.length > 80 || msg.includes('_') || msg.includes('prisma')) return 'Something went wrong. Please try again.';
  return msg;
}

export default function Members() {
  const { user } = useAuth();
  const { currentZone } = useZone();
  const { 
    selectedZoneId, 
    selectedZone, 
    isGlobalView, 
    isHQAdmin,
    isChurchScope,
    selectedChurchId,
    selectedChurch,
  } = useAdminZone();

  const [filterZone, setFilterZone] = useState<string>('all');
  const initialCache = membersCache.get(getCacheKey(selectedZoneId || 'all', 'all'));
  const storedList = initialCache?.data?.length ? initialCache.data : getStoredMembers();
  const [members, setMembers] = useState<Member[]>(storedList);
  const [loading, setLoading] = useState(storedList.length === 0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'hq_admin' | 'zone_admin' | 'member'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [allZones, setAllZones] = useState<any[]>([]);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' | 'info' } | null>(null);
  const [rejectModal, setRejectModal] = useState<{ member: Member | null; reason: string }>({ member: null, reason: '' });
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Zones
  useEffect(() => {
    const loadZones = async () => {
      try {
        const { ZONES } = await import('@/config/zones');
        setAllZones(ZONES);
      } catch (error) {
        console.error('Error loading zones:', error);
      }
    };
    loadZones();
  }, []);

  // Data loading from live API directory (with stale-while-revalidate)
  const loadMembers = async (forceRefresh = false) => {
    const effectiveZoneId = filterZone !== 'all' ? filterZone : selectedZoneId;
    const effectiveIsGlobal = (filterZone === 'all' && isGlobalView) || effectiveZoneId === 'all' || effectiveZoneId === 'zone-001';
    const cacheKey = getCacheKey(isChurchScope ? `church_${selectedChurchId}` : effectiveZoneId, filterZone);

    if (forceRefresh) {
      membersCache.delete(cacheKey);
      setIsRefreshing(true);
    } else {
      const cached = membersCache.get(cacheKey);
      if (cached && cached.data.length > 0) {
        setMembers(cached.data);
        setLoading(false);
        if (isCacheValid(cached)) {
          return;
        }
      }
    }

    try {
      let query = '';
      if (isChurchScope && selectedChurchId) {
        query = `/subgroups/${encodeURIComponent(selectedChurchId)}/members`;
      } else if (effectiveIsGlobal) {
        query = '/profiles/directory';
      } else {
        query = `/profiles/directory?zone_code=${encodeURIComponent((selectedZone as any)?.code || selectedZone?.invitationCode || effectiveZoneId)}`;
      }
      const res = await apiClient.get<any>(query);
      const rawList = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);

      if (rawList.length > 0) {
        const membersData: Member[] = rawList.map((m: any) => {
          const firstName = (m.first_name || m.firstName || '').trim();
          const lastName = (m.last_name || m.lastName || '').trim();
          const middleName = (m.middle_name || m.middleName || '').trim();
          const zCode = m.zone_code || m.zoneCode || '';
          const resolvedZone = allZones.find(z => z.invitationCode === zCode || z.id === zCode);
          const raw = m.raw_data || m.rawData || {};

          return {
            id: m.id || m.uid,
            membershipId: m.id || m.uid,
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName,
            email: m.email || '',
            username: raw.username || m.username || '',
            alias: raw.alias || m.alias || '',
            phone: m.phone_number || m.phoneNumber || m.phone || '',
            gender: m.gender || '',
            birthday: m.birthday || '',
            region: m.region || '',
            church: m.church || '',
            designation: (m.designation || '').trim(),
            administration: (m.administration || '').trim(),
            profile_image_url: m.profile_image_url || m.avatar || '',
            created_at: m.created_at || m.createdAt || new Date().toISOString(),
            updated_at: m.updated_at || m.updatedAt || new Date().toISOString(),
            is_active: m.is_active !== false,
            role: m.role || 'member',
            zoneId: zCode || effectiveZoneId,
            zoneName: resolvedZone?.name || zCode || 'Assigned Zone',
            has_hq_access: !!m.has_hq_access || m.role === 'hq_admin',
            hiddenFeatures: raw.hidden_features || raw.hiddenFeatures || m.hidden_features || m.hiddenFeatures || {},
          };
        });

        setMembers(membersData);
        saveStoredMembers(membersData);

        membersCache.set(cacheKey, {
          data: membersData,
          timestamp: Date.now(),
          zoneId: effectiveZoneId,
          filterZone
        });
      }
    } catch (error) {
      console.warn('Network issue fetching fresh members directory, using cache:', error);
      if (members.length === 0 && storedList.length === 0) {
        showToast('Checking directory connection...', 'warning');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Clear ALL cache entries for previous zones when the active zone changes.
    // This prevents stale data from a previous zone being shown briefly
    // while the new zone's data loads. The current zone's entries will be
    // re-populated by loadMembers below.
    membersCache.forEach((_entry, key) => {
      const keyZone = key.split('_')[0];
      const effectiveZone = isChurchScope ? `church_${selectedChurchId}` : (selectedZoneId || 'all');
      if (keyZone !== effectiveZone) {
        membersCache.delete(key);
      }
    });
    loadMembers(false);
    setDisplayLimit(50);
  }, [selectedZoneId, filterZone]);

  // Filtered members computation
  const filteredMembers = useMemo(() => {
    return members.filter(member => {
      // 1. Zone filter
      if (filterZone !== 'all') {
        const selectedZoneObj = allZones.find(z => z.id === filterZone);
        const targetId = filterZone.toLowerCase();
        const targetCode = (selectedZoneObj?.invitationCode || '').toLowerCase();
        const targetName = (selectedZoneObj?.name || '').toLowerCase().replace('loveworld singers ', '').replace('lws ', '');

        const mZoneId = (member.zoneId || '').toLowerCase();
        const mZoneName = (member.zoneName || '').toLowerCase();
        const mRawZone = (((member as any).rawData?.zone_code || (member as any).rawData?.zoneCode || (member as any).zone_code || '') as string).toLowerCase();

        const matchesZone =
          mZoneId === targetId ||
          (targetCode && mZoneId === targetCode) ||
          mRawZone === targetId ||
          (targetCode && mRawZone === targetCode) ||
          (targetName && mZoneName.includes(targetName)) ||
          (targetName && targetName.includes(mZoneName));

        if (!matchesZone) return false;
      }

      // 2. Search term filter
      if (searchTerm.trim()) {
        const cleanTerm = searchTerm.toLowerCase().trim().replace(/^@/, '');
        const fullName = `${member.first_name || ''} ${member.last_name || ''}`.toLowerCase();
        const email = (member.email || '').toLowerCase();
        const username = (member.username || '').toLowerCase();
        const alias = (member.alias || '').toLowerCase();
        const phone = (member.phone || '').toLowerCase();
        const church = (member.church || '').toLowerCase();
        const designation = (member.designation || '').toLowerCase();
        const administration = (member.administration || '').toLowerCase();
        const zoneName = (member.zoneName || '').toLowerCase();

        const matchesSearch =
          fullName.includes(cleanTerm) ||
          email.includes(cleanTerm) ||
          username.includes(cleanTerm) ||
          alias.includes(cleanTerm) ||
          phone.includes(cleanTerm) ||
          church.includes(cleanTerm) ||
          designation.includes(cleanTerm) ||
          administration.includes(cleanTerm) ||
          zoneName.includes(cleanTerm);

        if (!matchesSearch) return false;
      }

      // 3. Role filter
      if (roleFilter !== 'all') {
        const r = (member.role || '').toLowerCase();
        const isHq = r === 'hq_admin' || r === 'admin' || !!member.has_hq_access;
        const isDirector = r === 'zone_admin' || r === 'coordinator' || r === 'director';

        if (roleFilter === 'hq_admin' && !isHq) return false;
        if (roleFilter === 'zone_admin' && !isDirector) return false;
        if (roleFilter === 'member' && (isHq || isDirector)) return false;
      }

      // 4. Status filter
      if (statusFilter === 'active' && !member.is_active) return false;
      if (statusFilter === 'inactive' && member.is_active) return false;

      return true;
    });
  }, [members, searchTerm, roleFilter, statusFilter, filterZone, allZones]);

  // Statistics
  const memberStats = useMemo(() => ({
    total: members.length,
    active: members.filter(m => m.is_active).length,
    leadership: members.filter(m => m.role === 'hq_admin' || m.role === 'zone_admin' || m.has_hq_access).length,
    newThisMonth: members.filter(m => {
      const created = new Date(m.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }).length
  }), [members]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '---';
    }
  };

  // Export CSV
  const exportMembers = () => {
    const csvContent = [
      ['Name', 'Email', 'Username / Alias', 'Phone', 'Role', 'Zone', 'Church', 'Designation', 'Status', 'Joined Date'],
      ...filteredMembers.map(m => [
        `"${m.first_name} ${m.last_name}"`,
        `"${m.email}"`,
        `"${m.username || m.alias || ''}"`,
        `"${m.phone || ''}"`,
        `"${m.role || 'member'}"`,
        `"${m.zoneName || ''}"`,
        `"${m.church || ''}"`,
        `"${m.designation || ''}"`,
        `"${m.is_active ? 'Active' : 'Inactive'}"`,
        `"${formatDate(m.created_at)}"`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loveworld-singers-directory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showToast('Member directory exported successfully', 'success');
  };

  const handleRemoveFromZone = async (member: Member) => {
    const zoneName = member.zoneName || currentZone?.name || 'this zone';
    if (!confirm(`Remove ${member.first_name} ${member.last_name} from ${zoneName}?\n\nTheir global portal account will remain intact.`)) {
      return;
    }
    try {
      setLoading(true);
      await apiClient.post(`/profiles/${encodeURIComponent(member.id)}/remove-from-zone`, {});
      showToast(`${member.first_name} removed from ${zoneName}`, 'success');
      loadMembers(true);
      setSelectedMember(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to remove member from zone', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendMember = async (member: Member) => {
    if (!confirm(`Suspend ${member.first_name} ${member.last_name}? They will temporarily not be able to log in.`)) return;
    try {
      setLoading(true);
      await apiClient.post(`/profiles/${encodeURIComponent(member.id)}/suspend`, {});
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: false, status: 'suspended' } : m));
      showToast(`${member.first_name}'s account suspended`, 'info');
      setSelectedMember(null);
    } catch (err: any) {
      showToast(friendlyMemberError(err) || 'Failed to suspend member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBanMember = async (member: Member) => {
    if (!confirm(`PERMANENTLY BAN ${member.first_name} ${member.last_name} from the platform?`)) return;
    try {
      setLoading(true);
      await apiClient.post(`/profiles/${encodeURIComponent(member.id)}/ban`, {});
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: false, status: 'banned' } : m));
      showToast(`${member.first_name} has been banned`, 'error');
      setSelectedMember(null);
    } catch (err: any) {
      showToast(friendlyMemberError(err) || 'Failed to ban member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateMember = async (member: Member) => {
    try {
      setLoading(true);
      await apiClient.post(`/profiles/${encodeURIComponent(member.id)}/reactivate`, {});
      setMembers(prev => prev.map(m => m.id === member.id ? { ...m, is_active: true, status: 'active' } : m));
      showToast(`${member.first_name}'s account reactivated ?`, 'success');
      setSelectedMember(null);
    } catch (err: any) {
      showToast(friendlyMemberError(err) || 'Failed to reactivate member', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (member: Member) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${member.first_name} ${member.last_name}? This action cannot be undone.`)) {
      return;
    }
    try {
      setLoading(true);
      await apiClient.delete(`/profiles/${encodeURIComponent(member.id)}`);
      setMembers(prev => prev.filter(m => m.id !== member.id));
      setSelectedMember(null);
      showToast(`${member.first_name} ${member.last_name} deleted successfully`, 'success');
    } catch (err: any) {
      showToast(friendlyMemberError(err) || 'Failed to delete member', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Pending HQ requests — members with pending_hq_approval flag in rawData
  const pendingMembers = useMemo(() => {
    return members.filter(m => {
      const raw = (m as any).rawData || (m as any).raw_data || {};
      return !!raw.pending_hq_approval;
    });
  }, [members]);

  const handleApproveRequest = async (member: Member) => {
    try {
      await apiClient.post(`/profiles/${encodeURIComponent(member.id)}/approve`, {});
      const updatedRaw = { ...((member as any).rawData || {}), pending_hq_approval: false, is_active: true };
      const updated = { ...member, is_active: true, rawData: updatedRaw };
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
      showToast(`${member.first_name} ${member.last_name} approved ?`, 'success');
      setSelectedMember(null);
      membersCache.clear();
    } catch (err: any) {
      showToast(err.message || 'Failed to approve account', 'error');
    }
  };

  const handleRejectRequest = async (member: Member) => {
    // Open the rejection reason modal instead of using window.prompt
    setRejectModal({ member, reason: '' });
  };

  const confirmRejectRequest = async () => {
    const member = rejectModal.member;
    if (!member) return;
    const reason = rejectModal.reason.trim();
    setRejectModal({ member: null, reason: '' });
    try {
      await apiClient.post(`/profiles/${encodeURIComponent(member.id)}/reject`, { reason });
      setMembers(prev => prev.filter(m => m.id !== member.id));
      showToast(`${member.first_name}'s request has been rejected`, 'info');
      setSelectedMember(null);
      membersCache.clear();
    } catch (err: any) {
      showToast(err.message || 'Failed to reject request', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 lg:p-8 space-y-6 scrollbar-hide">
      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[110] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 
          toast.type === 'error' ? 'bg-rose-600 shadow-rose-500/20' : 'bg-slate-900 shadow-slate-900/20'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal.member && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                <UserX className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Reject Join Request</h3>
                <p className="text-xs text-slate-500">{rejectModal.member.first_name} {rejectModal.member.last_name}</p>
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">Reason (optional)</label>
              <textarea
                value={rejectModal.reason}
                onChange={e => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Leave blank to decline without a reason..."
                rows={3}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setRejectModal({ member: null, reason: '' })}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmRejectRequest}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Reject Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphic Command Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Members</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                {members.length} Singers Registered
              </span>
              {pendingMembers.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                  {pendingMembers.length} Pending
                </span>
              )}
            </div>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Manage roles, credentials, and feature access.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadMembers(true)}
            disabled={loading}
            className="p-2.5 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-600 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
          <button
            onClick={exportMembers}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200/80 rounded-2xl text-slate-700 font-bold text-xs transition-all shadow-xs active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Tab Switcher: All Members / Pending HQ Requests */}
      <div className="flex items-center gap-2 bg-white rounded-2xl p-1.5 border border-slate-100 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'all'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeTab === 'pending'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Pending HQ Requests
          {pendingMembers.length > 0 && (
            <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
              activeTab === 'pending' ? 'bg-white text-amber-600' : 'bg-amber-100 text-amber-700'
            }`}>{pendingMembers.length}</span>
          )}
        </button>
      </div>

      {/* Pending Requests Panel */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-3xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-amber-50 bg-amber-50/50">
            <h3 className="text-sm font-black text-amber-900">HQ Group Join Requests</h3>
            <p className="text-[11px] text-amber-700 mt-0.5">These users have applied to join an HQ group and are awaiting approval.</p>
          </div>
          {pendingMembers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <UserCheck className="w-7 h-7 text-amber-400" />
              </div>
              <p className="text-sm font-bold text-slate-700">No Pending Requests</p>
              <p className="text-xs text-slate-400 mt-1">All join requests have been processed.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingMembers.map(member => (
                <div key={member.id} className="flex items-center gap-4 px-6 py-4 hover:bg-amber-50/30 transition-colors">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0">
                    {`${member.first_name?.[0] || 'U'}${member.last_name?.[0] || ''}`.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm">{member.first_name} {member.last_name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                        {(member as any).rawData?.zone_code || (member as any).raw_data?.zone_code || 'HQ Zone'}
                      </span>
                      {member.designation && (
                        <span className="text-[10px] text-slate-400">{member.designation}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleApproveRequest(member)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectRequest(member)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4 Sleek Glassmorphic Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Personnel</p>
            <p className="text-2xl font-black text-slate-900">{memberStats.total.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-xs relative">
            <Zap className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Accounts</p>
            <p className="text-2xl font-black text-slate-900">{memberStats.active.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-fuchsia-50 text-fuchsia-600 flex items-center justify-center font-bold shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leadership & HQ</p>
            <p className="text-2xl font-black text-slate-900">{memberStats.leadership.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-4 lg:p-5 border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New This Month</p>
            <p className="text-2xl font-black text-slate-900">{memberStats.newThisMonth.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Search & Filter Command Bar */}
      <div className="bg-white rounded-3xl p-3 lg:p-4 border border-slate-100 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by full name, email, @alias, username, church, designation..."
              className="w-full pl-11 pr-9 py-2.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
            {[
              { id: 'all', label: 'All Roles' },
              { id: 'hq_admin', label: 'HQ Executive' },
              { id: 'zone_admin', label: 'Zone Directors' },
              { id: 'member', label: 'Singers' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id as any)}
                className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  roleFilter === r.id
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-200'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-200/60 flex-shrink-0">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'inactive', label: 'Inactive' },
            ].map(s => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id as any)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                  statusFilter === s.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global HQ Zone Pills (when in HQ view) */}
        {currentZone && isHQGroup(currentZone.id) && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pt-1 border-t border-slate-100">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex-shrink-0 pl-1">
              Zone Filter:
            </span>
            <button
              onClick={() => setFilterZone('all')}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                filterZone === 'all'
                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-extrabold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Zones ({members.length})
            </button>
            {allZones.filter(z => z.id !== 'zone-boss').map(z => {
              const count = members.filter(m => m.zoneId === z.id || m.zoneId === z.invitationCode).length;
              return (
                <button
                  key={z.id}
                  onClick={() => setFilterZone(z.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                    filterZone === z.id
                      ? 'bg-purple-50 text-purple-700 border border-purple-200 font-extrabold'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.themeColor || '#9333ea' }} />
                  <span>{z.name.replace('Loveworld Singers ', '').replace('LWS ', '')}</span>
                  <span className="text-[10px] text-slate-400 font-normal">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Active Filters Bar */}
        {(searchTerm || roleFilter !== 'all' || statusFilter !== 'all' || filterZone !== 'all') && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Showing:</span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-extrabold text-[11px]">
                {filteredMembers.length} of {members.length} personnel matching
              </span>
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setRoleFilter('all');
                setStatusFilter('all');
                setFilterZone('all');
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Directory Table View */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 flex justify-center">
            <CustomLoader />
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="py-24 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
              <Users className="w-9 h-9 text-slate-300" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1">No Personnel Found</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              {searchTerm ? 'No members match the active search criteria.' : 'No members registered in this scope yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-5">Member & Alias</th>
                  <th className="py-3.5 px-5">Contact Details</th>
                  <th className="py-3.5 px-5">Zone & Assembly</th>
                  <th className="py-3.5 px-5">Role & Access</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredMembers.slice(0, displayLimit).map((member) => {
                  const initial = `${member.first_name?.[0] || 'M'}${member.last_name?.[0] || ''}`.toUpperCase();
                  const isHq = member.role === 'hq_admin' || member.has_hq_access;
                  const isDirector = member.role === 'zone_admin' || member.role === 'coordinator';

                  return (
                    <tr
                      key={member.id}
                      onClick={() => setSelectedMember(member)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* Name & Alias */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {member.profile_image_url ? (
                              <img
                                src={member.profile_image_url}
                                alt=""
                                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-white shadow-xs"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                                {initial}
                              </div>
                            )}
                            {member.is_active && (
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white absolute -bottom-0.5 -right-0.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {member.first_name} {member.last_name}
                              </p>
                              {member.alias && (
                                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  @{member.alias}
                                </span>
                              )}
                            </div>
                            {member.username && member.username !== member.alias && (
                              <p className="text-[10px] text-slate-400 font-normal">username: {member.username}</p>
                            )}
                            {member.designation && (
                              <p className="text-[10px] text-slate-500 font-medium truncate">{member.designation}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="py-4 px-5">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[180px]">{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-300 flex-shrink-0" />
                              <span>{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Zone & Assembly */}
                      <td className="py-4 px-5">
                        <div>
                          <p className="font-bold text-slate-800">{member.zoneName || 'HQ Ministry'}</p>
                          <p className="text-[10px] text-slate-400 font-normal truncate max-w-[140px]">
                            {member.church || member.administration || 'Global Fellowship'}
                          </p>
                        </div>
                      </td>

                      {/* Role & Access */}
                      <td className="py-4 px-5">
                        <div className="flex flex-col gap-1 items-start">
                          {isHq ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">
                              <ShieldCheck className="w-3 h-3 text-purple-600" />
                              HQ Admin
                            </span>
                          ) : isDirector ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Shield className="w-3 h-3 text-indigo-600" />
                              Zone Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">
                              Singer
                            </span>
                          )}
                          {member.canAnnotate && (
                            <span className="px-2 py-0.2 rounded-md text-[9px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                              Annotator
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          member.is_active
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${member.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {member.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedMember(member)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"
                            title="Manage Profile & Credentials"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleRemoveFromZone(member)}
                            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all active:scale-95"
                            title="Remove from Zone"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(member)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                            title="Delete Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Load More Pagination */}
        {filteredMembers.length > displayLimit && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-center">
            <button
              onClick={() => setDisplayLimit(prev => prev + 50)}
              className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-2xl hover:bg-slate-100 transition-all shadow-xs active:scale-95"
            >
              Load More Singers ({filteredMembers.length - displayLimit} remaining)
            </button>
          </div>
        )}
      </div>

      {/* Member Management Slide-Over Drawer */}
      {selectedMember && (
        <MemberManagementDrawer
          key={selectedMember.id}
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          setMembers={setMembers}
          setSelectedMember={setSelectedMember}
          showToast={showToast}
          onRemoveFromZone={handleRemoveFromZone}
          onApprove={handleApproveRequest}
          onReject={handleRejectRequest}
          allZones={allZones}
        />
      )}
    </div>
  );
}

// Enterprise Slide-Over Drawer
function MemberManagementDrawer({
  member,
  onClose,
  setMembers,
  setSelectedMember,
  showToast,
  onRemoveFromZone,
  onApprove,
  onReject,
  allZones,
}: {
  member: Member;
  onClose: () => void;
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  setSelectedMember: React.Dispatch<React.SetStateAction<Member | null>>;
  showToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  onRemoveFromZone: (member: Member) => Promise<void>;
  onApprove?: (member: Member) => Promise<void>;
  onReject?: (member: Member) => Promise<void>;
  allZones?: any[];
}) {
  const { user: currentUser, profile: currentProfile } = useAuth();
  const { capabilities: orgCapabilities, isSuperAdmin: orgIsSuperAdmin } = useOrganizationStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'credentials' | 'visibility'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const isPendingApproval = !!((member as any).rawData?.pending_hq_approval || (member as any).raw_data?.pending_hq_approval);

  const initialHidden = (member.hiddenFeatures || (member as any).hidden_features || {}) as Record<string, boolean>;
  const isSpecialMemberInitial = member.role === 'admin' || member.role === 'boss' || member.role === 'hq_admin';
  const hasArchiveInitial = !!(member as any).can_access_archive || !!(member as any).has_hq_access || isSpecialMemberInitial;
  const hasPreRehearsalInitial = !!(member as any).can_access_pre_rehearsal || !!(member as any).canAccessPreRehearsal;
  const hasAnnotateInitial = !!(member as any).canAnnotate || !!(member as any).can_annotate || !!(member as any).canUseAnnotation;

  const [hiddenFeatures, setHiddenFeatures] = useState<Record<string, boolean>>({
    hideOngoing: !!initialHidden.hideOngoing,
    hidePreRehearsal: initialHidden.hidePreRehearsal !== undefined ? !!initialHidden.hidePreRehearsal : !hasPreRehearsalInitial,
    hideArchives: initialHidden.hideArchives !== undefined ? !!initialHidden.hideArchives : !hasArchiveInitial,
    hideAudioLab: !!initialHidden.hideAudioLab,
    hideLexicon: !!initialHidden.hideLexicon,
    hideSubgroups: !!initialHidden.hideSubgroups,
    hideSubmissions: !!initialHidden.hideSubmissions,
    hideHistory: !!initialHidden.hideHistory,
    hideMinisteredSongs: !!initialHidden.hideMinisteredSongs,
    hideWarmups: !!initialHidden.hideWarmups,
    hideAnnotations: initialHidden.hideAnnotations !== undefined ? !!initialHidden.hideAnnotations : !hasAnnotateInitial,
  });

  const [editForm, setEditForm] = useState<Partial<Member>>({ ...member });
  const adminPermissions = getAdminPermissions(
    currentProfile?.role || currentUser?.role,
    currentProfile?.hasHqAccess === true || (currentProfile as any)?.has_hq_access === true,
  );
  const canEditMemberDetails = adminPermissions.canAccessAdmin ||
    orgCapabilities.canManageOrganization || orgCapabilities.canManagePlatform || orgIsSuperAdmin;
  const canManageMemberFeatures = adminPermissions.canAccessAdmin ||
    orgCapabilities.canManageOrganization || orgCapabilities.canManagePlatform || orgIsSuperAdmin;

  useEffect(() => {
    const raw = (member as any).rawData || {};
    const h = (member.hiddenFeatures || (member as any).hidden_features || raw.hiddenFeatures || raw.hidden_features || {}) as Record<string, boolean>;
    const isSpecialMember = member.role === 'admin' || member.role === 'boss' || member.role === 'hq_admin';
    const hasArchive = !!(member as any).can_access_archive || !!raw.can_access_archive || !!(member as any).has_hq_access || !!raw.has_hq_access || isSpecialMember;
    const hasPreRehearsal = !!(member as any).can_access_pre_rehearsal || !!raw.can_access_pre_rehearsal || !!raw.canAccessPreRehearsal;
    const hasAnnotate = !!(member as any).canAnnotate || !!raw.canAnnotate || !!raw.can_annotate || !!raw.canUseAnnotation;

    setHiddenFeatures({
      hideOngoing: !!h.hideOngoing,
      hidePreRehearsal: h.hidePreRehearsal !== undefined ? !!h.hidePreRehearsal : !hasPreRehearsal,
      hideArchives: h.hideArchives !== undefined ? !!h.hideArchives : !hasArchive,
      hideAudioLab: !!h.hideAudioLab,
      hideLexicon: !!h.hideLexicon,
      hideSubgroups: !!h.hideSubgroups,
      hideSubmissions: !!h.hideSubmissions,
      hideHistory: !!h.hideHistory,
      hideMinisteredSongs: !!h.hideMinisteredSongs,
      hideWarmups: !!h.hideWarmups,
      hideAnnotations: h.hideAnnotations !== undefined ? !!h.hideAnnotations : !hasAnnotate,
    });
    setEditForm({ ...member });
    setNewPassword('');
    setIsDirty(false);
  }, [member]);

  const handleSave = async () => {
    if (!canEditMemberDetails) return;

    setLoading(true);
    try {
      const payload: Record<string, any> = {
        first_name: editForm.first_name,
        last_name: editForm.last_name,
        email: editForm.email?.trim().toLowerCase(),
        username: editForm.username?.trim().toLowerCase(),
        alias: editForm.alias?.trim().toLowerCase(),
        phone_number: editForm.phone,
        church: editForm.church,
        designation: editForm.designation,
        role: editForm.role,
        has_hq_access: editForm.has_hq_access || editForm.role === 'hq_admin',
        can_access_archive: !hiddenFeatures.hideArchives,
        can_access_pre_rehearsal: !hiddenFeatures.hidePreRehearsal,
        canAnnotate: !hiddenFeatures.hideAnnotations,
        can_annotate: !hiddenFeatures.hideAnnotations,
        zone_code: editForm.zoneId || (editForm as any).zone_code,
        hidden_features: hiddenFeatures,
      };

      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }

      const res = await apiClient.patch<{ success: boolean; error?: string; data?: any }>(
        `/profiles/${encodeURIComponent(member.id)}`,
        payload
      );

      if (res?.success === false) {
        throw new Error(res.error || 'Failed to update member profile');
      }

      const updatedMember: Member = {
        ...member,
        ...editForm,
        hiddenFeatures,
      };

      setMembers(prev => prev.map(m => m.id === member.id ? updatedMember : m));
      setSelectedMember(updatedMember);
      setIsEditing(false);
      setNewPassword('');
      setIsDirty(false);
      showToast('Profile, credentials, and visibility saved successfully', 'success');
    } catch (error: any) {
      console.error('Error updating member:', error);
      showToast(error?.message || 'Failed to update member profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFeature = async (featureKey: string) => {
    if (!canManageMemberFeatures) return;

    const nextHidden = { ...hiddenFeatures, [featureKey]: !hiddenFeatures[featureKey] };
    setHiddenFeatures(nextHidden);
    setIsDirty(true);
    try {
      await apiClient.patch(`/profiles/${encodeURIComponent(member.id)}`, {
        hidden_features: nextHidden,
        can_access_archive: !nextHidden.hideArchives,
        can_access_pre_rehearsal: !nextHidden.hidePreRehearsal,
        canAnnotate: !nextHidden.hideAnnotations,
        can_annotate: !nextHidden.hideAnnotations,
      });
      const updated = { ...member, hiddenFeatures: nextHidden };
      setMembers(prev => prev.map(m => m.id === member.id ? updated : m));
      setSelectedMember(updated);
      showToast('Feature visibility updated', 'success');
    } catch {
      showToast('Failed to update feature visibility', 'error');
    }
  };

  const isHqUser = canEditMemberDetails;

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => {
        if (isDirty && !window.confirm('You have unsaved changes. Close without saving?')) return;
        onClose();
      }} />

      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md lg:max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isDirty && !window.confirm('You have unsaved changes. Close without saving?')) return;
                  onClose();
                }}
                className="p-2 hover:bg-slate-200/70 rounded-2xl transition-colors text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-sm font-black text-slate-900">Member Profile & Access</h3>
                <p className="text-[11px] text-slate-400">ID: {member.id.substring(0, 10)}...</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                member.is_active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
              }`}>
                {member.is_active !== false ? '? Active' : '? Inactive'}
              </span>
            </div>
          </div>

          {/* Scrollable Single-View Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {/* ?? Hero Identity Overview */}
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-md shadow-indigo-200 overflow-hidden flex-shrink-0">
                {member.profile_image_url ? (
                  <img src={member.profile_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  `${member.first_name?.[0] || 'M'}${member.last_name?.[0] || ''}`.toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-black text-slate-900 truncate">
                  {editForm.first_name || member.first_name} {editForm.last_name || member.last_name}
                </h4>
                <p className="text-xs text-slate-500 truncate">{editForm.email || member.email}</p>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {editForm.zoneName || member.zoneName || 'HQ Umbrella'}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-200/70 text-slate-700">
                    {editForm.role === 'hq_admin' ? '?? HQ Admin' : editForm.role === 'church_coordinator' ? '? Church Coordinator' : '?? Choir Member'}
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Approval Alert inside Drawer */}
            {isPendingApproval && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-3xl flex items-center justify-between gap-3 text-left">
                <div>
                  <p className="text-xs font-black text-amber-900">Awaiting HQ Approval</p>
                  <p className="text-[11px] text-amber-700">Requested Zone: {(member as any).rawData?.zone_code || member.zoneId || 'HQ'}</p>
                </div>
                <div className="flex items-center gap-2">
                  {onApprove && (
                    <button
                      onClick={() => onApprove(member)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Approve
                    </button>
                  )}
                  {onReject && (
                    <button
                      onClick={() => onReject(member)}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ?? Section 1: Identity & Group Assignment */}
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">1. Identity & Assignment</h5>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">First Name</label>
                  <input
                    type="text"
                    value={editForm.first_name || ''}
                    onChange={e => { setEditForm(p => ({ ...p, first_name: e.target.value })); setIsDirty(true); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={editForm.last_name || ''}
                    onChange={e => { setEditForm(p => ({ ...p, last_name: e.target.value })); setIsDirty(true); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Primary Email</label>
                  <input
                    type="email"
                    value={editForm.email || ''}
                    onChange={e => { setEditForm(p => ({ ...p, email: e.target.value })); setIsDirty(true); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={e => { setEditForm(p => ({ ...p, phone: e.target.value })); setIsDirty(true); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Church Assembly / City</label>
                  <input
                    type="text"
                    value={editForm.church || ''}
                    onChange={e => { setEditForm(p => ({ ...p, church: e.target.value })); setIsDirty(true); }}
                    placeholder="e.g. Central Church"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Vocal Part / Designation</label>
                  <input
                    type="text"
                    value={editForm.designation || ''}
                    onChange={e => { setEditForm(p => ({ ...p, designation: e.target.value })); setIsDirty(true); }}
                    placeholder="e.g. Soprano, Tenor, Band Lead"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* HQ Sub-unit & Chapter Dropdown */}
              {isHqUser && allZones && allZones.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Assigned Organization / HQ Sub-Unit</label>
                  <select
                    value={editForm.zoneId || (editForm as any).zone_code || ''}
                    onChange={e => {
                      const newZoneCode = e.target.value;
                      const matched = allZones.find(z => z.invitationCode === newZoneCode || z.id === newZoneCode);
                      setEditForm(p => ({
                        ...p,
                        zoneId: newZoneCode,
                        zoneName: matched?.name || newZoneCode
                      }));
                      setIsDirty(true);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <optgroup label="?? Headquarters Umbrella (Shared HQ)">
                      {allZones.filter(z => z.region === 'Headquarters' || z.id.startsWith('zone-00') || z.id.startsWith('zone-p') || z.id.startsWith('zone-orch') || z.id.startsWith('zone-dir') || z.id.startsWith('zone-of')).map(z => (
                        <option key={z.id} value={z.invitationCode || z.id}>
                          {z.id === 'zone-001' ? 'Your Loveworld Singers (HQ Core)' :
                           z.id === 'zone-president' ? 'The President Zone (HQ)' :
                           z.id === 'zone-director' ? 'The Director Zone (HQ)' :
                           z.id === 'zone-005' ? 'Presidential Mass Choir (HQ)' :
                           z.id === 'zone-orchestra' ? 'Loveworld Singers Orchestra (HQ)' :
                           z.id === 'zone-002' ? 'Loveworld Singers 24 Worship Band (HQ)' :
                           z.id === 'zone-004' ? 'Loveworld Singers Teens Choir (HQ)' :
                           z.id === 'zone-oftp' ? 'OFTP Pastors Zone (HQ)' :
                           z.name} ({z.invitationCode})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="?? Regional Churches & Chapters">
                      {allZones.filter(z => z.region !== 'Headquarters' && !z.id.startsWith('zone-00') && !z.id.startsWith('zone-p') && !z.id.startsWith('zone-orch') && !z.id.startsWith('zone-dir') && !z.id.startsWith('zone-of') && z.id !== 'zone-boss').map(z => (
                        <option key={z.id} value={z.invitationCode || z.id}>
                          {z.name} ({z.invitationCode})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
              )}

              {/* Privilege Role Selector */}
              {isHqUser && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Administrative Privilege Level</label>
                  <select
                    value={editForm.role || 'member'}
                    onChange={e => { setEditForm(p => ({
                      ...p,
                      role: e.target.value,
                      has_hq_access: e.target.value === 'hq_admin' || e.target.value === 'super_admin'
                    })); setIsDirty(true); }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="member">Choir Member (Standard Singer Access)</option>
                    <option value="church_coordinator">Church Coordinator (Local Church Scope)</option>
                    <option value="zone_coordinator">Zonal Coordinator (Regional Zone Lead)</option>
                    <option value="hq_admin">HQ Admin (Global Executive Access)</option>
                  </select>
                </div>
              )}
            </div>

            {/* ?? Section 2: Password & Credentials */}
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">2. Credentials & Password</h5>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">System Username</label>
                  <input
                    type="text"
                    value={editForm.username || ''}
                    onChange={e => { setEditForm(p => ({ ...p, username: e.target.value })); setIsDirty(true); }}
                    placeholder="e.g. president, director"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Login Alias (@)</label>
                  <input
                    type="text"
                    value={editForm.alias || ''}
                    onChange={e => { setEditForm(p => ({ ...p, alias: e.target.value })); setIsDirty(true); }}
                    placeholder="e.g. president, director"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {isHqUser && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Assign New Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={e => { setNewPassword(e.target.value); setIsDirty(true); }}
                      placeholder="Leave blank to keep current password..."
                      className="w-full px-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ?? Section 3: Administrative Controls (Web Studio) */}
            {(editForm.role === 'hq_admin' || editForm.role === 'church_coordinator' || editForm.role === 'zone_coordinator' || editForm.role === 'admin') && (
              <div className="space-y-3.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-amber-600" />
                    <h5 className="text-xs font-black text-amber-950 uppercase tracking-wider">3. Administrative Controls</h5>
                  </div>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                    {editForm.role === 'hq_admin' ? 'HQ Scope' : 'Local Church Scope'}
                  </span>
                </div>

                <div className="rounded-2xl bg-amber-50/50 border border-amber-200/60 p-4 divide-y divide-amber-200/40">
                  {[
                    { key: 'canManageMasterLibrary', title: 'Master Song Library', desc: 'Add, arrange, and edit catalog songs' },
                    { key: 'canManageMedia', title: 'Media & Stems Studio', desc: 'Upload and manage rehearsal stems & video streams' },
                    { key: 'canManageSchedules', title: 'Schedule & Callouts', desc: 'Build rehearsal rosters and timelines' },
                    { key: 'canManageMembers', title: 'Member Directory & Access', desc: 'Manage member credentials and feature matrix' },
                    { key: 'canManageAttendance', title: 'Attendance & Check-in', desc: 'View live attendance and monitor rehearsal logs' },
                  ].map(adm => {
                    const isHidden = hiddenFeatures[`hideAdmin_${adm.key}`];
                    return (
                      <div key={adm.key} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{adm.title}</p>
                          <p className="text-[10px] text-slate-500">{adm.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleFeature(`hideAdmin_${adm.key}`)}
                          disabled={!canManageMemberFeatures}
                          className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center flex-shrink-0 border ${
                            !isHidden
                              ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                              : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                          } ${!canManageMemberFeatures ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ?? Section 4: Singer Repertoire & Features (Web + Mobile App) */}
            <div className="space-y-3.5 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">4. Singer Repertoire & Features</h5>
                </div>
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                  Web & Mobile App
                </span>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 divide-y divide-slate-200/60">
                {[
                  { key: 'hideOngoing', title: 'Ongoing Programs', desc: 'Current scheduled praise nights & live programs', isOffDefault: false },
                  { key: 'hideAudioLab', title: 'AudioLab & Multitrack Player', desc: 'Vocal stem isolation (Soprano, Alto, Tenor, Bass, Band)', isOffDefault: false },
                  { key: 'hideSubmissions', title: 'Song Submissions', desc: 'Original ministered song submissions', isOffDefault: false },
                  { key: 'hideLexicon', title: 'Lexicon AI Module', desc: 'Pronunciation and lyrics glossary dictionary', isOffDefault: false },
                  { key: 'hideWarmups', title: 'Vocal Warm-ups', desc: 'Breathing exercises and vocal routines', isOffDefault: false },
                  { key: 'hideSubgroups', title: 'Choir Sub-Groups', desc: 'Choir departments and fellowship channels', isOffDefault: false },
                  { key: 'hidePreRehearsal', title: 'Pre-Rehearsal Sets', desc: 'Upcoming Praise Night setlists (Off by default)', isOffDefault: true },
                  { key: 'hideAnnotations', title: 'Song Annotations & Pen Tool', desc: 'Draw and highlight on song sheets (Off by default)', isOffDefault: true },
                  { key: 'hideArchives', title: 'Song & Program Archives', desc: 'Past ministered songs and historical archives (Off by default)', isOffDefault: true },
                ].map(f => {
                  const isHidden = hiddenFeatures[f.key];
                  return (
                    <div key={f.key} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{f.title}</p>
                          {f.isOffDefault && (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-200/70 px-1.5 py-0.2 rounded">
                              Restricted
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">{f.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFeature(f.key)}
                        disabled={!canManageMemberFeatures}
                        aria-disabled={!canManageMemberFeatures}
                        title={canManageMemberFeatures ? `Toggle ${f.title}` : 'Feature visibility is read-only for this role'}
                        className={`w-6 h-6 rounded-lg transition-all flex items-center justify-center flex-shrink-0 border ${
                          !isHidden
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                            : 'bg-white border-slate-300 text-transparent hover:border-slate-400'
                        } ${!canManageMemberFeatures ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ?? Sticky Bottom Action Bar */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 sticky bottom-0 z-10">
            <button
              onClick={() => onRemoveFromZone(member)}
              disabled={!canEditMemberDetails}
              className="px-3.5 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-2xl transition-all cursor-pointer"
            >
              Remove
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (isDirty && !window.confirm('You have unsaved changes. Close without saving?')) return;
                  onClose();
                }}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-2xl transition-all cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleSave}
                disabled={loading || !canEditMemberDetails}
                className="px-6 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl transition-all shadow-md shadow-indigo-200 active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
