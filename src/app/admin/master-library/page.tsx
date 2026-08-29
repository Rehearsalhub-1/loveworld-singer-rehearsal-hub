"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const MasterLibrarySection = dynamic(() => import('@/components/admin/MasterLibrarySection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Master Library..." /></div>,
});
export default function MasterLibraryPage() {
  return <MasterLibrarySection isHQAdmin={false} />;
}
