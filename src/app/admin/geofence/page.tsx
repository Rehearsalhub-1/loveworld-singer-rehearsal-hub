"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const GeofenceConfigSection = dynamic(() => import('@/components/admin/GeofenceConfigSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Geofence Config..." /></div>,
});
export default function GeofencePage() {
  return <GeofenceConfigSection />;
}
