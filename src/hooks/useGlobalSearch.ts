import { useState, useMemo } from 'react'
import { useProgramStore } from '@/stores/programStore'

export interface SearchResult {
  id: string
  type: 'song' | 'page' | 'category'
  title: string
  subtitle?: string
  description?: string
  url: string
  pageId?: string
  category?: string
  status?: 'heard' | 'unheard'
}

export function useGlobalSearch() {
  const programsState = useProgramStore();
  const pages = (programsState.programs || []) as any[];
  const [searchQuery, setSearchQuery] = useState('')

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return []

    const query = searchQuery.toLowerCase().trim()
    const results: SearchResult[] = []

    pages.forEach((page: any) => {
      if (page.name.toLowerCase().includes(query)) {
        results.push({
          id: `page-${page.id}`,
          type: 'page',
          title: page.name,
          subtitle: 'Praise Night Event',
          description: `${page.location} • ${page.date}`,
          url: `/pages/praise-night?page=${page.id}`,
          pageId: page.id
        })
      }

      (page.songs || []).forEach((song: any) => {
        const matchesTitle = song.title.toLowerCase().includes(query)
        const matchesWriter = song.writer?.toLowerCase().includes(query)
        const matchesLeadSinger = song.leadSinger?.toLowerCase().includes(query)
        const matchesConductor = song.conductor?.toLowerCase().includes(query)
        const matchesCategory = (song.category || '').toLowerCase().includes(query)
        const matchesKey = song.key?.toLowerCase().includes(query)
        const matchesLyrics = song.lyrics?.toLowerCase().includes(query)
        const matchesSolfas = song.solfas?.toLowerCase().includes(query)
        const matchesTempo = song.tempo?.toLowerCase().includes(query)

        if (matchesTitle || matchesWriter || matchesLeadSinger || matchesConductor || matchesCategory || matchesKey || matchesLyrics || matchesSolfas || matchesTempo) {
          let matchReason = ''
          if (matchesTitle) matchReason = 'Song Title'
          else if (matchesWriter) matchReason = `Writer: ${song.writer}`
          else if (matchesLeadSinger) matchReason = `Lead Singer: ${song.leadSinger}`
          else if (matchesConductor) matchReason = `Conductor: ${song.conductor}`
          else if (matchesCategory) matchReason = `Category: ${song.category}`
          else if (matchesKey) matchReason = `Key: ${song.key}`
          else if (matchesLyrics) matchReason = 'Lyrics Content'
          else if (matchesSolfas) matchReason = 'Solfas Content'
          else if (matchesTempo) matchReason = `Tempo: ${song.tempo}`

          results.push({
            id: `song-${song.title}-${page.id}`,
            type: 'song',
            title: song.title,
            subtitle: matchReason,
            description: `${page.name} • ${song.category || ''} • ${song.status || ''}`,
            url: `/pages/praise-night?page=${page.id}&song=${encodeURIComponent(song.title)}`,
            pageId: page.id,
            category: song.category || '',
            status: song.status
          })
        }
      })

      const categories = [...new Set((page.songs || []).map((song: any) => song.category).filter(Boolean) as string[])]
      categories.forEach(category => {
        if (category.toLowerCase().includes(query)) {
          const songsInCategory = (page.songs || []).filter((song: any) => song.category === category)
          results.push({
            id: `category-${category}-${page.id}`,
            type: 'category',
            title: category,
            subtitle: 'Song Category',
            description: `${page.name} • ${songsInCategory.length} songs`,
            url: `/pages/praise-night?page=${page.id}&category=${encodeURIComponent(category)}`,
            pageId: page.id,
            category: category
          })
        }
      })
    })

    return results.sort((a, b) => {
      const aExact = a.title.toLowerCase() === query
      const bExact = b.title.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1

      const typePriority = { song: 0, page: 1, category: 2 }
      const aPriority = typePriority[a.type]
      const bPriority = typePriority[b.type]
      if (aPriority !== bPriority) return aPriority - bPriority

      return a.title.localeCompare(b.title)
    }).slice(0, 10)
  }, [searchQuery, pages])

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    hasResults: searchResults.length > 0
  }
}
