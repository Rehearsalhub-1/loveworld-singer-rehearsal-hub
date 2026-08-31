"use client";

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { ArrowLeft, Users, Check, Loader2, ChevronDown, Search, Building } from 'lucide-react'
import { Zone } from '@/config/zones'
import { apiClient } from '@/lib/api-client'

export default function JoinZonePage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { refreshZones, userZones, joinZone } = useZone()

  const [zoneCode, setZoneCode] = useState('')
  const [zoneName, setZoneName] = useState<string | null>(null)
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false)
  const [zoneSearchQuery, setZoneSearchQuery] = useState('')
  const [useManualCode, setUseManualCode] = useState(false)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [allZones, setAllZones] = useState<Zone[]>([])
  useEffect(() => {
    apiClient.get<{ success: boolean; data: Zone[] }>('/organizations')
      .then((res) => { if (res.success && Array.isArray(res.data)) setAllZones(res.data); })
      .catch(() => {});
  }, []);

  const handleZoneCodeChange = (code: string) => {
    const clean = code.toUpperCase();
    setZoneCode(clean);
    setError('');
    setZoneName(null);
    if (clean.length >= 4) {
      const zone = allZones.find(
        z => (z.invitationCode || '').toUpperCase() === clean ||
             (z.code || '').toUpperCase() === clean ||
             z.id.toUpperCase() === clean
      );
      if (zone) {
        setZoneName(zone.name || zone.id);
      } else if (clean.length >= 6) {
        setError('Invalid zone code');
      }
    }
  }

  const handleJoinZone = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.id || !profile) {
      setError('Please sign in first')
      return
    }

    if (!zoneCode || zoneCode.length < 6) {
      setError('Please enter a valid zone code')
      return
    }

    setIsJoining(true)
    setError('')

    try {
      const result = await joinZone(zoneCode);

      if (result.success) {
        setSuccess(result.message || `Welcome to ${zoneName || 'your zone'}!`);

        localStorage.removeItem('lwsrh-zone-cache-v5')
        localStorage.removeItem('lwsrh-profile-cache-v1')

        const cacheKeys = ['praise-nights', 'songs-data', 'categories', 'calendar', 'notifications']
        cacheKeys.forEach(key => {
          try {
            for (let i = localStorage.length - 1; i >= 0; i--) {
              const storageKey = localStorage.key(i)
              if (storageKey && storageKey.includes(key)) {
                localStorage.removeItem(storageKey)
              }
            }
          } catch (e) { /* ignore */ }
        })

        setTimeout(() => {
          window.location.href = '/home'
        }, 1200)
      } else {
        const errorMsg = typeof (result as any)?.error === 'string' ? (result as any).error : 'Failed to join zone'
        setError(errorMsg)
      }
    } catch (err: any) {
      console.error('Join zone error:', err)
      setError(err.message || 'Failed to join zone')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-50">
      <ScreenHeader
        title="Join a Zone"
        showBackButton={true}
        backPath="/pages/profile"
        rightImageSrc="/logo.png"
      />

      <div className="max-w-md mx-auto px-4 py-8">
        {/* Current Zones */}
        {userZones.length > 0 && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
            <p className="text-sm text-green-800 font-medium mb-2">Your Current Zones:</p>
            <div className="space-y-2">
              {userZones.map(zone => (
                <div key={zone.id} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: zone.themeColor }}
                  />
                  <span className="text-sm text-green-700">{zone.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join Zone Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Join a Zone</h2>
            <p className="text-sm text-gray-600">
              Enter your zone invitation code to join a LoveWorld Singers zone
            </p>
          </div>

          <form onSubmit={handleJoinZone} className="space-y-4">
            {/* Zone Selector Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Your Zone or Group
              </label>

              {!useManualCode ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl text-left flex items-center justify-between text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                      {zoneName ? (
                        <div className="truncate">
                          <span className="font-bold text-gray-900">{zoneName}</span>
                          <span className="text-xs text-emerald-600 ml-2 font-mono font-bold">({zoneCode})</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 font-medium">Choose from active zones...</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${isZoneDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isZoneDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsZoneDropdownOpen(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-3 border-b border-gray-100 bg-gray-50/70">
                          <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              placeholder="Search zone by name or region..."
                              value={zoneSearchQuery}
                              onChange={(e) => setZoneSearchQuery(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                            />
                          </div>
                        </div>

                        <div className="max-h-60 overflow-y-auto custom-scrollbar p-1.5 space-y-1">
                          {allZones.filter(z => {
                            if (!zoneSearchQuery.trim()) return true;
                            const q = zoneSearchQuery.toLowerCase().trim();
                            return (z.name || '').toLowerCase().includes(q) ||
                              ((z.region || '').toLowerCase().includes(q)) ||
                              ((z.invitationCode || '').toLowerCase().includes(q));
                          }).map(z => {
                            const isSelected = zoneCode === z.invitationCode;
                            return (
                              <button
                                key={z.id}
                                type="button"
                                onClick={() => {
                                  handleZoneCodeChange(z.invitationCode || '');
                                  setIsZoneDropdownOpen(false);
                                  setZoneSearchQuery('');
                                }}
                                className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                    : 'hover:bg-emerald-50 text-gray-800'
                                }`}
                              >
                                <div className="truncate pr-2">
                                  <p className="font-bold truncate">{z.name}</p>
                                  <p className={`text-[10px] ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                                    {z.region} • <span className="font-mono">{z.invitationCode}</span>
                                  </p>
                                </div>
                                {isSelected && <Check className="w-4 h-4 shrink-0 text-white" />}
                              </button>
                            );
                          })}
                        </div>

                        <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setUseManualCode(true);
                              setIsZoneDropdownOpen(false);
                            }}
                            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800"
                          >
                            Have a coordinator or special code? Enter manually
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={zoneCode}
                      onChange={(e) => handleZoneCodeChange(e.target.value)}
                      placeholder="e.g., ZONE044 or ZNLZONE044"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-center text-lg font-mono uppercase"
                      maxLength={12}
                    />
                    <button
                      type="button"
                      onClick={() => setUseManualCode(false)}
                      className="px-3 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold shrink-0"
                    >
                      Browse List
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Use ZNL prefix for coordinator access (e.g., ZNLZONE044)
                  </p>
                </div>
              )}
            </div>

            {/* Zone Detection */}
            {zoneName && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-900">Zone Found!</p>
                    <p className="text-base font-bold text-emerald-700">{zoneName}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!zoneName || isJoining}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  Join Zone
                </>
              )}
            </button>
          </form>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Don't have a zone code? Contact your zone coordinator or check your invitation message.
          </p>
        </div>
      </div>
    </div>
  )
}
