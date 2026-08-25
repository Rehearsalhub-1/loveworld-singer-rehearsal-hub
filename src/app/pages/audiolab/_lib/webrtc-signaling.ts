/**
 * WebRTC Signaling Service for AudioLab
 */

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
    // In-memory / WebSocket signaling stub
    void toUserId;
    void type;
    void payload;
  }

  startListening(onMessage: (message: SignalMessage) => void): () => void {
    this.onMessage = onMessage;
    return () => {
      this.onMessage = null;
    };
  }

  async requestOffer(toUserId: string): Promise<void> {
    await this.sendSignal(toUserId, 'offer', { type: 'request' });
  }

  async cleanup(): Promise<void> {
    this.onMessage = null;
  }
}