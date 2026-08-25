"use client";

import React from 'react';
import {
  Home,
  FileText,
  Users,
  Bell,
  Menu,
} from "lucide-react";
import { useZone } from '@/hooks/useZone';

interface AdminMobileNavProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isRestrictedAdmin?: boolean;
  allowedSections?: string[] | null;
  onMenuOpen: () => void;
}

const AdminMobileNav = React.memo(({
  activeSection,
  setActiveSection,
  isRestrictedAdmin = false,
  allowedSections = null,
  onMenuOpen
}: AdminMobileNavProps) => {
  const { currentZone } = useZone();
  const themeColor = currentZone?.themeColor || '#9333EA';

  // Map sections to their nav item for highlighting
  const getSectionNavItem = (section: string): string => {
    switch (section) {
      case 'Dashboard':
      case 'Analytics':
        return 'Dashboard';
      case 'Pages':
      case 'Categories':
      case 'Page Categories':
      case 'Submitted Songs':
      case 'Master Library':
        return 'Pages';
      case 'Members':
      case 'Sub-Groups':
        return 'Members';
      case 'Notifications':
        return 'Notifications';
      case 'Schedule Manager':
      case 'Media':
      case 'Media Upload':
      case 'Calendar':
      case 'Activity Logs':
      case 'Support Chat':
      case 'Payments':
      case 'Playback Mode':
      case 'Karaoke Config':
      case 'Geofence Config':
        return 'More';
      default:
        return 'Dashboard';
    }
  };

  const currentNavItem = getSectionNavItem(activeSection);

  const navItems = [
    { icon: Home, label: 'Home', section: 'Dashboard' },
    { icon: FileText, label: 'Pages', section: 'Pages' },
    { icon: Users, label: 'Members', section: 'Members' },
    { icon: Bell, label: 'Alerts', section: 'Notifications' },
    { icon: Menu, label: 'More', section: 'menu' },
  ].filter(item => {
    if (isRestrictedAdmin) {
      if (item.section === 'menu') return true;
      if (allowedSections) {
        // Show the nav item if any of the allowed sections map to it
        return allowedSections.some(allowedSection => {
          const mappedNav = getSectionNavItem(allowedSection);
          return mappedNav === item.section || (mappedNav === 'More' && item.section === 'menu');
        });
      }
      return item.section === 'Pages';
    }
    return true;
  });

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[50] px-3 pb-[env(safe-area-inset-bottom,0px)]">
      {/* Floating pill container */}
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-[0_-2px_20px_rgba(0,0,0,0.08)] mb-1.5">
        <div className="flex items-center justify-around h-[60px] px-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.section === 'menu'
              ? currentNavItem === 'More'
              : currentNavItem === item.section;

            return (
              <button
                key={item.section}
                onClick={() => {
                  if (item.section === 'menu') {
                    onMenuOpen();
                  } else {
                    setActiveSection(item.section);
                  }
                }}
                className={`
                  relative flex flex-col items-center justify-center flex-1 h-full
                  transition-all duration-200 active:scale-90
                  ${isActive ? '' : 'opacity-50'}
                `}
              >
                {/* Active background pill */}
                {isActive && (
                  <div
                    className="absolute inset-x-2 inset-y-1.5 rounded-xl opacity-[0.08]"
                    style={{ backgroundColor: themeColor }}
                  />
                )}

                <Icon
                  className="w-[22px] h-[22px] relative z-10 transition-colors duration-200"
                  style={{ color: isActive ? themeColor : '#9CA3AF' }}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span
                  className="text-[10px] mt-0.5 font-semibold relative z-10 transition-colors duration-200"
                  style={{ color: isActive ? themeColor : '#9CA3AF' }}
                >
                  {item.label}
                </span>

                {/* Active indicator dot */}
                {isActive && (
                  <div
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{ backgroundColor: themeColor }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
});

export default AdminMobileNav;
