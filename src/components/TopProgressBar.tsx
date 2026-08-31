"use client";

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useZoneStore } from '@/stores/zoneStore';

export default function TopProgressBar() {
  const authLoading = useAuthStore((s) => s.loading);
  const zoneLoading = useZoneStore((s) => s.isLoading);
  const isSyncing = authLoading || zoneLoading;

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSyncing) {
      // Delay showing the bar slightly to prevent flickering on fast requests (<150ms)
      timer = setTimeout(() => setVisible(true), 150);
    } else {
      setVisible(false);
    }
    return () => clearTimeout(timer);
  }, [isSyncing]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] h-[2.5px] bg-transparent overflow-hidden pointer-events-none">
      <div className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-violet-500 animate-progress origin-left w-full shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
      <style jsx>{`
        @keyframes progress {
          0% {
            transform: translateX(-100%) scaleX(0.2);
          }
          50% {
            transform: translateX(-10%) scaleX(0.7);
          }
          100% {
            transform: translateX(100%) scaleX(0.3);
          }
        }
        .animate-progress {
          animation: progress 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}
