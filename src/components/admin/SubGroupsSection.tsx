"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UsersRound, Search, Clock, RefreshCw, CheckCircle, X, Plus, 
  Layers, Shield, User, ArrowRight, Check, XCircle, ChevronRight,
  Sparkles, Filter, Building2
} from 'lucide-react';
import { adminApi as apiClient } from '@/lib/admin-api';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import CustomLoader from '@/components/CustomLoader';
import { Toast } from '@/components/Toast';
import { matchesSearchTokens } from '@/utils/string-utils';

// Sub-components
import { SubGroupRow } from './subgroups/SubGroupRow';
import { RejectModal } from './subgroups/RejectModal';
import { SubGroupDetailModal } from './subgroups/SubGroupDetailModal';

export interface SubGroup { 
  [key: string]: any; 
  id: string; 
  name: string; 
  type: string; 
  status: string; 
  memberCount?: number;
  memberIds?: string[];
  coordinatorName?: string;
  coordinatorId?: string;
  description?: string;
  zoneId?: string;
}

interface SubGroupsSectionProps {
  addToast: (toast: Omit<Toast, 'id'>) => void;
}

export default function SubGroupsSection({ addToast }: SubGroupsSectionProps) {
  const { selectedZoneId, isGlobalView, selectedZone } = useAdminZone();
  const effectiveZoneId = isGlobalView ? null : (selectedZoneId || selectedZone?.id || null);

  const [subGroups, setSubGroups] = useState<SubGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active'>('all');
  const [selectedSubGroup, setSelectedSubGroup] = useState<SubGroup | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Create Church Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupType, setNewGroupType] = useState('church');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupCoord, setNewGroupCoord] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);

  const fetchSubGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = effectiveZoneId 
        ? `/subgroups?zoneId=${encodeURIComponent(effectiveZoneId)}` 
        : '/subgroups';
      
      const [sgRes, adminReqRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: any[] }>(url).catch(() => ({ data: [] })),
        apiClient.get<{ success: boolean; data: any[] }>('/members/admin-requests').catch(() => ({ data: [] })),
      ]);

      const sgList: SubGroup[] = (Array.isArray(sgRes?.data) ? sgRes.data : []).map((sg: any) => ({
        ...sg,
        type: sg.type || 'church',
        status: sg.status || 'active',
      }));

      const adminReqs: SubGroup[] = (Array.isArray(adminReqRes?.data) ? adminReqRes.data : [])
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({
          ...r,
          id: r.id,
          name: `${r.userName || r.userEmail || 'User'} (${r.requestedRole || 'Coordinator'})`,
          type: 'role_request',
          status: 'pending',
          coordinatorName: r.userName || r.userEmail,
          coordinatorEmail: r.userEmail,
          description: r.reason || `Requested role upgrade: ${r.requestedRole}`,
          zoneId: r.zoneId || r.zoneCode || 'global',
          isRoleRequest: true,
        }));

      setSubGroups([...sgList, ...adminReqs.filter(ar => !sgList.some(sg => sg.id === ar.id))]);
    } catch (err) {
      console.error('Error fetching churches:', err);
      setSubGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, [effectiveZoneId]);

  useEffect(() => {
    fetchSubGroups();
  }, [fetchSubGroups]);

  const activeSubGroups = useMemo(() => subGroups.filter(sg => sg.status === 'active' || !sg.status), [subGroups]);
  const pendingSubGroups = useMemo(() => subGroups.filter(sg => sg.status === 'pending'), [subGroups]);
  const pendingCount = pendingSubGroups.length;

  // Tokenized multi-word search & filtering
  const filteredGroups = useMemo(() => {
    return subGroups.filter((sg: any) => {
      if (activeTab === 'pending' && sg.status !== 'pending') return false;
      if (activeTab === 'active' && sg.status !== 'active' && sg.status) return false;

      if (!searchQuery.trim()) return true;
      return matchesSearchTokens(
        [
          sg.name,
          sg.coordinatorName,
          sg.coordinatorEmail,
          sg.description,
          sg.type,
          sg.zoneId
        ],
        searchQuery
      );
    });
  }, [subGroups, activeTab, searchQuery]);

  const handleApprove = async (id: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const targetGroup = subGroups.find(sg => sg.id === id);
      let res;
      if (targetGroup?.isRoleRequest) {
        res = await apiClient.post<{ success: boolean; message?: string }>(`/members/admin-requests/${encodeURIComponent(id)}/approve`);
      } else {
        res = await apiClient.post<{ success: boolean; message?: string }>(`/subgroups/${encodeURIComponent(id)}/approve`);
      }

      if (res?.success !== false) {
        addToast({ message: 'Approved successfully!', type: 'success' });
        setSubGroups(prev => prev.map(sg => sg.id === id ? { ...sg, status: 'active' } : sg));
        if (selectedSubGroup?.id === id) {
          setSelectedSubGroup(prev => prev ? { ...prev, status: 'active' } : null);
        }
      } else {
        addToast({ message: 'Failed to approve request', type: 'error' });
      }
    } catch {
      addToast({ message: 'Failed to approve request', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectModal = (subGroup: SubGroup) => {
    setSelectedSubGroup(subGroup);
    setRejectReason('');
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!selectedSubGroup || !rejectReason.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      let res;
      if (selectedSubGroup?.isRoleRequest) {
        res = await apiClient.post<{ success: boolean; message?: string }>(
          `/members/admin-requests/${encodeURIComponent(selectedSubGroup.id)}/reject`,
          { reason: rejectReason.trim() }
        );
      } else {
        res = await apiClient.post<{ success: boolean; message?: string }>(
          `/subgroups/${encodeURIComponent(selectedSubGroup.id)}/reject`,
          { reason: rejectReason.trim() }
        );
      }
      if (res?.success !== false) {
        addToast({ message: 'Request rejected.', type: 'info' });
        setSubGroups(prev => prev.map(sg => sg.id === selectedSubGroup.id ? { ...sg, status: 'rejected' } : sg));
        setIsRejectModalOpen(false);
        setIsDetailModalOpen(false);
        setSelectedSubGroup(null);
      } else {
        addToast({ message: 'Failed to reject request', type: 'error' });
      }
    } catch {
      addToast({ message: 'Failed to reject request', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateSubGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setIsSubmittingCreate(true);
    try {
      const res = await apiClient.post<any>('/subgroups', {
        name: newGroupName.trim(),
        type: newGroupType,
        description: newGroupDesc.trim(),
        coordinatorName: newGroupCoord.trim(),
        zoneId: effectiveZoneId || 'global',
        status: 'active',
      });
      if (res?.success !== false) {
        addToast({ message: `Church "${newGroupName}" created!`, type: 'success' });
        setIsCreateModalOpen(false);
        setNewGroupName('');
        setNewGroupDesc('');
        setNewGroupCoord('');
        await fetchSubGroups();
      } else {
        addToast({ message: 'Failed to create church', type: 'error' });
      }
    } catch {
      addToast({ message: 'Failed to create church', type: 'error' });
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const openDetailModal = (subGroup: SubGroup) => {
    setSelectedSubGroup(subGroup);
    setIsDetailModalOpen(true);
  };

  if (isLoading && subGroups.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[400px]">
        <CustomLoader message="Loading churches..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden font-sans">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-7 space-y-4">

        {/* ── UNIFIED HIGH-DENSITY COMMAND HEADER ── */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title & Scope */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-black text-slate-900 tracking-tight">Churches Directory</h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse" />
                  {isGlobalView ? 'HQ Scope' : selectedZone?.name || 'Zone'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Local church choir units and choir leader management
              </p>
            </div>
          </div>

          {/* Right Controls: Tabs + Search + Action Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0">
              {[
                { id: 'all', label: 'All', count: subGroups.length },
                { id: 'active', label: 'Active', count: activeSubGroups.length },
                { id: 'pending', label: 'Pending', count: pendingCount, highlight: pendingCount > 0 }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    activeTab === tab.id
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                    tab.highlight 
                      ? 'bg-amber-500 text-white animate-pulse'
                      : activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search churches, leaders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Create & Refresh Buttons */}
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Church</span>
            </button>

            <button
              onClick={fetchSubGroups}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
              title="Refresh churches"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── CHURCH CARDS LIST ── */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {filteredGroups.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredGroups.map((sg) => (
                <SubGroupRow
                  key={sg.id}
                  subGroup={sg}
                  onApprove={() => handleApprove(sg.id)}
                  onReject={() => openRejectModal(sg)}
                  onView={() => openDetailModal(sg)}
                  processing={isProcessing}
                />
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-purple-100 text-purple-600">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-800">No Churches Found</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
                {activeTab === 'pending'
                  ? 'There are currently no pending church approval requests for this zone.'
                  : 'No churches match your current search criteria.'}
              </p>
              <div className="mt-4">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-transform active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Church</span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ── CREATE CHURCH MODAL ── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">Create Church</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Add a new church choir unit</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubGroup} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">Church Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Christ Embassy Airport, CE Central Church"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">Category Type</label>
                <select
                  value={newGroupType}
                  onChange={(e) => setNewGroupType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                >
                  <option value="church">Church Choir Unit</option>
                  <option value="campus">Campus Ministry Ensemble</option>
                  <option value="youth">Youth Choir Group</option>
                  <option value="cell">Cell Fellowship Band</option>
                  <option value="other">Specialized Department</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">Leader / Coordinator Name</label>
                <input
                  type="text"
                  placeholder="e.g. Pastor Grace Smith"
                  value={newGroupCoord}
                  onChange={(e) => setNewGroupCoord(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of church choir focus..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate || !newGroupName.trim()}
                  className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isSubmittingCreate ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Create Church'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}
      {isRejectModalOpen && selectedSubGroup && (
        <RejectModal
          subGroup={selectedSubGroup}
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={handleReject}
          onClose={() => setIsRejectModalOpen(false)}
          processing={isProcessing}
        />
      )}

      {isDetailModalOpen && selectedSubGroup && (
        <SubGroupDetailModal
          subGroup={selectedSubGroup}
          onApprove={() => handleApprove(selectedSubGroup.id)}
          onReject={() => openRejectModal(selectedSubGroup)}
          onClose={() => setIsDetailModalOpen(false)}
          processing={isProcessing}
        />
      )}
    </div>
  );
}
