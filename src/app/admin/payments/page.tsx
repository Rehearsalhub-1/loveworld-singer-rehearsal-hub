"use client";
import dynamic from 'next/dynamic';
import CustomLoader from '@/components/CustomLoader';
const PaymentDashboardSection = dynamic(() => import('@/components/admin/PaymentDashboardSection'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center min-h-[400px]"><CustomLoader message="Loading Payments..." /></div>,
});
export default function PaymentsPage() {
  return <PaymentDashboardSection />;
}
