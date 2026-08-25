"use client";

import { Plus, Mic, Save, X } from 'lucide-react';
import { useAudioLab } from '../_context/AudioLabContext';

interface NextActionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onAddLayer: () => void;
  onPractice: () => void;
  onSave: () => void;
}

export function NextActionPrompt({ 
  isOpen, 
  onClose, 
  onAddLayer, 
  onPractice, 
  onSave 
}: NextActionPromptProps) {
  const { state } = useAudioLab();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Content */}
      <div className="relative w-full max-w-md mx-4 mb-4 p-6 rounded-2xl bg-[#261933] border border-white/10 shadow-2xl animate-slide-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 size-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X size={16} />
        </button>

        {/* Success message */}
        <div className="text-center mb-6">
          <div className="size-12 mx-auto mb-3 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-2xl"></span>
          </div>
          <h3 className="text-lg font-bold text-white">
            You just created your first take!
          </h3>
          <p className="text-slate-400 text-sm mt-1">
            What do you want to do next?
          </p>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          {/* Add another layer */}
          <button
            onClick={onAddLayer}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-violet-500 hover:bg-violet-600 transition-colors text-left"
          >
            <div className="size-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Plus size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Add another layer</p>
              <p className="text-white/70 text-sm">Record more vocals</p>
            </div>
          </button>

          {/* Practice singing */}
          <button
            onClick={onPractice}
            className="w-full flex items-center gap-4 p-4 rounded-xl bg-[#38294a] hover:bg-[#38294a]/80 transition-colors text-left"
          >
            <div className="size-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
              <Mic size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="font-bold text-white">Practice singing</p>
              <p className="text-slate-400 text-sm">Try karaoke mode</p>
            </div>
          </button>

          {/* Save & continue later */}
          <button
            onClick={onSave}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:bg-white/5 transition-colors text-left"
          >
            <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Save size={20} className="text-slate-400" />
            </div>
            <div>
              <p className="font-bold text-white">Save & continue later</p>
              <p className="text-slate-400 text-sm">Your progress is saved</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
