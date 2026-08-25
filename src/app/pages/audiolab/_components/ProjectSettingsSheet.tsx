"use client";

import { useState, useEffect } from 'react';
import { X, Pencil, Trash2, Download, Check, UserPlus, Search, CheckCircle2 } from 'lucide-react';
import CustomLoader from '@/components/CustomLoader';
import { updateProject, deleteProject, addCollaborator, removeCollaborator } from '../_lib/project-service';
import { ChatApiService } from '@/app/pages/groups/_lib/chat-api-service';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { useAudioLab } from '../_context/AudioLabContext';
import type { AudioLabProject } from '../_types';
import { exportMix, TrackToExport } from '../_lib/export-service';

type ExportStep = 'idle' | 'collecting' | 'processing' | 'exporting' | 'done' | 'error';

interface ZoneMember {
  id: string;
  name: string;
  avatar?: string;
}

interface TrackWithEffects {
  id: string;
  name: string;
  audioUrl?: string;
  muted: boolean;
  effects?: {
    volume: number;
    pan: number;
    reverb: number;
    bass: number;
    treble: number;
    compression: number;
  };
}

interface ProjectSettingsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  project: AudioLabProject | null;
  currentTracks?: TrackWithEffects[];
  onProjectUpdated: (project: AudioLabProject) => void;
  onProjectDeleted: () => void;
}

export function ProjectSettingsSheet({
  isOpen,
  onClose,
  project,
  currentTracks,
  onProjectUpdated,
  onProjectDeleted
}: ProjectSettingsSheetProps) {
  const { user } = useAuth();
  const { currentZone } = useZone();
  const { state } = useAudioLab();

  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(project?.name || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Export state
  const [exportStep, setExportStep] = useState<ExportStep>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportedUrl, setExportedUrl] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Invite collaborator state
  const [showInvite, setShowInvite] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ZoneMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAddingCollaborator, setIsAddingCollaborator] = useState<string | null>(null);
  const [collaboratorDetails, setCollaboratorDetails] = useState<ZoneMember[]>([]);

  // Load collaborator details when project changes
  useEffect(() => {
    if (project?.collaborators && project.collaborators.length > 0) {
      loadCollaboratorDetails();
    } else {
      setCollaboratorDetails([]);
    }
  }, [project?.collaborators]);

  const loadCollaboratorDetails = async () => {
    if (!project?.collaborators) return;

    const details: ZoneMember[] = [];
    for (const userId of project.collaborators) {
      try {
        const userInfo = await ChatApiService.getUser(userId);
        if (userInfo) {
          // fullName from getUser is already the best available name
          // (userName from zone_members or first_name + last_name from profiles)
          details.push({
            id: userId,
            name: userInfo.fullName || 'Unknown',
            avatar: userInfo.profilePic || undefined
          });
        }
      } catch (error) {
 console.error('[ProjectSettings] Error loading collaborator:', error);
      }
    }
    setCollaboratorDetails(details);
  };

  // Search for zone members (Debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim() && user?.uid && currentZone?.id) {
        performSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, user?.uid, currentZone?.id]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const results = await ChatApiService.searchUsers(query, (user?.uid || user?.id || ''), (currentZone?.id || ''));
      // Filter out existing collaborators and owner
      const filtered = results
        .filter(r => r.id !== project?.ownerId && !project?.collaborators?.includes(r.id))
        .map(r => ({
          id: r.id,
          name: r.fullName || 'Unknown',
          avatar: r.profilePic || undefined
        }));
      setSearchResults(filtered);
    } catch (error) {
 console.error('[ProjectSettings] Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Add collaborator
  const handleAddCollaborator = async (member: ZoneMember) => {
    if (!project) return;

    setIsAddingCollaborator(member.id);
    try {
      const result = await addCollaborator(project.id, member.id);
      if (result.success) {
        const updatedCollaborators = [...(project.collaborators || []), member.id];
        onProjectUpdated({ ...project, collaborators: updatedCollaborators });
        setCollaboratorDetails(prev => [...prev, member]);
        setSearchResults(prev => prev.filter(r => r.id !== member.id));
        setSearchQuery('');
      }
    } catch (error) {
 console.error('[ProjectSettings] Add collaborator error:', error);
    } finally {
      setIsAddingCollaborator(null);
    }
  };

  // Remove collaborator
  const handleRemoveCollaborator = async (userId: string) => {
    if (!project) return;

    setIsAddingCollaborator(userId);
    try {
      const result = await removeCollaborator(project.id, userId);
      if (result.success) {
        const updatedCollaborators = project.collaborators.filter(id => id !== userId);
        onProjectUpdated({ ...project, collaborators: updatedCollaborators });
        setCollaboratorDetails(prev => prev.filter(c => c.id !== userId));
      }
    } catch (error) {
 console.error('[ProjectSettings] Remove collaborator error:', error);
    } finally {
      setIsAddingCollaborator(null);
    }
  };

  if (!isOpen || !project) return null;

  const handleRename = async () => {
    if (!newName.trim() || newName === project.name) {
      setIsRenaming(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateProject(project.id, { name: newName.trim() });
      if (result.success) {
        onProjectUpdated({ ...project, name: newName.trim() });
        setIsRenaming(false);
      }
    } catch (error) {
 console.error('[ProjectSettings] Rename failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const result = await deleteProject(project.id);
      if (result.success) {
        onProjectDeleted();
        onClose();
      }
    } catch (error) {
 console.error('[ProjectSettings] Delete failed:', error);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleExport = async () => {
    // Use currentTracks if available (has current effects), otherwise fall back to project.tracks
    const tracksToExport = currentTracks || project.tracks as TrackToExport[];
    const tracksWithAudio = tracksToExport.filter(t => t.audioUrl && !t.muted);

    if (tracksWithAudio.length === 0) {
      setExportError('No recordings to export');
      setExportStep('error');
      return;
    }

    try {
      setExportStep('collecting');
      setExportProgress(0);
      setExportError(null);
      setExportedUrl(null);

      const wavBlob = await exportMix(tracksToExport, (step, progress) => {
        setExportStep(step);
        setExportProgress(progress);
      });

      // Create download URL
      const url = URL.createObjectURL(wavBlob);
      setExportedUrl(url);

      setExportStep('done');
      setExportProgress(100);

    } catch (error) {
 console.error('[Export] Error:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
      setExportStep('error');
    }
  };

  const handleDownloadExport = () => {
    if (!exportedUrl || !project) return;

    const link = document.createElement('a');
    link.href = exportedUrl;
    link.download = `${project.name.replace(/[^a-z0-9]/gi, '_')}_mix.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetExport = () => {
    if (exportedUrl) {
      URL.revokeObjectURL(exportedUrl);
    }
    setExportStep('idle');
    setExportProgress(0);
    setExportedUrl(null);
    setExportError(null);
  };


  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-[150] animate-fadeIn"
        onClick={onClose}
      />

      {/* Sheet Container - flex items-end ensures bottom positioning */}
      <div className="fixed inset-0 z-[150] flex items-end justify-center pointer-events-none">
        {/* Sheet */}
        <div
          className="pointer-events-auto w-full bg-[#131318] rounded-t-3xl animate-slide-up max-h-[85vh] overflow-y-auto max-w-md md:max-w-2xl lg:max-w-4xl xl:max-w-6xl shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-10 h-1 bg-slate-600 rounded-full" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-4 border-b border-slate-800">
            <h3 className="text-lg font-bold text-white">Project Settings</h3>
            <button
              onClick={onClose}
              className="size-8 rounded-full bg-slate-700 flex items-center justify-center text-white hover:bg-slate-600 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className={`p-5 space-y-3 ${state?.isPlayerVisible ? 'pb-28' : 'pb-10'}`}>
            {/* Project Name */}
            {isRenaming ? (
              <div className="flex items-center gap-2 p-3 bg-slate-800 rounded-xl border border-slate-700">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 bg-transparent text-white font-medium focus:outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename();
                    if (e.key === 'Escape') setIsRenaming(false);
                  }}
                />
                <button
                  onClick={handleRename}
                  disabled={isSaving}
                  className="size-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white"
                >
                  {isSaving ? <CustomLoader size="sm" /> : <Check size={16} />}
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNewName(project.name);
                  setIsRenaming(true);
                }}
                className="w-full flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors text-left"
              >
                <div className="size-10 rounded-lg bg-slate-700 flex items-center justify-center">
                  <Pencil size={20} className="text-slate-300" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Rename Project</p>
                  <p className="text-slate-400 text-sm truncate">{project.name}</p>
                </div>
              </button>
            )}

            {/* Invite Collaborators */}
            {showInvite ? (
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">Invite Collaborators</p>
                  <button
                    onClick={() => {
                      setShowInvite(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-2 p-2 bg-slate-900 rounded-lg border border-slate-700">
                  <Search size={18} className="text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search zone members..."
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-slate-500"
                  />
                  {isSearching && <CustomLoader size="sm" />}
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {searchResults.map(member => (
                      <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/50">
                        {member.avatar ? (
                          <img src={member.avatar} alt="" className="size-8 rounded-full object-cover" />
                        ) : (
                          <div className="size-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 text-sm font-bold">
                            {member.name[0]}
                          </div>
                        )}
                        <span className="flex-1 text-white text-sm truncate">{member.name}</span>
                        <button
                          onClick={() => handleAddCollaborator(member)}
                          disabled={isAddingCollaborator === member.id}
                          className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {isAddingCollaborator === member.id ? (
                            <CustomLoader size="sm" />
                          ) : (
                            'Add'
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <p className="text-slate-500 text-sm text-center py-2">No members found</p>
                )}

                {/* Current Collaborators */}
                {collaboratorDetails.length > 0 && (
                  <div className="pt-3 border-t border-slate-700">
                    <p className="text-slate-400 text-xs font-medium mb-2">Current Collaborators</p>
                    <div className="space-y-2">
                      {collaboratorDetails.map(collab => (
                        <div key={collab.id} className="flex items-center gap-3 p-2 rounded-lg bg-slate-700/50">
                          {collab.avatar ? (
                            <img src={collab.avatar} alt="" className="size-8 rounded-full object-cover" />
                          ) : (
                            <div className="size-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-sm font-bold">
                              {collab.name[0]}
                            </div>
                          )}
                          <span className="flex-1 text-white text-sm truncate">{collab.name}</span>
                          <button
                            onClick={() => handleRemoveCollaborator(collab.id)}
                            disabled={isAddingCollaborator === collab.id}
                            className="px-2 py-1 text-red-400 text-xs font-bold hover:bg-red-500/20 rounded"
                          >
                            {isAddingCollaborator === collab.id ? (
                              <CustomLoader size="sm" />
                            ) : (
                              'Remove'
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setShowInvite(true)}
                className="w-full flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors text-left"
              >
                <div className="size-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <UserPlus size={20} className="text-blue-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Invite Collaborators</p>
                  <p className="text-slate-400 text-sm">
                    {collaboratorDetails.length > 0
                      ? `${collaboratorDetails.length} collaborator${collaboratorDetails.length > 1 ? 's' : ''}`
                      : 'Let others add their recordings'
                    }
                  </p>
                </div>
                {collaboratorDetails.length > 0 && (
                  <div className="flex -space-x-2">
                    {collaboratorDetails.slice(0, 3).map(c => (
                      c.avatar ? (
                        <img key={c.id} src={c.avatar} alt="" className="size-6 rounded-full border-2 border-slate-800 object-cover" />
                      ) : (
                        <div key={c.id} className="size-6 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-slate-300 text-[10px] font-bold">
                          {c.name[0]}
                        </div>
                      )
                    ))}
                    {collaboratorDetails.length > 3 && (
                      <div className="size-6 rounded-full border-2 border-slate-800 bg-slate-600 flex items-center justify-center text-white text-[10px] font-bold">
                        +{collaboratorDetails.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </button>
            )}

            {/* Export */}
            {exportStep !== 'idle' ? (
              <div className="p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-4">
                {/* Progress Steps */}
                <div className="flex items-center justify-between">
                  <p className="text-white font-medium">
                    {exportStep === 'collecting' && 'Collecting tracks...'}
                    {exportStep === 'processing' && 'Processing & mixing...'}
                    {exportStep === 'exporting' && 'Exporting audio...'}
                    {exportStep === 'done' && 'Export complete!'}
                    {exportStep === 'error' && 'Export failed'}
                  </p>
                  {exportStep !== 'done' && exportStep !== 'error' && (
                    <CustomLoader size="sm" />
                  )}
                  {exportStep === 'done' && (
                    <CheckCircle2 size={18} className="text-emerald-400" />
                  )}
                </div>

                {/* Progress Bar */}
                {exportStep !== 'error' && (
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-300"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                )}

                {/* Step Indicators */}
                {exportStep !== 'error' && exportStep !== 'done' && (
                  <div className="flex justify-between text-xs">
                    <span className={exportStep === 'collecting' ? 'text-emerald-400' : 'text-slate-500'}>
                      Collecting
                    </span>
                    <span className={exportStep === 'processing' ? 'text-emerald-400' : 'text-slate-500'}>
                      Processing
                    </span>
                    <span className={exportStep === 'exporting' ? 'text-emerald-400' : 'text-slate-500'}>
                      Exporting
                    </span>
                  </div>
                )}

                {/* Error Message */}
                {exportStep === 'error' && exportError && (
                  <p className="text-red-400 text-sm">{exportError}</p>
                )}

                {/* Done Actions */}
                {exportStep === 'done' && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadExport}
                      className="flex-1 py-2.5 px-4 bg-emerald-500 rounded-lg text-white font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={16} />
                      Download Mix
                    </button>
                    <button
                      onClick={resetExport}
                      className="py-2.5 px-4 bg-slate-700 rounded-lg text-white font-medium hover:bg-slate-600 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                {/* Error Actions */}
                {exportStep === 'error' && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleExport}
                      className="flex-1 py-2.5 px-4 bg-slate-700 rounded-lg text-white font-medium hover:bg-slate-600 transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={resetExport}
                      className="py-2.5 px-4 bg-slate-700 rounded-lg text-white font-medium hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={handleExport}
                className="w-full flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors text-left"
              >
                <div className="size-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Download size={20} className="text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium">Export Recording</p>
                  <p className="text-slate-400 text-sm">Mix all tracks with effects</p>
                </div>
              </button>
            )}

            {/* Delete */}
            {showDeleteConfirm ? (
              <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
                <p className="text-red-400 font-medium mb-3">Delete this project?</p>
                <p className="text-slate-400 text-sm mb-4">This action cannot be undone.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 px-4 bg-slate-700 rounded-lg text-white font-medium hover:bg-slate-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 py-2 px-4 bg-red-500 rounded-lg text-white font-medium hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                  >
                    {isDeleting ? <CustomLoader size="sm" /> : <Trash2 size={16} />}
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50 hover:bg-red-500/10 hover:border-red-500/20 transition-colors text-left group"
              >
                <div className="size-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <Trash2 size={20} className="text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-medium group-hover:text-red-400 transition-colors">Delete Project</p>
                  <p className="text-slate-400 text-sm">Remove permanently</p>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
