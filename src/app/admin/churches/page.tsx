"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const SubGroupsSection = dynamic(() => import('@/components/admin/SubGroupsSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Churches..." /></div>,
});
export default function ChurchesPage() {
  const addToast = (t: any) => console.log(t);
  return <SubGroupsSection addToast={addToast} />;
}
