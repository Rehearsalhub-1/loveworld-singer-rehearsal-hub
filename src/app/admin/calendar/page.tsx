"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const CalendarSection = dynamic(() => import('@/components/admin/CalendarSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Calendar..." /></div>,
});
export default function CalendarPage() {
  return <CalendarSection />;
}
