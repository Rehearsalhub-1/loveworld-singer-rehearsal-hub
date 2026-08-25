"use client";

import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

export function BackendOfflineIndicator() {
  const { backendOffline } = useAuth();

  if (!backendOffline) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none transition-all duration-300">
      <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/90 text-slate-200 border border-slate-700/60 rounded-full shadow-lg backdrop-blur-md text-xs font-medium tracking-wide">
        <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
        <span>Connecting...</span>
      </div>
    </div>
  );
}
