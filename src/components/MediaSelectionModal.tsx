"use client";

import React from 'react';
import { X, FolderOpen } from 'lucide-react';
import MediaManager from './MediaManager';

interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'audio' | 'video' | 'document';
  size: number;
  uploadedAt: string;
  folder?: string;
}

interface MediaSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: MediaFile) => void;
  allowedTypes?: ('image' | 'audio' | 'video' | 'document')[];
  title?: string;
}

export default function MediaSelectionModal({ 
  isOpen, 
  onClose, 
  onFileSelect, 
  allowedTypes = ['image'],
  title = "Choose Asset from Media Library"
}: MediaSelectionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col h-[90vh] max-h-[850px]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-400">Select an asset from your cloud storage catalog</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Media Manager Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          <MediaManager
            onSelectFile={(file) => {
              onFileSelect(file);
            }}
            onClose={() => {
              onClose();
            }}
            selectionMode={true}
            allowedTypes={allowedTypes}
            filterType={allowedTypes.length === 1 ? allowedTypes[0] : 'all'}
          />
        </div>
      </div>
    </div>
  );
}
