"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  UsersRound,
  Building2,
  GraduationCap,
  Users,
  Sparkles,
  MoreHorizontal,
  Send,
  X,
  CheckCircle,
  Clock,
  XCircle,
  RefreshCw,
  Plus,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '@/stores/authStore';
import { useZone } from '@/hooks/useZone';
import { apiClient } from '@/lib/api-client';

type SubGroupType = 'church' | 'campus' | 'cell' | 'youth' | 'other' | 'zone' | 'hq' | 'custom';
type SubGroupStatus = 'pending' | 'approved' | 'rejected' | 'active';

const TYPE_OPTIONS: { value: SubGroupType; label: string; icon: React.ReactNode; description: string }[] = [
  { value: 'church', label: 'Church Choir', icon: <Building2 className="w-5 h-5" />, description: 'A choir within a local church' },
  { value: 'campus', label: 'Campus Fellowship', icon: <GraduationCap className="w-5 h-5" />, description: 'University or college fellowship group' },
  { value: 'cell', label: 'Cell Group', icon: <Users className="w-5 h-5" />, description: 'Small group or home cell' },
  { value: 'youth', label: 'Youth Choir', icon: <Sparkles className="w-5 h-5" />, description: 'Youth ministry choir' },
  { value: 'other', label: 'Other', icon: <MoreHorizontal className="w-5 h-5" />, description: 'Other type of group' }
];

const STATUS_CONFIG: Record<SubGroupStatus, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Pending Approval', 
    color: 'text-amber-700', 
    bgColor: 'bg-amber-100',
    icon: <Clock className="w-4 h-4" /> 
  },
  approved: { label: 'Approved', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: <CheckCircle className="w-4 h-4" /> },
  active: { 
    label: 'Active', 
    color: 'text-emerald-700', 
    bgColor: 'bg-emerald-100',
    icon: <CheckCircle className="w-4 h-4" /> 
  },
  rejected: { 
    label: 'Rejected', 
    color: 'text-rose-700', 
    bgColor: 'bg-rose-100',
    icon: <XCircle className="w-4 h-4" /> 
  }
};

export default function RequestSubGroupForm() {
  const { user, profile } = useAuth();
  const { currentZone } = useZone();
  
  const [userRequests, setUserRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'church' as SubGroupType,
    description: '',
    estimatedMembers: 10
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadRequests = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/subgroups');
      if (res?.success !== false && Array.isArray(res?.data)) {
        const mine = res.data.filter((sg: any) => 
          sg.coordinatorId === user.id || 
          sg.createdBy === user.id || 
          (sg.memberIds && Array.isArray(sg.memberIds) && sg.memberIds.includes(user.id))
        );
        setUserRequests(mine);
      }
    } catch {
      // Ignore background fetch error
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('error', 'Please enter a church name');
      return;
    }
    setSubmitting(true);
    try {
      const userName = [profile?.firstName || profile?.first_name, profile?.lastName || profile?.last_name].filter(Boolean).join(' ') || user?.email || 'User';
      const res = await apiClient.post<{ success: boolean; message?: string }>('/subgroups', {
        name: formData.name.trim(),
        type: formData.type,
        description: formData.description.trim(),
        coordinatorName: userName,
        coordinatorEmail: user?.email || '',
        coordinatorId: user?.id,
        zoneId: currentZone?.id || 'global',
        estimatedMembers: formData.estimatedMembers,
        status: 'pending',
      });

      if (res?.success !== false) {
        showToast('success', 'Church request submitted! Awaiting coordinator approval.');
        setShowForm(false);
        setFormData({ name: '', type: 'church', description: '', estimatedMembers: 10 });
        await loadRequests();
      } else {
        showToast('error', res?.message || 'Failed to submit request');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const hasPendingRequest = userRequests.some(r => r.status === 'pending');

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
          <span className="text-xs font-bold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <UsersRound className="w-5 h-5 text-purple-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900">Churches</h3>
            <p className="text-sm text-slate-500">
              {userRequests.length > 0 
                ? `${userRequests.length} church group(s) registered / requested` 
                : 'Create or join a church group'}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="border-t border-slate-200">
          {/* List of current requests / groups */}
          {userRequests.length > 0 && (
            <div className="p-4 space-y-2 border-b border-slate-100 bg-slate-50/50">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">My Churches & Requests</span>
              <div className="space-y-2 mt-1">
                {userRequests.map((req) => {
                  const statusInfo = (STATUS_CONFIG as any)[req.status] || STATUS_CONFIG.pending;
                  return (
                    <div key={req.id} className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{req.name}</h4>
                        <p className="text-[10px] text-slate-500">{req.description || 'No description'}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusInfo.bgColor} ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!showForm ? (
            <div className="p-4">
              <button
                onClick={() => setShowForm(true)}
                disabled={hasPendingRequest}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Request New Church
              </button>
              {hasPendingRequest && (
                <p className="text-xs text-slate-500 text-center mt-2 font-medium">
                  You already have a pending church request awaiting review.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-sm">New Church Request</h4>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Church Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Christ Embassy Ikeja Choir"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Category Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, type: option.value }))}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        formData.type === option.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={formData.type === option.value ? 'text-purple-600' : 'text-slate-400'}>
                          {option.icon}
                        </span>
                        <span className={`text-xs font-bold ${formData.type === option.value ? 'text-purple-700' : 'text-slate-700'}`}>
                          {option.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Briefly describe your church choir and its rehearsal schedule..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Estimated Members
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={formData.estimatedMembers}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimatedMembers: parseInt(e.target.value) || 10 }))}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-xs font-bold shadow-xs"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Church Request
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-400 text-center font-medium">
                Your request will be submitted to the Zone Coordinator and HQ Admins for review.
              </p>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
