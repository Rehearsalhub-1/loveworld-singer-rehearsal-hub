"use client";

import { useState, useEffect } from 'react';
import { Bell, BellOff, X, CheckCircle, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';

interface NotificationBannerProps {
  onDismiss?: () => void;
  showSettingsButton?: boolean;
}

export default function NotificationBanner({ onDismiss }: NotificationBannerProps) {
  const [permissionState, setPermissionState] = useState<'default' | 'granted' | 'denied' | 'unsupported'>('default');
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermissionState('unsupported');
      return;
    }

    const currentPerm = Notification.permission;
    setPermissionState(currentPerm);

    const dismissedKey = 'lmm_notif_banner_dismissed';
    const wasDismissed = sessionStorage.getItem(dismissedKey) === 'true';

    if (currentPerm === 'default' && !wasDismissed) {
      // Delay showing banner slightly so UI mounts smoothly
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    } else if (currentPerm === 'denied') {
      setIsVisible(false); // Don't annoy user if explicitly denied unless opened in settings
    }
  }, []);

  const handleRequestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermissionState(result);
      if (result === 'granted') {
        setIsVisible(false);
        // Show welcome test notification
        try {
          new Notification("Notifications Enabled 🎉", {
            body: "You will now receive instant updates on rehearsals, songs, and approvals.",
            icon: "/favicon.ico",
          });
        } catch {
          // Ignore desktop popup failure
        }
      } else {
        setIsVisible(false);
      }
    } catch (err) {
      console.error('[NotificationBanner] Permission error:', err);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem('lmm_notif_banner_dismissed', 'true');
    onDismiss?.();
  };

  if (!isVisible || permissionState === 'granted' || permissionState === 'unsupported') {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300 font-sans">
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-purple-100 flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 shrink-0">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-black text-slate-900 tracking-tight">Enable Live Alerts</h4>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
            Get instant alerts when songs are uploaded, church requests are approved, or rehearsal starts.
          </p>

          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleRequestPermission}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Allow Notifications</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-bold transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
