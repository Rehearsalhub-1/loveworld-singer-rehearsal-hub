import { useState, useMemo, useEffect } from 'react'
import { useProgramStore } from '@/stores/programStore'
import { PraiseNightSong } from '@/types/supabase'
import { apiClient } from '@/lib/api-client'

export interface HomeSearchResult {
  id: string
  type: 'song' | 'page' | 'category' | 'feature' | 'faq' | 'about'
  title: string
  subtitle?: string
  description?: string
  url: string
  pageId?: string
  category?: string
  status?: 'heard' | 'unheard'
  icon?: string
}

const features = [
  { title: 'Rehearsals', url: '/pages/rehearsals', icon: 'Calendar' },
  { title: 'Profile', url: '/pages/profile', icon: 'User' },
  { title: 'Push Notifications', url: '/pages/notifications', icon: 'Bell' },
  { title: 'Groups', url: '/pages/groups', icon: 'Users' },
  { title: 'AudioLab', url: '/pages/audiolab', icon: 'Mic' },
  { title: 'Submit Song', url: '/pages/submit-song', icon: 'Music' },
  { title: 'Media', url: '/pages/media', icon: 'Play' },
  { title: 'Ministry Calendar', url: '/pages/calendar', icon: 'Calendar' },
  { title: 'Customer Support', url: '/pages/support', icon: 'HelpCircle' }
]

const faqItems = [
  { question: 'How do I join a rehearsal?', answer: 'Check the Rehearsals section.' },
  { question: 'Where can I find song lyrics?', answer: 'Access in the AudioLabs section.' },
  { question: 'How do I get support?', answer: 'Use the Support section.' }
]

export function useHomeGlobalSearch(zoneId?: string, enabled: boolean = false) {
  const programsState = useProgramStore();
  const pages = (programsState.programs || []) as any[];
  const [searchQuery, setSearchQuery] = useState('')
  const [allSongs, setAllSongs] = useState<PraiseNightSong[]>([])
  const [songsLoaded, setSongsLoaded] = useState(false)

  useEffect(() => {
    setAllSongs([])
    setSongsLoaded(false)
  }, [zoneId])

  useEffect(() => {
    if (!zoneId || !enabled) return

    const loadAllSongs = async () => {
      try {
        const res = await apiClient.get<any>('/songs?limit=500');
        const list = Array.isArray(res.data) ? res.data : Array.isArray((res as any)?.songs) ? (res as any).songs : [];
        setAllSongs(list)
        setSongsLoaded(true)
      } catch (error) {
        console.error('Error loading songs for search:', error)
        setSongsLoaded(true)
      }
    }

    if (!songsLoaded) {
      loadAllSongs()
    }
  }, [songsLoaded, zoneId, enabled])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()
    const results: HomeSearchResult[] = []

    pages.forEach((page: any) => {
      if (page.name && page.name.toLowerCase().includes(query)) {
        results.push({
          id: `page-${page.id}`,
          type: 'page',
          title: page.name,
          subtitle: 'Praise Night Event',
          description: `${page.location || ''} ${page.date || ''}`.trim(),
          url: `/pages/praise-night?page=${page.id}`,
          pageId: page.id,
          icon: 'Calendar'
        })
      }
    })

    allSongs.forEach((song: any) => {
      const matches =
        (song.title || '').toLowerCase().includes(query) ||
        song.writer?.toLowerCase().includes(query) ||
        song.leadSinger?.toLowerCase().includes(query) ||
        (song.category || '').toLowerCase().includes(query) ||
        song.lyrics?.toLowerCase().includes(query) ||
        song.solfas?.toLowerCase().includes(query) ||
        song.key?.toLowerCase().includes(query) ||
        song.tempo?.toLowerCase().includes(query)

      if (matches) {
        const songPage = pages.find(p => p.id === song.praiseNightId)
        results.push({
          id: `song-${song.id || song.title}`,
          type: 'song',
          title: song.title,
          subtitle: 'Song',
          description: `${songPage?.name || 'Repertoire'} • ${song.category || ''}`,
          url: `/pages/all-ministered-songs?search=${encodeURIComponent(song.title)}`,
          pageId: songPage?.id,
          category: song.category || '',
          status: song.status,
          icon: 'Music'
        })
      }
    })

    features.forEach(feature => {
      if (feature.title.toLowerCase().includes(query)) {
        results.push({
          id: `feature-${feature.title}`,
          type: 'feature',
          title: feature.title,
          subtitle: 'App Feature',
          url: feature.url,
          icon: feature.icon
        })
      }
    })

    faqItems.forEach((faq, i) => {
      if (faq.question.toLowerCase().includes(query)) {
        results.push({
          id: `faq-${i}`,
          type: 'faq',
          title: faq.question,
          subtitle: 'FAQ',
          description: faq.answer,
          url: '/home#faq',
          icon: 'HelpCircle'
        })
      }
    })

    return results.slice(0, 15)
  }, [searchQuery, pages, allSongs])

  return {
    searchQuery,
    setSearchQuery,
    searchResults
  }
}
