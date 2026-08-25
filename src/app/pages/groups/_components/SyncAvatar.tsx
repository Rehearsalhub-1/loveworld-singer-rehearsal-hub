"use client";

import React, { useState, useEffect } from 'react'
import { Users } from 'lucide-react'
import { BackendAPI } from '@/lib/api-client';

interface SyncAvatarProps {
  userId?: string
  initialAvatar?: string | null
  fallbackName?: string
  size?: string
  bgColor?: string
  className?: string
  textClassName?: string
  isGroup?: boolean
}

export function SyncAvatar({
  userId,
  initialAvatar,
  fallbackName,
  size = "w-10 h-10",
  bgColor = "#10b981",
  className = "",
  textClassName = "text-sm",
  isGroup = false
}: SyncAvatarProps) {
  const [avatar, setAvatar] = useState<string | null | undefined>(initialAvatar)

  useEffect(() => {
    if (initialAvatar) setAvatar(initialAvatar)
    else setAvatar(undefined)
  }, [initialAvatar])

  useEffect(() => {
    if (!isGroup && userId && !initialAvatar) {
      BackendAPI.profiles.get(userId).then(res => {
        const p = res?.data as any
        if (p?.profile_image_url) setAvatar(p.profile_image_url)
        else if (p?.avatar_url) setAvatar(p.avatar_url)
        else if (p?.photoURL) setAvatar(p.photoURL)
        else if (p?.avatar) setAvatar(p.avatar)
        else if (p?.profileImage) setAvatar(p.profileImage)
      }).catch(err => console.error('[SyncAvatar] error:', err))
    }
  }, [userId, isGroup, initialAvatar])

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center text-white font-bold ${textClassName} overflow-hidden shadow-sm flex-shrink-0 ${className}`}
      style={{ backgroundColor: bgColor }}
    >
      {avatar ? (
        <img src={avatar} alt="" className="w-full h-full object-cover" />
      ) : isGroup ? (
        <Users className="w-5 h-5" />
      ) : (
        (fallbackName || '?').charAt(0).toUpperCase()
      )}
    </div>
  )
}
