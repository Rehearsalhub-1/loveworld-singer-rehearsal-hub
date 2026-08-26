"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Music, RefreshCw, 
  ArrowRight, Ban, Edit3, CheckCircle2, Clock, 
  Users, CornerDownLeft, ArrowLeftRight
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface SongScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  programId?: string;
  programTitle?: string;
  zoneId?: string;
}

const TABS = [
  { key: "schedule", label: "Schedule", icon: Calendar },
  { key: "new", label: "New", icon: Music },
  { key: "carried", label: "Carried", icon: CornerDownLeft },
  { key: "swapped", label: "Swapped", icon: ArrowLeftRight },
  { key: "renamed", label: "Renamed", icon: Edit3 },
  { key: "invalid", label: "Invalid", icon: Ban },
  { key: "submitters", label: "Eligibility", icon: Users },
];

export const SongScheduleModal: React.FC<SongScheduleModalProps> = ({
  isOpen,
  onClose,
  programId,
  programTitle,
  zoneId
}) => {
  const [activeTab, setActiveTab] = useState("schedule");
  const [scheduleData, setScheduleData] = useState<any[]>([]);
  const [newSongs, setNewSongs] = useState<any[]>([]);
  const [carriedOver, setCarriedOver] = useState<any[]>([]);
  const [swappedSongs, setSwappedSongs] = useState<any[]>([]);
  const [invalidSongs, setInvalidSongs] = useState<any[]>([]);
  const [nameChanges, setNameChanges] = useState<any[]>([]);
  const [submitters, setSubmitters] = useState<any[]>([]);
  const [eligibilityFilter, setEligibilityFilter] = useState<'eligible' | 'ineligible'>('eligible');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setLoading(true);

    const loadSchedule = async () => {
      try {
        const effectiveZone = zoneId ? `&zoneId=${encodeURIComponent(zoneId)}` : '';
        const effectiveProg = programId ? `?programId=${encodeURIComponent(programId)}` : '';
        const res = await apiClient.get<any>(`/songs/schedule${effectiveProg}${effectiveZone}`).catch(() => null);

        if (!active) return;
        const data = res?.data || {};

        setScheduleData(Array.isArray(data.dailySchedule) ? data.dailySchedule : (Array.isArray(data) ? data : []));
        setNewSongs(Array.isArray(data.newSongs) ? data.newSongs : []);
        setCarriedOver(Array.isArray(data.carriedOver) ? data.carriedOver : []);
        setSwappedSongs(Array.isArray(data.swappedSongs) ? data.swappedSongs : []);
        setInvalidSongs(Array.isArray(data.invalidSongs) ? data.invalidSongs : []);
        setNameChanges(Array.isArray(data.nameChanges) ? data.nameChanges : []);
        setSubmitters(Array.isArray(data.submitters) ? data.submitters : []);
      } catch (e) {
        console.error('[SongScheduleModal] Load error:', e);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadSchedule();
    return () => { active = false; };
  }, [isOpen, programId, zoneId]);

  if (!isOpen) return null;

  const rehearsedCount = scheduleData.filter((d: any) => d.status === "rehearsed").length;
  const pendingCount = scheduleData.filter((d: any) => d.status === "not-rehearsed" || !d.status).length;
  const totalMins = scheduleData.filter((d: any) => d.status !== "break").reduce((a: number, s: any) => a + (parseInt(s.allotment) || 0), 0);

  const eligibleSubmitters = submitters.filter((d: any) => !d.isBlocked);
  const ineligibleSubmitters = submitters.filter((d: any) => d.isBlocked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200 font-outfit">
      <div 
        className="bg-white w-full max-w-2xl max-h-[94vh] sm:max-h-[88vh] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">Song Schedule</h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium truncate max-w-[200px] sm:max-w-none">{programTitle || "Rehearsal Timeline"}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Pills Bar - Fully Responsive Horizontal Scroll */}
        <div className="w-full overflow-x-auto border-b border-slate-100 bg-white py-2 px-3 sm:px-6 flex items-center gap-1.5 flex-nowrap scrollbar-none" style={{ WebkitOverflowScrolling: 'touch' }}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            let badge = null;
            if (tab.key === 'new' && newSongs.length > 0) badge = newSongs.length;
            if (tab.key === 'carried' && carriedOver.length > 0) badge = carriedOver.length;
            if (tab.key === 'swapped' && swappedSongs.length > 0) badge = swappedSongs.length;
            if (tab.key === 'renamed' && nameChanges.length > 0) badge = nameChanges.length;
            if (tab.key === 'invalid' && invalidSongs.length > 0) badge = invalidSongs.length;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{tab.label}</span>
                {badge !== null && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-purple-600 mb-2" />
              <p className="text-xs font-medium text-slate-500">Loading schedule...</p>
            </div>
          ) : activeTab === 'schedule' ? (
            <div>
              {/* Metrics Summary Row */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3.5 text-center">
                  <span className="text-2xl font-black text-emerald-600">{rehearsedCount}</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mt-0.5">Rehearsed</p>
                </div>
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-center">
                  <span className="text-2xl font-black text-rose-600">{pendingCount}</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 mt-0.5">Pending</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-center">
                  <span className="text-2xl font-black text-slate-800">{totalMins}m</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Total Time</p>
                </div>
              </div>

              {/* Timeline List */}
              {scheduleData.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40 text-purple-500" />
                  <p className="text-sm font-medium text-slate-600">No daily schedule set for this session.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {scheduleData.map((s, i) => (
                    <div 
                      key={s.id || i}
                      className={`flex items-start gap-3 py-2 ${s.status === 'not-rehearsed' ? 'opacity-80' : ''}`}
                    >
                      {/* Time Column */}
                      <div className="w-12 text-right pt-3">
                        <span className="text-xs font-bold text-slate-500">{s.time || '--:--'}</span>
                      </div>

                      {/* Timeline Node */}
                      <div className="flex flex-col items-center pt-3">
                        <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                          s.status === 'break' 
                            ? 'bg-slate-300' 
                            : s.status === 'rehearsed' 
                              ? 'bg-emerald-500' 
                              : 'bg-rose-500'
                        }`} />
                        {i < scheduleData.length - 1 && (
                          <div className="w-0.5 flex-1 bg-slate-200 my-1 min-h-[30px]" />
                        )}
                      </div>

                      {/* Card */}
                      <div className={`flex-1 rounded-2xl p-4 mb-2 border transition ${
                        s.status === 'break' 
                          ? 'bg-slate-50 border-slate-200/60' 
                          : 'bg-white border-slate-200 shadow-sm hover:border-purple-200'
                      }`}>
                        <div className="flex items-start justify-between gap-3">
                          <h4 className={`text-sm font-bold flex-1 ${
                            s.status === 'break' ? 'italic font-medium text-slate-500' : 'text-slate-900'
                          }`}>
                            {s.title || s.songTitle}
                          </h4>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {s.key && s.key !== '—' && (
                              <span className="text-xs font-semibold text-slate-500">Key {s.key}</span>
                            )}
                            {s.allotment && (
                              <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                                {s.allotment}m
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                              s.status === 'break'
                                ? 'bg-slate-100 text-slate-600'
                                : s.status === 'rehearsed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                            }`}>
                              {s.status === 'break' ? 'Break' : s.status === 'rehearsed' ? 'Rehearsed' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        {s.note && (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500 italic">
                            {s.note}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'new' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">New Songs Submitted ({newSongs.length})</h3>
              {newSongs.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No new submissions.</p>
              ) : (
                newSongs.map((s, idx) => (
                  <div key={s.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-slate-900 text-sm">{s.title}</h4>
                      <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md font-semibold">
                        Key: {s.key || '?'} · {s.duration || '--'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                      <span><strong>By:</strong> {s.submittedBy || 'Unknown'}</span>
                      <span><strong>Date:</strong> {s.submittedOn || 'Recent'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'carried' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Carried Over Songs ({carriedOver.length})</h3>
              {carriedOver.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No carried over songs.</p>
              ) : (
                carriedOver.map((s, idx) => (
                  <div key={s.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-bold text-slate-900 text-sm">{s.title}</h4>
                      <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-md font-bold">
                        {s.rehearsalCount || 1} prior rehearsals
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                      <span><strong>From:</strong> {s.originalProgram || 'Previous Session'}</span>
                      <span><strong>Key:</strong> {s.key || '—'}</span>
                    </div>
                    {s.reason && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border-l-2 border-slate-300 text-xs text-slate-600 italic">
                        {s.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'swapped' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Swapped Songs ({swappedSongs.length})</h3>
              {swappedSongs.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No swapped songs.</p>
              ) : (
                swappedSongs.map((s, idx) => (
                  <div key={s.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold line-through text-rose-500">{s.original}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-bold text-emerald-600">{s.replacement}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                      <span><strong>Swapped by:</strong> {s.swappedBy || 'Coordinator'}</span>
                      <span><strong>Date:</strong> {s.swappedOn || 'Recent'}</span>
                    </div>
                    {s.reason && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border-l-2 border-slate-300 text-xs text-slate-600 italic">
                        {s.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'renamed' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Song Name Changes ({nameChanges.length})</h3>
              {nameChanges.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No name changes.</p>
              ) : (
                nameChanges.map((s, idx) => (
                  <div key={s.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium italic text-slate-500">{s.from}</span>
                      <ArrowRight className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-bold text-slate-900">{s.to}</span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                      <span><strong>Changed by:</strong> {s.changedBy || 'Coordinator'}</span>
                      <span><strong>Date:</strong> {s.changedOn || 'Recent'}</span>
                    </div>
                    {s.reason && (
                      <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border-l-2 border-slate-300 text-xs text-slate-600 italic">
                        {s.reason}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : activeTab === 'invalid' ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Invalid Songs ({invalidSongs.length})</h3>
              {invalidSongs.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No invalid songs.</p>
              ) : (
                invalidSongs.map((s, idx) => (
                  <div key={s.id || idx} className="p-4 rounded-2xl bg-white border-2 border-rose-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold text-rose-600 line-through">{s.title}</h4>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md">
                        {s.invalidatedBy || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-2">
                      {s.replacedBy && <span><strong>Replaced by:</strong> {s.replacedBy}</span>}
                      <span><strong>Date:</strong> {s.date || 'Recent'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setEligibilityFilter('eligible')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                    eligibilityFilter === 'eligible'
                      ? 'bg-purple-50 text-purple-700 border-purple-300 shadow-sm'
                      : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
                  }`}
                >
                  Eligible ({eligibleSubmitters.length})
                </button>
                <button
                  onClick={() => setEligibilityFilter('ineligible')}
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition border ${
                    eligibilityFilter === 'ineligible'
                      ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                      : 'bg-slate-100 text-slate-600 border-transparent hover:bg-slate-200'
                  }`}
                >
                  Ineligible ({ineligibleSubmitters.length})
                </button>
              </div>

              {eligibilityFilter === 'eligible' ? (
                eligibleSubmitters.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No eligible submitters listed.</p>
                ) : (
                  eligibleSubmitters.map((p, idx) => (
                    <div key={p.id || idx} className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                          <p className="text-xs text-slate-500">{p.role}</p>
                        </div>
                        <div className="text-xs text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                          <span>Usage: </span>
                          <strong className="text-purple-600 text-sm">{p.submissions || 0}</strong>
                          <span> / {p.quota || 0}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                        <div 
                          className={`h-full rounded-full ${
                            (p.submissions || 0) >= (p.quota || 1) ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${Math.min(100, ((p.submissions || 0) / (p.quota || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                )
              ) : (
                ineligibleSubmitters.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">No ineligible submitters.</p>
                ) : (
                  ineligibleSubmitters.map((p, idx) => (
                    <div key={p.id || idx} className="p-4 rounded-2xl bg-white border-2 border-rose-200 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{p.name}</h4>
                          <p className="text-xs text-slate-500">{p.role}</p>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-2.5 py-1 rounded-md">
                          Blocked since {p.since || 'Unknown'}
                        </span>
                      </div>
                      {p.reason && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border-l-2 border-slate-300 text-xs text-slate-600 italic">
                          {p.reason}
                        </div>
                      )}
                    </div>
                  ))
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SongScheduleModal;
