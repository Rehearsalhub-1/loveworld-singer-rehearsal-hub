"use client";

import React from 'react';
import Members from '../Members';
import { useAdminTheme } from './AdminThemeProvider';

interface MembersSectionProps {
  // Add any props that Members needs
}

export default function MembersSection(props: MembersSectionProps) {
  const { theme } = useAdminTheme();
  
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto scroll-smooth">
      <div className="min-h-full flex flex-col">
        <Members />
      </div>
    </div>
  );
}
