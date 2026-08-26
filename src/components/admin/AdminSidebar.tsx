"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Tag,
  Users,
  Music,
  Bot,
  ChevronRight,
  Bell,
  BarChart3,
  MessageCircle,
  FolderOpen,
  Upload,
  X,
  Library,
  User,
  Home,
  ChevronLeft,
  Calendar,
  Activity,
  DollarSign,
  List,
  Mic,
  CalendarCheck,
  Smartphone,
  MapPin,
} from "lucide-react";
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';

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
  isHQAdmin = false,
  isRestrictedAdmin = false,
  allowedSections = null,
  pendingSubGroupCount = 0
}: AdminSidebarProps) => {
  const router = useRouter();
  const { currentZone } = useZone();

  const themeColor = currentZone?.themeColor || '#9333ea';
  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;
  const isZoneCoordinator = currentZone && !isHQ && !isHQAdmin;

  // Group sidebar items by category
  const mainItems = [
    { icon: Home, label: 'Dashboard', active: activeSection === 'Dashboard' },
    { icon: BarChart3, label: 'Analytics', active: activeSection === 'Analytics', hqZoneOnly: true },
    { icon: MessageCircle, label: 'Support Chat', active: activeSection === 'Support Chat', hqOnly: true, restrictedAdminHidden: true },
  ];

  const contentItems = [
    { icon: FileText, label: 'Pages', active: activeSection === 'Pages' },
    { icon: Tag, label: 'Categories', active: activeSection === 'Categories' },
    { icon: FolderOpen, label: 'Page Categories', active: activeSection === 'Page Categories' },
    { icon: Library, label: 'Master Library', active: activeSection === 'Master Library', hqOnly: true },
    { icon: Upload, label: 'Submitted Songs', active: activeSection === 'Submitted Songs' },
    { icon: List, label: 'Schedule Manager', active: activeSection === 'Schedule Manager' },
  ];

  const managementItems = [
    { icon: Users, label: 'Members', active: activeSection === 'Members' },
    { icon: CalendarCheck, label: 'Attendance', active: activeSection === 'Attendance' },
    { icon: User, label: 'Churches', active: activeSection === 'Churches' || activeSection === 'Sub-Groups', badge: pendingSubGroupCount },
    { icon: Music, label: 'Media', active: activeSection === 'Media' },
    { icon: Mic, label: 'Playback Mode', active: activeSection === 'Playback Mode' || activeSection === 'Karaoke Config', hqOnly: true },
    { icon: Calendar, label: 'Calendar', active: activeSection === 'Calendar', hqOnly: true },
    { icon: Bell, label: 'Notifications', active: activeSection === 'Notifications', hqOnly: true },
    { icon: DollarSign, label: 'Payments', active: activeSection === 'Payments', hqOnly: true },
    { icon: Activity, label: 'Activity Logs', active: activeSection === 'Activity Logs', hqOnly: true },
    { icon: Smartphone, label: 'App Updates', active: activeSection === 'App Updates', hqOnly: true },
    { icon: MapPin, label: 'Geofence Config', active: activeSection === 'Geofence Config' },
  ];

  // Filter items based on role
  const filterItems = (items: any[]) => items.filter(item => {
    if (isRestrictedAdmin) {
      if (allowedSections) {
        return allowedSections.includes(item.label);
      }
      return item.label === 'Pages' || !item.restrictedAdminHidden;
    }
    if (item.hqOnly && !isHQAdmin) return false;
    if (item.hqZoneOnly && !isHQ) return false;
    if (item.zoneOnly && !isZoneCoordinator) return false;
    return true;
  });

  const filteredMainItems = filterItems(mainItems);
  const filteredContentItems = filterItems(contentItems);
  const filteredManagementItems = filterItems(managementItems);

  const renderSectionLabel = (label: string) => {
    if (sidebarCollapsed) {
      return <div className="hidden lg:block h-px bg-slate-100 my-2 mx-3" />;
    }
    return (
      <div className="hidden lg:flex items-center gap-2 px-3 pt-5 pb-1.5">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-outfit">
          {label}
        </span>
        <div className="flex-1 h-px bg-slate-100" />
      </div>
    );
  };

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
          ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
        `}
        title={sidebarCollapsed ? item.label : undefined}
      >
        <Icon className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${
          !isActive ? 'group-hover:scale-110 text-slate-400 group-hover:text-slate-800' : 'text-white'
        }`} />

        <span className={`truncate ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
          {item.label}
        </span>

        {/* Badge */}
        {hasBadge && !sidebarCollapsed && (
          <span className="ml-auto relative flex items-center justify-center">
            <span className="absolute inset-0 bg-amber-400 rounded-full animate-ping opacity-40" />
            <span className="relative px-2 py-0.5 text-[9px] font-black bg-amber-400 text-amber-950 rounded-full">
              {item.badge}
            </span>
          </span>
        )}
        {hasBadge && sidebarCollapsed && (
          <span className="hidden lg:flex absolute top-1 right-1">
            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
          </span>
        )}

        {isActive && !hasBadge && !sidebarCollapsed && (
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

      {/* Sidebar */}
      <div className={`
        fixed lg:relative inset-y-0 right-0 lg:left-0 lg:right-auto z-[70] lg:z-auto
        w-[80%] max-w-[280px] bg-white border-l lg:border-l-0 lg:border-r border-slate-200/80
        transform transition-all duration-300 ease-out
        ${sidebarCollapsed ? 'translate-x-full lg:translate-x-0 lg:w-[72px]' : 'translate-x-0 lg:w-64'}
        flex flex-col shadow-xs
      `}>
        {/* Header */}
        <div className={`p-4 border-b border-slate-100 ${sidebarCollapsed ? 'lg:px-3' : 'lg:p-4'}`}>
          <div className="flex items-center justify-between">
            {/* Logo & Brand */}
            <Link
              href="/home"
              className={`flex items-center gap-3 hover:opacity-90 transition-opacity ${sidebarCollapsed ? 'lg:justify-center lg:w-full' : ''}`}
            >
              <div
                className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-200 flex-shrink-0 text-white"
              >
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="w-6 h-6 object-contain"
                />
              </div>
              <div className={`${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">Admin Console</h1>
                <p className="text-[10px] font-bold text-indigo-600 truncate max-w-[130px] uppercase tracking-wider">{currentZone?.name || 'HQ Ministry'}</p>
              </div>
            </Link>

            {/* Mobile close */}
            <button
              onClick={() => setSidebarCollapsed(true)}
              className="lg:hidden p-2 text-slate-400 hover:bg-slate-100 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto custom-scrollbar">
          {/* Main Section */}
          <div className="space-y-1">
            {renderSectionLabel('Overview')}
            {filteredMainItems.map(renderNavItem)}
          </div>

          {/* Content Section */}
          <div className="space-y-1">
            {renderSectionLabel('Repertoire & Sets')}
            {filteredContentItems.map(renderNavItem)}
          </div>

          {/* Management Section */}
          <div className="space-y-1">
            {renderSectionLabel('Management & Access')}
            {filteredManagementItems.map(renderNavItem)}
          </div>
        </nav>

        {/* Footer Toggle */}
        <div className={`p-3 border-t border-slate-100 ${sidebarCollapsed ? 'lg:p-2' : ''}`}>
          {/* Mobile: Back to Home */}
          <Link
            href="/home"
            className="lg:hidden w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-xs hover:bg-slate-200 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            Back to Singer Portal
          </Link>

          {/* Desktop: Collapse toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={`hidden lg:flex w-full items-center gap-2 px-3 py-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
            {!sidebarCollapsed && <span className="text-xs font-bold text-slate-500">Collapse View</span>}
          </button>
        </div>
      </div>
    </>
  );
});

export default AdminSidebar;
