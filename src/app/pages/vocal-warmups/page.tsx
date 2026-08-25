"use client";

import { Mic, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NavigationManager } from '@/utils/navigation';

export default function VocalWarmupsPage() {
  const router = useRouter();

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100">
      <div className="h-full flex flex-col">
        <ScreenHeader
          title="Vocal Warm-ups"
          showBackButton={true}
          backPath="/pages/rehearsals"
          rightImageSrc="/logo.png"
        />


        <div className="flex-1 flex items-center justify-center">
          <Mic className="w-16 h-16 text-gray-400" />
        </div>
      </div>
    </div>
  );
}
