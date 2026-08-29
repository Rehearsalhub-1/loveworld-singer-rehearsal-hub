"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const AttendanceSection = dynamic(() => import('@/components/admin/AttendanceSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Attendance..." /></div>,
});
export default function AttendancePage() {
  return <AttendanceSection />;
}
