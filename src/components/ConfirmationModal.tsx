"use client";

import React from 'react'
import { X, AlertTriangle } from 'lucide-react'

interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
  isDanger?: boolean
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = true
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300" 
        onClick={onCancel} 
      />
      
      <div className="relative w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 duration-300">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isDanger ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-500'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <button 
              onClick={onCancel}
              className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-slate-100 mb-3">{title}</h3>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-6 h-12 rounded-2xl text-sm font-bold text-slate-400 hover:bg-slate-800 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-6 h-12 rounded-2xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 ${
                isDanger 
                ? 'bg-red-600 hover:bg-red-500 shadow-red-600/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfirmationModal
