import { useState, useEffect, useRef } from 'react'
import { Send, User } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import mediaCommentService, { MediaComment } from '../_lib/media-comment-service'

const LIVE_STREAM_ID = 'LIVE_STREAM_MAIN_CHANNEL'

export default function LiveChat() {
    const { user, profile } = useAuth()
    const [comments, setComments] = useState<MediaComment[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Subscribe to real-time comments
        const unsubscribe = mediaCommentService.subscribeToComments(LIVE_STREAM_ID, (fetchedComments) => {
            // Reverse to show newest at bottom (chat style)
            setComments(fetchedComments.reverse())
        })
        return () => unsubscribe()
    }, [])

    useEffect(() => {
        // Auto-scroll to bottom on new message
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [comments])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !user) return

        setIsSending(true)
        try {
            await mediaCommentService.addComment(
                LIVE_STREAM_ID,
                user.id || user.uid || '',
                profile?.display_name || user.email?.split('@')[0] || 'User',
                user.email || '',
                newMessage.trim()
            )
            setNewMessage('')
        } catch (error) {
 console.error('Failed to send message:', error)
        } finally {
            setIsSending(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-[#0f0f0f] border-l border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-[#0f0f0f]">
                <h3 className="text-white font-bold uppercase tracking-wider text-sm">Live Chat</h3>
            </div>

            {/* Messages Area */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
                {comments.length === 0 && (
                    <div className="text-center text-gray-500 text-sm mt-10">
                        Welcome to the chat! Say hello.
                    </div>
                )}
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex-shrink-0 mt-0.5">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-[10px] font-bold text-white uppercase border border-white/5">
                                {comment.userName.charAt(0)}
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="font-bold text-gray-400 text-xs mr-2">{comment.userName}</span>
                            <span className="text-white/90 break-words">{comment.content}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-[#0f0f0f] border-t border-white/10">
                {user ? (
                    <form onSubmit={handleSend} className="relative">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Say something..."
                            className="w-full bg-[#1f1f22] text-white rounded-full pl-4 pr-12 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-white/20 placeholder-gray-500 border border-white/5 transition-all"
                            maxLength={200}
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim() || isSending}
                            className="absolute right-2 top-1.5 p-1.5 bg-red-600 rounded-full text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </form>
                ) : (
                    <div className="text-center py-4 bg-[#1f1f22] rounded-xl border border-white/5">
                        <p className="text-gray-400 text-sm mb-2">Sign in to chat</p>
                        <a href="/login" className="text-white text-sm font-bold hover:underline">Log In</a>
                    </div>
                )}
            </div>
        </div>
    )
}
