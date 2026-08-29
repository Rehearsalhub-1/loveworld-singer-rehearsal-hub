"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const MembersSection = dynamic(() => import('@/components/admin/MembersSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Members..." /></div>,
});
export default function MembersPage() {
  return <div className="flex-1 flex flex-col min-h-0 overflow-y-auto"><MembersSection /></div>;
}
