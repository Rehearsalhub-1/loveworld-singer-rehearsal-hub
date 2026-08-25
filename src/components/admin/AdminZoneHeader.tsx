"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Globe, MapPin, ChevronDown, Check, Search, Shield, Sparkles, User, Bell, ArrowLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { useAuth } from '@/stores/authStore';

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
    zoneScopeLabel 
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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200/60">
            {isHQAdmin ? 'HQ Executive' : 'Zonal Portal'}
          </span>
        </div>
      </div>

      {/* Right: Zone Switcher & Profile */}
      <div className="flex items-center gap-2.5 md:gap-3">
        {/* Zone Switcher (for HQ Admins) or Zone Badge */}
        {isHQAdmin ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200/90 text-slate-800 text-xs font-bold rounded-2xl transition-all active:scale-95 border border-slate-200 shadow-2xs"
            >
              {isGlobalView ? (
                <Globe className="w-4 h-4 text-purple-600 flex-shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 text-purple-600 flex-shrink-0" />
              )}
              <span className="max-w-[120px] md:max-w-[180px] truncate font-black">
                {isGlobalView ? 'Global HQ View' : selectedZone?.name}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-3xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl">
                {/* Search */}
                <div className="relative mb-2.5">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ministry zones..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs outline-hidden focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-semibold"
                    autoFocus
                  />
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                  {/* Global HQ Option */}
                  <button
                    onClick={() => {
                      setSelectedZoneId('all');
                      setIsOpen(false);
                    }}
                    className={`w-full p-2.5 rounded-2xl text-left flex items-center justify-between transition-colors ${
                      isGlobalView 
                        ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-xs shadow-2xs">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black">All Zones (Global HQ)</p>
                        <p className="text-[10px] text-slate-400 font-normal">Cross-zone aggregated overview</p>
                      </div>
                    </div>
                    {isGlobalView && <Check className="w-4 h-4 text-purple-600" />}
                  </button>

                  <div className="border-t border-slate-100 my-1 pt-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                      Individual Zones ({filteredZones.length})
                    </span>
                  </div>

                  {/* Filtered Zones */}
                  {filteredZones.map((zone) => {
                    const isSelected = selectedZoneId === zone.id;
                    return (
                      <button
                        key={zone.id}
                        onClick={() => {
                          setSelectedZoneId(zone.id);
                          setIsOpen(false);
                        }}
                        className={`w-full p-2 rounded-xl text-left flex items-center justify-between transition-colors ${
                          isSelected 
                            ? 'bg-purple-50 text-purple-900 font-bold border border-purple-200' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-7 h-7 rounded-xl text-white flex items-center justify-center text-[10px] font-black shadow-2xs"
                            style={{ backgroundColor: zone.themeColor || '#9333ea' }}
                          >
                            {zone.name.charAt(0)}
                          </div>
                          <div className="truncate max-w-[180px]">
                            <p className="text-xs font-bold text-slate-900 truncate">{zone.name}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-normal">{zone.region || 'Zonal Region'}</p>
                          </div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-slate-700 font-bold bg-slate-100 px-3.5 py-2 rounded-2xl border border-slate-200/80">
            <Shield className="w-3.5 h-3.5 text-purple-600" />
            <span className="max-w-[130px] truncate">{selectedZone?.name || 'Assigned Zone'}</span>
          </div>
        )}

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
