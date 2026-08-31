"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Music, Layers, Users, Bell,
  LogOut, ChevronLeft, Menu, X, Church
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api-client';
import { useSubGroup } from '@/hooks/useSubGroup';

const NAV_ITEMS = [
  { label: 'Dashboard',     href: '/church-admin',              icon: LayoutDashboard },
  { label: 'Songs',         href: '/church-admin/songs',        icon: Music },
  { label: 'Programs',      href: '/church-admin/programs',     icon: Layers },
  { label: 'Members',       href: '/church-admin/members',      icon: Users },
  { label: 'Notifications', href: '/church-admin/notifications',icon: Bell },
];

function ChurchAdminSidebar({
  open,
  onClose,
  churchName,
}: {
  open: boolean;
  onClose: () => void;
  churchName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout', {}); } catch { /* ignore */ }
    signOut?.();
    router.replace('/auth');
  };

  const isActive = (href: string) =>
    href === '/church-admin' ? pathname === '/church-admin' : pathname.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:translate-x-0 lg:flex lg:w-64`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <Church className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-900 truncate max-w-[140px]">{churchName || 'My Church'}</p>
              <p className="text-[10px] text-slate-400 font-semibold">Church Admin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 lg:hidden"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${active
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-slate-400'}`} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

export default function ChurchAdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { coordinatedSubGroups } = useSubGroup();

  const churchName = coordinatedSubGroups[0]?.name || 'My Church';

  const activeLabel =
    NAV_ITEMS.find(n =>
      n.href === '/church-admin'
        ? pathname === '/church-admin'
        : pathname.startsWith(n.href)
    )?.label ?? 'Dashboard';

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden font-sans">
      <ChurchAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        churchName={churchName}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-sm font-black text-slate-900">{activeLabel}</h1>
          <div className="flex-1" />
          <span className="text-xs text-slate-400 font-semibold hidden sm:block truncate max-w-[200px]">
            {churchName}
          </span>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
