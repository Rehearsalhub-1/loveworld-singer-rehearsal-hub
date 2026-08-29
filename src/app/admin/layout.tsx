"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AdminZoneProvider } from '@/contexts/AdminZoneContext';
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider';
import { PageLoader } from '@/components/PageLoader';
import { useAuth } from '@/stores/authStore';
import { useOrganizationStore } from '@/stores/organizationStore';
import CustomLoader from '@/components/CustomLoader';

const AdminSidebar = dynamic(() => import('@/components/admin/AdminSidebar'), { ssr: false });
const AdminZoneHeader = dynamic(() => import('@/components/admin/AdminZoneHeader'), { ssr: false });
const AdminMobileNav = dynamic(() => import('@/components/admin/AdminMobileNav'), { ssr: false });

function getSectionFromPath(pathname: string): string {
  if (pathname.startsWith('/admin/dashboard')) return 'Dashboard';
  if (pathname.startsWith('/admin/pages')) return 'Programs';
  if (pathname.startsWith('/admin/members')) return 'Members';
  if (pathname.startsWith('/admin/attendance')) return 'Attendance';
  if (pathname.startsWith('/admin/submitted-songs')) return 'Submitted Songs';
  if (pathname.startsWith('/admin/notifications')) return 'Notifications';
  if (pathname.startsWith('/admin/analytics')) return 'Analytics';
  if (pathname.startsWith('/admin/churches')) return 'Churches';
  if (pathname.startsWith('/admin/calendar')) return 'Calendar';
  if (pathname.startsWith('/admin/master-library')) return 'All Ministered';
  if (pathname.startsWith('/admin/media')) return 'Media';
  if (pathname.startsWith('/admin/support-chat')) return 'Support';
  if (pathname.startsWith('/admin/activity-logs')) return 'Activity Logs';
  if (pathname.startsWith('/admin/schedule')) return 'Schedule';
  if (pathname.startsWith('/admin/payments')) return 'Payments';
  if (pathname.startsWith('/admin/app-updates')) return 'App Updates';
  if (pathname.startsWith('/admin/geofence')) return 'Geofence Config';
  if (pathname.startsWith('/admin/organizations')) return 'Organizations';
  return 'Dashboard';
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, isLoading: authLoading } = useAuth();
  const { capabilities, isSuperAdmin } = useOrganizationStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const activeSection = getSectionFromPath(pathname || '');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/auth?redirect=/admin/dashboard');
      return;
    }
    if (hasCheckedAuth) return;

    const canAccess = Boolean(
      isSuperAdmin ||
      capabilities.canManagePlatform ||
      capabilities.canManageOrganization ||
      capabilities.canManageSubgroup ||
      profile?.role === 'super_admin' ||
      profile?.role === 'hq_admin' ||
      profile?.role === 'admin' ||
      profile?.role === 'boss' ||
      profile?.role === 'zone_admin' ||
      profile?.role === 'zone_coordinator' ||
      profile?.role === 'coordinator' ||
      profile?.role === 'subgroup_admin' ||
      profile?.role === 'subgroup_coordinator' ||
      profile?.role === 'church_coordinator' ||
      profile?.hasHqAccess ||
      (profile as any)?.has_hq_access
    );

    if (!canAccess) {
      router.push('/home');
      return;
    }
    setHasCheckedAuth(true);
  }, [user, profile, authLoading, capabilities, isSuperAdmin, hasCheckedAuth, router]);

  if (authLoading || (!hasCheckedAuth && !!user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <CustomLoader message="Loading Admin Console..." />
      </div>
    );
  }

  if (!user) return null;

  const handleSectionChange = (section: string) => {
    const routeMap: Record<string, string> = {
      'Dashboard': '/admin/dashboard',
      'Pages': '/admin/pages',
      'Programs': '/admin/pages',
      'Members': '/admin/members',
      'Attendance': '/admin/attendance',
      'Submitted Songs': '/admin/submitted-songs',
      'Notifications': '/admin/notifications',
      'Analytics': '/admin/analytics',
      'Churches': '/admin/churches',
      'Sub-Groups': '/admin/churches',
      'Calendar': '/admin/calendar',
      'Master Library': '/admin/master-library',
      'All Ministered': '/admin/master-library',
      'Media': '/admin/media',
      'Support Chat': '/admin/support-chat',
      'Support': '/admin/support-chat',
      'Activity Logs': '/admin/activity-logs',
      'Schedule Manager': '/admin/schedule',
      'Schedule': '/admin/schedule',
      'Payments': '/admin/payments',
      'App Updates': '/admin/app-updates',
      'Geofence Config': '/admin/geofence',
      'Organizations': '/admin/organizations',
      'Page Categories': '/admin/pages',
      'Categories': '/admin/pages',
      'Playback Mode': '/admin/pages',
      'Karaoke Config': '/admin/pages',
    };
    router.push(routeMap[section] ?? '/admin/dashboard');
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col lg:flex-row overflow-hidden font-sans">
      <AdminSidebar
        sidebarCollapsed={!sidebarOpen}
        setSidebarCollapsed={(collapsed) => setSidebarOpen(!collapsed)}
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        pendingSubGroupCount={0}
      />
      <div className="flex-1 flex flex-col overflow-hidden pb-24 lg:pb-0">
        <AdminZoneHeader activeSection={activeSection} />
        <main className="flex-1 overflow-hidden flex flex-col">
          {children}
        </main>
      </div>
      <AdminMobileNav
        activeSection={activeSection}
        setActiveSection={handleSectionChange}
        onMenuOpen={() => setSidebarOpen(true)}
      />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageLoader>
      <AdminZoneProvider>
        <AdminThemeProvider>
          <AdminShell>
            {children}
          </AdminShell>
        </AdminThemeProvider>
      </AdminZoneProvider>
    </PageLoader>
  );
}
