"use client";

import { Home, Music2, Mic, Users, AudioLines, Plus } from 'lucide-react';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import { createProject } from '../_lib/project-service';
import type { ViewType } from '../_types';

interface NavItem {
  id: ViewType;
  label: string;
  icon: typeof Music2;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'library', label: 'Library', icon: Music2 },
  { id: 'practice', label: 'Practice', icon: Mic },
  { id: 'collab', label: 'Collab', icon: Users },
];

export function BottomNav() {
  const { state, setView, openProject } = useAudioLab();
  const { currentView } = state;
  const { user, profile } = useAuth();

  const handleCreateProject = async () => {
    if (!user?.uid || !profile?.zone) return;

    const result = await createProject({
      name: 'New Recording',
      ownerId: user.uid,
      zoneId: profile.zone
    });

    if (result.success && result.id) {
      openProject(result.id);
    }
  };

  // BottomNav visibility is now controlled by parent (page.tsx)
  // This component just renders when shown
  // Always visible when shown, even when MiniPlayer is visible

  return (
    <nav
      className={`
        fixed bottom-0 w-full max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl left-1/2 -translate-x-1/2
        border-t border-white/5 pb-4 pt-2 px-4 sm:px-6 
        flex justify-around items-center z-[50]
        bg-[#191022]/95 backdrop-blur-xl
      `}
    >
      {navItems.slice(0, 2).map(({ id, label, icon: Icon }) => {
        const isActive = currentView === id ||
          (id === 'library' && currentView === 'playlist-detail');

        return (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`
              flex flex-col items-center gap-1 transition-colors
              ${isActive
                ? 'text-violet-500'
                : 'text-slate-400 hover:text-slate-200'
              }
            `}
          >
            <Icon
              size={24}
              className={isActive ? 'fill-current' : ''}
            />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}

      {/* Center Create Button */}
      <button
        onClick={handleCreateProject}
        className="relative -mt-6 flex items-center justify-center"
      >
        <div className="size-14 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30 hover:shadow-violet-500/40 transition-all hover:scale-105 active:scale-95">
          <Plus size={28} className="text-white" strokeWidth={2.5} />
        </div>
      </button>

      {navItems.slice(2).map(({ id, label, icon: Icon }) => {
        const isActive = currentView === id ||
          (id === 'library' && currentView === 'playlist-detail');

        return (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`
              flex flex-col items-center gap-1 transition-colors
              ${isActive
                ? 'text-violet-500'
                : 'text-slate-400 hover:text-slate-200'
              }
            `}
          >
            <Icon
              size={24}
              className={isActive ? 'fill-current' : ''}
            />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
