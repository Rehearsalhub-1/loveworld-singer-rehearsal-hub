"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Loader2, Plus, Clock, Archive, ArrowLeft, Trash2, Edit2, Check, 
  Coffee, Hourglass, Star, Calendar, ChevronDown, CheckCircle2, 
  Search, AlertCircle, Layers, Users, X, MoreVertical
} from 'lucide-react';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { apiClient } from '@/lib/api-client';

const useSchedulingBoard = () => {
  const { selectedZoneId, isGlobalView, selectedZone } = useAdminZone();
  const effectiveZoneId = isGlobalView ? null : (selectedZoneId || selectedZone?.id || null);

  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<any[]>([]);
  const [activeProgramId, setActiveProgramId] = useState<string>('');
  const [viewHistory, setViewHistory] = useState(false);

  const loadPrograms = useCallback(async () => {
    try {
      setLoading(true);
      const zoneQuery = effectiveZoneId ? `?zoneId=${encodeURIComponent(effectiveZoneId)}` : '';
      const res = await apiClient.get<any>(`/schedule${zoneQuery}`);
      let data: any[] = [];
      if (Array.isArray(res)) {
        data = res;
      } else if (res?.data && Array.isArray(res.data)) {
        data = res.data;
      } else if (res?.programs && Array.isArray(res.programs)) {
        data = res.programs;
      }

      setPrograms(data);
      if (data.length > 0) {
        setActiveProgramId((prev) => (prev && data.some((d: any) => d.id === prev) ? prev : data[0].id));
      } else {
        setActiveProgramId('');
      }
    } catch (err) {
      console.error('Failed to load schedule programs:', err);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveZoneId]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const activeProgram = programs.find((p) => p.id === activeProgramId) || programs[0] || null;

  const createProgram = async (name: string) => {
    try {
      const res = await apiClient.post<any>('/schedule', { 
        name,
        zoneId: effectiveZoneId || 'global'
      });
      const newProg = res?.data || (res?.id ? res : null);
      if (newProg && newProg.id) {
        setPrograms((prev) => [newProg, ...prev]);
        setActiveProgramId(newProg.id);
      } else {
        await loadPrograms();
      }
    } catch (err) {
      console.error('Failed to create program:', err);
    }
  };

  const updateProgramData = async (payloadOrProgId: any, maybePayload?: any) => {
    const programId = typeof payloadOrProgId === 'string' ? payloadOrProgId : activeProgramId;
    const payload = typeof payloadOrProgId === 'string' ? maybePayload : payloadOrProgId;
    if (!programId) return;
    try {
      setPrograms((prev) => prev.map((p) => (p.id === programId ? { ...p, ...payload } : p)));
      await apiClient.patch(`/schedule/${programId}`, payload);
    } catch (err) {
      console.error('Failed to update schedule data:', err);
    }
  };

  const toggleArchive = async (maybeProgId?: any) => {
    const programId = (typeof maybeProgId === 'string' && maybeProgId) ? maybeProgId : activeProgramId;
    const prog = programs.find((p) => p.id === programId);
    if (!prog) return;
    const nextArchived = !prog.isArchived;
    await updateProgramData(programId, { isArchived: nextArchived });
  };

  const deleteActiveProgram = async () => {
    if (!activeProgramId) return;
    if (!confirm('Are you sure you want to delete this schedule program?')) return;
    try {
      await apiClient.delete(`/schedule/${activeProgramId}`);
      const remaining = programs.filter((p) => p.id !== activeProgramId);
      setPrograms(remaining);
      setActiveProgramId(remaining[0]?.id || '');
    } catch (err) {
      console.error('Failed to delete program:', err);
    }
  };

  const renameActiveProgram = async (newName: string) => {
    if (!activeProgramId || !newName.trim()) return;
    await updateProgramData(activeProgramId, { name: newName.trim() });
  };

  const setCurrentProgram = async (weekId?: string, dayId?: string) => {
    if (!activeProgramId) return;
    await updateProgramData(activeProgramId, {
      isCurrent: true,
      ...(weekId ? { currentWeekId: weekId } : {}),
      ...(dayId ? { currentDayId: dayId } : {})
    });
  };

  return {
    loading,
    canEdit: true,
    viewHistory,
    setViewHistory,
    programs,
    activeProgramId,
    setActiveProgramId,
    activeProgram,
    createProgram,
    updateProgramData,
    toggleArchive,
    deleteActiveProgram,
    renameActiveProgram,
    setCurrentProgram,
    selectedZone,
    loadPrograms
  };
};

const TABS = [
  { id: 'schedule', label: 'Daily Schedule' },
  { id: 'new', label: 'New Songs' },
  { id: 'carried', label: 'Carried Over' },
  { id: 'swapped', label: 'Swapped' },
  { id: 'renamed', label: 'Name Changes' },
  { id: 'invalid', label: 'Invalid' },
  { id: 'eligibility', label: 'Eligibility' },
];

export default function SchedulingBoardSection() {
  const {
    loading, canEdit, viewHistory, setViewHistory,
    programs, activeProgramId, setActiveProgramId, activeProgram,
    createProgram, updateProgramData, toggleArchive, deleteActiveProgram, renameActiveProgram, setCurrentProgram, selectedZone
  } = useSchedulingBoard();

  const [activeTab, setActiveTab] = useState('schedule');
  const [showCreateProg, setShowCreateProg] = useState(false);
  const [newProgName, setNewProgName] = useState('');

  const [showEditProg, setShowEditProg] = useState(false);
  const [editProgName, setEditProgName] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [selectedWeekId, setSelectedWeekId] = useState<string>('default_week_1');
  const [selectedDayId, setSelectedDayId] = useState<string>('default_day_1');
  const [eligibilityFilter, setEligibilityFilter] = useState<'eligible' | 'ineligible'>('eligible');
  const [searchFilter, setSearchFilter] = useState('');

  const rawWeeks = activeProgram?.weeks || [
    { id: 'default_week_1', name: 'Week 1' }
  ];
  const weeks = Array.isArray(rawWeeks) && rawWeeks.length > 0
    ? rawWeeks
    : [{ id: 'default_week_1', name: 'Week 1' }];

  const rawDays = activeProgram?.days || [
    { id: 'default_day_1', weekId: weeks[0]?.id || 'default_week_1', name: 'Day 1' }
  ];
  const days = Array.isArray(rawDays) && rawDays.length > 0
    ? rawDays
    : [{ id: 'default_day_1', weekId: weeks[0]?.id || 'default_week_1', name: 'Day 1' }];

  // Sync selected week & day with active program
  useEffect(() => {
    if (activeProgram) {
      const activeWeekExists = weeks.some((w: any) => w.id === selectedWeekId);
      if (!activeWeekExists && weeks.length > 0) {
        setSelectedWeekId(weeks[0].id);
      }
    }
  }, [activeProgram, weeks, selectedWeekId]);

  const activeWeekDays = useMemo(() => {
    return days.filter((d: any) => (d.weekId || 'default_week_1') === selectedWeekId);
  }, [days, selectedWeekId]);

  useEffect(() => {
    if (activeWeekDays.length > 0) {
      const activeDayExists = activeWeekDays.some((d: any) => d.id === selectedDayId);
      if (!activeDayExists) {
        setSelectedDayId(activeWeekDays[0].id);
      }
    } else {
      setSelectedDayId('');
    }
  }, [activeWeekDays, selectedDayId]);

  // Filter active vs archived programs
  const displayedPrograms = useMemo(() => {
    return programs.filter(p => viewHistory ? p.isArchived : !p.isArchived);
  }, [programs, viewHistory]);

  const themeColor = selectedZone?.themeColor || '#9333ea';

  const handleAddWeek = () => {
    const nextWeekNum = weeks.length + 1;
    const newWeekId = `week_${Date.now()}`;
    const newWeek = { id: newWeekId, name: `Week ${nextWeekNum}` };
    const newDayId = `day_${Date.now()}`;
    const newDay = { id: newDayId, weekId: newWeekId, name: 'Day 1' };
    
    updateProgramData({
      weeks: [...weeks, newWeek],
      days: [...days, newDay]
    });
    setSelectedWeekId(newWeekId);
    setSelectedDayId(newDayId);
  };

  const handleAddDay = () => {
    const nextDayNum = activeWeekDays.length + 1;
    const newDayId = `day_${Date.now()}`;
    const newDay = { id: newDayId, weekId: selectedWeekId, name: `Day ${nextDayNum}` };
    
    updateProgramData({
      days: [...days, newDay]
    });
    setSelectedDayId(newDayId);
  };

  const handleDeleteWeek = (weekId: string) => {
    if (weeks.length <= 1) {
      alert("A schedule must have at least one week.");
      return;
    }
    if (!confirm("Delete this week and all associated days and schedules?")) return;
    const updatedWeeks = weeks.filter((w: any) => w.id !== weekId);
    const updatedDays = days.filter((d: any) => (d.weekId || 'default_week_1') !== weekId);
    const updatedSchedules = (activeProgram?.dailySchedules || []).filter((s: any) => (s.weekId || 'default_week_1') !== weekId);
    
    updateProgramData({
      weeks: updatedWeeks,
      days: updatedDays,
      dailySchedules: updatedSchedules
    });
    if (selectedWeekId === weekId && updatedWeeks.length > 0) {
      setSelectedWeekId(updatedWeeks[0].id);
    }
  };

  const handleDeleteDay = (dayId: string) => {
    if (activeWeekDays.length <= 1) {
      alert("A week must have at least one day.");
      return;
    }
    if (!confirm("Delete this day? All schedule items under this day will also be removed.")) return;
    const updatedDays = days.filter((d: any) => d.id !== dayId);
    const updatedSchedules = (activeProgram?.dailySchedules || []).filter((s: any) => (s.dayId || 'default_day_1') !== dayId);
    updateProgramData({
      days: updatedDays,
      dailySchedules: updatedSchedules
    });
    if (selectedDayId === dayId && updatedDays.length > 0) {
      const remainingForWeek = updatedDays.filter((d: any) => (d.weekId || 'default_week_1') === selectedWeekId);
      if (remainingForWeek.length > 0) {
        setSelectedDayId(remainingForWeek[0].id);
      }
    }
  };

  const getArrayNameForTab = (tab: string) => {
    switch(tab) {
      case 'schedule': return 'dailySchedules';
      case 'new': return 'newSongs';
      case 'carried': return 'carriedOver';
      case 'swapped': return 'swapped';
      case 'renamed': return 'nameChanges';
      case 'invalid': return 'invalidSongs';
      case 'eligibility': return 'submitters';
      default: return '';
    }
  };

  const handleSaveItem = async () => {
    if (!activeProgram) return;
    const arrayName = getArrayNameForTab(activeTab);
    const currentArray = (activeProgram as any)[arrayName] || [];
    
    let updatedArray;
    if (editingItemId) {
      updatedArray = currentArray.map((i: any) => i.id === editingItemId ? { 
        ...i, 
        ...formData,
        weekId: activeTab === 'schedule' ? (formData.weekId || i.weekId || selectedWeekId || 'default_week_1') : undefined,
        dayId: activeTab === 'schedule' ? (formData.dayId || i.dayId || selectedDayId || 'default_day_1') : undefined
      } : i);
    } else {
      const newItem = { 
        id: Date.now().toString(), 
        ...formData,
        weekId: activeTab === 'schedule' ? (formData.weekId || selectedWeekId || 'default_week_1') : undefined,
        dayId: activeTab === 'schedule' ? (formData.dayId || selectedDayId || 'default_day_1') : undefined
      };
      updatedArray = [...currentArray, newItem];
    }
    
    await updateProgramData({ [arrayName]: updatedArray });
    setShowAddModal(false);
    setFormData({});
    setEditingItemId(null);
  };

  const handleDeleteItem = async (itemId: string, arrayName: string) => {
    if (!activeProgram || !confirm('Delete this item?')) return;
    const currentArray = (activeProgram as any)[arrayName] || [];
    await updateProgramData({ [arrayName]: currentArray.filter((i: any) => i.id !== itemId) });
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-slate-50/50 overflow-hidden font-sans">
      {/* ── 1. EXECUTIVE HEADER & CONTROLS ── */}
      <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Schedule Manager</h1>
            <p className="text-xs text-slate-500 font-medium">Rehearsal timelines, daily itineraries, and song allocations.</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* History Toggle */}
          <button 
            onClick={() => setViewHistory(!viewHistory)}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
              viewHistory 
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {viewHistory ? <ArrowLeft className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
            {viewHistory ? 'Active Schedules' : 'Archive'}
          </button>

          {canEdit && !viewHistory && (
            <button
              onClick={() => { setNewProgName(''); setShowCreateProg(true); }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-200 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" /> New Program
            </button>
          )}
        </div>
      </div>

      {/* ── 2. PROGRAM SELECTOR STUDIO BAR ── */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Program Dropdown Selector */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <label className="text-[11px] font-black uppercase tracking-wider text-slate-400 shrink-0">Program:</label>
          {displayedPrograms.length > 0 ? (
            <div className="relative flex-1 max-w-md">
              <select
                value={activeProgramId}
                onChange={(e) => setActiveProgramId(e.target.value)}
                className="w-full pl-3.5 pr-9 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer truncate"
              >
                {displayedPrograms.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isCurrent ? '★ (Current Active)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          ) : (
            <span className="text-sm font-bold text-slate-400 italic">No {viewHistory ? 'archived' : 'active'} programs found</span>
          )}

          {activeProgram?.isCurrent && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-black rounded-lg border border-amber-200 shrink-0">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Current
            </span>
          )}
        </div>

        {/* Right: Quick Program Actions */}
        {activeProgram && canEdit && (
          <div className="flex items-center gap-2 shrink-0">
            {!viewHistory && (
              <button 
                onClick={() => { setEditProgName(activeProgram.name); setShowEditProg(true); }}
                className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl border border-slate-200 transition-colors"
                title="Rename Program"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            {!activeProgram.isCurrent && !viewHistory && (
              <button 
                onClick={() => setCurrentProgram()} 
                className="px-3 py-1.5 bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                title="Set as Current Rehearsal Schedule"
              >
                <Star className="w-3.5 h-3.5" /> Make Current
              </button>
            )}

            <button 
              onClick={() => toggleArchive()} 
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                viewHistory 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              {viewHistory ? 'Restore' : 'Archive'}
            </button>

            <button 
              onClick={deleteActiveProgram} 
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl border border-slate-200 transition-colors"
              title="Delete Program"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {activeProgram ? (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ── 3. STUDIO TAB NAVIGATION ── */}
          <div className="flex border-b border-slate-200 bg-white px-4 sm:px-6 shrink-0 overflow-x-auto scrollbar-hide">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-3.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap shrink-0 ${
                  activeTab === t.id 
                    ? 'border-purple-600 text-purple-700' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
                style={{
                  borderColor: activeTab === t.id ? themeColor : undefined,
                  color: activeTab === t.id ? themeColor : undefined
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ── 4. TIMELINE & CONTENT AREA ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
            
            {/* WEEKS & DAYS TIMELINE SELECTOR (For Daily Schedule tab) */}
            {activeTab === 'schedule' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-4">
                {/* Weeks Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 shrink-0">WEEKS:</span>
                    {weeks.map((w: any) => (
                      <div key={w.id} className="relative group shrink-0">
                        <button
                          onClick={() => setSelectedWeekId(w.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedWeekId === w.id
                              ? 'bg-slate-900 text-white shadow-sm'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                        >
                          {w.name}
                        </button>
                        {canEdit && !viewHistory && weeks.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteWeek(w.id); }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                            title="Delete Week"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {canEdit && !viewHistory && (
                    <button
                      onClick={handleAddWeek}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1 transition-colors self-start shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Week
                    </button>
                  )}
                </div>

                {/* Days Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mr-2 shrink-0">DAYS:</span>
                    {activeWeekDays.map((d: any) => (
                      <div key={d.id} className="relative group shrink-0">
                        <button
                          onClick={() => setSelectedDayId(d.id)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            selectedDayId === d.id
                              ? 'bg-purple-600 text-white shadow-sm'
                              : 'bg-purple-50 hover:bg-purple-100 text-purple-800'
                          }`}
                        >
                          {d.name}
                        </button>
                        {canEdit && !viewHistory && activeWeekDays.length > 1 && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteDay(d.id); }}
                            className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                            title="Delete Day"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    {activeWeekDays.length === 0 && (
                      <span className="text-xs text-slate-400 italic">No days added for this week</span>
                    )}
                  </div>

                  {canEdit && !viewHistory && (
                    <button
                      onClick={handleAddDay}
                      className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 flex items-center gap-1 transition-colors self-start shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Day
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* TAB ACTIONS HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">{TABS.find(t=>t.id === activeTab)?.label}</h2>
                <p className="text-xs text-slate-500 font-medium">Manage entries for this section</p>
              </div>

              {canEdit && !viewHistory && (
                <button 
                  onClick={() => { setFormData({}); setEditingItemId(null); setShowAddModal(true); }} 
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-transform active:scale-95 self-start"
                >
                  <Plus className="w-4 h-4" /> Add Item
                </button>
              )}
            </div>

            {/* TAB DATA CONTENT */}
            {(() => {
              const arrayName = getArrayNameForTab(activeTab);
              const data = (activeProgram as any)[arrayName] || [];

              const filteredData = activeTab === 'schedule'
                ? data.filter((item: any) => {
                    const itemWeekId = item.weekId || 'default_week_1';
                    const itemDayId = item.dayId || 'default_day_1';
                    return itemWeekId === selectedWeekId && itemDayId === selectedDayId;
                  })
                : activeTab === 'eligibility'
                ? data.filter((item: any) => eligibilityFilter === 'eligible' ? !item.isBlocked : item.isBlocked)
                : data;

              if (filteredData.length === 0) {
                return (
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center shadow-xs">
                    <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-3 text-purple-600 border border-purple-100">
                      <Clock className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800">No {TABS.find(t=>t.id === activeTab)?.label.toLowerCase()} yet</h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto font-medium">
                      {activeTab === 'schedule'
                        ? 'No items have been scheduled for this week and day. Click "Add Item" to add one.'
                        : 'Click the "Add Item" button above to add records to this section.'}
                    </p>
                  </div>
                );
              }

              const showStats = activeTab === 'schedule';
              const rehearsedCount = filteredData.filter((i: any) => i.status === 'rehearsed').length;
              const pendingCount = filteredData.filter((i: any) => i.status === 'not-rehearsed' || !i.status).length;
              const breakCount = filteredData.filter((i: any) => i.status === 'break').length;
              const totalMins = filteredData.filter((i: any) => i.status !== 'break').reduce((a: number, s: any) => a + (parseInt(s.allotment) || 0), 0);

              return (
                <div className="space-y-4">
                  {/* KPI Stat Cards */}
                  {showStats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                        <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
                          <Check className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rehearsed</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{rehearsedCount}</span>
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                        <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center border border-rose-100 shrink-0">
                          <Clock className="w-4 h-4 text-rose-600" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{pendingCount}</span>
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                        <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
                          <Coffee className="w-4 h-4 text-amber-600" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Breaks</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{breakCount}</span>
                        </div>
                      </div>

                      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center border border-purple-100 shrink-0">
                          <Hourglass className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Duration</span>
                          <span className="text-lg font-black text-slate-800 leading-none">{totalMins}m</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* List of Items */}
                  <div className="space-y-2.5">
                    {filteredData.map((item: any) => (
                      <div 
                        key={item.id} 
                        className="bg-white p-4 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-xs hover:border-purple-300 transition-colors group"
                      >
                        <div className="flex-1 w-full min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {item.time && (
                              <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 font-black text-[11px] rounded-lg border border-slate-200 tabular-nums">
                                {item.time}
                              </span>
                            )}
                            <h4 className="font-bold text-slate-900 text-base truncate">
                              {item.title || item.original || item.from || item.name}
                              {item.replacement && <span className="text-emerald-600 ml-2">→ {item.replacement}</span>}
                              {item.to && <span className="text-purple-600 ml-2">→ {item.to}</span>}
                            </h4>
                          </div>

                          <div className="flex flex-wrap gap-2 mt-2 items-center">
                            {item.status && (
                              <button 
                                onClick={() => {
                                  if (canEdit && !viewHistory) {
                                    const currentStatus = item.status || 'not-rehearsed';
                                    const newStatus = 
                                      currentStatus === 'not-rehearsed' ? 'rehearsed' :
                                      currentStatus === 'rehearsed' ? 'break' :
                                      'not-rehearsed';
                                    const currentArray = (activeProgram as any)[arrayName] || [];
                                    const updatedArray = currentArray.map((i: any) => i.id === item.id ? { ...i, status: newStatus } : i);
                                    updateProgramData({ [arrayName]: updatedArray });
                                  }
                                }}
                                disabled={!canEdit || viewHistory}
                                title="Click to toggle status (Pending → Rehearsed → Break)"
                                className={`px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-transform active:scale-95 ${
                                  item.status === 'rehearsed' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                                  item.status === 'break' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' :
                                  'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                } ${canEdit && !viewHistory ? 'cursor-pointer' : 'cursor-default'}`}
                              >
                                {item.status === 'rehearsed' ? 'REHEARSED' : item.status === 'break' ? 'BREAK' : 'PENDING'}
                              </button>
                            )}
                            {item.key && (
                              <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 font-bold text-xs rounded-lg">
                                Key: {item.key}
                              </span>
                            )}
                            {item.allotment && (
                              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-xs rounded-lg">
                                {item.allotment} mins
                              </span>
                            )}
                            {item.duration && (
                              <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 font-bold text-xs rounded-lg">
                                {item.duration}
                              </span>
                            )}
                            {item.isBlocked && (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 font-bold text-xs rounded-lg">
                                INELIGIBLE
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-500 mt-2 flex flex-wrap gap-x-3 gap-y-1 font-medium">
                            {item.submittedBy && <span><span className="text-slate-400">By:</span> {item.submittedBy}</span>}
                            {item.swappedBy && <span><span className="text-slate-400">Swapped:</span> {item.swappedBy}</span>}
                            {item.changedBy && <span><span className="text-slate-400">Changed:</span> {item.changedBy}</span>}
                            {item.reason && <span><span className="text-slate-400">Reason:</span> {item.reason}</span>}
                            {item.note && <span><span className="text-slate-400">Note:</span> {item.note}</span>}
                            {item.role && <span><span className="text-slate-400">Role:</span> {item.role}</span>}
                          </p>
                        </div>

                        {canEdit && !viewHistory && (
                          <div className="flex items-center gap-1.5 pt-2 sm:pt-0 shrink-0">
                            <button 
                              onClick={() => { setEditingItemId(item.id); setFormData(item); setShowAddModal(true); }} 
                              className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                              title="Edit item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id, arrayName)} 
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
          <div className="w-16 h-16 bg-purple-100 rounded-3xl flex items-center justify-center mb-4 text-purple-600">
            <Calendar className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-slate-900">No Schedule Program Selected</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm font-medium">Create a new schedule program above to begin organizing rehearsal itineraries.</p>
        </div>
      )}

      {/* ── CREATE PROGRAM MODAL ── */}
      {showCreateProg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Create Schedule Program</h3>
              <button onClick={() => setShowCreateProg(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input 
              type="text" 
              placeholder="e.g. Praise Night 23 Rehearsal" 
              value={newProgName} 
              onChange={e => setNewProgName(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button 
                onClick={() => setShowCreateProg(false)} 
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!newProgName.trim()) return;
                  await createProgram(newProgName.trim());
                  setShowCreateProg(false);
                  setNewProgName('');
                }} 
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-200"
              >
                Create Program
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT PROGRAM NAME MODAL ── */}
      {showEditProg && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Rename Schedule Program</h3>
              <button onClick={() => setShowEditProg(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <input 
              type="text" 
              value={editProgName} 
              onChange={e => setEditProgName(e.target.value)} 
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowEditProg(false)} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button 
                onClick={async () => {
                  if (!editProgName.trim()) return;
                  await renameActiveProgram(editProgName.trim());
                  setShowEditProg(false);
                }} 
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADD / EDIT ITEM MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">
                {editingItemId ? 'Edit Item' : 'Add Item'} - {TABS.find(t=>t.id === activeTab)?.label}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab specific form inputs */}
            {activeTab === 'schedule' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Time (e.g. 09:00)" value={formData.time || ''} onChange={e=>setFormData({...formData, time: e.target.value})} />
                  <input className="flex-[2] p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Song/Event Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Key (e.g. Bb)" value={formData.key || ''} onChange={e=>setFormData({...formData, key: e.target.value})} />
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" type="number" placeholder="Mins (e.g. 20)" value={formData.allotment || ''} onChange={e=>setFormData({...formData, allotment: parseInt(e.target.value) || 0})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Status</label>
                  <select className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-sm font-bold" value={formData.status || 'not-rehearsed'} onChange={e=>setFormData({...formData, status: e.target.value})}>
                    <option value="not-rehearsed">Pending</option>
                    <option value="rehearsed">Rehearsed</option>
                    <option value="break">Break</option>
                  </select>
                </div>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Notes (Optional)" value={formData.note || ''} onChange={e=>setFormData({...formData, note: e.target.value})} />
              </div>
            )}

            {activeTab === 'new' && (
              <div className="space-y-3">
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Song Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
                <div className="flex flex-col sm:flex-row gap-3">
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Key" value={formData.key || ''} onChange={e=>setFormData({...formData, key: e.target.value})} />
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Duration (e.g. 4:20)" value={formData.duration || ''} onChange={e=>setFormData({...formData, duration: e.target.value})} />
                </div>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Submitted By" value={formData.submittedBy || ''} onChange={e=>setFormData({...formData, submittedBy: e.target.value})} />
              </div>
            )}

            {activeTab === 'carried' && (
              <div className="space-y-3">
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Song Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
                <div className="flex flex-col sm:flex-row gap-3">
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Key" value={formData.key || ''} onChange={e=>setFormData({...formData, key: e.target.value})} />
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="From Program" value={formData.originalProgram || ''} onChange={e=>setFormData({...formData, originalProgram: e.target.value})} />
                </div>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Reason for carry over" value={formData.reason || ''} onChange={e=>setFormData({...formData, reason: e.target.value})} />
              </div>
            )}

            {activeTab === 'swapped' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Original Song" value={formData.original || ''} onChange={e=>setFormData({...formData, original: e.target.value})} />
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Replacement Song" value={formData.replacement || ''} onChange={e=>setFormData({...formData, replacement: e.target.value})} />
                </div>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Swapped By" value={formData.swappedBy || ''} onChange={e=>setFormData({...formData, swappedBy: e.target.value})} />
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Reason" value={formData.reason || ''} onChange={e=>setFormData({...formData, reason: e.target.value})} />
              </div>
            )}

            {activeTab === 'renamed' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Old Name" value={formData.from || ''} onChange={e=>setFormData({...formData, from: e.target.value})} />
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="New Name" value={formData.to || ''} onChange={e=>setFormData({...formData, to: e.target.value})} />
                </div>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Changed By" value={formData.changedBy || ''} onChange={e=>setFormData({...formData, changedBy: e.target.value})} />
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Reason" value={formData.reason || ''} onChange={e=>setFormData({...formData, reason: e.target.value})} />
              </div>
            )}

            {activeTab === 'invalid' && (
              <div className="space-y-3">
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Song Title" value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} />
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Replaced By (Optional)" value={formData.replacedBy || ''} onChange={e=>setFormData({...formData, replacedBy: e.target.value})} />
              </div>
            )}

            {activeTab === 'eligibility' && (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input className="flex-[2] p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Name" value={formData.name || ''} onChange={e=>setFormData({...formData, name: e.target.value})} />
                  <input className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" placeholder="Role" value={formData.role || ''} onChange={e=>setFormData({...formData, role: e.target.value})} />
                </div>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <input type="checkbox" checked={formData.isBlocked || false} onChange={e=>setFormData({...formData, isBlocked: e.target.checked})} className="rounded text-purple-600" />
                  Mark as Ineligible
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl">
                Cancel
              </button>
              <button 
                onClick={handleSaveItem} 
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-200"
              >
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
