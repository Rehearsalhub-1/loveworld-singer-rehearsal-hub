"use client";

import { PageLoader } from '@/components/PageLoader';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageLoader>
      {children}
    </PageLoader>
  );
}


