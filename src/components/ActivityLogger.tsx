"use client";

import React, { useEffect } from 'react';
import { useZone } from '@/hooks/useZone';
import { apiClient } from '@/lib/api-client';

export function ActivityLogger({ children }: { children?: React.ReactNode }) {
  const { currentZone } = useZone();

  useEffect(() => {
    const handleToast = async (event: CustomEvent) => {
      const { message, type, zoneName, userName, action, section, itemName } = event.detail;
      
      if (!currentZone?.id) return;

      // Store any toast that has user/zone info
      if (userName || zoneName) {
        void apiClient.post('/activity-logs', {
          action: action || message || 'Admin action',
          category: section || type || 'general',
          userName,
          zoneId: currentZone.id,
          details: itemName ? `${message || ''} (${itemName})`.trim() : message || '',
        }).catch((error) => {
          console.error('[ActivityLogger] Failed to record activity:', error);
        });
      }
    };

    window.addEventListener('showToast', handleToast as unknown as EventListener);
    return () => window.removeEventListener('showToast', handleToast as unknown as EventListener);
  }, [currentZone]);

  return <>{children}</>;
}

export default ActivityLogger;
