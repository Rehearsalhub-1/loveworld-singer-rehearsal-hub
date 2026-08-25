"use client";

import React, { createContext, useContext, ReactNode, useState } from 'react'

export type PermissionType = 'notification' | 'microphone';

interface PermissionContextType {
  permissions: {
    notification: 'granted' | 'denied' | 'prompt' | 'unknown'
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown'
  }
  requestPermission: (type: PermissionType) => Promise<boolean>
  needsPermission: (type: PermissionType) => boolean
}

const PermissionContext = createContext<PermissionContextType>({
  permissions: { notification: 'granted', microphone: 'granted' },
  requestPermission: async () => true,
  needsPermission: () => false,
});

export function PermissionProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<{
    notification: 'granted' | 'denied' | 'prompt' | 'unknown'
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown'
  }>({
    notification: typeof window !== 'undefined' && 'Notification' in window ? (Notification.permission as any) : 'prompt',
    microphone: 'prompt'
  });

  const requestPermission = async (type: PermissionType): Promise<boolean> => {
    if (type === 'notification' && typeof window !== 'undefined' && 'Notification' in window) {
      const res = await Notification.requestPermission();
      setPermissions(prev => ({ ...prev, notification: res as any }));
      return res === 'granted';
    }
    return true;
  };

  const needsPermission = (type: PermissionType) => {
    return permissions[type] !== 'granted';
  };

  return (
    <PermissionContext.Provider value={{ permissions, requestPermission, needsPermission }}>
      {children}
    </PermissionContext.Provider>
  );
}

export const usePermission = () => useContext(PermissionContext);
