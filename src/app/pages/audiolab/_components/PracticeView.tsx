"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Mic, Activity, Music2, Dumbbell, Flame, Zap, Clock, ListChecks, GraduationCap, Award, Bell, Play, ArrowLeft } from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import { getUserProgress, getWeeklyStats, getXpForNextLevel, progressToStats, startSession } from '../_lib/practice-service';
import { getSongs, toLegacySong } from '../_lib/song-service';
import type { PracticeMode, PracticeProgress, Song, AudioLabSong } from '../_types';

interface PracticeCard {
  id: PracticeMode;
  title: string;
  description: string;
  icon: typeof Mic;
  iconColor: string;
  hoverGradient: string;
}

const practiceCards: (PracticeCard & { available: boolean; needsSong?: boolean })[] = [
  {
    id: 'karaoke',
    title: 'Karaoke Mode',
    description: 'Sing with synced lyrics',
    icon: Mic,
    iconColor: 'text-violet-500',
    hoverGradient: 'from-violet-500/20',
    available: true,
    needsSong: true,
  },
  {
    id: 'warmup',
    title: 'Vocal Warm-Up',
    description: 'Prepare your voice',
    icon: Activity,
    iconColor: 'text-blue-400',
    hoverGradient: 'from-blue-500/10',
    available: true,
  },
  {
    id: 'pitch',
    title: 'Pitch Training',
    description: 'Coming soon',
    icon: Music2,
    iconColor: 'text-green-400',
    hoverGradient: 'from-green-500/10',
    available: false,
  },
  {
    id: 'strength',
    title: 'Vocal Strength',
    description: 'Coming soon',
    icon: Dumbbell,
    iconColor: 'text-red-400',
    hoverGradient: 'from-red-500/10',
    available: false,
  },
];

export function PracticeView() {
  const { state, setView, playSong, loadPracticeData } = useAudioLab();
  const router = useRouter();
  const { practiceStats } = state;
  const { user, profile } = useAuth();

  const { progress, weeklyStats, featuredSongs } = state.practiceData;

  // Load user progress
  useEffect(() => {
    if (user?.uid) {
      loadPracticeData(user.uid, profile?.zone || undefined);
    }
  }, [user?.uid, profile?.zone, loadPracticeData]);

  // Determine if we should show a full screen loader
  const isActuallyLoading = !progress;

  const [challengeAccepted, setChallengeAccepted] = useState(false);

  const [comingSoonMode, setComingSoonMode] = useState<string | null>(null);

  const handlePracticeStart = (mode: PracticeMode) => {
    if (mode === 'warmup') {
      setView('warmup');
    } else if (mode === 'karaoke') {
      setView('karaoke');
    } else {
      setComingSoonMode(mode);
      setTimeout(() => setComingSoonMode(null), 2000);
    }
  };

  // Start karaoke with a specific song
  const handleStartKaraokeWithSong = async (song: AudioLabSong) => {
    try {
      // Load the song first
      await playSong(toLegacySong(song));
      // Then navigate to karaoke
      setView('karaoke');
    } catch (error) {
 console.error('[PracticeView] Error starting karaoke:', error);
    }
  };


  // Calculate progress from real data
  const weeklyProgress = progress
    ? Math.min(100, Math.round((progress.weeklyProgress / progress.weeklyTarget) * 100))
    : 0;
  const streakDays = progress?.currentStreak || 0;
  const xpEarned = progress?.xp || 0;
  const userLevel = progress?.level || 1;
  const xpProgress = progress ? getXpForNextLevel(progress.xp) : { current: 0, needed: 100, progress: 0 };

  // Get user's first name for greeting
  const firstName = profile?.first_name || user?.displayName?.split(' ')[0] || 'Singer';

  return (
    <div className="relative pb-24">
        {/* Decorative Background Glow */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent pointer-events-none z-0" />

        {/* Top AppBar */}
        <header className="relative z-10 flex items-center justify-between p-3 sm:p-4 md:p-6 lg:p-8 pt-4 sm:pt-6 bg-transparent">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  setView('home');
                }
              }}
              className="text-white/70 hover:text-white flex items-center justify-center p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors touch-manipulation"
            >
              <ArrowLeft size={18} className="sm:w-6 sm:h-6" />
            </button>
            <div className="relative">
              <div
                className="bg-center bg-no-repeat bg-cover rounded-full size-10 sm:size-12 border-2 border-violet-500 bg-violet-500/20 flex items-center justify-center"
                style={{
                  backgroundImage: profile?.avatar_url ? `url('${profile.avatar_url}')` : 'none'
                }}
              >
                {!profile?.avatar_url && (
                  <span className="text-violet-400 font-bold text-base sm:text-lg">
                    {firstName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute bottom-0 right-0 size-2.5 sm:size-3 bg-green-400 rounded-full border-2 border-[#191022]" />
            </div>
            <div className="flex flex-col">
              <span className="text-gray-400 text-[9px] sm:text-xs font-medium tracking-wide uppercase">Welcome Back</span>
              <h2 className="text-white text-sm sm:text-lg font-bold leading-tight">{firstName}</h2>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Level Badge */}
            <div className="flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 bg-violet-500/20 rounded-full">
              <span className="text-violet-400 text-[10px] sm:text-xs font-bold">Lvl {userLevel}</span>
            </div>
            <button className="flex items-center justify-center size-9 sm:size-10 rounded-full bg-[#261933] border border-white/5 hover:bg-white/10 transition-colors touch-manipulation">
              <Bell size={20} className="sm:w-6 sm:h-6 text-white" />
            </button>
          </div>
        </header>

        {/* Progress Section */}
        <section className="relative z-10 px-3 sm:px-4 md:px-6 lg:px-8 mt-2">
          <div className="bg-[#261933] border border-white/5 rounded-xl p-3 sm:p-5 md:p-6 shadow-lg flex items-center gap-3 sm:gap-6">
            {/* Circular Progress */}
            <div className="relative size-16 sm:size-24 shrink-0 flex items-center justify-center">
              {/* Conic Gradient for Progress Ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{ background: `conic-gradient(#7f13ec ${weeklyProgress}%, #322144 0)` }}
              />
              <div className="absolute inset-[4px] sm:inset-[6px] rounded-full bg-[#261933] flex flex-col items-center justify-center">
                <span className="text-lg sm:text-2xl font-bold text-white leading-none">{weeklyProgress}%</span>
              </div>
            </div>

            {/* Stats Text */}
            <div className="flex flex-col gap-2 sm:gap-3 flex-1">
              <div>
                <p className="text-white text-sm sm:text-base font-bold">Weekly Target</p>
                <p className="text-violet-400/80 text-xs sm:text-sm">Great progress!</p>
              </div>
              <div className="flex gap-3 sm:gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">Streak</span>
                  <div className="flex items-center gap-1">
                    <CustomLoader size="sm" />
                    <span className="font-bold text-white text-sm sm:text-base">{streakDays} Days</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wider">XP Earned</span>
                  <div className="flex items-center gap-1">
                    <Zap size={12} className="sm:w-[14px] sm:h-[14px] text-yellow-400" />
                    <span className="font-bold text-white text-sm sm:text-base">{xpEarned.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>



        {/* Practice Modes Grid */}
        <section className="relative z-10 px-3 sm:px-4 md:px-6 lg:px-8 mt-6 sm:mt-8">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h2 className="text-white text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Practice Modes</h2>
            <button className="text-violet-500 text-xs sm:text-sm md:text-base font-medium hover:text-white transition-colors touch-manipulation">
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {practiceCards.map((card) => {
              const Icon = card.icon;
              const hasSongLoaded = !!state.player.currentSong;
              const showSongHint = card.needsSong && !hasSongLoaded;

              return (
                <button
                  key={card.id}
                  onClick={() => handlePracticeStart(card.id)}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-xl bg-[#261933] p-3 sm:p-4 aspect-[5/4] border shadow-md transition-all duration-300 active:scale-95 cursor-pointer text-left touch-manipulation ${card.available
                    ? 'border-white/5 hover:shadow-[0_0_20px_rgba(127,19,236,0.3)]'
                    : 'border-white/5 opacity-60'
                    }`}
                >
                  {/* Hover Gradient Overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.hoverGradient} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                  {/* Icon */}
                  <div className="relative z-10 bg-[#322144] w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center">
                    <Icon size={20} className="sm:w-[22px] sm:h-[22px]" />
                  </div>

                  {/* Text */}
                  <div className="relative z-10 mt-auto">
                    <h3 className="text-white font-bold text-sm sm:text-base leading-tight mb-0.5">{card.title}</h3>
                    <p className={`text-[10px] sm:text-xs ${card.available ? 'text-gray-400' : 'text-slate-500'}`}>
                      {showSongHint ? 'Select a song first →' : card.description}
                    </p>
                  </div>

                  {/* Background Decoration */}
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-colors" />
                </button>
              );
            })}
          </div>
        </section>

        {/* Session Stats Footer */}
        <section className="relative z-10 px-4 mt-8 mb-6">
          <h2 className="text-white text-xl font-bold tracking-tight mb-4">Your Stats</h2>
          {isActuallyLoading ? (
            <div className="flex items-center justify-center py-8">
              <CustomLoader size="md" />
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#261933] rounded-xl p-3 text-center border border-white/5">
                <Clock size={20} className="text-gray-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">
                  {progress ? formatMinutes(progress.totalMinutes) : '0m'}
                </p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Total Time</p>
              </div>
              <div className="bg-[#261933] rounded-xl p-3 text-center border border-white/5">
                <ListChecks size={20} className="text-gray-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">{progress?.totalSessions || 0}</p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Sessions</p>
              </div>
              <div className="bg-[#261933] rounded-xl p-3 text-center border border-white/5">
                <GraduationCap size={20} className="text-gray-400 mx-auto mb-1" />
                <p className="text-white font-bold text-lg">
                  {progress?.averageAccuracy ? `${progress.averageAccuracy}%` : '-'}
                </p>
                <p className="text-gray-500 text-[10px] uppercase tracking-wider">Accuracy</p>
              </div>
            </div>
          )}
        </section>
      </div>
  );
}

// Helper to format minutes into readable time
function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
