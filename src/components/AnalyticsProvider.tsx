"use client";

import React, { createContext, useContext, ReactNode } from 'react';
const AnalyticsContext = createContext<any>({ trackEvent: () => {} });
export function AnalyticsProvider({ children }: { children: ReactNode }) {
  return <AnalyticsContext.Provider value={{ trackEvent: () => {} }}>{children}</AnalyticsContext.Provider>;
}
export const useAnalytics = () => useContext(AnalyticsContext);
