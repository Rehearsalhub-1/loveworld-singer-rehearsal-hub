"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { ChevronRight, Calendar, Users, Music, MapPin, Bell, Mic, Archive, Shield } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ScreenHeader } from '@/components/ScreenHeader'
import SharedDrawer from '@/components/SharedDrawer'
import { getMenuItems } from '@/config/menuItems'
import { useAuth } from '@/hooks/useAuth'
import { useSubGroup } from '@/hooks/useSubGroup'
import { handleAppRefresh } from '@/utils/refresh-utils'
import { useZone } from '@/hooks/useZone'
import { isHQGroup } from '@/config/zones'

export default function RehearsalsPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const router = useRouter()
  const { signOut, profile } = useAuth()
  const { currentZone, isZoneCoordinator, userRole } = useZone()
  const { isSubGroupCoordinator, memberSubGroups, coordinatedSubGroups } = useSubGroup()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleTitleClick = () => {
    router.push('/home')
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleRefresh = handleAppRefresh;

  // Carousel for rehearsal images
  const images = useMemo(() => [
    "/images/DSC_6155_scaled.jpg",
    "/images/DSC_6303_scaled.jpg",
    "/images/DSC_6446_scaled.jpg",
    "/images/DSC_6506_scaled.jpg",
    "/images/DSC_6516_scaled.jpg",
    "/images/DSC_6636_1_scaled.jpg",
    "/images/DSC_6638_scaled.jpg",
    "/images/DSC_6644_scaled.jpg",
    "/images/DSC_6658_1_scaled.jpg",
    "/images/DSC_6676_scaled.jpg"
  ], [])

  const scrollerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    const getStep = () => {
      const firstCard = el.querySelector<HTMLElement>("[data-card]")
      const gap = parseFloat(window.getComputedStyle(el).gap || "12")
      const width = firstCard?.offsetWidth || 280
      return width + gap
    }

    const auto = window.setInterval(() => {
      if (!el) return
      const step = getStep()
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" })
      } else {
        el.scrollBy({ left: step, behavior: "smooth" })
      }
    }, 1500)

    return () => {
      window.clearInterval(auto)
    }
  }, [])

  const menuItems = getMenuItems(handleLogout, handleRefresh)

  const rehearsalOptions = useMemo(() => {
    const hiddenFeatures = (profile as any)?.hidden_features || (profile as any)?.hiddenFeatures || {};

    const options = [
      ...(!hiddenFeatures.hideMinisteredSongs && !hiddenFeatures.hideAllMinistered ? [{
        id: 'all-ministered-songs',
        title: 'All Ministered Songs',
        description: 'Browse all songs from the Master Library',
        icon: Music,
        href: '/pages/all-ministered-songs',
        gradient: 'from-pink-600 via-rose-600 to-red-600',
        iconBg: 'bg-pink-100',
        iconColor: 'text-pink-600'
      }] : []),
      ...(!hiddenFeatures.hideOngoing ? [{
        id: 'ongoing-rehearsals',
        title: 'Ongoing Rehearsals',
        description: 'Join active rehearsal sessions',
        icon: Users,
        href: '/pages/praise-night?category=ongoing',
        gradient: 'from-purple-600 via-indigo-600 to-violet-600',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600'
      }] : []),
      ...(!hiddenFeatures.hideWarmups && !hiddenFeatures.hideVocalWarmups ? [{
        id: 'vocal-warmups',
        title: 'Vocal Warm-ups',
        description: 'Practice vocal exercises and breathing techniques',
        icon: Music,
        href: '/pages/vocal-warmups',
        gradient: 'from-purple-600 via-indigo-600 to-blue-600',
        iconBg: 'bg-purple-100',
        iconColor: 'text-purple-600'
      }] : []),
      ...(!hiddenFeatures.hidePreRehearsal ? [{
        id: 'pre-rehearsals',
        title: 'Pre-Rehearsals',
        description: 'Prepare for upcoming rehearsal sessions',
        icon: Calendar,
        href: '/pages/praise-night?category=pre-rehearsal',
        gradient: 'from-blue-600 via-cyan-600 to-teal-600',
        iconBg: 'bg-blue-100',
        iconColor: 'text-blue-600'
      }] : []),
      ...(!hiddenFeatures.hideArchives ? [{
        id: 'archive',
        title: 'Archives',
        description: 'Access complete and past rehearsal sessions',
        icon: Archive,
        href: '/pages/praise-night?category=archive',
        gradient: 'from-slate-600 via-gray-600 to-zinc-600',
        iconBg: 'bg-slate-100',
        iconColor: 'text-slate-600'
      }] : []),
      ...(!hiddenFeatures.hideSubgroups ? [{
        id: 'subgroups',
        title: 'Church',
        description: 'Access your church choir or fellowship rehearsal hub',
        icon: Users,
        href: '/pages/programs?category=church',
        gradient: 'from-orange-600 via-amber-600 to-yellow-600',
        iconBg: 'bg-orange-100',
        iconColor: 'text-orange-600'
      }] : []),
      ...(isSubGroupCoordinator ? [{
        id: 'subgroup-admin',
        title: 'Church Admin',
        description: 'Manage your church choir songs, members, and rehearsals',
        icon: Shield,
        href: coordinatedSubGroups[0]?.id ? `/admin?churchId=${encodeURIComponent(coordinatedSubGroups[0].id)}&section=Pages` : '/admin?scope=church&section=Pages',
        gradient: 'from-indigo-600 via-violet-600 to-purple-600',
        iconBg: 'bg-indigo-100',
        iconColor: 'text-indigo-600'
      }] : [])
    ];

    const isHQ = currentZone ? isHQGroup(currentZone.id) : false;

    return options.filter(option => {
      if (option.id === 'pre-rehearsals') {
        if (isHQ) return false;
        return isZoneCoordinator || profile?.can_access_pre_rehearsal === true;
      }
      
      if (option.id === 'archive') {
        const isSpecialZone = 
          currentZone?.id === 'zone-president' || 
          currentZone?.id === 'zone-president-2' ||
          currentZone?.id === 'zone-director' || 
          currentZone?.id === 'zone-oftp' ||
          currentZone?.id === 'zone-oftd' ||
          currentZone?.id === 'zone-sa-1' ||
          currentZone?.id === 'zone-sa-2' ||
          currentZone?.id === 'zone-sa-3' ||
          currentZone?.id === 'zone-sa-4' ||
          currentZone?.id === 'zone-sa-5';

        const isAdmin = 
          profile?.role === 'admin' || 
          profile?.role === 'boss' || 
          userRole === 'hq_admin' || 
          userRole === 'super_admin';

        const hasArchivePermission = Boolean(
          (profile as any)?.can_access_archive ||
          (profile as any)?.canSeeArchive ||
          (profile as any)?.has_hq_access
        );

        return isSpecialZone || isZoneCoordinator || isAdmin || hasArchivePermission;
      }
      
      return true;
    });
  }, [currentZone, isZoneCoordinator, profile, userRole, isSubGroupCoordinator, memberSubGroups]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50">
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Main Content with Apple-style reveal effect */}
      <div
        className={`
          h-full flex flex-col
          transition-all duration-300 ease-out
          ${isMenuOpen
            ? 'translate-x-72 scale-[0.88] rounded-2xl shadow-2xl origin-left overflow-hidden'
            : 'translate-x-0 scale-100 rounded-none'
          }
        `}
        onClick={() => isMenuOpen && setIsMenuOpen(false)}
      >
        <ScreenHeader
          title="Rehearsals"
          showMenuButton={true}
          onMenuClick={toggleMenu}
          rightImageSrc="/logo.png"
          onTitleClick={handleTitleClick}
          showBackButton={false}
        />

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="w-full max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20 content-bottom-safe">
            
            {/* Carousel Container */}
            <div className="mb-4">
              <div 
                ref={scrollerRef} 
                className="flex gap-2.5 overflow-x-auto snap-x snap-mandatory scrollbar-hide py-1"
              >
                {images.map((src, i) => (
                  <div 
                    key={src} 
                    data-card 
                    className="flex-shrink-0 w-56 sm:w-64 h-32 sm:h-36 rounded-xl overflow-hidden relative shadow-sm snap-start"
                  >
                    <Image 
                      src={src} 
                      alt={`Rehearsal ${i+1}`} 
                      fill 
                      className="object-cover" 
                      priority={i < 2}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Options List */}
            <div className="space-y-2.5">
              {rehearsalOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <Link
                    key={option.id}
                    href={option.href}
                    className="group block p-2.5 sm:p-3 bg-white rounded-2xl border border-gray-100/90 shadow-2xs hover:shadow-sm transition-all duration-200 active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${option.iconBg} ${option.iconColor} flex-shrink-0 transition-transform group-hover:scale-105`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm group-hover:text-purple-600 transition-colors">
                          {option.title}
                        </h3>
                        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5 font-normal">
                          {option.description}
                        </p>
                      </div>
                      <div className="w-6 h-6 rounded-full bg-slate-50 group-hover:bg-purple-50 flex items-center justify-center transition-colors flex-shrink-0">
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drawer */}
      <SharedDrawer
        open={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        items={menuItems}
      />
    </div>
  );
}