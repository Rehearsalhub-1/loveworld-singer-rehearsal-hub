"use client";

import { useState, useEffect } from 'react';
import { X, Volume2, Disc3, Waves, Music2, Gauge, RotateCcw } from 'lucide-react';
import { 
  trackEffectsEngine, 
  type TrackEffects, 
  DEFAULT_EFFECTS, 
  EFFECT_PRESETS 
} from '../_lib/track-effects-engine';

interface TrackEffectsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackName: string;
  audioUrl?: string;
  onEffectsChange?: (effects: TrackEffects) => void;
}

export function TrackEffectsSheet({ 
  isOpen, 
  onClose, 
  trackId, 
  trackName,
  audioUrl,
  onEffectsChange 
}: TrackEffectsSheetProps) {
  const [effects, setEffects] = useState<TrackEffects>(DEFAULT_EFFECTS);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isOpen && trackId) {
      initializeEffects();
    }
  }, [isOpen, trackId]);

  const initializeEffects = async () => {
    const ok = await trackEffectsEngine.initialize();
    if (!ok) return;

    // Ensure audio chain exists for this track; if not, create it with the provided audio element
    const existingContext = trackEffectsEngine.getContext();
    if (!existingContext) return;

    // We don't manage the HTMLAudioElement here, so just create the chain without a source.
    // Effects are applied to the underlying nodes via applyEffects.
    trackEffectsEngine.createTrackChain(trackId);
    trackEffectsEngine.applyEffects(trackId, effects);
    setIsInitialized(true);
  };

  const updateEffect = (key: keyof TrackEffects, value: number) => {
    const newEffects = { ...effects, [key]: value };
    setEffects(newEffects);
    setActivePreset(null);
    trackEffectsEngine.applyEffects(trackId, newEffects);
    onEffectsChange?.(newEffects);
  };

  const applyPreset = (preset: (typeof EFFECT_PRESETS)[number]) => {
    const newEffects = { ...effects, ...preset.effects };
    setEffects(newEffects);
    setActivePreset(preset.name);
    trackEffectsEngine.applyEffects(trackId, newEffects as TrackEffects);
    onEffectsChange?.(newEffects);
  };

  const resetEffects = () => {
    setEffects(DEFAULT_EFFECTS);
    setActivePreset(null);
    trackEffectsEngine.applyEffects(trackId, DEFAULT_EFFECTS);
    onEffectsChange?.(DEFAULT_EFFECTS);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[150]"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div 
        className="relative w-full max-w-lg md:max-w-2xl lg:max-w-4xl xl:max-w-6xl bg-[#1a1225] rounded-t-3xl max-h-[85vh] overflow-hidden animate-slide-up shadow-2xl z-[150]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div>
            <h3 className="text-lg font-bold text-white">Track Effects</h3>
            <p className="text-sm text-slate-400">{trackName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetEffects}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* Presets */}
          <div className="mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Quick Presets</p>
            <div className="grid grid-cols-3 gap-2">
              {EFFECT_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => applyPreset(preset)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                    activePreset === preset.name
                      ? 'bg-violet-500 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-xl">️</span>
                  <span className="text-xs font-medium">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>


          {/* Volume */}
          <EffectSlider
            icon={<Volume2 size={18} />}
            label="Volume"
            value={effects.volume}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => updateEffect('volume', v)}
            color="violet"
          />

          {/* Pan */}
          <EffectSlider
            icon={<Disc3 size={18} />}
            label="Pan"
            value={effects.pan}
            min={-100}
            max={100}
            unit=""
            displayValue={effects.pan === 0 ? 'Center' : effects.pan < 0 ? `L ${Math.abs(effects.pan)}` : `R ${effects.pan}`}
            onChange={(v) => updateEffect('pan', v)}
            color="cyan"
            center
          />

          {/* Reverb */}
          <EffectSlider
            icon={<Waves size={18} />}
            label="Reverb"
            value={effects.reverb}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => updateEffect('reverb', v)}
            color="blue"
          />

          {/* Bass */}
          <EffectSlider
            icon={<Music2 size={18} />}
            label="Bass"
            value={effects.bass}
            min={-12}
            max={12}
            unit="dB"
            onChange={(v) => updateEffect('bass', v)}
            color="amber"
            center
          />

          {/* Treble */}
          <EffectSlider
            icon={<Music2 size={18} className="rotate-180" />}
            label="Treble"
            value={effects.treble}
            min={-12}
            max={12}
            unit="dB"
            onChange={(v) => updateEffect('treble', v)}
            color="orange"
            center
          />

          {/* Compression */}
          <EffectSlider
            icon={<Gauge size={18} />}
            label="Compression"
            value={effects.compression}
            min={0}
            max={100}
            unit="%"
            onChange={(v) => updateEffect('compression', v)}
            color="rose"
          />
        </div>
      </div>
    </div>
  );
}

// Reusable effect slider component
interface EffectSliderProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  min: number;
  max: number;
  unit: string;
  displayValue?: string;
  onChange: (value: number) => void;
  color: 'violet' | 'cyan' | 'blue' | 'amber' | 'orange' | 'rose';
  center?: boolean;
}

function EffectSlider({ 
  icon, label, value, min, max, unit, displayValue, onChange, color, center 
}: EffectSliderProps) {
  const colorClasses = {
    violet: 'accent-violet-500 text-violet-400',
    cyan: 'accent-cyan-500 text-cyan-400',
    blue: 'accent-blue-500 text-blue-400',
    amber: 'accent-amber-500 text-amber-400',
    orange: 'accent-orange-500 text-orange-400',
    rose: 'accent-rose-500 text-rose-400',
  };

  const bgClasses = {
    violet: 'bg-violet-500/20',
    cyan: 'bg-cyan-500/20',
    blue: 'bg-blue-500/20',
    amber: 'bg-amber-500/20',
    orange: 'bg-orange-500/20',
    rose: 'bg-rose-500/20',
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${bgClasses[color]} ${colorClasses[color]}`}>
            {icon}
          </div>
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <span className={`text-sm font-bold ${colorClasses[color]}`}>
          {displayValue || `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className={`w-full h-2 rounded-lg appearance-none cursor-pointer bg-white/10 ${colorClasses[color]}`}
        style={{
          background: center 
            ? `linear-gradient(to right, 
                rgba(255,255,255,0.1) 0%, 
                rgba(255,255,255,0.1) ${((value - min) / (max - min)) * 100}%, 
                rgba(255,255,255,0.1) 100%)`
            : undefined
        }}
      />
      {center && (
        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
          <span>{min}</span>
          <span>0</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  );
}

export default TrackEffectsSheet;
