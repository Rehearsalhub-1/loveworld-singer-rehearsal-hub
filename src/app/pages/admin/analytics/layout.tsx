"use client";

import { AnalyticsProvider } from '@/components/AnalyticsProvider';

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AnalyticsProvider>
      {children}
    </AnalyticsProvider>
  );
}

