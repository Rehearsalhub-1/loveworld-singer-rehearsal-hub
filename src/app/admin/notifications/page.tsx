"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const SimpleNotificationsSection = dynamic(() => import('@/components/admin/SimpleNotificationsSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Notifications..." /></div>,
});
export default function NotificationsPage() {
  return <SimpleNotificationsSection />;
}
