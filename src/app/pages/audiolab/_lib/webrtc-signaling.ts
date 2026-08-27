/**
 * WebRTC Signaling Service for AudioLab
 */

import { sendCallSignal, subscribe } from '@/hooks/useWebSocket';

export interface SignalMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'request-offer';
  from: string;
  to: string;
  payload: any;
  timestamp: number;
}

export class WebRTCSignaling {
  private sessionId: string;
  private userId: string;
  private onMessage: ((message: SignalMessage) => void) | null = null;

  constructor(sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;
  }

  async sendSignal(toUserId: string, type: SignalMessage['type'], payload: any): Promise<void> {
    const sent = sendCallSignal(toUserId, {
      callId: this.sessionId,
      receiverId: toUserId,
      signal: { type, from: this.userId, to: toUserId, payload, timestamp: Date.now() },
    });
    if (!sent) throw new Error('Realtime signaling connection is unavailable');
  }

  startListening(onMessage: (message: SignalMessage) => void): () => void {
    this.onMessage = onMessage;
    const unsubscribe = subscribe('call', this.userId, (data: any) => {
      const signal = data?.signal;
      if (!signal || data.callId !== this.sessionId || signal.to !== this.userId) return;
      this.onMessage?.(signal as SignalMessage);
    });
    return () => {
      unsubscribe();
      this.onMessage = null;
    };
  }

  async requestOffer(toUserId: string): Promise<void> {
    await this.sendSignal(toUserId, 'request-offer', { type: 'request' });
  }

  async cleanup(): Promise<void> {
    this.onMessage = null;
  }
}