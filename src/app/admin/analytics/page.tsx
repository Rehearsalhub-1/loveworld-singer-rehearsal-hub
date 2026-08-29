"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const AnalyticsSection = dynamic(() => import('@/components/admin/AnalyticsSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Analytics..." /></div>,
});
export default function AnalyticsPage() {
  return <AnalyticsSection />;
}
