"use client";

const SubGroupDatabaseService = { 
  getSubGroupRehearsals: async (..._args: any[]): Promise<any[]> => [],
  getSubGroupSongs: async (..._args: any[]): Promise<any[]> => [],
 subscribeToSubGroup: (..._args: any[]) => () => {} };

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Music,
  Users,
  RefreshCw,
  Play
} from 'lucide-react';
import { ScreenHeader } from '@/components/ScreenHeader';


import { BackendAPI } from '@/lib/api-client';
export interface SubGroupRehearsal { id: string; name: string; date: string; time?: string; location?: string; songIds?: string[]; }

import RehearsalScopeBadge from '@/components/RehearsalScopeBadge';
import { useZone } from '@/hooks/useZone';

function SubGroupRehearsalContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentZone } = useZone();

  const rehearsalId = searchParams?.get('id');

  const [rehearsal, setRehearsal] = useState<SubGroupRehearsal | null>(null);
  const [songs, setSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (rehearsalId) {
      loadRehearsal();
    }
  }, [rehearsalId]);

  const loadRehearsal = async () => {
    if (!rehearsalId) return;

    setLoading(true);
    setError(null);

    try {
      // Get rehearsal details
      const rehearsalData = await BackendAPI.generic.get('subgroup_praise_nights', rehearsalId).then(r => r.data as any);
      if (!rehearsalData) {
        setError('Rehearsal not found');
        return;
      }
      setRehearsal(rehearsalData);

      // Get songs for this rehearsal
      if (rehearsalData.songIds && rehearsalData.songIds.length > 0) {
        const songsData = await SubGroupDatabaseService.getSubGroupSongs(rehearsalData.subGroupId);
        const rehearsalSongs = songsData.filter((s: any) => rehearsalData.songIds?.includes(s.id));
        setSongs(rehearsalSongs);
      }
    } catch (err) {
 console.error('Error loading rehearsal:', err);
      setError('Failed to load rehearsal');
    } finally {
      setLoading(false);
    }
  };

  const zoneColor = currentZone?.themeColor || '#9333EA';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error || !rehearsal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Rehearsal not found'}</p>
          <button
            onClick={() => router.push('/pages/rehearsals')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200">
        <ScreenHeader
          title={rehearsal.name}
          showBackButton={true}
          backPath="/pages/rehearsals"
          rightImageSrc="/logo.png"
        />
        {/* Rehearsal Scope Badge moved to a sub-header or integrated if possible, but for now just standardization */}
        <div className="px-4 py-1 bg-white/50 backdrop-blur-sm border-b border-slate-100 flex justify-center">
          <RehearsalScopeBadge scope="subgroup" size="sm" />
        </div>
      </div>


      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Rehearsal Info Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex items-start gap-4">
            {/* Date Badge */}
            <div
              className="w-14 h-14 rounded-xl flex flex-col items-center justify-center text-white flex-shrink-0"
              style={{ backgroundColor: '#9333EA' }}
            >
              <span className="text-xs font-medium uppercase">
                {new Date(rehearsal.date).toLocaleDateString('en-US', { month: 'short' })}
              </span>
              <span className="text-xl font-bold leading-none">
                {new Date(rehearsal.date).getDate()}
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">{rehearsal.name}</h2>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(rehearsal.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}</span>
                </div>

                {rehearsal.location && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4" />
                    <span>{rehearsal.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Music className="w-4 h-4" />
                  <span>{songs.length} song{songs.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Songs List */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Songs</h3>

          {songs.length === 0 ? (
            <div className="bg-white/70 rounded-2xl p-6 text-center">
              <Music className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No songs added yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {songs.map((song, index) => (
                <div
                  key={song.id}
                  className="bg-white/70 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 hover:bg-white/90 transition-colors"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-medium"
                    style={{ backgroundColor: zoneColor }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{song.title}</p>
                    {song.writer && (
                      <p className="text-xs text-slate-500 truncate">{song.writer}</p>
                    )}
                  </div>
                  {song.audioFile && (
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                      <Play className="w-4 h-4 text-slate-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SubGroupRehearsalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    }>
      <SubGroupRehearsalContent />
    </Suspense>
  );
}
