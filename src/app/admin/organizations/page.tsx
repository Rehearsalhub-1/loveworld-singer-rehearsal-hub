"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const OrganizationsSection = dynamic(() => import('@/components/admin/OrganizationsSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Organizations..." /></div>,
});
export default function OrganizationsPage() {
  return <OrganizationsSection />;
}
