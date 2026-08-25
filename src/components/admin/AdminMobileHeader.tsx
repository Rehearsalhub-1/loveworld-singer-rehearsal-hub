"use client";

import React from 'react';
import { Search, ChevronRight } from "lucide-react";
import { useZone } from '@/hooks/useZone';
import { useAuth } from '@/hooks/useAuth';

interface AdminMobileHeaderProps {
  title: string;
  subtitle?: string;
  showSearch?: boolean;
  onSearch?: () => void;
  rightAction?: React.ReactNode;
  showZoneBadge?: boolean;
  parentSection?: string;
  onParentClick?: () => void;
}

const AdminMobileHeader = React.memo(({
  title,
  subtitle,
  showSearch = false,
  onSearch,
  rightAction,
  showZoneBadge = false,
  parentSection,
  onParentClick
}: AdminMobileHeaderProps) => {
  const { currentZone } = useZone();
  const { profile } = useAuth();

  const firstName = profile?.first_name || profile?.display_name?.split(' ')[0] || '';
  const initial = firstName?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div className="lg:hidden sticky top-0 z-[40] bg-white/95 backdrop-blur-md border-b border-slate-100/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-4 h-14 flex items-center gap-3">
        {/* Title Section */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          {parentSection && onParentClick ? (
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={onParentClick}
                className="text-sm font-medium truncate hover:underline transition-colors"
                style={{ color: currentZone?.themeColor || '#9333EA' }}
              >
                {parentSection}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" />
              <span className="text-base font-semibold text-slate-900 truncate">
                {title}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg font-bold text-slate-900 truncate tracking-tight">
                {title}
              </h1>
              {currentZone && showZoneBadge && (
                <span
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: currentZone?.themeColor || '#9333EA' }}
                />
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5">
          {showSearch && (
            <button
              onClick={onSearch}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors active:scale-95"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-slate-500" />
            </button>
          )}
          {rightAction}

          {/* User Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm"
            style={{ backgroundColor: currentZone?.themeColor || '#9333EA' }}
          >
            {initial}
          </div>
        </div>
      </div>
    </div>
  );
});

export default AdminMobileHeader;
