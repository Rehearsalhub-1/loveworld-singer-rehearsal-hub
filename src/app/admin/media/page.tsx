"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomLoader from '@/components/CustomLoader';

/**
 * Admin Media — redirects to the full Media Library at /pages/media.
 * The media library lives at that route with its full MediaContext provider.
 */
export default function AdminMediaPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/pages/media');
  }, [router]);
  return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <CustomLoader message="Opening Media Library..." />
    </div>
  );
}