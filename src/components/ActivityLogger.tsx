"use client";

"use client";

import React, { useEffect } from 'react';
import { useZone } from '@/hooks/useZone';

export function ActivityLogger({ children }: { children?: React.ReactNode }) {
  const { currentZone } = useZone();

  useEffect(() => {
    const handleToast = async (event: CustomEvent) => {
      const { message, type, zoneName, userName, action, section, itemName } = event.detail;
      
      if (!currentZone?.id) return;

      // Store any toast that has user/zone info
      if (userName || zoneName) {
        console.warn('[migration] ActivityLogger.tsx: activity_logs write — no JWT API route yet');
        void message;
        void type;
        void action;
        void section;
        void itemName;
      }
    };

    window.addEventListener('showToast', handleToast as unknown as EventListener);
    return () => window.removeEventListener('showToast', handleToast as unknown as EventListener);
  }, [currentZone]);

  return <>{children}</>;
}

export default ActivityLogger;
