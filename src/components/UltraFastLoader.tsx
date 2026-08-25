"use client";

import { useEffect, useState } from 'react';

export default function UltraFastLoader() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Hide loader as soon as possible
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 100); // Hide after 100ms

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      <div className="flex flex-col items-center">
        {/* Ultra-fast spinner */}
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="mt-2 text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
