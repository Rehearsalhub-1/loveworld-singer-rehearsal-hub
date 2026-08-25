import React from 'react';
import { BookOpen, Music, Users, Info, Timer, Clock, RefreshCw, ChevronUp, ChevronDown, Play, Pause } from 'lucide-react';
import { HistoryEntry } from '@/types/supabase';

interface SongHistoryProps {
  activeHistoryTab: string;
  setActiveHistoryTab: (tab: any) => void;
  isLoadingHistory: boolean;
  historyEntries: HistoryEntry[];
  loadHistoryEntries: () => void;
  expandedHistoryEntries: Set<string>;
  toggleHistoryEntry: (id: string) => void;
  zoneColor: string;
  darkenColor: (color: string, percent: number) => string;
  formatDateTime: (date: string | Date) => { date: string, time: string };
  formatTime: (seconds: number) => string;
  getCommentLabel: () => string;
  historyAudioStates: { [key: string]: { isPlaying: boolean, currentTime: number, duration: number } };
  handleHistoryAudioPlayPause: (id: string) => void;
  historyAudioRefs: React.MutableRefObject<{ [key: string]: HTMLAudioElement | null }>;
  handleHistoryAudioTimeUpdate: (id: string) => void;
  handleHistoryAudioLoadedMetadata: (id: string) => void;
  handleHistoryAudioEnded: (id: string) => void;
}

export const SongHistory: React.FC<SongHistoryProps> = ({
  activeHistoryTab,
  setActiveHistoryTab,
  isLoadingHistory,
  historyEntries,
  loadHistoryEntries,
  expandedHistoryEntries,
  toggleHistoryEntry,
  zoneColor,
  darkenColor,
  formatDateTime,
  formatTime,
  getCommentLabel,
  historyAudioStates,
  handleHistoryAudioPlayPause,
  historyAudioRefs,
  handleHistoryAudioTimeUpdate,
  handleHistoryAudioLoadedMetadata,
  handleHistoryAudioEnded,
}) => {
  const getHistoryData = (type: string): HistoryEntry[] => {
    if (!historyEntries) return [];
    if (type === 'audio') {
      return historyEntries.filter(entry => !!entry.audioUrl || entry.type === 'audio');
    }
    if (type === 'metadata') {
      return historyEntries.filter(entry => ['metadata', 'song-details', 'personnel', 'music-details'].includes(entry.type));
    }
    if (type === 'solfas') {
      return historyEntries.filter(entry => ['solfas', 'solfa', "conductor's guide"].includes(entry.type?.toLowerCase()));
    }
    if (type === 'notation') {
      return historyEntries.filter(entry => ['notation', 'solfa notation'].includes(entry.type?.toLowerCase()));
    }
    if (type === 'comments') {
      return historyEntries.filter(entry => ['comments', 'comment', 'coordinator comments', 'pastor comments'].includes(entry.type?.toLowerCase()));
    }
    return historyEntries.filter(entry => entry.type === type);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'lyrics': return <BookOpen className="w-4 h-4 text-white" />;
      case 'audio': return <Music className="w-4 h-4 text-white" />;
      case 'solfas': return <BookOpen className="w-4 h-4 text-white" />;
      case 'comments': return <Users className="w-4 h-4 text-white" />;
      case 'metadata': return <Info className="w-4 h-4 text-white" />;
      case 'notation': return <Timer className="w-4 h-4 text-white" />;
      default: return <Clock className="w-4 h-4 text-white" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'lyrics': return 'bg-blue-100 text-blue-800';
      case 'audio': return 'bg-green-100 text-green-800';
      case 'solfas': return 'bg-purple-100 text-purple-800';
      case 'comments': return 'bg-orange-100 text-orange-800';
      case 'metadata': return 'bg-slate-100 text-slate-800';
      case 'notation': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const currentData = getHistoryData(activeHistoryTab);

  const renderHistoryContent = (entry: HistoryEntry) => {
    if (['song-details', 'personnel', 'music-details', 'metadata'].includes(entry.type)) {
      try {
        const newObj = JSON.parse(entry.new_value || '{}');
        const oldObj = JSON.parse(entry.old_value || '{}');
        
        return (
          <div className="space-y-2 text-xs text-slate-700">
            {Object.keys(newObj).map((key) => {
              const val = newObj[key];
              const oldVal = oldObj[key];
              return (
                <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-white rounded border border-slate-100 shadow-sm">
                  <span className="font-semibold text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                  <div className="flex items-center gap-2 mt-1 sm:mt-0 overflow-hidden">
                    {oldVal && oldVal !== val ? <span className="line-through text-red-500 truncate max-w-[150px]">{String(oldVal)}</span> : null}
                    {oldVal && oldVal !== val ? <span className="text-slate-400">→</span> : null}
                    <span className="font-medium text-green-600 truncate max-w-[200px]">{String(val || 'None')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        );
      } catch (e) {
        return <div dangerouslySetInnerHTML={{ __html: entry.new_value || '' }} className="text-black text-sm whitespace-pre-wrap font-sans" />;
      }
    }

    return <div dangerouslySetInnerHTML={{ __html: entry.new_value || '' }} className="text-black text-sm whitespace-pre-wrap font-sans" />;
  };

  return (
    <div className="space-y-4">
      {/* History Sub-categories */}
      <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
        {[
          { id: 'lyrics', label: 'Lyrics' },
          { id: 'audio', label: 'Audio' },
          { id: 'solfas', label: "Conductor's Guide" },
          { id: 'notation', label: 'Solfa Notation' },
          { id: 'comments', label: `${getCommentLabel()}'s Comments` },
          { id: 'metadata', label: 'Song Details' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveHistoryTab(tab.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${activeHistoryTab === tab.id
              ? 'text-white shadow-md'
              : 'bg-white/70 backdrop-blur-sm text-slate-700 hover:bg-white/90 hover:shadow-sm border border-slate-200/50'
              }`}
            style={activeHistoryTab === tab.id ? { backgroundColor: zoneColor } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History Content */}
      <div className="min-h-[200px]">
        {isLoadingHistory ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Loading history...</p>
          </div>
        ) : currentData.length === 0 ? (
          <div className="text-center py-8">
            {getIcon(activeHistoryTab)}
            <p className="text-gray-500 text-sm font-medium mt-2">No History for {activeHistoryTab}</p>
            <p className="text-gray-400 text-xs mt-1">Changes will appear here</p>
            <button
              onClick={() => loadHistoryEntries()}
              className="mt-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700"
              title="Refresh history"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {currentData.map((entry) => {
              const isExpanded = expandedHistoryEntries.has(entry.id);
              return (
                <div key={entry.id} className="bg-white/70 backdrop-blur-sm rounded-lg border border-slate-200/50 overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-white/80 transition-colors"
                    onClick={() => toggleHistoryEntry(entry.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: `linear-gradient(to right, ${zoneColor}, ${darkenColor(zoneColor, 10)})`
                        }}
                      >
                        {getIcon(entry.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBadgeColor(entry.type)}`}>
                            {entry.type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(entry.date).date} at {formatDateTime(entry.date).time}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-slate-900">{entry.title}</h4>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      {entry.type === 'audio' || entry.audioUrl ? (
                        <div className="bg-white/50 backdrop-blur-sm p-3 rounded border border-slate-200/50">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHistoryAudioPlayPause(entry.id);
                              }}
                              className="w-10 h-10 rounded-full text-white transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center"
                              style={{ backgroundColor: zoneColor }}
                            >
                              {historyAudioStates[entry.id]?.isPlaying ? (
                                <Pause className="w-5 h-5" />
                              ) : (
                                <Play className="w-5 h-5 ml-0.5" />
                              )}
                            </button>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-slate-800">Previous Audio Version</div>
                              <div className="text-xs text-slate-500 mt-2 bg-slate-100 px-2 py-1 rounded-full inline-block">
                                {formatTime(historyAudioStates[entry.id]?.currentTime || 0)} / {formatTime(historyAudioStates[entry.id]?.duration || 0)}
                              </div>
                            </div>
                          </div>
                          <audio
                            ref={el => {
                              if (el) historyAudioRefs.current[entry.id] = el;
                            }}
                            src={entry.new_value || entry.audioUrl}
                            onTimeUpdate={() => handleHistoryAudioTimeUpdate(entry.id)}
                            onLoadedMetadata={() => handleHistoryAudioLoadedMetadata(entry.id)}
                            onEnded={() => handleHistoryAudioEnded(entry.id)}
                            preload="none"
                          />
                        </div>
                      ) : (
                        <div className="text-sm text-black bg-white/50 backdrop-blur-sm p-3 rounded border border-slate-200/50">
                          {renderHistoryContent(entry)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SongHistory;
