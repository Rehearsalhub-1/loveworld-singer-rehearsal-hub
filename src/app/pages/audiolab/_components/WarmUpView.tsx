"use client";

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Play, Pause, RotateCcw, Mic, MicOff, Check, Volume2 } from 'lucide-react';
import { useAudioLab } from '../_context/AudioLabContext';
import { audioEngine } from '../_lib/audio-engine';

// Warm-up exercises
const exercises = [
  {
    id: 'breathing',
    name: 'Deep Breathing',
    description: 'Breathe in for 4 counts, hold for 4, exhale for 8',
    duration: 60,
    instructions: [
      'Breathe in slowly... 1, 2, 3, 4',
      'Hold... 1, 2, 3, 4',
      'Exhale slowly... 1, 2, 3, 4, 5, 6, 7, 8',
      'Repeat 4 times'
    ]
  },
  {
    id: 'lip-trill',
    name: 'Lip Trills',
    description: 'Relax your lips and blow air through them',
    duration: 45,
    instructions: [
      'Relax your lips',
      'Blow air through loosely',
      'Add voice: "Brrrrr"',
      'Slide up and down your range'
    ]
  },
  {
    id: 'humming',
    name: 'Humming Scales',
    description: 'Hum up and down a simple scale',
    duration: 60,
    instructions: [
      'Close your lips gently',
      'Hum "Mmmmm"',
      'Feel the vibration in your face',
      'Slide up 5 notes, then back down'
    ]
  },
  {
    id: 'sirens',
    name: 'Vocal Sirens',
    description: 'Slide from low to high and back',
    duration: 45,
    instructions: [
      'Start at your lowest comfortable note',
      'Slide up smoothly like a siren',
      'Reach your highest comfortable note',
      'Slide back down slowly'
    ]
  },
  {
    id: 'vowels',
    name: 'Vowel Sounds',
    description: 'Practice clear vowel pronunciation',
    duration: 60,
    instructions: [
      'Sing "Ah" on a comfortable note',
      'Change to "Eh" without moving pitch',
      'Then "Ee", "Oh", "Oo"',
      'Keep your jaw relaxed'
    ]
  }
];

export function WarmUpView() {
  const { goBack } = useAudioLab();
  
  const [currentExercise, setCurrentExercise] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(exercises[0].duration);
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const [isMicActive, setIsMicActive] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const instructionRef = useRef<NodeJS.Timeout | null>(null);

  const exercise = exercises[currentExercise];

  // Timer logic
  useEffect(() => {
    if (isActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Exercise complete
            setIsActive(false);
            setCompletedExercises(prev => [...prev, exercise.id]);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeRemaining, exercise.id]);

  // Cycle through instructions
  useEffect(() => {
    if (isActive) {
      const instructionDuration = exercise.duration / exercise.instructions.length;
      instructionRef.current = setInterval(() => {
        setCurrentInstruction(prev => (prev + 1) % exercise.instructions.length);
      }, instructionDuration * 1000);
    }
    
    return () => {
      if (instructionRef.current) clearInterval(instructionRef.current);
    };
  }, [isActive, exercise]);

  // Monitor mic input level
  useEffect(() => {
    if (isMicActive) {
      audioEngine.onInputLevel = (level) => {
        setInputLevel(level);
      };
    }
    
    return () => {
      audioEngine.onInputLevel = null;
    };
  }, [isMicActive]);

  const toggleExercise = () => {
    if (isActive) {
      setIsActive(false);
    } else {
      setIsActive(true);
      if (timeRemaining === 0) {
        setTimeRemaining(exercise.duration);
      }
    }
  };

  const resetExercise = () => {
    setIsActive(false);
    setTimeRemaining(exercise.duration);
    setCurrentInstruction(0);
  };

  const selectExercise = (index: number) => {
    setCurrentExercise(index);
    setTimeRemaining(exercises[index].duration);
    setCurrentInstruction(0);
    setIsActive(false);
  };

  const toggleMic = async () => {
    if (isMicActive) {
      await audioEngine.stopRecording();
      setIsMicActive(false);
    } else {
      const success = await audioEngine.startRecording();
      if (success) {
        setIsMicActive(true);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((exercise.duration - timeRemaining) / exercise.duration) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-[#191022] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-white/5">
        <button 
          onClick={goBack}
          className="flex items-center justify-center size-10 rounded-full hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-lg font-bold">Vocal Warm-Up</h2>
        <div className="w-10" />
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {/* Current Exercise Card */}
        <div className="bg-[#261933] rounded-2xl p-6 md:p-8 lg:p-10 mb-6 border border-white/5">
          {/* Progress Ring */}
          <div className="flex justify-center mb-6">
            <div className="relative size-32 md:size-40 lg:size-48">
              <svg className="size-full -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke="#322144"
                  strokeWidth="8"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="58"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${progress * 3.64} 364`}
                  className="transition-all duration-300"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl md:text-4xl lg:text-5xl font-bold text-white tabular-nums">
                  {formatTime(timeRemaining)}
                </span>
                <span className="text-xs md:text-sm text-slate-400">remaining</span>
              </div>
            </div>
          </div>

          {/* Exercise Info */}
          <div className="text-center mb-6">
            <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-2">{exercise.name}</h3>
            <p className="text-slate-400 text-sm md:text-base">{exercise.description}</p>
          </div>

          {/* Current Instruction */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4 mb-6">
            <p className="text-violet-300 text-center font-medium">
              {exercise.instructions[currentInstruction]}
            </p>
          </div>

          {/* Mic Level Indicator */}
          {isMicActive && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <Volume2 size={20} className="text-emerald-400" />
              <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-75"
                  style={{ width: `${inputLevel * 100}%` }}
                />
              </div>
              <span className="text-emerald-400 text-xs font-medium">
                {Math.round(inputLevel * 100)}%
              </span>
            </div>
          )}

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={resetExercise}
              className="size-12 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <RotateCcw size={24} />
            </button>
            <button
              onClick={toggleExercise}
              className={`size-16 rounded-full flex items-center justify-center text-white shadow-lg transition-all ${
                isActive 
                  ? 'bg-orange-500 shadow-orange-500/30' 
                  : 'bg-violet-500 shadow-violet-500/30'
              }`}
            >
              {isActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
            </button>
            <button
              onClick={toggleMic}
              className={`size-12 rounded-full flex items-center justify-center transition-colors ${
                isMicActive 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {isMicActive ? <Mic size={24} /> : <MicOff size={24} />}
            </button>
          </div>
        </div>

        {/* Exercise List */}
        <h4 className="text-white font-bold mb-3">All Exercises</h4>
        <div className="space-y-2">
          {exercises.map((ex, index) => {
            const isCompleted = completedExercises.includes(ex.id);
            const isCurrent = index === currentExercise;
            
            return (
              <button
                key={ex.id}
                onClick={() => selectExercise(index)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                  isCurrent 
                    ? 'bg-violet-500/20 border border-violet-500/30' 
                    : 'bg-[#261933] border border-white/5 hover:bg-white/5'
                }`}
              >
                <div className={`size-8 rounded-full flex items-center justify-center ${
                  isCompleted 
                    ? 'bg-emerald-500' 
                    : isCurrent 
                      ? 'bg-violet-500' 
                      : 'bg-white/10'
                }`}>
                  {isCompleted ? (
                    <Check size={16} className="text-white" />
                  ) : (
                    <span className="text-white text-sm font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isCurrent ? 'text-violet-400' : 'text-white'}`}>
                    {ex.name}
                  </p>
                  <p className="text-slate-500 text-xs">{ex.duration}s</p>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
