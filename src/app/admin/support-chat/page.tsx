"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const SupportChatSection = dynamic(() => import('@/components/admin/SupportChatSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Support Chat..." /></div>,
});
export default function SupportChatPage() {
  return <SupportChatSection />;
}
