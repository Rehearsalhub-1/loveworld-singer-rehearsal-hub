import { apiClient } from '@/lib/api-client'
import { subscribe, sendCallSignal } from '@/hooks/useWebSocket'

// Optimized ICE servers - Google STUN + Public TURN fallback
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
]

export interface CallData {
  id: string
  chatId: string
  callerId: string
  callerName: string
  callerAvatar?: string
  receiverId: string
  receiverName?: string
  receiverAvatar?: string
  status: 'ringing' | 'answered' | 'ended' | 'declined' | 'missed'
  startedAt: number
  answeredAt?: number
  endedAt?: number
  duration?: number
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
}

export const CALL_TIMEOUT = 30000

export interface VoiceCallState {
  isInCall: boolean
  isCalling: boolean
  isReceiving: boolean
  isMuted: boolean
  callData: CallData | null
  remoteStream: MediaStream | null
  localStream: MediaStream | null
}

type CallEventCallback = {
  onIncomingCall?: (call: CallData) => void
  onCallAnswered?: (call: CallData) => void
  onCallEnded?: (call: CallData, reason: 'ended' | 'declined' | 'missed' | 'timeout') => void
  onRemoteStream?: (stream: MediaStream) => void
  onIceCandidate?: (candidate: RTCIceCandidate) => void
  onCallTimeout?: (call: CallData) => void
}

export class VoiceCallService {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private currentCallId: string | null = null
  private currentCall: CallData | null = null
  private userId: string
  private callbacks: CallEventCallback = {}
  private unsubscribers: (() => void)[] = []
  private pendingCandidates: RTCIceCandidateInit[] = []
  private callTimeoutId: NodeJS.Timeout | null = null
  private ringtoneGain: GainNode | null = null
  private ringtoneInterval: NodeJS.Timeout | null = null
  private outgoingToneContext: AudioContext | null = null
  private outgoingToneInterval: NodeJS.Timeout | null = null
  private callEndContext: AudioContext | null = null
  private ringtoneContext: AudioContext | null = null

  constructor(userId: string) {
    this.userId = userId
  }

  private safeCloseContext(ctx: AudioContext | null) {
    if (!ctx) return
    try {
      if (ctx.state !== 'closed') {
        ctx.close().catch(() => {})
      }
    } catch {}
  }

  playCallEndSound(type: 'ended' | 'missed' | 'declined' | 'timeout' = 'ended') {
    if (typeof window === 'undefined') return
    try {
      this.safeCloseContext(this.callEndContext)
      this.callEndContext = null
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      this.callEndContext = ctx
      const play = () => {
        if (!this.callEndContext || this.callEndContext !== ctx || ctx.state === 'closed') return
        try {
          const now = ctx.currentTime
          const osc1 = ctx.createOscillator()
          const osc2 = ctx.createOscillator()
          const gainNode = ctx.createGain()
          osc1.type = 'sine'
          osc2.type = 'sine'
          if (type === 'missed' || type === 'timeout') {
            osc1.frequency.value = 392
            osc2.frequency.value = 330
          } else if (type === 'declined') {
            osc1.frequency.value = 440
            osc2.frequency.value = 349
          } else {
            osc1.frequency.value = 523
            osc2.frequency.value = 392
          }
          gainNode.gain.setValueAtTime(0, now)
          gainNode.gain.linearRampToValueAtTime(0.1, now + 0.05)
          gainNode.gain.linearRampToValueAtTime(0.1, now + 0.15)
          gainNode.gain.linearRampToValueAtTime(0, now + 0.4)
          osc1.connect(gainNode)
          osc2.connect(gainNode)
          gainNode.connect(ctx.destination)
          osc1.start(now)
          osc1.stop(now + 0.2)
          osc2.start(now + 0.15)
          osc2.stop(now + 0.4)
          setTimeout(() => { if (this.callEndContext === ctx) { this.safeCloseContext(ctx); this.callEndContext = null } }, 500)
        } catch {}
      }
      if (ctx.state === 'suspended') ctx.resume().then(play).catch(() => {})
      else play()
    } catch (error) { console.warn('[VoiceCall] Error playing call end sound:', error) }
  }

  private playRingtone() {
    if (typeof window === 'undefined') return
    try {
      this.stopRingtone()
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      this.ringtoneContext = ctx
      this.ringtoneGain = ctx.createGain()
      this.ringtoneGain.connect(ctx.destination)
      this.ringtoneGain.gain.value = 0.15
      const playTone = (frequency: number, duration: number, delay: number = 0) => {
        if (!this.ringtoneContext || this.ringtoneContext !== ctx || ctx.state === 'closed' || !this.ringtoneGain) return
        try {
          const osc = ctx.createOscillator()
          const gainNode = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = frequency
          gainNode.gain.setValueAtTime(0, ctx.currentTime + delay)
          gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.05)
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration)
          osc.connect(gainNode)
          gainNode.connect(this.ringtoneGain!)
          osc.start(ctx.currentTime + delay)
          osc.stop(ctx.currentTime + delay + duration)
        } catch {}
      }
      const ringPattern = () => { playTone(523, 0.3, 0); playTone(659, 0.3, 0.35) }
      if (ctx.state === 'suspended') ctx.resume().then(() => { if (this.ringtoneContext === ctx) ringPattern() }).catch(() => {})
      else ringPattern()
      this.ringtoneInterval = setInterval(ringPattern, 2500)
    } catch (error) { console.warn('[VoiceCall] Error playing ringtone:', error) }
  }

  private stopRingtone() {
    if (this.ringtoneInterval) { clearInterval(this.ringtoneInterval); this.ringtoneInterval = null }
    if (this.ringtoneContext) { this.safeCloseContext(this.ringtoneContext); this.ringtoneContext = null }
    this.ringtoneGain = null
  }

  private playOutgoingTone() {
    if (typeof window === 'undefined') return
    this.stopOutgoingTone()
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      this.outgoingToneContext = ctx
      const playBeep = () => {
        if (!this.outgoingToneContext || this.outgoingToneContext !== ctx || ctx.state === 'closed') return
        try {
          const osc = ctx.createOscillator()
          const gainNode = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.value = 440
          gainNode.gain.setValueAtTime(0, ctx.currentTime)
          gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05)
          gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.8)
          gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1)
          osc.connect(gainNode)
          gainNode.connect(ctx.destination)
          osc.start(ctx.currentTime)
          osc.stop(ctx.currentTime + 1)
        } catch {}
      }
      if (ctx.state === 'suspended') ctx.resume().then(() => { if (this.outgoingToneContext === ctx) playBeep() }).catch(() => {})
      else playBeep()
      this.outgoingToneInterval = setInterval(playBeep, 3000)
    } catch (error) { console.warn('[VoiceCall] Error playing outgoing tone:', error) }
  }

  private stopOutgoingTone() {
    if (this.outgoingToneInterval) { clearInterval(this.outgoingToneInterval); this.outgoingToneInterval = null }
    if (this.outgoingToneContext) { this.safeCloseContext(this.outgoingToneContext); this.outgoingToneContext = null }
  }

  private startCallTimeout(call: CallData) {
    this.clearCallTimeout()
    this.callTimeoutId = setTimeout(async () => { await this.handleCallTimeout(call) }, CALL_TIMEOUT)
  }

  private clearCallTimeout() {
    if (this.callTimeoutId) { clearTimeout(this.callTimeoutId); this.callTimeoutId = null }
  }

  private async handleCallTimeout(call: CallData) {
    try {
      const targetUserId = call.callerId === this.userId ? call.receiverId : call.callerId
      sendCallSignal(targetUserId, {
        type: 'call_timeout',
        callId: call.id,
        chatId: call.chatId,
        callerId: call.callerId,
        receiverId: call.receiverId,
      })

      if (call.id) {
        await apiClient.patch(`/calls/${encodeURIComponent(call.id)}`, {
          status: 'missed'
        }).catch(() => {})
      }

      this.callbacks.onCallEnded?.(call, 'timeout')
    } catch (error) {
      console.warn('[VoiceCall] Error handling timeout:', error)
    }

    this.cleanup()
  }

  setCallbacks(callbacks: CallEventCallback) {
    this.callbacks = callbacks
  }

  async checkForPendingCalls(): Promise<boolean> {
    try {
      const res = await apiClient.get<any>('/calls')
      const calls = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      const ringing = calls.find((c: any) => 
        c.receiverId === this.userId && 
        c.status === 'ringing' &&
        (Date.now() - new Date(c.createdAt || c.startedAt).getTime() < 60000)
      )

      if (ringing && !this.currentCallId) {
        const callData: CallData = {
          id: ringing.id,
          chatId: ringing.chatId || '',
          callerId: ringing.callerId,
          callerName: ringing.callerName || 'Caller',
          callerAvatar: ringing.callerAvatar,
          receiverId: ringing.receiverId,
          status: 'ringing',
          startedAt: new Date(ringing.startedAt || ringing.createdAt).getTime(),
          offer: ringing.rawData?.offer || ringing.offer
        }
        this.currentCallId = callData.id
        this.currentCall = callData
        this.playRingtone()
        this.callbacks.onIncomingCall?.(callData)
        return true
      }
      return false
    } catch (error) {
      console.warn('[VoiceCall] Error checking for pending calls:', error)
      return false
    }
  }

  private async handleIncomingSignal(payload: any) {
    if (!payload || typeof payload !== 'object') return
    const { type, callId } = payload

    switch (type) {
      case 'call_invite': {
        if (this.currentCallId && this.currentCallId !== callId) {
          sendCallSignal(payload.callerId, {
            type: 'call_busy',
            callId,
            callerId: payload.callerId,
            receiverId: this.userId,
          })
          return
        }

        const callData: CallData = {
          id: callId,
          chatId: payload.chatId || '',
          callerId: payload.callerId,
          callerName: payload.callerName || 'Caller',
          callerAvatar: payload.callerAvatar,
          receiverId: this.userId,
          receiverName: payload.receiverName,
          receiverAvatar: payload.receiverAvatar,
          status: 'ringing',
          startedAt: payload.startedAt || Date.now(),
          offer: payload.offer
        }

        this.currentCallId = callId
        this.currentCall = callData
        this.playRingtone()
        this.startCallTimeout(callData)
        this.callbacks.onIncomingCall?.(callData)
        break
      }

      case 'call_accept': {
        if (this.currentCall && this.currentCall.id === callId) {
          this.clearCallTimeout()
          this.stopOutgoingTone()

          if (this.peerConnection && payload.answer) {
            try {
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer))
              while (this.pendingCandidates.length > 0) {
                const cand = this.pendingCandidates.shift()
                if (cand) await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand))
              }
            } catch (err) {
              console.warn('[VoiceCall] Error setting remote answer:', err)
            }
          }

          const answeredAt = payload.answeredAt || Date.now()
          this.currentCall = { ...this.currentCall, status: 'answered', answeredAt }
          this.callbacks.onCallAnswered?.(this.currentCall)
        }
        break
      }

      case 'call_ice_candidate': {
        if (payload.candidate) {
          if (this.peerConnection && this.peerConnection.remoteDescription) {
            try {
              await this.peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } catch (err) {
              console.warn('[VoiceCall] Error adding ICE candidate:', err)
            }
          } else {
            this.pendingCandidates.push(payload.candidate)
          }
        }
        break
      }

      case 'call_decline': {
        if (this.currentCall && this.currentCall.id === callId) {
          this.clearCallTimeout()
          this.stopOutgoingTone()
          this.stopRingtone()
          const call = { ...this.currentCall, status: 'declined' as const }
          this.callbacks.onCallEnded?.(call, 'declined')
          this.cleanup()
        }
        break
      }

      case 'call_busy': {
        if (this.currentCall && this.currentCall.id === callId) {
          this.clearCallTimeout()
          this.stopOutgoingTone()
          const call = { ...this.currentCall, status: 'declined' as const }
          this.callbacks.onCallEnded?.(call, 'declined')
          this.cleanup()
        }
        break
      }

      case 'call_timeout': {
        if (this.currentCall && this.currentCall.id === callId) {
          this.clearCallTimeout()
          this.stopOutgoingTone()
          this.stopRingtone()
          const call = { ...this.currentCall, status: 'missed' as const }
          this.callbacks.onCallEnded?.(call, 'timeout')
          this.cleanup()
        }
        break
      }

      case 'call_end': {
        if (this.currentCall && this.currentCall.id === callId) {
          this.clearCallTimeout()
          this.stopOutgoingTone()
          this.stopRingtone()
          const endedAt = Date.now()
          const duration = this.currentCall.answeredAt ? Math.floor((endedAt - this.currentCall.answeredAt) / 1000) : 0
          const call = { ...this.currentCall, status: 'ended' as const, endedAt, duration }
          this.callbacks.onCallEnded?.(call, 'ended')
          this.cleanup()
        }
        break
      }

      default:
        break
    }
  }

  startListening(): () => void {
    if (!this.userId) return () => {}

    const unsubWs = subscribe('call', this.userId, (data: any) => {
      this.handleIncomingSignal(data)
    })

    this.checkForPendingCalls()

    return () => {
      unsubWs()
      this.cleanup()
    }
  }

  async initLocalStream(): Promise<boolean> {
    try {
      if (this.localStream) return true
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      })
      return true
    } catch (error) {
      console.warn('[VoiceCall] Failed to get local audio stream:', error)
      return false
    }
  }

  private createPeerConnection(targetUserId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    })

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!)
      })
    }

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
        this.callbacks.onRemoteStream?.(event.streams[0])
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId) {
        sendCallSignal(targetUserId, {
          type: 'call_ice_candidate',
          callId: this.currentCallId,
          candidate: event.candidate.toJSON()
        })
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.endCall()
      }
    }

    this.peerConnection = pc
    return pc
  }

  async startCall(
    chatId: string,
    receiverId: string,
    callerName: string,
    receiverName: string,
    callerAvatar?: string,
    receiverAvatar?: string
  ): Promise<CallData | null> {
    try {
      this.playOutgoingTone()

      const hasStream = await this.initLocalStream()
      if (!hasStream) {
        this.stopOutgoingTone()
        return null
      }

      const pc = this.createPeerConnection(receiverId)
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      })
      await pc.setLocalDescription(offer)

      const res = await apiClient.post<any>('/calls', {
        receiver_id: receiverId,
        chat_id: chatId,
        caller_name: callerName,
        caller_avatar: callerAvatar,
        type: 'voice',
        offer
      }).catch(() => null)

      const raw = res?.data?.data || res?.data
      const callId = raw?.id || crypto.randomUUID()

      const callData: CallData = {
        id: callId,
        chatId,
        callerId: this.userId,
        callerName,
        callerAvatar,
        receiverId,
        receiverName,
        receiverAvatar,
        status: 'ringing',
        startedAt: Date.now(),
        offer
      }

      this.currentCallId = callData.id
      this.currentCall = callData
      this.startCallTimeout(callData)

      sendCallSignal(receiverId, {
        type: 'call_invite',
        callId: callData.id,
        chatId,
        callerId: this.userId,
        callerName,
        callerAvatar,
        receiverId,
        receiverName,
        receiverAvatar,
        offer,
        startedAt: callData.startedAt
      })

      return callData
    } catch (error) {
      console.warn('[VoiceCall] Error starting call:', error)
      this.stopOutgoingTone()
      this.cleanup()
      return null
    }
  }

  async answerCall(callData: CallData): Promise<boolean> {
    try {
      this.stopRingtone()
      this.clearCallTimeout()

      const hasStream = await this.initLocalStream()
      if (!hasStream) {
        this.declineCall(callData)
        return false
      }

      const pc = this.createPeerConnection(callData.callerId)

      if (callData.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer))
      }

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      while (this.pendingCandidates.length > 0) {
        const cand = this.pendingCandidates.shift()
        if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand))
      }

      const answeredAt = Date.now()
      this.currentCallId = callData.id
      this.currentCall = { ...callData, status: 'answered', answeredAt, answer }

      sendCallSignal(callData.callerId, {
        type: 'call_accept',
        callId: callData.id,
        callerId: callData.callerId,
        receiverId: this.userId,
        answer,
        answeredAt
      })

      await apiClient.patch(`/calls/${encodeURIComponent(callData.id)}`, {
        status: 'answered'
      }).catch(() => {})

      return true
    } catch (error) {
      console.warn('[VoiceCall] Error answering call:', error)
      this.cleanup()
      return false
    }
  }

  async declineCall(callData: CallData): Promise<void> {
    try {
      this.stopRingtone()
      this.clearCallTimeout()

      sendCallSignal(callData.callerId, {
        type: 'call_decline',
        callId: callData.id,
        callerId: callData.callerId,
        receiverId: this.userId
      })

      await apiClient.patch(`/calls/${encodeURIComponent(callData.id)}`, {
        status: 'declined'
      }).catch(() => {})
    } catch (error) {
      console.warn('[VoiceCall] Error declining call:', error)
    }

    this.cleanup()
  }

  async endCall(): Promise<CallData | null> {
    this.stopRingtone()
    this.stopOutgoingTone()
    this.clearCallTimeout()

    let endedCall: CallData | null = null

    try {
      if (this.currentCall) {
        const targetUserId = this.currentCall.callerId === this.userId
          ? this.currentCall.receiverId
          : this.currentCall.callerId

        sendCallSignal(targetUserId, {
          type: 'call_end',
          callId: this.currentCall.id,
          callerId: this.currentCall.callerId,
          receiverId: this.currentCall.receiverId
        })

        if (this.currentCallId) {
          await apiClient.patch(`/calls/${encodeURIComponent(this.currentCallId)}`, {
            status: 'ended'
          }).catch(() => {})
        }

        const endedAt = Date.now()
        const duration = this.currentCall?.answeredAt ? Math.floor((endedAt - this.currentCall.answeredAt) / 1000) : 0
        endedCall = { ...(this.currentCall || {} as any), status: 'ended', endedAt, duration }
      }
    } catch (error) {
      console.warn('[VoiceCall] Error ending call:', error)
    }

    this.cleanup()
    return endedCall
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return !audioTrack.enabled
      }
    }
    return false
  }

  getLocalStream(): MediaStream | null {
    return this.localStream
  }

  getRemoteStream(): MediaStream | null {
    return this.remoteStream
  }

  cleanup() {
    this.stopRingtone()
    this.stopOutgoingTone()
    this.clearCallTimeout()

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop())
      this.localStream = null
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close()
      } catch {}
      this.peerConnection = null
    }

    this.unsubscribers.forEach(unsub => unsub())
    this.unsubscribers = []

    this.remoteStream = null
    this.currentCallId = null
    this.currentCall = null
    this.pendingCandidates = []
  }

  getCurrentCall(): CallData | null {
    return this.currentCall
  }
}
