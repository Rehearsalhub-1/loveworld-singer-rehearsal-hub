"use client";

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAudioLab } from './_context/AudioLabContext';

import {
  BottomNav,
  LibraryView,
  PracticeView,
  KaraokeView,
  StudioView,
  CollabView,
  CollabChatView,
  LiveSessionView,
  HomeView,
  WarmUpView,
} from './_components';

function AudioLabContent() {
  const { state, setView } = useAudioLab();
  const { currentView } = state;
  const searchParams = useSearchParams();

  // Track audiolab usage
  

  // View synchronization is now handled in AudioLabContext

  // Full-screen views (hide bottom nav)
  const fullScreenViews = ['studio', 'karaoke', 'warmup', 'live-session', 'collab-chat'];

  // Show bottom nav for all views except full-screen views
  const showBottomNav = !fullScreenViews.includes(currentView);

  // Check for active session to keep LiveSessionView mounted
  const hasActiveSession = !!state.session.activeSession;

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'library':
      case 'playlist-detail':
        return <LibraryView />;
      case 'practice':
        return <PracticeView />;
      case 'karaoke':
        return <KaraokeView />;
      case 'warmup':
        return <WarmUpView />;
      case 'studio':
        return <StudioView />;
      case 'collab':
        // If we are in 'collab' view but have a session, we might want to show it or the lobby
        return <CollabView />;
      case 'collab-chat':
        return <CollabChatView />;
      // live-session is handled outside to persist connection
      case 'live-session':
        return null; // Rendered persistently below
      default:
        return <HomeView />;
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#0f0f12]">

      <main className={`
        flex-1 overflow-y-auto overflow-x-hidden relative
        ${showBottomNav ? 'pb-24' : 'pb-0'}
      `}>
        {renderView()}

        {/* Persist LiveSessionView when session is active */}
        {hasActiveSession && (
          <div className={`absolute inset-0 z-40 ${currentView === 'live-session' ? 'block' : 'hidden'}`}>
            <LiveSessionView />
          </div>
        )}
      </main>

      {showBottomNav && <BottomNav />}
    </div>
  );
}

export default function AudioLabPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-full items-center justify-center bg-[#0f0f12]">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-400 font-medium animate-pulse">Entering AudioLab...</p>
      </div>
    }>
      <AudioLabContent />
    </Suspense>
  )
}
