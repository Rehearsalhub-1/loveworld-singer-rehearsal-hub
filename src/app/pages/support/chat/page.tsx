"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import SharedDrawer from '@/components/SharedDrawer';
import { getMenuItems } from '@/config/menuItems';
import { useAuth } from '@/hooks/useAuth';
import {
  MessageCircle,
  Send,
  Paperclip,
  Clock,
  ArrowLeft,
  Info,
  ChevronLeft
} from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { UserProfile } from '@/types/supabase';
import { apiClient } from '@/lib/api-client';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderType: 'user' | 'admin';
  timestamp: any;
  isCurrentUser: boolean;
}

export default function ChatSupportPage() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState('');
  const [adminProfiles, setAdminProfiles] = useState<UserProfile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = {
    id: user?.id || 'support-user-123',
    name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : ((user as any)?.name || user?.email || "User") || 'Singer'
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (rawTs: any) => {
    if (!rawTs) return '';
    try {
      const d = new Date(rawTs);
      if (isNaN(d.getTime())) return '';
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} • ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  const loadSupportConversation = async (silent = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const ticketsResponse = await apiClient.get<{ success: boolean; data?: Array<{ id: string }> }>('/support');
      const latestTicket = ticketsResponse.data?.[0];
      if (!latestTicket) return;

      setTicketId(latestTicket.id);
      const messagesResponse = await apiClient.get<{ success: boolean; data?: ChatMessage[] }>(
        `/support/${encodeURIComponent(latestTicket.id)}/messages`,
      );
      setMessages((messagesResponse.data || []).map((message) => ({
        ...message,
        isCurrentUser: message.senderId === user.id || message.senderType === 'user',
      })));
    } catch (error) {
      console.error('Error loading support conversation:', error);
      if (!silent) setLoadError('Unable to load your support conversation. Please try again.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadSupportConversation();
    const interval = setInterval(() => {
      loadSupportConversation(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages.length, loading]);

  // Fetch Admin Profiles for Header
  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const res = await apiClient.get<{ data?: UserProfile[] }>('/profiles/directory');
        const rows = Array.isArray(res.data) ? res.data : [];
        const admins = rows
          .filter((row): row is UserProfile => !!row && typeof row === 'object')
          .slice(0, 3);
        setAdminProfiles(admins);
      } catch (err) {
        console.error("Error fetching admin profiles:", err);
        setAdminProfiles([]);
      }
    };
    fetchAdmins();
  }, []);

  const sendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !user?.id || sending) return;

    setNewMessage('');
    setSending(true);
    setLoadError('');
    try {
      let response: { success: boolean; data?: { id: string } };
      if (ticketId) {
        response = await apiClient.post(`/support/${encodeURIComponent(ticketId)}/messages`, { message: text });
      } else {
        response = await apiClient.post('/support', {
          subject: 'Support Request',
          category: 'general',
          priority: 'normal',
          message: text,
        });
        if (response.data?.id) setTicketId(response.data.id);
      }

      if (!response.success) throw new Error('Support request failed');
      await loadSupportConversation(true);
      scrollToBottom();
    } catch (error) {
      console.error('Error sending support message:', error);
      setNewMessage(text);
      setLoadError('Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col">
      {/* SaaS Style Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="flex -space-x-2">
            {adminProfiles.length > 0 ? (
              adminProfiles.map((admin) => (
                <div key={admin.id} className="w-8 h-8 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center overflow-hidden shadow-xs">
                  {admin.profile_image_url || admin.avatar_url ? (
                    <img
                      src={admin.profile_image_url || admin.avatar_url || ''}
                      alt="Support Team"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-purple-700 bg-purple-50">
                      {(admin.first_name?.[0] || 'A').toUpperCase()}
                    </div>
                  )}
                </div>
              ))
            ) : (
              [1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-purple-100 flex items-center justify-center overflow-hidden shadow-xs">
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-purple-700 bg-purple-50">
                    S
                  </div>
                </div>
              ))
            )}
          </div>

          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Support Team</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Typically replies in 10m</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsMenuOpen(true)}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <div className="w-5 h-5 flex flex-col justify-center gap-0.5">
            <span className="w-full h-0.5 bg-slate-600 rounded-full"></span>
            <span className="w-full h-0.5 bg-slate-600 rounded-full"></span>
            <span className="w-2/3 h-0.5 bg-slate-600 rounded-full ml-auto"></span>
          </div>
        </button>
      </div>

      {/* Modern Conversation Area */}
      <div className="flex-1 overflow-y-auto pt-4 pb-20 px-4 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
        <div className="max-w-2xl mx-auto space-y-6">

          {/* Welcome Message Card */}
          {loadError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 flex items-center justify-between gap-3">
              <span>{loadError}</span>
              <button onClick={() => loadSupportConversation()} className="font-semibold underline">Retry</button>
            </div>
          )}

          {messages.length === 0 && !loading && !loadError && (
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs text-center my-8">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">How can we help?</h2>
              <p className="text-sm text-slate-500 leading-relaxed px-4">
                Ask the support team anything about the app or your account. Our team is ready to assist you.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-purple-600 rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400 font-medium">Connecting to support...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => {
                const showAvatar = idx === 0 || messages[idx - 1]?.senderType !== message.senderType;
                const formattedTime = formatMessageTime(message.timestamp);

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${message.isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!message.isCurrentUser && showAvatar && (
                      <div className="w-7 h-7 rounded-full bg-purple-100 flex-shrink-0 mb-1 overflow-hidden border border-slate-200 shadow-xs flex items-center justify-center">
                        <span className="text-[10px] font-bold text-purple-700">HQ</span>
                      </div>
                    )}
                    {!message.isCurrentUser && !showAvatar && <div className="w-7"></div>}

                    <div
                      className={`max-w-[80%] rounded-3xl px-4 py-2.5 shadow-2xs transition-all ${message.isCurrentUser
                        ? 'bg-purple-600 text-white rounded-br-xs'
                        : 'bg-white text-slate-800 rounded-bl-xs border border-slate-100'
                        }`}
                    >
                      <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-medium">{message.text}</p>
                      {formattedTime && (
                        <div className={`flex items-center justify-end mt-1 ${message.isCurrentUser ? 'text-purple-200' : 'text-slate-400'}`}>
                          <span className="text-[9px] font-semibold uppercase tracking-tight">
                            {formattedTime}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Slick SaaS Input Bar */}
      <div className="bg-white/90 backdrop-blur-xl border-t border-slate-200 p-4 pb-8 sticky bottom-0 z-50">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-purple-500/20 focus-within:border-purple-500 transition-all shadow-inner">
            <button className="p-2 text-slate-400 hover:text-purple-600 transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <textarea
              rows={1}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Send us a message..."
              className="flex-1 bg-transparent py-2 px-1 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none max-h-32 font-medium"
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || sending}
              className="w-10 h-10 bg-purple-600 text-white rounded-xl flex items-center justify-center hover:bg-purple-700 transition-all disabled:opacity-30 disabled:grayscale active:scale-90 shadow-sm shadow-purple-200"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[9px] text-center text-slate-400 mt-2 font-semibold flex items-center justify-center gap-1 uppercase tracking-widest">
            <Info className="w-2.5 h-2.5" />
            End-to-end encrypted support
          </p>
        </div>
      </div>

      <SharedDrawer
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={getMenuItems(() => signOut())}
      />
    </div>
  );
}
