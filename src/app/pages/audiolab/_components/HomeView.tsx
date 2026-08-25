"use client";

import { useState, useEffect, useRef } from 'react';
import { Mic, Play, Music2, Users, AudioLines, ChevronRight, ArrowLeft, UserPlus } from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { getUserProjects, createProject } from '../_lib/project-service';
import { getSongs, toLegacySong } from '../_lib/song-service';
import type { AudioLabProject, AudioLabSong, Song } from '../_types';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedData {
  songs: AudioLabSong[];
  timestamp: number;
}

export function HomeView() {
  const { setView, openProject, state, loadHomeData } = useAudioLab();
  const { user, profile } = useAuth();
  const router = useRouter();

  const { projects, featuredSongs } = state.homeData;
  const [isLoading, setIsLoading] = useState(false);

  // Derive projects
  const ownedProjects = projects.filter(p => p.ownerId === user?.uid);
  const sharedProjects = projects.filter(p => p.ownerId !== user?.uid);
  const recentProject = ownedProjects[0] || sharedProjects[0] || null;

  // Load home data once or on mount if stale
  useEffect(() => {
    if (user?.uid) {
      loadHomeData(user.uid, profile?.zone || undefined);
    }
  }, [user?.uid, profile?.zone, loadHomeData]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleContinueProject = () => {
    if (recentProject) {
      openProject(recentProject.id);
    }
  };

  const handleCreateProject = async () => {
    if (!user?.uid) return;

    const result = await createProject({
      name: 'New Recording',
      ownerId: user.uid,
      zoneId: profile?.zone || ''
    });

    if (result.success && result.id) {
      // Trigger a refresh of home data to show the new project
      loadHomeData(user.uid, profile?.zone || undefined, true);
      openProject(result.id);
    }
  };

  // Determine if we are in the initial loading state (no data fetched yet)
  // We use this to show skeletons instead of a full screen loader
  const isInitialLoad = state.homeData.lastFetched === 0;

  return (
    <>
      <div className="flex flex-col pb-24">
        {/* Decorative Background Glow */}
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-violet-500/10 via-transparent to-transparent pointer-events-none z-0" />

        <main className="relative z-10 flex flex-col gap-3 sm:gap-6 px-3 sm:px-4 pt-3 sm:pt-6">
          {/* Header Section */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => router.push('/home')}
              className="text-violet-500 flex size-9 items-center justify-center rounded-full bg-violet-500/10 hover:bg-violet-500/20 transition-colors touch-manipulation"
              title="Go Back"
            >
              <ArrowLeft size={18} className="sm:w-[22px] sm:h-[22px]" />
            </button>

            <div className="flex-1 text-center">
              <h1 className="text-white text-base sm:text-xl font-bold">AudioLab</h1>
              <p className="text-slate-400 text-[9px] sm:text-xs">Your creative recording space</p>
            </div>

            {recentProject ? (
              <button
                onClick={handleContinueProject}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 hover:bg-violet-500/30 transition-all group active:scale-95 touch-manipulation"
              >
                <div className="relative">
                  <Play size={14} fill="currentColor" />
                  <div className="absolute inset-0 animate-ping bg-violet-400/30 rounded-full" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Resume</span>
              </button>
            ) : (
              <div className="size-9 sm:size-10 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <img
                  src="/APP ICON/pwa_192_filled.png"
                  alt="AudioLab Logo"
                  className="size-5 sm:size-6 rounded object-cover"
                  width={24}
                  height={24}
                />
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col items-center px-2 overflow-y-auto">
            {/* Continue Project Card (if exists) */}
            {recentProject && (
              <button
                onClick={handleContinueProject}
                className="w-full max-w-sm mb-3 sm:mb-4 p-3 sm:p-4 rounded-2xl bg-[#261933] border border-white/10 hover:border-violet-500/30 transition-all group text-left touch-manipulation"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="size-12 sm:size-14 rounded-xl bg-violet-500/20 flex items-center justify-center group-hover:bg-violet-500/30 transition-colors">
                    <Play size={20} className="sm:w-6 sm:h-6 text-violet-400 ml-0.5" fill="currentColor" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs text-violet-400 font-bold uppercase tracking-wider mb-0.5 sm:mb-1">
                      Continue
                    </p>
                    <p className="text-white text-sm sm:text-base font-bold truncate">
                      {recentProject.name}
                    </p>
                    <p className="text-slate-400 text-xs sm:text-sm">
                      {recentProject.duration ? formatDuration(recentProject.duration) + ' recorded' : 'In progress'}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Main CTA - Create Project */}
            <button
              onClick={handleCreateProject}
              className="w-full max-w-sm p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 transition-all shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 hover:scale-[1.01] active:scale-[0.98] group touch-manipulation border border-white/10"
            >
              <div className="flex flex-col items-center gap-2 sm:gap-3">
                <div className="size-12 sm:size-16 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Mic size={24} className="sm:w-8 sm:h-8 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-base sm:text-xl font-bold text-white">
                    Start Recording
                  </p>
                  <p className="text-white/70 text-[10px] sm:text-sm mt-0.5">
                    Create in under a minute
                  </p>
                </div>
              </div>
            </button>

            {/* All Projects */}
            {isInitialLoad ? (
              <div className="w-full max-w-sm mt-6 sm:mt-8">
                <div className="h-6 w-32 bg-white/5 rounded animate-pulse mb-3 sm:mb-4" />
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-full h-[72px] rounded-xl bg-[#261933] border border-white/5 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : ownedProjects.length > 1 ? (
              <div className="w-full max-w-sm mt-6 sm:mt-8">
                <h2 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Your Projects</h2>

                <div className="space-y-2 sm:space-y-3">
                  {ownedProjects.slice(1).map((project: AudioLabProject) => (
                    <button
                      key={project.id}
                      onClick={() => openProject(project.id)}
                      className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#261933] border border-white/5 hover:border-violet-500/30 transition-all group text-left touch-manipulation"
                    >
                      <div className="size-10 sm:size-12 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/30 transition-colors">
                        <Mic size={18} className="sm:w-5 sm:h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm sm:text-base font-semibold truncate">
                          {project.name}
                        </p>
                        <p className="text-slate-400 text-xs sm:text-sm">
                          {project.duration ? formatDuration(project.duration) + ' recorded' : 'In progress'}
                        </p>
                      </div>
                      <Play size={16} className="sm:w-[18px] sm:h-[18px] text-slate-500 group-hover:text-violet-400 transition-colors flex-shrink-0" fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Shared Projects - Projects where user is a collaborator */}
            {sharedProjects.length > 0 && (
              <div className="w-full max-w-sm mt-6 sm:mt-8">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <UserPlus size={18} className="text-emerald-400" />
                  <h2 className="text-base sm:text-lg font-bold text-white">Shared with You</h2>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                    {sharedProjects.length}
                  </span>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {sharedProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => openProject(project.id)}
                      className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#1a2520] border border-emerald-500/20 hover:border-emerald-500/40 transition-all group text-left touch-manipulation"
                    >
                      <div className="size-10 sm:size-12 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                        <Users size={18} className="sm:w-5 sm:h-5 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm sm:text-base font-semibold truncate">
                          {project.name}
                        </p>
                        <p className="text-emerald-400/70 text-xs sm:text-sm">
                          {project.duration ? formatDuration(project.duration) + ' recorded' : 'Collaboration'}
                        </p>
                      </div>
                      <Play size={16} className="sm:w-[18px] sm:h-[18px] text-slate-500 group-hover:text-emerald-400 transition-colors flex-shrink-0" fill="currentColor" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Library Songs Feed */}
            {isInitialLoad ? (
              <div className="w-full max-w-sm mt-6 sm:mt-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <div className="h-6 w-24 bg-white/5 rounded animate-pulse" />
                  <div className="h-4 w-16 bg-white/5 rounded animate-pulse" />
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="w-full h-[72px] rounded-xl bg-[#261933] border border-white/5 animate-pulse" />
                  ))}
                </div>
              </div>
            ) : featuredSongs.length > 0 ? (
              <div className="w-full max-w-sm mt-6 sm:mt-8">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h2 className="text-base sm:text-lg font-bold text-white">Library Songs</h2>
                  <button
                    onClick={() => setView('library')}
                    className="text-violet-400 text-xs sm:text-sm font-medium flex items-center gap-1 hover:text-violet-300 transition-colors touch-manipulation"
                  >
                    See All
                    <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                  </button>
                </div>

                <div className="space-y-2 sm:space-y-3">
                  {featuredSongs.map((song) => (
                    <button
                      key={song.id}
                      onClick={() => setView('library')}
                      className="w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-[#261933] border border-white/5 hover:border-violet-500/30 transition-all group text-left touch-manipulation"
                    >
                      <div className="size-10 sm:size-12 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-violet-500/30 transition-colors">
                        <Music2 size={18} className="sm:w-5 sm:h-5 text-violet-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm sm:text-base font-semibold truncate">
                          {song.title}
                        </p>
                        <p className="text-slate-400 text-xs sm:text-sm truncate">
                          {song.artist || 'Unknown Artist'}
                        </p>
                      </div>
                      <Play size={16} className="sm:w-[18px] sm:h-[18px] text-slate-500 group-hover:text-violet-400 transition-colors flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </main >
      </div >
    </>
  );
}
