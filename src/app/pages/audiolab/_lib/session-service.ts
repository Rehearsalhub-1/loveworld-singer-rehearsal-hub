/**
 * AUDIOLAB SESSION SERVICE
 * In-memory room and session coordination.
 */

import type {
  AudioLabRoom,
  LiveSession,
  Participant,
  PlaybackState,
  ChatMessage
} from '../_types';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const rooms = new Map<string, AudioLabRoom>();
const sessions = new Map<string, LiveSession>();
const messages = new Map<string, ChatMessage[]>();

export async function createRoom(
  hostId: string,
  hostName: string,
  title: string,
  hostAvatar?: string | null
): Promise<{ success: boolean; room?: AudioLabRoom; error?: string }> {
  try {
    const id = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = generateInviteCode();

    const room: AudioLabRoom = {
      id,
      code,
      title,
      hostId,
      hostName,
      hostAvatar: hostAvatar ?? null,
      settings: {
        isPrivate: false,
        allowGuestMic: true,
        allowGuestVideo: false
      },
      createdAt: Date.now()
    };

    rooms.set(id, room);
    return { success: true, room };
  } catch (e: any) {
    return { success: false, error: e?.message || 'Failed to create room' };
  }
}

export async function getRoom(roomId: string): Promise<AudioLabRoom | null> {
  return rooms.get(roomId) || null;
}

export async function getRoomByCode(code: string): Promise<AudioLabRoom | null> {
  for (const r of rooms.values()) {
    if (r.code?.toUpperCase() === code.toUpperCase()) return r;
  }
  return null;
}

export async function getUserRooms(userId: string): Promise<AudioLabRoom[]> {
  const userRooms: AudioLabRoom[] = [];
  for (const r of rooms.values()) {
    if (r.hostId === userId) userRooms.push(r);
  }
  return userRooms.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteRoom(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  const room = rooms.get(roomId);
  if (!room) return { success: false, error: 'Room not found' };
  if (room.hostId !== userId) return { success: false, error: 'Unauthorized' };
  rooms.delete(roomId);
  return { success: true };
}

export async function activateSession(
  roomId: string,
  hostId: string,
  title: string
): Promise<{ success: boolean; session?: LiveSession; error?: string }> {
  const sessionId = `session_${Date.now()}`;
  const session: LiveSession = {
    id: sessionId,
    roomId,
    hostId,
    title,
    participants: {},
    playback: {
      isPlaying: false,
      currentTime: 0,
      updatedAt: Date.now(),
      updatedBy: hostId
    },
    status: 'active',
    startedAt: Date.now()
  };

  sessions.set(sessionId, session);
  const room = rooms.get(roomId);
  if (room) {
    room.activeSessionId = sessionId;
  }

  return { success: true, session };
}

export async function joinSession(
  sessionId: string,
  user: { id: string; name: string; avatar?: string | null; role: 'host' | 'participant' }
): Promise<{ success: boolean; error?: string }> {
  const session = sessions.get(sessionId);
  if (!session) return { success: false, error: 'Session not found' };

  session.participants[user.id] = {
    ...user,
    isOnline: true,
    isMuted: false,
    isCameraOn: false,
    joinedAt: Date.now(),
    networkQuality: 'good'
  };

  return { success: true };
}

export async function endSession(sessionId: string, roomId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (session) {
    session.status = 'ended';
    session.endedAt = Date.now();
  }
  const room = rooms.get(roomId);
  if (room) {
    room.activeSessionId = null;
  }
}

export function subscribeToSession(sessionId: string, callbacks: any) {
  const s = sessions.get(sessionId);
  if (s && callbacks.onUpdate) callbacks.onUpdate(s);
  return () => {};
}

export async function sendMessage(sessionId: string, message: any) {
  const list = messages.get(sessionId) || [];
  list.push({ ...message, timestamp: Date.now() });
  messages.set(sessionId, list);
}

export async function leaveSession(sessionId: string, userId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (session && session.participants) {
    delete session.participants[userId];
  }
}

export async function toggleMute(sessionId: string, userId: string, isMuted: boolean): Promise<void> {
  const session = sessions.get(sessionId);
  if (session && session.participants?.[userId]) {
    session.participants[userId].isMuted = isMuted;
  }
}

export async function toggleCamera(sessionId: string, userId: string, isCameraOn: boolean): Promise<void> {
  const session = sessions.get(sessionId);
  if (session && session.participants?.[userId]) {
    session.participants[userId].isCameraOn = isCameraOn;
  }
}

export async function getMessages(sessionId: string): Promise<ChatMessage[]> {
  return messages.get(sessionId) || [];
}

export function subscribeToMessages(sessionId: string, callback: (msg: ChatMessage) => void) {
  return () => {};
}

export async function deleteMessage(sessionId: string, messageId: string): Promise<void> {
  const list = messages.get(sessionId) || [];
  messages.set(sessionId, list.filter(m => (m as any).id !== messageId));
}

export async function getSession(sessionId: string): Promise<LiveSession | null> {
  return sessions.get(sessionId) || null;
}

export { generateInviteCode as generateMeetingId };

