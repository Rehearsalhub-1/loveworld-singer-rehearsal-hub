"use client";

import { useState, useEffect } from 'react'
import { useChat } from '../_context/ChatContext'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { ChatApiService, ChatUser } from '../_lib/chat-api-service'
import { WhatsAppPresence, PresenceData } from '../_lib/whatsapp-presence'
import { MoreVertical, Users, UserMinus, Shield, ArrowLeft, User, UserPlus, Loader2, X, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ChatHeaderProps {
  onOpenFriendRequests?: () => void
  onOpenSearch?: () => void
}

export default function ChatHeader({ onOpenFriendRequests, onOpenSearch }: ChatHeaderProps) {
  const { selectedChat, setSelectedChat, addUserToGroup, removeUserFromGroup, makeUserAdmin, leaveGroup, searchUsers } = useChat()
  const { user } = useAuth()
  const { currentZone } = useZone()
  const [showMenu, setShowMenu] = useState(false)
  const [otherUserName, setOtherUserName] = useState<string | null>(null)
  const [otherUserProfile, setOtherUserProfile] = useState<ChatUser | null>(null)
  const [otherUserPresence, setOtherUserPresence] = useState<PresenceData | null>(null)
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false)
  const [isMembersLoading, setIsMembersLoading] = useState(false)
  const [groupMembers, setGroupMembers] = useState<ChatUser[]>([])
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false)
  const [isManageAdminsModalOpen, setIsManageAdminsModalOpen] = useState(false)
  const [availableUsers, setAvailableUsers] = useState<ChatUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearchingUsers, setIsSearchingUsers] = useState(false)
  const [isLeavingGroup, setIsLeavingGroup] = useState(false)

  const isGroupChat = selectedChat?.type === 'group'
  const isAdmin = selectedChat?.admins?.includes(user?.uid || '') || false

  const otherParticipantId = !isGroupChat && selectedChat
    ? selectedChat.participants.find((id) => id !== user?.uid)
    : null

  // Subscribe to real-time WebSocket presence for direct chat participant
  useEffect(() => {
    if (!otherParticipantId) {
      setOtherUserPresence(null)
      return
    }

    const unsub = WhatsAppPresence.subscribeToPresence([otherParticipantId], (presenceMap) => {
      const p = presenceMap.get(otherParticipantId)
      if (p) setOtherUserPresence(p)
    })

    return () => {
      unsub()
    }
  }, [otherParticipantId])

  // Fetch other user's name for direct chats
  useEffect(() => {
    const fetchOtherUserName = async () => {
      if (!selectedChat || selectedChat.type === 'group' || !user) return

      const otherId = selectedChat.participants.find((id) => id !== user.uid)
      if (!otherId) return

      if (selectedChat.participantNames && selectedChat.participantNames[otherId]) {
        setOtherUserName(selectedChat.participantNames[otherId])
        return
      }

      try {
        const userData = await ChatApiService.getUser(otherId)
        if (userData) {
          setOtherUserName(userData.fullName)
          setOtherUserProfile(userData)
        }
      } catch (error) {
        console.error('Error fetching user name:', error)
      }
    }

    fetchOtherUserName()
  }, [selectedChat, user])

  if (!selectedChat) return null

  const getOtherParticipantName = () => {
    if (isGroupChat) return selectedChat?.name || 'Group Chat'
    return otherUserName || 'Loading...'
  }

  const isOnline = otherUserPresence ? otherUserPresence.status === 'online' : !!otherUserProfile?.isOnline
  const lastSeenVal = otherUserPresence ? otherUserPresence.lastSeen : otherUserProfile?.lastSeen

  const getSubtitle = () => {
    if (isGroupChat) {
      return `${selectedChat?.participants.length || 0} members`
    } else {
      if (isOnline) {
        return 'Online'
      } else if (lastSeenVal) {
        try {
          const lastSeenDate = lastSeenVal instanceof Date ? lastSeenVal : new Date(lastSeenVal)
          if (!isNaN(lastSeenDate.getTime())) {
            return `Last seen ${formatDistanceToNow(lastSeenDate, { addSuffix: true })}`
          }
        } catch (error) {
          console.error('Error formatting last seen:', error)
        }
      }
      return 'Offline'
    }
  }

  const handleViewMembers = async () => {
    if (!selectedChat || !isGroupChat) return
    setIsMembersModalOpen(true)
    setIsMembersLoading(true)
    try {
      const members = await ChatApiService.getChatParticipants(selectedChat.id)
      setGroupMembers(members)
    } catch (error) {
      console.error('Error loading members:', error)
    } finally {
      setIsMembersLoading(false)
    }
  }

  const handleAddMembers = async () => {
    setIsAddMembersModalOpen(true)
    setSearchTerm('')
    setAvailableUsers([])
  }

  const handleSearchUsers = async (term: string) => {
    setSearchTerm(term)
    if (!term.trim()) {
      setAvailableUsers([])
      return
    }
    setIsSearchingUsers(true)
    try {
      const users = await searchUsers(term)
      const existingParticipantIds = selectedChat?.participants || []
      const filteredUsers = users.filter((u) => !existingParticipantIds.includes(u.id))
      setAvailableUsers(filteredUsers)
    } catch (error) {
      console.error('Error searching users:', error)
    } finally {
      setIsSearchingUsers(false)
    }
  }

  const handleAddUserToGroup = async (userId: string) => {
    if (!selectedChat) return
    try {
      const success = await addUserToGroup(selectedChat.id, userId)
      if (success) {
        handleViewMembers()
        setSearchTerm('')
        setAvailableUsers([])
      }
    } catch (error) {
      console.error('Error adding user to group:', error)
    }
  }

  const handleManageAdmins = async () => {
    setIsManageAdminsModalOpen(true)
    await handleViewMembers()
  }

  const handleMakeAdmin = async (userId: string) => {
    if (!selectedChat) return
    try {
      await makeUserAdmin(selectedChat.id, userId)
      await handleViewMembers()
    } catch (error) {
      console.error('Error making user admin:', error)
    }
  }

  const handleRemoveFromGroup = async (userId: string) => {
    if (!selectedChat) return
    if (!confirm('Are you sure you want to remove this user from the group?')) return
    try {
      const success = await removeUserFromGroup(selectedChat.id, userId)
      if (success) {
        await handleViewMembers()
      }
    } catch (error) {
      console.error('Error removing user from group:', error)
    }
  }

  const handleLeaveGroup = async () => {
    if (!selectedChat) return
    if (!confirm('Are you sure you want to leave this group?')) return
    setIsLeavingGroup(true)
    try {
      const success = await leaveGroup(selectedChat.id)
      if (success) {
        setSelectedChat(null)
      }
    } catch (error) {
      console.error('Error leaving group:', error)
    } finally {
      setIsLeavingGroup(false)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
      {/* Chat Info */}
      <div className="flex items-center gap-3">
        {/* Mobile Back Button */}
        <button
          onClick={() => setSelectedChat(null)}
          className="md:hidden p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md relative"
          style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
        >
          {isGroupChat ? (
            <Users className="w-5 h-5" />
          ) : (
            getOtherParticipantName()[0]?.toUpperCase() || '?'
          )}
          {!isGroupChat && isOnline && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
          )}
        </div>

        {/* Name and Status */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">
              {getOtherParticipantName()}
            </h3>
            {!isGroupChat && isOnline && (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" title="Online" />
            )}
          </div>
          <p className="text-sm text-gray-600">
            {getSubtitle()}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Search Button */}
        {selectedChat && (
          <button
            onClick={onOpenSearch}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Search messages"
            title="Search messages"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>
        )}

        {/* Menu (Only for Group Chat management) */}
        {isGroupChat && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Menu"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 min-w-[200px] bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                {isAdmin && (
                  <>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                      onClick={() => {
                        setShowMenu(false)
                        handleAddMembers()
                      }}
                    >
                      <UserPlus className="w-4 h-4 text-emerald-600" />
                      Add Members
                    </button>
                    <button
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                      onClick={() => {
                        setShowMenu(false)
                        handleManageAdmins()
                      }}
                    >
                      <Shield className="w-4 h-4 text-purple-600" />
                      Manage Admins
                    </button>
                    <hr className="my-2" />
                  </>
                )}
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                  onClick={() => {
                    setShowMenu(false)
                    handleViewMembers()
                  }}
                >
                  <Users className="w-4 h-4 text-blue-600" />
                  View Members
                </button>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-red-50 text-red-600 flex items-center gap-2 text-sm"
                  onClick={() => {
                    setShowMenu(false)
                    handleLeaveGroup()
                  }}
                  disabled={isLeavingGroup}
                >
                  <UserMinus className="w-4 h-4" />
                  {isLeavingGroup ? 'Leaving...' : 'Leave Group'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}

      {/* Members Modal */}
      {isMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Group Members</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedChat.participants.length} {selectedChat.participants.length === 1 ? 'member' : 'members'}
                  </p>
                </div>
                <button
                  onClick={() => setIsMembersModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            {isMembersLoading ? (
              <div className="flex-1 flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600" />
                  <p className="text-gray-600 mt-4 text-sm sm:text-base">Loading members...</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {groupMembers.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {groupMembers.map((member) => (
                      <div
                        key={member.id}
                        className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md flex-shrink-0"
                            style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                          >
                            {member.fullName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {member.fullName || 'Unknown User'}
                            </p>
                            <p
                              className="text-xs sm:text-sm text-gray-500 truncate mt-0.5"
                              title={member.email}
                            >
                              {member.email || 'No email'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 px-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600 font-medium text-sm sm:text-base">No members found</p>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1 text-center">
                      This group doesn't have any members yet
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Members Modal */}
      {isAddMembersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Add Members</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Search and add users to this group
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsAddMembersModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-4 border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all text-sm sm:text-base"
                />
                <User className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isSearchingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600" />
                    <p className="text-gray-600 mt-4 text-sm sm:text-base">Searching users...</p>
                  </div>
                </div>
              ) : availableUsers.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {availableUsers.map((u) => (
                    <div
                      key={u.id}
                      className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-3 sm:gap-4">
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md flex-shrink-0"
                            style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                          >
                            {u.fullName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                              {u.fullName || 'Unknown User'}
                            </p>
                            <p
                              className="text-xs sm:text-sm text-gray-500 truncate mt-0.5"
                              title={u.email}
                            >
                              {u.email || 'No email'}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleAddUserToGroup(u.id)}
                          className="px-4 py-2 sm:px-5 sm:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-all shadow-sm hover:shadow-md font-medium text-sm sm:text-base flex-shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchTerm ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium text-sm sm:text-base">No users found</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1 text-center">
                    No users found matching "{searchTerm}"
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <UserPlus className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium text-sm sm:text-base">Start searching</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1 text-center">
                    Type a name or email to search for users
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Manage Admins Modal */}
      {isManageAdminsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Shield className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Manage Admins</h3>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      {groupMembers.length} {groupMembers.length === 1 ? 'member' : 'members'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsManageAdminsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {isMembersLoading ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 mx-auto animate-spin text-purple-600" />
                    <p className="text-gray-600 mt-4 text-sm sm:text-base">Loading members...</p>
                  </div>
                </div>
              ) : groupMembers.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {groupMembers.map((member) => {
                    const isMemberAdmin = selectedChat?.admins?.includes(member.id) || false
                    const isCurrentUser = member.id === user?.uid
                    return (
                      <div
                        key={member.id}
                        className="px-4 sm:px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md flex-shrink-0 relative"
                            style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                          >
                            {member.fullName?.[0]?.toUpperCase() || '?'}
                            {isMemberAdmin && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-600 rounded-full border-2 border-white flex items-center justify-center">
                                <Shield className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                                {member.fullName || 'Unknown User'}
                              </p>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex-shrink-0">
                                  You
                                </span>
                              )}
                            </div>
                            <p
                              className="text-xs sm:text-sm text-gray-500 truncate mt-0.5"
                              title={member.email}
                            >
                              {member.email || 'No email'}
                            </p>
                          </div>

                          {!isCurrentUser && (
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!isMemberAdmin ? (
                                <button
                                  onClick={() => handleMakeAdmin(member.id)}
                                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 active:bg-purple-800 transition-all shadow-sm hover:shadow-md font-medium"
                                >
                                  Make Admin
                                </button>
                              ) : (
                                <span className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-purple-100 text-purple-700 rounded-lg font-medium">
                                  Admin
                                </span>
                              )}
                              <button
                                onClick={() => handleRemoveFromGroup(member.id)}
                                className="px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-all shadow-sm hover:shadow-md font-medium"
                              >
                                Remove
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Shield className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium text-sm sm:text-base">No members found</p>
                  <p className="text-gray-500 text-xs sm:text-sm mt-1 text-center">
                    This group doesn't have any members yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
