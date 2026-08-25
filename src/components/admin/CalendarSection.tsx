"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar as CalendarIcon, Plus, Edit2, Trash2, Search,
  Clock, MapPin, X, Eye, EyeOff, FolderOpen, RefreshCw,
  Sparkles, Filter, CheckCircle, AlertTriangle, Layers,
  Grid3x3, List, ChevronRight, Check, Image as ImageIcon, Save
} from 'lucide-react';
import { useZone } from '@/hooks/useZone';
import CustomLoader from '@/components/CustomLoader';
import { UpcomingEvent, UpcomingEventsService } from '@/app/pages/calendar/_lib/upcoming-events-service';
import MediaSelectionModal from '../MediaSelectionModal';
import moment from 'moment';

const EVENT_TYPE_CONFIG = {
  all: { label: 'All Events', bg: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  rehearsal: { label: 'Rehearsal', bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  event: { label: 'Praise Night / Event', bg: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500' },
  meeting: { label: 'Meeting', bg: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-500' },
  announcement: { label: 'Announcement', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  reminder: { label: 'Reminder', bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500' },
};

export default function CalendarSection() {
  const { currentZone } = useZone();

  // Data State
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UpcomingEvent | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<UpcomingEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);

  // Feedback State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    date: '',
    endDate: '',
    time: '',
    image: '',
    type: 'event' as UpcomingEvent['type'],
    showInCarousel: true,
    isGlobal: false
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const loadEvents = useCallback(async (isRefresh = false) => {
    const zoneId = currentZone?.id || 'zone-001';
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const allEvents = await UpcomingEventsService.getAllEvents(zoneId, isRefresh);
      setEvents(allEvents);
    } catch (error) {
      console.error('[CalendarSection] Error loading events:', error);
      showToast('error', 'Failed to load calendar schedule.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentZone?.id]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchType = filterType === 'all' || event.type === filterType;
      const q = searchTerm.toLowerCase().trim();
      const matchSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        (event.description && event.description.toLowerCase().includes(q)) ||
        (event.location && event.location.toLowerCase().includes(q));
      return matchType && matchSearch;
    });
  }, [events, filterType, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: events.length,
      rehearsals: events.filter(e => e.type === 'rehearsal').length,
      events: events.filter(e => e.type === 'event').length,
      meetings: events.filter(e => e.type === 'meeting').length,
      announcements: events.filter(e => e.type === 'announcement').length,
    };
  }, [events]);

  const handleOpenModal = (event?: UpcomingEvent) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        description: event.description || '',
        location: event.location || '',
        date: event.date,
        endDate: event.endDate || '',
        time: event.time || '',
        image: event.image || '',
        type: event.type,
        showInCarousel: event.showInCarousel,
        isGlobal: event.isGlobal || false
      });
    } else {
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        location: '',
        date: moment().format('YYYY-MM-DD'),
        endDate: '',
        time: '',
        image: '',
        type: 'rehearsal',
        showInCarousel: true,
        isGlobal: false
      });
    }
    setShowModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.date) {
      showToast('error', 'Please provide an event title and start date.');
      return;
    }

    setSaving(true);
    try {
      const zoneId = currentZone?.id || 'zone-001';
      if (editingEvent) {
        await UpcomingEventsService.updateEvent(editingEvent.id, formData, zoneId);
        showToast('success', 'Event schedule updated successfully!');
      } else {
        await UpcomingEventsService.createEvent({
          ...formData,
          zoneId
        });
        showToast('success', 'New calendar event created!');
      }
      setShowModal(false);
      loadEvents(true);
    } catch (error) {
      console.error('[CalendarSection] Error saving event:', error);
      showToast('error', 'Failed to save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleCarousel = async (event: UpcomingEvent) => {
    try {
      const zoneId = currentZone?.id || 'zone-001';
      await UpcomingEventsService.updateEvent(event.id, {
        showInCarousel: !event.showInCarousel
      }, zoneId);
      setEvents(prev => prev.map(e => e.id === event.id ? { ...e, showInCarousel: !e.showInCarousel } : e));
      showToast('success', `Banner ${!event.showInCarousel ? 'pinned to' : 'hidden from'} portal banner carousel`);
    } catch (error) {
      showToast('error', 'Failed to toggle visibility.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    try {
      const zoneId = currentZone?.id || 'zone-001';
      await UpcomingEventsService.deleteEvent(eventToDelete.id, zoneId);
      showToast('success', 'Event deleted from calendar.');
      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id));
      setShowDeleteDialog(false);
      setEventToDelete(null);
    } catch (error) {
      showToast('error', 'Failed to delete event.');
    }
  };

  const formatEventDate = (dateStr: string, endDateStr?: string) => {
    const start = moment(dateStr);
    if (!endDateStr || endDateStr === dateStr) {
      return start.format('MMM D, YYYY');
    }
    const end = moment(endDateStr);
    if (start.format('YYYY') === end.format('YYYY')) {
      return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
    }
    return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative font-sans">
      {/* ── Dynamic Purple / Indigo Studio Glows ── */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Floating Toast Notification */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[500] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold text-white transition-all animate-in fade-in slide-in-from-top-4 ${
          toast.type === 'success' ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-600 shadow-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="relative flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6 w-full">

        {/* ── 1. STUDIO HEADER & STATS ── */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Calendar & Event Dispatch</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200">
                  {stats.total} Scheduled
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Organize rehearsals, praise night programs, meetings, and announcement banners across active zones.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadEvents(true)}
              disabled={refreshing || loading}
              title="Refresh calendar"
              className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
            </button>

            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Calendar Event</span>
            </button>
          </div>
        </div>

        {/* ── 2. FILTER & VIEW TOOLBAR ── */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by event title, description, or venue location..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-slate-800 placeholder-slate-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter Pills & View Mode */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {[
                { id: 'all', label: 'All' },
                { id: 'rehearsal', label: `Rehearsal (${stats.rehearsals})` },
                { id: 'event', label: `Events (${stats.events})` },
                { id: 'meeting', label: `Meetings (${stats.meetings})` },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterType === tab.id
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white shadow-xs text-purple-700' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Grid View"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'list' ? 'bg-white shadow-xs text-purple-700' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Timeline View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* ── 3. EVENTS GRID / LIST DISPLAY ── */}
        <div className="flex-1 w-full pb-12">
          {loading ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-20 text-center shadow-xs">
              <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Loading schedule...</p>
              <p className="text-xs text-slate-400 mt-1">Fetching upcoming rehearsals & events</p>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-16 text-center shadow-xs">
              <div className="w-16 h-16 bg-purple-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <CalendarIcon className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-base font-black text-slate-900">
                {searchTerm ? `No events matching "${searchTerm}"` : 'No events scheduled yet'}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                {searchTerm ? 'Try searching with another keyword.' : 'Schedule upcoming choir rehearsals, sound checks, or praise night dates.'}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => handleOpenModal()}
                  className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create First Event</span>
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ─ Studio Grid View ─ */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 w-full">
              {filteredEvents.map(event => {
                const typeConfig = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.event;

                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group"
                  >
                    {/* Event Banner Cover Stage */}
                    <div className="relative h-44 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                      {event.image ? (
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <CalendarIcon className="w-7 h-7" />
                        </div>
                      )}

                      {/* Top Type Tag */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-xs backdrop-blur-md border ${typeConfig.bg} pointer-events-auto`}>
                          {typeConfig.label}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleToggleCarousel(event)}
                          className={`p-1.5 rounded-lg shadow-xs pointer-events-auto backdrop-blur-md transition-all ${
                            event.showInCarousel
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/80 text-slate-400 hover:text-slate-700'
                          }`}
                          title={event.showInCarousel ? 'Pinned to banner carousel' : 'Hidden from carousel'}
                        >
                          {event.showInCarousel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                          {event.title}
                        </h4>
                        {event.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Meta Pills */}
                      <div className="space-y-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-[11px]">
                          <Clock className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-semibold text-slate-700">
                            {formatEventDate(event.date, event.endDate)}
                            {event.time && ` at ${event.time}`}
                          </span>
                        </div>

                        {event.location && (
                          <div className="flex items-center gap-2 text-[11px]">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-slate-600 truncate">{event.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Action Bar */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-slate-400">
                          {event.isGlobal ? 'Global Hub' : 'Zone Event'}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(event)}
                            className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                            title="Edit event"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEventToDelete(event);
                              setShowDeleteDialog(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete event"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ─ Studio Timeline List View ─ */
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden w-full">
              {filteredEvents.map(event => {
                const typeConfig = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.event;

                return (
                  <div
                    key={event.id}
                    className="p-5 hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {event.image ? (
                        <img
                          src={event.image}
                          alt={event.title}
                          className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-slate-200"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 font-black">
                          <CalendarIcon className="w-6 h-6" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors">
                            {event.title}
                          </h4>
                          <span className={`px-2 py-0.2 rounded-md text-[9px] font-black uppercase tracking-wider border ${typeConfig.bg}`}>
                            {typeConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {event.description || 'No description provided.'}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] font-semibold text-slate-500 mt-1">
                          <span className="flex items-center gap-1 text-slate-700">
                            <Clock className="w-3 h-3 text-purple-600" />
                            <span>{formatEventDate(event.date, event.endDate)} {event.time && `(${event.time})`}</span>
                          </span>
                          {event.location && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                <span>{event.location}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCarousel(event)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          event.showInCarousel
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {event.showInCarousel ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{event.showInCarousel ? 'Banner Pinned' : 'Hidden'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenModal(event)}
                        className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
                        title="Edit event"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEventToDelete(event);
                          setShowDeleteDialog(true);
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* ── 4. CREATE / EDIT EVENT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  {editingEvent ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {editingEvent ? 'Edit Calendar Event' : 'New Calendar Event'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Schedule rehearsal or broadcast banner across singer portal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Title */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  Event Title <span className="text-purple-600">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Grand Rehearsal & Sound Check, Praise Night 27"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  required
                />
              </div>

              {/* Type & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">Event Category</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="rehearsal">Rehearsal Session</option>
                    <option value="event">Praise Night / Special Event</option>
                    <option value="meeting">Choir Meeting</option>
                    <option value="announcement">Announcement Banner</option>
                    <option value="reminder">Reminder</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">Location / Venue</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Main Auditorium / Studio A"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Dates & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">Start Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value, endDate: (!formData.endDate || formData.endDate < e.target.value) ? e.target.value : formData.endDate })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    min={formData.date}
                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide mb-1">Call Time</label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Banner Image Stage */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                    Event Artwork / Banner
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMediaLibrary(true)}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Choose from Media Studio</span>
                  </button>
                </div>

                {formData.image ? (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 h-36 bg-slate-100 group">
                    <img
                      src={formData.image}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image: '' })}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-xl shadow-md transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={formData.image}
                    onChange={e => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://res.cloudinary.com/... or paste image URL"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                  />
                )}
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
                  Description / Call Details
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Dress code, songs to prepare, schedule breakdown..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white resize-none"
                />
              </div>

              {/* Carousel Toggle */}
              <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-purple-900">Pin to Banner Carousel</p>
                  <p className="text-[11px] text-purple-700">Display this event prominently on the Singer Hub home banner.</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.showInCarousel}
                  onChange={e => setFormData({ ...formData, showInCarousel: e.target.checked })}
                  className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                />
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{saving ? 'Saving Event...' : 'Save Calendar Event'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {showDeleteDialog && eventToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100 text-center animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-black text-slate-900">Delete Event?</h4>
            <p className="text-xs text-slate-500">
              Are you sure you want to delete <strong className="text-slate-800">{eventToDelete.title}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteDialog(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-200"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Selection Modal */}
      <MediaSelectionModal
        isOpen={showMediaLibrary}
        onClose={() => setShowMediaLibrary(false)}
        onFileSelect={(file) => {
          setFormData(prev => ({ ...prev, image: file.url }));
          setShowMediaLibrary(false);
        }}
        allowedTypes={['image']}
      />
    </div>
  );
}
