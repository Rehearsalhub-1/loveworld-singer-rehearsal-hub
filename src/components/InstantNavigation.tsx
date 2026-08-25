"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function InstantNavigation() {
  const router = useRouter();
  const preloadedPages = useRef(new Set<string>());

  useEffect(() => {
    // Preload all critical pages instantly
    const criticalPages = [
      '/',
      '/home',
      '/pages/rehearsals',
      '/pages/profile',
      '/pages/praise-night',
      '/pages/audiolab',
      '/admin',
      '/auth'
    ];

    // Preload pages using link prefetch
    criticalPages.forEach(page => {
      if (!preloadedPages.current.has(page)) {
        preloadedPages.current.add(page);

        // Create prefetch link
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = page;
        document.head.appendChild(link);
      }
    });

    // Preload API endpoints
    const apiEndpoints = [
      '/api/songs',
      '/api/praise-nights',
      '/api/categories',
      '/api/media'
    ];

    apiEndpoints.forEach(endpoint => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = endpoint;
      document.head.appendChild(link);
    });

    // Preload critical images
    const criticalImages = [
      '/logo.png',
      '/lmm.png'
    ];

    criticalImages.forEach(image => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = image;
      document.head.appendChild(link);
    });

    // Set up instant navigation
    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a');

      if (link && link.href && link.href.startsWith(window.location.origin)) {
        const url = new URL(link.href);
        const pathname = url.pathname;

        // If it's a page we haven't preloaded, preload it now
        if (!preloadedPages.current.has(pathname)) {
          preloadedPages.current.add(pathname);

          const prefetchLink = document.createElement('link');
          prefetchLink.rel = 'prefetch';
          prefetchLink.href = pathname;
          document.head.appendChild(prefetchLink);
        }
      }
    };

    // Add click listener for instant navigation
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [router]);

  return null;
}
