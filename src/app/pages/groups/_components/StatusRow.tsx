"use client";

import React, { useMemo, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Camera, X, Loader2, Send, Eye, Trash2, Heart, Mic, Music } from 'lucide-react'
import { useChatV2, StatusUpdate } from '../_context/ChatContextV2'
import { useAuth } from '@/hooks/useAuth'
import { SyncAvatar } from './SyncAvatar'
import { CustomFilePicker } from './CustomFilePicker'

interface StatusRowProps {
  primaryColor: string
  isVerticalList?: boolean
}

export function StatusRow({ primaryColor, isVerticalList = false }: StatusRowProps) {
  const { user } = useAuth()
  const { statuses, uploadStatus, viewStatus, deleteStatus, toggleStatusLike } = useChatV2()
  
  const [isUploading, setIsUploading] = useState(false)
  const [showFilePicker, setShowFilePicker] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [selectedUserStatus, setSelectedUserStatus] = useState<string | null>(null)

  // Video Trimming State
  const [startTime, setStartTime] = useState(0)
  const [endTime, setEndTime] = useState(30)
  const [maxDuration, setMaxDuration] = useState(30)
  const previewVideoRef = React.useRef<HTMLVideoElement>(null)
  const [frames, setFrames] = useState<string[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [isDraggingHandle, setIsDraggingHandle] = useState<'start' | 'end' | null>(null)
  const trimmerTrackRef = React.useRef<HTMLDivElement>(null)

  // Extract frames when pendingFile changes
  useEffect(() => {
    if (!pendingFile || !pendingFile.type.startsWith('video/')) {
      setFrames([])
      return
    }

    let isMounted = true
    setIsExtracting(true)
    const video = document.createElement('video')
    video.src = URL.createObjectURL(pendingFile)
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    video.onloadedmetadata = async () => {
      const duration = video.duration || 30
      const frameCount = 8
      const interval = duration / frameCount
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const extracted: string[] = []

      canvas.width = 160
      canvas.height = 120

      for (let i = 0; i < frameCount; i++) {
        if (!isMounted) break
        const time = i * interval + (interval / 2)
        video.currentTime = time
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked)
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              extracted.push(canvas.toDataURL('image/jpeg', 0.7))
            }
            resolve()
          }
          video.addEventListener('seeked', onSeeked)
        })
      }

      if (isMounted) {
        setFrames(extracted)
        setIsExtracting(false)
        window.URL.revokeObjectURL(video.src)
      }
    }

    video.load()

    return () => {
      isMounted = false
    }
  }, [pendingFile])

  const handleTrimmerMove = (clientX: number) => {
    if (!isDraggingHandle || !trimmerTrackRef.current) return
    const rect = trimmerTrackRef.current.getBoundingClientRect()
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const time = pos * maxDuration

    if (isDraggingHandle === 'start') {
      const next = Math.min(time, endTime - 1)
      setStartTime(next)
    } else {
      const next = Math.max(time, startTime + 1)
      setEndTime(next)
    }
  }

  // Group statuses by user
  const groupedStatuses = useMemo(() => {
    const groups: { [userId: string]: StatusUpdate[] } = {}
    statuses.forEach(s => {
      if (!groups[s.userId]) groups[s.userId] = []
      groups[s.userId].push(s)
    })
    return groups
  }, [statuses])

  const myStatuses = groupedStatuses[user?.uid || ''] || []
  const otherUserIds = Object.keys(groupedStatuses).filter(id => id !== user?.uid)

  const handleUpload = async () => {
    if (!pendingFile || isUploading) return
    setIsUploading(true)
    const isVideoOrAudio = pendingFile.type.startsWith('video/') || pendingFile.type.startsWith('audio/')
    const success = await uploadStatus(
      pendingFile, 
      caption, 
      isVideoOrAudio ? { startTime, endTime } : undefined
    )
    setIsUploading(false)
    if (success) {
      setPendingFile(null)
      setCaption('')
      setStartTime(0)
      setEndTime(30)
    } else {
      alert('Failed to upload status')
    }
  }

  const mainContent = isVerticalList ? (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {/* My Status Item */}
        <div 
          className="bg-white px-4 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-colors"
          onClick={() => myStatuses.length > 0 ? setSelectedUserStatus(user?.uid || null) : setShowFilePicker(true)}
        >
          <div className="relative">
            <div className={`p-[1px] rounded-full ${myStatuses.length > 0 ? 'border-[1.5px] border-emerald-500/60' : ''}`}>
               <div className="bg-white rounded-full p-[1px]">
                  <SyncAvatar 
                    userId={user?.uid}
                    fallbackName={user?.displayName || 'Me'}
                    bgColor={primaryColor}
                    size="w-[52px] h-[52px]"
                    className="rounded-full"
                  />
               </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowFilePicker(true);
              }}
              className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full border-[1.5px] border-white flex items-center justify-center text-white shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
              style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px' }}
            >
               <Plus style={{ width: '10px', height: '10px' }} strokeWidth={6} />
            </button>
          </div>
          <div className="flex-1">
             <h4 className="font-bold text-[#111b21] text-[17px]">My status</h4>
             <p className="text-[14px] text-[#667781]">
               {myStatuses.length > 0 ? 'Tap to view your updates' : 'Tap to add status update'}
             </p>
          </div>
        </div>

        {/* Other Statuses List */}
        <div className="bg-white">
          {otherUserIds.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center opacity-40">
               <Camera className="w-12 h-12 mb-4 text-gray-400" />
               <p className="text-[15px] font-medium text-gray-500">No recent updates from your team</p>
            </div>
          ) : (
            <>
              {/* Filter Recent (Unseen) */}
              {(() => {
                const recentIds = otherUserIds.filter(uid => groupedStatuses[uid].some(s => !s.viewers.includes(user?.uid || '')))
                if (recentIds.length === 0) return null
                return (
                  <>
                    <div className="px-4 py-3 bg-[#f0f2f5]">
                      <span className="text-[14px] font-bold text-gray-500 uppercase tracking-wider">Recent updates</span>
                    </div>
                    {recentIds.map(userId => (
                      <StatusListItem 
                        key={userId} 
                        userId={userId} 
                        userStatuses={groupedStatuses[userId]} 
                        currentUser={user} 
                        primaryColor={primaryColor} 
                        onClick={() => setSelectedUserStatus(userId)} 
                      />
                    ))}
                  </>
                )
              })()}

              {/* Filter Viewed (Seen) */}
              {(() => {
                const viewedIds = otherUserIds.filter(uid => groupedStatuses[uid].every(s => s.viewers.includes(user?.uid || '')))
                if (viewedIds.length === 0) return null
                return (
                  <>
                    <div className="px-4 py-3 bg-[#f0f2f5]">
                      <span className="text-[14px] font-bold text-gray-500 uppercase tracking-wider">Viewed updates</span>
                    </div>
                    {viewedIds.map(userId => (
                      <StatusListItem 
                        key={userId} 
                        userId={userId} 
                        userStatuses={groupedStatuses[userId]} 
                        currentUser={user} 
                        primaryColor={primaryColor} 
                        onClick={() => setSelectedUserStatus(userId)} 
                      />
                    ))}
                  </>
                )
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-4 px-4 py-3 overflow-x-auto no-scrollbar bg-white border-b border-gray-100 shadow-sm">
      {/* My Status Bubble */}
      <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
        <div className="relative group cursor-pointer" onClick={() => myStatuses.length > 0 ? setSelectedUserStatus(user?.uid || null) : setShowFilePicker(true)}>
          <div className={`p-[1px] rounded-full ${myStatuses.length > 0 ? 'border-[1.5px] border-emerald-500/60' : ''}`}>
             <div className="bg-white rounded-full p-[1px]">
                <SyncAvatar 
                  userId={user?.uid}
                  fallbackName={user?.displayName || 'Me'}
                  bgColor={primaryColor}
                  size="w-[52px] h-[52px]"
                  className="rounded-full"
                />
             </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowFilePicker(true);
            }}
            className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full border-[1.5px] border-white flex items-center justify-center text-white shadow-sm hover:scale-110 active:scale-95 transition-all z-10"
            style={{ width: '18px', height: '18px', minWidth: '18px', minHeight: '18px' }}
          >
             <Plus style={{ width: '10px', height: '10px' }} strokeWidth={6} />
          </button>
        </div>
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">My Status</span>
      </div>

      {/* Others' Statuses */}
      {otherUserIds.map(userId => {
        const userStatus = groupedStatuses[userId]
        if (!userStatus || userStatus.length === 0) return null
        
        const hasUnseen = userStatus.some(s => !s.viewers.includes(user?.uid || ''))
        
        return (
          <div key={userId} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div 
              className={`relative cursor-pointer p-[1px] rounded-full transition-transform active:scale-90 ${hasUnseen ? 'border-[1.5px] border-emerald-500/60 shadow-sm' : 'border-[1.5px] border-gray-200 opacity-40'}`}
              onClick={() => setSelectedUserStatus(userId)}
            >
              <div className="bg-white rounded-full p-[1px]">
                <SyncAvatar 
                  userId={userId}
                  fallbackName={userStatus[0].userName}
                  initialAvatar={userStatus[0].userAvatar}
                  bgColor={primaryColor}
                  size="w-[52px] h-[52px]"
                  className="rounded-full"
                />
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#111b21] truncate w-[60px] text-center">{userStatus[0].userName.split(' ')[0]}</span>
          </div>
        )
      })}
    </div>
  );

  return (
    <div className="h-full flex flex-col">
      {mainContent}

      {/* Shared Modals & Overlays */}
      <CustomFilePicker 
        isOpen={showFilePicker}
        onClose={() => setShowFilePicker(false)}
        onSelect={(file) => {
          if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
            const isVideo = file.type.startsWith('video/')
            const media = document.createElement(isVideo ? 'video' : 'audio')
            media.preload = 'metadata'
            if (isVideo) {
              ;(media as HTMLVideoElement).playsInline = true
              media.muted = true
            }

            let isResolved = false
            const handleSuccess = () => {
              if (isResolved) return
              isResolved = true
              window.URL.revokeObjectURL(media.src)
              const dur = media.duration || 30
              setMaxDuration(dur)
              setStartTime(0)
              setEndTime(Math.min(dur, 30))
              setPendingFile(file)
              setShowFilePicker(false)
            }

            media.onloadedmetadata = handleSuccess
            media.src = URL.createObjectURL(file)
            media.load()

            // Bulletproof fallback: if onloadedmetadata doesn't fire within 1.5 seconds, accept the file anyway!
            setTimeout(() => {
              if (!isResolved) {
                isResolved = true
                setMaxDuration(30)
                setStartTime(0)
                setEndTime(30)
                setPendingFile(file)
                setShowFilePicker(false)
              }
            }, 1500)
          } else {
            setPendingFile(file)
            setShowFilePicker(false)
          }
        }}
        primaryColor={primaryColor}
        title="Post Status"
        accept="image/*,video/*"
      />

      {typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
          {pendingFile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[999999] bg-black flex flex-col overflow-hidden select-none"
            >
               {/* Background Blurred Image/Video (Premium Immersive Feel) */}
               <div 
                className="absolute inset-0 opacity-40 blur-3xl scale-110 pointer-events-none bg-no-repeat bg-cover bg-center"
                style={pendingFile.type.startsWith('image/') ? { backgroundImage: `url(${URL.createObjectURL(pendingFile)})` } : { backgroundColor: '#111b21' }}
               />

               {/* Top Control Bar */}
               <div className="relative p-6 flex items-center justify-between z-50 bg-gradient-to-b from-black/80 via-black/30 to-transparent pt-8 flex-shrink-0">
                 <button 
                  onClick={() => setPendingFile(null)}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 backdrop-blur-md transition-all active:scale-90 shadow-lg"
                 >
                   <X className="w-6 h-6" />
                 </button>
                 
                 <div className="flex flex-col items-end">
                    <span className="text-white font-black text-[15px] tracking-tight uppercase drop-shadow">Status Preview</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
                      <span className="text-white/80 text-[11px] font-bold tracking-widest uppercase drop-shadow">Loveworld Singers</span>
                    </div>
                 </div>
               </div>

               {/* Immersive Media Content */}
               <div className="flex-1 w-full relative flex flex-col items-center justify-center p-4 z-10 min-h-0 gap-4 overflow-hidden">
                 {pendingFile.type.startsWith('image/') ? (
                   <motion.img 
                    layoutId="status-media"
                    src={URL.createObjectURL(pendingFile)} 
                    className="max-w-full max-h-full object-contain shadow-[0_0_80px_rgba(0,0,0,0.6)] rounded-2xl border border-white/10" 
                   />
                 ) : pendingFile.type.startsWith('video/') ? (
                   <>
                     <motion.video 
                      ref={previewVideoRef}
                      layoutId="status-media"
                      src={URL.createObjectURL(pendingFile)} 
                      playsInline
                      webkit-playsinline="true"
                      controls={false}
                      autoPlay
                      muted
                      onLoadedMetadata={() => {
                        if (previewVideoRef.current) {
                          const dur = previewVideoRef.current.duration || 30;
                          setMaxDuration(dur);
                          setEndTime(Math.min(dur, 30));
                        }
                      }}
                      onTimeUpdate={() => {
                        if (!previewVideoRef.current || isDraggingHandle) return;
                        if (previewVideoRef.current.currentTime >= endTime) {
                          previewVideoRef.current.currentTime = startTime;
                          previewVideoRef.current.play().catch(()=>{});
                        } else if (previewVideoRef.current.currentTime < startTime) {
                          previewVideoRef.current.currentTime = startTime;
                        }
                      }}
                      className="max-w-full min-h-0 flex-1 object-contain shadow-[0_0_80px_rgba(0,0,0,0.6)] rounded-2xl border border-white/10" 
                     />

                     {/* Video Frame Filmstrip Trimmer UI */}
                     <div 
                       className="w-full max-w-lg bg-black/80 backdrop-blur-2xl p-6 rounded-3xl border border-white/15 shadow-2xl flex flex-col gap-4 z-50 my-1 select-none flex-shrink-0"
                       onMouseMove={(e) => handleTrimmerMove(e.clientX)}
                       onTouchMove={(e) => handleTrimmerMove(e.touches[0].clientX)}
                       onMouseUp={() => {
                         setIsDraggingHandle(null);
                         if (previewVideoRef.current) {
                           previewVideoRef.current.currentTime = startTime;
                           previewVideoRef.current.play().catch(()=>{});
                         }
                       }}
                       onMouseLeave={() => setIsDraggingHandle(null)}
                       onTouchEnd={() => {
                         setIsDraggingHandle(null);
                         if (previewVideoRef.current) {
                           previewVideoRef.current.currentTime = startTime;
                           previewVideoRef.current.play().catch(()=>{});
                         }
                       }}
                     >
                        <div className="flex items-center justify-between text-white text-sm font-bold px-1">
                           <div className="flex items-center gap-2">
                              <span className="text-white font-black uppercase tracking-wider text-xs">Trim Video</span>
                              <span className="bg-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border border-white/10">{(endTime - startTime).toFixed(1)}s selected</span>
                           </div>
                           <span className="text-white/60 text-xs font-bold font-mono">Total: {maxDuration.toFixed(1)}s</span>
                        </div>

                        {/* Filmstrip Track Container */}
                        <div 
                          ref={trimmerTrackRef}
                          className="relative w-full h-16 bg-white/10 rounded-xl overflow-hidden border border-white/20 shadow-inner flex touch-none cursor-pointer"
                        >
                           {/* Extracted Frames / Shimmer */}
                           {isExtracting || frames.length === 0 ? (
                             <div className="w-full h-full flex items-center justify-center bg-white/5 animate-pulse">
                                <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Loading Frames...</span>
                             </div>
                           ) : (
                             <div className="w-full h-full flex items-center justify-between pointer-events-none overflow-hidden bg-black">
                                {frames.map((frame, i) => (
                                  <img key={i} src={frame} className="h-full flex-1 object-cover border-r border-white/10 last:border-none" />
                                ))}
                             </div>
                           )}

                           {/* Left Darkened Overlay (0 to startTime) */}
                           <div 
                             className="absolute top-0 bottom-0 left-0 bg-black/75 backdrop-blur-[2px] z-10 pointer-events-none transition-all duration-75"
                             style={{ width: `${(startTime / maxDuration) * 100}%` }}
                           />

                           {/* Right Darkened Overlay (endTime to maxDuration) */}
                           <div 
                             className="absolute top-0 bottom-0 right-0 bg-black/75 backdrop-blur-[2px] z-10 pointer-events-none transition-all duration-75"
                             style={{ width: `${(1 - endTime / maxDuration) * 100}%` }}
                           />

                           {/* Active Trimmer Frame Box */}
                           <div 
                             className="absolute top-0 bottom-0 border-[3px] z-20 flex items-center justify-between shadow-2xl transition-all duration-75 pointer-events-none"
                             style={{ 
                               borderColor: primaryColor,
                               left: `${(startTime / maxDuration) * 100}%`,
                               right: `${(1 - endTime / maxDuration) * 100}%` 
                             }}
                           >
                              {/* Start Drag Handle */}
                              <div 
                                tabIndex={0}
                                className="w-5 h-full flex items-center justify-center cursor-ew-resize hover:brightness-110 active:scale-x-125 transition-transform rounded-l-sm shadow-md pointer-events-auto focus:outline-none focus:ring-2 focus:ring-white"
                                style={{ backgroundColor: primaryColor }}
                                onMouseDown={(e) => { e.stopPropagation(); setIsDraggingHandle('start'); }}
                                onTouchStart={(e) => { e.stopPropagation(); setIsDraggingHandle('start'); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowLeft') {
                                    setStartTime(s => {
                                      const next = Math.max(0, s - 0.5);
                                      if (previewVideoRef.current) previewVideoRef.current.currentTime = next;
                                      return next;
                                    });
                                  } else if (e.key === 'ArrowRight') {
                                    setStartTime(s => {
                                      const next = Math.min(endTime - 1, s + 0.5);
                                      if (previewVideoRef.current) previewVideoRef.current.currentTime = next;
                                      return next;
                                    });
                                  }
                                }}
                              >
                                 <div className="w-1 h-4 bg-white rounded-full pointer-events-none" />
                              </div>

                              {/* Playhead Indicator */}
                              <div className="absolute top-0 bottom-0 left-0 right-0 pointer-events-none overflow-hidden">
                                 <div 
                                   className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_white] z-30"
                                   style={{ 
                                     left: `${((previewVideoRef.current?.currentTime || startTime) - startTime) / (endTime - startTime) * 100}%` 
                                   }}
                                 />
                              </div>

                              {/* End Drag Handle */}
                              <div 
                                tabIndex={0}
                                className="w-5 h-full flex items-center justify-center cursor-ew-resize hover:brightness-110 active:scale-x-125 transition-transform rounded-r-sm shadow-md pointer-events-auto focus:outline-none focus:ring-2 focus:ring-white"
                                style={{ backgroundColor: primaryColor }}
                                onMouseDown={(e) => { e.stopPropagation(); setIsDraggingHandle('end'); }}
                                onTouchStart={(e) => { e.stopPropagation(); setIsDraggingHandle('end'); }}
                                onKeyDown={(e) => {
                                  if (e.key === 'ArrowLeft') {
                                    setEndTime(eVal => Math.max(startTime + 1, eVal - 0.5));
                                  } else if (e.key === 'ArrowRight') {
                                    setEndTime(eVal => Math.min(maxDuration, eVal + 0.5));
                                  }
                                }}
                              >
                                 <div className="w-1 h-4 bg-white rounded-full pointer-events-none" />
                              </div>
                           </div>
                        </div>

                        {/* Precise Time Indicators & Instruction */}
                        <div className="flex items-center justify-between text-white/80 text-xs px-1 pt-1 font-medium">
                           <span className="text-white/60">Drag handles or use ← / → arrow keys to adjust</span>
                           <span className="font-bold text-white font-mono">{startTime.toFixed(1)}s - {endTime.toFixed(1)}s</span>
                        </div>
                     </div>
                   </>
                 ) : (
                    <motion.div 
                      layoutId="status-media"
                      className="w-full max-w-sm aspect-square rounded-[40px] bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex flex-col items-center justify-center gap-6 shadow-2xl p-8 border border-white/20"
                    >
                       <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-md animate-pulse shadow-inner">
                          <Mic className="w-10 h-10 text-white" />
                       </div>
                       <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-white w-1/3 rounded-full shadow-lg" />
                       </div>
                       <span className="text-white font-bold text-lg uppercase tracking-widest drop-shadow">Audio Status</span>
                    </motion.div>
                  )}
               </div>

               {/* Floating WhatsApp-style Caption Bar */}
               <div className="relative p-6 pb-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-50 flex-shrink-0">
                  <div className="max-w-xl mx-auto flex items-end gap-3">
                     <div className="flex-1 relative group">
                        <textarea 
                          autoFocus
                          rows={1}
                          value={caption}
                          onChange={(e) => {
                            setCaption(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="Add a caption..."
                          className="w-full bg-[#202c33]/90 backdrop-blur-2xl text-white py-4 px-6 rounded-[28px] border border-white/15 focus:border-white/30 focus:outline-none placeholder:text-gray-400 text-[17px] resize-none max-h-[140px] transition-all shadow-2xl"
                        />
                     </div>
                     
                     <button 
                      onClick={handleUpload}
                      disabled={isUploading}
                      className="w-[58px] h-[58px] rounded-full flex items-center justify-center text-white shadow-[0_8px_30px_rgba(16,185,129,0.5)] active:scale-90 transition-all disabled:opacity-50 disabled:scale-95 flex-shrink-0 hover:brightness-110 border border-white/20"
                      style={{ backgroundColor: primaryColor }}
                     >
                       {isUploading ? (
                         <Loader2 className="w-7 h-7 animate-spin" />
                       ) : (
                         <Send className="w-7 h-7 translate-x-0.5" fill="currentColor" />
                       )}
                     </button>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      ) : null}

      {typeof document !== 'undefined' ? createPortal(
        <AnimatePresence>
          {selectedUserStatus && (
            <StatusViewer 
              userId={selectedUserStatus}
              statuses={groupedStatuses[selectedUserStatus]}
              onClose={() => setSelectedUserStatus(null)}
              onView={viewStatus}
              deleteStatus={deleteStatus}
              toggleStatusLike={toggleStatusLike}
              primaryColor={primaryColor}
            />
          )}
        </AnimatePresence>,
        document.body
      ) : null}
    </div>
  );
}

import { Volume2, VolumeX, Pause, Play } from 'lucide-react'

// Internal Status Viewer Component (Premium Native Story Experience)
function StatusViewer({ userId, statuses, onClose, onView, deleteStatus, toggleStatusLike, primaryColor }: { 
  userId: string, 
  statuses: StatusUpdate[], 
  onClose: () => void, 
  onView: (id: string) => void,
  deleteStatus: (id: string) => Promise<boolean>,
  toggleStatusLike: (id: string) => Promise<boolean>,
  primaryColor: string
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showViewers, setShowViewers] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const { user } = useAuth()
  
  if (!statuses || statuses.length === 0) {
    onClose()
    return null
  }
  
  const currentStatus = statuses[currentIndex]
  
  React.useEffect(() => {
    if (currentStatus) {
      onView(currentStatus.id)
    }
  }, [currentIndex, currentStatus?.id])

  // Progress Bar Logic (Pauses when isPaused is true)
  const [progress, setProgress] = useState(0)
  React.useEffect(() => {
    setProgress(0)
  }, [currentIndex])

  React.useEffect(() => {
    if (isPaused || showViewers) return

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          if (currentIndex < statuses.length - 1) {
             setCurrentIndex(c => c + 1)
             return 0
          } else {
             onClose()
             return 100
          }
        }
        return prev + 1.5 // Approx 3.5 seconds per slide
      })
    }, 50)
    return () => clearInterval(interval)
  }, [currentIndex, isPaused, showViewers, statuses.length])

  return (
    <motion.div 
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="fixed inset-0 z-[10000] bg-black flex flex-col select-none overflow-hidden"
    >
      {/* Background Blurred Media Matching Current Story */}
      <div 
        className="absolute inset-0 opacity-30 blur-3xl scale-110 pointer-events-none bg-no-repeat bg-cover bg-center transition-all duration-500"
        style={currentStatus.type === 'image' ? { backgroundImage: `url(${currentStatus.mediaUrl})` } : { backgroundColor: '#111b21' }}
      />

      {/* Top Bars & User Info (Fades out when paused) */}
      <div className={`absolute top-0 left-0 right-0 p-4 pt-8 flex flex-col gap-4 z-[202] bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-200 ${isPaused ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Segmented Progress Bars */}
        <div className="flex gap-1.5 w-full px-1">
           {statuses.map((_, i) => (
             <div key={i} className="flex-1 h-[3px] bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                <div 
                  className="h-full bg-white transition-all duration-75 ease-linear shadow-[0_0_8px_white]"
                  style={{ width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%' }}
                />
             </div>
           ))}
        </div>
        
        <div className="flex items-center justify-between px-1 pt-1">
           <div className="flex items-center gap-3">
              <div className="p-[1.5px] rounded-full bg-white/20 shadow-inner">
                <SyncAvatar 
                  userId={currentStatus.userId}
                  initialAvatar={currentStatus.userAvatar}
                  fallbackName={currentStatus.userName}
                  size="w-10 h-10"
                  className="rounded-full border border-white/20"
                />
              </div>
              <div className="flex flex-col">
                 <div className="flex items-center gap-2">
                   <span className="text-white font-bold text-[15px] leading-tight drop-shadow-md">{currentStatus.userName}</span>
                   {currentStatus.userId === user?.uid && (
                     <span className="bg-white/20 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full backdrop-blur-md border border-white/10 uppercase tracking-wider">You</span>
                   )}
                 </div>
                 <span className="text-white/70 text-[11px] font-medium drop-shadow-sm flex items-center gap-2 mt-0.5">
                   {new Date(currentStatus.timestamp?.toMillis() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
             {currentStatus.type === 'video' && (
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMuted(!isMuted);
                }}
                className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90 shadow-lg"
               >
                 {isMuted ? <VolumeX className="w-5 h-5 text-white/80" /> : <Volume2 className="w-5 h-5 text-white" />}
               </button>
             )}
             <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsPaused(!isPaused);
              }}
              className="w-10 h-10 flex items-center justify-center text-white hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90 shadow-lg"
             >
               {isPaused ? <Play className="w-5 h-5 text-white" /> : <Pause className="w-5 h-5 text-white/80" />}
             </button>
             {currentStatus.userId === user?.uid && (
               <button 
                onClick={async (e) => {
                  e.stopPropagation();
                  setIsPaused(true);
                  if (confirm('Delete this status update?')) {
                    const success = await deleteStatus(currentStatus.id)
                    if (success) onClose()
                  } else {
                    setIsPaused(false);
                  }
                }}
                className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-red-400 hover:bg-white/20 rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90 shadow-lg"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
             )}
             <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-white bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md border border-white/15 transition-all active:scale-90 shadow-lg">
                <X className="w-6 h-6" />
             </button>
           </div>
        </div>
      </div>

      {/* Main Content Area (Hold to pause, Tap left/right to nav, Swipe down to close) */}
      <motion.div 
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100) {
            onClose()
          } else if (info.offset.y < -100 && currentStatus.userId === user?.uid) {
            setShowViewers(true)
          }
        }}
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="flex-1 w-full relative overflow-hidden flex items-center justify-center my-auto"
      >
        {/* Left 30% Tap Area (Previous) */}
        <div 
          className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            if (currentIndex > 0) setCurrentIndex(c => c - 1);
            else onClose();
          }} 
        />
        {/* Right 70% Tap Area (Next) */}
        <div 
          className="absolute inset-y-0 right-0 w-2/3 z-20 cursor-pointer" 
          onClick={(e) => {
            e.stopPropagation();
            if (currentIndex < statuses.length - 1) setCurrentIndex(c => c + 1);
            else onClose();
          }} 
        />

        <AnimatePresence mode='wait'>
          <motion.div
            key={currentStatus.id}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full flex flex-col items-center justify-center p-4 relative"
          >
             {currentStatus.type === 'image' ? (
               <img src={currentStatus.mediaUrl} className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-white/10 pointer-events-none" />
             ) : currentStatus.type === 'video' ? (
               <video 
                 src={currentStatus.mediaUrl} 
                 playsInline 
                 webkit-playsinline="true" 
                 autoPlay 
                 loop 
                 muted={isMuted}
                 className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.6)] border border-white/10 pointer-events-none" 
               />
             ) : (
               <div className="w-full max-w-sm aspect-square rounded-[40px] bg-gradient-to-br from-blue-600 via-indigo-600 to-emerald-600 flex flex-col items-center justify-center gap-8 shadow-2xl p-10 border border-white/20 pointer-events-none">
                  <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-2xl border border-white/30 relative group shadow-inner">
                    <Music className="w-12 h-12 text-white animate-pulse" />
                    <audio src={currentStatus.mediaUrl} autoPlay loop muted={isMuted} className="hidden" />
                    {/* Visualizer effect */}
                    <div className="absolute -inset-4 rounded-full border border-white/20 animate-ping opacity-30 pointer-events-none" />
                  </div>
                  <div className="text-center">
                    <h5 className="text-white font-black text-2xl tracking-tight mb-2 drop-shadow">Voice Update</h5>
                    <p className="text-white/80 text-xs font-extrabold uppercase tracking-[0.25em] drop-shadow">Listening Now</p>
                  </div>
               </div>
             )}
             
             {currentStatus.caption && (
               <div className="absolute bottom-24 left-4 right-4 p-6 text-center bg-black/60 backdrop-blur-xl border border-white/15 rounded-3xl shadow-2xl max-w-lg mx-auto z-30 pointer-events-none">
                  <p className="text-white text-[17px] font-medium leading-snug drop-shadow-md">{currentStatus.caption}</p>
               </div>
             )}
          </motion.div>
        </AnimatePresence>

        {/* Interaction Bar (Bottom) (Fades out when paused) */}
        <div className={`absolute bottom-0 left-0 right-0 p-6 pb-10 z-30 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-200 pointer-events-auto ${isPaused ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
           <div className="flex items-center justify-between gap-4 max-w-xl mx-auto">
              {/* Viewed Count (For author) */}
              {currentStatus.userId === user?.uid ? (
                <div className="flex-1 flex justify-center">
                  <motion.button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowViewers(true);
                    }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 group-hover:bg-white/30 transition-all text-white shadow-lg">
                      <Eye className="w-5 h-5" />
                      <span className="text-[16px] font-extrabold">{currentStatus.viewers?.length || 0}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/60 mt-2 drop-shadow">Swipe up for viewers</span>
                  </motion.button>
                </div>
              ) : (
                /* Like Button (For others) */
                <div className="flex-1 flex justify-center flex-col items-center gap-2">
                   <button 
                     onClick={(e) => {
                       e.stopPropagation();
                       toggleStatusLike(currentStatus.id);
                     }}
                     className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-xl border border-white/30 transition-all active:scale-75 shadow-[0_8px_30px_rgba(239,68,68,0.3)] cursor-pointer hover:scale-105"
                     style={{ backgroundColor: currentStatus.likes?.includes(user?.uid || '') ? '#ef4444' : 'rgba(255,255,255,0.15)' }}
                   >
                      <Heart 
                       className="w-8 h-8" 
                       fill={currentStatus.likes?.includes(user?.uid || '') ? 'currentColor' : 'none'} 
                       color="white" 
                      />
                   </button>
                   {currentStatus.likes && currentStatus.likes.length > 0 && (
                     <span className="text-white/90 text-[13px] font-extrabold drop-shadow">{currentStatus.likes.length} Likes</span>
                   )}
                </div>
              )}
           </div>
        </div>

        {/* Viewers Drawer */}
        <AnimatePresence>
          {showViewers && (
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-x-0 bottom-0 z-[300] bg-[#f0f2f5] rounded-t-[32px] max-h-[80vh] overflow-hidden flex flex-col shadow-[0_-20px_60px_rgba(0,0,0,0.6)] border-t border-white/20 pointer-events-auto"
            >
               {/* Drag Handle */}
               <div className="w-full flex justify-center py-4 cursor-pointer" onClick={() => setShowViewers(false)}>
                  <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
               </div>

               <div className="px-8 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
                  <h3 className="text-[18px] font-black text-[#111b21]">Viewed by {currentStatus.viewers?.length || 0}</h3>
                  <button onClick={() => setShowViewers(false)} className="text-[#008069] font-extrabold text-[14px] uppercase tracking-wider hover:opacity-80">Close</button>
               </div>

               <div className="flex-1 overflow-y-auto bg-white pb-12">
                  {currentStatus.viewers?.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                       <p className="text-[15px] font-medium">No views yet. Share your status to get started!</p>
                    </div>
                  ) : (
                    currentStatus.viewers.map(viewerId => (
                      <ViewerItem key={viewerId} userId={viewerId} primaryColor={primaryColor} />
                    ))
                  )}
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}

import { ChevronRight } from 'lucide-react'

// Internal Status List Item Component
function StatusListItem({ userId, userStatuses, currentUser, primaryColor, onClick }: { userId: string, userStatuses: StatusUpdate[], currentUser: any, primaryColor: string, onClick: () => void }) {
  if (!userStatuses || userStatuses.length === 0) return null
  
  const hasUnseen = userStatuses.some(s => !s.viewers.includes(currentUser?.uid || ''))
  const latest = userStatuses[userStatuses.length - 1]

  return (
    <div 
      className="px-4 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100 transition-all border-b border-gray-50 last:border-0"
      onClick={onClick}
    >
      <div className={`p-[1px] rounded-full ${hasUnseen ? 'border-[1.5px] border-emerald-500/60 shadow-sm' : 'border-[1.5px] border-gray-200 opacity-40'}`}>
        <div className="bg-white rounded-full p-[1px]">
          <SyncAvatar 
            userId={userId}
            fallbackName={userStatuses[0].userName}
            initialAvatar={userStatuses[0].userAvatar}
            bgColor={primaryColor}
            size="w-[48px] h-[48px]"
            className="rounded-full"
          />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-bold text-[#111b21] truncate">{userStatuses[0].userName}</h4>
        <p className="text-[13px] text-[#667781] font-medium">
          {new Date(latest.timestamp?.toMillis() || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

function ViewerItem({ userId, primaryColor }: { userId: string, primaryColor: string }) {
  const { chats } = useChatV2()
  
  const viewerName = useMemo(() => {
    for (const chat of chats) {
      if (chat.participantDetails && chat.participantDetails[userId]) {
        return chat.participantDetails[userId].name
      }
    }
    return 'Team Member'
  }, [chats, userId])

  return (
    <div className="px-6 py-3.5 flex items-center gap-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
       <SyncAvatar 
        userId={userId}
        fallbackName={viewerName}
        bgColor={primaryColor}
        size="w-10 h-10"
        className="rounded-full"
       />
       <div className="flex-1">
          <h4 className="font-bold text-[#111b21] text-[16px]">{viewerName}</h4>
          <span className="text-[12px] text-gray-500 font-medium">Just now</span>
       </div>
    </div>
  )
}
