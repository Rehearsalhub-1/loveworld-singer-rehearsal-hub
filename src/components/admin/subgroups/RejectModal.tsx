"use client";

import React from 'react';
import { AlertCircle, X, RefreshCw } from 'lucide-react';

export interface SubGroup { [key: string]: any; id: string; name: string; type: string; status: string; }
export type SubGroupType = 'church' | 'campus' | 'cell' | 'youth' | 'other';
export type SubGroupStatus = 'pending' | 'approved' | 'rejected' | 'active';

interface RejectModalProps {
  subGroup: SubGroup;
  reason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  processing: boolean;
}

export function RejectModal({
  subGroup,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  processing
}: RejectModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 font-sans animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">Decline Church Request</h3>
              <p className="text-xs text-slate-400 font-medium truncate max-w-[240px]">"{subGroup.name}"</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
            Reason for Declining
          </label>
          <textarea
            value={reason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="Provide a clear reason (this will be sent in a notification to the requester)..."
            rows={3}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none"
            autoFocus
          />
          <p className="text-[11px] text-slate-400 font-medium">
            The church coordinator will receive an in-app notification with this feedback.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex gap-2.5">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || processing}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl font-black text-xs shadow-xs transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5 stroke-[3px]" />}
            <span>Decline Request</span>
          </button>
        </div>
      </div>
    </div>
  );
}
