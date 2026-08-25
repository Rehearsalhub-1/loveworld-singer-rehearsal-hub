"use client";

import { useState, useEffect } from 'react'
import { useChat } from '../_context/ChatContext'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { X, Search, MessageCircle, Loader2, User as UserIcon } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatUser } from '../_lib/chat-types'

interface UserSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function UserSearchModal({ isOpen, onClose }: UserSearchModalProps) {
  const { searchUsers, createDirectChat, setSelectedChat, chats } = useChat()
  const { user } = useAuth()
  const { currentZone } = useZone()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // SECURITY: Don't load users on open - only show results when searching
  // Filter results when search term changes
  useEffect(() => {
    const filterUsers = async () => {
      // SECURITY: Only search if user has typed at least 2 characters
      if (searchTerm.trim().length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const results = await searchUsers(searchTerm)
        setSearchResults(results)
      } catch (error) {
 console.error('Error searching users:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const timeoutId = setTimeout(filterUsers, 300)
    return () => clearTimeout(timeoutId)
  }, [searchTerm, searchUsers])

  const handleStartChat = async (targetUser: ChatUser) => {
    if (!user) return

    setActionLoading(targetUser.id)
    
    try {
      const existingChat = chats.find(chat => 
        chat.type === 'direct' && 
        chat.participants.includes(targetUser.id) && 
        chat.participants.includes((user.uid || user.id || ""))
      )

      if (existingChat) {
        setSelectedChat(existingChat)
        onClose()
        return
      }

      const chatId = await createDirectChat(targetUser.id)
      if (chatId) {
        setTimeout(() => {
          const newChat = chats.find(chat => chat.id === chatId)
          if (newChat) {
            setSelectedChat(newChat)
          }
        }, 1000)
        onClose()
      }
    } catch (error) {
 console.error('Error starting chat:', error)
    } finally {
      setActionLoading(null)
    }
  }



  if (!isOpen) return null

  const themeColor = currentZone?.themeColor || '#10b981'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div 
            className="flex-shrink-0 px-6 py-6 text-white relative overflow-hidden"
            style={{ backgroundColor: themeColor }}
          >
            {/* Subtle background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-[-10%] right-[-10%] w-[100px] h-[100px] rounded-full border-[20px] border-white" />
              <div className="absolute bottom-[-20%] left-[-10%] w-[150px] h-[150px] rounded-full border-[30px] border-white" />
            </div>

            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <h2 className="text-[22px] font-bold tracking-tight">Add New Chat</h2>
                <p className="text-white/80 text-[13px] font-medium">Connect with fellow singers</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all active:scale-90"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative z-10 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 group-focus-within:text-white transition-colors" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-white/15 border border-white/20 rounded-2xl text-white placeholder-white/60 focus:outline-none focus:ring-4 focus:ring-white/10 focus:bg-white/20 transition-all text-[15px]"
                autoFocus
              />
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto no-scrollbar bg-[#f8f9fa]">
            {isSearching ? (
              <div className="p-12 text-center flex flex-col items-center">
                <div className="relative">
                  <div className="w-12 h-12 border-3 border-gray-100 border-t-current rounded-full animate-spin mb-4" style={{ color: themeColor }} />
                  <div className="absolute inset-0 flex items-center justify-center">
                     <Search className="w-4 h-4 text-gray-300" />
                  </div>
                </div>
                <p className="text-gray-500 font-medium text-[15px]">Searching the Hub...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm border border-gray-50">
                  <UserIcon className="w-10 h-10 text-gray-200" />
                </div>
                <h3 className="text-[17px] font-bold text-[#111b21] mb-1">
                  {searchTerm.trim().length < 2 ? 'Find someone' : 'No results found'}
                </h3>
                <p className="text-[#667781] text-[14px]">
                  {searchTerm.trim().length < 2 
                    ? 'Type at least 2 characters to start' 
                    : `We couldn't find anyone matching "${searchTerm}"`}
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-1">
                <p className="px-3 py-2 text-[12px] font-bold text-gray-400 uppercase tracking-widest">Search results ({searchResults.length})</p>
                {searchResults.map((searchUser) => (
                  <button
                    key={searchUser.id}
                    onClick={() => handleStartChat(searchUser)}
                    disabled={actionLoading === searchUser.id}
                    className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-md hover:ring-1 hover:ring-gray-100 transition-all active:scale-[0.98] group text-left"
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: themeColor }}>
                        {searchUser.profilePic ? (
                          <img src={searchUser.profilePic} alt="" className="w-full h-full object-cover" />
                        ) : (
                          searchUser.fullName[0]?.toUpperCase()
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-[#111b21] text-[16px] truncate group-hover:text-current transition-colors" style={{} as any}>
                        {searchUser.fullName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[13px] text-[#667781] truncate">
                        <span className="truncate">{searchUser.email}</span>
                        {searchUser.zoneName && (
                          <>
                            <span className="w-1 h-1 rounded-full bg-gray-300" />
                            <span className="text-current font-medium opacity-80" style={{ color: themeColor }}>{searchUser.zoneName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      {actionLoading === searchUser.id ? (
                        <div className="w-10 h-10 flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 group-hover:bg-current group-hover:text-white transition-all" style={{} as any}>
                          <MessageCircle className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-50 text-center">
             <p className="text-[12px] text-gray-400">Search results are limited to verified members of the Rehearsal Hub.</p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
