"use client";

import React, { Suspense, useEffect } from "react";
import PraiseNightPage from "../praise-night/page";
import CustomLoader from "@/components/CustomLoader";

export default function ProgramsPage() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = "Programs & Repertoire | LoveWorld Singers Rehearsal Hub";
    }
  }, []);

  return (
    <Suspense fallback={<CustomLoader />}>
      <PraiseNightPage />
    </Suspense>
  );
}
