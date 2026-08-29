"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const DashboardSection = dynamic(() => import('@/components/admin/DashboardSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Dashboard..." /></div>,
});
export default function DashboardPage() {
  return <DashboardSection />;
}
