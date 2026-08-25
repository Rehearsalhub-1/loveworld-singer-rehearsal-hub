import React from 'react';

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'blue' | 'orange';
  pulse?: boolean;
}

export function StatCard({
  label,
  value,
  icon,
  color,
  pulse
}: StatCardProps) {
  const styles = {
    purple: {
      border: 'border-slate-200/80 hover:border-purple-300',
      iconBg: 'bg-purple-50 text-purple-700 border-purple-100',
      tag: 'bg-purple-50 text-purple-700',
    },
    green: {
      border: 'border-slate-200/80 hover:border-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      tag: 'bg-emerald-50 text-emerald-700',
    },
    blue: {
      border: 'border-slate-200/80 hover:border-blue-300',
      iconBg: 'bg-blue-50 text-blue-700 border-blue-100',
      tag: 'bg-blue-50 text-blue-700',
    },
    orange: {
      border: 'border-slate-200/80 hover:border-amber-300',
      iconBg: 'bg-amber-50 text-amber-700 border-amber-100',
      tag: 'bg-amber-50 text-amber-700',
    },
  };

  const style = styles[color] || styles.purple;

  return (
    <div className={`flex-1 bg-white rounded-3xl p-5 border ${style.border} shadow-xs transition-all hover:shadow-sm relative overflow-hidden group font-sans`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${style.iconBg} shrink-0`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-3xl font-black text-slate-900 tabular-nums">{value.toLocaleString()}</span>
        {pulse && value > 0 && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            Needs Review
          </span>
        )}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Status Metric</span>
        <span className="font-bold text-slate-700">Verified</span>
      </div>
    </div>
  );
}
