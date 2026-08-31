"use client";

import React, { useState, useEffect } from 'react';
import { Music, Layers, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { useSubGroup } from '@/hooks/useSubGroup';
import CustomLoader from '@/components/CustomLoader';

interface Stats {
  memberCount: number;
  programCount: number;
  songCount: number;
}

export default function ChurchAdminDashboard() {
  const { coordinatedSubGroups, isLoading: sgLoading } = useSubGroup();
  const church = coordinatedSubGroups[0] ?? null;

  const [stats, setStats] = useState<Stats>({ memberCount: 0, programCount: 0, songCount: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!church?.id) return;
    (async () => {
      setLoading(true);
      try {
        const [membersRes, programsRes, songsRes] = await Promise.all([
          apiClient.get<any>(`/subgroups/${church.id}/members`).catch(() => ({ data: [] })),
          apiClient.get<any>(`/subgroups/praise-nights?subGroupId=${church.id}`).catch(() => ({ data: [] })),
          apiClient.get<any>(`/subgroups/songs?subGroupId=${church.id}`).catch(() => ({ data: [] })),
        ]);
        setStats({
          memberCount: Array.isArray(membersRes?.data) ? membersRes.data.length : 0,
          programCount: Array.isArray(programsRes?.data) ? programsRes.data.length : 0,
          songCount: Array.isArray(songsRes?.data) ? songsRes.data.length : 0,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [church?.id]);

  if (sgLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <CustomLoader message="Loading your church..." />
      </div>
    );
  }

  if (!church) {
    return (
      <div className="flex-1 flex items-center justify-center py-24 px-4">
        <div className="text-center">
          <p className="text-sm font-bold text-slate-600">No church assigned to your account.</p>
          <p className="text-xs text-slate-400 mt-1">Contact your zone admin to be assigned as a church coordinator.</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Songs',
      value: loading ? '—' : stats.songCount,
      icon: Music,
      color: 'emerald',
      href: '/church-admin/songs',
    },
    {
      label: 'Programs',
      value: loading ? '—' : stats.programCount,
      icon: Layers,
      color: 'teal',
      href: '/church-admin/programs',
    },
    {
      label: 'Members',
      value: loading ? '—' : stats.memberCount,
      icon: Users,
      color: 'cyan',
      href: '/church-admin/members',
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    teal:    'bg-teal-50 text-teal-600 border-teal-100',
    cyan:    'bg-cyan-50 text-cyan-600 border-cyan-100',
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Church name */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Your Church</p>
        <h2 className="text-xl font-black text-slate-900">{church.name}</h2>
        {church.zoneName && (
          <p className="text-xs text-slate-500 mt-1">{church.zoneName}</p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex items-center justify-between group hover:border-emerald-200 transition-all"
          >
            <div>
              <p className="text-xs font-bold text-slate-400">{label}</p>
              <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${colorMap[color]}`}>
              <Icon className="w-5 h-5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider px-5 py-3 border-b border-slate-100">
          Quick Actions
        </p>
        {[
          { label: 'Import songs from zone library', href: '/church-admin/songs?import=1' },
          { label: 'Create a new rehearsal program', href: '/church-admin/programs?create=1' },
          { label: 'Add a member',                   href: '/church-admin/members?add=1' },
          { label: 'Send a notification',             href: '/church-admin/notifications' },
        ].map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-all border-b border-slate-100 last:border-0 group"
          >
            <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">{label}</span>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500" />
          </Link>
        ))}
      </div>
    </div>
  );
}
