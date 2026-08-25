"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft, Play, Send, Mic, Users,
  Smile, Check, CheckCheck, Clock,
  Trash2, LogOut, Copy, Pause, StopCircle, AlertTriangle
} from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import {
  getMessages,
  sendMessage as sendChatMessage,
  subscribeToMessages,
  deleteMessage,
  endSession,
  leaveSession
} from '../_lib/session-service';
import { VoiceRecorder } from '../_lib/voice-recorder';
import type { ChatMessage } from '../_types';
import { uploadAudioToCloudinary } from '@/lib/cloudinary-storage';

interface Message {
  id: string;
  type: 'text' | 'voice' | 'system' | 'file';
  sender?: { id: string; name: string; avatar: string; isMe?: boolean; };
  content?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  timestamp: string;
  rawTimestamp: number;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

const EMOJIS = ['😀', '😂', '🥰', '😍', '🤩', '😎', '🤗', '', '🥳', '😜', '😇', '🥺', '❤️', '💯', '', '', '', '👏', '', '🙌', '🙏', '', '🎧', '', '', ''];

export interface CollabChatViewProps {
  onClose?: () => void;
  className?: string;
}

export function CollabChatView({ onClose, className = '' }: CollabChatViewProps) {
  const { goBack: contextGoBack, state, setView, clearSession } = useAudioLab();
  const { user, profile } = useAuth();

  // If overlay (onClose exists), use that. Otherwise use context nav
  const handleBack = onClose || contextGoBack;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Confirmation states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    type: 'delete-message' | 'end-session' | 'leave-session',
    item?: any,
    title: string,
    message: string,
    confirmLabel: string
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const voiceRecorder = useRef<VoiceRecorder>(new VoiceRecorder());
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fullName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.displayName || 'You';
  const userAvatar = profile?.avatar_url || user?.photoURL || null;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      // Ensure recorder is stopped
      voiceRecorder.current.stopRecording().catch(() => { });
    };
  }, []);

  const activeSession = state.session?.activeSession;
  const sessionId = activeSession?.id;
  const isHost = user?.uid === activeSession?.hostId;

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // Load & subscribe to messages
  useEffect(() => {
    if (!sessionId) return;
    const load = async () => {
      const msgs = await getMessages(sessionId);
      setMessages(msgs.map(m => convertMessage(m, user?.uid)));
    };
    load();
    const unsub = subscribeToMessages(sessionId, (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, convertMessage(msg, user?.uid)];
      });
    });
    return () => unsub();
  }, [sessionId, user?.uid]);

  const convertMessage = (msg: ChatMessage, uid?: string): Message => ({
    id: msg.id,
    type: msg.type || 'text',
    sender: msg.senderId !== 'system' ? { id: msg.senderId, name: msg.senderName, avatar: msg.senderAvatar || '', isMe: msg.senderId === uid } : undefined,
    content: msg.content,
    voiceUrl: msg.voiceUrl,
    voiceDuration: msg.voiceDuration,
    timestamp: new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    rawTimestamp: msg.timestamp,
    status: msg.status as Message['status'],
  });

  // Send text message
  const handleSend = async () => {
    if (!message.trim() || !sessionId || !user?.uid) return;
    const text = message.trim();
    setMessage('');
    setIsSending(true);
    try {
      await sendChatMessage(sessionId, { type: 'text', content: text, senderId: user.uid, senderName: fullName, ...(userAvatar && { senderAvatar: userAvatar }) });
 } catch (e) { console.error('Failed to send message:', e); }
    setIsSending(false);
  };

  // Voice recording
  const startRecording = async () => {
    if (!sessionId || !user?.uid) return;
    const ok = await voiceRecorder.current.startRecording(() => { });
    if (ok) {
      setIsRecording(true);
      setRecordingTime(0);
      recordingInterval.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
  };

  const stopRecording = async () => {
    if (recordingInterval.current) {
      clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }

    // Capture the final recording time before resetting
    const finalDuration = recordingTime;

    const blob = await voiceRecorder.current.stopRecording();
    setIsRecording(false);
    setRecordingTime(0);

    if (!blob || !sessionId || !user?.uid) return;

    setIsSending(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
      const result = await uploadAudioToCloudinary(file);
      if (result) {
        await sendChatMessage(sessionId, {
          type: 'voice',
          content: 'Voice message',
          senderId: user.uid,
          senderName: fullName,
          ...(userAvatar && { senderAvatar: userAvatar }),
          voiceUrl: result,
          voiceDuration: finalDuration
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (e) {
 console.error('[CollabChatView] Voice upload failed:', e);
      alert('Failed to send voice message. Please check your connection.');
    }
    setIsSending(false);
  };

  // Play voice message
  const playVoice = (id: string, url?: string) => {
    if (!url) return;
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    audioRef.current = new Audio(url);
    audioRef.current.play();
    audioRef.current.onended = () => setPlayingId(null);
    setPlayingId(id);
  };

  // Delete message
  const handleDelete = (id: string) => {
    setConfirmConfig({
      type: 'delete-message',
      item: id,
      title: 'Delete Message',
      message: 'Are you sure you want to delete this message? This action cannot be undone.',
      confirmLabel: 'Delete'
    });
    setShowConfirmModal(true);
  };

  // End/Leave session
  const handleEndSession = () => {
    if (isHost) {
      setConfirmConfig({
        type: 'end-session',
        title: 'End Session',
        message: 'Are you sure you want to end this session for everyone? All participants will be disconnected.',
        confirmLabel: 'End Session'
      });
    } else {
      setConfirmConfig({
        type: 'leave-session',
        title: 'Leave Session',
        message: 'Are you sure you want to leave this session?',
        confirmLabel: 'Leave'
      });
    }
    setShowConfirmModal(true);
  };

  const executeConfirmedAction = async () => {
    if (!confirmConfig || !sessionId || !user?.uid) return;

    if (confirmConfig.type === 'delete-message') {
      await deleteMessage(sessionId, confirmConfig.item);
      setMessages(prev => prev.filter(m => m.id !== confirmConfig.item));
    } else if (confirmConfig.type === 'end-session') {
      await endSession(sessionId, state.session.currentRoom?.id || '');
      clearSession?.();
      setView('collab');
    } else if (confirmConfig.type === 'leave-session') {
      await leaveSession(sessionId, user.uid);
      clearSession?.();
      setView('collab');
    }

    setShowConfirmModal(false);
    setConfirmConfig(null);
  };

  // Copy session code
  const copyCode = () => {
    if (state.session.currentRoom?.code) {
      navigator.clipboard.writeText(state.session.currentRoom.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // No session state
  if (!sessionId) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#1a1025] to-[#0d0612] flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 rounded-full bg-violet-500/20 flex items-center justify-center mb-6">
          <Users className="w-10 h-10 text-violet-400" />
        </div>
        <h2 className="text-white text-xl font-semibold mb-2">No Active Session</h2>
        <p className="text-gray-400 text-center mb-6">Join or create a session to start collaborating</p>
        <button onClick={handleBack} className="px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col z-50 bg-gradient-to-b from-[#1a1025] to-[#0d0612] ${onClose ? '' : 'fixed inset-0'} ${className}`}>
      {/* Header - Compact for Sidebar */}
      <header className={`flex-shrink-0 bg-white/5 backdrop-blur-3xl border-b border-white/5 safe-area-top shadow-xl`}>
        <div className={`flex items-center gap-3 px-4 py-4`}>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold tracking-tight text-lg">In-Room Chat</h1>
            <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest mt-0.5">Secure Collaboration</p>
          </div>

          <button onClick={onClose} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6 rotate-180" />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-violet-500/10 flex items-center justify-center mb-4">
                <Send className="w-8 h-8 text-violet-400" />
              </div>
              <p className="text-gray-400">Send a message to start the conversation</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const showDate = idx === 0 || new Date(msg.rawTimestamp).toDateString() !== new Date(messages[idx - 1].rawTimestamp).toDateString();

              return (
                <div key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-4">
                      <span className="px-3 py-1 bg-white/5 rounded-full text-xs text-gray-400">
                        {new Date(msg.rawTimestamp).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {msg.type === 'system' ? (
                    <div className="flex justify-center">
                      <span className="px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg text-xs text-violet-300">
                        {msg.content}
                      </span>
                    </div>
                  ) : (
                    <MessageBubble msg={msg} onDelete={handleDelete} onPlayVoice={playVoice} playingId={playingId} formatDuration={formatDuration} />
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <footer className="flex-shrink-0 bg-[#1a1025]/95 backdrop-blur-xl border-t border-white/5 safe-area-bottom">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {/* Recording UI */}
          {isRecording ? (
            <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="flex-1 text-red-400 font-medium">Recording... {formatDuration(recordingTime)}</span>
              <button onClick={stopRecording} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors">
                <StopCircle className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              {/* Emoji Button */}
              <div className="relative">
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-2.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
                  <Smile className="w-5 h-5" />
                </button>

                {showEmoji && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEmoji(false)} />
                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-[#2a1f35] border border-white/10 rounded-2xl shadow-xl z-50 p-3">
                      <div className="grid grid-cols-8 gap-1">
                        {EMOJIS.map(e => (
                          <button key={e} onClick={() => { setMessage(m => m + e); setShowEmoji(false); }} className="p-2 text-xl hover:bg-white/10 rounded-lg transition-colors">
                            {e}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Text Input */}
              <div className="flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-full text-white placeholder-gray-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all"
                />
              </div>

              {/* Voice / Send Button */}
              {message.trim() ? (
                <button onClick={handleSend} disabled={isSending} className="p-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 rounded-full text-white transition-colors">
                  {isSending ? <CustomLoader message="" /> : <Send className="w-5 h-5" />}
                </button>
              ) : (
                <button onClick={startRecording} className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
      <ConfirmationModal
        isOpen={showConfirmModal}
        title={confirmConfig?.title || 'Confirmation'}
        message={confirmConfig?.message || ''}
        confirmLabel={confirmConfig?.confirmLabel}
        onConfirm={executeConfirmedAction}
        onCancel={() => {
          setShowConfirmModal(false);
          setConfirmConfig(null);
        }}
        isDanger={true}
      />
    </div>
  );
}

// Message Bubble Component
function MessageBubble({ msg, onDelete, onPlayVoice, playingId, formatDuration }: {
  msg: Message;
  onDelete: (id: string) => void;
  onPlayVoice: (id: string, url?: string) => void;
  playingId: string | null;
  formatDuration: (s: number) => string;
}) {
  const isMe = msg.sender?.isMe;
  const isPlaying = playingId === msg.id;

  return (
    <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {!isMe && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center overflow-hidden">
          {msg.sender?.avatar ? (
            <img src={msg.sender.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-violet-400 text-sm font-medium">{msg.sender?.name?.charAt(0)?.toUpperCase()}</span>
          )}
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
        {/* Sender name (for others) */}
        {!isMe && <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest ml-1">{msg.sender?.name}</span>}

        {/* Message content - Glassmorphism */}
        <div className={`group relative rounded-2xl px-4 py-2.5 transition-all ${isMe
          ? 'bg-violet-600/80 backdrop-blur-md text-white border border-white/10 shadow-lg'
          : 'bg-white/5 backdrop-blur-md text-white border border-white/5 lg:hover:bg-white/10'
          }`}>

          {msg.type === 'voice' ? (
            <div className="flex items-center gap-3 min-w-[180px]">
              <button onClick={() => onPlayVoice(msg.id, msg.voiceUrl)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isMe ? 'bg-white/20 hover:bg-white/30' : 'bg-violet-500/20 hover:bg-violet-500/30'}`}>
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-1 h-6">
                  {[...Array(12)].map((_, i) => (
                    <div key={i} className={`w-1 rounded-full transition-all ${isPlaying && i < 4 ? 'bg-white animate-pulse' : isMe ? 'bg-white/40' : 'bg-violet-400/40'}`} style={{ height: `${8 + Math.random() * 12}px` }} />
                  ))}
                </div>
                <span className={`text-xs ${isMe ? 'text-white/70' : 'text-gray-400'}`}>{msg.voiceDuration ? formatDuration(msg.voiceDuration) : '0:00'}</span>
              </div>
            </div>
          ) : (
            <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
          )}

          {/* Delete button (own messages) */}
          {isMe && (
            <button onClick={() => onDelete(msg.id)} className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Timestamp & Status */}
        <div className={`flex items-center gap-1 text-[10px] text-gray-500 ${isMe ? 'mr-1' : 'ml-1'}`}>
          <span>{msg.timestamp}</span>
          {isMe && msg.status === 'read' && <CheckCheck className="w-3 h-3 text-violet-400" />}
          {isMe && msg.status === 'delivered' && <CheckCheck className="w-3 h-3" />}
          {isMe && msg.status === 'sent' && <Check className="w-3 h-3" />}
          {isMe && msg.status === 'sending' && <Clock className="w-3 h-3" />}
        </div>
      </div>
    </div>
  );
}
