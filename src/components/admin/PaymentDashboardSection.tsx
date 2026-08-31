"use client";

import React, { useState, useEffect } from 'react';
import {
  DollarSign, Users, TrendingUp, Search, RefreshCw, Plus, Ban, X,
  Settings, CheckCircle2, AlertCircle, Clock, ShieldCheck, CreditCard,
  ArrowUpRight, Sparkles, Calendar, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi as apiClient } from '@/lib/admin-api';
import CustomLoader from '@/components/CustomLoader';

interface PaymentRecord {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'refunded' | 'pending';
  subscriptionType: 'individual' | 'zone';
  subscriptionPeriod: {
    start: string;
    end: string;
  };
  metadata?: {
    zoneId?: string;
    zoneName?: string;
    memberCount?: number;
  };
  createdAt: string;
  processedAt?: string;
}

interface Subscription {
  payment: PaymentRecord;
  subscription: any;
}

export default function PaymentDashboardSection() {
  const { user, profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Action modals
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [extensionMonths, setExtensionMonths] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  // Global settings for subscriptions
  const [hqEnabled, setHqEnabled] = useState(true);
  const [zonalEnabled, setZonalEnabled] = useState(true);
  const [updatingConfig, setUpdatingConfig] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToggleSetting = async (key: 'hqEnabled' | 'zonalEnabled', currentValue: boolean) => {
    setUpdatingConfig(true);
    try {
      const nextValue = !currentValue;
      if (key === 'hqEnabled') setHqEnabled(nextValue);
      if (key === 'zonalEnabled') setZonalEnabled(nextValue);

      await apiClient.patch('/settings/payment_config', {
        [key]: nextValue,
        updatedAt: new Date().toISOString(),
      });
      showToast('Subscription system configuration updated');
    } catch (err: any) {
      console.error('Failed to update setting:', err);
      showToast('Failed to update payment setting', 'error');
    } finally {
      setUpdatingConfig(false);
    }
  };

  // Load subscriptions
  const loadSubscriptions = async (silent = false) => {
    try {
      if (!silent && subscriptions.length === 0) setLoading(true);
      const response = await apiClient.get<any>('/subscriptions');

      if (response?.subscriptions && Array.isArray(response.subscriptions)) {
        setSubscriptions(response.subscriptions);
      } else if (response?.data && Array.isArray(response.data)) {
        setSubscriptions(response.data);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubscriptions();
    // Hydrate payment config toggles from API on mount
    apiClient.get<any>('/settings/payment_config').then((res) => {
      if (res?.data) {
        if (typeof res.data.hqEnabled === 'boolean') setHqEnabled(res.data.hqEnabled);
        if (typeof res.data.zonalEnabled === 'boolean') setZonalEnabled(res.data.zonalEnabled);
      }
    }).catch(() => { /* non-blocking — UI keeps sensible defaults */ });
  }, []);

  // Filter subscriptions
  const filteredSubscriptions = subscriptions.filter(sub => {
    const matchesSearch =
      sub.payment.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.payment.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.payment.metadata?.zoneName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || sub.payment.status === statusFilter;
    const matchesType = typeFilter === 'all' || sub.payment.subscriptionType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // Calculate stats
  const totalRevenue = subscriptions.reduce((sum, sub) =>
    sub.payment.status === 'success' ? sum + Number(sub.payment.amount || 0) : sum, 0
  ) / 100;

  const activeCount = subscriptions.filter(sub =>
    sub.subscription?.status === 'active' || sub.payment?.status === 'success'
  ).length;

  const handleRevoke = async () => {
    if (!selectedSubscription) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/subscriptions/${selectedSubscription.payment.userId}/revoke`, {
        reason: actionReason,
      });
      showToast('Subscription revoked successfully');
      setShowRevokeModal(false);
      setActionReason('');
      loadSubscriptions(true);
    } catch (error) {
      showToast('Failed to revoke subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExtend = async () => {
    if (!selectedSubscription) return;
    setActionLoading(true);
    try {
      await apiClient.post(`/subscriptions/${selectedSubscription.payment.userId}/extend`, {
        months: extensionMonths,
        reason: actionReason,
      });
      showToast(`Subscription extended by ${extensionMonths} month(s)`);
      setShowExtendModal(false);
      setActionReason('');
      loadSubscriptions(true);
    } catch (error) {
      showToast('Failed to extend subscription', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="w-full flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 custom-scrollbar bg-slate-50/50">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[120] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all animate-in fade-in ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-200">
              <CreditCard className="w-5 h-5" />
            </div>
            Payments & Subscription Center
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage KingsPay subscriber accounts, portal access licensing, and revenue settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => loadSubscriptions(true)}
            disabled={loading}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 transition-all shadow-xs active:scale-95 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Total Volume</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-2 inline-block">Settled via KingsPay</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Active Subscribers</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{activeCount}</p>
          <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md mt-2 inline-block">Licensed Accounts</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">Individual Tier</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{subscriptions.length}</p>
          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md mt-2 inline-block">Singers Registered</span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">System Gateways</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">Active</p>
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md mt-2 inline-block">KingsPay Online</span>
        </div>
      </div>

      {/* Main Table Panel */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search subscriber name, email, or zone..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
            >
              <option value="all">All Statuses</option>
              <option value="success">Active / Success</option>
              <option value="pending">Pending</option>
              <option value="refunded">Revoked / Expired</option>
            </select>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider bg-slate-50/30">
                <th className="py-3.5 px-6">Subscriber</th>
                <th className="py-3.5 px-4">Plan & Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Expiry Date</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
                    Loading subscriber records...
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 font-medium">
                    No subscription records found.
                  </td>
                </tr>
              ) : (
                filteredSubscriptions.map((sub) => (
                  <tr key={sub.payment.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-slate-900">{sub.payment.userName || 'Singer'}</p>
                      <p className="text-[11px] text-slate-400">{sub.payment.userEmail}</p>
                      <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                        {sub.payment.metadata?.zoneName || 'Global'}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-extrabold text-slate-900">${(sub.payment.amount / 100).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-400 capitalize">{sub.subscription?.plan || 'Monthly'} Access</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        sub.subscription?.status === 'active' || sub.payment.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {sub.subscription?.status === 'active' ? 'Active' : 'Expired'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-600 font-medium">
                      {sub.subscription?.expiresAt
                        ? new Date(sub.subscription.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : 'Active Lifetime'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setSelectedSubscription(sub); setShowExtendModal(true); }}
                          className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] rounded-xl transition-all active:scale-95"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => { setSelectedSubscription(sub); setShowRevokeModal(true); }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-[11px] rounded-xl transition-all active:scale-95"
                        >
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extend Modal */}
      {showExtendModal && selectedSubscription && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-slate-900">Extend Subscription</h3>
            <p className="text-xs text-slate-500">
              Grant additional access months to <span className="font-bold text-slate-900">{selectedSubscription.payment.userName}</span>.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Months to Add</label>
              <select
                value={extensionMonths}
                onChange={(e) => setExtensionMonths(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold"
              >
                <option value={1}>+ 1 Month</option>
                <option value={3}>+ 3 Months</option>
                <option value={6}>+ 6 Months</option>
                <option value={12}>+ 12 Months (1 Year)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowExtendModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Saving...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Modal */}
      {showRevokeModal && selectedSubscription && (
        <div className="fixed inset-0 z-[150] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-black text-rose-600">Revoke Subscription</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to cancel access for <span className="font-bold text-slate-900">{selectedSubscription.payment.userName}</span>?
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Reason (Optional)</label>
              <input
                type="text"
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="e.g. Refunded, expired grace period"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowRevokeModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleRevoke}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all disabled:opacity-50"
              >
                {actionLoading ? 'Revoking...' : 'Revoke Access'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
