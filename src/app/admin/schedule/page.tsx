"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const SchedulingBoardSection = dynamic(() => import('@/components/admin/SchedulingBoardSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Schedule..." /></div>,
});
export default function SchedulePage() {
  return <SchedulingBoardSection />;
}
