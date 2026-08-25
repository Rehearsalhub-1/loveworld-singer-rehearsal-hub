"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';

interface CustomLoaderProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function CustomLoader({ message, size = 'lg', className = '' }: CustomLoaderProps) {
  if (size === 'sm') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (size === 'md') {
    return (
      <div className={`flex items-center justify-center gap-2 p-3 text-xs font-medium text-slate-400 ${className}`}>
        <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
        {message && <span>{message}</span>}
      </div>
    );
  }

  // Clean, non-intrusive connecting indicator for default / large sizes
  return (
    <div className={`flex items-center justify-center gap-2.5 p-6 text-xs font-medium text-slate-400 ${className}`}>
      <div className="relative flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-purple-500 animate-ping absolute opacity-75" />
        <div className="w-2 h-2 rounded-full bg-purple-600" />
      </div>
      <span>{message || 'Connecting...'}</span>
    </div>
  );
}
