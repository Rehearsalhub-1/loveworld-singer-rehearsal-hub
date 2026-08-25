"use client";

import React from 'react';
import { SongLyrics } from "./SongLyrics";
import { SongSolfas } from "./SongSolfas";
import { SongComments } from "./SongComments";
import { SongHistory } from "./SongHistory";
import { PraiseNightSong, HistoryEntry } from '@/types/supabase';

interface SongDetailTabsContentProps {
  activeTab: 'lyrics' | 'solfas' | 'comments' | 'history' | 'notation';
  displayedSongData: PraiseNightSong | null;
  toggleFullscreenLyrics: () => void;
  toggleFullscreenSolfas: () => void;
  toggleFullscreenComments: () => void;
  zoneColor: string;
  commentLabel: string;
  historyProps: {
    activeHistoryTab: any;
    setActiveHistoryTab: (tab: any) => void;
    isLoadingHistory: boolean;
    historyEntries: HistoryEntry[];
    loadHistoryEntries: () => void;
    expandedHistoryEntries: Set<string>;
    toggleHistoryEntry: (id: string) => void;
    darkenColor: (color: string, percent: number) => string;
    formatDateTime: (date: any) => any;
    formatTime: (time: number) => string;
    getCommentLabel: () => string;
    historyAudioStates: any;
    handleHistoryAudioPlayPause: (id: string) => void;
    historyAudioRefs: any;
    handleHistoryAudioTimeUpdate: (id: string) => void;
    handleHistoryAudioLoadedMetadata: (id: string) => void;
    handleHistoryAudioEnded: (id: string) => void;
  };
}

export const SongDetailTabsContent: React.FC<SongDetailTabsContentProps> = ({
  activeTab,
  displayedSongData,
  toggleFullscreenLyrics,
  toggleFullscreenSolfas,
  toggleFullscreenComments,
  zoneColor,
  commentLabel,
  historyProps
}) => {
  return (
    <div className="flex-1 px-6 py-4 overflow-y-auto" style={{ paddingBottom: '180px' }}>
      {activeTab === 'lyrics' && (
        <SongLyrics 
          isFullscreen={false}
          onToggleFullscreen={toggleFullscreenLyrics}
          lyrics={displayedSongData?.lyrics}
        />
      )}

      {activeTab === 'solfas' && (
        <SongSolfas 
          isFullscreen={false}
          onToggleFullscreen={toggleFullscreenSolfas}
          solfas={displayedSongData?.solfas}
        />
      )}

      {activeTab === 'notation' && (
        <SongSolfas 
          isFullscreen={false}
          onToggleFullscreen={toggleFullscreenSolfas}
          solfas={displayedSongData?.notation}
        />
      )}

      {activeTab === 'comments' && (
        <SongComments 
          isFullscreen={false}
          onToggleFullscreen={toggleFullscreenComments}
          comments={displayedSongData?.comments}
          zoneColor={zoneColor}
          commentLabel={commentLabel}
        />
      )}
      
      {activeTab === 'history' && (
        <SongHistory 
          activeHistoryTab={historyProps.activeHistoryTab}
          setActiveHistoryTab={historyProps.setActiveHistoryTab}
          isLoadingHistory={historyProps.isLoadingHistory}
          historyEntries={historyProps.historyEntries}
          loadHistoryEntries={historyProps.loadHistoryEntries}
          expandedHistoryEntries={historyProps.expandedHistoryEntries}
          toggleHistoryEntry={historyProps.toggleHistoryEntry}
          zoneColor={zoneColor}
          darkenColor={historyProps.darkenColor}
          formatDateTime={historyProps.formatDateTime}
          formatTime={historyProps.formatTime}
          getCommentLabel={historyProps.getCommentLabel}
          historyAudioStates={historyProps.historyAudioStates}
          handleHistoryAudioPlayPause={historyProps.handleHistoryAudioPlayPause}
          historyAudioRefs={historyProps.historyAudioRefs}
          handleHistoryAudioTimeUpdate={historyProps.handleHistoryAudioTimeUpdate}
          handleHistoryAudioLoadedMetadata={historyProps.handleHistoryAudioLoadedMetadata}
          handleHistoryAudioEnded={historyProps.handleHistoryAudioEnded}
        />
      )}
    </div>
  );
};
