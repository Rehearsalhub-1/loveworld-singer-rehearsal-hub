"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Download, Clock, Edit, Trash2, Plus, Upload, RefreshCw, ChevronLeft, ChevronRight, Filter, Calendar } from 'lucide-react';
import { useZone } from '@/hooks/useZone';
import { isHQGroup, HQ_GROUP_IDS, BOSS_ZONE_ID } from '@/config/zones';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import CustomLoader from '@/components/CustomLoader';
import { adminApi as apiClient } from '@/lib/admin-api';

interface ActivityLog {
  id: string;
  zoneId: string;
  zoneName: string;
  userName: string;
  message: string;
  type: string;
  action: string;
  section: string;
  itemName?: string;
  timestamp: any;
  createdAt: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { currentZone, isLoading: zoneLoading } = useZone();
  const isHQ = currentZone ? isHQGroup(currentZone.id) : false;

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear];
  }, []);

  useEffect(() => {
    if (!zoneLoading && currentZone?.id) {
      loadActivityLogs();
    }
  }, [currentZone?.id, zoneLoading]);

  const loadActivityLogs = async (silent = false) => {
    if (!currentZone?.id) return;
    try {
      if (!silent && logs.length === 0) setLoading(true);
      const hqZoneIds = [...HQ_GROUP_IDS, BOSS_ZONE_ID];

      const res = await apiClient.get<{ success?: boolean; data?: Record<string, unknown>[] }>('/activity-logs');
      let logsData = (Array.isArray(res.data) ? res.data : []).map((row) => {
        const ts = row.timestamp ?? row.createdAt ?? row.created_at;
        let timestamp: Date = new Date();
        if (ts instanceof Date) timestamp = ts;
        else if (ts && typeof ts === 'object' && typeof (ts as { toDate?: () => Date }).toDate === 'function') {
          timestamp = (ts as { toDate: () => Date }).toDate();
        } else if (typeof ts === 'string' || typeof ts === 'number') {
          const d = new Date(ts);
          if (!Number.isNaN(d.getTime())) timestamp = d;
        } else if (ts && typeof ts === 'object') {
          const rec = ts as { seconds?: number; _seconds?: number };
          const sec = rec.seconds ?? rec._seconds;
          if (typeof sec === 'number') timestamp = new Date(sec * 1000);
        }
        return { id: String(row.id ?? ''), ...row, timestamp } as ActivityLog;
      });

      if (isHQ) {
        logsData = logsData.filter(log => hqZoneIds.includes(log.zoneId));
      } else {
        logsData = logsData.filter(log => log.zoneId === currentZone.id);
      }
      logsData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(logsData.slice(0, 500));
    } catch (error) {
      console.error('Error loading activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(prev => prev - 1); }
      else { setSelectedMonth(prev => prev - 1); }
    } else {
      if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(prev => prev + 1); }
      else { setSelectedMonth(prev => prev + 1); }
    }
  };

  const filteredLogs = useMemo(() => {
    const monthStart = startOfMonth(new Date(selectedYear, selectedMonth));
    const monthEnd = endOfMonth(new Date(selectedYear, selectedMonth));

    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const inDateRange = isWithinInterval(logDate, { start: monthStart, end: monthEnd });
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.itemName && log.itemName.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesAction = !actionFilter || log.action === actionFilter;
      const matchesSection = !sectionFilter || log.section === sectionFilter;
      return inDateRange && matchesSearch && matchesAction && matchesSection;
    });
  }, [logs, selectedMonth, selectedYear, searchTerm, actionFilter, sectionFilter]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'updated': return <Edit className="w-4 h-4 text-purple-600" />;
      case 'created': return <Plus className="w-4 h-4 text-emerald-600" />;
      case 'deleted': return <Trash2 className="w-4 h-4 text-rose-600" />;
      case 'uploaded': return <Upload className="w-4 h-4 text-fuchsia-600" />;
      default: return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'updated': return 'text-purple-700 bg-purple-50 border border-purple-200';
      case 'created': return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
      case 'deleted': return 'text-rose-700 bg-rose-50 border border-rose-200';
      case 'uploaded': return 'text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200';
      default: return 'text-slate-700 bg-slate-100 border border-slate-200';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Zone', 'User', 'Message', 'Type', 'Action', 'Section', 'Item'],
      ...filteredLogs.map(log => [
        log.timestamp.toLocaleString(), log.zoneName, log.userName, log.message,
        log.type, log.action, log.section, log.itemName || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-logs-${MONTHS[selectedMonth]}-${selectedYear}.csv`;
    a.click();
  };

  if (loading || zoneLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white min-h-[400px]">
        <CustomLoader message="Loading activity logs..." />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 pb-24 lg:pb-8 p-4 lg:p-8 space-y-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* ── Glassmorphic Command Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-200">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit & Activity Logs</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                  {filteredLogs.length} Events
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                {isHQ ? 'Global ministry audit trail & activity history' : `${currentZone?.name || 'Local Zone'} audit stream`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => loadActivityLogs(true)}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 rounded-2xl transition-all shadow-xs active:scale-95 font-bold text-xs"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={exportLogs}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl transition-all shadow-lg shadow-purple-200 active:scale-95 font-bold text-xs"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* ── Date + Filters combined ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-4">
          {/* Month navigation */}
          <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-100">
            <Calendar className="w-4 h-4 text-purple-600 flex-shrink-0" />
            <button onClick={() => navigateMonth('prev')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 text-slate-800"
            >
              {MONTHS.map((month, idx) => <option key={idx} value={idx}>{month}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 text-slate-800"
            >
              {yearOptions.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
            <button onClick={() => navigateMonth('next')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
            <button
              onClick={() => { setSelectedMonth(new Date().getMonth()); setSelectedYear(new Date().getFullYear()); }}
              className="text-xs font-extrabold px-3 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl transition-colors"
            >
              This Month
            </button>
          </div>

          {/* Search + Action + Section */}
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit logs by user, action, title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs font-semibold bg-slate-50 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
              />
            </div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 text-slate-700"
            >
              <option value="">All Actions</option>
              <option value="created">Created</option>
              <option value="updated">Updated</option>
              <option value="deleted">Deleted</option>
              <option value="uploaded">Uploaded</option>
            </select>
            <select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="px-3.5 py-2.5 border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50 text-slate-700"
            >
              <option value="">All Sections</option>
              <option value="songs">Songs</option>
              <option value="pages">Pages</option>
              <option value="categories">Categories</option>
              <option value="subgroups">Subgroups</option>
              <option value="master_library">Master Library</option>
              <option value="media">Media</option>
            </select>
          </div>

          {/* Active filters + count */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{MONTHS[selectedMonth]} {selectedYear}</span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-[11px] font-bold text-slate-700">
                {filteredLogs.length} logs
              </span>
              {filteredLogs.filter(l => l.action === 'created').length > 0 && (
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full border border-emerald-200">
                  {filteredLogs.filter(l => l.action === 'created').length} created
                </span>
              )}
              {filteredLogs.filter(l => l.action === 'updated').length > 0 && (
                <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-full border border-purple-200">
                  {filteredLogs.filter(l => l.action === 'updated').length} updated
                </span>
              )}
              {filteredLogs.filter(l => l.action === 'deleted').length > 0 && (
                <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded-full border border-rose-200">
                  {filteredLogs.filter(l => l.action === 'deleted').length} deleted
                </span>
              )}
            </div>
            {(actionFilter || sectionFilter || searchTerm) && (
              <button
                onClick={() => { setSearchTerm(''); setActionFilter(''); setSectionFilter(''); }}
                className="text-xs font-bold text-purple-600 hover:underline flex-shrink-0"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Logs ── */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="p-14 text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                <Clock className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-700 font-bold">No activity for {MONTHS[selectedMonth]} {selectedYear}</p>
              <p className="text-xs text-slate-400 mt-1">Try selecting a different month or adjusting filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <table className="hidden lg:table w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Message</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Action</th>
                    <th className="px-5 py-3.5 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Section</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap font-medium tabular-nums">
                        {format(new Date(log.timestamp), 'MMM d, h:mm a')}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 bg-purple-600 shadow-xs">
                            {(log.userName || 'U').charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-bold text-slate-900">{log.userName || 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-600 max-w-xs truncate font-medium">{log.message}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${getActionColor(log.action)}`}>
                          {getActionIcon(log.action)}
                          {log.action || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {log.section && (
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                            {log.section}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile timeline feed */}
              <div className="lg:hidden divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${getActionColor(log.action)}`}>
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-bold text-slate-900 leading-snug">{log.message}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex-shrink-0 ${getActionColor(log.action)}`}>
                          {log.action?.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-700">{log.userName || 'Unknown'}</span>
                        <span className="text-slate-300 text-xs">•</span>
                        <span className="text-[10px] text-slate-400 font-medium">{format(new Date(log.timestamp), 'MMM d, h:mm a')}</span>
                        {log.section && (
                          <>
                            <span className="text-slate-300 text-xs">•</span>
                            <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md font-bold uppercase">{log.section}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
