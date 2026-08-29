"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const AdminPagesWrapper = dynamic(() => import('@/components/admin/AdminPagesWrapper'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Programs..." /></div>,
});
export default function PagesPage() {
  return <AdminPagesWrapper />;
}
