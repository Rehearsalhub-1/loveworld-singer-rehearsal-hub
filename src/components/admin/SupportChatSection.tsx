"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { adminApi as apiClient } from '@/lib/admin-api';
import {
  MessageCircle,
  Send,
  User,
  Clock,
  Search,
  MoreVertical,
  CheckCheck,
  ShieldCheck,
  Mail,
  UserCheck,
  ChevronLeft,
  RefreshCw,
  Tag,
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';

interface SupportMessage {
  id: string;
  ticketId: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'admin';
  timestamp: string;
}

interface SupportTicket {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  zoneId?: string;
  lastMessage: string;
  lastTimestamp: string;
  unreadByAdmin: number;
}

export default function SupportChatSection() {
  const { user, profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadTickets = async (silent = false) => {
    if (!silent && tickets.length === 0) setLoading(true);
    try {
      const res = await apiClient.get<any>('/support');
      const data = (res?.data && Array.isArray(res.data)) ? res.data : [];

      const shaped: SupportTicket[] = data.map((t: any) => {
        let lm = 'No messages yet';
        if (typeof t.lastMessage === 'string') lm = t.lastMessage;
        else if (t.lastMessage && typeof t.lastMessage === 'object' && typeof t.lastMessage.text === 'string') lm = t.lastMessage.text;

        return {
          id: t.id,
          ticketId: t.id,
          userId: t.userId || 'singer',
          userName: typeof t.userName === 'string' ? t.userName : 'Member',
          userEmail: t.userEmail || '',
          subject: t.subject || 'Support Request',
          category: t.category || 'general',
          status: t.status || 'open',
          priority: t.priority || 'normal',
          zoneId: t.zoneId,
          lastMessage: lm,
          lastTimestamp: t.lastTimestamp || t.createdAt || new Date().toISOString(),
          unreadByAdmin: t.unreadByAdmin || 0,
        };
      });

      setTickets(shaped);
      if (shaped.length > 0 && !selectedTicketId) {
        setSelectedTicketId(shaped[0].id);
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (ticketId: string) => {
    setLoadingMessages(true);
    try {
      const res = await apiClient.get<any>(`/support/${ticketId}/messages`);
      const data = (res?.data && Array.isArray(res.data)) ? res.data : [];
      const shaped: SupportMessage[] = data.map((m: any) => ({
        id: m.id,
        ticketId: m.ticketId,
        text: typeof m.text === 'string' ? m.text : (typeof m.message === 'string' ? m.message : String(m.text || '')),
        senderId: m.senderId,
        senderName: typeof m.senderName === 'string' ? m.senderName : 'Support User',
        senderType: m.senderType || 'user',
        timestamp: m.timestamp || m.createdAt || new Date().toISOString(),
      }));
      setMessages(shaped);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Failed to load support messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (selectedTicketId) {
      loadMessages(selectedTicketId);
    }
  }, [selectedTicketId]);

  const handleSendReply = async () => {
    if (!newMessage.trim() || !selectedTicketId) return;

    const textToSubmit = newMessage.trim();
    setNewMessage('');
    setSending(true);

    const adminName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : 'HQ Support Admin';

    try {
      const res = await apiClient.post<any>(`/support/${selectedTicketId}/messages`, {
        text: textToSubmit,
        senderName: adminName,
      });

      if (res?.data) {
        const newMsg: SupportMessage = {
          id: res.data.id,
          ticketId: selectedTicketId,
          text: res.data.text || textToSubmit,
          senderId: user?.id || 'admin',
          senderName: adminName,
          senderType: 'admin',
          timestamp: new Date().toISOString(),
        };
        setMessages(prev => [...prev, newMsg]);
        setTimeout(scrollToBottom, 100);
      }
      loadTickets(true);
    } catch (err) {
      console.error('Failed to send support reply:', err);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (ticketId: string, nextStatus: string) => {
    try {
      await apiClient.patch(`/support/${ticketId}/status`, { status: nextStatus });
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: nextStatus as any } : t));
    } catch (err) {
      console.error('Failed to update ticket status:', err);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm('Delete this support ticket permanently?')) return;
    try {
      await apiClient.delete(`/support/${ticketId}`);
      const remaining = tickets.filter(t => t.id !== ticketId);
      setTickets(remaining);
      setSelectedTicketId(remaining[0]?.id || null);
    } catch (err) {
      console.error('Failed to delete support ticket:', err);
    }
  };

  const filteredTickets = tickets.filter(t => {
    const matchesSearch =
      t.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-full bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-xs relative">
      {/* Pane 1: Support Tickets List */}
      <div className={`${selectedTicketId ? 'hidden md:flex' : 'flex'} w-full md:w-88 border-r border-slate-100 flex-col bg-slate-50/30 transition-all duration-300`}>
        <div className="p-4 md:p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-base md:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-purple-600" />
              Support Desk
            </h1>
            <div className="flex items-center gap-1.5">
              <button onClick={() => loadTickets(true)} className="p-1.5 hover:bg-slate-200/60 rounded-xl text-slate-400">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
              <div className="bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100 text-[10px] font-extrabold text-purple-700">
                {tickets.length} Tickets
              </div>
            </div>
          </div>

          <div className="relative group mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by member or subject..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[10px] font-bold">
            {['all', 'open', 'in_progress', 'resolved'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all ${
                  statusFilter === st ? 'bg-purple-600 text-white shadow-xs' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
          {loading ? (
            <div className="p-10 text-center">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs text-slate-400 font-medium">Loading support tickets...</p>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
                <MessageCircle className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-600">No support tickets</p>
              <p className="text-[10px] text-slate-400 mt-1">Singer help requests will appear here.</p>
            </div>
          ) : (
            filteredTickets.map(ticket => {
              const isSelected = ticket.id === selectedTicketId;
              const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

              return (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  className={`w-full p-3.5 rounded-2xl text-left transition-all duration-200 flex flex-col gap-1.5 relative border ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200'
                      : 'bg-white hover:bg-slate-50 border-slate-100 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-black truncate max-w-[140px] ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                      {ticket.userName}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : isResolved
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className={`text-[11px] font-bold truncate ${isSelected ? 'text-purple-100' : 'text-slate-700'}`}>
                    {ticket.subject}
                  </p>

                  <div className="flex items-center justify-between text-[10px] w-full pt-1">
                    <span className={`truncate max-w-[160px] ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                      {ticket.lastMessage}
                    </span>
                    <span className={`shrink-0 font-medium ${isSelected ? 'text-purple-200' : 'text-slate-400'}`}>
                      {new Date(ticket.lastTimestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Pane 2: Conversation Window */}
      <div className={`${!selectedTicketId ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white relative`}>
        {selectedTicketId && selectedTicket ? (
          <>
            {/* Ticket Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedTicketId(null)} className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-xl">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-xs">
                  {selectedTicket.userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold mt-0.5">
                    <span>{selectedTicket.userName}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedTicket.category}</span>
                  </div>
                </div>
              </div>

              {/* Status Selector & Actions */}
              <div className="flex items-center gap-2">
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(selectedTicket.id, e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 capitalize focus:ring-2 focus:ring-purple-500"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>

                <button
                  onClick={() => handleDeleteTicket(selectedTicket.id)}
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition-all"
                  title="Delete Ticket"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 bg-slate-50/20">
              {loadingMessages ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <MessageCircle className="w-8 h-8 opacity-30" />
                  <p className="text-xs font-semibold">No messages in this ticket yet</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isAdminMsg = m.senderType === 'admin' || m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex flex-col ${isAdminMsg ? 'items-end' : 'items-start'}`}>
                      <span className="text-[10px] font-bold text-slate-400 mb-1 px-1">
                        {m.senderName} {isAdminMsg && '🛡️ (Support)'}
                      </span>
                      <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed font-medium ${
                        isAdminMsg
                          ? 'bg-purple-600 text-white rounded-br-xs shadow-xs'
                          : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200/80 shadow-xs'
                      }`}>
                        {m.text}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1 px-1">
                        {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <form onSubmit={(e) => { e.preventDefault(); handleSendReply(); }} className="flex items-center gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type an official support response..."
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-purple-500 focus:bg-white focus:outline-hidden"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="w-16 h-16 rounded-3xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800 mb-1">Select a Support Ticket</h3>
            <p className="text-xs text-slate-400 max-w-xs">Pick a ticket from the left panel to review inquiry history and reply to the singer.</p>
          </div>
        )}
      </div>
    </div>
  );
}
