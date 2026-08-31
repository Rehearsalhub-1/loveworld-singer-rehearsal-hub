"use client";

/**
 * Church Admin — Notifications
 * Sends a broadcast notification to all members of the coordinator's church.
 * API: POST /notifications/broadcast { title, message, subGroupId, type }
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, Send, RefreshCw, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useSubGroup } from '@/hooks/useSubGroup';
import CustomLoader from '@/components/CustomLoader';

interface SentNotification {
  id: string;
  title: string;
  body?: string;
  message?: string;
  type?: string;
  createdAt?: string;
}

const NOTIF_TYPES = [
  { value: 'general',    label: 'General Announcement' },
  { value: 'rehearsal',  label: 'Rehearsal Reminder' },
  { value: 'update',     label: 'Song Update' },
  { value: 'urgent',     label: 'Urgent' },
];

export default function ChurchNotificationsPage() {
  const { coordinatedSubGroups, isLoading: sgLoading } = useSubGroup();
  const church = coordinatedSubGroups[0] ?? null;

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('general');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ text: string; ok: boolean } | null>(null);

  const [history, setHistory] = useState<SentNotification[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const showMsg = (text: string, ok = true) => {
    setToast({ text, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const loadHistory = useCallback(async () => {
    if (!church?.id) return;
    setLoadingHistory(true);
    try {
      const res = await apiClient.get<any>(`/notifications?subGroupId=${church.id}&limit=20`);
      setHistory(Array.isArray(res?.data) ? res.data : []);
    } catch { setHistory([]); } finally { setLoadingHistory(false); }
  }, [church?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim() || !church?.id) return;
    setSending(true);
    try {
      await apiClient.post('/notifications/broadcast', {
        title: title.trim(),
        message: message.trim(),
        body: message.trim(),
        type,
        subGroupId: church.id,
        organizationId: church.zoneId || church.organizationId,
      });
      showMsg('Notification sent to your church members!');
      setTitle('');
      setMessage('');
      await loadHistory();
    } catch (err: any) {
      showMsg(err?.message || 'Failed to send notification', false);
    } finally { setSending(false); }
  };

  if (sgLoading) return <div className="py-24 flex justify-center"><CustomLoader message="Loading..." /></div>;
  if (!church) return <div className="py-24 text-center text-sm text-slate-500">No church assigned.</div>;

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 text-white text-sm font-bold px-4 py-2.5 rounded-2xl shadow-lg ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
          {toast.text}
        </div>
      )}

      {/* Send form */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-900">Send Notification</h2>
          <p className="text-xs text-slate-400 mt-0.5">Broadcasts to all members of {church.name}</p>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Type</label>
            <div className="relative">
              <select
                value={type}
                onChange={e => setType(e.target.value)}
                className="w-full appearance-none px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {NOTIF_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Rehearsal cancelled this Sunday"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">Message *</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Write your message here..."
              className="w-full px-3.5 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sending || !title.trim() || !message.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm disabled:opacity-50 transition-all active:scale-95"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? 'Sending…' : 'Send to Church'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div>
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Recent Notifications</h3>
        {loadingHistory ? (
          <div className="py-8 flex justify-center"><RefreshCw className="w-5 h-5 text-slate-300 animate-spin" /></div>
        ) : history.length === 0 ? (
          <div className="py-8 text-center">
            <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No notifications sent yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(notif => (
              <div key={notif.id} className="bg-white rounded-2xl border border-slate-200 px-4 py-3.5">
                <p className="text-sm font-bold text-slate-900">{notif.title}</p>
                <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.body || notif.message}</p>
                {notif.createdAt && (
                  <p className="text-[10px] text-slate-300 mt-1.5">
                    {new Date(notif.createdAt).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
