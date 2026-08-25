import React from 'react';
import { useRouter } from 'next/navigation';
import { Music, Mic, Users, BookOpen } from 'lucide-react';

export const PraiseNightQuickActions: React.FC = () => {
  const router = useRouter();

  return (
    <div className="mb-4 sm:mb-6">
      <div
        className="-mx-3 px-3 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          target.style.animationPlayState = 'paused';
          clearTimeout((target as any).scrollTimeout);
          (target as any).scrollTimeout = setTimeout(() => {
            target.style.animationPlayState = 'running';
          }, 2000);
        }}
      >
        <div className="flex items-center gap-2 sm:gap-3 animate-scroll">
          {/* First set of pills */}
          <button
            onClick={() => router.push('/pages/praise-night/schedule')}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100">
              <Music className="w-3.5 h-3.5 text-purple-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Songs Schedule</span>
          </button>

          <button
            onClick={() => router.push('/pages/audiolab')}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100">
              <Mic className="w-3.5 h-3.5 text-purple-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Audio Lab</span>
          </button>

          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
              <Users className="w-3.5 h-3.5 text-amber-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Solfas</span>
          </button>

          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Sheet Music</span>
          </button>

          {/* Duplicate set for seamless scrolling */}
          <button
            onClick={() => router.push('/pages/praise-night/schedule')}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100">
              <Music className="w-3.5 h-3.5 text-purple-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Songs Schedule</span>
          </button>

          <button
            onClick={() => router.push('/pages/audiolab')}
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start"
          >
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-purple-100">
              <Mic className="w-3.5 h-3.5 text-purple-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Audio Lab</span>
          </button>

          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100">
              <Users className="w-3.5 h-3.5 text-amber-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Solfas</span>
          </button>

          <button className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 active:scale-95 transition flex-shrink-0 snap-start">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100">
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
            </span>
            <span className="text-xs sm:text-sm font-medium">Sheet Music</span>
          </button>
        </div>
      </div>
    </div>
  );
};
