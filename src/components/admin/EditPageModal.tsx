"use client";

import React, { useRef } from 'react';
import {
  X,
  Save,
  Upload,
  Trash2,
  FolderOpen,
  Calendar,
  MapPin,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { PraiseNight } from '../../types/supabase';

export interface EditPageModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingPage: PraiseNight | null;
  name: string;
  setName: (name: string) => void;
  date: string;
  setDate: (date: string) => void;
  location: string;
  setLocation: (location: string) => void;
  description: string;
  setDescription: (description: string) => void;
  category: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive';
  setCategory: (category: 'unassigned' | 'pre-rehearsal' | 'ongoing' | 'archive') => void;
  pageCategory: string;
  setPageCategory: (pageCategory: string) => void;
  availablePageCategories?: Array<{ id: string | number; name: string }>;
  days: number;
  setDays: (days: number) => void;
  hours: number;
  setHours: (hours: number) => void;
  minutes: number;
  setMinutes: (minutes: number) => void;
  seconds: number;
  setSeconds: (seconds: number) => void;
  bannerImage: string;
  setBannerImage: (image: string) => void;
  bannerFile: File | null;
  setBannerFile: (file: File | null) => void;
  onSave: () => void;
  onOpenMediaLibrary: () => void;
  isSaving?: boolean;
}

export default function EditPageModal({
  isOpen,
  onClose,
  editingPage,
  name,
  setName,
  date,
  setDate,
  location,
  setLocation,
  description,
  setDescription,
  category,
  setCategory,
  pageCategory,
  setPageCategory,
  availablePageCategories = [],
  days,
  setDays,
  hours,
  setHours,
  minutes,
  setMinutes,
  seconds,
  setSeconds,
  bannerImage,
  setBannerImage,
  bannerFile,
  setBannerFile,
  onSave,
  onOpenMediaLibrary,
  isSaving = false
}: EditPageModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewCategoryInput, setShowNewCategoryInput] = React.useState(false);
  const [newCategoryName, setNewCategoryName] = React.useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const previewUrl = URL.createObjectURL(file);
      setBannerImage(previewUrl);
    }
  };

  const handleRemoveBanner = () => {
    setBannerImage('');
    setBannerFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-200 flex-shrink-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {editingPage ? 'Edit Program Details' : 'Create New Program'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {editingPage ? `Update settings and schedule for ${editingPage.name}` : 'Configure program schedule, countdown, and banner artwork'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Program Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Program Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Your Loveworld Special"
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs"
            />
          </div>

          {/* Date & Location (2 Columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Date & Time <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="e.g. Sunday, 8th February 2026"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs"
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Location / Venue <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Oasis Studio, Bay 4"
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Status & Parent Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Rehearsal Status
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs"
              >
                <option value="ongoing">Ongoing (Active Rehearsal)</option>
                <option value="pre-rehearsal">Pre-Rehearsal (Preparation)</option>
                <option value="archive">Archive (Past Event)</option>
                <option value="unassigned">Unassigned (Draft)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Parent Category Group
              </label>
              {!showNewCategoryInput ? (
                <div className="flex gap-2">
                  <select
                    value={pageCategory}
                    onChange={(e) => setPageCategory(e.target.value)}
                    className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs"
                  >
                    <option value="">No Parent Group (Default)</option>
                    {availablePageCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setShowNewCategoryInput(true); setNewCategoryName(''); }}
                    className="px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-colors flex-shrink-0 flex items-center gap-1"
                    title="Create a new page category"
                  >
                    + New
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="New category name..."
                      className="flex-1 min-w-0 px-3.5 py-2.5 text-sm bg-white border border-purple-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 transition-all shadow-xs"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newCategoryName.trim()) {
                          setPageCategory(newCategoryName.trim());
                          setShowNewCategoryInput(false);
                        }
                        if (e.key === 'Escape') setShowNewCategoryInput(false);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryName.trim()) setPageCategory(newCategoryName.trim());
                        setShowNewCategoryInput(false);
                      }}
                      disabled={!newCategoryName.trim()}
                      className="px-3 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-40 flex-shrink-0"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewCategoryInput(false)}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Press Enter or click Add. The category will be created when you save the program.</p>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description / Notes
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes or instructions for this rehearsal program..."
              className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs resize-none"
            />
          </div>

          {/* Banner Artwork */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Banner Artwork
            </label>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {bannerImage ? (
              <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <img
                  src={bannerImage}
                  alt="Banner preview"
                  className="w-32 h-18 object-cover rounded-lg border border-slate-200 flex-shrink-0 shadow-2xs"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {bannerFile ? bannerFile.name : 'Current Banner Image'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    16:9 aspect ratio recommended
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                    >
                      Upload New
                    </button>
                    <button
                      type="button"
                      onClick={onOpenMediaLibrary}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      Media Library
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveBanner}
                      className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">No banner selected</p>
                    <p className="text-[11px] text-slate-500">Upload a banner or select from media library</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                  </button>
                  <button
                    type="button"
                    onClick={onOpenMediaLibrary}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>Browse Library</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Countdown Timer */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Countdown Timer
              </label>
              <span className="text-[11px] text-slate-400">Time remaining until event starts</span>
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1">Days</span>
                <input
                  type="number"
                  min="0"
                  value={days}
                  onChange={(e) => setDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1">Hours (0-23)</span>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={hours}
                  onChange={(e) => setHours(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1">Minutes (0-59)</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs font-mono"
                  placeholder="0"
                />
              </div>

              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1">Seconds (0-59)</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all shadow-xs font-mono"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSaving || !name.trim() || !date.trim() || !location.trim()}
            onClick={onSave}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm active:scale-98"
          >
            <Save className="w-4 h-4" />
            <span>{editingPage ? 'Save Changes' : 'Create Page'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
