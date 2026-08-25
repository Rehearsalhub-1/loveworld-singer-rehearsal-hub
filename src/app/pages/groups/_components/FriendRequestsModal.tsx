"use client";

'use client'

import { useChat } from '../_context/ChatContext'
import { useZone } from '@/hooks/useZone'
import { X, UserPlus, Check, X as XIcon, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface FriendRequestsModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FriendRequestsModal({ isOpen, onClose }: FriendRequestsModalProps) {
  const { friendRequests, acceptFriendRequest } = useChat()
  const { currentZone } = useZone()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(requestId)
    
    try {
      await acceptFriendRequest(requestId)
    } catch (error) {
 console.error('Error accepting friend request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    setActionLoading(`decline-${requestId}`)
    
    try {
    } catch (error) {
 console.error('Error declining friend request:', error)
    } finally {
      setActionLoading(null)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div 
          className="p-6 text-white"
          style={{ 
            background: currentZone?.themeColor 
              ? `linear-gradient(135deg, ${currentZone.themeColor} 0%, ${adjustColor(currentZone.themeColor, -20)} 100%)`
              : 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="w-6 h-6" />
              <div>
                <h2 className="text-xl font-bold">Friend Requests</h2>
                <p className="text-sm opacity-90">
                  {friendRequests.length} pending request{friendRequests.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-96 overflow-y-auto">
          {friendRequests.length === 0 ? (
            <div className="p-8 text-center">
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${currentZone?.themeColor || '#10b981'}20` }}
              >
                <UserPlus 
                  className="w-8 h-8"
                  style={{ color: currentZone?.themeColor || '#10b981' }}
                />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Friend Requests</h3>
              <p className="text-gray-600 text-sm">
                You don't have any pending friend requests at the moment.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {friendRequests.map((request) => (
                <div key={request.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  {/* Avatar */}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0"
                    style={{ backgroundColor: currentZone?.themeColor || '#10b981' }}
                  >
                    {request.fromUserAvatar ? (
                      <img 
                        src={request.fromUserAvatar} 
                        alt={request.fromUserName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      request.fromUserName[0]?.toUpperCase() || '?'
                    )}
                  </div>

                  {/* Request info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900">
                      {request.fromUserName}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Wants to be your friend
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAcceptRequest(request.id)}
                      disabled={actionLoading === request.id}
                      className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Accept"
                    >
                      {actionLoading === request.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleDeclineRequest(request.id)}
                      disabled={actionLoading === `decline-${request.id}`}
                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Decline"
                    >
                      {actionLoading === `decline-${request.id}` ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <XIcon className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {friendRequests.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
               Accepting a friend request allows you to easily start conversations
            </p>
          </div>
        )}
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
