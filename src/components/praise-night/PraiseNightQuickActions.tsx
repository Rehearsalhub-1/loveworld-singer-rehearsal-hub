"use client";

import React from 'react';
import { Calendar } from 'lucide-react';

interface PraiseNightQuickActionsProps {
  onOpenSchedule?: () => void;
}

export const PraiseNightQuickActions: React.FC<PraiseNightQuickActionsProps> = ({ onOpenSchedule }) => {
  return (
    <div className="mb-4 sm:mb-6 flex items-center gap-2">
      <button
        onClick={onOpenSchedule}
        className="inline-flex items-center justify-center gap-2.5 px-4 py-2 rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-700 hover:border-purple-300 hover:bg-slate-50/80 active:scale-95 transition"
      >
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-xl bg-purple-100 text-purple-600">
          <Calendar className="w-3.5 h-3.5" />
        </span>
        <span className="text-xs sm:text-sm font-bold text-slate-800">Songs Schedule</span>
      </button>
    </div>
  );
};
export default PraiseNightQuickActions;
