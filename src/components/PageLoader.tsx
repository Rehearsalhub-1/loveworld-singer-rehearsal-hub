"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { usePathname, useRouter } from 'next/navigation';
import { isPublicPath as checkIsPublicPath, AUTH_CACHE_KEY } from '@/config/routes';
import TopProgressBar from '@/components/TopProgressBar';

interface PageLoaderProps {
  children: React.ReactNode;
}

export function PageLoader({ children }: PageLoaderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { currentZone } = useZone();
  const pathname = usePathname();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isPublic = checkIsPublicPath(pathname);

  // Fast check: do we have cached user credentials?
  const hasCachedUser = typeof window !== 'undefined' && (
    localStorage.getItem('userId') !== null ||
    localStorage.getItem(AUTH_CACHE_KEY) === 'true' ||
    localStorage.getItem('lwsrh_has_user') === 'true' ||
    sessionStorage.getItem('jwt') !== null
  );

  // Route protection effect
  useEffect(() => {
    if (!mounted) return;

    if (isPublic) {
      if (user && (pathname === '/auth' || pathname === '/')) {
        router.replace('/home');
      }
      return;
    }

    // Protected route & completely unauthenticated (no user and no cached token)
    if (!authLoading && !user && !hasCachedUser) {
      router.replace('/auth');
    }
  }, [mounted, isPublic, user, authLoading, hasCachedUser, pathname, router]);

  // For public routes, render children immediately with zero delay
  if (isPublic) {
    return (
      <>
        <TopProgressBar />
        {children}
      </>
    );
  }

  // If we have a user in store or cached in localStorage, render children immediately!
  // Background data sync will happen seamlessly with TopProgressBar without blocking the UI.
  if (user || hasCachedUser) {
    return (
      <>
        <TopProgressBar />
        {children}
      </>
    );
  }

  // Render children directly with TopProgressBar handling background sync
  return (
    <>
      <TopProgressBar />
      {children}
    </>
  );
}
