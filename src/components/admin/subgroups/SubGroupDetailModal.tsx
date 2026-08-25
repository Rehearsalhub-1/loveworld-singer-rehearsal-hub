"use client";

import React, { useState } from 'react';
import {
  X, Check, CheckCircle, Info, User as UserIcon, Mail, Copy,
  Calendar, RefreshCw, XCircle, Sparkles, Building2, Users, ShieldCheck, MapPin
} from 'lucide-react';

export interface SubGroup { [key: string]: any; id: string; name: string; type: string; status: string; }
export type SubGroupType = 'church' | 'campus' | 'cell' | 'youth' | 'other';
export type SubGroupStatus = 'pending' | 'approved' | 'rejected' | 'active';

import { TYPE_ICONS, TYPE_LABELS, STATUS_CONFIG } from './SubGroupConstants';

interface SubGroupDetailModalProps {
  subGroup: SubGroup;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
  processing: boolean;
}

export function SubGroupDetailModal({
  subGroup,
  onApprove,
  onReject,
  onClose,
  processing
}: SubGroupDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const statusConfig = (STATUS_CONFIG as any)[subGroup.status] || STATUS_CONFIG.pending;
  const typeLabel = (TYPE_LABELS as any)[subGroup.type] || subGroup.type || 'Church Choir';
  const typeIcon = (TYPE_ICONS as any)[subGroup.type] || <Building2 className="w-5 h-5" />;

  const isPending = subGroup.status === 'pending';
  const isActive = subGroup.status === 'active' || !subGroup.status;

  const copyEmail = () => {
    if (!subGroup.coordinatorEmail) return;
    navigator.clipboard.writeText(subGroup.coordinatorEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const coordinatorInitials = (subGroup.coordinatorName || 'Church Leader')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n: string) => n[0].toUpperCase())
    .join('');

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Slide-over Drawer Panel */}
      <div className="absolute inset-y-0 right-0 w-full max-w-md sm:max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ease-out border-l border-slate-100">
        
        {/* ── 1. SLEEK STUDIO HEADER ── */}
        <div className="p-6 pb-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white relative">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0 ${
                isActive 
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-200' 
                  : isPending 
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-200' 
                    : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-200'
              }`}>
                {React.isValidElement(typeIcon) && React.cloneElement(typeIcon as React.ReactElement<any>, { className: "w-6 h-6" })}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight truncate">
                  {subGroup.name}
                </h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isActive 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : isPending 
                        ? 'bg-amber-50 text-amber-700 border-amber-200' 
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : isPending ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    {statusConfig.label}
                  </span>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {typeLabel}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── 2. SCROLLABLE CONTENT BODY ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 bg-white">
          
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                Est. Capacity
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {subGroup.estimatedMembers || 10}
                </span>
                <span className="text-xs text-slate-400 font-bold">singers</span>
              </div>
            </div>

            <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Registered
              </span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {subGroup.memberIds?.length || subGroup.memberCount || 1}
                </span>
                <span className="text-xs text-slate-400 font-bold">active</span>
              </div>
            </div>
          </div>

          {/* Leadership Profile Card */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Church Leadership
            </span>
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                  {coordinatorInitials || 'CL'}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black text-slate-900 truncate">
                    {subGroup.coordinatorName || 'Church Coordinator'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    Church Leader / Sectional Head
                  </p>
                </div>
              </div>

              {subGroup.coordinatorEmail && (
                <div className="pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate font-medium">{subGroup.coordinatorEmail}</span>
                  </div>
                  <button
                    onClick={copyEmail}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 flex items-center gap-1 ${
                      copied 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Description / Mission */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Church Overview & Notes
            </span>
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200/80 p-4">
              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {subGroup.description || 'Commitment to vocal excellence, regular rehearsal attendance, and spiritual alignment with the Loveworld Music Ministry.'}
              </p>
            </div>
          </div>

          {/* Rejection Note if rejected */}
          {subGroup.status === 'rejected' && subGroup.rejectReason && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                Rejection Reason
              </span>
              <p className="text-xs font-medium text-rose-800">
                "{subGroup.rejectReason}"
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-2">
            <Calendar className="w-3.5 h-3.5" />
            <span>Registered / Requested recently</span>
          </div>
        </div>

        {/* ── 3. ELEVATED ACTION FOOTER ── */}
        <div className="p-5 border-t border-slate-100 bg-slate-50/50">
          {isPending ? (
            <div className="flex items-center gap-3">
              <button
                onClick={onApprove}
                disabled={processing}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3px]" />}
                <span>Approve Church</span>
              </button>
              <button
                onClick={onReject}
                disabled={processing}
                className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 font-black text-xs rounded-xl border border-rose-200 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <X className="w-4 h-4 stroke-[3px]" />
                <span>Reject</span>
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all"
            >
              Close Details
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
