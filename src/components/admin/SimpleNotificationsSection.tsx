"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Bell, Send, Trash2, MessageSquare, X, CheckCircle,
  AlertTriangle, RefreshCw, Search, Sparkles, Filter,
  Clock, ShieldAlert, Radio, User, ExternalLink, Check, Copy,
  Edit3, Pencil, CheckSquare, Layers
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import CustomLoader from '@/components/CustomLoader';

export interface AdminMessage {
  id: string;
  title: string;
  message: string;
  body?: string;
  sentBy?: string;
  senderName?: string;
  zoneId?: string;
  priority?: 'normal' | 'high' | 'urgent';
  category?: 'rehearsal' | 'program' | 'praise_night' | 'general' | 'alert';
  sentAt?: string;
  createdAt?: string;
  rawData?: any;
}

// ── In-Memory Cache (15-min TTL) for instant tab switching ──
interface NotificationsCache {
  data: AdminMessage[];
  timestamp: number;
}
let globalNotificationsCache: NotificationsCache | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000;

export default function SimpleNotificationsSection() {
  const { user } = useAuth();
  const { currentZone } = useZone();
  
  // Data State (READ)
  const [messages, setMessages] = useState<AdminMessage[]>(() => {
    if (globalNotificationsCache && Date.now() - globalNotificationsCache.timestamp < CACHE_TTL_MS) {
      return globalNotificationsCache.data;
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    return !(globalNotificationsCache && Date.now() - globalNotificationsCache.timestamp < CACHE_TTL_MS);
  });
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'rehearsal' | 'program' | 'general' | 'alert'>('all');

  // Modal & Edit State (CREATE & UPDATE)
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<AdminMessage | null>(null);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [category, setCategory] = useState<'rehearsal' | 'program' | 'general' | 'alert'>('general');
  const [scope, setScope] = useState<'global' | 'zone'>('global');
  const [submitting, setSubmitting] = useState(false);

  // Feedback State (DELETE)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, message: msg });
    setTimeout(() => setToast(null), 3000);
  };

  // READ: Load notifications
  const loadMessages = useCallback(async (isRefresh = false) => {
    if (!isRefresh && globalNotificationsCache && Date.now() - globalNotificationsCache.timestamp < CACHE_TTL_MS) {
      setMessages(globalNotificationsCache.data);
      setLoading(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await apiClient.get<any>('/notifications?admin=true');
      let items: AdminMessage[] = [];
      if (Array.isArray(res)) items = res;
      else if (res && typeof res === 'object') {
        if (Array.isArray((res as any).data)) items = (res as any).data;
        else if (Array.isArray((res as any).notifications)) items = (res as any).notifications;
        else if (Array.isArray((res as any).messages)) items = (res as any).messages;
      }

      globalNotificationsCache = {
        data: items,
        timestamp: Date.now(),
      };

      setMessages(items);
    } catch (err) {
      console.error('[SimpleNotificationsSection] Error loading notifications:', err);
      setMessages([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  const handleOpenCompose = () => {
    setEditingMessage(null);
    setTitle('');
    setMessage('');
    setPriority('normal');
    setCategory('general');
    setScope('global');
    setShowModal(true);
  };

  const handleOpenEdit = (msg: AdminMessage) => {
    setEditingMessage(msg);
    setTitle(msg.title || msg.rawData?.title || '');
    const text = msg.message || msg.body || (msg as any).text || (msg as any).content || msg.rawData?.message || msg.rawData?.body || msg.rawData?.text || msg.rawData?.content || '';
    setMessage(text);
    setPriority((msg.priority as any) || msg.rawData?.priority || 'normal');
    const rawCat = msg.category || msg.rawData?.category || 'general';
    const cat = rawCat === 'praise_night' ? 'program' : (rawCat === 'call' || rawCat === 'song' ? 'general' : rawCat);
    setCategory(cat as any);
    setScope(msg.zoneId && msg.zoneId !== 'global' ? 'zone' : 'global');
    setShowModal(true);
  };

  // CREATE & UPDATE handler
  const handleSaveBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      showToast('error', 'Please provide both a broadcast title and message.');
      return;
    }

    setSubmitting(true);
    try {
      if (editingMessage) {
        // UPDATE (PATCH)
        await apiClient.patch(`/notifications/${editingMessage.id}`, {
          title: title.trim(),
          message: message.trim(),
          body: message.trim(),
          priority,
          category,
          targetAudience: scope === 'global' ? 'all' : 'zone',
          targetZoneId: scope === 'zone' ? (currentZone?.id || 'zone-001') : null,
          zoneId: scope === 'zone' ? (currentZone?.id || 'zone-001') : 'global',
        });

        showToast('success', 'Broadcast updated successfully!');
      } else {
        // CREATE (POST)
        await apiClient.post('/notifications', {
          title: title.trim(),
          message: message.trim(),
          body: message.trim(),
          priority,
          category,
          targetAudience: scope === 'global' ? 'all' : 'zone',
          targetZoneId: scope === 'zone' ? (currentZone?.id || 'zone-001') : null,
          zoneId: scope === 'zone' ? (currentZone?.id || 'zone-001') : 'global',
          sentBy: user?.email || 'HQ Administrator',
          senderName: user?.displayName || user?.email?.split('@')[0] || 'Administrator',
          createdAt: new Date().toISOString()
        });

        showToast('success', 'Broadcast published and dispatched to all singers!');
      }

      setShowModal(false);
      setEditingMessage(null);
      globalNotificationsCache = null;
      loadMessages(true);
    } catch (error) {
      showToast('error', editingMessage ? 'Failed to update broadcast.' : 'Failed to dispatch broadcast.');
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE handler
  const handleDeleteMessage = async (messageId: string) => {
    try {
      setDeletingId(messageId);
      await apiClient.delete('/notifications/' + messageId);
      showToast('success', 'Broadcast deleted from feed.');
      setMessages(prev => prev.filter(m => m.id !== messageId));
      if (globalNotificationsCache) {
        globalNotificationsCache.data = globalNotificationsCache.data.filter(m => m.id !== messageId);
      }
    } catch (error) {
      showToast('error', 'Failed to delete notification.');
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyMessage = (msg: AdminMessage) => {
    const text = msg.message || msg.body || msg.rawData?.message || msg.rawData?.body || '';
    navigator.clipboard.writeText(`${msg.title}\n\n${text}`);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Just now';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recently';
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter(m => {
      const matchCat = categoryFilter === 'all' || m.category === categoryFilter || (categoryFilter === 'program' && m.category === 'praise_night');
      const q = searchTerm.toLowerCase().trim();
      const text = m.message || m.body || m.rawData?.message || m.rawData?.body || '';
      const matchSearch =
        !q ||
        (m.title && m.title.toLowerCase().includes(q)) ||
        (text && text.toLowerCase().includes(q)) ||
        (m.sentBy && m.sentBy.toLowerCase().includes(q));
      return matchCat && matchSearch;
    });
  }, [messages, categoryFilter, searchTerm]);

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-[#f8fafc] overflow-y-auto custom-scrollbar relative font-sans">
      {/* ── Dynamic Purple / Indigo Studio Glows ── */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[500] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="relative flex-1 flex flex-col p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-7xl mx-auto">

        {/* ── 1. STUDIO HEADER & QUICK DISPATCH ── */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
              <Bell className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Portal Notifications & Broadcasts</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200">
                  Full CRUD Enabled
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Create, inspect, update, and manage real-time broadcast announcements dispatched to choir singers and coordinators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadMessages(true)}
              disabled={refreshing || loading}
              title="Refresh feeds"
              className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
            </button>

            <button
              onClick={handleOpenCompose}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Compose Broadcast</span>
            </button>
          </div>
        </div>

        {/* ── 2. FILTER & SEARCH TOOLBAR ── */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search announcements by title, message content, or sender..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl shrink-0 overflow-x-auto">
            {[
              { key: 'all', label: 'All Feeds' },
              { key: 'general', label: 'General' },
              { key: 'rehearsal', label: 'Rehearsals' },
              { key: 'program', label: 'Programs' },
              { key: 'alert', label: 'Alerts' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setCategoryFilter(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === tab.key
                    ? 'bg-white text-purple-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 3. BROADCAST MESSAGES FEED CONTAINER (READ, UPDATE, DELETE) ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden w-full">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              <h3 className="font-black text-sm text-slate-900">Broadcast History</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                {filteredMessages.length} total
              </span>
            </div>

            <p className="text-[11px] text-slate-400 hidden sm:block">
              Click edit to modify announcements or trash to remove
            </p>
          </div>

          {loading ? (
            <div className="py-20 text-center">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Loading broadcasts...</p>
              <p className="text-xs text-slate-400 mt-1">Connecting to notifications service</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="py-20 text-center p-6">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <Bell className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-base font-black text-slate-900">No broadcasts found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchTerm ? 'No announcement matched your search criteria.' : 'Create your first system broadcast announcement to notify singers.'}
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={handleOpenCompose}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>Send First Broadcast</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMessages.map((msg) => {
                const isDeleting = deletingId === msg.id;
                const isUrgent = msg.priority === 'urgent' || msg.category === 'alert';
                const msgText = msg.message || msg.body || msg.rawData?.message || msg.rawData?.body || 'No message content provided.';

                return (
                  <div
                    key={msg.id}
                    className={`p-5 lg:p-6 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row items-start justify-between gap-4 group ${
                      isUrgent ? 'bg-rose-50/20' : ''
                    }`}
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      {/* Badge and Title */}
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {isUrgent ? (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5" /> Urgent Alert
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200">
                            {msg.category === 'program' ? 'Program' : (msg.category ? msg.category.replace('_', ' ') : 'Announcement')}
                          </span>
                        )}

                        <h4 className="font-black text-slate-900 text-sm">{msg.title}</h4>
                      </div>

                      {/* Message Content */}
                      <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-wrap">
                        {msgText}
                      </p>

                      {/* Meta Footer */}
                      <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-400 pt-1">
                        <span className="flex items-center gap-1 text-slate-600">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{msg.senderName || msg.sentBy || 'HQ Administrator'}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{formatDate(msg.createdAt || msg.sentAt)}</span>
                        </span>
                        {msg.zoneId && msg.zoneId !== 'global' && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 font-bold">Zone Scoped</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (EDIT, COPY, DELETE) */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(msg)}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                        title="Edit broadcast"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyMessage(msg)}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                        title="Copy message content"
                      >
                        {copiedId === msg.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        disabled={isDeleting}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all disabled:opacity-50"
                        title="Delete broadcast"
                      >
                        {isDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── 4. COMPOSE / EDIT BROADCAST MODAL (CREATE & UPDATE) ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  {editingMessage ? <Pencil className="w-5 h-5" /> : <Send className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingMessage ? 'Edit Broadcast Announcement' : 'New Portal Broadcast'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {editingMessage ? 'Update announcement details across singer portals' : 'Pushes real-time notification to all online choir devices'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingMessage(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Category & Priority Selectors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="general">General Announcement</option>
                    <option value="rehearsal">Rehearsal Schedule</option>
                    <option value="program">Program Announcement</option>
                    <option value="alert">Urgent Action Alert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="normal">Normal Broadcast</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">Urgent / Alert Banner</option>
                  </select>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  Broadcast Title <span className="text-purple-600">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Mandatory Rehearsal Call Time Update"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>

              {/* Message Content */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  Announcement Message <span className="text-purple-600">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Type your official announcement or instructions to singers..."
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                />
              </div>

              {/* Target Scope */}
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-purple-900">Broadcast Target Scope</p>
                  <p className="text-[11px] text-purple-700">Dispatch globally or limit to current active zone.</p>
                </div>
                <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-purple-200">
                  <button
                    type="button"
                    onClick={() => setScope('global')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      scope === 'global' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Global
                  </button>
                  <button
                    type="button"
                    onClick={() => setScope('zone')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      scope === 'zone' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {currentZone?.name || 'Current Zone'}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEditingMessage(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBroadcast}
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{editingMessage ? 'Updating...' : 'Dispatching...'}</span>
                  </>
                ) : (
                  <>
                    {editingMessage ? <CheckSquare className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                    <span>{editingMessage ? 'Update Announcement' : 'Publish Broadcast'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
