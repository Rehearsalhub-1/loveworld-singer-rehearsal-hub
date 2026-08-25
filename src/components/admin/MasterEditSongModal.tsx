"use client";

import { useState, useEffect } from 'react';
import {
  X, Music, Upload, Check, Trash2,
  Save, AlertCircle, Plus, Mic, Volume2, FileText, Globe, Lock, Sliders, Sparkles, Layers,
  Play, Pause
} from 'lucide-react';
import { MasterSong, MasterLibraryService } from '@/lib/master-library';
import MediaSelectionModal from '@/components/MediaSelectionModal';

interface MasterEditSongModalProps {
  song?: MasterSong | null;
  isOpen: boolean;
  onClose: () => void;
  onSongUpdated?: (updatedSong: MasterSong) => void;
  onSongCreated?: (newSong: MasterSong) => void;
  mode?: 'edit' | 'create';
}

type TabType = 'details' | 'audio' | 'lyrics' | 'access';

const DEFAULT_AUDIO_PARTS: { key: string; label: string; color: string; desc: string }[] = [
  { key: 'full', label: 'Full Mix (Instrumental + Vocals)', color: 'purple', desc: 'Complete master reference track' },
  { key: 'soprano', label: 'Soprano Stem', color: 'pink', desc: 'High vocal part track' },
  { key: 'alto', label: 'Alto Stem', color: 'rose', desc: 'Middle harmony vocal track' },
  { key: 'tenor', label: 'Tenor Stem', color: 'blue', desc: 'Lower harmony vocal track' },
  { key: 'bass', label: 'Bass Stem', color: 'indigo', desc: 'Low vocal / bass part track' },
];

const markdownToHtml = (text: string): string => {
  if (!text) return '';
  const paragraphs = text.split('\n\n');
  return paragraphs
    .filter(p => p.trim() !== '')
    .map(paragraph => {
      let processed = paragraph.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      processed = processed.replace(/\n/g, '<br>');
      return `<div>${processed}</div>`;
    })
    .join('');
};

const htmlToMarkdown = (html: string): string => {
  if (!html) return '';
  return html
    .replace(/<div[^>]*>(.*?)<\/div>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

export function MasterEditSongModal({
  song,
  isOpen,
  onClose,
  onSongUpdated,
  onSongCreated,
  mode = 'edit',
}: MasterEditSongModalProps) {
  const isCreateMode = mode === 'create' || !song;
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const [formData, setFormData] = useState({
    title: song?.title || '',
    writer: song?.writer || '',
    leadSinger: song?.leadSinger || '',
    key: song?.key || '',
    tempo: song?.tempo || '',
    conductor: song?.conductor || '',
    leadKeyboardist: song?.leadKeyboardist || '',
    bassGuitarist: song?.bassGuitarist || '',
    drummer: song?.drummer || '',
    category: song?.category || '',
    lyrics: htmlToMarkdown(song?.lyrics || ''),
    solfa: htmlToMarkdown(song?.solfa || ''),
    history: htmlToMarkdown(song?.history || ''),
    imageUrl: song?.imageUrl || '',
    isHQOnly: song?.isHQOnly || song?.isHqOnly || false,
  });

  const [audioUrls, setAudioUrls] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {
      full: song?.audioUrls?.full || song?.audioFile || '',
      soprano: song?.audioUrls?.soprano || '',
      alto: song?.audioUrls?.alto || '',
      tenor: song?.audioUrls?.tenor || '',
      bass: song?.audioUrls?.bass || '',
    };
    if (song?.customParts) {
      const parts = Array.isArray(song.customParts)
        ? song.customParts
        : typeof song.customParts === 'object'
          ? Object.keys(song.customParts)
          : [];
      parts.forEach((part: string) => {
        initial[part] = song.audioUrls?.[part] || '';
      });
    }
    return initial;
  });

  const [customParts, setCustomParts] = useState<string[]>(() => {
    if (!song?.customParts) return [];
    if (Array.isArray(song.customParts)) return song.customParts;
    if (typeof song.customParts === 'object') return Object.keys(song.customParts);
    return [];
  });

  const [newPartName, setNewPartName] = useState('');
  const [showAddPart, setShowAddPart] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [selectingPart, setSelectingPart] = useState<string | null>(null);

  // Inline Audio Playback for Stems
  const [playingStemKey, setPlayingStemKey] = useState<string | null>(null);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);

  const handlePlayStem = (key: string, url: string) => {
    if (!url) return;
    if (playingStemKey === key) {
      if (audioPlayer) {
        audioPlayer.pause();
      }
      setPlayingStemKey(null);
      return;
    }

    if (audioPlayer) {
      audioPlayer.pause();
    }

    const newAudio = new Audio(url);
    newAudio.onended = () => setPlayingStemKey(null);
    newAudio.onerror = () => setPlayingStemKey(null);
    newAudio.play().catch(() => setPlayingStemKey(null));
    setAudioPlayer(newAudio);
    setPlayingStemKey(key);
  };

  useEffect(() => {
    return () => {
      if (audioPlayer) {
        audioPlayer.pause();
      }
    };
  }, [audioPlayer]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('details');
      if (song) {
        setFormData({
          title: song.title || '',
          writer: song.writer || '',
          leadSinger: song.leadSinger || '',
          key: song.key || '',
          tempo: song.tempo || '',
          conductor: song.conductor || '',
          leadKeyboardist: song.leadKeyboardist || '',
          bassGuitarist: song.bassGuitarist || '',
          drummer: song.drummer || '',
          category: song.category || '',
          lyrics: htmlToMarkdown(song.lyrics || ''),
          solfa: htmlToMarkdown(song.solfa || ''),
          history: htmlToMarkdown(song.history || ''),
          imageUrl: song.imageUrl || '',
          isHQOnly: song.isHQOnly || song.isHqOnly || false,
        });
        const initial: Record<string, string> = {
          full: song.audioUrls?.full || song.audioFile || '',
          soprano: song.audioUrls?.soprano || '',
          alto: song.audioUrls?.alto || '',
          tenor: song.audioUrls?.tenor || '',
          bass: song.audioUrls?.bass || '',
        };
        const parts = Array.isArray(song.customParts)
          ? song.customParts
          : song.customParts && typeof song.customParts === 'object'
            ? Object.keys(song.customParts)
            : [];
        parts.forEach((part: string) => {
          initial[part] = song.audioUrls?.[part] || '';
        });
        setAudioUrls(initial);
        setCustomParts(parts);
      } else {
        setFormData({
          title: '',
          writer: '',
          leadSinger: '',
          key: '',
          tempo: '',
          conductor: '',
          leadKeyboardist: '',
          bassGuitarist: '',
          drummer: '',
          category: '',
          lyrics: '',
          solfa: '',
          history: '',
          imageUrl: '',
          isHQOnly: false,
        });
        setAudioUrls({
          full: '',
          soprano: '',
          alto: '',
          tenor: '',
          bass: '',
        });
        setCustomParts([]);
      }
      setError(null);
      setSuccess(false);
    }
  }, [song, isOpen]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleRemoveAudio = (part: string) => {
    setAudioUrls(prev => ({ ...prev, [part]: '' }));
  };

  const handleOpenMediaSelector = (part: string) => {
    setSelectingPart(part);
    setShowMediaSelector(true);
  };

  const handleMediaFileSelect = (file: { id: string; name: string; url: string; type: string }) => {
    if (selectingPart === 'image' && file.type === 'image') {
      handleInputChange('imageUrl', file.url);
      setShowMediaSelector(false);
      setSelectingPart(null);
    } else if (selectingPart && file.type === 'audio') {
      setAudioUrls(prev => ({ ...prev, [selectingPart]: file.url }));
      setShowMediaSelector(false);
      setSelectingPart(null);
    }
  };

  const handleAddCustomPart = () => {
    const partName = newPartName.trim();
    if (!partName) return;

    const normalizedName = partName.toLowerCase();
    const existingParts = ['full', 'soprano', 'alto', 'tenor', 'bass', ...customParts.map(p => p.toLowerCase())];
    if (existingParts.includes(normalizedName)) {
      setError('This stem part already exists');
      return;
    }

    setCustomParts(prev => [...prev, partName]);
    setAudioUrls(prev => ({ ...prev, [partName]: '' }));
    setNewPartName('');
    setShowAddPart(false);
    setError(null);
  };

  const handleRemoveCustomPart = (partName: string) => {
    setCustomParts(prev => prev.filter(p => p !== partName));
    setAudioUrls(prev => {
      const updated = { ...prev };
      delete updated[partName];
      return updated;
    });
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Song title is required');
      setActiveTab('details');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const allAudioUrls: Record<string, string> = {};
      Object.entries(audioUrls).forEach(([key, value]) => {
        if (value) allAudioUrls[key] = value;
      });

      const songData: any = {
        title: formData.title.trim(),
        writer: formData.writer.trim(),
        leadSinger: formData.leadSinger.trim(),
        key: formData.key.trim(),
        tempo: formData.tempo.trim(),
        conductor: formData.conductor.trim(),
        leadKeyboardist: formData.leadKeyboardist.trim(),
        bassGuitarist: formData.bassGuitarist.trim(),
        drummer: formData.drummer.trim(),
        category: formData.category.trim(),
        lyrics: markdownToHtml(formData.lyrics),
        solfa: markdownToHtml(formData.solfa),
        history: markdownToHtml(formData.history),
        audioUrls: allAudioUrls,
        audioFile: audioUrls.full,
        customParts: customParts,
        imageUrl: formData.imageUrl,
        isHQOnly: formData.isHQOnly,
        isHqOnly: formData.isHQOnly,
        status: formData.isHQOnly ? 'hidden' : 'active'
      };

      if (isCreateMode) {
        const res: any = await MasterLibraryService.createMasterSong(songData);
        setSuccess(true);
        const newSong: MasterSong = {
          id: res?.data?.id || res?.id || `ms_${Date.now()}`,
          ...songData,
          sourceType: 'manual',
          publishedAt: new Date().toISOString(),
          importCount: 0,
        };
        onSongCreated?.(newSong);
        setTimeout(() => {
          onClose();
        }, 600);
      } else if (song) {
        await MasterLibraryService.updateMasterSong(song.id, songData);
        setSuccess(true);
        const updatedSong: MasterSong = {
          ...song,
          ...songData,
        };
        onSongUpdated?.(updatedSong);
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err?.message || 'Failed to save ministered song');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[300] animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Spacious Full Studio Modal */}
      <div className="fixed inset-2 md:inset-6 lg:inset-10 z-[300] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center shadow-md shadow-purple-200 text-white">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  {isCreateMode ? 'Add Ministered Song' : 'Edit Ministered Song'}
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                  formData.isHQOnly
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}>
                  {formData.isHQOnly ? '🔒 HQ Only' : '🌍 Global Public'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {isCreateMode
                  ? 'Add a new official piece to the global Loveworld Singers repertoire'
                  : `Managing arrangement, stems, and lyrics for "${formData.title || 'Untitled'}"`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-2xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-slate-100 bg-slate-50/70 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'details'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Metadata & Musical Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audio'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Audio Stems & Tracks</span>
            {Object.values(audioUrls).filter(Boolean).length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-100 text-purple-700">
                {Object.values(audioUrls).filter(Boolean).length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('lyrics')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'lyrics'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lyrics & Tonic Solfa</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('access')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'access'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {formData.isHQOnly ? <Lock className="w-3.5 h-3.5 text-rose-600" /> : <Globe className="w-3.5 h-3.5 text-emerald-600" />}
            <span>Access & Group Visibility</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-emerald-700">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{isCreateMode ? 'Ministered song created successfully!' : 'Ministered song updated successfully!'}</span>
            </div>
          )}

          {/* TAB 1: METADATA & MUSICAL INFO */}
          {activeTab === 'details' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Song Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900 placeholder-slate-400"
                    placeholder="e.g., King of Glory"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Category</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="e.g., Worship, Praise, Hymn"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Lead Singer / Vocalist</label>
                  <input
                    type="text"
                    value={formData.leadSinger}
                    onChange={(e) => handleInputChange('leadSinger', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="Lead vocalist name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Writer / Composer</label>
                  <input
                    type="text"
                    value={formData.writer}
                    onChange={(e) => handleInputChange('writer', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="Songwriter"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Musical Key</label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => handleInputChange('key', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="e.g., C, G, Dm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Tempo (BPM)</label>
                  <input
                    type="text"
                    value={formData.tempo}
                    onChange={(e) => handleInputChange('tempo', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="e.g., 72 BPM"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Conductor's Guide</label>
                  <input
                    type="text"
                    value={formData.conductor}
                    onChange={(e) => handleInputChange('conductor', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="Conductor notes or guide"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Lead Keyboardist</label>
                  <input
                    type="text"
                    value={formData.leadKeyboardist}
                    onChange={(e) => handleInputChange('leadKeyboardist', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="Keyboardist name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Bass Guitarist</label>
                  <input
                    type="text"
                    value={formData.bassGuitarist}
                    onChange={(e) => handleInputChange('bassGuitarist', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="Bassist name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Drummer</label>
                  <input
                    type="text"
                    value={formData.drummer}
                    onChange={(e) => handleInputChange('drummer', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900"
                    placeholder="Drummer name"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO STEMS & MULTI-TRACK */}
          {activeTab === 'audio' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Stem Audio Configuration</h3>
                  <p className="text-[11px] text-slate-400">Assign master full mix and individual vocal isolation stem files</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddPart(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Custom Stem</span>
                </button>
              </div>

              {showAddPart && (
                <div className="p-3.5 bg-purple-50/50 border border-purple-200 rounded-2xl flex items-center gap-2 animate-in fade-in duration-150">
                  <input
                    type="text"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    placeholder="e.g., Alto 2, Brass Stem, Backing Vocals"
                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomPart}
                    className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Add Part
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPart(false)}
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DEFAULT_AUDIO_PARTS.map((part) => {
                  const url = audioUrls[part.key];
                  const isPlaying = playingStemKey === part.key;
                  return (
                    <div key={part.key} className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-900">{part.label}</span>
                          <p className="text-[10px] text-slate-400">{part.desc}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {url ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-bold">
                              Attached
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">Empty</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Inline Play/Pause Preview Button */}
                        {url && (
                          <button
                            type="button"
                            onClick={() => handlePlayStem(part.key, url)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                              isPlaying
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-200 animate-pulse'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                            title={isPlaying ? 'Pause' : 'Play stem track'}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                        )}

                        <input
                          type="text"
                          value={url || ''}
                          onChange={(e) => setAudioUrls(prev => ({ ...prev, [part.key]: e.target.value }))}
                          placeholder="Paste audio URL or upload file..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                        />

                        {/* Upload from Computer File Input */}
                        <label className="p-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-700 rounded-xl transition-colors shadow-2xs cursor-pointer" title="Upload Audio File">
                          <Upload className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Create object URL for instant preview or upload
                                const objectUrl = URL.createObjectURL(file);
                                setAudioUrls(prev => ({ ...prev, [part.key]: objectUrl }));
                              }
                            }}
                          />
                        </label>

                        {/* Media Library Selector Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenMediaSelector(part.key)}
                          className="p-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-700 rounded-xl transition-colors shadow-2xs"
                          title="Browse Media Library"
                        >
                          <Music className="w-3.5 h-3.5" />
                        </button>

                        {url && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAudio(part.key)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                            title="Remove file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {customParts.map((partName) => {
                  const url = audioUrls[partName];
                  const isPlaying = playingStemKey === partName;
                  return (
                    <div key={partName} className="p-4 bg-slate-50/80 border border-slate-200/80 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{partName} (Custom)</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomPart(partName)}
                          className="text-[10px] text-rose-600 hover:underline font-bold"
                        >
                          Delete Part
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {url && (
                          <button
                            type="button"
                            onClick={() => handlePlayStem(partName, url)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all flex-shrink-0 ${
                              isPlaying
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-200 animate-pulse'
                                : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                            title={isPlaying ? 'Pause' : 'Play stem track'}
                          >
                            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
                          </button>
                        )}

                        <input
                          type="text"
                          value={url || ''}
                          onChange={(e) => setAudioUrls(prev => ({ ...prev, [partName]: e.target.value }))}
                          placeholder="Paste audio URL or upload file..."
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-800"
                        />

                        <label className="p-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-700 rounded-xl transition-colors shadow-2xs cursor-pointer" title="Upload Audio File">
                          <Upload className="w-3.5 h-3.5" />
                          <input
                            type="file"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const objectUrl = URL.createObjectURL(file);
                                setAudioUrls(prev => ({ ...prev, [partName]: objectUrl }));
                              }
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleOpenMediaSelector(partName)}
                          className="p-2 bg-white border border-slate-200 hover:border-purple-300 text-slate-600 hover:text-purple-700 rounded-xl transition-colors shadow-2xs"
                        >
                          <Music className="w-3.5 h-3.5" />
                        </button>

                        {url && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAudio(partName)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: LYRICS & TONIC SOLFA */}
          {activeTab === 'lyrics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Official Lyrics</label>
                <textarea
                  rows={14}
                  value={formData.lyrics}
                  onChange={(e) => handleInputChange('lyrics', e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900 resize-y leading-relaxed font-mono"
                  placeholder="Verse 1:&#10;In Your presence Lord...&#10;&#10;Chorus:&#10;Hallelujah..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Tonic Solfa Notes / Arrangement Notation</label>
                <textarea
                  rows={14}
                  value={formData.solfa}
                  onChange={(e) => handleInputChange('solfa', e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white text-slate-900 resize-y leading-relaxed font-mono"
                  placeholder="d:r:m:f:s | s:f:m:r:d&#10;Soprano: m:-:f | s:-:-&#10;Alto: d:-:r | m:-:-"
                />
              </div>
            </div>
          )}

          {/* TAB 4: ACCESS & GROUP VISIBILITY */}
          {activeTab === 'access' && (
            <div className="space-y-5 animate-in fade-in duration-150 max-w-2xl">
              <div className="p-5 bg-purple-50/50 border border-purple-100 rounded-3xl space-y-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Visibility & Group Access Control</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Control which groups and outer zones are permitted to access this ministered song</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => handleInputChange('isHQOnly', false)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      !formData.isHQOnly
                        ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        !formData.isHQOnly ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                      }`}>
                        {!formData.isHQOnly && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">🌍 Global Repertoire</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 pl-6.5 leading-relaxed">
                      Open to all Loveworld Singers choir members and zonal hubs worldwide for rehearsals.
                    </p>
                  </div>

                  <div
                    onClick={() => handleInputChange('isHQOnly', true)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      formData.isHQOnly
                        ? 'bg-white border-purple-500 ring-2 ring-purple-500/20 shadow-xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        formData.isHQOnly ? 'border-purple-600 bg-purple-600 text-white' : 'border-slate-300'
                      }`}>
                        {formData.isHQOnly && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <span className="text-xs font-bold text-slate-900">🔒 HQ Group Only</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-2 pl-6.5 leading-relaxed">
                      Restricted strictly to Loveworld Singers HQ group members. Completely hidden from outer zones.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-purple-200 active:scale-95 disabled:opacity-50"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isCreateMode ? 'Add Ministered Song' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {showMediaSelector && (
        <MediaSelectionModal
          isOpen={showMediaSelector}
          onClose={() => {
            setShowMediaSelector(false);
            setSelectingPart(null);
          }}
          onFileSelect={handleMediaFileSelect}
          allowedTypes={selectingPart === 'image' ? ['image'] : ['audio']}
        />
      )}
    </>
  );
}
