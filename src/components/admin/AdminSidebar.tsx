"use client";

import React from 'react';
import Link from 'next/link';
import {
  FileText,
  Users,
  Music,
  ChevronRight,
  Bell,
  BarChart3,
  MessageCircle,
  Upload,
  X,
  Library,
  Home,
  Calendar,
  Activity,
  DollarSign,
  List,
  Mic,
  CalendarCheck,
  Smartphone,
  MapPin,
  Building2,
} from "lucide-react";
import { useOrganizationStore } from '@/stores/organizationStore';

interface AdminSidebarProps {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  activeSection: string;
  setActiveSection: (section: string) => void;
  isHQAdmin?: boolean;
  isRestrictedAdmin?: boolean;
  allowedSections?: string[] | null;
  pendingSubGroupCount?: number;
}

const AdminSidebar = React.memo(({
  sidebarCollapsed,
  setSidebarCollapsed,
  activeSection,
  setActiveSection,
  isRestrictedAdmin = false,
  allowedSections = null,
  pendingSubGroupCount = 0
}: AdminSidebarProps) => {
  const { activeOrganization, capabilities, isSuperAdmin } = useOrganizationStore();

  const mainItems = [
    { icon: Home, label: 'Dashboard', active: activeSection === 'Dashboard' },
    { icon: Building2, label: 'Organizations', active: activeSection === 'Organizations', platformOnly: true },
    { icon: BarChart3, label: 'Analytics', active: activeSection === 'Analytics' },
    { icon: MessageCircle, label: 'Support', active: activeSection === 'Support Chat' || activeSection === 'Support' },
  ];

  const contentItems = [
    { icon: FileText, label: 'Programs', active: activeSection === 'Pages' || activeSection === 'Programs' },
    { icon: Library, label: 'All Ministered', active: activeSection === 'Master Library' || activeSection === 'All Ministered' },
    { icon: Upload, label: 'Submitted Songs', active: activeSection === 'Submitted Songs' },
    { icon: List, label: 'Schedule', active: activeSection === 'Schedule Manager' || activeSection === 'Schedule' },
  ];

  const managementItems = [
    { icon: Users, label: 'Members', active: activeSection === 'Members' },
    { icon: CalendarCheck, label: 'Attendance', active: activeSection === 'Attendance' },
    { icon: Building2, label: 'Churches', active: activeSection === 'Sub-Groups' || activeSection === 'Churches', badge: pendingSubGroupCount },
    { icon: Music, label: 'Media', active: activeSection === 'Media' },
    { icon: Mic, label: 'Playback Mode', active: activeSection === 'Playback Mode' || activeSection === 'Karaoke Config' },
    { icon: Calendar, label: 'Calendar', active: activeSection === 'Calendar' },
    { icon: Bell, label: 'Notifications', active: activeSection === 'Notifications' },
    { icon: DollarSign, label: 'Payments', active: activeSection === 'Payments' },
  ];

  const systemItems = [
    { icon: Activity, label: 'Activity Logs', active: activeSection === 'Activity Logs' },
    { icon: Smartphone, label: 'App Updates', active: activeSection === 'App Updates' },
    { icon: MapPin, label: 'Geofence Config', active: activeSection === 'Geofence Config' },
  ];

  const filterItems = (items: any[]) => items.filter(item => {
    if (item.platformOnly && !capabilities.canManagePlatform && !isSuperAdmin) return false;
    if (isRestrictedAdmin) {
      if (allowedSections) return allowedSections.includes(item.label);
      return item.label === 'Programs' || !item.restrictedAdminHidden;
    }
    return true;
  });

  const filteredMainItems = filterItems(mainItems);
  const filteredContentItems = filterItems(contentItems);
  const filteredManagementItems = filterItems(managementItems);
  const filteredSystemItems = filterItems(systemItems);

  const renderSectionLabel = (label: string) => (
    <div className="hidden lg:flex items-center gap-2 px-3 pt-5 pb-1.5">
      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );

  const renderNavItem = (item: any, index: number) => {
    const Icon = item.icon;
    const isActive = item.active;
    const hasBadge = !!item.badge && Number(item.badge) > 0;

    return (
      <button
        key={index}
        onClick={() => {
          setActiveSection(item.label);
          if (window.innerWidth < 1024) {
            setSidebarCollapsed(true);
          }
        }}
        className={`
          relative w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl
          transition-all duration-200 active:scale-[0.98] group font-semibold text-xs
          ${isActive
            ? 'bg-purple-600 text-white shadow-md shadow-purple-200'
            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }
        `}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
          !isActive ? 'group-hover:scale-110 text-slate-400 group-hover:text-slate-800' : 'text-white'
        }`} />

        <span className="truncate">{item.label}</span>

        {hasBadge && (
          <span className="ml-auto relative flex items-center justify-center">
            <span className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-40" />
            <span className="relative px-2 py-0.5 text-[9px] font-black bg-amber-400 text-amber-950 rounded-full">
              {item.badge}
            </span>
          </span>
        )}

        {isActive && !hasBadge && (
          <ChevronRight className="w-3.5 h-3.5 ml-auto text-white/70" />
        )}
      </button>
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-[65]"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar — permanently w-64 on desktop, slide-in on mobile */}
      <div className={`
        fixed lg:relative inset-y-0 right-0 lg:left-0 lg:right-auto z-[70] lg:z-auto
        w-[80%] max-w-[280px] lg:w-64 bg-white border-l lg:border-l-0 lg:border-r border-slate-200/80
        transform transition-all duration-300 ease-out
        ${sidebarCollapsed ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'}
        flex flex-col shadow-xs
      `}>
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <Link
              href="/home"
              className="flex items-center gap-3 hover:opacity-90 transition-opacity"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0 text-white">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">Admin Console</h1>
                <p className="text-[10px] font-bold text-indigo-600 truncate max-w-[130px] uppercase tracking-wider">
                  {activeOrganization?.name || 'Organization'}
                </p>
              </div>
            </Link>

            {/* Mobile close button */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-1">
            {renderSectionLabel('Overview')}
            {filteredMainItems.map(renderNavItem)}
          </div>

          <div className="space-y-1">
            {renderSectionLabel('Content')}
            {filteredContentItems.map(renderNavItem)}
          </div>

          <div className="space-y-1">
            {renderSectionLabel('People & Ops')}
            {filteredManagementItems.map(renderNavItem)}
          </div>

          {(capabilities.canManagePlatform || isSuperAdmin) && filteredSystemItems.length > 0 && (
            <div className="space-y-1">
              {renderSectionLabel('System')}
              {filteredSystemItems.map(renderNavItem)}
            </div>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100">
          {/* Mobile only: Back to Singer Portal */}
          <Link
            href="/home"
            className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            Back to Singer Portal
          </Link>
        </div>
      </div>
    </>
  );
});

export default AdminSidebar;
