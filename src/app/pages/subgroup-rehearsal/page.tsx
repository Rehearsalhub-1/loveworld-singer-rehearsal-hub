"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CustomLoader from "@/components/CustomLoader";

function SubgroupRehearsalRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams?.get('id') || searchParams?.get('page');
    const params = new URLSearchParams();
    params.set("category", "church");
    if (id) params.set("page", id);
    router.replace(`/pages/programs?${params.toString()}`);
  }, [router, searchParams]);

  return <CustomLoader />;
}

export default function SubgroupRehearsalPage() {
  return (
    <Suspense fallback={<CustomLoader />}>
      <SubgroupRehearsalRedirect />
    </Suspense>
  );
}
