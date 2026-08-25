"use client";

import { useState, useEffect } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { 
  DEFAULT_EFFECTS, 
  EFFECT_PRESETS, 
  type TrackEffects,
  type EffectPreset 
} from '../_lib/track-effects-engine';

interface TrackEffectsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackName: string;
  initialEffects?: TrackEffects;
  onEffectsChange: (trackId: string, effects: TrackEffects) => void;
}

export function TrackEffectsPanel({
  isOpen,
  onClose,
  trackId,
  trackName,
  initialEffects,
  onEffectsChange
}: TrackEffectsPanelProps) {
  const [effects, setEffects] = useState<TrackEffects>(initialEffects || DEFAULT_EFFECTS);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  // Reset effects when panel opens for a different track or when initialEffects change
  useEffect(() => {
    if (isOpen && initialEffects) {
      setEffects(initialEffects);
    }
  }, [isOpen, trackId, initialEffects]);

  const handleEffectChange = (key: keyof TrackEffects, value: number) => {
    const newEffects = { ...effects, [key]: value };
    setEffects(newEffects);
    setActivePreset(null);
    onEffectsChange(trackId, newEffects);
  };

  const applyPreset = (preset: EffectPreset) => {
    const newEffects = { ...effects, ...preset.effects };
    setEffects(newEffects);
    setActivePreset(preset.id);
    onEffectsChange(trackId, newEffects);
  };

  const resetEffects = () => {
    setEffects(DEFAULT_EFFECTS);
    setActivePreset(null);
    onEffectsChange(trackId, DEFAULT_EFFECTS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-lg bg-[#1a1225] rounded-t-3xl border-t border-white/10 animate-slide-up max-h-[85vh] overflow-y-auto">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/5">
          <div>
            <h3 className="text-lg font-bold text-white">Track Effects</h3>
            <p className="text-sm text-slate-400">{trackName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={resetEffects}
              className="size-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="size-10 flex items-center justify-center rounded-full bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="px-5 py-4 border-b border-white/5">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Presets</p>
          <div className="flex flex-wrap gap-2">
            {EFFECT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activePreset === preset.id
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="px-5 py-4 space-y-5 max-h-[50vh] overflow-y-auto">
          {/* Volume */}
          <EffectSlider
            label="Volume"
            value={effects.volume}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => handleEffectChange('volume', v)}
          />

          {/* Pan */}
          <EffectSlider
            label="Pan"
            value={effects.pan}
            min={-100}
            max={100}
            unit=""
            centerZero
            formatValue={(v) => v === 0 ? 'C' : v < 0 ? `L${Math.abs(v)}` : `R${v}`}
            onChange={(v) => handleEffectChange('pan', v)}
          />

          {/* Reverb */}
          <EffectSlider
            label="Reverb"
            value={effects.reverb}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => handleEffectChange('reverb', v)}
          />

          {/* Bass */}
          <EffectSlider
            label="Bass"
            value={effects.bass}
            min={-12}
            max={12}
            unit="dB"
            centerZero
            onChange={(v) => handleEffectChange('bass', v)}
          />

          {/* Treble */}
          <EffectSlider
            label="Treble"
            value={effects.treble}
            min={-12}
            max={12}
            unit="dB"
            centerZero
            onChange={(v) => handleEffectChange('treble', v)}
          />

          {/* Compression */}
          <EffectSlider
            label="Compression"
            value={effects.compression}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => handleEffectChange('compression', v)}
          />
        </div>

        {/* Safe area padding */}
        <div className="h-8" />
      </div>
    </div>
  );
}


// Slider Component
interface EffectSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  centerZero?: boolean;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
}

function EffectSlider({
  label,
  value,
  min,
  max,
  unit,
  centerZero,
  formatValue,
  onChange
}: EffectSliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;
  const displayValue = formatValue ? formatValue(value) : `${value}${unit}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-sm font-mono text-violet-400 min-w-[48px] text-right">
          {displayValue}
        </span>
      </div>
      <div className="relative">
        {/* Track background */}
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          {centerZero ? (
            // Center-zero style (for pan, EQ)
            <div 
              className="absolute top-0 h-full bg-violet-500 transition-all"
              style={{
                left: value >= 0 ? '50%' : `${percentage}%`,
                width: `${Math.abs(value) / (max - min) * 100}%`
              }}
            />
          ) : (
            // Normal fill style
            <div 
              className="h-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all"
              style={{ width: `${percentage}%` }}
            />
          )}
        </div>
        {/* Center line for center-zero sliders */}
        {centerZero && (
          <div className="absolute top-0 left-1/2 w-0.5 h-2 bg-white/30 -translate-x-1/2" />
        )}
        {/* Input */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        {/* Thumb indicator */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-black/30 pointer-events-none transition-all"
          style={{ left: `calc(${percentage}% - 8px)` }}
        />
      </div>
    </div>
  );
}

export default TrackEffectsPanel;
