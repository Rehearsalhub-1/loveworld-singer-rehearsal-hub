"use client";

import React from 'react';
import { Users, Check, Eye, X, ChevronRight, User, Building2 } from 'lucide-react';

export interface SubGroup { 
  [key: string]: any; 
  id: string; 
  name: string; 
  type: string; 
  status: string; 
  memberCount?: number;
  memberIds?: string[];
  coordinatorName?: string;
  description?: string;
}

export type SubGroupType = 'church' | 'campus' | 'cell' | 'youth' | 'other';
export type SubGroupStatus = 'pending' | 'approved' | 'rejected' | 'active';

import { TYPE_ICONS, TYPE_LABELS, STATUS_CONFIG } from './SubGroupConstants';

interface SubGroupRowProps {
  subGroup: SubGroup;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
  processing: boolean;
}

export function SubGroupRow({
  subGroup,
  onApprove,
  onReject,
  onView,
  processing
}: SubGroupRowProps) {
  const statusConfig = (STATUS_CONFIG as any)[subGroup.status] || STATUS_CONFIG.pending;
  const typeIcon = (TYPE_ICONS as any)[subGroup.type] || <Building2 className="w-5 h-5" />;
  const typeLabel = (TYPE_LABELS as any)[subGroup.type] || subGroup.type || 'Church Choir';
  const memberCount = subGroup.memberIds?.length || subGroup.memberCount || subGroup.estimatedMembers || 1;

  const isPending = subGroup.status === 'pending';
  const isActive = subGroup.status === 'active' || !subGroup.status;

  return (
    <div 
      onClick={onView}
      className="group bg-white hover:bg-slate-50/80 transition-all duration-150 cursor-pointer px-5 py-4 flex items-center justify-between gap-4"
    >
      {/* Left Info */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Type Icon Badge */}
        <div className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-white shadow-xs transition-transform group-hover:scale-105 ${
          isActive
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-100'
            : isPending
              ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-100'
              : 'bg-gradient-to-br from-slate-500 to-slate-600 shadow-slate-100'
        }`}>
          {React.isValidElement(typeIcon) && React.cloneElement(typeIcon as React.ReactElement<any>, { className: "w-4 h-4" })}
        </div>

        {/* Details */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-black text-slate-900 truncate tracking-tight text-xs sm:text-sm group-hover:text-purple-700 transition-colors">
              {subGroup.name}
            </h3>
            {isActive && (
              <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
                <Check className="w-2 h-2 stroke-[3.5px]" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">
              {typeLabel}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-medium flex items-center gap-1">
              <User className="w-3 h-3 text-slate-400" />
              {subGroup.coordinatorName || 'Church Leader'}
            </span>
          </div>
        </div>
      </div>

      {/* Center Status & Member Count Badges */}
      <div className="hidden md:flex items-center gap-2 shrink-0">
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
          isActive
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : isPending
              ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
              : 'bg-slate-50 text-slate-600 border-slate-200'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-slate-400'}`} />
          {statusConfig.label}
        </span>

        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200/60">
          <Users className="w-3 h-3 text-slate-400" />
          {memberCount} {memberCount === 1 ? 'member' : 'members'}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {isPending && (
          <>
            <button
              onClick={onApprove}
              disabled={processing}
              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-lg transition-all disabled:opacity-50 shadow-xs flex items-center gap-1"
            >
              <Check className="w-3 h-3 stroke-[3px]" />
              <span className="hidden sm:inline">Approve</span>
            </button>
            <button
              onClick={onReject}
              disabled={processing}
              className="h-8 px-2.5 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 text-xs font-black rounded-lg transition-all disabled:opacity-50 border border-rose-200 flex items-center gap-1"
            >
              <X className="w-3 h-3 stroke-[3px]" />
              <span className="hidden sm:inline">Reject</span>
            </button>
          </>
        )}

        <button
          onClick={onView}
          className="h-8 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
          title="View church details"
        >
          <Eye className="w-3.5 h-3.5 text-slate-500" />
          <span>Details</span>
        </button>
      </div>
    </div>
  );
}
