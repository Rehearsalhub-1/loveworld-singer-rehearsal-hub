"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Hash, Users, Share2, Trash2, ArrowLeft, MoreVertical, Settings } from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import {
  getUserRooms,
  createRoom,
  deleteRoom, // Need to implement this in service
  getRoomByCode
} from '../_lib/session-service';
import type { AudioLabRoom } from '../_types';

export function CollabView() {
  const { setView, state, setRoom, enterRoom, joinRoomByCode } = useAudioLab();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [rooms, setRooms] = useState<AudioLabRoom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fullName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.displayName || 'Singer';
  const userAvatar = profile?.avatar_url || user?.photoURL;

  const loadRooms = async () => {
    if (!user?.uid) return;
    try {
      const data = await getUserRooms((user.uid || user.id || ""));
      setRooms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, [user?.uid]);

  const handleCreate = async () => {
    if (!user?.uid || !roomName.trim()) return;
    setIsCreating(true);
    try {
      const res = await createRoom((user.uid || user.id || ""), fullName, roomName.trim(), userAvatar);
      if (res.success && res.room) {
        setShowCreateModal(false);
        setRoomName('');
        await loadRooms();
        // Enter the room lobby immediately
        enterRoom(res.room.id);
      } else {
        alert(res.error || 'Failed to create room');
        setError(res.error || 'Failed to create');
      }
    } catch (e) {
      alert('Error creating room. Please try again.');
      setError('Error creating room');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setIsLoading(true);
    const success = await joinRoomByCode(joinCode.trim());
    if (!success) {
      setError('Invalid code');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#0f0716] text-white h-full relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/2 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('home')} className="p-2 -ml-2 rounded-full hover:bg-white/5 text-white/60 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Classrooms</h1>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
        >
          <Plus size={18} />
          <span>New Room</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        {/* Quick Join */}
        <section className="bg-white/5 rounded-3xl p-6 border border-white/10">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-lg font-bold">Join Room</h2>
              <p className="text-white/40 text-xs">Enter a 6-character code to join a rehearsal</p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                <input 
                  type="text" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="CODE12"
                  maxLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-indigo-500 transition-all font-mono tracking-widest"
                />
              </div>
              <button 
                onClick={handleJoin}
                disabled={joinCode.length < 6}
                className="px-8 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold transition-all disabled:opacity-30 active:scale-95"
              >
                Join
              </button>
            </div>
          </div>
        </section>

        {/* Room List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-sm font-bold text-white/40 uppercase tracking-widest">My Rooms</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/60 font-mono">{rooms.length}</span>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center"><CustomLoader message="" /></div>
          ) : rooms.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-white/20 gap-4">
              <Users size={48} strokeWidth={1} />
              <p className="text-sm">No rooms created yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rooms.map((room) => (
                <button 
                  key={room.id}
                  onClick={() => enterRoom(room.id)}
                  className="group relative flex flex-col p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-indigo-500/30 hover:bg-white/8 transition-all text-left active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start">
                    <div className="size-12 rounded-2xl bg-indigo-600/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                      <Users size={24} />
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-mono text-indigo-300 border border-white/10 uppercase tracking-widest shadow-sm">
                        {room.code}
                      </div>
                      {room.hostId === user?.uid && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this classroom?')) {
                              deleteRoom(room.id, (user.uid || user.id || "")).then(() => loadRooms());
                            }
                          }}
                          className="p-2 rounded-xl hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors line-clamp-1">{room.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                       <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                       <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest">
                         Host: {room.hostId === user?.uid ? 'You' : room.hostName}
                       </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#1a1021] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-bold mb-2">New Room</h2>
            <p className="text-white/40 text-sm mb-6">Create a permanent space for your choir or team.</p>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/30 uppercase tracking-widest ml-1">Room Title</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="e.g. Tenors Section"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all">Cancel</button>
                <button 
                  onClick={handleCreate}
                  disabled={!roomName.trim() || isCreating}
                  className="flex-[2] py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
