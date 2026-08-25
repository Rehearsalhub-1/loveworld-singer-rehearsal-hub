"use client";

import Link from 'next/link'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CustomLoader from '@/components/CustomLoader'
import { DashboardSkeleton } from '@/components/DashboardSkeleton'

import { 
  Music, 
  Calendar, 
  Users, 
  BarChart3, 
  Search, 
  X, 
  Home, 
  User, 
  Bell, 
  HelpCircle, 
  Flag, 
  Play, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Shield, 
  Lock, 
  Mic, 
  Sparkles, 
  Crown, 
  ArrowRight 
} from 'lucide-react'

import { getMenuItems } from '@/config/menuItems'
import SharedDrawer from '@/components/SharedDrawer'
import Tooltip from '@/components/Tooltip'
import ZoneSwitcher from '@/components/ZoneSwitcher'
import { useHomeGlobalSearch, HomeSearchResult } from '@/hooks/useHomeGlobalSearch'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { useSubscription } from '@/contexts/SubscriptionContext'
import { useUnreadNotifications } from '@/stores/notificationStore'
import { handleAppRefresh } from '@/utils/refresh-utils'

import { isHQAdminEmail } from '@/config/roles'
import HeroCarousel from './_components/HeroCarousel'
import AboutSection from './_components/AboutSection'
import FAQSection from './_components/FAQSection'
import CelebrationOverlay from './_components/CelebrationOverlay'

function HomePageContent() {
  const router = useRouter()
  const { signOut, profile, user, isLoading: authLoading, initialLoadComplete } = useAuth()

  const isBoss = profile?.role === 'boss' || profile?.email?.toLowerCase().startsWith('boss')
  const isHQAdmin = profile?.email && isHQAdminEmail(profile.email)

  const { currentZone, isLoading: zoneLoading, isZoneCoordinator, refreshZones } = useZone()
  const { hasFeature } = useSubscription()
  const { hasUnread: hasUnreadNotifications, hasNewMedia, hasNewCalendar, unreadCount: chatUnreadCount } = useUnreadNotifications()

  // Success celebration state
  const searchParams = useSearchParams()
  const [showCelebration, setShowCelebration] = useState(false)

  useEffect(() => {
    const subscribed = searchParams?.get('subscribed')
    if (subscribed === 'true') {
      setShowCelebration(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('subscribed')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams])

  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (!zoneLoading && !currentZone && user && initialLoadComplete && retryCount < 2) {
      const retryTimer = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        if (refreshZones) {
          refreshZones();
        }
      }, 1500);
      return () => clearTimeout(retryTimer);
    }
  }, [zoneLoading, currentZone, user, initialLoadComplete, retryCount, refreshZones]);

  const handleRetryZoneLoad = async () => {
    setIsRetrying(true);
    setRetryCount(0);
    if (refreshZones) {
      await refreshZones();
    }
    setTimeout(() => {
      setIsRetrying(false);
    }, 2000);
  };

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [isCoordinator, setIsCoordinator] = useState(false)

  const { searchQuery: globalSearchQuery, setSearchQuery: setGlobalSearchQuery, searchResults } = useHomeGlobalSearch(currentZone?.id, isSearchOpen)
  const typedSearchResults = searchResults as HomeSearchResult[]

  useEffect(() => {
    setIsCoordinator(isZoneCoordinator);
  }, [isZoneCoordinator]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      const id = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [isSearchOpen])

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen)
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error(' Home: Logout error:', error)
      router.push('/auth')
    }
  }

  const handleRefresh = () => {
    handleAppRefresh()
  }

  const getIconComponent = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'Search': Search,
      'Music': Music,
      'Calendar': Calendar,
      'User': User,
      'Bell': Bell,
      'Users': Users,
      'Play': Play,
      'BarChart3': BarChart3,
      'HelpCircle': HelpCircle,
      'Flag': Flag,
      'Info': Info,
      'Home': Home,
      'Mic': Mic
    };
    return iconMap[iconName] || Search;
  }

  const getTooltip = (title: string) => {
    const tooltips: { [key: string]: string } = {
      'Central Dashboard': 'Manage all zones',
      'HQ Admin': 'HQ admin panel',
      'Dashboard': 'Zone management',
      'Rehearsals': 'View schedules',
      'Profile': 'Your info',
      'Notifications': 'Updates',
      'Groups': 'Your teams',
      'Submit Song': 'Add new song',
      'Media': 'Audio & videos',
      'Ministry Calendar': 'Events',
      'Link': 'External link',
      'Admin Support': 'Get help',
      'AudioLab': 'Recording & practicing'
    }
    return tooltips[title] || ''
  }

  const bossFeatures = [
    {
      icon: Shield,
      title: 'Central Dashboard',
      href: '/boss',
      badge: null,
      premium: false,
      bossOnly: true,
    },
  ]

  const coordinatorFeatures = [
    {
      icon: Shield,
      title: 'Dashboard',
      href: '/admin',
      badge: null,
      premium: false,
      coordinatorOnly: true,
    },
  ]

  const hiddenFeatures = (profile as any)?.hidden_features || (profile as any)?.hiddenFeatures || {};

  const features = [
    ...(isBoss ? bossFeatures : []),
    ...(isHQAdmin ? [{
      icon: Shield,
      title: 'HQ Admin',
      href: '/admin',
      badge: null,
      premium: false,
    }] : []),
    ...(isZoneCoordinator && !isBoss && !isHQAdmin ? coordinatorFeatures : []),
    {
      icon: Calendar,
      title: 'Rehearsals',
      href: '/pages/rehearsals',
      badge: null,
      premium: true,
    },
    {
      icon: User,
      title: 'Profile',
      href: '/pages/profile',
      badge: null,
      premium: false,
    },
    {
      icon: Bell,
      title: 'Notifications',
      href: '/pages/notifications',
      badge: true,
      premium: false,
    },
    ...(!hiddenFeatures.hideSubgroups ? [{
      icon: Users,
      title: 'Groups',
      href: '/pages/groups',
      badge: 'chat',
      premium: false,
    }] : []),
    ...(!hiddenFeatures.hideSubmissions ? [{
      icon: Music,
      title: 'Submit Song',
      href: '/pages/submit-song',
      badge: null,
      premium: true,
    }] : []),
    ...(!hiddenFeatures.hideAudioLab ? [{
      icon: Play,
      title: 'Media',
      href: '/pages/media',
      badge: 'media',
      premium: false,
    }] : []),
    {
      icon: Calendar,
      title: 'Ministry Calendar',
      href: '/pages/calendar',
      badge: 'calendar',
      premium: false,
    },
    {
      icon: BarChart3,
      title: 'Link',
      href: '#',
      badge: null,
      premium: false,
      external: true,
    },
    {
      icon: HelpCircle,
      title: 'Admin Support',
      href: '/pages/support',
      badge: null,
      premium: false,
    },
  ]

  if (zoneLoading && !currentZone) {
    return null;
  }

  if (!zoneLoading && !currentZone && user && initialLoadComplete) {
    if (isRetrying || retryCount < 2) {
      return null;
    }

    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-slate-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Can't connect</h2>
          <p className="text-gray-500 text-sm mb-5">Check your connection and try again</p>

          <button
            onClick={handleRetryZoneLoad}
            disabled={isRetrying}
            className="w-full mb-3 inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-medium rounded-xl transition-colors"
          >
            {isRetrying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Retrying...
              </>
            ) : (
              'Retry'
            )}
          </button>

          <Link
            href="/pages/join-zone"
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 text-purple-600 font-medium rounded-xl hover:bg-purple-50 transition-colors"
          >
            Join a Zone
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50">
      {/* Main Content with Apple-style reveal effect */}
      <div
        className={`
           w-full h-full flex flex-col
           transition-all duration-300 ease-out
           ${isDrawerOpen
            ? 'translate-x-72 scale-[0.88] rounded-2xl shadow-2xl origin-left overflow-hidden'
            : 'translate-x-0 scale-100 rounded-none'
          }
         `}
        onClick={() => isDrawerOpen && setIsDrawerOpen(false)}
      >
        {/* Responsive Container with Max Width */}
        <div className="w-full max-w-2xl mx-auto flex flex-col h-full">
          {/* Fixed Header - Full Width */}
          <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50 w-full">
            <div className="w-full">
              <div className="relative">
                {/* Normal Header Content */}
                <div className={`flex items-center justify-between px-3 sm:px-4 py-3 transition-all duration-300 ease-out ${isSearchOpen ? 'opacity-0' : 'opacity-100'
                  }`}>
                  {/* Left Section - Profile Picture & Zone Switcher */}
                  <div className="flex items-center gap-3">
                    {/* Enhanced Profile Picture with iOS-style border */}
                    <Link href="#" className="w-10 h-10 rounded-full overflow-hidden focus:outline-none focus:ring-0 transition-all duration-200 hover:scale-105 active:scale-95 flex-shrink-0">
                      <div className="relative">
                        <img
                          src="/logo.png"
                          alt="Profile"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                        {/* iOS-style subtle border */}
                        <div className="absolute inset-0 rounded-full border border-gray-200/50"></div>
                      </div>
                    </Link>

                    {/* Zone Switcher */}
                    {!zoneLoading && currentZone && <div data-tour="zone-switcher"><ZoneSwitcher /></div>}
                  </div>

                  {/* Right Section with iOS-style spacing */}
                  <div className="flex items-center space-x-1">
                    {/* iOS-style Search Button */}
                    <button
                      onClick={() => setIsSearchOpen((v) => !v)}
                      aria-label="Toggle search"
                      className="p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-0 focus:border-0 active:scale-95 hover:bg-gray-100/70 active:bg-gray-200/90"
                      style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                    >
                      <Search className="w-5 h-5 text-gray-600 transition-all duration-200" />
                    </button>

                    {/* Logo with subtle animation */}
                    <div className="flex items-center">
                      <div className="relative">
                        <img
                          src="/lmm.png"
                          alt="LoveWorld Logo"
                          className="w-10 h-10 object-contain transition-transform duration-200 hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        {/* Subtle glow effect */}
                        <div
                          className="absolute inset-0 w-10 h-10 rounded-full blur-sm -z-10"
                          style={{ backgroundColor: `${currentZone?.themeColor || '#8B5CF6'}10` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Header Search Overlay */}
                <div className={`absolute inset-0 bg-white/95 backdrop-blur-xl transition-all duration-300 ease-out ${isSearchOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
                  }`}>
                  <div className="flex items-center justify-between px-4 py-3 h-full">
                    {/* Search Input */}
                    <div className="flex-1 relative">
                      <input
                        ref={searchInputRef}
                        value={globalSearchQuery}
                        onChange={(e) => setGlobalSearchQuery(e.target.value)}
                        type="text"
                        placeholder="Search songs, lyrics, solfas, pages..."
                        inputMode="search"
                        aria-label="Search"
                        className="w-full text-lg bg-transparent px-0 py-3 text-gray-800 placeholder-gray-400 border-0 outline-none appearance-none shadow-none ring-0 focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none font-poppins-medium"
                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                      />

                      {/* iOS-style search underline */}
                      <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-300/40" />

                      {/* iOS-style active underline */}
                      <div
                        className="absolute left-0 bottom-0 h-0.5 w-full shadow-sm"
                        style={{
                          backgroundColor: currentZone?.themeColor || '#8B5CF6',
                          boxShadow: `0 0 8px ${currentZone?.themeColor || '#8B5CF6'}66`
                        }}
                      />
                    </div>

                    {/* Close Button */}
                    <button
                      onClick={() => setIsSearchOpen(false)}
                      aria-label="Close search"
                      className="p-2.5 rounded-full transition-all duration-200 focus:outline-none focus:ring-0 focus:border-0 active:scale-95 hover:bg-gray-100/70 active:bg-gray-200/90 ml-4"
                      style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                    >
                      <X className="w-6 h-6 text-gray-700 transition-all duration-200" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search Results Overlay */}
          {isSearchOpen && (
            <div className="fixed inset-0 z-30 bg-white/95 backdrop-blur-xl pt-20 overflow-y-auto scrollbar-hide" style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}>
              <div className="mx-auto max-w-2xl px-3 sm:px-4 py-4 pb-8">
                <div className="text-sm text-gray-500 mb-4">
                  {globalSearchQuery ? (
                    `${typedSearchResults.length} result${typedSearchResults.length !== 1 ? 's' : ''} for "${globalSearchQuery}"`
                  ) : (
                    'Start typing to search everything...'
                  )}
                </div>

                {typedSearchResults.length > 0 ? (
                  <div className="space-y-3">
                    {typedSearchResults.map((result) => {
                      const IconComponent = getIconComponent(result.icon || 'Search');
                      return (
                        <Link
                          key={result.id}
                          href={result.url}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setGlobalSearchQuery('');
                          }}
                          className="flex items-center p-4 bg-white/70 backdrop-blur-sm rounded-2xl border-0 hover:bg-white/90 transition-all duration-200 active:scale-[0.97] shadow-sm ring-1 ring-black/5"
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0"
                            style={{ backgroundColor: `${currentZone?.themeColor || '#8B5CF6'}20` }}
                          >
                            <IconComponent
                              className="w-5 h-5"
                              style={{ color: currentZone?.themeColor || '#8B5CF6' }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-gray-900 text-sm truncate transition-colors">
                              {result.title}
                            </h4>
                            {result.subtitle && (
                              <p
                                className="text-xs font-medium mt-0.5"
                                style={{ color: currentZone?.themeColor || '#8B5CF6' }}
                              >
                                {result.subtitle}
                              </p>
                            )}
                            {result.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {result.description}
                              </p>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                ) : globalSearchQuery ? (
                  <div className="text-center py-12">
                    <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-500 mb-2">No results found</h3>
                    <p className="text-sm text-gray-400">Try searching for songs, features, or events</p>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Scrollable Content Container */}
          <div className="flex-1 overflow-y-auto scrollbar-hide pt-16" style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}>
            <div className="px-3 sm:px-4 py-4 space-y-4 pb-24">

              {/* Hero Carousel */}
              <HeroCarousel />

              {/* Title Section */}
              <div className="text-left mb-4">
                <h1 className="text-1xl font-bold text-gray-800">LoveWorld Singers Rehearsal Hub Portal</h1>
              </div>

              {/* Features Grid */}
              <div className="pb-4">
                <div className="grid grid-cols-3 gap-2">
                  {features.map((feature, index) => {
                    const isPremiumFeature = feature.premium
                    let featureKey = 'audioLab'
                    if (feature.title === 'Rehearsals') featureKey = 'rehearsals'
                    if (feature.title === 'Submit Song') featureKey = 'customSongs'
                    if (feature.title === 'Analytics') featureKey = 'analytics'

                    const hasAccess = !isPremiumFeature || hasFeature(featureKey as any)
                    const isExternal = (feature as any).external

                    const handleClick = (e: React.MouseEvent) => {
                      if (feature.href === '#') {
                        e.preventDefault()
                        return
                      }

                      if (isPremiumFeature && !hasAccess) {
                        e.preventDefault()
                        router.push('/subscription')
                        return
                      }
                    }

                    const LinkComponent = isExternal ? 'a' : Link
                    const linkProps = isExternal
                      ? { href: feature.href, target: '_blank', rel: 'noopener noreferrer' }
                      : { href: feature.href }

                    const tooltip = getTooltip(feature.title)

                    return (
                      <Tooltip key={index} text={tooltip}>
                        <LinkComponent
                          {...linkProps}
                          onClick={handleClick}
                          className="group flex flex-col items-center p-3 bg-white/70 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 active:scale-[0.97] border-0 hover:bg-white/90 ring-1 ring-black/5"
                        >
                          <div className="relative mb-2">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 shadow-sm ${isPremiumFeature && !hasAccess
                              ? 'bg-gray-100 grayscale opacity-50'
                              : ''
                              }`}
                              style={
                                isPremiumFeature && !hasAccess
                                  ? {}
                                  : {
                                    background: `linear-gradient(to bottom right, ${currentZone?.themeColor || '#8B5CF6'}20, ${currentZone?.themeColor || '#8B5CF6'}40)`
                                  }
                              }
                            >
                              <feature.icon
                                className="w-4 h-4 transition-colors duration-300"
                                style={isPremiumFeature && !hasAccess ? { color: '#64748b' } : { color: currentZone?.themeColor || '#8B5CF6' }}
                              />
                            </div>
                            {feature.badge === true && hasUnreadNotifications && (
                              <div className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-2 h-2 border border-white"></div>
                            )}
                            {isPremiumFeature && !hasAccess && (
                              <div className="absolute -top-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
                                <Lock className="w-2.5 h-2.5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <span className={`text-[11px] font-medium text-center leading-tight transition-colors duration-300 ${isPremiumFeature && !hasAccess
                            ? 'text-gray-400'
                            : 'text-gray-800'
                            }`}>
                            {feature.title}
                          </span>
                        </LinkComponent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>

              {/* About Section */}
              <AboutSection />

              {/* FAQ Section */}
              <FAQSection />

            </div>
          </div>

        </div> {/* End Desktop Container */}
      </div> {/* End Apple-style animated container */}

      {/* Shared Drawer with Logout - Outside animated container */}
      <SharedDrawer
        open={isDrawerOpen}
        onClose={toggleDrawer}
        title="Menu"
        items={getMenuItems(handleLogout, handleRefresh, isCoordinator, isBoss, hiddenFeatures)}
      />

      {/* Celebration Overlay */}
      <CelebrationOverlay show={showCelebration} onClose={() => setShowCelebration(false)} />
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <CustomLoader message="" />
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
