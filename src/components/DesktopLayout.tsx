"use client";

import React from 'react';
import SharedDrawer from './SharedDrawer';
import { getMenuItems } from '@/config/menuItems';

interface DesktopLayoutProps {
  children: React.ReactNode;
  rightPanel?: React.ReactNode;
  rightPanelTitle?: string;
  showRightPanel?: boolean;
}

export default function DesktopLayout({ 
  children, 
  rightPanel, 
  rightPanelTitle = "Details",
  showRightPanel = false 
}: DesktopLayoutProps) {
  const menuItems = getMenuItems();

  return (
    <>
      <style>{`
        /* Desktop layout - Fixed sidebar with main content and optional right panel */
        @media (min-width: 1024px) {
          .desktop-main-content {
            margin-left: 320px; /* 320px for fixed sidebar (w-80 = 320px) */
            margin-right: ${showRightPanel ? '480px' : '0px'}; /* 480px for right panel when shown */
            min-height: 100vh;
            background: linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%);
            width: calc(100% - ${showRightPanel ? '800px' : '320px'}); /* Account for sidebar and optional right panel */
          }
          
          /* Hide mobile content on desktop */
          .lg\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      {/* Fixed Desktop Drawer */}
      <SharedDrawer 
        open={false} 
        onClose={() => {}} 
        title="Menu" 
        items={menuItems} 
        customSections={[]} 
        fixedOnDesktop={true} 
      />

      {/* Main Content Area */}
      <div className="lg:min-h-screen">
        <div className="desktop-main-content">
          {children}
        </div>
      </div>

      {/* Right Panel - Only show when needed */}
      {showRightPanel && rightPanel && (
        <div className="hidden lg:block fixed right-0 top-0 w-[480px] min-w-[480px] h-full z-40 pl-4">
          {rightPanel}
        </div>
      )}
    </>
  );
}

