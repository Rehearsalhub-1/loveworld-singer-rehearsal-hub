"use client";

import React, { Suspense, lazy, ComponentType } from 'react';
import UltraFastLoader from './UltraFastLoader';

// Lazy load all page components
const LazyAdminPage = lazy(() => import('@/app/admin/page'));
const LazyHomePage = lazy(() => import('@/app/home/page'));
const LazyAuthPage = lazy(() => import('@/app/auth/page'));
const LazyProfilePage = lazy(() => import('@/app/pages/profile/page'));
const LazyPraiseNightPage = lazy(() => import('@/app/pages/praise-night/page'));
const LazyRehearsalsPage = lazy(() => import('@/app/pages/rehearsals/page'));
// Profile completion page removed
// Subscription page removed

// Loading component with skeleton
const PageSkeleton = ({ pageName }: { pageName: string }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
    <div className="container mx-auto px-4 py-8">
      <div className="animate-pulse">
        {/* Header skeleton */}
        <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6"></div>
        
        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
        
        {/* Cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="text-center mt-8">
        <UltraFastLoader />
        <p className="text-gray-500 mt-2">Loading {pageName}...</p>
      </div>
    </div>
  </div>
);

// Higher-order component for lazy loading
export function withLazyLoading<T extends object>(
  Component: ComponentType<T>,
  pageName: string
) {
  return function LazyLoadedComponent(props: T) {
    return (
      <Suspense fallback={<PageSkeleton pageName={pageName} />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Lazy loaded page components
export const LazyAdminPageComponent = withLazyLoading(LazyAdminPage, 'Admin Dashboard');
export const LazyHomePageComponent = withLazyLoading(LazyHomePage, 'Home');
export const LazyAuthPageComponent = withLazyLoading(LazyAuthPage, 'Authentication');
export const LazyProfilePageComponent = withLazyLoading(LazyProfilePage, 'Profile');
export const LazyPraiseNightPageComponent = withLazyLoading(LazyPraiseNightPage, 'Praise Night');
export const LazyRehearsalsPageComponent = withLazyLoading(LazyRehearsalsPage, 'Rehearsals');
// Profile completion page component removed
// Subscription page removed

// Lazy loading wrapper for any component
export function LazyWrapper({ 
  children, 
  fallback, 
  pageName = 'Content' 
}: { 
  children: React.ReactNode;
  fallback?: React.ReactNode;
  pageName?: string;
}) {
  return (
    <Suspense fallback={fallback || <PageSkeleton pageName={pageName} />}>
      {children}
    </Suspense>
  );
}

// Lazy loading for modals and overlays
export const LazyEditSongModal = lazy(() => import('@/components/EditSongModal'));
export const LazyMediaManager = lazy(() => import('@/components/MediaManager'));
export const LazyUserManagement = lazy(() => import('@/components/UserManagement'));
export const LazySongDetailModal = lazy(() => import('@/components/SongDetailModal'));

// Modal loading component
const ModalSkeleton = () => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/2 mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="flex gap-3 mt-6">
          <div className="h-10 bg-gray-200 rounded w-20"></div>
          <div className="h-10 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  </div>
);

// Lazy modal wrapper
export function LazyModalWrapper({ 
  children, 
  isOpen 
}: { 
  children: React.ReactNode;
  isOpen: boolean;
}) {
  if (!isOpen) return null;

  return (
    <Suspense fallback={<ModalSkeleton />}>
      {children}
    </Suspense>
  );
}

export default LazyWrapper;
