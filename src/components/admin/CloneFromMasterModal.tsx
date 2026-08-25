"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Music, X } from 'lucide-react';
import { MasterLibraryService, MasterSong } from '@/lib/master-library';
import CustomLoader from '@/components/CustomLoader';
import { matchesSearchTokens } from '@/utils/string-utils';

interface CloneFromMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (song: any) => void;
  praiseNightId: string;
  defaultCategory?: string;
}

export default function CloneFromMasterModal({
  isOpen,
  onClose,
  onClone,
  praiseNightId,
  defaultCategory
}: CloneFromMasterModalProps) {
  const [songs, setSongs] = useState<MasterSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadMasterSongs();
    }
  }, [isOpen]);

  const loadMasterSongs = async () => {
    setLoading(true);
    try {
      const data = await MasterLibraryService.getMasterSongs();
      setSongs((data as any) || []);
    } catch {
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredSongs = useMemo(() => {
    return songs.filter((song) => {
      if (!searchTerm.trim()) return true;
      return matchesSearchTokens(
        [
          song.title,
          song.writer,
          song.leadSinger,
          song.category,
          song.key
        ],
        searchTerm
      );
    });
  }, [songs, searchTerm]);

  const handleCloneClick = (masterSong: MasterSong) => {
    const clonedSong: any = {
      title: masterSong.title,
      status: 'unheard',
      category: defaultCategory || masterSong.category || '',
      categories: masterSong.categories || (masterSong.category ? [masterSong.category] : []),
      praiseNightId: praiseNightId,
      leadSinger: masterSong.leadSinger || '',
      writer: masterSong.writer || '',
      conductor: masterSong.conductor || '',
      key: masterSong.key || '',
      tempo: masterSong.tempo || '',
      lyrics: masterSong.lyrics || '',
      solfas: masterSong.solfa || '',
      audioFile: ((masterSong.audioUrls || {}) || {})?.full || masterSong.audioFile || '',
      audioUrls: (masterSong.audioUrls || {}) || {},
      customParts: masterSong.customParts || [],
      availableParts: (masterSong.audioUrls || {}) ? Object.keys((masterSong.audioUrls || {})).filter(k => (masterSong.audioUrls || {})[k]) : []
    };

    onClone(clonedSong);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl">
              <Music className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clone from Master Library</h2>
              <p className="text-sm text-slate-500">Select a song to add to this Praise Night</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100 bg-white sm:px-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, writer, or singer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
          {loading ? (
            <div className="flex flex-col flex-1 items-center justify-center p-12 h-64">
              <CustomLoader />
              <p className="mt-4 text-sm text-slate-500 font-medium">Loading master library...</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center h-64">
              <Music className="w-12 h-12 text-slate-300 mb-3" />
              <h3 className="text-base font-semibold text-slate-700">No songs found</h3>
              <p className="text-sm text-slate-400 mt-1">Try adjusting your search</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSongs.map((song) => (
                <div 
                  key={song.id} 
                  className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-purple-300 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="mb-3">
                    <h3 className="font-bold text-slate-900 text-base">{song.title}</h3>
                    {(song.writer || song.leadSinger) && (
                      <p className="text-xs text-slate-500 mt-1">
                        {song.writer && <span>Written by: {song.writer}</span>}
                        {song.writer && song.leadSinger && <span> • </span>}
                        {song.leadSinger && <span>Lead: {song.leadSinger}</span>}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 text-xs mb-4">
                    {song.key && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium border border-slate-200">
                        Key: {song.key}
                      </span>
                    )}
                    {song.category && (
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium border border-slate-200 truncate max-w-[120px]" title={song.category}>
                        {song.category}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-auto">
                    <button
                      onClick={() => handleCloneClick(song)}
                      className="w-full py-2 bg-purple-50 text-purple-700 font-semibold rounded-lg border border-purple-200 hover:bg-purple-100 hover:text-purple-800 transition-colors"
                    >
                      Clone to Program
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
