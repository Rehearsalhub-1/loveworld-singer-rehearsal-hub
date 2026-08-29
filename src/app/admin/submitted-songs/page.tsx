"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const SubmittedSongsPage = dynamic(() => import('@/app/pages/admin/submitted-songs/page'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Submissions..." /></div>,
});
export default function SubmittedSongsAdminPage() {
  return <div className="h-full overflow-auto bg-gray-50"><SubmittedSongsPage embedded={true} /></div>;
}
