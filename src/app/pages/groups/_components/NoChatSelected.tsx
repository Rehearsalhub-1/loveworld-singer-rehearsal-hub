"use client";

import { useZone } from '@/hooks/useZone'
import { MessageCircle, Users, Search, Plus } from 'lucide-react'

export default function NoChatSelected() {
  const { currentZone } = useZone()

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div 
          className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-lg"
          style={{ 
            backgroundColor: `${currentZone?.themeColor || '#10b981'}20`
          }}
        >
          <MessageCircle 
            className="w-10 h-10 sm:w-12 sm:h-12"
            style={{ color: currentZone?.themeColor || '#10b981' }}
          />
        </div>

        {/* Title */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 sm:mb-3">
          Welcome to Messages
        </h2>
        
        {/* Description */}
        <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 leading-relaxed">
          Select a chat from the sidebar to start messaging, or create a new conversation.
        </p>

        {/* Action buttons */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${currentZone?.themeColor || '#10b981'}20` }}
            >
              <Search 
                className="w-5 h-5"
                style={{ color: currentZone?.themeColor || '#10b981' }}
              />
            </div>
            <div className="text-left min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Search Users</h4>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Find and message users</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${currentZone?.themeColor || '#10b981'}20` }}
            >
              <Plus 
                className="w-5 h-5"
                style={{ color: currentZone?.themeColor || '#10b981' }}
              />
            </div>
            <div className="text-left min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Create Group</h4>
              <p className="text-xs sm:text-sm text-gray-600 truncate">Start a group conversation</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${currentZone?.themeColor || '#10b981'}20` }}
            >
              <Users 
                className="w-5 h-5"
                style={{ color: currentZone?.themeColor || '#10b981' }}
              />
            </div>
            <div className="text-left min-w-0">
              <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Users</h4>
              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                Connect with other users
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 sm:mt-8 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-blue-900 mb-2 text-sm sm:text-base"> Quick Tips</h4>
          <ul className="text-xs sm:text-sm text-blue-800 space-y-1 text-left">
            <li>• Use the search button to find and message any user</li>
            <li>• Create groups for team discussions and planning</li>
            <li>• Share images and files in your conversations</li>
            <li>• All messages are secure and private to your zone</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
