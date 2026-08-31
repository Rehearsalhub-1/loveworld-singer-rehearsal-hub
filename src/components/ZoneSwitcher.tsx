"use client";

import { useState, useMemo, useEffect } from 'react'
import { useZone } from '@/hooks/useZone'
import { useAuth } from '@/stores/authStore'
import { Zone, isHQGroup } from '@/config/zones'
import { apiClient } from '@/lib/api-client'
import { ChevronDown, Check, Users, Search, Plus, Sparkles, Building, Shield } from 'lucide-react'
import CustomLoader from './CustomLoader'

export default function ZoneSwitcher() {
  const { currentZone, userZones, isSuperAdmin, isHQAdmin, switchZone, joinZone } = useZone()
  const { profile } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isSwitching, setIsSwitching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinMessage, setJoinMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [allZones, setAllZones] = useState<Zone[]>([])
  useEffect(() => {
    apiClient.get<{ success: boolean; data: Zone[] }>('/organizations')
      .then((res) => { if (res.success && Array.isArray(res.data)) setAllZones(res.data); })
      .catch(() => {});
  }, []);

  // Zones to display:
  // For Super Admins / HQ Admins -> all ZONES
  // For regular users -> their joined userZones
  const displayedZones = useMemo(() => {
    const hasSpecialAccess = isSuperAdmin || isHQAdmin || profile?.hasHqAccess || profile?.has_hq_access
    if (hasSpecialAccess) {
      return allZones.length > 0 ? allZones : userZones;
    }
    return userZones.length > 0 ? userZones : (currentZone ? [currentZone] : [])
  }, [isSuperAdmin, isHQAdmin, profile, userZones, currentZone, allZones])

  const filteredZones = useMemo(() => {
    if (!searchQuery.trim()) return displayedZones
    const q = searchQuery.toLowerCase().trim()
    return displayedZones.filter(z =>
      z.name.toLowerCase().includes(q) ||
      (z.region && z.region.toLowerCase().includes(q)) ||
      (z.invitationCode && z.invitationCode.toLowerCase().includes(q))
    )
  }, [displayedZones, searchQuery])

  // Split into HQ Groups and Regional Zones
  const hqGroups = useMemo(() => filteredZones.filter(z => isHQGroup(z.id) || z.region === 'Headquarters'), [filteredZones])
  const regionalZones = useMemo(() => filteredZones.filter(z => !isHQGroup(z.id) && z.region !== 'Headquarters'), [filteredZones])

  if (!currentZone) {
    return null
  }

  const handleZoneSwitch = async (zoneId: string) => {
    if (zoneId === currentZone.id) {
      setIsOpen(false)
      return
    }

    setIsOpen(false)
    setIsSwitching(true)

    if (typeof window !== 'undefined') {
      localStorage.setItem('lwsrh_active_zone_id', zoneId)
      sessionStorage.setItem('admin_selected_zone_id', zoneId)
    }

    const success = await switchZone(zoneId)

    if (success) {
      try {
        const keysToRemove: string[] = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && !key.startsWith('lwsrh-user-zone-') && !key.startsWith('lwsrh_active_zone_id') && !key.startsWith('user_profile_cache_') && (
            key.includes('praise-nights') ||
            key.includes('songs-data') ||
            key.includes('categories') ||
            key.includes('calendar') ||
            key.includes('notifications') ||
            key.includes('members') ||
            key.includes('rehearsal') ||
            key.includes('media-cache')
          )) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
      } catch (e) {
        console.error('Error clearing caches:', e)
      }

      setTimeout(() => {
        window.location.reload()
      }, 300)
    } else {
      setIsSwitching(false)
    }
  }

  const handleJoinZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim() || isJoining) return

    setIsJoining(true)
    setJoinMessage(null)

    try {
      const res = await joinZone(joinCode.trim())
      if (res.success) {
        setJoinMessage({ type: 'success', text: res.message })
        setJoinCode('')
        setTimeout(() => {
          setIsOpen(false)
          window.location.reload()
        }, 800)
      } else {
        setJoinMessage({ type: 'error', text: res.message })
      }
    } catch {
      setJoinMessage({ type: 'error', text: 'Failed to join. Check invitation code.' })
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <>
      {isSwitching && (
        <div className="fixed inset-0 z-[9999] bg-white/80 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-4">
            <CustomLoader size="lg" />
            <p className="text-gray-700 font-medium animate-pulse">Switching group...</p>
          </div>
        </div>
      )}

      <div className="relative inline-block text-left">
        {/* Current Active Zone Pill */}
        <button
          onClick={() => { setIsOpen(!isOpen); setJoinMessage(null); }}
          disabled={isSwitching}
          className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 group hover:border-purple-500/50"
        >
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm ring-2 ring-purple-400/30"
            style={{ backgroundColor: currentZone.themeColor || '#9333EA' }}
          />
          <div className="text-left flex items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-800 max-w-[140px] sm:max-w-[180px] truncate">
              {currentZone.name}
            </span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => { setIsOpen(false); setSearchQuery(''); setJoinMessage(null); }}
            />

            <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Active Badge Header */}
              <div className="p-3.5 border-b border-gray-100 bg-gradient-to-r from-purple-50/70 to-indigo-50/70">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-bold text-gray-900">
                      {isSuperAdmin ? 'All Zones & HQ Groups' : 'Your Joined Zones & Groups'}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {userZones.length} Joined
                  </span>
                </div>

                {/* Search Bar */}
                <div className="relative mt-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search joined groups..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-gray-900 placeholder-gray-400"
                    autoFocus
                  />
                </div>
              </div>

              {/* Zones List */}
              <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                {filteredZones.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-gray-400">
                    No joined zones match "{searchQuery}"
                  </div>
                ) : (
                  <>
                    {/* HQ Groups Section */}
                    {hqGroups.length > 0 && (
                      <div className="mb-2">
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Headquarters & Groups
                        </div>
                        {hqGroups.map((zone) => {
                          const isSelected = currentZone.id === zone.id
                          return (
                            <button
                              key={zone.id}
                              onClick={() => handleZoneSwitch(zone.id)}
                              className={`w-full px-3 py-2 flex items-center gap-3 rounded-xl hover:bg-gray-100/80 transition-colors text-left ${
                                isSelected ? 'bg-purple-50 font-semibold' : ''
                              }`}
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: zone.themeColor || '#9333EA' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs truncate ${isSelected ? 'text-purple-700 font-bold' : 'text-gray-900'}`}>
                                  {zone.name}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {zone.invitationCode} • {zone.region}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white flex-shrink-0">
                                  ACTIVE
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {/* Regional Zones Section */}
                    {regionalZones.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Regional Zones
                        </div>
                        {regionalZones.map((zone) => {
                          const isSelected = currentZone.id === zone.id
                          return (
                            <button
                              key={zone.id}
                              onClick={() => handleZoneSwitch(zone.id)}
                              className={`w-full px-3 py-2 flex items-center gap-3 rounded-xl hover:bg-gray-100/80 transition-colors text-left ${
                                isSelected ? 'bg-purple-50 font-semibold' : ''
                              }`}
                            >
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                                style={{ backgroundColor: zone.themeColor || '#9333EA' }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs truncate ${isSelected ? 'text-purple-700 font-bold' : 'text-gray-900'}`}>
                                  {zone.name}
                                </p>
                                <p className="text-[10px] text-gray-400 truncate">
                                  {zone.invitationCode} • {zone.region}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-600 text-white flex-shrink-0">
                                  ACTIVE
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Inline Join Another Zone Input (matches rehearsalhubv2 SettingsScreen) */}
              <div className="p-3 border-t border-gray-100 bg-gray-50/70">
                <p className="text-[11px] font-bold text-gray-700 mb-1.5">
                  Join Another Zone or HQ Group
                </p>
                <form onSubmit={handleJoinZone} className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="Enter invitation code (e.g. BLWZN1)"
                    maxLength={15}
                    className="flex-1 px-3 py-1.5 text-xs uppercase bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/40 text-gray-900 placeholder-gray-400 font-medium tracking-wide"
                  />
                  <button
                    type="submit"
                    disabled={!joinCode.trim() || isJoining}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-1 flex-shrink-0"
                  >
                    {isJoining ? 'Joining...' : 'Join'}
                  </button>
                </form>

                {joinMessage && (
                  <p className={`mt-1.5 text-[11px] font-medium ${joinMessage.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                    {joinMessage.text}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
