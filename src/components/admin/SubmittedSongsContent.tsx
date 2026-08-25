"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Music, CheckCircle, XCircle, Clock, Eye, MessageSquare,
  User, Calendar, ArrowLeft, RefreshCw, FileText, Play, Pause, Trash2,
  ChevronLeft, ChevronRight, MoreVertical, Edit, Search, Download,
  Check, X, Sparkles, Filter, AlertCircle, Send, ExternalLink, Shield,
  CornerDownRight, Smile, MessageCircle, Reply, CheckCheck, Award,
  Sliders, Mic, Volume2, Copy, LayoutGrid, List, Layers, Quote, Radio
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/stores/authStore';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { useAdminTheme } from './AdminThemeProvider';
import { matchesSearchTokens } from '@/utils/string-utils';

export interface SongSubmissionMessage {
  id: string;
  sender: 'user' | 'admin';
  senderId?: string;
  senderName: string;
  message: string;
  timestamp: string;
  isEdited?: boolean;
  editedAt?: string;
  replyTo?: {
    id: string;
    text: string;
    senderName: string;
  } | null;
  reactions?: Record<string, string[]>;
}

export interface SongSubmission {
  id: string;
  title: string;
  artist?: string;
  writer?: string;
  lyrics?: string;
  audioUrl?: string;
  category?: string;
  key?: string;
  tempo?: string;
  solfas?: string;
  notes?: string;
  rejectNotes?: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  zoneId?: string;
  zoneName?: string;
  submittedBy?: any;
  submittedByEmail?: string;
  createdAt: string;
  conversation?: SongSubmissionMessage[];
  rawData?: any;
}

interface SubmittedSongsPageProps {
  embedded?: boolean;
}

const QUICK_FEEDBACK_CHIPS = [
  '🎵 Approved for Praise Night!',
  '🎹 Needs piano accompaniment track',
  '🎙️ Please re-record vocals in Key G',
  '✨ Excellent lyrics & arrangement',
  '📝 Please update verse 2 lyrics',
  '🔄 Revision requested on tempo',
];

const EMOJI_REACTIONS = ['👍', '❤️', '🎵', '🔥', '✨', '👏'];

// Helper to safely extract clean submitter name & date without displaying raw JSON
function getSubmitterDetails(song: SongSubmission) {
  let name = '';
  let email = '';
  let date = song.createdAt || '';

  const raw = song.submittedBy || song.rawData?.submittedBy || song.rawData?.submittedByName;

  if (typeof raw === 'object' && raw !== null) {
    name = raw.userName || raw.name || raw.firstName || (raw.email ? raw.email.split('@')[0] : '');
    email = raw.email || '';
    if (raw.submittedAt) date = raw.submittedAt;
  } else if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        name = parsed.userName || parsed.name || parsed.firstName || (parsed.email ? parsed.email.split('@')[0] : '');
        email = parsed.email || '';
        if (parsed.submittedAt) date = parsed.submittedAt;
      } catch {
        name = raw;
      }
    } else {
      name = raw;
    }
  }

  if (!name || name === 'Unknown') {
    name = song.submittedByEmail?.split('@')[0] || song.writer || song.artist || 'Member';
  }

  let formattedDate = '';
  try {
    if (date) {
      formattedDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  } catch {
    formattedDate = '';
  }

  return { name, email, date: formattedDate };
}

export function SubmittedSongsContent({ embedded = false }: SubmittedSongsPageProps) {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme } = useAdminTheme();
  const { selectedZoneId, selectedZone, isGlobalView, isHQAdmin } = useAdminZone();

  const [songs, setSongs] = useState<SongSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSong, setSelectedSong] = useState<SongSubmission | null>(null);

  // Active Tab in Detail Modal
  const [activeModalTab, setActiveModalTab] = useState<'chat' | 'lyrics' | 'solfas' | 'notes'>('chat');

  // Rejection modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectSongTarget, setRejectSongTarget] = useState<SongSubmission | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');

  // Audio Playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Conversation & Chat State
  const [chatMessage, setChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SongSubmissionMessage | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [copiedLyrics, setCopiedLyrics] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Actions in flight
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const loadSongs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = isGlobalView ? '/submitted-songs' : `/submitted-songs?zoneId=${selectedZoneId}`;
      const res = await apiClient.get<{ success: boolean; data: SongSubmission[] }>(query);
      if (res && res.data) {
        setSongs(res.data);
        if (selectedSong) {
          const updated = res.data.find(s => s.id === selectedSong.id);
          if (updated) setSelectedSong(updated);
        }
      }
    } catch (err) {
      console.error('Failed to load submitted songs:', err);
      showToast('error', 'Failed to fetch song submissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSongs();
  }, [isGlobalView, selectedZoneId]);

  // Audio play handler
  const handleToggleAudio = (song: SongSubmission) => {
    const url = song.audioUrl || song.rawData?.audioUrl;
    if (!url) return;

    if (playingId === song.id) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingId(song.id);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setPlayingId(null);
      setAudioProgress(0);
    };

    audio.play().catch(err => {
      console.error('Audio playback error:', err);
      setPlayingId(null);
    });
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (activeModalTab === 'chat') {
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [selectedSong?.conversation, activeModalTab]);

  const handleApprove = async (song: SongSubmission) => {
    setProcessingId(song.id);
    try {
      await apiClient.post(`/submitted-songs/${song.id}/approve`, {});
      showToast('success', `"${song.title}" approved!`);
      setSongs(prev => prev.map(s => s.id === song.id ? { ...s, status: 'approved' } : s));
      if (selectedSong?.id === song.id) {
        setSelectedSong(prev => prev ? { ...prev, status: 'approved' } : null);
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to approve song');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectSongTarget) return;
    setProcessingId(rejectSongTarget.id);
    try {
      await apiClient.post(`/submitted-songs/${rejectSongTarget.id}/reject`, { notes: rejectNotes });
      showToast('success', `Submission rejected with feedback`);
      setSongs(prev => prev.map(s => s.id === rejectSongTarget.id ? { ...s, status: 'rejected', rejectNotes } : s));
      if (selectedSong?.id === rejectSongTarget.id) {
        setSelectedSong(prev => prev ? { ...prev, status: 'rejected', rejectNotes } : null);
      }
      setShowRejectModal(false);
      setRejectNotes('');
      setRejectSongTarget(null);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to reject submission');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (song: SongSubmission) => {
    if (!window.confirm(`Delete "${song.title}"?`)) return;
    setProcessingId(song.id);
    try {
      await apiClient.delete(`/submitted-songs/${song.id}`);
      showToast('success', `Submission deleted`);
      setSongs(prev => prev.filter(s => s.id !== song.id));
      if (selectedSong?.id === song.id) setSelectedSong(null);
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete submission');
    } finally {
      setProcessingId(null);
    }
  };

  // --- CONVERSATION CRUD HANDLERS ---
  const handleSendMessage = async (customMessage?: string) => {
    const textToSend = (customMessage || chatMessage).trim();
    if (!selectedSong || !textToSend || sendingChat) return;

    const senderDisplayName = profile?.displayName || (profile as any)?.firstName || user?.email?.split('@')[0] || 'Admin Reviewer';

    setSendingChat(true);
    try {
      const payload: any = {
        message: textToSend,
        senderName: senderDisplayName,
      };

      if (replyingTo) {
        payload.replyTo = {
          id: replyingTo.id,
          text: replyingTo.message,
          senderName: replyingTo.senderName,
        };
      }

      const res = await apiClient.post<any>(`/submitted-songs/${selectedSong.id}/reply`, payload);
      const updatedConversation: SongSubmissionMessage[] = res?.data || (selectedSong.conversation || []).concat([{
        id: `msg_${Date.now()}`,
        sender: 'admin',
        senderName: senderDisplayName,
        message: textToSend,
        timestamp: new Date().toISOString(),
        replyTo: payload.replyTo,
        reactions: {},
      }]);

      setSelectedSong(prev => prev ? { ...prev, conversation: updatedConversation } : null);
      setSongs(prev => prev.map(s => s.id === selectedSong.id ? { ...s, conversation: updatedConversation } : s));

      setChatMessage('');
      setReplyingTo(null);
      showToast('success', 'Comment sent');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to send message');
    } finally {
      setSendingChat(false);
    }
  };

  const handleEditMessage = async (messageId: string) => {
    if (!selectedSong || !editingText.trim()) return;
    try {
      const res = await apiClient.patch<any>(`/submitted-songs/${selectedSong.id}/conversation/${messageId}`, {
        message: editingText.trim(),
      });
      const updated = res?.data || (selectedSong.conversation || []).map(m => m.id === messageId ? { ...m, message: editingText.trim(), isEdited: true } : m);
      setSelectedSong(prev => prev ? { ...prev, conversation: updated } : null);
      setSongs(prev => prev.map(s => s.id === selectedSong.id ? { ...s, conversation: updated } : s));
      setEditingMessageId(null);
      setEditingText('');
      showToast('success', 'Message updated');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to edit message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedSong || !window.confirm('Delete this comment?')) return;
    try {
      const res = await apiClient.delete<any>(`/submitted-songs/${selectedSong.id}/conversation/${messageId}`);
      const updated = res?.data || (selectedSong.conversation || []).filter(m => m.id !== messageId);
      setSelectedSong(prev => prev ? { ...prev, conversation: updated } : null);
      setSongs(prev => prev.map(s => s.id === selectedSong.id ? { ...s, conversation: updated } : s));
      showToast('success', 'Message deleted');
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to delete message');
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!selectedSong) return;
    try {
      const res = await apiClient.post<any>(`/submitted-songs/${selectedSong.id}/conversation/${messageId}/react`, {
        emoji,
      });
      if (res?.data) {
        setSelectedSong(prev => prev ? { ...prev, conversation: res.data } : null);
        setSongs(prev => prev.map(s => s.id === selectedSong.id ? { ...s, conversation: res.data } : s));
      }
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const handleCopyLyrics = () => {
    if (!selectedSong?.lyrics) return;
    navigator.clipboard.writeText(selectedSong.lyrics);
    setCopiedLyrics(true);
    setTimeout(() => setCopiedLyrics(false), 2000);
  };

  const getActivityTimestamp = (s: any): number => {
    const candidates = [
      s.lastActivityAt,
      s.updatedAt,
      s.createdAt,
      s.rawData?.lastActivityAt,
      s.rawData?.updatedAt,
      s.rawData?.createdAt,
      s.rawData?.submittedAt,
    ];
    if (Array.isArray(s.conversation) && s.conversation.length > 0) {
      const lastMsg = s.conversation[s.conversation.length - 1];
      if (lastMsg?.timestamp) candidates.push(lastMsg.timestamp);
    }
    for (const c of candidates) {
      if (c) {
        const ms = new Date(c).getTime();
        if (!isNaN(ms) && ms > 0) return ms;
      }
    }
    return 0;
  };

  // Filtered & Search (Sorted with latest activity / replies / edits at the top)
  const filteredSongs = useMemo(() => {
    const list = Array.isArray(songs) ? songs : [];
    const filtered = list.filter(song => {
      if (filter !== 'all' && song.status !== filter) return false;
      if (!searchQuery.trim()) return true;
      const sub = getSubmitterDetails(song);
      return matchesSearchTokens(
        [
          song.title,
          song.writer,
          song.artist,
          sub.name,
          sub.email,
          song.zoneName,
          song.category,
          song.key,
          song.lyrics,
          song.notes
        ],
        searchQuery
      );
    });

    return filtered.sort((a, b) => getActivityTimestamp(b) - getActivityTimestamp(a));
  }, [songs, filter, searchQuery]);

  const counts = useMemo(() => {
    const list = Array.isArray(songs) ? songs : [];
    return {
      all: list.length,
      pending: list.filter(s => s.status === 'pending' || !s.status).length,
      approved: list.filter(s => s.status === 'approved').length,
      rejected: list.filter(s => s.status === 'rejected').length,
    };
  }, [songs]);

  const paginatedSongs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredSongs.slice(start, start + itemsPerPage);
  }, [filteredSongs, currentPage]);

  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage) || 1;

  return (
    <div className={`flex-1 flex flex-col h-full bg-[#fafbfc] overflow-hidden ${embedded ? '' : 'p-4 md:p-6'}`}>
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold text-white transition-all animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* UNIFIED CLEAN CONTROL BAR (No double headers / no noisy boxes) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 flex-shrink-0">
        
        {/* Title & Status Tabs */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Submitted Songs
            </h1>
            <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
              {counts.all}
            </span>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block" />

          {/* Minimal Status Tabs */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setFilter('all'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === 'all'
                  ? 'bg-purple-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({counts.all})
            </button>

            <button
              onClick={() => { setFilter('pending'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>Pending</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${filter === 'pending' ? 'bg-amber-700 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => { setFilter('approved'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === 'approved'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Approved ({counts.approved})
            </button>

            <button
              onClick={() => { setFilter('rejected'); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === 'rejected'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Rejected ({counts.rejected})
            </button>
          </div>
        </div>

        {/* Right Side: View Mode & Search */}
        <div className="flex items-center gap-2">
          
          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white text-purple-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white text-purple-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'}`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search submissions..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 focus:bg-white text-xs font-medium text-slate-800 rounded-xl border border-slate-200 outline-none focus:border-purple-600 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadSongs()}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors disabled:opacity-50"
            title="Refresh submissions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

        </div>

      </div>

      {/* MAIN CARDS / LIST (Clean, spacious, no nested ugly boxes) */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <div className="w-7 h-7 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium text-slate-400">Loading submissions...</p>
          </div>
        ) : filteredSongs.length > 0 ? (
          viewMode === 'grid' ? (
            /* CLEAN MINIMALIST CARDS */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {paginatedSongs.map((song) => {
                const isPending = song.status === 'pending' || !song.status;
                const isApproved = song.status === 'approved';
                const isRejected = song.status === 'rejected';
                const hasAudio = !!(song.audioUrl || song.rawData?.audioUrl);
                const isPlaying = playingId === song.id;
                const commentCount = (song.conversation || []).length;
                const submitter = getSubmitterDetails(song);

                return (
                  <div
                    key={song.id}
                    className="bg-white rounded-2xl p-4 border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="space-y-2.5">
                      
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                            {song.title}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            By <span className="text-slate-600 font-medium">{song.writer || song.artist || 'Unknown'}</span>
                          </p>
                        </div>

                        {/* Status Badge */}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          isApproved ? 'bg-emerald-50 text-emerald-700' :
                          isRejected ? 'bg-rose-50 text-rose-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                        </span>
                      </div>

                      {/* Clean Submitter Line (no big box) */}
                      <div className="text-xs text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="font-medium text-slate-700">
                          {submitter.name}
                        </span>
                        {submitter.date && (
                          <span className="text-[11px] text-slate-400">
                            {submitter.date}
                          </span>
                        )}
                      </div>

                      {/* Clean Tags: Key & Category */}
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {song.category && (
                          <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                            {song.category}
                          </span>
                        )}
                        {song.key && (
                          <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-medium">
                            Key {song.key}
                          </span>
                        )}
                        {song.zoneName && (
                          <span className="text-slate-400 text-[10px] truncate max-w-[120px]">
                            {song.zoneName}
                          </span>
                        )}
                      </div>

                      {/* 1-Line Lyrics Snippet */}
                      {song.lyrics && (
                        <p className="text-xs text-slate-500 line-clamp-1 italic bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                          &quot;{song.lyrics.replace(/\n+/g, ' ')}&quot;
                        </p>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      
                      {/* Audio Button */}
                      {hasAudio ? (
                        <button
                          onClick={() => handleToggleAudio(song)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors ${
                            isPlaying
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                          <span>{isPlaying ? 'Playing' : 'Audio'}</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400">No audio</span>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => { setSelectedSong(song); setActiveModalTab('chat'); }}
                          className="flex items-center gap-1 px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat {commentCount > 0 ? `(${commentCount})` : ''}</span>
                        </button>

                        {isPending && (
                          <>
                            <button
                              onClick={() => { setRejectSongTarget(song); setShowRejectModal(true); }}
                              disabled={processingId === song.id}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleApprove(song)}
                              disabled={processingId === song.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
                            >
                              Approve
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDelete(song)}
                          disabled={processingId === song.id}
                          className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* CLEAN COMPACT TABLE */
            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-4">Title</th>
                    <th className="py-2.5 px-4">Submitter</th>
                    <th className="py-2.5 px-4">Key / Category</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedSongs.map((song) => {
                    const submitter = getSubmitterDetails(song);
                    const isPending = song.status === 'pending' || !song.status;
                    const isApproved = song.status === 'approved';
                    const isRejected = song.status === 'rejected';
                    const commentCount = (song.conversation || []).length;

                    return (
                      <tr key={song.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{song.title}</span>
                          <span className="text-[11px] text-slate-400">{song.writer || 'Unknown'}</span>
                        </td>
                        <td className="py-3 px-4 font-medium">
                          <span>{submitter.name}</span>
                          {submitter.date && <span className="text-[10px] text-slate-400 block">{submitter.date}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 px-2 py-0.5 rounded-md font-medium mr-1">{song.category || 'General'}</span>
                          {song.key && <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md font-medium">Key {song.key}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isApproved ? 'bg-emerald-50 text-emerald-700' :
                            isRejected ? 'bg-rose-50 text-rose-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setSelectedSong(song); setActiveModalTab('chat'); }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold"
                            >
                              Chat {commentCount > 0 ? `(${commentCount})` : ''}
                            </button>
                            {isPending && (
                              <button
                                onClick={() => handleApprove(song)}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <div className="py-20 text-center flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200/80 p-8">
            <Music className="w-8 h-8 text-slate-300 mb-2" />
            <h3 className="text-xs font-bold text-slate-700">No song submissions found</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {filter !== 'all' ? `No ${filter} songs.` : 'No submissions found in this zone.'}
            </p>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <p className="text-xs text-slate-400">
              Page {currentPage} of {totalPages} ({filteredSongs.length} songs)
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-white border border-slate-200 text-slate-700 text-xs font-medium rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. CONVERSATION & REVIEW STUDIO MODAL */}
      {selectedSong && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">{selectedSong.title}</h2>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedSong.status === 'approved' ? 'bg-emerald-50 text-emerald-700' :
                    selectedSong.status === 'rejected' ? 'bg-rose-50 text-rose-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {selectedSong.status || 'Pending'}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  By {selectedSong.writer || 'Unknown'} • Submitted by {getSubmitterDetails(selectedSong).name}
                </p>
              </div>

              <button
                onClick={() => { setSelectedSong(null); setReplyingTo(null); setEditingMessageId(null); }}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: 2 Columns */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-slate-50/50">
              
              {/* Left Pane (Details & Lyrics) */}
              <div className="md:col-span-5 border-r border-slate-200/80 bg-white p-4 overflow-y-auto space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  
                  {/* Audio Player if present */}
                  {(selectedSong.audioUrl || selectedSong.rawData?.audioUrl) && (
                    <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleToggleAudio(selectedSong)}
                          className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs"
                        >
                          {playingId === selectedSong.id ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                        </button>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Reference Track</p>
                          <p className="text-[10px] text-slate-400">Key {selectedSong.key || 'N/A'}</p>
                        </div>
                      </div>
                      <a
                        href={selectedSong.audioUrl || selectedSong.rawData?.audioUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-purple-600 hover:text-purple-700 font-bold"
                      >
                        Open
                      </a>
                    </div>
                  )}

                  {/* Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveModalTab('chat')}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition-colors ${
                        activeModalTab === 'chat' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveModalTab('lyrics')}
                      className={`flex-1 py-1 text-xs font-bold rounded-lg transition-colors ${
                        activeModalTab === 'lyrics' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      Lyrics
                    </button>
                    {selectedSong.solfas && (
                      <button
                        onClick={() => setActiveModalTab('solfas')}
                        className={`flex-1 py-1 text-xs font-bold rounded-lg transition-colors ${
                          activeModalTab === 'solfas' ? 'bg-white text-purple-700 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Solfas
                      </button>
                    )}
                  </div>

                  {/* Tab Content */}
                  {activeModalTab === 'lyrics' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Lyrics</span>
                        <button onClick={handleCopyLyrics} className="text-[10px] text-purple-600 font-bold">
                          {copiedLyrics ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto leading-relaxed">
                        {selectedSong.lyrics || 'No lyrics provided.'}
                      </div>
                    </div>
                  )}

                  {activeModalTab === 'solfas' && (
                    <div className="p-3 bg-slate-50 rounded-xl font-mono text-xs text-slate-700 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {selectedSong.solfas || 'No solfas.'}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">Category:</span>
                      <span className="font-bold">{selectedSong.category || 'General'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Musical Key:</span>
                      <span className="font-bold">Key {selectedSong.key || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Left Bottom Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => { setRejectSongTarget(selectedSong); setShowRejectModal(true); }}
                    className="flex-1 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedSong)}
                    disabled={processingId === selectedSong.id}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                  >
                    Approve Song
                  </button>
                </div>
              </div>

              {/* Right Pane (Chat Stream) */}
              <div className="md:col-span-7 flex flex-col h-full bg-slate-50 overflow-hidden">
                
                {/* Messages List */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {(!selectedSong.conversation || selectedSong.conversation.length === 0) ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <MessageCircle className="w-8 h-8 text-slate-300 mb-1" />
                      <p className="text-xs text-slate-500 font-medium">No feedback comments yet</p>
                      <p className="text-[10px] text-slate-400">Leave a note or prompt below.</p>
                    </div>
                  ) : (
                    selectedSong.conversation.map((msg) => {
                      const isAdmin = msg.sender === 'admin';
                      const isEditing = editingMessageId === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} group`}
                        >
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-0.5 px-1">
                            <span className="font-bold text-slate-700">{msg.senderName}</span>
                            <span>•</span>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {msg.isEdited && <span className="italic">(edited)</span>}
                          </div>

                          <div className={`p-3 rounded-2xl text-xs max-w-[90%] ${
                            isAdmin
                              ? 'bg-purple-600 text-white rounded-tr-xs'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                          }`}>
                            {msg.replyTo && (
                              <div className={`mb-1.5 p-1.5 rounded-lg text-[10px] border-l-2 ${
                                isAdmin ? 'bg-purple-700/60 border-purple-300 text-purple-100' : 'bg-slate-100 border-purple-500 text-slate-600'
                              }`}>
                                <span className="font-bold block">{msg.replyTo.senderName}</span>
                                <span className="line-clamp-1 italic">{msg.replyTo.text}</span>
                              </div>
                            )}

                            {isEditing ? (
                              <div className="space-y-1.5">
                                <textarea
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  className="w-full p-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-xs"
                                  rows={2}
                                />
                                <div className="flex justify-end gap-1">
                                  <button onClick={() => setEditingMessageId(null)} className="px-2 py-0.5 bg-slate-200 text-slate-700 text-[10px] rounded">Cancel</button>
                                  <button onClick={() => handleEditMessage(msg.id)} className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] rounded font-bold">Save</button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                            )}

                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                              <div className="flex gap-1 mt-1.5 pt-1 border-t border-black/10">
                                {Object.entries(msg.reactions).map(([emoji, users]) => (
                                  <span key={emoji} className={`text-[10px] px-1 py-0.5 rounded ${isAdmin ? 'bg-purple-700' : 'bg-slate-100'}`}>
                                    {emoji} {users.length}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Quick Message Actions */}
                          {!isEditing && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 px-1">
                              <button onClick={() => setReplyingTo(msg)} className="hover:text-purple-600">Reply</button>
                              {isAdmin && (
                                <>
                                  <span>•</span>
                                  <button onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.message); }} className="hover:text-purple-600">Edit</button>
                                </>
                              )}
                              <span>•</span>
                              <button onClick={() => handleDeleteMessage(msg.id)} className="hover:text-rose-600">Delete</button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Prompts */}
                <div className="px-3 py-1.5 bg-white border-t border-slate-200 flex gap-1 overflow-x-auto">
                  {QUICK_FEEDBACK_CHIPS.map((chip, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(chip)}
                      disabled={sendingChat}
                      className="text-[10px] bg-slate-100 hover:bg-purple-50 hover:text-purple-700 text-slate-600 px-2 py-0.5 rounded-lg whitespace-nowrap"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Composer */}
                <div className="p-3 bg-white border-t border-slate-200">
                  {replyingTo && (
                    <div className="mb-1.5 p-1.5 bg-purple-50 rounded-lg text-xs text-purple-800 flex items-center justify-between">
                      <span className="line-clamp-1">Replying to <strong>{replyingTo.senderName}</strong>: {replyingTo.message}</span>
                      <button onClick={() => setReplyingTo(null)}><X className="w-3 h-3" /></button>
                    </div>
                  )}

                  <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex gap-2">
                    <input
                      type="text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Write feedback or advice..."
                      className="flex-1 px-3 py-2 bg-slate-50 focus:bg-white text-xs text-slate-800 rounded-xl border border-slate-200 outline-none focus:border-purple-600"
                    />
                    <button
                      type="submit"
                      disabled={!chatMessage.trim() || sendingChat}
                      className="px-3.5 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 disabled:opacity-40"
                    >
                      Send
                    </button>
                  </form>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Reject Song Submission</h3>
            <textarea
              rows={3}
              value={rejectNotes}
              onChange={(e) => setRejectNotes(e.target.value)}
              placeholder="Provide reason or feedback..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowRejectModal(false); setRejectSongTarget(null); }} className="px-3 py-1.5 bg-slate-100 text-xs font-bold rounded-xl text-slate-600">Cancel</button>
              <button onClick={handleRejectSubmit} className="px-3 py-1.5 bg-rose-600 text-white text-xs font-bold rounded-xl">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default SubmittedSongsContent;
