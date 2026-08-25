"use client";

import { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2 } from 'lucide-react'
import { useCall } from '@/contexts/CallContext'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'

// Helper to darken colors for gradients
function darkenColor(hex: string, percent: number) {
  const num = parseInt(hex.replace('#', ''), 16)
  const amt = Math.round(2.55 * percent)
  const R = Math.max((num >> 16) - amt, 0)
  const G = Math.max((num >> 8 & 0x00FF) - amt, 0)
  const B = Math.max((num & 0x0000FF) - amt, 0)
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)
}

export function CallOverlay() {
  const { user } = useAuth()
  const { currentZone } = useZone()
  const { 
    callState, 
    currentCall, 
    isMuted, 
    callDuration, 
    remoteStream, 
    answerCall, 
    declineCall, 
    endCall, 
    toggleMute 
  } = useCall()
  
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  
  // Get zone color
  const primaryColor = currentZone?.themeColor || '#8B5CF6'
  const darkColor = darkenColor(primaryColor, 30)
  const darkerColor = darkenColor(primaryColor, 50)
  
  // Play remote audio
  useEffect(() => {
    if (remoteStream && remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = remoteStream
      remoteAudioRef.current.play().catch(console.error)
    }
  }, [remoteStream])
  
  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  // Transition state helpers
  const isIncoming = callState === 'incoming'
  const isOutgoing = callState === 'outgoing'
  const isConnecting = callState === 'connecting'
  const isActive = callState === 'connected' || callState === 'ending' || callState === 'connecting'
  
  // Get person info
  const otherPerson = {
    name: currentCall?.callerId === user?.id ? (currentCall?.receiverName || 'User') : (currentCall?.callerName || 'User'),
    avatar: currentCall?.callerId === user?.id ? currentCall?.receiverAvatar : currentCall?.callerAvatar
  }

  // Don't render if idle
  if (callState === 'idle') {
    return <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
  }
  
  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
      
      {/* Incoming Call UI */}
      {isIncoming && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
          <div 
            className="w-full max-w-sm rounded-[32px] overflow-hidden shadow-2xl flex flex-col items-center p-8 animate-in fade-in zoom-in duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${darkColor} 0%, ${darkerColor} 100%)`,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="relative mb-6">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-4xl font-semibold shadow-xl"
                style={{ backgroundColor: primaryColor }}
              >
                {otherPerson.avatar ? (
                  <img 
                    src={otherPerson.avatar} 
                    alt="" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  otherPerson.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-slate-900 flex items-center justify-center animate-pulse">
                <Phone className="w-4 h-4 text-white" />
              </div>
            </div>
            
            <h1 className="text-xl font-bold text-white mb-1">
              {otherPerson.name}
            </h1>
            <p className="text-white/80 text-lg">
              Incoming voice call
            </p>
          </div>
          
          <div className="fixed bottom-12 left-0 right-0 flex justify-center gap-12 px-6">
            <button 
              onClick={declineCall}
              className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-lg hover:bg-red-600 transition-transform hover:scale-110 active:scale-95 group"
            >
              <PhoneOff className="w-7 h-7 text-white" />
              <span className="absolute -top-8 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Decline</span>
            </button>
            
            <button 
              onClick={answerCall}
              className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg hover:bg-emerald-600 transition-transform hover:scale-110 active:scale-95 group"
            >
              <Phone className="w-7 h-7 text-white" />
              <span className="absolute -top-8 text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">Answer</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Outgoing Call UI */}
      {isOutgoing && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 p-6 overflow-hidden">
          {/* Animated Background Rings */}
          <div className="absolute inset-0 z-0 opacity-20 overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-white rounded-full animate-ping duration-[3000ms]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] border border-white rounded-full animate-ping duration-[2000ms] delay-500" />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 relative">
              <div 
                className="w-32 h-32 rounded-full flex items-center justify-center text-white text-5xl font-semibold shadow-2xl animate-pulse"
                style={{ backgroundColor: primaryColor }}
              >
                {otherPerson.avatar ? (
                  <img 
                    src={otherPerson.avatar} 
                    alt="" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  otherPerson.name.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-2">
              {otherPerson.name}
            </h1>
            <p className="text-white/60 text-xl font-medium flex items-center gap-2">
              Calling
              <span className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce duration-700 delay-0" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce duration-700 delay-150" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/60 animate-bounce duration-700 delay-300" />
              </span>
            </p>
          </div>
          
          <div className="fixed bottom-16 z-20">
            <button 
              onClick={endCall}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-2xl hover:bg-red-600 transition-transform hover:scale-110 active:scale-95 group"
            >
              <PhoneOff className="w-8 h-8 text-white" />
              <span className="absolute -top-10 text-white/60 text-sm font-medium">Cancel Call</span>
            </button>
          </div>
        </div>
      )}
      
      {/* Active Call UI */}
      {isActive && (
        <div 
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: `linear-gradient(180deg, ${darkColor} 0%, ${darkerColor} 100%)` }}
        >
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="relative mb-8">
              {callState === 'connected' && (
                <div 
                  className="absolute -top-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center z-20 shadow-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Volume2 className="w-4 h-4 text-white animate-pulse" />
                </div>
              )}
              
              <div 
                className="w-28 h-28 rounded-full flex items-center justify-center text-white text-5xl font-semibold shadow-2xl"
                style={{ backgroundColor: primaryColor }}
              >
                {otherPerson.avatar ? (
                  <img 
                    src={otherPerson.avatar} 
                    alt="" 
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  otherPerson.name.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">
              {otherPerson.name}
            </h1>
            
            <p className="text-xl font-mono flex items-center gap-2" style={{ color: primaryColor }}>
              {callState === 'connecting' ? (
                <>
                  Connecting
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: primaryColor, animationDelay: '300ms' }} />
                  </span>
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
                  {formatDuration(callDuration)}
                </>
              )}
            </p>
          </div>
          
          {/* Controls */}
          <div className="bg-black/20 backdrop-blur-md p-8 pb-12 flex items-center justify-around rounded-t-[40px] border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
            <button 
              onClick={toggleMute}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white text-slate-900 shadow-inner' : 'bg-white/10 text-white hover:bg-white/20'}`}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
            
            <button 
              onClick={endCall}
              className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-xl hover:bg-red-600 transition-transform hover:scale-105 active:scale-95"
            >
              <PhoneOff className="w-8 h-8 text-white" />
            </button>
            
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center text-white/40 cursor-not-allowed">
              <Volume2 className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
