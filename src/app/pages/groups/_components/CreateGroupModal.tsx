"use client";

import { useState, useEffect } from 'react'
import { useChat } from '../_context/ChatContext'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { X, Users, Search, Check, Loader2 } from 'lucide-react'
import { ChatUser } from '../_lib/chat-types'

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateGroupModal({ isOpen, onClose }: CreateGroupModalProps) {
  const { searchUsers, createGroupChat, setSelectedChat, chats } = useChat()
  const { user } = useAuth()
  const { currentZone } = useZone()
  
  const [step, setStep] = useState<'details' | 'members'>('details')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ChatUser[]>([])
  const [selectedMembers, setSelectedMembers] = useState<ChatUser[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Load all zone members when on members step
  useEffect(() => {
    if (step !== 'members') return

    const loadZoneMembers = async () => {
      setIsSearching(true)
      try {
        const results = await searchUsers('')
        setSearchResults(results)
      } catch (error) {
 console.error('Error loading zone members:', error)
      } finally {
        setIsSearching(false)
      }
    }

    loadZoneMembers()
  }, [step, searchUsers])

  const handleSearch = async (term: string) => {
    setSearchTerm(term)
    
    setIsSearching(true)
    try {
      const results = await searchUsers(term)
      setSearchResults(results)
    } catch (error) {
 console.error('Error searching users:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const toggleMember = (user: ChatUser) => {
    setSelectedMembers(prev => {
      const isSelected = prev.some(member => member.id === user.id)
      if (isSelected) {
        return prev.filter(member => member.id !== user.id)
      } else {
        return [...prev, user]
      }
    })
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedMembers.length === 0) return

    setIsCreating(true)
    
    try {
      const participantIds = selectedMembers.map(member => member.id)
      const chatId = await createGroupChat(groupName.trim(), groupDescription.trim(), participantIds)
      
      if (chatId) {
        setTimeout(() => {
          const newChat = chats.find(chat => chat.id === chatId)
          if (newChat) {
            setSelectedChat(newChat)
          }
        }, 1000)
        
        handleClose()
      }
    } catch (error) {
 console.error('Error creating group:', error)
    } finally {
      setIsCreating(false)
    }
  }

  const handleClose = () => {
    setGroupName('')
    setGroupDescription('')
    setSelectedMembers([])
    setSearchTerm('')
    setSearchResults([])
    setStep('details')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] sm:max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div 
          className="p-4 sm:p-6 text-white"
          style={{ 
            background: currentZone?.themeColor 
              ? `linear-gradient(135deg, ${currentZone.themeColor} 0%, ${adjustColor(currentZone.themeColor, -20)} 100%)`
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          }}
        >
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-bold">
              {step === 'details' ? 'Create Group' : 'Add Members'}
            </h2>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors touch-target"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${step === 'details' ? 'bg-white' : 'bg-white/50'}`} />
            <div className="flex-1 h-0.5 bg-white/30" />
            <div className={`w-3 h-3 rounded-full ${step === 'members' ? 'bg-white' : 'bg-white/50'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {step === 'details' ? (
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-base"
                  style={{ 
                    ...(currentZone?.themeColor && {
                      '--tw-ring-color': currentZone.themeColor
                    } as any)
                  }}
                  maxLength={50}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  {groupName.length}/50 characters
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  placeholder="What's this group about?"
                  className="w-full px-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent resize-none text-base"
                  style={{ 
                    ...(currentZone?.themeColor && {
                      '--tw-ring-color': currentZone.themeColor
                    } as any)
                  }}
                  rows={3}
                  maxLength={200}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {groupDescription.length}/200 characters
                </p>
              </div>

              <button
                onClick={() => setStep('members')}
                disabled={!groupName.trim()}
                className="w-full py-3 sm:py-3.5 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed touch-target text-base"
                style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
              >
                Next: Add Members
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users to add..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 sm:pl-12 pr-4 py-2.5 sm:py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:border-transparent text-base"
                  style={{ 
                    ...(currentZone?.themeColor && {
                      '--tw-ring-color': currentZone.themeColor
                    } as any)
                  }}
                />
              </div>

              {selectedMembers.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Selected Members ({selectedMembers.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                      >
                        <span>{member.fullName}</span>
                        <button
                          onClick={() => toggleMember(member)}
                          className="hover:bg-green-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {isSearching ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-gray-600 text-sm">Searching...</p>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-sm">No users found</p>
                  </div>
                ) : (
                  searchResults.map((user) => {
                    const isSelected = selectedMembers.some(member => member.id === user.id)
                    return (
                      <button
                        key={user.id}
                        onClick={() => toggleMember(user)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors touch-target ${
                          isSelected ? 'bg-green-50 border-2 border-green-200' : 'hover:bg-gray-50 border-2 border-transparent'
                        }`}
                      >
                        <div 
                          className="w-11 h-11 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-base"
                          style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                        >
                          {user.profilePic ? (
                            <img 
                              src={user.profilePic} 
                              alt={user.fullName}
                              className="w-full h-full rounded-full object-cover"
                            />
                          ) : (
                            user.fullName[0]?.toUpperCase() || '?'
                          )}
                        </div>

                        <div className="flex-1 text-left min-w-0">
                          <h4 className="font-semibold text-gray-900 truncate text-base">
                            {user.fullName}
                          </h4>
                          <p className="text-sm text-gray-600 truncate">
                            {user.email}
                          </p>
                        </div>

                        {isSelected && (
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 py-3 sm:py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors touch-target text-base"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateGroup}
                  disabled={selectedMembers.length === 0 || isCreating}
                  className="flex-1 py-3 sm:py-3.5 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 touch-target text-base"
                  style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span className="hidden xs:inline">Creating...</span>
                    </>
                  ) : (
                    'Create Group'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const adjustColor = (color: string, amount: number) => {
  const hex = color.replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}
