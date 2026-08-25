"use client";

import React, { useEffect, useState } from 'react';
import { CheckCircle, Info, AlertTriangle, XCircle, X } from 'lucide-react';
import { useZone } from '@/hooks/useZone';
import { isHQGroup } from '@/config/zones';

interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  timestamp: number;
  zoneName?: string;
  userName?: string;
  action?: string;
  songTitle?: string;
}

export default function RealtimeNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { currentZone } = useZone();
  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;

  useEffect(() => {
    const handleToast = (event: CustomEvent) => {
      const { message, type, zoneName, userName, action, songTitle } = event.detail;
      
      
      // Zone filtering logic
      if (zoneName) {
        // This is an activity notification
        if (isHQ) {
          // HQ sees all activity notifications
          showNotification(message, type, zoneName, userName, action, songTitle);
        } else if (currentZone && zoneName === currentZone.name) {
          // Regular zones only see their own activity notifications
          showNotification(message, type, zoneName, userName, action, songTitle);
        } else {
          // TEMPORARY: Show all notifications for debugging
          showNotification(message, type, zoneName, userName, action, songTitle);
        }
      } else {
        // Regular toast notifications - everyone sees these
        showNotification(message, type);
      }
    };

    const showNotification = (message: string, type: string, zoneName?: string, userName?: string, action?: string, songTitle?: string) => {
      const notification: Notification = {
        id: `${Date.now()}-${Math.random()}`,
        message,
        type: type as any,
        timestamp: Date.now(),
        zoneName,
        userName,
        action,
        songTitle
      };

      setNotifications(prev => [...prev, notification]);

      // Auto-remove after 5 seconds
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, 5000);
    };

    window.addEventListener('showToast', handleToast as unknown as EventListener);
    return () => {
      window.removeEventListener('showToast', handleToast as unknown as EventListener);
    };
  }, [currentZone, isHQ]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColors = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-center gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm animate-in slide-in-from-right-full duration-300 min-w-[300px] max-w-[400px] ${getColors(notification.type)}`}
        >
          {getIcon(notification.type)}
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
            {(notification.zoneName || notification.userName) && (
              <p className="text-xs opacity-70 mt-1">
                {notification.userName && <span>{notification.userName}</span>}
                {notification.userName && notification.zoneName && <span> • </span>}
                {notification.zoneName && <span>{notification.zoneName}</span>}
                <span> • </span>
                {new Date(notification.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="p-1 hover:bg-black/10 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
