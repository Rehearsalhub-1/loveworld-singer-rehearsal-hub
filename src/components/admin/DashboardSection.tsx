"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useZone } from '@/hooks/useZone';
import { useAuth } from '@/stores/authStore';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { adminApi as apiClient } from '@/lib/admin-api';
import {
  Users, Crown, Music, Calendar, TrendingUp,
  Link as LinkIcon, Copy, CheckCircle, CreditCard,
  Shield, BarChart3, Upload, QrCode, Sparkles,
  ArrowRight, Clock, FileText, List, RefreshCw, Globe, MapPin,
  Check, Plus, ChevronRight, Search, Play, Radio, AlertCircle
} from 'lucide-react';
import { useAdminTheme } from './AdminThemeProvider';

// Number Counter with smooth cubic easing
function AnimatedCounter({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const start = ref.current;
    const diff = value - start;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(step);
      else ref.current = value;
    };

    requestAnimationFrame(step);
  }, [value, duration]);

  return <>{display.toLocaleString()}</>;
}

// Safe Program Date Formatter
function formatProgramDate(prog: any): string {
  if (!prog) return 'Scheduled';
  const rawDate = prog.date;
  if (!rawDate) {
    if (prog.location) return prog.location;
    return 'Scheduled';
  }

  // If already contains alphabetic month names like "June 2026", "Christmas Eve Dec 2025"
  if (typeof rawDate === 'string') {
    const trimmed = rawDate.trim();
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime()) && /^\d{4}/.test(trimmed)) {
      return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return trimmed;
  }

  if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
    return rawDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return 'Scheduled';
}

interface DashboardSectionProps {
  onSectionChange?: (section: string) => void;
}

export default function DashboardSection({ onSectionChange }: DashboardSectionProps = {}) {
  const { currentZone } = useZone();
  const { profile } = useAuth();
  const { isPremiumTier } = useSubscription();
  const { theme } = useAdminTheme();
  const { selectedZoneId, selectedZone, isGlobalView, isHQAdmin, zoneScopeLabel } = useAdminZone();

  const [members, setMembers] = useState<any[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [totalSongs, setTotalSongs] = useState(0);
  const [totalPraiseNights, setTotalPraiseNights] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [recentPrograms, setRecentPrograms] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch directory members scoped by zone
      const directoryQuery = isGlobalView
        ? '/profiles/directory'
        : `/profiles/directory?zone_code=${selectedZone?.invitationCode || selectedZoneId}`;
      const dirRes = await apiClient.get<{ success: boolean; data: any[] }>(directoryQuery).catch(() => null);
      if (dirRes?.success !== false && Array.isArray(dirRes?.data)) {
        setMembers(dirRes.data);
      }

      // 2. Fetch programs
      const progQuery = isGlobalView ? '/programs' : `/programs?zoneId=${selectedZoneId}`;
      const progRes = await apiClient.get<{ success: boolean; data: any[] }>(progQuery).catch(() => null);
      if (progRes?.success !== false && Array.isArray(progRes?.data)) {
        setTotalPraiseNights(progRes.data.length);
        setRecentPrograms(progRes.data.slice(0, 6));
      }

      // 3. Fetch pending song submissions
      const subQuery = isGlobalView ? '/submitted-songs' : `/submitted-songs?zoneId=${selectedZoneId}`;
      const subRes = await apiClient.get<{ success: boolean; data: any[] }>(subQuery).catch(() => null);
      if (subRes?.success !== false && Array.isArray(subRes?.data)) {
        const pending = subRes.data.filter((s: any) => s.status === 'pending' || !s.status);
        setPendingSubmissions(pending.length);
      }

      // 4. Fetch songs count (both program repertoire & master library)
      const songsQuery = isGlobalView ? '/songs/praise-night' : `/songs/praise-night?zoneId=${selectedZoneId}`;
      const [pnSongsRes, masterSongsRes] = await Promise.all([
        apiClient.get<{ success: boolean; data: any[] }>(songsQuery).catch(() => null),
        apiClient.get<{ success: boolean; data: any[] }>('/songs/master').catch(() => null),
      ]);
      const pnCount = Array.isArray(pnSongsRes?.data) ? pnSongsRes.data.length : null;
      const masterCount = Array.isArray(masterSongsRes?.data) ? masterSongsRes.data.length : null;
      if (pnCount !== null || masterCount !== null) {
        setTotalSongs((pnCount || 0) + (masterCount || 0));
      }

      // Set invite link
      const code = selectedZone?.invitationCode || currentZone?.invitationCode || '';
      setInviteLink(code ? `https://singers.loveworld.org/pages/join-zone?code=${code}` : '');

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isGlobalView, selectedZoneId, selectedZone, currentZone]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const copyInviteLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered members for the widget search
  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members.slice(0, 6);
    const q = memberSearch.toLowerCase();
    return members.filter((m: any) => {
      const name = `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.toLowerCase();
      const email = String(m.email || '').toLowerCase();
      const des = String(m.designation || m.role || '').toLowerCase();
      return name.includes(q) || email.includes(q) || des.includes(q);
    }).slice(0, 6);
  }, [members, memberSearch]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 md:p-6 lg:p-8 space-y-6">
      
      {/* 1. Sleek Dashboard Action Toolbar */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-600">
            {isGlobalView 
              ? 'Aggregated Global HQ Metrics'
              : `${selectedZone?.name || 'Current Zone'} Live Metrics`}
          </span>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 border border-slate-200/80 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {inviteLink && (
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-purple-50 text-purple-700 text-xs font-bold rounded-xl transition-all active:scale-95 border border-purple-200 shadow-2xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-purple-600" />}
              <span>{copiedLink ? 'Copied Link' : 'Join Link'}</span>
            </button>
          )}

          <button
            onClick={() => onSectionChange?.('Pages')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-xs shadow-purple-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Program</span>
          </button>
        </div>
      </div>

      {/* 2. Executive KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        
        {/* KPI 1: Members */}
        <div 
          onClick={() => onSectionChange?.('Members')}
          className="group relative overflow-hidden bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50/90 text-indigo-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Directory
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              <AnimatedCounter value={members.length} />
            </p>
            <p className="text-xs font-bold text-slate-600">
              {isGlobalView ? 'Total Global Members' : 'Zone Members'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Registered singers & coordinators
            </p>
          </div>
        </div>

        {/* KPI 2: Praise Nights / Programs */}
        <div 
          onClick={() => onSectionChange?.('Pages')}
          className="group relative overflow-hidden bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50/90 text-purple-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-purple-600 bg-purple-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Programs
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              <AnimatedCounter value={totalPraiseNights} />
            </p>
            <p className="text-xs font-bold text-slate-600">
              {isGlobalView ? 'All Praise Nights' : 'Zone Programs'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Active, upcoming & archived
            </p>
          </div>
        </div>

        {/* KPI 3: Repertoire & Catalog Songs */}
        <div 
          onClick={() => onSectionChange?.('Master Library')}
          className="group relative overflow-hidden bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50/90 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Music className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-amber-600 bg-amber-50/80 px-2 py-0.5 rounded-full uppercase tracking-wider">
              Repertoire
            </span>
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              <AnimatedCounter value={totalSongs} />
            </p>
            <p className="text-xs font-bold text-slate-600">
              {isGlobalView ? 'Master Repertoire' : 'Zone Songs'}
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Vocal parts, scores & lyrics
            </p>
          </div>
        </div>

        {/* KPI 4: Pending Song Submissions */}
        <div 
          onClick={() => onSectionChange?.('Submitted Songs')}
          className="group relative overflow-hidden bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50/90 text-rose-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all duration-300 shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            {pendingSubmissions > 0 ? (
              <span className="text-[10px] bg-rose-500 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                Action Required
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Up to date
              </span>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-3xl font-black text-slate-900 tracking-tight">
              <AnimatedCounter value={pendingSubmissions} />
            </p>
            <p className="text-xs font-bold text-slate-600">
              Pending Submissions
            </p>
            <p className="text-[11px] text-slate-400 font-medium">
              Submitted for approval & review
            </p>
          </div>
        </div>

      </div>

      {/* 3. Quick Action Launchpad */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/70 shadow-xs">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-purple-600" />
            Quick Admin Actions
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">Frequent workflows</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => onSectionChange?.('Pages')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-purple-50/70 border border-slate-200/60 hover:border-purple-200 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Programs</p>
              <p className="text-[10px] text-slate-400 truncate">Manage events</p>
            </div>
          </button>

          <button
            onClick={() => onSectionChange?.('Submitted Songs')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-rose-50/70 border border-slate-200/60 hover:border-rose-200 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Submissions</p>
              <p className="text-[10px] text-slate-400 truncate">{pendingSubmissions} pending</p>
            </div>
          </button>

          <button
            onClick={() => onSectionChange?.('Master Library')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/60 hover:border-amber-200 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Music className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Repertoire</p>
              <p className="text-[10px] text-slate-400 truncate">Song catalog</p>
            </div>
          </button>

          <button
            onClick={() => onSectionChange?.('Members')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/70 border border-slate-200/60 hover:border-indigo-200 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Singers</p>
              <p className="text-[10px] text-slate-400 truncate">View roster</p>
            </div>
          </button>

          <button
            onClick={() => onSectionChange?.('Analytics')}
            className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50/70 border border-slate-200/60 hover:border-emerald-200 text-left transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">Analytics</p>
              <p className="text-[10px] text-slate-400 truncate">Insights & stats</p>
            </div>
          </button>
        </div>
      </div>

      {/* 4. Main Two-Column Layout: Programs & Members */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column 1 & 2: Recent Programs & Rehearsals */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-black text-slate-900">Recent Programs & Rehearsals</h3>
              <p className="text-xs text-slate-400">Latest active events in current scope</p>
            </div>
            <button
              onClick={() => onSectionChange?.('Pages')}
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1 bg-purple-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPrograms.length > 0 ? (
            <div className="space-y-3 flex-1">
              {recentPrograms.map((prog, idx) => {
                const dateDisplay = formatProgramDate(prog);
                const isActive = Boolean(prog.is_active || prog.isActive);
                return (
                  <div 
                    key={prog.id || idx}
                    onClick={() => onSectionChange?.('Pages')}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-purple-50/50 hover:border-purple-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white font-black flex items-center justify-center text-xs flex-shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                        {prog.name ? prog.name.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                          {prog.name || 'Praise Night / Rehearsal'}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400 font-medium">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {dateDisplay}
                          </span>
                          {prog.category && (
                            <span>• Category: <strong className="text-slate-600">{prog.category}</strong></span>
                          )}
                          {prog.location && (
                            <span className="hidden sm:inline">• {prog.location}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-2xs ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}>
                        {isActive ? 'Active' : 'Archived'}
                      </span>
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-16 text-center flex flex-col items-center justify-center flex-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">No programs found</p>
              <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                Create a new program or rehearsal schedule from the Programs section
              </p>
              <button
                onClick={() => onSectionChange?.('Pages')}
                className="mt-3.5 px-3.5 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors"
              >
                Create Program
              </button>
            </div>
          )}
        </div>

        {/* Column 3: Quick Member Directory Widget */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/70 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-black text-slate-900">Member Directory</h3>
              <p className="text-xs text-slate-400">{members.length} total registered</p>
            </div>
            <button
              onClick={() => onSectionChange?.('Members')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
            >
              All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative mb-3.5">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search singers..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="flex-1 space-y-2.5">
            {filteredMembers.map((m, idx) => {
              const name = `${m.first_name || m.firstName || ''} ${m.last_name || m.lastName || ''}`.trim() || m.display_name || 'Member';
              const roleDisplay = m.designation || m.role || 'Singer';
              const isHqRole = m.administration === 'hq_admin' || m.role === 'hq_admin';
              return (
                <div
                  key={m.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-2xs">
                      {name.charAt(0)}
                    </div>
                    <div className="min-w-0 truncate">
                      <p className="text-xs font-bold text-slate-900 truncate">{name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{roleDisplay}</p>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex-shrink-0 ${
                    isHqRole
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-indigo-50 text-indigo-600'
                  }`}>
                    {isHqRole ? 'HQ Admin' : 'Active'}
                  </span>
                </div>
              );
            })}

            {filteredMembers.length === 0 && (
              <div className="py-12 text-center">
                <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">No singers found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Try searching with a different name</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
