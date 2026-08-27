"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, Search, CheckCircle, Clock, XCircle, FileSpreadsheet, 
  Download, RefreshCw, Users, TrendingUp, Plus, Printer, LogOut, 
  AlertCircle, Check, AlertTriangle, UserCheck, UserX, Edit2, 
  ChevronRight, Sparkles, X, Filter, BarChart3, Activity, Trash2
} from 'lucide-react';
import { useAdminZone } from '@/contexts/AdminZoneContext';
import { adminApi as apiClient } from '@/lib/admin-api';
import CustomLoader from '@/components/CustomLoader';
import { isHQGroup } from '@/config/zones';

export interface AttendanceRecord {
  id: string;
  user_id?: string;
  user_name?: string;
  userName?: string;
  event_name?: string;
  eventName?: string;
  check_in_time?: string;
  check_out_time?: string;
  status?: 'present' | 'absent';
  date_string?: string;
  dateString?: string;
  zoneId?: string;
  created_at?: string;
  [key: string]: any;
}

export default function AttendanceSection() {
  const { 
    selectedZoneId, 
    isGlobalView, 
    selectedZone, 
    isChurchScope, 
    selectedChurchId, 
    selectedChurch 
  } = useAdminZone();
  const effectiveZoneId = isGlobalView ? null : (selectedZoneId || selectedZone?.id || null);
  const isHQ = isGlobalView || (effectiveZoneId ? isHQGroup(effectiveZoneId) : false);

  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // 'all', 'active', 'completed'
  const [viewMode, setViewMode] = useState<'daily' | 'cumulative'>('daily');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));

  // Manual Check-In Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualEvent, setManualEvent] = useState('Rehearsal');
  const [manualStatus, setManualStatus] = useState<'present' | 'absent'>('present');
  const [submittingManual, setSubmittingManual] = useState(false);
  const [manualIsCustom, setManualIsCustom] = useState(false);

  // Edit Event State
  const [showEditModal, setShowEditModal] = useState(false);
  const [bulkEditEventName, setBulkEditEventName] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [bulkIsCustom, setBulkIsCustom] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const themeColor = selectedZone?.themeColor || '#9333EA';

  const recentEvents = useMemo(() => {
    const events = Array.from(new Set(allRecords.map((r: any) => r.event_name || r.eventName).filter(Boolean))) as string[];
    return events.length > 0 ? events : ['Rehearsal', 'Praise Night Rehearsal', 'Sunday Service', 'Vocal Practice'];
  }, [allRecords]);

  const loadAttendance = useCallback(async (silent = false) => {
    if (!silent && allRecords.length === 0) setLoading(true);
    try {
      let query = '';
      if (isChurchScope && selectedChurchId) {
        query = `/attendance?subGroupId=${encodeURIComponent(selectedChurchId)}`;
      } else if (!isGlobalView && effectiveZoneId) {
        query = `/attendance?zoneId=${encodeURIComponent(effectiveZoneId)}`;
      } else {
        query = '/attendance';
      }

      const res = await apiClient.get<{ success: boolean; data: any[] }>(query);
      if (res?.data && Array.isArray(res.data)) {
        setAllRecords(res.data);

        const filteredByDate = res.data.filter((r: any) => {
          const dateStr = r.date_string || r.dateString || (r.check_in_time ? new Date(r.check_in_time).toLocaleDateString('en-CA') : (r.checkInTime ? new Date(r.checkInTime).toLocaleDateString('en-CA') : ''));
          return dateStr === selectedDate;
        });

        setAttendanceRecords(filteredByDate);
      } else {
        setAllRecords([]);
        setAttendanceRecords([]);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      setAllRecords([]);
      setAttendanceRecords([]);
    } finally {
      setLoading(false);
    }
  }, [effectiveZoneId, isGlobalView, isChurchScope, selectedChurchId, selectedDate, allRecords.length]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  const presentCount = attendanceRecords.filter((r: any) => r.check_in_time && !r.check_out_time).length;
  const clockedOutCount = attendanceRecords.filter((r: any) => r.check_out_time).length;
  const totalCount = attendanceRecords.length;
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + clockedOutCount) / totalCount) * 100) : 0;

  // 1. CREATE: Manual Check In (Optimistic UI)
  const handleManualCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualName.trim();
    if (!name) {
      showToast('error', 'Please enter a name');
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const checkInTime = new Date().toISOString();

    const optimisticRecord: AttendanceRecord = {
      id: tempId,
      user_name: name,
      userName: name,
      event_name: manualEvent.trim() || 'Rehearsal',
      eventName: manualEvent.trim() || 'Rehearsal',
      status: manualStatus,
      check_in_time: checkInTime,
      checkInTime: checkInTime,
      date_string: selectedDate,
      dateString: selectedDate,
      zoneId: isChurchScope ? selectedChurchId || 'church' : (effectiveZoneId || 'global'),
    };

    setAttendanceRecords(prev => [optimisticRecord, ...prev]);
    setAllRecords(prev => [optimisticRecord, ...prev]);
    setShowManualModal(false);
    setManualName('');
    showToast('success', `${name} checked in successfully`);
    setSubmittingManual(true);

    try {
      const res = await apiClient.post<{ success: boolean; data: any }>('/attendance/manual', {
        userName: name,
        eventName: manualEvent.trim() || 'Rehearsal',
        status: manualStatus,
        zoneId: isChurchScope ? selectedChurchId || 'church' : (effectiveZoneId || 'global'),
        subGroupId: isChurchScope ? selectedChurchId : undefined,
        dateString: selectedDate,
      });

      if (res?.data) {
        // Replace temp optimistic record with server saved record
        const serverRecord = res.data;
        setAllRecords(prev => prev.map(r => r.id === tempId ? serverRecord : r));
        setAttendanceRecords(prev => prev.map(r => r.id === tempId ? serverRecord : r));
      }
    } catch (error) {
      console.error('Manual check-in error:', error);
      showToast('error', 'Failed to save check-in to server');
    } finally {
      setSubmittingManual(false);
    }
  };

  // 2. UPDATE: Clock Out (Optimistic Sync)
  const handleManualClockOut = (recordId: string) => {
    const checkoutTime = new Date().toISOString();
    setAttendanceRecords(prev => 
      prev.map((r: any) => r.id === recordId ? { ...r, check_out_time: checkoutTime, status: 'completed' } : r)
    );
    setAllRecords(prev => 
      prev.map((r: any) => r.id === recordId ? { ...r, check_out_time: checkoutTime, status: 'completed' } : r)
    );
    showToast('success', 'Clock out recorded');

    apiClient.post('/attendance/check-out', { attendanceId: recordId }).catch(error => {
      console.error('Manual clock out error:', error);
      showToast('error', 'Failed to sync clock out');
    });
  };

  // 3. DELETE: Remove Attendance Log (Optimistic Sync)
  const handleDeleteRecord = (recordId: string, memberName: string) => {
    if (!window.confirm(`Delete attendance record for "${memberName}"?`)) return;

    // Instant optimistic removal
    setAttendanceRecords(prev => prev.filter((r: any) => r.id !== recordId));
    setAllRecords(prev => prev.filter((r: any) => r.id !== recordId));
    showToast('success', `Removed log for ${memberName}`);

    apiClient.delete(`/attendance/${recordId}`).catch(error => {
      console.error('Delete attendance error:', error);
      showToast('error', 'Failed to delete record from server');
    });
  };

  // 4. UPDATE: Toggle Status Present <-> Absent (Optimistic Sync)
  const handleToggleStatus = (record: AttendanceRecord) => {
    const nextStatus = record.status === 'absent' ? 'present' : 'absent';
    const now = new Date().toISOString();
    const updatedCheckIn = nextStatus === 'present' ? (record.check_in_time || now) : null;

    // Instant optimistic update
    setAttendanceRecords(prev => prev.map((r: any) => 
      r.id === record.id ? { ...r, status: nextStatus, check_in_time: updatedCheckIn } : r
    ));
    setAllRecords(prev => prev.map((r: any) => 
      r.id === record.id ? { ...r, status: nextStatus, check_in_time: updatedCheckIn } : r
    ));
    showToast('success', `Status updated to ${nextStatus}`);

    apiClient.patch(`/attendance/${record.id}`, { status: nextStatus }).catch(error => {
      console.error('Toggle status error:', error);
      showToast('error', 'Failed to sync status update');
    });
  };

  // 5. UPDATE: Bulk Edit Event Name (Optimistic Sync)
  const handleBulkEditEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEventName = bulkEditEventName.trim();
    if (!newEventName || filteredRecords.length === 0) return;

    setSubmittingEdit(true);
    // Instant optimistic update
    setAttendanceRecords(prev => prev.map(r => ({ ...r, event_name: newEventName, eventName: newEventName })));
    setAllRecords(prev => prev.map(r => ({ ...r, event_name: newEventName, eventName: newEventName })));
    setShowEditModal(false);
    setBulkEditEventName('');
    showToast('success', `Updated ${filteredRecords.length} records to "${newEventName}"`);

    try {
      const batchSize = 10;
      for (let i = 0; i < filteredRecords.length; i += batchSize) {
        const batch = filteredRecords.slice(i, i + batchSize);
        await Promise.all(batch.map((r: any) => 
          apiClient.patch(`/attendance/${r.id}`, { 
            event_name: newEventName,
            eventName: newEventName 
          }).catch(() => {})
        ));
      }
    } catch (error) {
      console.error('Bulk edit error:', error);
      showToast('error', 'Failed to update some records on server');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // 6. ARCHIVE: Archive All Visible Records (Optimistic Sync)
  const handleArchiveRecords = async () => {
    if (allRecords.length === 0) return;
    if (!window.confirm("Archive all visible records? They will be cleared from this view.")) return;
    
    const recordsToArchive = [...allRecords];
    // Instant optimistic clear
    setAllRecords([]);
    setAttendanceRecords([]);
    showToast('success', 'Records archived successfully');

    try {
      const batchSize = 10;
      for (let i = 0; i < recordsToArchive.length; i += batchSize) {
        const batch = recordsToArchive.slice(i, i + batchSize);
        await Promise.all(batch.map((r: any) => 
          apiClient.patch(`/attendance/${r.id}`, { 
            is_archived: true,
            isArchived: true 
          }).catch(() => {})
        ));
      }
    } catch (error) {
      console.error('Archive error:', error);
      showToast('error', 'Failed to archive on server');
    }
  };

  const handleExportCSV = () => {
    if (viewMode === 'daily') {
      if (filteredRecords.length === 0) return;
      const headers = ['Member Name', 'Event Name', 'Date', 'Clock In', 'Clock Out', 'Status', 'Zone'];
      const csvData = filteredRecords.map(record => {
        const date = new Date(record.check_in_time || record.created_at || 0);
        return [
          `"${record.user_name || record.userName || 'Unknown'}"`,
          `"${record.event_name || record.eventName || 'Rehearsal'}"`,
          date.toLocaleDateString(),
          record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString() : '—',
          record.check_out_time ? new Date(record.check_out_time).toLocaleTimeString() : '—',
          record.status || 'present',
          record.zoneId || 'Global'
        ].join(',');
      });
      const blob = new Blob([[headers.join(','), ...csvData].join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_${selectedDate}.csv`;
      link.click();
      document.body.removeChild(link);
    } else {
      if (cumulativeData.length === 0) return;
      const headers = ['Member Name', 'Event Name', 'Attended', 'Total Possible', 'Rate'];
      const csvData = cumulativeData.map(item => [
        `"${item.user_name}"`,
        `"${item.event_name}"`,
        item.count,
        item.totalPossible,
        `${Math.round((item.count / item.totalPossible) * 100)}%`
      ].join(','));
      const blob = new Blob([[headers.join(','), ...csvData].join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Attendance_Cumulative_${new Date().toLocaleDateString('en-CA')}.csv`;
      link.click();
      document.body.removeChild(link);
    }
  };

  // Filter records based on active status tab and search
  const filteredRecords = useMemo(() => {
    return attendanceRecords.filter((record: any) => {
      const isLive = !record.check_out_time && record.check_in_time && 
                     (new Date(record.check_in_time).toDateString() === new Date().toDateString());

      if (filterStatus === 'active') {
        if (!isLive) return false;
      } else if (filterStatus === 'completed') {
        if (!record.check_out_time && isLive) return false;
      }

      if (searchTerm.trim()) {
        const s = searchTerm.toLowerCase();
        const u = (record.user_name || record.userName || '').toLowerCase();
        const e = (record.event_name || record.eventName || '').toLowerCase();
        return u.includes(s) || e.includes(s);
      }

      return true;
    });
  }, [attendanceRecords, filterStatus, searchTerm]);

  // Cumulative calculations
  const cumulativeData = useMemo(() => {
    if (viewMode !== 'cumulative') return [];
    const eventDates: Record<string, Set<string>> = {};
    const userEventData: Record<string, { user_name: string; event_name: string; datesAttended: Set<string> }> = {};

    const normalizeEventName = (rawName?: string) => {
      const name = (rawName || '').toLowerCase().trim();
      if (name.includes('rehearsal')) return 'Rehearsal';
      if (name.includes('praise night') || name.includes('pn')) return 'Praise Night';
      if (name.includes('service')) return 'Service';
      if (name.includes('concert')) return 'Concert';
      return name.replace(/\b\w/g, l => l.toUpperCase()) || 'Rehearsal';
    };

    allRecords.forEach((r: any) => {
      // Exclude archived logs from active cumulative calculation
      if (r.isArchived || r.is_archived || r.rawData?.isArchived || r.rawData?.is_archived) return;

      const eventName = normalizeEventName(r.event_name || r.eventName);
      const rawDate = r.date_string || r.dateString || r.check_in_time || r.checkInTime || r.created_at || r.createdAt;
      let date = '';
      try {
        date = rawDate ? new Date(rawDate).toLocaleDateString('en-CA') : '';
      } catch {
        date = '';
      }
      if (!date || date === 'Invalid Date') return;
      
      if (!eventDates[eventName]) eventDates[eventName] = new Set();
      eventDates[eventName].add(date);

      const userId = r.user_id || r.userId || r.user_name || r.userName || 'unknown';
      const userName = r.user_name || r.userName || r.name || 'Singer Member';
      const userKey = `${userId}_${eventName}`;

      if (!userEventData[userKey]) {
        userEventData[userKey] = { 
          user_name: userName, 
          event_name: eventName, 
          datesAttended: new Set() 
        };
      }
      
      if (r.status !== 'absent') {
        userEventData[userKey].datesAttended.add(date);
      }
    });

    return Object.values(userEventData).map(u => ({
      user_name: u.user_name,
      event_name: u.event_name,
      count: u.datesAttended.size,
      totalPossible: eventDates[u.event_name]?.size || 1
    })).filter(u => 
      u.user_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.event_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.event_name.localeCompare(b.event_name) || b.count - a.count);
  }, [viewMode, allRecords, searchTerm]);

  const setQuickDate = (preset: 'today' | 'yesterday') => {
    const d = new Date();
    if (preset === 'yesterday') {
      d.setDate(d.getDate() - 1);
    }
    setSelectedDate(d.toLocaleDateString('en-CA'));
  };

  if (loading && allRecords.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 min-h-[400px]">
        <CustomLoader message="Loading attendance records..." />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold text-white transition-all animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* ── Ambient Studio Glows ── */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-96 h-96 bg-indigo-100/30 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Main Scroll Area ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6">

        {/* ── 1. EXECUTIVE HERO COMMAND BAR ── */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Attendance Studio</h1>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  {isHQ ? 'Global HQ Scope' : selectedZone?.name || 'Selected Zone'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">
                {viewMode === 'daily' 
                  ? 'Real-time rehearsal check-ins, barcode scans, and clock-out verifications.' 
                  : 'All-time aggregated participation ratings and ministerial cumulative scores.'}
              </p>
            </div>
          </div>

          {/* Action Ribbon */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs">
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all ${
                  viewMode === 'daily'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daily Log
              </button>
              <button
                onClick={() => setViewMode('cumulative')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all ${
                  viewMode === 'cumulative'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Cumulative
              </button>
            </div>

            {viewMode === 'daily' ? (
              <>
                <button
                  onClick={() => setShowManualModal(true)}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-200 flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Manual Check-In</span>
                </button>

                <button
                  onClick={handleExportCSV}
                  disabled={filteredRecords.length === 0}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-xs flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-40"
                  title="Export records to CSV"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <button
                  onClick={() => {
                    setBulkEditEventName(filteredRecords[0]?.event_name || 'Rehearsal');
                    setShowEditModal(true);
                  }}
                  disabled={filteredRecords.length === 0}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-2xl transition-colors disabled:opacity-40"
                  title="Rename Event Title for visible records"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleExportCSV}
                  disabled={cumulativeData.length === 0}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-2xl shadow-xs flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Report</span>
                </button>

                <button
                  onClick={handleArchiveRecords}
                  disabled={allRecords.length === 0}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-2xl border border-rose-200 transition-colors disabled:opacity-40 flex items-center gap-2"
                  title="Archive current records to initialize a fresh session"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Archive Session</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* ── 2. METRIC KPI CARDS ── */}
        {viewMode === 'daily' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Checked In */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Total Checked In</span>
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900 tabular-nums">{totalCount}</span>
                <span className="text-xs font-bold text-slate-400">members logged</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Selected Date</span>
                <span className="font-bold text-slate-700">{new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
              </div>
            </div>

            {/* Card 2: Active Now */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Active In Session
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-700 tabular-nums">{presentCount}</span>
                <span className="text-xs font-bold text-emerald-600/80">currently rehearsing</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Clocked In</span>
                <span className="font-bold text-emerald-700">Live Status</span>
              </div>
            </div>

            {/* Card 3: Clocked Out */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest">Completed Session</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-blue-700 tabular-nums">{clockedOutCount}</span>
                <span className="text-xs font-bold text-blue-600/80">clocked out</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Verified Out</span>
                <span className="font-bold text-blue-700">Finished</span>
              </div>
            </div>

            {/* Card 4: Attendance Rate */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Participation Rate</span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-amber-700 tabular-nums">{attendanceRate}%</span>
                <span className="text-xs font-bold text-amber-600/80">attendance</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${attendanceRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. DATE SELECTOR & SEARCH CONTROL BAR ── */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Left: Date Presets (Daily view) or Summary Scope (Cumulative) */}
          {viewMode === 'daily' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 mr-1">Date:</span>
              <button
                onClick={() => setQuickDate('today')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDate === new Date().toLocaleDateString('en-CA')
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setQuickDate('yesterday')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedDate === new Date(Date.now() - 86400000).toLocaleDateString('en-CA')
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                Yesterday
              </button>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-black rounded-xl border border-purple-200">
                All-Time Program Cumulative
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {cumulativeData.length} active singer records
              </span>
            </div>
          )}

          {/* Right: Status Filter & Live Search */}
          <div className="flex items-center gap-3 flex-1 max-w-md ml-auto">
            {viewMode === 'daily' && (
              <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/60 shrink-0">
                {[
                  { id: 'all', label: 'All', count: totalCount },
                  { id: 'active', label: 'Active', count: presentCount },
                  { id: 'completed', label: 'Done', count: clockedOutCount }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1.5 ${
                      filterStatus === tab.id
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                      filterStatus === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search member or event..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => loadAttendance(true)}
              className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* ── 4. DATA TABLE / EMPTY STATE ── */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          {viewMode === 'cumulative' ? (
            /* Cumulative Table */
            cumulativeData.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Singer Member</th>
                      <th className="px-6 py-4">Event Category</th>
                      <th className="px-6 py-4">Sessions Attended</th>
                      <th className="px-6 py-4">Attendance Metric</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {cumulativeData.map((item, idx) => {
                      const rate = Math.round((item.count / item.totalPossible) * 100);
                      const initial = (item.user_name || 'U').charAt(0).toUpperCase();
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0"
                                style={{ backgroundColor: themeColor }}
                              >
                                {initial}
                              </div>
                              <span className="font-bold text-sm text-slate-900 group-hover:text-purple-700 transition-colors">
                                {item.user_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl font-bold border border-slate-200/60">
                              {item.event_name}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="font-black text-base text-slate-900 tabular-nums">
                              {item.count} <span className="text-slate-400 font-bold text-xs">/ {item.totalPossible}</span>
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 max-w-[180px]">
                              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all"
                                  style={{ 
                                    width: `${rate}%`,
                                    backgroundColor: rate >= 80 ? '#10B981' : rate >= 50 ? '#F59E0B' : '#EF4444'
                                  }}
                                />
                              </div>
                              <span className="font-black text-xs text-slate-700 tabular-nums">{rate}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100 text-purple-600 shadow-xs">
                  <TrendingUp className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-800">No Cumulative Records Found</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
                  Records will automatically aggregate here as members are checked in across rehearsal sessions.
                </p>
              </div>
            )
          ) : (
            /* Daily Log Table */
            filteredRecords.length > 0 ? (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                      <th className="px-6 py-4">Singer Member</th>
                      <th className="px-6 py-4">Rehearsal Event</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Clock In</th>
                      <th className="px-6 py-4">Clock Out</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredRecords.map((record) => {
                      const name = record.user_name || record.userName || 'Unknown Member';
                      const initial = name.charAt(0).toUpperCase();
                      const isLive = !record.check_out_time && record.check_in_time && 
                                     (new Date(record.check_in_time).toDateString() === new Date().toDateString());

                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* Member */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-xs shrink-0"
                                style={{ backgroundColor: themeColor }}
                              >
                                {initial}
                              </div>
                              <div>
                                <span className="font-bold text-sm text-slate-900 group-hover:text-purple-700 transition-colors block">
                                  {name}
                                </span>
                                <span className="text-[10px] font-medium text-slate-400">
                                  ID: {record.user_id?.substring(0, 8) || 'Manual'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Event */}
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-xl font-bold border border-slate-200/60">
                              {record.event_name || record.eventName || 'Rehearsal'}
                            </span>
                          </td>

                          {/* Status Badge (Clickable Toggle) */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => handleToggleStatus(record)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-2xs ${
                                record.status === 'absent'
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200'
                              }`}
                              title="Click to toggle Present / Absent"
                            >
                              {record.status === 'absent' ? <UserX className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                              <span>{record.status === 'absent' ? 'Absent' : 'Present'}</span>
                            </button>
                          </td>

                          {/* Clock In */}
                          <td className="px-6 py-4 font-bold text-slate-800 tabular-nums">
                            {record.check_in_time ? (
                              <div className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{new Date(record.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : '—'}
                          </td>

                          {/* Clock Out */}
                          <td className="px-6 py-4 font-bold text-slate-800 tabular-nums">
                            {record.check_out_time ? (
                              <div className="flex items-center gap-2 text-blue-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                <span>{new Date(record.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                            ) : isLive ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                                In Session
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">No check-out</span>
                            )}
                          </td>

                          {/* Action Buttons: Clock Out & Delete */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isLive && (
                                <button
                                  onClick={() => handleManualClockOut(record.id)}
                                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold rounded-xl border border-slate-200 transition-all active:scale-95 shadow-2xs inline-flex items-center gap-1.5"
                                  title="Clock out member"
                                >
                                  <LogOut className="w-3.5 h-3.5" />
                                  <span>Clock Out</span>
                                </button>
                              )}

                              <button
                                onClick={() => handleDeleteRecord(record.id, name)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                                title="Delete attendance record"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-16 text-center">
                <div className="w-16 h-16 bg-purple-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-purple-100 text-purple-600 shadow-xs">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-base font-black text-slate-800">No Attendance Logged For This Date</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto font-medium">
                  Use the QR Code scanner on mobile or record a manual check-in using the button below.
                </p>
                <div className="mt-5">
                  <button
                    onClick={() => setShowManualModal(true)}
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-200 inline-flex items-center gap-2 transition-transform active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Record Manual Check-In</span>
                  </button>
                </div>
              </div>
            )
          )}
        </div>

      </div>

      {/* ── MANUAL CHECK-IN MODAL ── */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 animate-in zoom-in-95 duration-200 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Manual Check-In</h3>
                  <p className="text-xs text-slate-400 font-medium">Record attendance for a singer</p>
                </div>
              </div>
              <button 
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleManualCheckIn} className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Member Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Brother John Doe"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Event Title</label>
                {!manualIsCustom ? (
                  <select
                    value={manualEvent}
                    onChange={(e) => {
                      if (e.target.value === '___custom___') {
                        setManualIsCustom(true);
                        setManualEvent('');
                      } else {
                        setManualEvent(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all cursor-pointer"
                  >
                    {recentEvents.map(ev => <option key={ev} value={ev}>{ev}</option>)}
                    <option value="___custom___">+ Add Custom Title...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="Type custom program name..."
                      value={manualEvent}
                      onChange={(e) => setManualEvent(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!manualEvent.trim()) setManualEvent(recentEvents[0]);
                        setManualIsCustom(false);
                      }}
                      className="px-3 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setManualStatus('present')}
                    className={`py-2.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                      manualStatus === 'present'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" /> Present (Clock In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualStatus('absent')}
                    className={`py-2.5 rounded-xl text-xs font-black border transition-all flex items-center justify-center gap-2 ${
                      manualStatus === 'absent'
                        ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-500'
                    }`}
                  >
                    <UserX className="w-4 h-4" /> Absent
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs shadow-md shadow-purple-200 flex items-center justify-center gap-2"
                >
                  {submittingManual ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Check-In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BULK EDIT EVENT MODAL ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-100 animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">Rename Event Title</h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              This updates the event title for <strong className="text-slate-900">{filteredRecords.length} visible records</strong> on {selectedDate}.
            </p>
            <form onSubmit={handleBulkEditEvent} className="space-y-4">
              <input
                type="text"
                required
                value={bulkEditEventName}
                onChange={(e) => setBulkEditEventName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                placeholder="New Event Title"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || !bulkEditEventName.trim()}
                  className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-black text-xs shadow-md shadow-purple-200"
                >
                  {submittingEdit ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update Records'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
