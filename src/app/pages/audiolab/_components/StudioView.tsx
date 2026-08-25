"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft, Settings, Save, Mic,
  PlusCircle, SkipBack, Play, Pause, Square, Circle,
  AudioLines, Check, Trash2,
  Sliders, Download, Pencil, Timer, Upload,
  Repeat, RotateCcw, Undo2
} from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useAudioLab } from '../_context/AudioLabContext';
import { useAuth } from '@/hooks/useAuth';
import { createProject, getProject, updateProject, onProjectUpdate } from '../_lib/project-service';
import { audioEngine } from '../_lib/audio-engine';
import { uploadRecording, generateRecordingFileName } from '../_lib/upload-service';
import { saveRecordingToIndexedDB, getRecordingFromIndexedDB, deleteRecordingFromIndexedDB, getProjectRecordings } from '../_lib/indexeddb-storage';
import { exportMix, TrackToExport } from '../_lib/export-service';

import { trackEffectsEngine, type TrackEffects, DEFAULT_EFFECTS } from '../_lib/track-effects-engine';
import { NextActionPrompt } from './NextActionPrompt';
import { ProjectSettingsSheet } from './ProjectSettingsSheet';
import { TrackEffectsPanel } from './TrackEffectsPanel';
import { AnimatedWaveform } from './AnimatedWaveform';
import { useZone } from '@/hooks/useZone';
import type { AudioLabProject } from '../_types';

interface Track {
  id: string;
  name: string;
  icon: typeof Mic;
  volume: number;
  muted: boolean;
  solo: boolean;
  isActive: boolean;
  isRecording: boolean;
  waveformHeights: number[];
  audioBlob?: Blob;
  effects?: TrackEffects;
  audioUrl?: string;
  localStored?: boolean;
}

export function StudioView() {
  const router = useRouter();
  const { setView, initializeAudio, state, setCurrentProject: setContextProject } = useAudioLab();
  const { user } = useAuth();
  const { currentZone } = useZone();

  const [tracks, setTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [inputLevel, setInputLevel] = useState(0);
  const [currentProject, setCurrentProject] = useState<AudioLabProject | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  const [hasFirstRecording, setHasFirstRecording] = useState(false);
  const [showNextActionPrompt, setShowNextActionPrompt] = useState(false);
  const [justRecordedFirstTake, setJustRecordedFirstTake] = useState(false);
  const [isExistingProject, setIsExistingProject] = useState(false);


  const [showSettings, setShowSettings] = useState(false);

  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [effectsTrackId, setEffectsTrackId] = useState<string | null>(null);

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editingTrackName, setEditingTrackName] = useState('');

  const [failedUploads, setFailedUploads] = useState<Map<string, number>>(new Map()); // trackId -> retry count
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);
  const [recoveredTracks, setRecoveredTracks] = useState<string[]>([]);
  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingHeader, setIsExportingHeader] = useState(false);
  const [exportProgressHeader, setExportProgressHeader] = useState(0);

  // Confirmation states
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [countIn, setCountIn] = useState(0);
  const [lastRecordedTrackId, setLastRecordedTrackId] = useState<string | null>(null);

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [metronomeTempo, setMetronomeTempo] = useState(120);
  const [tapTimes, setTapTimes] = useState<number[]>([]);
  const metronomeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const metronomeAudioRef = useRef<AudioContext | null>(null);
  const nextMetronomeNoteTime = useRef<number>(0);
  const metronomeSchedulerId = useRef<number | null>(null);



  const recordingStartTime = useRef<number>(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);
  const waveformSamples = useRef<number[]>([]);
  const playbackAudioRef = useRef<HTMLAudioElement | null>(null);

  const trackAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const playbackIntervalRef = useRef<number | null>(null);
  const isPlayingRef = useRef(false); // Track playing state for cleanup

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Stop metronome
      if (metronomeSchedulerId.current) {
        cancelAnimationFrame(metronomeSchedulerId.current);
      }
      if (metronomeAudioRef.current) {
        metronomeAudioRef.current.close();
      }

      // Stop playback
      if (playbackIntervalRef.current) {
        cancelAnimationFrame(playbackIntervalRef.current);
      }

      // Cleanup audio elements and blob URLs
      trackAudioRefs.current.forEach((audio, id) => {
        audio.pause();
        if (audio.src?.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      });
      trackAudioRefs.current.clear();

      // Cleanup effects engine
      trackEffectsEngine.dispose();

      // Cleanup recording interval
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);


  useEffect(() => {
    if (user?.uid && state.currentProjectId) {
      const unsubscribe = onProjectUpdate(state.currentProjectId, (project) => {
        if (project) {
          handleProjectSync(project);
        }
      });
      return () => unsubscribe();
    }
  }, [user?.uid, state.currentProjectId]);

  useEffect(() => {
    audioEngine.onInputLevel = (level) => {
      setInputLevel(level);
      if (isRecording) {
        waveformSamples.current.push(Math.round(level * 100));
      }
    };

    return () => {
      audioEngine.onInputLevel = null;
    };
  }, [isRecording]);

  useEffect(() => {
    if (tracks.length === 0) {
      const firstTrack: Track = {
        id: `track-${Date.now()}`,
        name: 'Vocal 1',
        icon: Mic,
        volume: 80,
        muted: false,
        solo: false,
        isActive: true,
        isRecording: false,
        waveformHeights: [],
        localStored: false
      };
      setTracks([firstTrack]);
    }
  }, []);

  // Check for unsaved recordings on mount (recovery feature)
  useEffect(() => {
    const checkForUnsavedRecordings = async () => {
      if (currentProject?.id) {
        const savedRecordings = await getProjectRecordings(currentProject.id);
        if (savedRecordings.size > 0) {
          const trackIds = Array.from(savedRecordings.keys());
          setRecoveredTracks(trackIds);
          setShowRecoveryPrompt(true);
        }
      }
    };

    // Only check after project is loaded
    if (currentProject && !isLoading) {
      checkForUnsavedRecordings();
    }
  }, [currentProject?.id, isLoading]);

  // Recover unsaved recordings
  const recoverUnsavedRecordings = async () => {
    if (!currentProject?.id) return;

    const savedRecordings = await getProjectRecordings(currentProject.id);

    for (const [trackId, blob] of savedRecordings) {
      const existingTrack = tracks.find(t => t.id === trackId);

      if (existingTrack && !existingTrack.audioUrl) {
        // Recover to existing track
        const blobUrl = URL.createObjectURL(blob);
        setTracks(prev => prev.map(t =>
          t.id === trackId
            ? { ...t, audioBlob: blob, localStored: true, waveformHeights: generateSimpleWaveform(50) }
            : t
        ));

        const audio = new Audio(blobUrl);
        audio.crossOrigin = 'anonymous';
        trackAudioRefs.current.set(trackId, audio);
      }
    }

    setShowRecoveryPrompt(false);
    setHasFirstRecording(true);
  };

  const dismissRecovery = async () => {
    for (const trackId of recoveredTracks) {
      await deleteRecordingFromIndexedDB(trackId);
    }
    setShowRecoveryPrompt(false);
    setRecoveredTracks([]);
  };

  const handleProjectSync = useCallback(async (project: AudioLabProject) => {
    // If it's the first load or project info changed
    if (!currentProject || currentProject.id !== project.id) {
      setIsLoading(true);
    }

    setCurrentProject(project);
    setIsExistingProject(true);
    setContextProject(project.id);

    if (project.duration && project.duration > 0) {
      setDuration(prev => Math.max(prev, project.duration || 0));
    }

    if (project.tracks) {
      setTracks(prevTracks => {
        // Map new tracks from project
        const newTracks = project.tracks.map((t, i) => {
          const existing = prevTracks.find(pt => pt.id === t.id);
          
          // Define a default effects object if not present
          const DEFAULT_EFFECTS = {
            volume: 80,
            pan: 0,
            reverb: 20,
            bass: 0,
            treble: 0,
            compression: 30
          };

          return {
            id: t.id,
            name: t.name,
            icon: Mic,
            volume: t.volume || 80,
            muted: t.muted || false,
            solo: t.solo || false,
            isActive: existing ? existing.isActive : i === 0,
            isRecording: existing ? existing.isRecording : false,
            waveformHeights: t.waveform || [],
            audioUrl: t.audioUrl,
            // Keep local blob if URL hasn't been set yet or if it's the same track
            audioBlob: existing?.audioBlob,
            localStored: !!t.audioUrl || (existing?.localStored || false),
            effects: t.effects ? {
              volume: t.effects.volume ?? DEFAULT_EFFECTS.volume,
              pan: t.effects.pan ?? DEFAULT_EFFECTS.pan,
              reverb: t.effects.reverb ?? DEFAULT_EFFECTS.reverb,
              bass: t.effects.bass ?? DEFAULT_EFFECTS.bass,
              treble: t.effects.treble ?? DEFAULT_EFFECTS.treble,
              compression: t.effects.compression ?? DEFAULT_EFFECTS.compression
            } : DEFAULT_EFFECTS
          };
        });

        // Initialize audio for new tracks or changed URLs
        newTracks.forEach(track => {
          if (track.audioUrl && !track.audioUrl.startsWith('blob:')) {
            const existingAudio = trackAudioRefs.current.get(track.id);
            
            // Only reload if URL changed or no audio exists
            if (!existingAudio || existingAudio.src !== track.audioUrl) {
              if (existingAudio && existingAudio.src.startsWith('blob:')) {
                URL.revokeObjectURL(existingAudio.src);
              }

              const audio = new Audio();
              audio.crossOrigin = 'anonymous';
              audio.preload = 'auto';
              audio.src = track.audioUrl;
              trackAudioRefs.current.set(track.id, audio);
              
              audio.onloadedmetadata = () => {
                if (audio.duration && isFinite(audio.duration)) {
                  setDuration(prev => Math.max(prev, audio.duration));
                }
              };
              audio.load();
            } else {
              // Just update volume/mute status if audio already exists
              existingAudio.volume = track.muted ? 0 : track.volume / 100;
            }
          }
        });

        if (project.tracks.some(t => t.audioUrl)) {
          setHasFirstRecording(true);
        }

        return newTracks;
      });
    }

    setIsLoading(false);
  }, [currentProject, setContextProject, setDuration, setTracks, setIsLoading, setHasFirstRecording]); // Added all necessary dependencies

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleMute = (trackId: string) => {
    setTracks(prevTracks => {
      const updatedTracks = prevTracks.map(t => t.id === trackId ? { ...t, muted: !t.muted } : t);

      const audio = trackAudioRefs.current.get(trackId);
      if (audio) {
        const track = updatedTracks.find(t => t.id === trackId);
        if (track) {
          audio.volume = track.muted ? 0 : track.volume / 100;
        }
      }

      return updatedTracks;
    });
  };

  const toggleSolo = (trackId: string) => {
    setTracks(prevTracks => {
      const updatedTracks = prevTracks.map(t => t.id === trackId ? { ...t, solo: !t.solo } : t);

      const audio = trackAudioRefs.current.get(trackId);
      if (audio) {
        const track = updatedTracks.find(t => t.id === trackId);
        if (track) {
          const soloTracks = updatedTracks.filter(t => t.solo && (t.audioBlob || t.audioUrl));
          if (soloTracks.length > 0) {
            audio.volume = track.solo ? track.volume / 100 : 0;
          } else {
            audio.volume = track.muted ? 0 : track.volume / 100;
          }
        }
      }

      return updatedTracks;
    });
  };

  const addNewTrack = () => {
    const trackNumber = tracks.length + 1;
    const newTrack: Track = {
      id: `track-${Date.now()}`,
      name: `Vocal ${trackNumber}`,
      icon: Mic,
      volume: 80,
      muted: false,
      solo: false,
      isActive: true,
      isRecording: false,
      waveformHeights: [],
      localStored: false
    };
    setTracks(prev => [...prev.map(t => ({ ...t, isActive: false })), newTrack]);
  };

  const setActiveTrack = (trackId: string) => {
    setTracks(tracks.map(t => ({ ...t, isActive: t.id === trackId })));
  };

  const deleteTrack = (trackId: string) => {
    if (tracks.length <= 1) return;

    const trackToDelete = tracks.find(t => t.id === trackId);

    if (trackToDelete?.audioUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(trackToDelete.audioUrl);
    }

    const audio = trackAudioRefs.current.get(trackId);
    if (audio && audio.src.startsWith('blob:')) {
      URL.revokeObjectURL(audio.src);
    }
    trackAudioRefs.current.delete(trackId);

    removeRecordingFromLocal(trackId);

    if (lastRecordedTrackId === trackId) {
      setLastRecordedTrackId(null);
    }

    const newTracks = tracks.filter(t => t.id !== trackId);
    if (trackToDelete?.isActive && newTracks.length > 0) {
      newTracks[0].isActive = true;
    }
    setTracks(newTracks);
  };

  const undoLastTake = () => {
    if (lastRecordedTrackId) {
      deleteTrack(lastRecordedTrackId);
      setLastRecordedTrackId(null);
    }
  };

  const startEditingTrackName = (trackId: string, currentName: string) => {
    setEditingTrackId(trackId);
    setEditingTrackName(currentName);
  };

  const saveTrackName = () => {
    if (editingTrackId && editingTrackName.trim()) {
      setTracks(prev => prev.map(t =>
        t.id === editingTrackId ? { ...t, name: editingTrackName.trim() } : t
      ));
    }
    setEditingTrackId(null);
    setEditingTrackName('');
  };

  const playMetronomeTick = (time: number) => {
    if (!metronomeAudioRef.current || metronomeAudioRef.current.state === 'closed') {
      metronomeAudioRef.current = new AudioContext();
    }
    const ctx = metronomeAudioRef.current;

    // Ensure context is running (needed after user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    osc.connect(envelope);
    envelope.connect(ctx.destination);

    // High frequency for the tick
    osc.frequency.setValueAtTime(1000, time);

    envelope.gain.setValueAtTime(0, time);
    envelope.gain.linearRampToValueAtTime(0.5, time + 0.001);
    envelope.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.start(time);
    osc.stop(time + 0.1);
  };

  const scheduler = () => {
    if (!metronomeAudioRef.current) return;

    // While there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    const lookahead = 0.1; // 100ms lookahead
    while (nextMetronomeNoteTime.current < metronomeAudioRef.current.currentTime + lookahead) {
      playMetronomeTick(nextMetronomeNoteTime.current);
      const secondsPerBeat = 60.0 / metronomeTempo;
      nextMetronomeNoteTime.current += secondsPerBeat;
    }
    metronomeSchedulerId.current = requestAnimationFrame(scheduler);
  };

  const toggleMetronome = () => {
    if (metronomeEnabled) {
      if (metronomeSchedulerId.current) {
        cancelAnimationFrame(metronomeSchedulerId.current);
        metronomeSchedulerId.current = null;
      }
      setMetronomeEnabled(false);
    } else {
      if (!metronomeAudioRef.current || metronomeAudioRef.current.state === 'closed') {
        metronomeAudioRef.current = new AudioContext();
      }

      const ctx = metronomeAudioRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      nextMetronomeNoteTime.current = ctx.currentTime + 0.05;
      setMetronomeEnabled(true);
      scheduler();
    }
  };

  const updateMetronomeTempo = (newTempo: number) => {
    setMetronomeTempo(newTempo);
  };

  const handleTapTempo = () => {
    const now = Date.now();
    const newTapTimes = [...tapTimes, now].slice(-4);
    setTapTimes(newTapTimes);

    if (newTapTimes.length >= 2) {
      const intervals = [];
      for (let i = 1; i < newTapTimes.length; i++) {
        intervals.push(newTapTimes[i] - newTapTimes[i - 1]);
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const newBpm = Math.round(60000 / avgInterval);
      if (newBpm >= 40 && newBpm <= 240) {
        setMetronomeTempo(newBpm);
      }
    }

    // Visual feedback
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const handleImportAudio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/m4a', 'audio/aac'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|webm|m4a|aac)$/i)) {
      alert('Please select a valid audio file (MP3, WAV, OGG, WebM, M4A, AAC)');
      return;
    }

    setIsImporting(true);

    try {
      const blob = new Blob([await file.arrayBuffer()], { type: file.type });
      const blobUrl = URL.createObjectURL(blob);

      // Create audio element to get duration
      const audio = new Audio(blobUrl);

      await new Promise<void>((resolve, reject) => {
        audio.onloadedmetadata = () => resolve();
        audio.onerror = () => reject(new Error('Failed to load audio file'));
        setTimeout(() => resolve(), 5000); // Timeout fallback
      });

      const audioDuration = audio.duration && isFinite(audio.duration) ? audio.duration : 0;

      // Generate real waveform from audio data
      const waveform = await analyzeAudioWaveform(blob);

      // Create new track with imported audio
      const trackNumber = tracks.length + 1;
      const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
      const newTrackId = `track-${Date.now()}`;

      const newTrack: Track = {
        id: newTrackId,
        name: fileName || `Import ${trackNumber}`,
        icon: Mic,
        volume: 80,
        muted: false,
        solo: false,
        isActive: true,
        isRecording: false,
        waveformHeights: waveform,
        audioBlob: blob,
        localStored: false
      };

      // Add track and set it as active
      setTracks(prev => [...prev.map(t => ({ ...t, isActive: false })), newTrack]);

      // Store audio reference
      audio.crossOrigin = 'anonymous';
      trackAudioRefs.current.set(newTrackId, audio);

      if (audioDuration > duration) {
        setDuration(audioDuration);
      }

      setHasFirstRecording(true);

      // Save locally
      await saveRecordingLocally(newTrackId, blob);

      // Upload to cloud if project exists
      if (currentProject) {
        uploadRecordingToCloud(blob, newTrackId);
      }

    } catch (error) {
 console.error('Failed to import audio:', error);
      alert('Failed to import audio file. Please try again.');
    } finally {
      setIsImporting(false);
      // Reset input so same file can be selected again
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const analyzeAudioWaveform = async (blob: Blob): Promise<number[]> => {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      const samplesCount = channelData.length;

      const targetLength = 50; // Match StudioView target
      const blockSize = Math.floor(samplesCount / targetLength);
      const peaks: number[] = [];

      for (let i = 0; i < targetLength; i++) {
        const start = i * blockSize;
        let max = 0;
        for (let j = 0; j < blockSize; j++) {
          const val = Math.abs(channelData[start + j]);
          if (val > max) max = val;
        }
        peaks.push(Math.round(max * 80)); // Normalize to 0-80 scale
      }

      await ctx.close();
      return peaks;
    } catch (error) {
 console.error('[analyzeAudioWaveform] Failed:', error);
      return Array.from({ length: 50 }, () => Math.floor(Math.random() * 20) + 10);
    }
  };

  const generateSimpleWaveform = (length: number): number[] => {
    return Array.from({ length }, () => Math.random() * 60 + 20);
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels * 2;
    const arrayBuffer = new ArrayBuffer(44 + length);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length, true);

    const channels = [];
    for (let i = 0; i < numChannels; i++) channels.push(buffer.getChannelData(i));

    let pos = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const sample = Math.max(-1, Math.min(1, channels[ch][i]));
        view.setInt16(pos, sample * 0x7FFF, true);
        pos += 2;
      }
    }

    return new Blob([arrayBuffer], { type: 'audio/wav' });
  };

  const handleEffectsChange = (trackId: string, effects: TrackEffects) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, effects } : t));
    trackEffectsEngine.applyEffects(trackId, effects);
  };

  const openEffectsPanel = (trackId: string) => {
    setEffectsTrackId(trackId);
    setShowEffectsPanel(true);
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [trackToDelete, setTrackToDelete] = useState<string | null>(null);

  const handleStartRecording = async () => {
    const activeTrack = tracks.find(t => t.isActive);
    if (!activeTrack) {
      addNewTrack();
      return;
    }

    if (activeTrack.audioUrl) {
      setTrackToDelete(activeTrack.id);
      setShowDeleteConfirm(true);
      return;
    }

    await startRecordingOnTrack();
  };

  const startRecordingOnTrack = async () => {
    try {
      await initializeAudio();
      const success = await audioEngine.startRecording();
      if (success) {
        // Initialize and start together to minimize latency

        setIsRecording(true);
        recordingStartTime.current = Date.now();
        waveformSamples.current = [];

        setTracks(prev => prev.map(t =>
          t.isActive ? { ...t, isRecording: true } : t
        ));

        recordingInterval.current = setInterval(() => {
          const elapsed = (Date.now() - recordingStartTime.current) / 1000;
          setCurrentTime(elapsed);
          setDuration(elapsed);
        }, 100);
      }
    } catch (error) {
 console.error('Failed to start recording:', error);
    }
  };

  const handleDeleteAndRecord = async () => {
    if (trackToDelete) {
      setTracks(prev => prev.map(t =>
        t.id === trackToDelete
          ? { ...t, audioUrl: undefined, audioBlob: undefined, waveformHeights: [] }
          : t
      ));
      trackAudioRefs.current.delete(trackToDelete);
    }
    setShowDeleteConfirm(false);
    setTrackToDelete(null);
    setTimeout(() => startRecordingOnTrack(), 100);
  };

  const handleStopRecording = async () => {
    if (!isRecording) return;

    try {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }


      const blob = await audioEngine.stopRecording();
      setIsRecording(false);

      if (blob) {
        const recordingDuration = (Date.now() - recordingStartTime.current) / 1000;
        const waveform = normalizeWaveform(waveformSamples.current);
        const activeTrackId = tracks.find(t => t.isActive)?.id;

        const arrayBuffer = await blob.arrayBuffer();
        const newBlob = new Blob([arrayBuffer], { type: blob.type });

        setTracks(prev => prev.map(t => {
          if (t.isActive) {
            return {
              ...t,
              isRecording: false,
              waveformHeights: waveform,
              audioBlob: newBlob,
              localStored: false
            };
          }
          return { ...t, isRecording: false };
        }));

        if (activeTrackId) {
          await saveRecordingLocally(activeTrackId, newBlob);
        }

        setDuration(recordingDuration);

        if (activeTrackId) {
          const blobUrl = URL.createObjectURL(newBlob);
          const audio = new Audio(blobUrl);
          audio.crossOrigin = 'anonymous';
          audio.currentTime = 0;

          trackAudioRefs.current.set(activeTrackId, audio);
          playbackAudioRef.current = audio;

          audio.onloadedmetadata = () => {
            audio.currentTime = 0;
            audio.play().catch(() => { });
            setIsPlaying(true);
          };

          audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (!hasFirstRecording && !isExistingProject) {
              setHasFirstRecording(true);
              setJustRecordedFirstTake(true);
              setShowNextActionPrompt(true);
            }
          };

          audio.ontimeupdate = () => {
            setCurrentTime(audio.currentTime);
          };

          audio.load();
        }

        if (!hasFirstRecording && !isExistingProject) {
          setTimeout(() => {
            setJustRecordedFirstTake(true);
            setShowNextActionPrompt(true);
          }, 1500);
        }

        const activeTrack = tracks.find(t => t.isActive);
        if (activeTrack) {
          setLastRecordedTrackId(activeTrack.id);
          if (currentProject) {
            uploadRecordingToCloud(newBlob, activeTrack.id);
          }
        }

        // Logic for auto-play after recording: only if it's the very first take
        if (!hasFirstRecording && !isExistingProject) {
          // Wait a bit then show prompt, but don't force playback if user prefers
        }
      }
    } catch (error) {
 console.error('Failed to stop recording:', error);
      setIsRecording(false);
      setTracks(prev => prev.map(t => ({ ...t, isRecording: false })));
    }
  };

  const saveRecordingLocally = async (trackId: string, blob: Blob) => {
    try {
      // Use IndexedDB for better storage (supports large files, no 5MB limit)
      const success = await saveRecordingToIndexedDB(trackId, blob, currentProject?.id);

      if (success) {
        setTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, localStored: true } : t
        ));
      }
    } catch (error) {
 console.error('Failed to save recording locally:', error);
    }
  };

  const getRecordingFromLocal = async (trackId: string): Promise<Blob | null> => {
    try {
      return await getRecordingFromIndexedDB(trackId);
    } catch (error) {
 console.error('Failed to retrieve recording:', error);
      return null;
    }
  };

  const removeRecordingFromLocal = async (trackId: string) => {
    try {
      await deleteRecordingFromIndexedDB(trackId);
    } catch (error) {
 console.error('Failed to remove recording:', error);
    }
  };

  const uploadRecordingToCloud = async (blob: Blob, trackId: string, retryCount = 0) => {
    if (!currentProject) return;

    const MAX_RETRIES = 3;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileName = generateRecordingFileName(currentProject.name);
      const result = await uploadRecording(
        blob,
        fileName,
        currentProject.id,
        trackId,
        currentZone?.id
      );

      if (result.success && result.url) {
        const oldAudio = trackAudioRefs.current.get(trackId);
        if (oldAudio?.src?.startsWith('blob:')) {
          URL.revokeObjectURL(oldAudio.src);
        }

        setTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, audioUrl: result.url, audioBlob: undefined } : t
        ));

        const audio = new Audio(result.url);
        audio.crossOrigin = 'anonymous';
        audio.preload = 'auto';
        trackAudioRefs.current.set(trackId, audio);
        audio.load();

        removeRecordingFromLocal(trackId);

        setFailedUploads(prev => {
          const next = new Map(prev);
          next.delete(trackId);
          return next;
        });
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
 console.error('Upload failed:', error);

      // Retry logic
      if (retryCount < MAX_RETRIES) {

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, retryCount) * 1000;

        setTimeout(() => {
          uploadRecordingToCloud(blob, trackId, retryCount + 1);
        }, delay);
      } else {
        // Mark as failed after max retries
        setFailedUploads(prev => {
          const next = new Map(prev);
          next.set(trackId, retryCount);
          return next;
        });

        // Keep the blob for manual retry
        setTracks(prev => prev.map(t =>
          t.id === trackId ? { ...t, localStored: true } : t
        ));
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  // Manual retry for failed uploads
  const retryFailedUpload = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track?.audioBlob) {
      setFailedUploads(prev => {
        const next = new Map(prev);
        next.delete(trackId);
        return next;
      });
      await uploadRecordingToCloud(track.audioBlob, trackId, 0);
    }
  };

  const uploadAllRecordingsToCloud = async () => {
    if (!currentProject) return;

    const tracksToUpload = tracks.filter(t => t.audioBlob && !t.audioUrl);

    if (tracksToUpload.length === 0) return;

    setIsUploading(true);

    try {
      for (const track of tracksToUpload) {
        await uploadRecordingToCloud(track.audioBlob!, track.id);
      }
    } catch (error) {
 console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRecordToggle = () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      // Start count-in
      setCurrentTime(0);
      setCountIn(3);
      const timer = setInterval(() => {
        setCountIn(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            // Wait one more tick for UX before starting
            setTimeout(() => {
              setCountIn(0);
              handleStartRecording();
            }, 500);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const normalizeWaveform = (samples: number[]): number[] => {
    if (samples.length === 0) return [];
    const targetLength = 50;
    const step = Math.max(1, Math.floor(samples.length / targetLength));
    const downsampled: number[] = [];

    for (let i = 0; i < samples.length; i += step) {
      const chunk = samples.slice(i, i + step);
      const avg = chunk.reduce((a, b) => a + b, 0) / chunk.length;
      downsampled.push(avg);
    }

    const max = Math.max(...downsampled, 1);
    return downsampled.map(v => Math.round((v / max) * 80));
  };

  const handlePlayPause = async () => {

    if (isPlaying) {
      trackAudioRefs.current.forEach(audio => audio.pause());
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
      }
      if (playbackIntervalRef.current) {
        cancelAnimationFrame(playbackIntervalRef.current);
        playbackIntervalRef.current = null;
      }
      setIsPlaying(false);
      return;
    }

    const tracksWithAudio = tracks.filter(t => t.audioBlob || t.audioUrl);

    if (tracksWithAudio.length === 0) {
      return;
    }

    for (const track of tracksWithAudio) {
      let audio = trackAudioRefs.current.get(track.id);

      let sourceUrl: string | undefined;
      let isNewBlobUrl = false;

      if (track.audioBlob) {
        if (audio?.src?.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
        sourceUrl = URL.createObjectURL(track.audioBlob);
        isNewBlobUrl = true;
      } else if (!track.audioUrl && track.localStored) {
        try {
          const localBlob = await getRecordingFromLocal(track.id);
          if (localBlob) {
            if (audio?.src?.startsWith('blob:')) {
              URL.revokeObjectURL(audio.src);
            }
            sourceUrl = URL.createObjectURL(localBlob);
            isNewBlobUrl = true;

            setTracks(prev => prev.map(t => {
              if (t.id === track.id) {
                const newLocalBlob = new Blob([localBlob], { type: localBlob.type });
                return { ...t, audioBlob: newLocalBlob };
              }
              return t;
            }));
          }
        } catch (error) {
 console.error('Error retrieving local recording:', error);
        }
      } else if (track.audioUrl) {
        const isCloudUrl = track.audioUrl.includes('cloudinary') ||
          track.audioUrl.includes('res.cloudinary') ||
          (track.audioUrl.startsWith('https://') && !track.audioUrl.startsWith('blob:'));

        if (isCloudUrl) {
          sourceUrl = track.audioUrl;
        } else {
          continue;
        }
      } else {
        continue;
      }

      if (!sourceUrl) continue;

      if (!audio || isNewBlobUrl || audio.src !== sourceUrl) {
        audio = new Audio();
        audio.crossOrigin = 'anonymous';
        audio.src = sourceUrl;
        trackAudioRefs.current.set(track.id, audio);
        audio.load();
      }
    }

    const loadPromises = tracksWithAudio.map(track => {
      const audio = trackAudioRefs.current.get(track.id);
      if (!audio || !audio.src) return Promise.resolve();

      return new Promise<void>((resolve) => {
        if (audio.readyState >= 3) {
          resolve();
          return;
        }

        const onCanPlay = () => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };

        const onError = () => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        };

        audio.addEventListener('canplaythrough', onCanPlay);
        audio.addEventListener('error', onError);

        setTimeout(() => {
          audio.removeEventListener('canplaythrough', onCanPlay);
          audio.removeEventListener('error', onError);
          resolve();
        }, 5000);

        audio.load();
      });
    });

    await Promise.all(loadPromises);

    await trackEffectsEngine.initialize();

    let maxDuration = duration;
    const soloTracks = tracks.filter(t => t.solo && (t.audioBlob || t.audioUrl));

    for (const track of tracksWithAudio) {
      const audio = trackAudioRefs.current.get(track.id);
      if (audio && audio.src) {
        // Wait for metadata to load to get accurate duration
        if (audio.readyState < 1) { // HAVE_METADATA
          try {
            await new Promise<void>((resolve) => {
              const onLoadedMetadataForDuration = () => {
                audio.removeEventListener('loadedmetadata', onLoadedMetadataForDuration);
                audio.removeEventListener('error', onErrorForDuration);
                resolve();
              };
              const onErrorForDuration = () => {
                audio.removeEventListener('loadedmetadata', onLoadedMetadataForDuration);
                audio.removeEventListener('error', onErrorForDuration);
                resolve(); // Resolve even on error to continue
              };
              audio.addEventListener('loadedmetadata', onLoadedMetadataForDuration);
              audio.addEventListener('error', onErrorForDuration);
              audio.load(); // Trigger loading if not already started

              // Timeout after 3 seconds to prevent hanging
              setTimeout(() => {
                audio.removeEventListener('loadedmetadata', onLoadedMetadataForDuration);
                audio.removeEventListener('error', onErrorForDuration);
                resolve();
              }, 3000);
            });
          } catch (e) {
 console.error('Error loading metadata:', e);
          }
        }

        if (track.effects) {
          const existingNodes = trackEffectsEngine.createTrackChain(track.id, audio);
          if (existingNodes) {
            const effectsToApply = { ...track.effects };
            if (track.muted) {
              effectsToApply.volume = 0;
            } else if (soloTracks.length > 0) {
              effectsToApply.volume = track.solo ? track.volume : 0;
            }
            trackEffectsEngine.applyEffects(track.id, effectsToApply);
            audio.volume = 1;
          } else {
            if (soloTracks.length > 0) {
              audio.volume = track.solo ? (track.volume / 100) : 0;
            } else {
              audio.volume = track.muted ? 0 : track.volume / 100;
            }
          }
        } else {
          if (soloTracks.length > 0) {
            audio.volume = track.solo ? (track.volume / 100) : 0;
          } else {
            audio.volume = track.muted ? 0 : track.volume / 100;
          }
        }

        if (currentTime > 0 && audio.duration && currentTime < audio.duration) {
          audio.currentTime = currentTime;
        } else {
          audio.currentTime = 0;
        }

        if (audio.duration && isFinite(audio.duration) && audio.duration > maxDuration) {
          maxDuration = audio.duration;
        }
      }
    }

    if (maxDuration > duration) {
      setDuration(maxDuration);
    }

    let anyPlaying = false;
    // Batch triggering play() for all tracks simultaneously to minimize cumulative latency
    const playPromises = tracksWithAudio.map(track => {
      const audio = trackAudioRefs.current.get(track.id);
      if (audio && audio.src) {
        anyPlaying = true;
 return audio.play().catch(e => console.error(`Playback error on track ${track.id}:`, e));
      }
      return Promise.resolve();
    });

    if (anyPlaying) {
      // We don't await all play calls here as that would still be sequential
      // Triggering them in a map above starts the internal browser request for each nearly simultaneously
      setIsPlaying(true);

      // Cancel any existing animation frame to prevent multiple loops
      if (playbackIntervalRef.current) {
        cancelAnimationFrame(playbackIntervalRef.current);
      }

      const updateTime = () => {
        // Calculate time based on all playing tracks
        let currentTimeValue = 0;
        let hasPlayingTracks = false;

        for (const [id, audio] of trackAudioRefs.current) {
          if (audio.paused) continue;

          const trackTime = audio.currentTime;
          currentTimeValue = Math.max(currentTimeValue, trackTime);
          hasPlayingTracks = true;

          if (audio.ended) {
            handleStop();
            return;
          }
        }

        // Also check playbackAudioRef if it exists
        if (playbackAudioRef.current && !playbackAudioRef.current.paused) {
          const playbackTime = playbackAudioRef.current.currentTime;
          currentTimeValue = Math.max(currentTimeValue, playbackTime);
          hasPlayingTracks = true;

          if (playbackAudioRef.current.ended) {
            handleStop();
            return;
          }
        }

        if (currentTimeValue >= duration && duration > 0) {
          if (isLooping) {
            // Loop: Reset all to start and continue
            setCurrentTime(0);
            for (const [_, audio] of trackAudioRefs.current) {
              audio.currentTime = 0;
            }
            if (playbackAudioRef.current) playbackAudioRef.current.currentTime = 0;
            playbackIntervalRef.current = requestAnimationFrame(updateTime);
          } else {
            handleStop();
          }
          return;
        }

        if (hasPlayingTracks) {
          // Always update the time to ensure the UI updates
          setCurrentTime(currentTimeValue);
          playbackIntervalRef.current = requestAnimationFrame(updateTime);
        } else {
          handleStop();
        }
      };

      playbackIntervalRef.current = requestAnimationFrame(updateTime);
    }
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    trackAudioRefs.current.forEach(audio => {
      audio.currentTime = time;
    });
  };

  const handleStop = () => {
    if (isRecording) {
      handleStopRecording();
    }
    trackAudioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    if (playbackIntervalRef.current) {
      cancelAnimationFrame(playbackIntervalRef.current);
      playbackIntervalRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleAddLayer = () => {
    setShowNextActionPrompt(false);
    addNewTrack();
  };

  const handlePractice = () => {
    setShowNextActionPrompt(false);
    setView('practice');
  };

  const handleSave = async () => {
    setShowNextActionPrompt(false);
    setIsSaving(true);

    try {
      if (!currentProject && user?.uid) {
        try {
          const result = await createProject({
            name: 'My Recording',
            ownerId: user.uid,
            zoneId: currentZone?.id
          });

          if (result.success && result.project) {
            setCurrentProject(result.project);
            setContextProject(result.project.id);
            await saveProject();
          }
        } catch (error) {
 console.error('Failed to create project:', error);
        }
      } else {
        await saveProject();
      }

      await uploadAllRecordingsToCloud();
    } catch (error) {
 console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoMix = async () => {
    if (tracks.length === 0) return;

    setIsLoading(true); // Reuse loading state for "Mixing..." effect

    try {
      // Logic: Find the highest peak among all tracks and normalize others
      let overallMaxPeak = 0;
      const trackPeaks = new Map<string, number>();

      tracks.forEach(t => {
        if (t.waveformHeights.length > 0) {
          const trackMax = Math.max(...t.waveformHeights);
          trackPeaks.set(t.id, trackMax);
          if (trackMax > overallMaxPeak) overallMaxPeak = trackMax;
        }
      });

      if (overallMaxPeak === 0) return;

      setTracks(prev => prev.map(t => {
        const peak = trackPeaks.get(t.id) || 0;
        if (peak === 0) return t;

        // Target peak is 70% of max height (80)
        const targetPeak = 56;
        const ratio = targetPeak / peak;
        const newVolume = Math.min(100, Math.max(10, Math.round(t.volume * ratio)));

        return { ...t, volume: newVolume };
      }));

      tracks.forEach(t => {
        const audio = trackAudioRefs.current.get(t.id);
        if (audio) {
          const peak = trackPeaks.get(t.id) || 0;
          const targetPeak = 56;
          const ratio = targetPeak / peak;
          const newVolume = Math.min(100, Math.max(10, Math.round(t.volume * ratio)));
          audio.volume = t.muted ? 0 : newVolume / 100;
        }
      });

    } catch (error) {
 console.error('Auto-Mix failed:', error);
    } finally {
      setTimeout(() => setIsLoading(false), 800);
    }
  };

  const hasRecordings = tracks.some(t => t.audioUrl || t.audioBlob || t.waveformHeights.length > 0);

  const saveProject = useCallback(async () => {
    if (!currentProject || !user?.uid) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      const tracksToSave = tracks.map(t => ({
        id: t.id,
        name: t.name,
        type: 'vocal' as const,
        color: '#8b5cf6',
        volume: t.volume,
        pan: 0,
        muted: t.muted,
        solo: t.solo,
        audioUrl: t.audioUrl,
        waveform: t.waveformHeights,
        duration: duration,
        // Save effects if they exist
        effects: t.effects ? {
          volume: t.effects.volume,
          pan: t.effects.pan,
          reverb: t.effects.reverb,
          bass: t.effects.bass,
          treble: t.effects.treble,
          compression: t.effects.compression
        } : undefined
      }));

      const result = await updateProject(currentProject.id, {
        tracks: tracksToSave,
        duration: duration
      });

      if (result.success) {
        setLastSaved(new Date());

        tracks.forEach(track => {
          if (track.audioUrl && track.localStored) {
            removeRecordingFromLocal(track.id);
          }
        });

        await uploadAllRecordingsToCloud();
      } else {
        setSaveError('Failed to save');
      }
    } catch (error) {
      setSaveError('Failed to save');
 console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentProject, user?.uid, tracks, duration, uploadAllRecordingsToCloud]);

  const shouldSaveRef = useRef(false);
  const lastSaveTimeRef = useRef(0);

  useEffect(() => {
    if (!isUploading && hasRecordings && currentProject && !isRecording && autoSaveEnabled) {
      const now = Date.now();
      if (now - lastSaveTimeRef.current > 5000) {
        shouldSaveRef.current = true;
        lastSaveTimeRef.current = now;
      }
    }
  }, [isUploading, hasRecordings, isRecording, autoSaveEnabled]);

  useEffect(() => {
    if (shouldSaveRef.current && currentProject) {
      shouldSaveRef.current = false;
      const timeout = setTimeout(() => {
        saveProject();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentProject?.id]);

  const processedAudioUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const loadTrackDurations = async () => {
      const tracksWithAudio = tracks.filter(t => {
        if (!t.audioUrl) return false;
        if (t.audioUrl.startsWith('blob:')) return false;
        if (processedAudioUrlsRef.current.has(t.audioUrl)) return false;
        return true;
      });

      if (tracksWithAudio.length === 0) return;

      let maxDuration = 0;

      for (const track of tracksWithAudio) {
        if (!track.audioUrl) continue;

        processedAudioUrlsRef.current.add(track.audioUrl);

        try {
          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.src = track.audioUrl;
          trackAudioRefs.current.set(track.id, audio);

          await new Promise<void>((resolve) => {
            audio.onloadedmetadata = () => {
              if (audio.duration && isFinite(audio.duration) && audio.duration > maxDuration) {
                maxDuration = audio.duration;
              }
              resolve();
            };
            audio.onerror = () => resolve();
            setTimeout(resolve, 5000);
          });
        } catch (e) {
 console.error('Failed to load track duration:', e);
        }
      }

      if (maxDuration > 0) {
        setDuration(prev => Math.max(prev, maxDuration));
      }
    };

    loadTrackDurations();
  }, [tracks]);

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = Math.floor((now.getTime() - lastSaved.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const hasUnsavedChanges = () => {
    const hasUnuploadedRecordings = tracks.some(t => t.audioBlob && !t.audioUrl);
    const hasLocalRecordings = tracks.some(t => t.waveformHeights.length > 0 && !t.audioUrl && !t.localStored);
    const projectExistsButNotSaved = currentProject && tracks.length > 0 && currentProject.tracks.length === 0;

    return hasUnuploadedRecordings || hasLocalRecordings || projectExistsButNotSaved;
  };

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        e.preventDefault();
        e.returnValue = 'You have unsaved recordings. Are you sure you want to leave?';
        return 'You have unsaved recordings. Are you sure you want to leave?';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [tracks, currentProject]);

  const handleBackClick = () => {
    if (hasUnsavedChanges()) {
      setShowLeaveConfirm(true);
    } else {
      setView('home');
    }
  };

  const handleConfirmLeave = () => {
    handleSave();
    setShowLeaveConfirm(false);
    setTimeout(() => {
      setView('home');
    }, 1000);
  };

  const handleHeaderExport = async () => {
    const tracksWithEffects = tracks.map(t => ({
      ...t,
      effects: t.effects || DEFAULT_EFFECTS
    }));

    const tracksWithAudio = tracksWithEffects.filter(t => (t.audioUrl || t.audioBlob) && !t.muted);

    if (tracksWithAudio.length === 0) {
      alert('No recordings to export');
      return;
    }

    setIsExportingHeader(true);
    setExportProgressHeader(0);

    try {
      // Create temporary URLs for blobs if they don't have audioUrl
      const tempTracks = await Promise.all(tracksWithEffects.map(async t => {
        if (!t.audioUrl && t.audioBlob) {
          return { ...t, audioUrl: URL.createObjectURL(t.audioBlob) };
        }
        return t;
      }));

      const wavBlob = await exportMix(tempTracks as TrackToExport[], (step, progress) => {
        setExportProgressHeader(progress);
      });

      // Revoke temporary URLs
      tempTracks.forEach(t => {
        if (t.audioUrl?.startsWith('blob:') && !tracks.find(rt => rt.audioUrl === t.audioUrl)) {
          URL.revokeObjectURL(t.audioUrl);
        }
      });

      const url = URL.createObjectURL(wavBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(currentProject?.name || 'My_Recording').replace(/[^a-z0-9]/gi, '_')}_mix.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
 console.error('[HeaderExport] Failed:', error);
      alert('Export failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsExportingHeader(false);
      setExportProgressHeader(0);
    }
  };

  useEffect(() => {
    return () => {
      trackAudioRefs.current.forEach(audio => {
        if (audio?.src?.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      });
      trackAudioRefs.current.clear();
      if (playbackIntervalRef.current) {
        if (typeof playbackIntervalRef.current === "number") {
          cancelAnimationFrame(playbackIntervalRef.current);
        } else {
          clearInterval(playbackIntervalRef.current);
        }
        playbackIntervalRef.current = null;
      }


      if (metronomeIntervalRef.current) {
        clearInterval(metronomeIntervalRef.current);
      }
      if (metronomeAudioRef.current) {
        metronomeAudioRef.current.close();
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-b from-[#0f0f14] via-[#0d0d12] to-[#08080c]">
      {/* Loop, Undo, Count-in, etc. (Backing track logic removed) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(139,92,246,0.03)_0%,_transparent_50%)] pointer-events-none" />

      {/* Count-in Overlay */}
      {countIn > 0 && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md">
          <div className="flex flex-col items-center animate-in zoom-in duration-300">
            <span className="text-[120px] sm:text-[180px] font-black text-white tabular-nums drop-shadow-[0_0_40px_rgba(139,92,246,0.5)]">
              {countIn}
            </span>
            <span className="text-xl sm:text-2xl font-bold text-violet-400 uppercase tracking-[0.2em] mt-2">Get Ready</span>
          </div>
        </div>
      )}

      {/* Header with Native Native App Arrangement */}
      <div
        className="absolute top-0 left-0 right-0 z-[110] flex items-center justify-between px-3 sm:px-4 py-2 sm:py-3 bg-[#131318]/40 backdrop-blur-xl border-b border-white/5"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={handleBackClick}
            className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/20 transition-all touch-manipulation border border-white/5"
          >
            <ChevronLeft size={16} className="text-slate-200" />
          </button>
        </div>

        {/* Central Glass Pill */}
        <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center min-w-0 max-w-[35%] xs:max-w-[40%] sm:max-w-md">
          <div className="px-2.5 py-1 sm:px-4 sm:py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col items-center w-full">
            <div className="flex items-center gap-1 min-w-0 max-w-full justify-center overflow-hidden">
              <h1 className="text-[10px] sm:text-sm font-bold text-white truncate text-center max-w-[12ch] sm:max-w-[24ch] min-w-0">
                {currentProject?.name || 'Untitled Project'}
              </h1>
            </div>
            {/* Status Indicator within Pill */}
            <div className="h-3 flex items-center">
              {isRecording ? (
                <span className="text-[8px] text-red-400 font-bold flex items-center gap-1 animate-pulse">
                  <span className="w-1 h-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  LIVE
                </span>
              ) : isSaving ? (
                <span className="text-[8px] text-blue-400 font-bold flex items-center gap-1">
                  <div className="size-1.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  SAVING
                </span>
              ) : (
                <span className="text-[7px] sm:text-[9px] text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
                  {lastSaved ? (
                    <>
                      <span className="hidden sm:inline">SAVED • </span>
                      {formatLastSaved()}
                    </>
                  ) : 'REHEARSAL'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5">
          <div className="flex items-center bg-white/5 border border-white/5 rounded-full p-0.5 gap-0.5">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all disabled:opacity-50 touch-manipulation text-slate-400 hover:text-white hover:bg-white/5"
              title="Save Project"
            >
              {isSaving ? <CustomLoader size="sm" className="!w-3 !h-3" /> : <Save size={14} />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full transition-all touch-manipulation text-slate-400 hover:text-white hover:bg-white/5"
              title="Project Settings"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>
      </div>

      <main className="absolute top-[60px] sm:top-[72px] left-0 right-0 bottom-0 overflow-y-auto overflow-x-hidden pb-40 sm:pb-48" style={{ top: 'calc(60px + env(safe-area-inset-top, 0px))', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 40px)' }}>
        {/* Recovery prompt for unsaved recordings */}
        {showRecoveryPrompt && recoveredTracks.length > 0 && (
          <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                <AudioLines size={16} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-amber-400">Unsaved Recordings Found</h4>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  {recoveredTracks.length} recording{recoveredTracks.length > 1 ? 's' : ''} from a previous session
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={recoverUnsavedRecordings}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors"
                  >
                    Recover
                  </button>
                  <button
                    onClick={dismissRecovery}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-600 transition-colors"
                  >
                    Discard
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Failed uploads indicator */}
        {failedUploads.size > 0 && (
          <div className="mx-3 sm:mx-4 mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
            <div className="flex items-start gap-3">
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center shrink-0">
                <Upload size={16} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-red-400">Upload Failed</h4>
                <p className="text-xs text-red-400/70 mt-0.5">
                  {failedUploads.size} recording{failedUploads.size > 1 ? 's' : ''} failed to upload
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      failedUploads.forEach((_, trackId) => retryFailedUpload(trackId));
                    }}
                    className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-400 transition-colors"
                  >
                    Retry All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <CustomLoader message="" />
          </div>
        ) : (
          <div className="flex flex-col">
            {(justRecordedFirstTake || isUploading) && (
              <div className="px-3 sm:px-4 pt-2 sm:pt-3">
                {justRecordedFirstTake && !isRecording && !isUploading && (
                  <div className="flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <Check size={14} className="sm:w-4 sm:h-4 text-emerald-400" />
                    <span className="text-emerald-400 text-xs sm:text-sm font-medium">First take recorded</span>
                  </div>
                )}
                {isUploading && (
                  <div className="flex items-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 px-3 sm:px-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <CustomLoader size="sm" className="!w-4 !h-4" />
                    <span className="text-blue-400 text-xs sm:text-sm font-medium">Saving to cloud...</span>
                  </div>
                )}
              </div>
            )}

            {!hasRecordings && !isRecording && (
              <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 sm:px-6">
                <div className="size-16 sm:size-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 flex items-center justify-center mb-4 sm:mb-5">
                  <Mic size={28} className="sm:w-8 sm:h-8 text-slate-400" />
                </div>
                <h3 className="text-white text-base sm:text-lg font-semibold mb-1">Ready to Record</h3>
                <p className="text-slate-500 text-xs sm:text-sm text-center max-w-[240px]">
                  Press the record button below to capture your first take
                </p>
              </div>
            )}


            {(hasRecordings || tracks.length > 0) && (
              <div className="px-3 sm:px-4 pt-3 sm:pt-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">Tracks</h3>
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {/* Import Audio button - always visible */}
                    <input
                      ref={importInputRef}
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.webm,.m4a,.aac"
                      onChange={handleImportAudio}
                      className="hidden"
                      id="import-audio-input"
                    />
                    <button
                      onClick={() => importInputRef.current?.click()}
                      disabled={isImporting}
                      className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium min-h-[32px] sm:min-h-0 touch-manipulation transition-colors ${isImporting
                        ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        : 'bg-violet-500/20 text-violet-400 border border-violet-500/30 hover:bg-violet-500/30 active:bg-violet-500/40'
                        }`}
                    >
                      {isImporting ? (
                        <CustomLoader size="sm" className="!w-[14px] !h-[14px]" />
                      ) : (
                        <Download size={12} className="sm:w-[14px] sm:h-[14px] rotate-180" />
                      )}
                      <span>{isImporting ? 'Importing' : 'Import'}</span>
                    </button>
                    {/* Upload indicator - next to Add button */}
                    {tracks.some(t => t.audioBlob && !t.audioUrl) && (
                      <button
                        onClick={uploadAllRecordingsToCloud}
                        disabled={isUploading}
                        className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium min-h-[32px] sm:min-h-0 touch-manipulation transition-colors ${isUploading
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 active:bg-emerald-500/40'
                          }`}
                      >
                        {isUploading ? (
                          <CustomLoader size="sm" className="!w-[14px] !h-[14px]" />
                        ) : (
                          <Upload size={12} className="sm:w-[14px] sm:h-[14px]" />
                        )}
                        <span>{isUploading ? 'Uploading' : 'Upload'}</span>
                      </button>
                    )}
                    {hasRecordings && (
                      <button
                        onClick={addNewTrack}
                        className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 active:bg-slate-700 transition-colors min-h-[32px] sm:min-h-0 touch-manipulation"
                      >
                        <PlusCircle size={12} className="sm:w-[14px] sm:h-[14px]" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>

                {hasRecordings && duration > 0 && (
                  <div className="mb-2 sm:mb-3 relative h-4 sm:h-5 border-b border-slate-800">
                    {Array.from({ length: Math.ceil(duration / 5) + 1 }, (_, i) => i * 5).map((sec) => (
                      <div
                        key={sec}
                        className="absolute bottom-0 flex flex-col items-center"
                        style={{ left: `${(sec / duration) * 100}%` }}
                      >
                        <span className="text-[8px] sm:text-[9px] text-slate-600 font-mono">{formatTime(sec)}</span>
                        <div className="w-px h-1 sm:h-1.5 bg-slate-700 mt-0.5" />
                      </div>
                    ))}
                    <div
                      className="absolute bottom-0 w-0.5 h-full bg-red-500 transition-all z-10"
                      style={{ left: `${(currentTime / duration) * 100}%` }}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  {tracks.map((track) => {
                    const Icon = track.icon;

                    return (
                      <div
                        key={track.id}
                        onClick={() => setActiveTrack(track.id)}
                        className={`relative rounded-xl overflow-hidden transition-all cursor-pointer ${track.isActive
                          ? 'bg-[#1e1e24] ring-1 ring-violet-500/50'
                          : 'bg-[#16161a] hover:bg-[#1a1a1f]'
                          }`}
                      >
                        <div className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-1.5 sm:py-2.5">
                          <div className={`relative flex items-center justify-center shrink-0 size-7 sm:size-9 rounded-lg transition-all ${track.isActive
                            ? 'bg-slate-700 text-white'
                            : 'bg-slate-800 text-slate-400'
                            }`}>
                            <Icon size={14} className="sm:w-[18px] sm:h-[18px]" />
                            {track.isRecording && (
                              <span className="absolute -top-0.5 -right-0.5 size-2 sm:size-2.5 rounded-full bg-red-500 animate-pulse" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 sm:gap-1.5">
                              {editingTrackId === track.id ? (
                                <input
                                  type="text"
                                  value={editingTrackName}
                                  onChange={(e) => setEditingTrackName(e.target.value)}
                                  onBlur={saveTrackName}
                                  onKeyDown={(e) => e.key === 'Enter' && saveTrackName()}
                                  autoFocus
                                  className="text-xs sm:text-sm font-medium bg-transparent border-b border-white outline-none text-white w-20 sm:w-24"
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingTrackName(track.id, track.name);
                                  }}
                                  className="text-xs sm:text-sm font-medium text-white truncate hover:text-slate-300 flex items-center gap-0.5 sm:gap-1 group"
                                >
                                  {track.name}
                                  <Pencil size={9} className="sm:w-[10px] sm:h-[10px] opacity-0 group-hover:opacity-50 transition-opacity" />
                                </button>
                              )}
                              {/* Storage status indicator */}
                              {(track.audioBlob || track.audioUrl || track.localStored) && (
                                <span
                                  className={`text-[8px] sm:text-[9px] px-1 py-0.5 rounded font-medium ${track.audioUrl
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : track.localStored || track.audioBlob
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : ''
                                    }`}
                                  title={track.audioUrl ? 'Saved to cloud' : 'Saved locally'}
                                >
                                  {track.audioUrl ? '️' : ''}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                              <div className="relative flex-1 max-w-14 sm:max-w-16 h-1 sm:h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="absolute inset-y-0 left-0 bg-slate-400 rounded-full"
                                  style={{ width: `${track.volume}%` }}
                                />
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  value={track.volume}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    const newVolume = parseInt(e.target.value);
                                    setTracks(prevTracks => {
                                      const updatedTracks = prevTracks.map(t =>
                                        t.id === track.id ? { ...t, volume: newVolume } : t
                                      );

                                      const audio = trackAudioRefs.current.get(track.id);
                                      if (audio) {
                                        const updatedTrack = updatedTracks.find(t => t.id === track.id);
                                        if (updatedTrack) {
                                          const soloTracks = updatedTracks.filter(t => t.solo && (t.audioBlob || t.audioUrl));
                                          if (soloTracks.length > 0) {
                                            audio.volume = updatedTrack.solo ? updatedTrack.volume / 100 : 0;
                                          } else {
                                            audio.volume = updatedTrack.muted ? 0 : updatedTrack.volume / 100;
                                          }
                                        }
                                      }

                                      return updatedTracks;
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                              </div>
                              <span className="text-[9px] sm:text-[10px] font-mono text-slate-500 w-5 sm:w-6">{track.volume}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {(track.audioUrl || track.audioBlob) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isPlaying) {
                                    setActiveTrack(track.id);
                                    handlePlayPause();
                                  } else {
                                    handlePlayPause();
                                  }
                                }}
                                className={`size-6 sm:size-7 flex items-center justify-center rounded-lg text-xs font-bold transition-colors touch-manipulation ${isPlaying && track.isActive
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600 active:bg-slate-500'
                                  }`}
                              >
                                {isPlaying && track.isActive ? <Pause size={10} className="sm:w-3 sm:h-3" /> : <Play size={10} className="sm:w-3 sm:h-3" />}
                              </button>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleMute(track.id); }}
                              className={`size-5 sm:size-6 flex items-center justify-center rounded-lg text-[7px] sm:text-[7px] font-bold transition-colors touch-manipulation ${track.muted
                                ? 'bg-orange-500 text-white'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 active:bg-slate-500'
                                }`}
                            >
                              M
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleSolo(track.id); }}
                              className={`size-5 sm:size-6 flex items-center justify-center rounded-lg text-[7px] sm:text-[7px] font-bold transition-colors touch-manipulation ${track.solo
                                ? 'bg-yellow-500 text-black'
                                : 'bg-slate-700 text-slate-400 hover:bg-slate-600 active:bg-slate-500'
                                }`}
                            >
                              S
                            </button>
                            {tracks.length > 1 && (
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteTrack(track.id); }}
                                className="size-5 sm:size-7 flex items-center justify-center rounded-lg bg-slate-700 text-slate-400 hover:text-red-400 hover:bg-slate-600 active:bg-slate-500 transition-colors touch-manipulation"
                              >
                                <Trash2 size={10} className="sm:w-3 sm:h-3" />
                              </button>
                            )}
                            {(track.audioUrl || track.audioBlob) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); openEffectsPanel(track.id); }}
                                className="size-5 sm:size-7 flex items-center justify-center rounded-lg bg-slate-700 text-slate-400 hover:text-violet-400 hover:bg-slate-600 active:bg-slate-500 transition-colors touch-manipulation"
                                title="Effects"
                              >
                                <Sliders size={10} className="sm:w-3 sm:h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveTrack(track.id);
                            if (duration > 0 && track.audioUrl) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const clickX = e.clientX - rect.left;
                              const percentage = clickX / rect.width;
                              handleSeek(percentage * duration);
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (track.audioUrl || track.audioBlob) handlePlayPause();
                          }}
                          className={`w-full bg-[#0f0f12] relative overflow-hidden touch-manipulation ${track.isActive ? 'h-14 sm:h-16' : 'h-10 sm:h-12'
                            }`}
                        >
                          {track.waveformHeights.length === 0 && !track.isRecording ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-slate-600 text-xs">
                                {track.isActive ? 'Ready to record' : 'Empty'}
                              </span>
                              <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-slate-800" />
                            </div>
                          ) : (
                            <AnimatedWaveform
                              isPlaying={isPlaying && track.isActive}
                              isRecording={track.isRecording}
                              inputLevel={track.isRecording ? inputLevel : 0}
                              staticHeights={track.waveformHeights}
                              currentTime={currentTime}
                              duration={duration}
                              height={track.isActive ? 56 : 48}
                              className={`h-full ${!track.isActive ? 'opacity-60' : ''}`}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <div className="absolute bottom-0 left-0 right-0 z-[110] bg-[#131318]/95 backdrop-blur-xl border-t border-white/5">
        <div className="px-4 pt-4 pb-6" style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}>
          <div className="flex justify-between items-center mb-5">
            <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-1.5">
              <span className={`text-2xl sm:text-3xl font-bold tabular-nums font-mono tracking-tight leading-none ${isRecording ? 'text-red-500' : 'text-white'}`}>
                {formatTime(currentTime)}
              </span>
              {duration > 0 && !isRecording && (
                <span className="text-xs sm:text-base font-medium text-slate-500 tabular-nums font-mono leading-none">
                  <span className="inline sm:hidden"> / </span>
                  {formatTime(duration)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Metronome with tempo control */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                <button
                  onClick={toggleMetronome}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 rounded-l-lg sm:rounded-l-xl transition-all ${metronomeEnabled
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 border-r-0'
                    : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10'
                    }`}
                >
                  <Timer size={14} className="sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm font-mono font-semibold">{metronomeTempo}</span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTapTempo();
                  }}
                  className={`px-2 py-1.5 sm:py-2 bg-white/5 text-[10px] sm:text-xs font-bold uppercase tracking-wider border-y border-white/10 hover:bg-white/10 active:bg-amber-500/20 active:text-amber-400 transition-all ${metronomeEnabled ? 'border-amber-500/30 border-y' : ''}`}
                >
                  Tap
                </button>
                {metronomeEnabled && (
                  <div className="flex">
                    <button
                      onClick={() => updateMetronomeTempo(Math.max(40, metronomeTempo - 5))}
                      className="px-2 py-1.5 sm:py-2 bg-amber-500/10 text-amber-400 border-y border-amber-500/30 hover:bg-amber-500/20 transition-colors text-xs sm:text-sm font-bold"
                    >
                      −
                    </button>
                    <button
                      onClick={() => updateMetronomeTempo(Math.min(240, metronomeTempo + 5))}
                      className="px-2 py-1.5 sm:py-2 bg-amber-500/10 text-amber-400 border border-amber-500/30 border-l-0 rounded-r-lg sm:rounded-r-xl hover:bg-amber-500/20 transition-colors text-xs sm:text-sm font-bold"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 min-w-[100px] justify-between">
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isRecording ? 'text-red-400' : isPlaying ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isRecording ? 'REC' : isPlaying ? 'MASTER' : 'IN'}
                </span>
                <div className="flex gap-[3px] h-3.5 items-end">
                  {[0.05, 0.15, 0.3, 0.5, 0.7, 0.85, 0.95].map((threshold, i) => {
                    const isActive = inputLevel >= threshold || (isPlaying && i < 3);
                    const color = i < 4 ? '#22c55e' : i < 6 ? '#eab308' : '#ef4444';
                    return (
                      <div
                        key={i}
                        className="w-1.5 rounded-full transition-all duration-75"
                        style={{
                          height: `${20 + i * 12}%`,
                          maxHeight: '100%',
                          backgroundColor: isActive ? color : 'rgba(255,255,255,0.05)',
                          boxShadow: isActive ? `0 0 8px ${color}30` : 'none'
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1 sm:gap-2">
            <button
              onClick={() => setIsLooping(!isLooping)}
              title={isLooping ? "Desactivate Loop" : "Activate Loop"}
              className={`flex items-center justify-center min-w-[36px] min-h-[36px] sm:w-10 sm:h-10 rounded-xl border transition-all active:scale-95 touch-manipulation ${isLooping
                ? 'bg-violet-500/20 text-violet-400 border-violet-500/30'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              <Repeat size={14} className={`sm:w-4 sm:h-4 ${isLooping ? 'animate-pulse' : ''}`} />
            </button>

            <button
              onClick={handlePlayPause}
              disabled={isRecording || !hasRecordings}
              className={`flex items-center justify-center min-w-[44px] min-h-[44px] sm:w-12 sm:h-12 rounded-xl transition-all active:scale-95 touch-manipulation ${isRecording || !hasRecordings
                ? 'bg-white/5 border border-white/5 text-slate-600 cursor-not-allowed'
                : isPlaying
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                  : 'bg-white/10 border border-white/10 text-white hover:bg-white/15'
                }`}
            >
              {isPlaying ? <Pause size={18} className="sm:w-5 sm:h-5" /> : <Play size={18} className="sm:w-5 sm:h-5 ml-0.5 sm:ml-1" fill="currentColor" />}
            </button>

            <button
              onClick={handleRecordToggle}
              className={`relative flex items-center justify-center w-[52px] h-[52px] sm:w-[60px] sm:h-[60px] rounded-full transition-all duration-200 active:scale-95 touch-manipulation ${isRecording
                ? 'bg-gradient-to-b from-red-500 to-red-600 shadow-[0_0_24px_rgba(239,68,68,0.4)]'
                : 'bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 shadow-lg shadow-red-500/20'
                }`}
            >
              <div className={`absolute inset-0 rounded-full border-2 ${isRecording ? 'border-red-400/50' : 'border-red-400/30'}`} />

              {isRecording && (
                <div className="absolute inset-[-4px] rounded-full animate-ping bg-red-500/20" />
              )}

              <div className="relative z-10">
                {isRecording ? (
                  <Square size={16} className="sm:w-5 sm:h-5 text-white" fill="currentColor" />
                ) : (
                  <Circle size={22} className="sm:w-[26px] sm:h-[26px] text-white" fill="currentColor" />
                )}
              </div>
            </button>

            <button
              onClick={handleStop}
              className="flex items-center justify-center min-w-[44px] min-h-[44px] sm:w-12 sm:h-12 rounded-xl bg-white/10 border border-white/10 text-white hover:bg-white/15 active:scale-95 transition-all touch-manipulation"
            >
              <Square size={16} className="sm:w-[18px] sm:h-[18px]" fill="currentColor" />
            </button>

            <button
              onClick={undoLastTake}
              disabled={!lastRecordedTrackId || isRecording}
              title="Undo Last Take"
              className={`flex items-center justify-center min-w-[36px] min-h-[36px] sm:w-10 sm:h-10 rounded-xl border transition-all active:scale-95 touch-manipulation ${lastRecordedTrackId && !isRecording
                ? 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
                : 'bg-white/5 border-white/10 text-slate-600 cursor-not-allowed'
                }`}
            >
              <Undo2 size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </div>

      {
        showDeleteConfirm && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70" onClick={() => setShowDeleteConfirm(false)} />
            <div className="relative bg-[#1a1225] rounded-2xl p-6 max-w-sm w-full border border-white/10">
              <h3 className="text-lg font-bold text-white mb-2">Replace Recording?</h3>
              <p className="text-slate-400 text-sm mb-6">
                This track already has a recording. Do you want to delete it and record a new one?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setTrackToDelete(null);
                  }}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAndRecord}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium hover:bg-red-400 transition-colors"
                >
                  Delete & Record
                </button>
              </div>
            </div>
          </div>
        )
      }

      <NextActionPrompt
        isOpen={showNextActionPrompt}
        onClose={() => setShowNextActionPrompt(false)}
        onAddLayer={handleAddLayer}
        onPractice={handlePractice}
        onSave={handleSave}
      />

      <ProjectSettingsSheet
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        project={currentProject}
        currentTracks={tracks.map(t => ({
          id: t.id,
          name: t.name,
          audioUrl: t.audioUrl,
          muted: t.muted,
          effects: t.effects
        }))}
        onProjectUpdated={(updated) => setCurrentProject(updated)}
        onProjectDeleted={() => {
          setCurrentProject(null);
          setView('home');
        }}
      />

      <TrackEffectsPanel
        isOpen={showEffectsPanel}
        onClose={() => {
          setShowEffectsPanel(false);
          setEffectsTrackId(null);
        }}
        trackId={effectsTrackId || ''}
        trackName={tracks.find(t => t.id === effectsTrackId)?.name || 'Track'}
        initialEffects={tracks.find(t => t.id === effectsTrackId)?.effects || DEFAULT_EFFECTS}
        onEffectsChange={handleEffectsChange}
      />
      <ConfirmationModal
        isOpen={showLeaveConfirm}
        title="Unsaved Changes"
        message="You have unsaved recordings. Would you like to save them before leaving?"
        confirmLabel="Save & Leave"
        cancelLabel="Discard & Leave"
        onConfirm={handleConfirmLeave}
        onCancel={() => {
          setShowLeaveConfirm(false);
          setView('home');
        }}
        isDanger={false}
      />
    </div>
  );
}
