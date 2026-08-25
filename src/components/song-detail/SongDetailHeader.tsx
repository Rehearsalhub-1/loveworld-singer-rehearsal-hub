"use client";

import React from 'react';
import { ChevronLeft, MoreVertical, BookOpen, Music, Users, Music2, Clock } from 'lucide-react';
import { PraiseNightSong } from '@/types/supabase';

interface SongDetailHeaderProps {
  onClose: () => void;
  displayedSongData: PraiseNightSong | null;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  isSubGroup: boolean;
  showMoreMenu: boolean;
  setShowMoreMenu: (show: boolean) => void;
  moreMenuRef: React.RefObject<HTMLDivElement | null>;
}

export const SongDetailHeader: React.FC<SongDetailHeaderProps> = ({
  onClose,
  displayedSongData,
  activeTab,
  setActiveTab,
  isSubGroup,
  showMoreMenu,
  setShowMoreMenu,
  moreMenuRef
}) => {
  return (
    <>
      {/* iOS Handle */}
      <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
        <div
          onClick={onClose}
          className="w-8 h-0.5 bg-gray-400 rounded-full cursor-pointer touch-optimized"
        ></div>
      </div>

      {/* Sticky Header */}
      <div className="relative z-[100] bg-white/80 backdrop-blur-xl border-b border-white/30 flex-shrink-0">
        <div className="absolute inset-0 overflow-hidden z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url('/images/DSC_6155_scaled.jpg')`,
              filter: 'blur(8px)',
              transform: 'scale(1.1)'
            }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 px-6 py-4">
          <div className="flex items-center mb-3">
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
          </div>

          <div className="flex items-center space-x-4 mb-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-white text-xl font-black text-center mb-4 font-poppins uppercase">
                {displayedSongData?.title}
              </h1>
              <div className="text-white text-sm space-y-1 font-poppins">
                <div className="border-b border-white/30 pb-1">
                  <span className="font-semibold uppercase">LEAD SINGER:</span> {displayedSongData?.leadSinger ? displayedSongData.leadSinger.split(',')[0].trim() : 'Unknown'}
                </div>
                <div className="flex justify-between items-center border-b border-white/30 pb-1 mb-1">
                  <span><span className="font-semibold uppercase">WRITER:</span> {displayedSongData?.writer || ''}</span>
                  <span className="font-bold">x{displayedSongData?.rehearsalCount ?? 0}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/30 pb-1 mb-1">
                  <span><span className="font-semibold uppercase">CONDUCTOR:</span> {displayedSongData?.conductor || ''}</span>
                  <span><span className="font-semibold uppercase">KEY:</span> {displayedSongData?.key || ''}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/30 pb-1 mb-1">
                  <span><span className="font-semibold uppercase">LEAD KEYBOARDIST:</span> {displayedSongData?.leadKeyboardist || ''}</span>
                  <span><span className="font-semibold uppercase">TEMPO:</span> {displayedSongData?.tempo || ''}</span>
                </div>
                <div className="flex justify-between items-center border-b border-white/30 pb-1 mb-1">
                  <span><span className="font-semibold uppercase">DRUMMER:</span> {displayedSongData?.drummer || ''}</span>
                  <span><span className="font-semibold uppercase">BASS GUITARIST:</span> {displayedSongData?.leadGuitarist || ''}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between sm:justify-center items-start sm:items-center sm:space-x-8 pt-2 w-full px-1 sm:px-0">
            <button
              onClick={() => setActiveTab('lyrics')}
              className="flex flex-col items-center space-y-1 transition-all duration-200 text-white hover:text-white flex-1 sm:flex-none px-1"
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${activeTab === 'lyrics'
                ? 'bg-white text-black'
                : 'text-white hover:bg-white/20'
                }`}>
                <BookOpen className="w-4 h-4" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Lyrics</span>
            </button>
            {!isSubGroup && (
              <button
                onClick={() => setActiveTab('solfas')}
                className="flex flex-col items-center space-y-1 transition-all duration-200 text-white hover:text-white flex-1 sm:flex-none px-1"
              >
                <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${activeTab === 'solfas'
                  ? 'bg-white text-black'
                  : 'text-white hover:bg-white/20'
                  }`}>
                  <Music className="w-4 h-4" />
                </div>
                <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Conductor's Guide</span>
              </button>
            )}
            <button
              onClick={() => setActiveTab('comments')}
              className="flex flex-col items-center space-y-1 transition-all duration-200 text-white hover:text-white flex-1 sm:flex-none px-1"
            >
              <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${activeTab === 'comments'
                ? 'bg-white text-black'
                : 'text-white hover:bg-white/20'
                }`}>
                <Users className="w-4 h-4" />
              </div>
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Comments</span>
            </button>

            {!isSubGroup && (
              <div className="flex-1 sm:flex-none flex justify-center px-1" ref={moreMenuRef}>
                <div className="relative flex flex-col items-center w-full">
                  <button
                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                    className={`flex flex-col items-center space-y-1 w-full transition-all duration-200 text-white hover:text-white ${(activeTab === 'notation' || activeTab === 'history') ? 'scale-110' : ''}`}
                  >
                    <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${(activeTab === 'notation' || activeTab === 'history')
                      ? 'bg-white text-black'
                      : 'text-white hover:bg-white/20'
                      }`}>
                      <MoreVertical className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">More</span>
                  </button>

                  {showMoreMenu && (
                    <div className="absolute top-full mt-2 sm:mt-3 right-0 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto min-w-[200px] w-max bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 sm:py-2 z-[200] animate-in fade-in zoom-in duration-200 origin-top-right sm:origin-top">
                      <button
                        onClick={() => {
                          setActiveTab('notation');
                          setShowMoreMenu(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${activeTab === 'notation' ? 'bg-slate-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Music2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium whitespace-nowrap">Solfa Notation</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setActiveTab('history');
                          setShowMoreMenu(false);
                        }}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors ${activeTab === 'history' ? 'bg-slate-50 text-blue-600' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <Clock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm font-medium whitespace-nowrap">History</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
