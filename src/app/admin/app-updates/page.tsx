"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const AppUpdatesSection = dynamic(() => import('@/components/admin/AppUpdatesSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading App Updates..." /></div>,
});
export default function AppUpdatesPage() {
  return <AppUpdatesSection />;
}
