"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const KaraokeConfigSection = dynamic(() => import('@/components/admin/KaraokeConfigSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Playback Mode..." /></div>,
});
export default function KaraokeConfigPage() {
  return <KaraokeConfigSection />;
}