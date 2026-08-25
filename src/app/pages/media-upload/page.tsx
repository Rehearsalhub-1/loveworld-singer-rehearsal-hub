"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomLoader from '@/components/CustomLoader';

export default function MediaUploadPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <CustomLoader />
    </div>
  );
}
