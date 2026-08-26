"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import CustomLoader from "@/components/CustomLoader";

function SubGroupRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("category", "church");
    router.replace(`/pages/praise-night?${params.toString()}`);
  }, [router, searchParams]);

  return <CustomLoader />;
}

export default function SubgroupsPage() {
  return (
    <Suspense fallback={<CustomLoader />}>
      <SubGroupRedirect />
    </Suspense>
  );
}
