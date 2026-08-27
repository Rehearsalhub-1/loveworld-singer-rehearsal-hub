"use client";

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, ChevronLeft, ChevronRight, Plus, Share2, Trash2, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { apiClient } from '@/lib/api-client'
import { useZone } from '@/hooks/useZone'
import { uploadToCloudinary } from '@/lib/cloudinary-storage'
import { subscribe as subscribeToWebSocket } from '@/hooks/useWebSocket'

interface StatusItem {
  id: string
  userId: string
  userName: string
  userAvatar?: string | null
  mediaUrl: string
  type: 'image' | 'video'
  caption?: string
  createdAt: string
  expiresAt: string
  viewers: string[]
  isViewed?: boolean
}

export default function StatusPage() {
  const { user, profile } = useAuth()
  const { currentZone } = useZone()
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')

  const currentUserId = user?.id || user?.uid || ''
  const groups = useMemo(() => {
    const map = new Map<string, StatusItem[]>()
    statuses.forEach((status) => map.set(status.userId, [...(map.get(status.userId) || []), status]))
    return Array.from(map.values())
  }, [statuses])
  const mine = statuses.filter((status) => status.userId === currentUserId)
  const selected = selectedIndex === null ? null : statuses[selectedIndex]

  const loadStatuses = useCallback(async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data?: StatusItem[] }>('/statuses')
      if (response.success) setStatuses(response.data || [])
    } catch (loadError) {
      console.error('[StatusPage] load error:', loadError)
      setError('Unable to load status updates.')
    }
  }, [])

  useEffect(() => { loadStatuses() }, [loadStatuses])

  useEffect(() => {
    return subscribeToWebSocket('statuses', 'all', () => {
      loadStatuses()
    })
  }, [loadStatuses])

  const openGroup = (group: StatusItem[]) => {
    const unread = group.find((status) => !status.isViewed) || group[0]
    setSelectedIndex(statuses.findIndex((status) => status.id === unread.id))
  }

  useEffect(() => {
    if (!selected || selected.isViewed || selected.userId === currentUserId) return
    setStatuses((items) => items.map((item) => item.id === selected.id ? { ...item, isViewed: true } : item))
    apiClient.post(`/statuses/${encodeURIComponent(selected.id)}/view`).catch(() => {})
  }, [selectedIndex])

  const uploadStatus = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || isUploading) return
    setIsUploading(true)
    setError('')
    try {
      const mediaUrl = await uploadToCloudinary(file, undefined, 'status')
      const type = file.type.startsWith('video/') ? 'video' : 'image'
      const response = await apiClient.post<{ success: boolean; data?: StatusItem }>('/statuses', { mediaUrl, type })
      if (!response.success || !response.data) throw new Error('Status upload failed')
      setStatuses((items) => [response.data!, ...items])
    } catch (uploadError) {
      console.error('[StatusPage] upload error:', uploadError)
      setError('Status could not be uploaded. Please try again.')
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const deleteStatus = async () => {
    if (!selected || selected.userId !== currentUserId) return
    await apiClient.delete(`/statuses/${encodeURIComponent(selected.id)}`).catch(() => {})
    setStatuses((items) => items.filter((item) => item.id !== selected.id))
    setSelectedIndex(null)
  }

  const shareStatus = async () => {
    if (!selected) return
    await navigator.share?.({ title: selected.userName, text: selected.caption || 'Status update', url: selected.mediaUrl })
  }

  const profileName = profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : 'My status'

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-6 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-center justify-between mb-8">
          <div><h1 className="text-3xl font-bold">Status</h1><p className="text-sm text-slate-400 mt-1">Updates from your choir</p></div>
          <label className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 font-semibold cursor-pointer hover:bg-emerald-400">
            <Plus className="h-4 w-4" /> {isUploading ? 'Posting...' : 'Add status'}
            <input type="file" accept="image/*,video/*" className="hidden" onChange={uploadStatus} disabled={isUploading} />
          </label>
        </header>

        {error && <div className="mb-4 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
        <section className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.03]">
          <button className="flex w-full items-center gap-4 p-4 text-left hover:bg-white/5" onClick={() => mine.length ? openGroup(mine) : document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-emerald-400 bg-slate-800 overflow-hidden">
              {profile?.profile_image_url ? <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" /> : <Image className="h-7 w-7 text-slate-400" />}
              <span className="absolute bottom-0 right-0 rounded-full bg-emerald-500 p-1"><Plus className="h-3 w-3" /></span>
            </div>
            <span><strong className="block">{profileName}</strong><small className="text-slate-400">{mine.length ? 'Tap to view your updates' : 'Share a photo or video'}</small></span>
          </button>
          {groups.map((group) => {
            const first = group[0]
            return <button key={first.userId} className="flex w-full items-center gap-4 p-4 text-left hover:bg-white/5" onClick={() => openGroup(group)}>
              <div className={`h-16 w-16 rounded-full border-4 p-0.5 ${group.every((status) => status.isViewed) ? 'border-slate-600' : 'border-emerald-400'}`}><img src={first.userAvatar || '/logo.png'} alt="" className="h-full w-full rounded-full object-cover" /></div>
              <span className="flex-1"><strong className="block">{first.userName}</strong><small className="text-slate-400">{group.length} update{group.length === 1 ? '' : 's'} · disappears after 24 hours</small></span><ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
          })}
        </section>
        {!groups.length && <div className="py-24 text-center text-slate-400">No status updates yet. Share a rehearsal moment.</div>}
      </div>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
        <button className="absolute right-5 top-5" onClick={() => setSelectedIndex(null)}><X /></button>
        <button className="absolute left-5 top-1/2" onClick={() => setSelectedIndex(Math.max(0, (selectedIndex || 0) - 1))}><ChevronLeft /></button>
        {selected.type === 'video' ? <video src={selected.mediaUrl} className="max-h-[82vh] max-w-full" controls autoPlay /> : <img src={selected.mediaUrl} alt={selected.caption || 'Status'} className="max-h-[82vh] max-w-full object-contain" />}
        <button className="absolute right-5 top-1/2" onClick={() => selectedIndex !== null && setSelectedIndex(Math.min(statuses.length - 1, selectedIndex + 1))}><ChevronRight /></button>
        <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4"><div className="flex-1"><strong>{selected.userName}</strong><p className="text-sm text-slate-300">{selected.caption}</p></div><button onClick={shareStatus}><Share2 /></button>{selected.userId === currentUserId && <button onClick={deleteStatus}><Trash2 /></button>}</div>
      </div>}
    </main>
  )
}
