"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bell, BellOff, RefreshCw, Trash2, CheckCheck,
  Building2, Users, Mic, Calendar, Gift, Image,
  Music, MessageCircle, Info, AlertCircle, Sparkles,
  ChevronRight, Clock, Shield, Check
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore } from '@/stores/notificationStore';
import { apiClient } from '@/lib/api-client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  priority: string;
  sentBy?: string;
  senderName?: string;
  createdAt: string;
  sentAt: string;
  is_read: boolean;
  targetAudience?: string;
  targetUserId?: string;
  rawData?: Record<string, any>;
}

// ─── Filter tabs ─────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getIconConfig(notif: AppNotification): { Icon: React.ElementType; bg: string; text: string } {
  const cat = (notif.category || notif.type || '').toLowerCase();
  if (cat.includes('church') || cat.includes('subgroup') || cat.includes('church_request') || cat.includes('church_approved') || cat.includes('church_rejected')) {
    return { Icon: Building2, bg: 'bg-purple-100', text: 'text-purple-600' };
  }
  if (cat.includes('request') || cat.includes('admin_request') || cat.includes('approval') || cat.includes('approved') || cat.includes('rejected')) {
    return { Icon: Shield, bg: 'bg-amber-100', text: 'text-amber-600' };
  }
  if (cat.includes('song') || cat.includes('music') || cat.includes('audiolab') || cat.includes('rehearsal') || cat.includes('praise')) {
    return { Icon: Music, bg: 'bg-violet-100', text: 'text-violet-600' };
  }
  if (cat.includes('calendar') || cat.includes('event') || cat.includes('schedule')) {
    return { Icon: Calendar, bg: 'bg-blue-100', text: 'text-blue-600' };
  }
  if (cat.includes('media') || cat.includes('image') || cat.includes('video')) {
    return { Icon: Image, bg: 'bg-emerald-100', text: 'text-emerald-600' };
  }
  if (cat.includes('chat') || cat.includes('message') || cat.includes('group')) {
    return { Icon: MessageCircle, bg: 'bg-indigo-100', text: 'text-indigo-600' };
  }
  if (cat.includes('birthday') || cat.includes('anniversary')) {
    return { Icon: Gift, bg: 'bg-pink-100', text: 'text-pink-600' };
  }
  if (cat.includes('zone') || cat.includes('member')) {
    return { Icon: Users, bg: 'bg-sky-100', text: 'text-sky-600' };
  }
  return { Icon: Bell, bg: 'bg-slate-100', text: 'text-slate-600' };
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return date.toLocaleDateString();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(diffMs / 86400000);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function groupByDate(notifs: AppNotification[]): Record<string, AppNotification[]> {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  return notifs.reduce((acc, n) => {
    const d = new Date(n.sentAt || n.createdAt);
    const ds = d.toDateString();
    const label = ds === today ? 'Today'
      : ds === yesterday ? 'Yesterday'
      : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (!acc[label]) acc[label] = [];
    acc[label].push(n);
    return acc;
  }, {} as Record<string, AppNotification[]>);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex items-start gap-3 bg-white rounded-2xl p-4 border border-slate-100 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-slate-100 rounded-lg w-1/3" />
            <div className="h-3 bg-slate-100 rounded-lg w-4/5" />
            <div className="h-2.5 bg-slate-50 rounded-lg w-1/4 mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Notification Card ────────────────────────────────────────────────────────

function NotificationCard({
  notif,
  onDelete,
  onMarkRead,
  isDeleting,
}: {
  notif: AppNotification;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onMarkRead: (id: string) => void;
  isDeleting: boolean;
}) {
  const { Icon, bg, text } = getIconConfig(notif);
  const isUnread = !notif.is_read;
  const actionUrl = notif.rawData?.link || notif.rawData?.action_url;

  return (
    <div
      className={`group relative flex items-start gap-3.5 bg-white rounded-2xl p-4 border transition-all duration-150 ${
        isUnread ? 'border-purple-200/60 bg-purple-50/20 shadow-xs' : 'border-slate-100 hover:border-slate-200'
      } ${isDeleting ? 'opacity-40 pointer-events-none' : ''}`}
      onClick={() => { if (isUnread) onMarkRead(notif.id); }}
    >
      {/* Unread Dot */}
      {isUnread && (
        <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-purple-500 shrink-0" />
      )}

      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg} ${text}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <h4 className={`text-xs font-black tracking-tight truncate ${isUnread ? 'text-slate-900' : 'text-slate-700'}`}>
            {notif.title}
          </h4>
        </div>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">
          {notif.message}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          {(notif.sentBy || notif.senderName) && (notif.sentBy !== 'System' && notif.senderName !== 'HQ Administrator') && (
            <>
              <span className="text-[10px] font-bold text-slate-400 truncate max-w-[100px]">
                {notif.sentBy || notif.senderName}
              </span>
              <span className="text-slate-300">·</span>
            </>
          )}
          <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
            {formatRelativeTime(notif.sentAt || notif.createdAt)}
          </span>
          {actionUrl && (
            <>
              <span className="text-slate-300">·</span>
              <a
                href={actionUrl}
                onClick={e => e.stopPropagation()}
                className="text-[10px] font-bold text-purple-600 hover:text-purple-700 flex items-center gap-0.5"
              >
                View <ChevronRight className="w-2.5 h-2.5" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Delete Button (on hover) */}
      <button
        onClick={(e) => onDelete(notif.id, e)}
        className="absolute bottom-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"
        title="Dismiss"
      >
        {isDeleting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const { user, profile } = useAuth();
  const { markAsSeen } = useNotificationStore();
  const userId = user?.uid || user?.id || profile?.id;

  // Mark bell as seen on load
  useEffect(() => {
    markAsSeen();
  }, [markAsSeen]);

  // ── Fetch notifications ──
  const loadNotifications = useCallback(async (showRefresh = false) => {
    if (!userId) { setLoading(false); return; }
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiClient.get<{ success: boolean; data?: unknown[]; count?: number }>('/notifications');
      if (!res.success) throw new Error('Failed to load notifications');

      const rows = Array.isArray(res.data) ? res.data : [];
      const mapped: AppNotification[] = rows
        .filter((r): r is Record<string, any> => !!r && typeof r === 'object')
        .map((r) => ({
          id: String(r.id ?? ''),
          title: String(r.title || 'Notification'),
          message: String(r.message || r.body || ''),
          type: String(r.type || 'info'),
          category: String(r.category || r.type || 'general'),
          priority: String(r.priority || 'normal'),
          sentBy: String(r.sentBy || r.senderName || r.sender_name || ''),
          senderName: String(r.senderName || r.sender_name || ''),
          createdAt: String(r.createdAt || r.created_at || new Date().toISOString()),
          sentAt: String(r.sentAt || r.createdAt || r.created_at || new Date().toISOString()),
          is_read: Boolean(r.is_read ?? r.isRead ?? false),
          targetAudience: String(r.targetAudience || r.target_audience || 'all'),
          targetUserId: r.targetUserId || r.target_user_id || undefined,
          rawData: (r.rawData && typeof r.rawData === 'object') ? r.rawData as Record<string, any> : undefined,
        }));

      // Sort newest first
      mapped.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
      setNotifications(mapped);
    } catch (err: any) {
      console.error('[Notifications] load error:', err);
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) loadNotifications();
  }, [userId, loadNotifications]);

  // ── Mark single as read (PATCH /notifications/:id) ──
  const handleMarkRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await apiClient.patch(`/notifications/${encodeURIComponent(id)}`, { is_read: true });
    } catch {
      // Optimistic update — ignore failure silently
    }
  }, []);

  // ── Mark all as read ──
  const handleMarkAllRead = useCallback(async () => {
    const hasUnread = notifications.some(n => !n.is_read);
    if (!hasUnread) return;
    setMarkingAllRead(true);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await apiClient.patch('/notifications/read-all', {});
    } catch {
      // ignore
    } finally {
      setMarkingAllRead(false);
    }
  }, [notifications]);

  // ── Delete notification ──
  const handleDelete = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingIds(prev => new Set(prev).add(id));
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await apiClient.delete(`/notifications/${encodeURIComponent(id)}`);
    } catch {
      // Optimistic removal — ignore
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  // ── Filtering ──
  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.is_read);
    return notifications;
  }, [notifications, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <ScreenHeader
        title="Notifications"
        showBackButton
        backPath="/home"
        rightButtons={
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                disabled={markingAllRead}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl border border-purple-200 transition-colors disabled:opacity-50"
                title="Mark all as read"
              >
                {markingAllRead ? <RefreshCw className="w-3 h-3 animate-spin" /> : <CheckCheck className="w-3 h-3" />}
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              onClick={() => loadNotifications(true)}
              disabled={refreshing}
              className="p-2 rounded-xl hover:bg-slate-100 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto">

          {/* ── Summary Header ── */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">Inbox</h2>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                {unreadCount > 0 && ` · ${unreadCount} unread`}
              </p>
            </div>
            {unreadCount > 0 && (
              <span className="px-2.5 py-1 bg-purple-600 text-white text-[10px] font-black rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>

          {/* ── Filter Pills ── */}
          <div className="px-4 pb-3">
            <div className="flex gap-2">
              {FILTER_TABS.map(tab => {
                const count = tab.id === 'all' ? notifications.length : unreadCount;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      filter === tab.id
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                    {count > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none ${
                        filter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Error Banner ── */}
          {error && (
            <div className="mx-4 mb-3 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">✕</button>
            </div>
          )}

          {/* ── Loading ── */}
          {loading && <NotificationSkeleton />}

          {/* ── Empty State ── */}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4 border border-slate-200">
                {filter === 'unread' ? <Check className="w-8 h-8 text-emerald-500" /> : <BellOff className="w-8 h-8 text-slate-400" />}
              </div>
              <h3 className="text-sm font-black text-slate-800 mb-1">
                {filter === 'unread' ? 'All caught up!' : 'No notifications'}
              </h3>
              <p className="text-xs text-slate-400 font-medium max-w-xs leading-relaxed">
                {filter === 'unread'
                  ? "You've read all your notifications. Great job staying on top of things."
                  : `No ${filter === 'all' ? '' : filter + ' '}notifications yet. We'll let you know when something important happens.`}
              </p>
            </div>
          )}

          {/* ── Grouped Notification List ── */}
          {!loading && filtered.length > 0 && (
            <div className="px-4 space-y-5 pb-4">
              {Object.entries(grouped).map(([dateLabel, notifs]) => (
                <div key={dateLabel}>
                  {/* Date Group Label */}
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      {dateLabel}
                    </span>
                  </div>

                  {/* Notification Cards */}
                  <div className="space-y-1.5">
                    {notifs.map(notif => (
                      <NotificationCard
                        key={notif.id}
                        notif={notif}
                        onDelete={handleDelete}
                        onMarkRead={handleMarkRead}
                        isDeleting={deletingIds.has(notif.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
