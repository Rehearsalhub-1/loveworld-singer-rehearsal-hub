import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Check, CheckCheck, Reply, Trash2, Smile, Download, FileText, Mic, Image as ImageIcon, 
  MoreVertical, Edit3, Loader2, Forward, Pin, Copy, ChevronDown, ExternalLink, Globe, X, Heart
} from 'lucide-react'
import { Message, ReactionType } from '../_lib/chat-service'
import { useChatV2 } from '../_context/ChatContextV2'
import { useAuth } from '@/hooks/useAuth'
import { SyncAvatar } from './SyncAvatar'

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  showAvatar?: boolean
  hasTail?: boolean
  isFirstInGroup?: boolean
  isLastInGroup?: boolean
  primaryColor: string
  onReply?: (message: Message) => void
  onReaction?: (messageId: string, reaction: ReactionType) => void
  onDelete?: (messageId: string) => void
  onEdit?: (messageId: string, currentText: string) => void
  onImageClick?: (url: string) => void
  onForward?: (message: Message) => void
  onPin?: (messageId: string | null) => void
  onJumpToReply?: (messageId: string) => void
  onMessageAction?: (message: Message) => void
  searchQuery?: string
}

const QUICK_REACTIONS: ReactionType[] = ['❤️', '👍', '😂', '😮', '😢', '🙏']

// Extract first URL from message text
function extractFirstUrl(text?: string): string | null {
  if (!text) return null
  const match = text.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i)
  if (!match) return null
  let url = match[0]
  if (url.startsWith('www.')) url = 'https://' + url
  return url
}

// Get hostname from URL
function getHostname(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/^www\./, '')
  } catch {
    return 'link'
  }
}

// Link Preview Card inside Bubble
const LinkPreviewBox = ({ url, isOwn, primaryColor }: { url: string; isOwn: boolean; primaryColor: string }) => {
  const hostname = getHostname(url)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={`block my-1.5 p-2.5 rounded-xl transition-all border group/link ${
        isOwn 
          ? 'bg-black/15 hover:bg-black/25 border-white/20 text-white' 
          : 'bg-slate-50 hover:bg-slate-100 border-slate-200/90 text-slate-900'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isOwn ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
        }`}>
          <Globe className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold truncate uppercase tracking-wider opacity-90">{hostname}</span>
            <ExternalLink className="w-3 h-3 opacity-60 flex-shrink-0" />
          </div>
          <p className={`text-[11px] truncate opacity-75 mt-0.5 ${isOwn ? 'text-white/80' : 'text-slate-500'}`}>
            {url}
          </p>
        </div>
      </div>
    </a>
  )
}

const DocumentDownloadButton = ({ attachment, primaryColor }: { attachment: NonNullable<Message['attachment']>, primaryColor: string }) => {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isDownloading) return
    try {
      setIsDownloading(true)
      const response = await fetch(attachment.url)
      if (!response.ok) throw new Error('Network response was not ok')
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = downloadUrl
      a.download = attachment.name || 'document'
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
       console.error('Error downloading document:', error)
       window.open(attachment.url, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <button 
      onClick={handleDownload}
      className="w-full flex justify-between items-center bg-black/5 p-2 rounded-xl mb-1 mt-0.5 hover:bg-black/10 transition-colors group text-left"
    >
      <div className="flex items-center gap-3">
        <div className="bg-[#f06159] p-2 rounded-lg text-white">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm line-clamp-1 max-w-[160px] font-medium text-[#111b21] group-hover:underline decoration-1">
            {attachment.name}
          </span>
          <span className="text-[11px] text-[#667781] font-medium">
            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'Document'}
          </span>
        </div>
      </div>
      <div className="p-2 text-[#667781] opacity-60 group-hover:opacity-100 transition-opacity">
        {isDownloading ? (
          <Loader2 className="w-5 h-5 animate-spin" style={{ color: primaryColor }} />
        ) : (
          <Download className="w-5 h-5" />
        )}
      </div>
    </button>
  )
}

const VoiceMessagePlayer = ({ url, duration, isOwn, primaryColor }: { url: string, duration?: number, isOwn: boolean, primaryColor: string }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const audioRef = React.useRef<HTMLAudioElement>(null)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) audioRef.current.pause()
    else audioRef.current.play()
  }

  const toggleSpeed = () => {
    const rates = [1, 1.5, 2]
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length]
    setPlaybackRate(nextRate)
    if (audioRef.current) audioRef.current.playbackRate = nextRate
  }

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60)
    const secs = Math.floor(time % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl min-w-[200px] ${isOwn ? 'bg-white/10' : 'bg-gray-100'}`}>
      <button
        onClick={togglePlay}
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isOwn ? 'bg-white text-emerald-600' : 'bg-emerald-500 text-white shadow-sm'}`}
      >
        {isPlaying ? <div className="flex gap-1"><div className="w-1 h-3 bg-current rounded-full" /><div className="w-1 h-3 bg-current rounded-full" /></div> : <div className="ml-1 w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-current border-b-[5px] border-b-transparent" />}
      </button>
      <div className="flex-1 flex flex-col gap-0.5">
        <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden">
          <motion.div 
            className={`h-full ${isOwn ? 'bg-white' : 'bg-emerald-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-[10px] font-bold ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
            {formatTime(isPlaying ? (audioRef.current?.currentTime || 0) : (duration || 0))}
          </span>
          <Mic className={`w-3 h-3 ${isOwn ? 'text-white/60' : 'text-gray-400'}`} />
        </div>
      </div>
      <button
        onClick={toggleSpeed}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
          isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
      >
        {playbackRate}x
      </button>
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        onTimeUpdate={(e) => setProgress((e.currentTarget.currentTime / e.currentTarget.duration) * 100)}
        className="hidden"
      />
    </div>
  )
}

export function MessageBubble({
  message,
  isOwn,
  showAvatar,
  hasTail,
  isFirstInGroup = true,
  isLastInGroup = true,
  primaryColor,
  onReply,
  onReaction,
  onDelete,
  onEdit,
  onImageClick,
  onForward,
  onPin,
  onJumpToReply,
  onMessageAction,
  searchQuery
}: MessageBubbleProps) {
  const { user } = useAuth()
  const { toggleReaction } = useChatV2()
  const [showHoverReactions, setShowHoverReactions] = useState(false)
  const [showActionDropdown, setShowActionDropdown] = useState(false)
  const [showReactionModal, setShowReactionModal] = useState(false)
  const [dropdownPlacement, setDropdownPlacement] = useState<'top' | 'bottom'>('bottom')
  const bubbleRef = React.useRef<HTMLDivElement>(null)

  const toggleDropdown = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    if (bubbleRef.current) {
      const rect = bubbleRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      // If there is less than 280px below the bubble, position upwards so menu is fully visible
      if (spaceBelow < 280) {
        setDropdownPlacement('top')
      } else {
        setDropdownPlacement('bottom')
      }
    }
    setShowActionDropdown(prev => !prev)
  }

  const currentUserId = user?.id || user?.uid || (user as any)?.userId || ''
  const isMessageOwn = isOwn || (currentUserId && message.senderId === currentUserId)

  // Bubble radius styling
  const getBubbleRadius = () => {
    if (isMessageOwn) {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[18px] rounded-br-[4px]'
      if (isFirstInGroup) return 'rounded-[18px] rounded-br-[4px]'
      if (isLastInGroup) return 'rounded-[18px] rounded-br-[18px]'
      return 'rounded-[18px] rounded-br-[4px]'
    } else {
      if (isFirstInGroup && isLastInGroup) return 'rounded-[18px] rounded-bl-[4px]'
      if (isFirstInGroup) return 'rounded-[18px] rounded-bl-[4px]'
      if (isLastInGroup) return 'rounded-[18px] rounded-bl-[18px]'
      return 'rounded-[18px] rounded-bl-[4px]'
    }
  }

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2.5">
        <div className="px-3.5 py-1 bg-white rounded-full text-[12px] text-slate-500 shadow-xs border border-slate-200/80 text-center max-w-[85%] font-medium">
          {message.text}
        </div>
      </div>
    )
  }

  const formatTime = (date: Date | any) => {
    if (!date) return ''
    let d: Date
    if (date instanceof Date) {
      d = isNaN(date.getTime()) ? new Date() : date
    } else if (typeof date === 'object') {
      const sec = date._seconds ?? date.seconds
      if (sec !== undefined && sec !== null) {
        const s = Number(sec)
        const nano = Number(date._nanoseconds ?? date.nanoseconds ?? 0)
        d = !isNaN(s) ? new Date(s * 1000 + Math.floor(nano / 1000000)) : new Date()
      } else if (typeof date.toDate === 'function') {
        const parsed = date.toDate()
        d = parsed instanceof Date && !isNaN(parsed.getTime()) ? parsed : new Date()
      } else if (typeof date.toMillis === 'function') {
        const parsed = new Date(date.toMillis())
        d = !isNaN(parsed.getTime()) ? parsed : new Date()
      } else {
        d = new Date()
      }
    } else if (typeof date === 'number') {
      d = date > 1e11 ? new Date(date) : date > 1e8 ? new Date(date * 1000) : new Date(date)
    } else if (typeof date === 'string') {
      const num = Number(date)
      if (!isNaN(num) && num > 1e8) {
        d = num > 1e11 ? new Date(num) : new Date(num * 1000)
      } else {
        d = new Date(date)
      }
    } else {
      d = new Date()
    }
    if (isNaN(d.getTime())) d = new Date()
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const firstUrl = extractFirstUrl(message.text)

  const handleToggleReaction = (emoji: ReactionType) => {
    if (isMessageOwn) return
    if (onReaction) {
      onReaction(message.id, emoji)
    } else {
      toggleReaction(message.id, emoji)
    }
  }

  // Render message text with auto-clickable links
  const renderFormattedText = (rawText: string) => {
    if (!rawText) return null

    // Regex for URLs
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
    const parts = rawText.split(urlPattern)

    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        let href = part
        if (href.startsWith('www.')) href = 'https://' + href
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`underline font-semibold transition-opacity hover:opacity-85 ${
              isMessageOwn ? 'text-white' : ''
            }`}
            style={!isMessageOwn ? { color: primaryColor } : {}}
          >
            {part}
          </a>
        )
      }

      if (searchQuery) {
        const queryParts = part.split(new RegExp(`(${searchQuery})`, 'gi'))
        return queryParts.map((qPart, qIdx) =>
          qPart.toLowerCase() === searchQuery.toLowerCase() ? (
            <span key={qIdx} className="bg-yellow-200 text-black px-0.5 rounded-xs font-bold">
              {qPart}
            </span>
          ) : (
            qPart
          )
        )
      }

      return part
    })
  }

  const hasReactions = Boolean(message.reactions && Object.keys(message.reactions).length > 0)
  const marginClass = hasReactions ? (isLastInGroup ? 'mb-4' : 'mb-3.5') : (isLastInGroup ? 'mb-3' : 'mb-[3px]')

  return (
    <motion.div
      initial={{ opacity: 0, y: 5, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className={`flex items-end gap-2 ${marginClass} group relative ${isMessageOwn ? 'flex-row-reverse' : 'flex-row'}`}
      onMouseEnter={() => setShowHoverReactions(true)}
      onMouseLeave={() => {
        setShowHoverReactions(false)
      }}
    >
      {!isMessageOwn && showAvatar && (
        <SyncAvatar 
          userId={message.senderId}
          initialAvatar={message.senderAvatar}
          fallbackName={message.senderName}
          size="w-7 h-7"
          className="rounded-full shadow-xs mb-1 flex-shrink-0"
          textClassName="text-[10px]"
          bgColor={primaryColor}
        />
      )}
      {!isMessageOwn && !showAvatar && <div className="w-7 flex-shrink-0" />}

      <div className={`flex flex-col max-w-[85%] md:max-w-[70%] lg:max-w-[65%] min-w-0 ${isMessageOwn ? 'items-end' : 'items-start'}`}>
        {!isMessageOwn && showAvatar && (
          <span className="text-[12px] font-bold ml-1.5 mb-0.5" style={{ color: primaryColor }}>
            {message.senderName}
          </span>
        )}

        <div className="relative group/bubble">
          {/* ── Standard Floating Hover Quick Actions Bar ── */}
          <AnimatePresence>
            {showHoverReactions && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.9 }}
                transition={{ duration: 0.1 }}
                className={`absolute -top-10 z-40 flex items-center gap-1 px-2 py-1 bg-white border border-slate-200/90 rounded-full shadow-lg backdrop-blur-md ${
                  isMessageOwn ? 'right-0' : 'left-0'
                }`}
              >
                {!isMessageOwn && (
                  <>
                    {QUICK_REACTIONS.map((emoji) => {
                      const hasReacted = message.reactions && message.reactions[currentUserId] === emoji
                      return (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleReaction(emoji)
                            setShowHoverReactions(false)
                          }}
                          className={`w-7 h-7 flex items-center justify-center text-sm rounded-full transition-transform active:scale-95 ${
                            hasReacted ? 'bg-purple-100 scale-110 ring-1 ring-purple-300' : 'hover:bg-slate-100 hover:scale-125'
                          }`}
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      )
                    })}
                    <div className="w-[1px] h-4 bg-slate-200 mx-0.5" />
                  </>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onReply?.(message)
                    setShowHoverReactions(false)
                  }}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                  title="Reply"
                >
                  <Reply className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => {
                    toggleDropdown(e)
                  }}
                  className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
                  title="More actions"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            ref={bubbleRef}
            onContextMenu={(e) => { 
              e.preventDefault()
              toggleDropdown(e)
            }}
            className="relative group/bubble select-text"
          >
            <div className="flex items-end">
              <div 
                className={`relative shadow-xs transition-all ${
                  isMessageOwn ? 'text-white' : 'bg-white border border-slate-200/80 text-slate-900'
                } ${getBubbleRadius()}`}
                style={isMessageOwn ? { 
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)` 
                } : {}}
              >
                <div className={`px-3 pt-2 ${hasReactions ? 'pb-2.5' : 'pb-1.5'} min-w-[85px] flex flex-col min-w-0`}>
                  {/* Reply Quote */}
                  {message.replyTo && (
                    <div 
                      onClick={() => onJumpToReply?.(message.replyTo!.id)}
                      className={`mb-1.5 p-2 rounded-xl cursor-pointer relative overflow-hidden flex flex-col transition-colors border-l-[3px] ${
                        isMessageOwn ? 'bg-black/15 border-white/80' : 'bg-slate-50 border-slate-300'
                      }`}
                    >
                      <div className="pl-1.5 pr-1">
                        <div className={`text-[12px] font-bold mb-0.5 line-clamp-1 ${isMessageOwn ? 'text-white' : ''}`} style={!isMessageOwn ? { color: primaryColor } : {}}>
                          {message.replyTo.senderName}
                        </div>
                        <div className={`text-[12px] line-clamp-1 ${isMessageOwn ? 'text-white/80' : 'text-slate-500'}`}>
                          {message.replyTo.text}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Image Attachment */}
                  {message.type === 'image' && message.imageUrl && (
                    <div className="mb-1 mt-0.5 -mx-1.5 rounded-xl overflow-hidden shadow-xs">
                      <img 
                        src={message.imageUrl} 
                        alt="Attached Image" 
                        className="max-h-80 w-full object-cover cursor-pointer rounded-xl hover:opacity-95 transition-opacity" 
                        onClick={() => onImageClick ? onImageClick(message.imageUrl!) : window.open(message.imageUrl, '_blank')}
                      />
                    </div>
                  )}

                  {/* Voice Player */}
                  {message.type === 'voice' && message.voiceUrl && (
                    <div className="mb-1 mt-0.5">
                      <VoiceMessagePlayer 
                        url={message.voiceUrl} 
                        duration={message.voiceDuration} 
                        isOwn={isMessageOwn} 
                        primaryColor={primaryColor} 
                      />
                    </div>
                  )}

                  {/* Document Attachment */}
                  {message.type === 'document' && message.attachment && (
                    <DocumentDownloadButton 
                      attachment={message.attachment} 
                      primaryColor={primaryColor} 
                    />
                  )}

                  {/* Rich Link Preview Box */}
                  {firstUrl && (
                    <LinkPreviewBox url={firstUrl} isOwn={isMessageOwn} primaryColor={primaryColor} />
                  )}

                  {/* Text + Timestamp Row */}
                  <div className="relative flex flex-col pb-0.5 min-w-0">
                    {message.status === 'forwarded' && (
                      <div className={`flex items-center gap-1 text-[11px] italic mb-1 ${isMessageOwn ? 'text-white/75' : 'text-slate-400'}`}>
                        <Forward className="w-3 h-3" /> forwarded
                      </div>
                    )}
                    <div className="flex flex-wrap items-end justify-between gap-x-3">
                      <span className={`text-[14.5px] leading-[20px] whitespace-pre-wrap break-words min-w-0 flex-1 ${isMessageOwn ? 'text-white' : 'text-slate-800'}`}>
                        {renderFormattedText(message.text)}
                        {message.edited && <span className={`text-[11px] ml-1 italic ${isMessageOwn ? 'text-white/70' : 'text-slate-400'}`}>(edited)</span>}
                      </span>
                      
                      <div className="flex items-center gap-[4px] h-[15px] self-end mb-[-1px] ml-auto">
                        <span className={`text-[11px] leading-none ${isMessageOwn ? 'text-white/80' : 'text-slate-400'}`}>
                          {formatTime(message.timestamp)}
                        </span>
                        {isMessageOwn && (
                          <div className="flex items-center ml-0.5">
                            {message.status === 'read' ? (
                              <CheckCheck className="w-[15px] h-[15px] text-white" />
                            ) : message.status === 'delivered' ? (
                              <CheckCheck className="w-[15px] h-[15px] text-white/70" />
                            ) : (
                              <Check className="w-[14px] h-[14px] text-white/70" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Compact WhatsApp-Style Reaction Badge ── */}
                  {message.reactions && Object.keys(message.reactions).length > 0 && (() => {
                    const reactionCounts: Record<string, { count: number; users: string[]; hasCurrentUser: boolean }> = {}
                    Object.entries(message.reactions).forEach(([uid, emoji]) => {
                      if (!emoji) return
                      if (!reactionCounts[emoji]) {
                        reactionCounts[emoji] = { count: 0, users: [], hasCurrentUser: false }
                      }
                      reactionCounts[emoji].count += 1
                      reactionCounts[emoji].users.push(uid)
                      if (uid === currentUserId) {
                        reactionCounts[emoji].hasCurrentUser = true
                      }
                    })

                    const entries = Object.entries(reactionCounts)
                    if (entries.length === 0) return null

                    const totalCount = entries.reduce((acc, [, d]) => acc + d.count, 0)
                    const hasMyReaction = entries.some(([, d]) => d.hasCurrentUser)

                    return (
                      <div 
                        className={`absolute -bottom-2 z-20 flex items-center select-none ${
                          isMessageOwn ? 'right-1.5' : 'left-1.5'
                        }`}
                      >
                        <div 
                          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 h-[19px] rounded-full text-[11px] shadow-[0_1px_3px_rgba(0,0,0,0.12)] border transition-all cursor-pointer ${
                            hasMyReaction 
                              ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-xs' 
                              : 'bg-white border-slate-200/90 text-slate-700 shadow-xs hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center -space-x-0.5">
                            {entries.map(([emoji, data]) => (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleToggleReaction(emoji as ReactionType)
                                }}
                                className="hover:scale-110 transition-transform text-[11px] leading-none"
                                title={data.hasCurrentUser ? `You reacted with ${emoji} (click to remove)` : `${data.count} reacted with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                          {totalCount > 1 && (
                            <span className="text-[9.5px] font-bold text-slate-500 ml-0.5 leading-none">
                              {totalCount}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* ── Localized Dropdown Popover (Desktop / Clean Context Menu) ── */}
            <AnimatePresence>
              {showActionDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-50 cursor-default" 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowActionDropdown(false); 
                    }} 
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: dropdownPlacement === 'top' ? 4 : -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: dropdownPlacement === 'top' ? 4 : -4 }}
                    transition={{ duration: 0.12 }}
                    className={`absolute z-50 min-w-[185px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 py-1.5 backdrop-blur-md overflow-hidden text-slate-800 ${
                      dropdownPlacement === 'top'
                        ? (isMessageOwn ? 'right-0 bottom-full mb-2 origin-bottom-right' : 'left-0 bottom-full mb-2 origin-bottom-left')
                        : (isMessageOwn ? 'right-0 top-full mt-2 origin-top-right' : 'left-0 top-full mt-2 origin-top-left')
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Quick Reactions inside menu (other users' messages only) */}
                    {!isMessageOwn && (
                      <div className="flex items-center justify-around px-2 py-1.5 border-b border-slate-100 mb-1">
                        {QUICK_REACTIONS.map((emoji) => {
                          const hasReacted = message.reactions && message.reactions[currentUserId] === emoji
                          return (
                            <button
                              key={emoji}
                              onClick={() => {
                                handleToggleReaction(emoji)
                                setShowActionDropdown(false)
                              }}
                              className={`w-7 h-7 flex items-center justify-center text-base rounded-full hover:scale-125 transition-transform active:scale-95 ${
                                hasReacted ? 'bg-purple-100 ring-1 ring-purple-300 scale-110' : 'hover:bg-slate-100'
                              }`}
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Reply */}
                    <button
                      onClick={() => {
                        onReply?.(message)
                        setShowActionDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left"
                    >
                      <Reply className="w-4 h-4 text-slate-500" />
                      <span>Reply</span>
                    </button>

                    {/* Forward */}
                    <button
                      onClick={() => {
                        onForward?.(message)
                        setShowActionDropdown(false)
                      }}
                      className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left"
                    >
                      <Forward className="w-4 h-4 text-slate-500" />
                      <span>Forward</span>
                    </button>

                    {/* Copy Text */}
                    {message.text && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(message.text || '')
                          setShowActionDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left"
                      >
                        <Copy className="w-4 h-4 text-slate-500" />
                        <span>Copy text</span>
                      </button>
                    )}

                    {/* Pin / Unpin */}
                    {onPin && (
                      <button
                        onClick={() => {
                          onPin((message as any).pinnedInChat ? null : message.id)
                          setShowActionDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left"
                      >
                        <Pin className={`w-4 h-4 ${(message as any).pinnedInChat ? 'fill-slate-700 text-slate-700' : 'text-slate-500'}`} />
                        <span>{(message as any).pinnedInChat ? 'Unpin' : 'Pin'}</span>
                      </button>
                    )}

                    {/* Edit (own messages only) */}
                    {isMessageOwn && message.type === 'text' && onEdit && (
                      <button
                        onClick={() => {
                          onEdit(message.id, message.text || '')
                          setShowActionDropdown(false)
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left"
                      >
                        <Edit3 className="w-4 h-4 text-slate-500" />
                        <span>Edit</span>
                      </button>
                    )}

                    {/* Delete (own messages only) */}
                    {isMessageOwn && onDelete && (
                      <>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          onClick={() => {
                            onDelete(message.id)
                            setShowActionDropdown(false)
                          }}
                          className="w-full flex items-center gap-3 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Reaction Details Modal ── */}
      <AnimatePresence>
        {showReactionModal && (
          <div 
            className="fixed inset-0 z-[200] bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs"
            onClick={() => setShowReactionModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-5 shadow-2xl max-w-xs w-full border border-slate-200"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h4 className="text-sm font-bold text-slate-900">Reactions</h4>
                <button onClick={() => setShowReactionModal(false)} className="p-1 hover:bg-slate-100 rounded-full text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto no-scrollbar">
                {Object.entries(message.reactions || {}).map(([userId, reaction]) => (
                  <div key={userId} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5">
                      <SyncAvatar userId={userId} size="w-7 h-7" className="rounded-full" bgColor={primaryColor} />
                      <span className="text-xs font-semibold text-slate-800">
                        {userId === currentUserId ? 'You' : 'Member'}
                      </span>
                    </div>
                    <span className="text-base">{reaction}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

