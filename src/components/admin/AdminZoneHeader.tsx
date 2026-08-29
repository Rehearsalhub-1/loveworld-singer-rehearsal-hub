"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  Globe, MapPin, ChevronDown, Check, Search, Shield, Sparkles, 
  User, Bell, ArrowLeft, ChevronRight, LayoutDashboard, Building2, Church 
} from 'lucide-react';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { useAuth } from '@/stores/authStore';
import AdminScopeDisplay from '@/components/admin/AdminScopeDisplay';

interface AdminZoneHeaderProps {
  activeSection?: string;
}

export default function AdminZoneHeader({ activeSection = 'Dashboard' }: AdminZoneHeaderProps) {
  const { 
    selectedZoneId, 
    selectedZone, 
    isGlobalView, 
    setSelectedZoneId, 
    availableZones, 
    isHQAdmin, 
    zoneScopeLabel,
    selectedChurchId,
    selectedChurch,
    isChurchScope,
    setSelectedChurchId,
    userChurches,
  } = useAdminZone();
  const { profile, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredZones = availableZones.filter(z => 
    z.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (z.region && z.region.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredChurches = userChurches.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const firstName = profile?.firstName || profile?.first_name || (user?.email ? user.email.split('@')[0] : 'Admin');
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-3 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Enterprise Breadcrumbs & Active Title */}
      <div className="flex items-center gap-3">
        <Link
          href="/home"
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all border border-slate-200/60 active:scale-95"
          title="Return to Singer Hub"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Singer Hub</span>
        </Link>

        <div className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-slate-400">Admin</span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </div>

        <div className="flex items-center gap-2">
          <h1 className="text-base md:text-lg font-black text-slate-900 tracking-tight">
            {activeSection === 'Sub-Groups' ? 'Churches' : activeSection}
          </h1>
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
            isChurchScope 
              ? 'bg-amber-50 text-amber-800 border-amber-200/80'
              : isHQAdmin 
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200/60' 
                : 'bg-purple-50 text-purple-700 border-purple-200/60'
          }`}>
            {isChurchScope ? (
              <>
                <Building2 className="w-3 h-3 text-amber-600" />
                <span>Church Admin Scope</span>
              </>
            ) : isHQAdmin ? (
              'HQ Executive'
            ) : (
              'Zonal Portal'
            )}
          </span>
        </div>
      </div>

      {/* Right: Canonical Organization Switcher & Admin Profile */}
      <div className="flex items-center gap-2.5 md:gap-3">
        <AdminScopeDisplay />

        {/* User Badge */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200/80">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
            {initial}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-black text-slate-900 leading-tight truncate max-w-[110px]">{firstName}</p>
            <p className="text-[9px] text-purple-700 font-extrabold uppercase tracking-wider">{isHQAdmin ? 'HQ Admin' : 'Zone Admin'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
