"use client";

import { useState, useEffect, useRef } from 'react';
import {
  Mic, MicOff, PhoneOff, Check, Volume2, MessageCircle, Share2,
  Users, Video, VideoOff, Copy, User, UserPlus, Info, MoreHorizontal
} from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import {
  subscribeToSession,
  joinSession,
  leaveSession,
  sendMessage
} from '../_lib/session-service';
import { WebRTCService } from '../_lib/webrtc-service';
import { ToastContainer, Toast } from '@/components/Toast';

export function LiveSessionView() {
  const { state, setView, clearSession } = useAudioLab();
  const { user, profile } = useAuth();
  
  const currentRoom = state.session.currentRoom;
  const activeSession = state.session.activeSession;
  
  const [participants, setParticipants] = useState<any[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const webRTCService = useRef<WebRTCService | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fullName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.displayName || 'Singer';
  const userAvatar = profile?.avatar_url || user?.photoURL;

  // 1. Initialize Signaling & Media
  useEffect(() => {
    if (!activeSession?.id || !user?.uid) return;

    webRTCService.current = new WebRTCService();
    webRTCService.current.initializeSignaling(activeSession.id, (user.uid || user.id || ""));

    webRTCService.current.setOnRemoteStreamAdded((userId, stream) => {
      setRemoteStreams(prev => new Map(prev).set(userId, stream));
    });

    webRTCService.current.initializeLocalStream().then(success => {
      if (success) {
        // Start Join flow
        joinSession(activeSession.id, {
          id: (user.uid || user.id || ""),
          name: fullName,
          avatar: userAvatar,
          role: activeSession.hostId === (user.uid || user.id || "") ? 'host' : 'participant'
        });

        timerRef.current = setInterval(() => setElapsedTime(prev => prev + 1), 1000);
      }
    });

    const unsub = subscribeToSession(activeSession.id, {
      onUpdate: (data: any) => {
        if (data.participants) {
          const pList = Object.values(data.participants);
          setParticipants(pList);
          
          // Mesh: Auto-connect to new people
          pList.forEach((p: any) => {
            if (p.id !== (user.uid || user.id || "") && (user.uid || user.id || "") < p.id) {
              webRTCService.current?.initiateConnection(p.id);
            }
          });
        }
      }
    });

    return () => {
      unsub();
      if (timerRef.current) clearInterval(timerRef.current);
      webRTCService.current?.dispose();
    };
  }, [activeSession?.id]);

  const handleExit = async () => {
    if (!activeSession?.id || !user?.uid) return;
    clearSession();
    setView('collab');
  };

  const addToast = (message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type, duration: 3000 }]);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050208] text-white overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 bg-white/2 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="size-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          <h1 className="text-sm font-bold tracking-tight uppercase opacity-60">Rehearsal: {activeSession?.title}</h1>
          <span className="text-xs font-mono opacity-30">| {formatTime(elapsedTime)}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => addToast(`Code: ${currentRoom?.code}`, 'info')} className="p-2 rounded-full hover:bg-white/5 text-white/40 hover:text-white transition-colors">
            <Info size={18} />
          </button>
          <button onClick={handleExit} className="px-5 py-2 rounded-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white text-xs font-bold transition-all border border-red-500/20">
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <main className="flex-1 p-6 flex items-center justify-center relative overflow-hidden">
        <div className={`grid gap-6 w-full h-full max-w-7xl content-center ${
          participants.length <= 1 ? 'grid-cols-1 max-w-2xl' : 
          participants.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
          'grid-cols-2 lg:grid-cols-3'
        }`}>
          {/* My View */}
          <ParticipantView 
            name={fullName} 
            avatar={userAvatar} 
            isMe 
            isMuted={isMuted} 
            stream={webRTCService.current?.getLocalStream()} 
            videoOn={showVideo}
          />
          
          {/* Others */}
          {participants.filter(p => p.id !== user?.uid).map(p => (
            <ParticipantView 
              key={p.id}
              name={p.name}
              avatar={p.avatar}
              isMuted={p.isMuted}
              stream={remoteStreams.get(p.id)}
              videoOn={p.isCameraOn}
            />
          ))}
        </div>
      </main>

      {/* Bottom Controls */}
      <div className="px-6 py-8 flex justify-center sticky bottom-0 z-30">
        <div className="flex items-center gap-3 px-6 py-3 bg-[#130a1c]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-2xl">
          <button 
            onClick={() => { setIsMuted(!isMuted); webRTCService.current?.toggleMute(!isMuted); }}
            className={`size-14 rounded-full flex flex-col items-center justify-center transition-all ${isMuted ? 'bg-red-500/20 text-red-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
          </button>
          
          <button 
            onClick={() => setShowVideo(!showVideo)}
            className={`size-14 rounded-full flex flex-col items-center justify-center transition-all ${!showVideo ? 'bg-red-500/20 text-red-500' : 'bg-white/5 hover:bg-white/10 text-white'}`}
          >
            {!showVideo ? <VideoOff size={22} /> : <Video size={22} />}
          </button>

          <div className="w-px h-8 bg-white/10 mx-2" />

          <button className="size-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all">
            <Users size={22} />
          </button>

          <button 
            onClick={() => setChatOpen(!chatOpen)}
            className="size-14 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
          >
            <MessageCircle size={22} />
          </button>
        </div>
      </div>

      {/* Hidden Audio Players */}
      {Array.from(remoteStreams.entries()).map(([id, stream]) => (
        <audio key={id} autoPlay playsInline ref={el => { if(el) el.srcObject = stream; }} className="hidden" />
      ))}

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </div>
  );
}

function ParticipantView({ name, avatar, isMe, isMuted, stream, videoOn }: any) {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  useEffect(() => {
    if (videoRef.current && stream && videoOn) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoOn]);

  return (
    <div className="relative aspect-video rounded-[2.5rem] bg-white/5 border border-white/5 overflow-hidden flex items-center justify-center shadow-xl group">
      {videoOn && stream ? (
        <video ref={videoRef} autoPlay playsInline muted={isMe} className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="size-24 rounded-[2rem] bg-indigo-600/20 flex items-center justify-center text-3xl font-bold text-indigo-400 border border-indigo-500/20 shadow-2xl">
          {avatar ? <img src={avatar} className="size-full object-cover" /> : name[0]}
        </div>
      )}
      
      {/* HUD */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-2xl text-[10px] font-bold uppercase tracking-widest border border-white/5">
          {name} {isMe && '(You)'}
        </div>
        {isMuted && (
          <div className="size-8 bg-red-500/20 backdrop-blur-md rounded-xl flex items-center justify-center text-red-500 border border-red-500/20">
            <MicOff size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
