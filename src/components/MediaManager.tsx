"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload,
  Image,
  Music,
  File,
  Trash2,
  Download,
  Search,
  Filter,
  Grid,
  List,
  Plus,
  Folder,
  FolderOpen,
  X,
  Play,
  Pause,
  Check,
  CheckCircle,
  RefreshCw,
  Settings,
  MoreVertical
} from 'lucide-react';

export interface CloudinaryMediaFile {
  id: string; name: string; url: string; publicId: string; resourceType: string;
  type: string; size: number; folder: string; createdAt: string; updatedAt: string;
}


export interface CloudinaryMediaFile {
  id: string; name: string; url: string; publicId: string; resourceType: string;
  type: string; size: number; folder: string; createdAt: string; updatedAt: string;
}

import { useZone } from '@/hooks/useZone';
import { Toast } from './Toast';
import { apiClient } from '@/lib/api-client';
import { getFileType, uploadToCloudinary } from '@/lib/cloudinary-storage';
import CustomLoader from './CustomLoader';


interface MediaFile {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'audio' | 'video' | 'document';
  size: number;
  uploadedAt: string;
  folder?: string;
  storagePath?: string; // Path in Supabase Storage
}

interface MediaManagerProps {
  onSelectFile?: (file: MediaFile) => void;
  onClose?: () => void;
  filterType?: 'all' | 'image' | 'audio' | 'video' | 'document';
  selectionMode?: boolean;
  allowedTypes?: ('image' | 'audio' | 'video' | 'document')[];
}

export default function MediaManager({
  onSelectFile,
  onClose,
  filterType = 'all',
  selectionMode = false,
  allowedTypes = ['image', 'audio', 'video', 'document']
}: MediaManagerProps) {
  const { currentZone } = useZone();

  // Import admin theme if available, fallback to default colors
  let theme;
  try {
    const { useAdminTheme } = require('./admin/AdminThemeProvider');
    theme = useAdminTheme().theme;
  } catch {
    // Fallback theme for when not in admin context
    theme = {
      primary: 'bg-purple-600',
      primaryHover: 'hover:bg-purple-700',
      primaryLight: 'bg-purple-100',
      text: 'text-purple-600',
      border: 'border-purple-200'
    };
  }
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedType, setSelectedType] = useState<'all' | 'image' | 'audio' | 'video' | 'document'>(filterType);
  const [selectedFolder, setSelectedFolder] = useState<string>('all');
  const [dragOver, setDragOver] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [runningDiagnostics, setRunningDiagnostics] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [mediaPage, setMediaPage] = useState(1);
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<MediaFile | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Track which type we're filtering by for pagination
  const [currentFilterType, setCurrentFilterType] = useState<string | null>(null);
  const [isDeepSearching, setIsDeepSearching] = useState(false);
  const [deepSearchResults, setDeepSearchResults] = useState<MediaFile[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load files from database with optimized caching
  useEffect(() => {
    if (currentZone) {
      loadFilesFromDatabase();
    }
  }, [currentZone?.id]); // Reload when zone changes

  const loadFilesFromDatabase = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const startTime = performance.now();

      const zoneParam = currentZone?.id ? `&zoneId=${encodeURIComponent(currentZone.id)}` : '';
      const res = await apiClient.get<any>(`/media?limit=200&page=1${zoneParam}`);
      let mediaFiles: any[] = [];
      if (Array.isArray(res)) mediaFiles = res;
      else if (res && typeof res === 'object') {
        if (Array.isArray((res as any).data)) mediaFiles = (res as any).data;
        else if (Array.isArray((res as any).media)) mediaFiles = (res as any).media;
        else if (Array.isArray((res as any).items)) mediaFiles = (res as any).items;
      }
      setMediaPage(1);
      setHasMore(Number(res?.page || 1) < Number(res?.totalPages || 1));
      setCurrentFilterType(null);

      const loadTime = performance.now() - startTime;

      // Convert to component format
      const convertedFiles: MediaFile[] = mediaFiles.map((dbFile: any) => {
        let actualType = dbFile.type as 'image' | 'audio' | 'video' | 'document';
        if (!actualType || actualType === 'document' || (actualType as any) === 'raw' || (actualType as any) === 'file') {
          actualType = getFileType(dbFile.name || dbFile.title || dbFile.url);
        }
        return {
          id: dbFile.id,
          name: dbFile.title || dbFile.name || 'Untitled Asset',
          url: dbFile.url || dbFile.videoUrl,
          type: actualType,
          size: dbFile.size || 0,
          folder: dbFile.folder || 'uncategorized',
          uploadedAt: dbFile.createdAt || new Date().toISOString(),
          storagePath: dbFile.publicId || dbFile.id,
          createdAt: new Date(dbFile.createdAt || Date.now()),
          updatedAt: new Date(dbFile.updatedAt || Date.now())
        };
      });

      setFiles(convertedFiles);
    } catch (error) {
      console.error('[MediaManager] Error loading media files:', error);
      addToast({
        type: 'error',
        message: `Failed to load media: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Load more media files
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = mediaPage + 1;
      const zoneParam = currentZone?.id ? `&zoneId=${encodeURIComponent(currentZone.id)}` : '';
      const response = await apiClient.get<any>(`/media?limit=200&page=${nextPage}${zoneParam}`);
      const moreFiles: any[] = Array.isArray(response?.data) ? response.data : [];
      setMediaPage(nextPage);
      setHasMore(nextPage < Number(response?.totalPages || nextPage));

      if (moreFiles.length > 0) {
        const convertedFiles: MediaFile[] = moreFiles.map((dbFile: any) => {
          let actualType = dbFile.type as 'image' | 'audio' | 'video' | 'document';
          if (!actualType || actualType === 'document' || actualType as any === 'raw' || actualType as any === 'file') {
            actualType = getFileType(dbFile.name || dbFile.url);
          }
          return {
            id: dbFile.id,
            name: dbFile.name,
            url: dbFile.url,
            type: actualType,
            size: dbFile.size,
            folder: dbFile.folder || 'uncategorized',
            uploadedAt: dbFile.createdAt,
            storagePath: dbFile.publicId,
            createdAt: new Date(dbFile.createdAt),
            updatedAt: new Date(dbFile.updatedAt)
          };
        });

        setFiles(prev => [...prev, ...convertedFiles]);
      }
    } catch (error) {
 console.error(' Error loading more media:', error);
      addToast({
        type: 'error',
        message: 'Failed to load more files'
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { ...toast, id }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return <Image className="w-6 h-6" />;
      case 'audio': return <Music className="w-6 h-6" />;
      case 'video': return <File className="w-6 h-6" />;
      default: return <File className="w-6 h-6" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case 'image': return 'text-green-600 bg-green-100';
      case 'audio': return `${theme.text} ${theme.primaryLight}`;
      case 'video': return `${theme.text} ${theme.primaryLight}`;
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFileUpload = async (fileList: FileList) => {
    if (!fileList || fileList.length === 0) {
      addToast({
        type: 'error',
        message: 'No files selected'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    let successCount = 0;
    let failCount = 0;

    try {

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadingFile(file.name);

        // Determine file type using name (extension fallback) or type (mime fallback)
        const fileType = getFileType(file.name || file.type);

        try {
        const uploadedUrl = await uploadToCloudinary(file, (progress) => {
          setUploadProgress(Math.round(((i + progress / 100) / fileList.length) * 100));
        }, 'media');
        const mediaResponse = await apiClient.post<{ success?: boolean; data?: unknown; error?: string }>('/media', {
          title: file.name,
          url: uploadedUrl,
          type: fileType,
          zoneId: currentZone?.id || 'global',
        });
        if (mediaResponse.success !== false) {
          successCount++;
          addToast({
            type: 'success',
            message: `"${file.name}" uploaded successfully!`
          });
        }
      } catch (fileError) {
 console.error(` Error uploading "${file.name}":`, fileError);
          failCount++;
          addToast({
            type: 'error',
            message: ` Error uploading "${file.name}": ${fileError instanceof Error ? fileError.message : 'Unknown error'}`
          });
        }
      }

      // Refresh local data to show new files
      if (successCount > 0) {
        await loadFilesFromDatabase(false);
      }

      // Show summary
      if (successCount > 0 && failCount === 0) {
        addToast({
          type: 'success',
          message: ` All ${successCount} file(s) uploaded successfully!`
        });
      } else if (successCount > 0 && failCount > 0) {
        addToast({
          type: 'warning',
          message: `️ ${successCount} succeeded, ${failCount} failed`
        });
      } else if (failCount > 0) {
        addToast({
          type: 'error',
          message: ` All ${failCount} file(s) failed to upload`
        });
      }
    } catch (error) {
 console.error(' Upload error:', error);
      addToast({
        type: 'error',
        message: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadingFile(null);
    }
  };

  const handleFileSelect = (file: MediaFile) => {
    if (selectionMode) {
      setSelectedFile(file);
    }
  };

  const handleFileDoubleClick = (file: MediaFile) => {
    if (selectionMode && onSelectFile) {
      onSelectFile(file);
      if (onClose) {
        onClose();
      }
    }
  };

  const handleConfirmSelection = () => {
    if (selectedFile && onSelectFile && selectionMode) {
      onSelectFile(selectedFile);
      if (onClose) {
        onClose();
      }
    }
  };

  const getDownloadUrl = (url: string, fileName: string) => {
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/upload/');
      if (parts.length === 2) {
        const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        return `${parts[0]}/upload/fl_attachment:${sanitizedName}/${parts[1]}`;
      }
    }
    return url;
  };

  const handleDownload = (file: MediaFile) => {
    addToast({
      type: 'info',
      message: `Downloading: ${file.name}`
    });
    try {
      const downloadUrl = getDownloadUrl(file.url, file.name);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.target = '_blank';
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download trigger error, fallback to new tab:', err);
      window.open(file.url, '_blank');
    }
  };

  const handleFileDeleteClick = (file: MediaFile) => {
    setFileToDelete(file);
    setShowDeleteModal(true);
  };

  const confirmDeleteFile = async () => {
    if (!fileToDelete) return;
    const file = fileToDelete;
    try {
      const result = await apiClient.delete<{ success?: boolean; error?: string }>(`/media/${encodeURIComponent(file.id)}`);
      if (result?.success === false) {
        throw new Error(result.error || 'Media deletion failed');
      }
      await loadFilesFromDatabase();
      addToast({
        type: 'success',
        message: `File "${file.name}" deleted successfully!`
      });
    } catch (error) {
      console.error('Delete error:', error);
      addToast({
        type: 'error',
        message: 'Delete failed. Please try again.'
      });
    } finally {
      setShowDeleteModal(false);
      setFileToDelete(null);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    addToast({
      type: 'success',
      message: 'URL copied to clipboard!'
    });
  };

  const handleRunDiagnostics = async () => {
    setRunningDiagnostics(true);
    addToast({
      type: 'info',
      message: 'Running diagnostics... Check console for results'
    });

    try {
      const results = await runMediaDiagnostics();
      printDiagnostics(results);

      const failed = results.filter((r: DiagnosticResult) => r.status === 'fail').length;
      const warnings = results.filter((r: DiagnosticResult) => r.status === 'warning').length;

      if (failed > 0) {
        addToast({
          type: 'error',
          message: `Diagnostics complete: ${failed} test(s) failed. Check console for details.`
        });
      } else if (warnings > 0) {
        addToast({
          type: 'warning',
          message: `Diagnostics complete: ${warnings} warning(s). Check console for details.`
        });
      } else {
        addToast({
          type: 'success',
          message: 'All diagnostics passed! '
        });
      }
    } catch (error) {
 console.error('Diagnostics error:', error);
      addToast({
        type: 'error',
        message: 'Failed to run diagnostics'
      });
    } finally {
      setRunningDiagnostics(false);
    }
  };

  const handleAudioPlay = async (file: MediaFile) => {
    if (playingAudioId === file.id) {
      // Pause current audio
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingAudioId(null);
      }
    } else {
      // Stop any currently playing audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Play new audio
      if (audioRef.current) {
        try {

          audioRef.current.crossOrigin = 'anonymous';
          audioRef.current.src = file.url;

          // Load the audio first
          audioRef.current.load();

          // Wait for it to be ready
          await audioRef.current.play();
          setPlayingAudioId(file.id);

          addToast({
            type: 'success',
            message: `Playing: ${file.name}`
          });
        } catch (error) {
 console.error(' Error playing audio:', error);
          addToast({
            type: 'error',
            message: `Failed to play audio: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
        }
      }
    }
  };

  const handleDeepSearch = async () => {
    if (!searchTerm || searchTerm.length < 2) return;

    setIsDeepSearching(true);
    addToast({
      type: 'info',
      message: 'Searching database for all matching files...'
    });

    try {
      const results = await Promise.resolve([]);

      const convertedResults: MediaFile[] = results.map((dbFile: any) => {
        let actualType = dbFile.type as 'image' | 'audio' | 'video' | 'document';
        if (!actualType || actualType === 'document' || actualType as any === 'raw' || actualType as any === 'file') {
          actualType = getFileType(dbFile.name || dbFile.url);
        }
        return {
          id: dbFile.id,
          name: dbFile.name,
          url: dbFile.url,
          type: actualType,
          size: dbFile.size,
          folder: dbFile.folder || 'uncategorized',
          uploadedAt: dbFile.createdAt,
          storagePath: dbFile.publicId,
          createdAt: new Date(dbFile.createdAt),
          updatedAt: new Date(dbFile.updatedAt)
        };
      });

      setDeepSearchResults(convertedResults);

      if (convertedResults.length === 0) {
        addToast({
          type: 'warning',
          message: 'No unlisted files found matching your search.'
        });
      } else {
        addToast({
          type: 'success',
          message: `Found ${convertedResults.length} unlisted files!`
        });
      }
    } catch (error) {
 console.error('Deep search error:', error);
      addToast({
        type: 'error',
        message: 'Deep search failed'
      });
    } finally {
      setIsDeepSearching(false);
    }
  };

  // Handle audio ended
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      const handleEnded = () => {
        setPlayingAudioId(null);
      };

      audio.addEventListener('ended', handleEnded);
      return () => audio.removeEventListener('ended', handleEnded);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === 'all' || file.type === selectedType;
      const matchesFolder = selectedFolder === 'all' || file.folder === selectedFolder;
      const matchesAllowedTypes = allowedTypes.includes(file.type);

      if (selectionMode && allowedTypes.length < 4) {
        return matchesSearch && matchesFolder && matchesAllowedTypes;
      }

      return matchesSearch && matchesType && matchesFolder && matchesAllowedTypes;
    });
  }, [files, searchTerm, selectedType, selectedFolder, allowedTypes, selectionMode]);

  // Merge local filtering with deep search results
  const allFilteredFiles = useMemo(() => {
    if (deepSearchResults.length === 0) return filteredFiles;

    // De-duplicate results (deep search might return items already in the local cache)
    const existingIds = new Set(filteredFiles.map(f => f.id));
    const uniqueDeepResults = deepSearchResults.filter(f => !existingIds.has(f.id));

    return [...filteredFiles, ...uniqueDeepResults];
  }, [filteredFiles, deepSearchResults]);

  const folders = ['all', ...Array.from(new Set(files.map(f => f.folder).filter(Boolean)))];

  const activeMenuFile = useMemo(() => {
    return files.find(f => f.id === activeMenuId) || null;
  }, [files, activeMenuId]);

  return (
    <div className="h-full w-full flex flex-col bg-white relative overflow-hidden">
      {/* Backdrop to close active dropdowns on click outside */}
      {activeMenuId && (
        <div
          className="fixed inset-0 z-30 bg-transparent"
          onClick={() => setActiveMenuId(null)}
        />
      )}
      {/* Loading Skeleton */}
      {loading && files.length === 0 && (
        <div className="absolute inset-0 bg-white z-50 flex flex-col items-center justify-center p-8">
          <CustomLoader message="Loading media library..." />
        </div>
      )}

      {/* Header - Compact on mobile */}
      <div className="flex-shrink-0 px-3 py-2 sm:p-4 border-b border-gray-200 bg-white sticky top-0 z-20">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 truncate">
            {selectionMode ? 'Select Audio' : 'Media Library'}
          </h2>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!selectionMode && (
              <button
                onClick={() => loadFilesFromDatabase(true)}
                disabled={loading}
                className={`p-2 ${theme.primary} text-white rounded-lg ${theme.primaryHover} transition-colors disabled:opacity-50`}
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Search - Always visible */}
        <div className="mt-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDeepSearchResults([]); // Reset deep results when search term changes
            }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          {searchTerm.length >= 2 && (
            <button
              onClick={handleDeepSearch}
              disabled={isDeepSearching}
              className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${isDeepSearching ? 'bg-gray-100 text-gray-400' : `${theme.primary} text-white hover:opacity-90`
                }`}
            >
              {isDeepSearching ? 'Searching...' : 'Deep Search'}
            </button>
          )}
        </div>

        {/* Type filter - Horizontal scroll on mobile */}
        <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1 -mx-3 px-3 scrollbar-hide">
          {['all', 'audio', 'image', 'video'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${selectedType === type
                ? `${theme.primary} text-white`
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Upload Area - Compact on mobile */}
      <div className="flex-shrink-0 px-3 py-2 sm:p-4 border-b border-gray-200 bg-gray-50">
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-3 sm:p-4 text-center transition-colors ${dragOver
            ? `${theme.border} ${theme.primaryLight}`
            : 'border-gray-300'
            }`}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center justify-center gap-2 w-full py-2 ${theme.text} font-medium`}
          >
            <Upload className="w-5 h-5" />
            <span>Upload Files</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={allowedTypes.map(type => {
              switch (type) {
                case 'image': return 'image/*';
                case 'audio': return 'audio/*';
                case 'video': return 'video/*';
                case 'document': return '.pdf,.doc,.docx,.txt';
                default: return '';
              }
            }).join(',')}
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
        </div>
      </div>

      {/* File count - Compact */}
      <div className="flex-shrink-0 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between bg-white">
        <p className="text-[10px] text-gray-500 font-medium">
          {allFilteredFiles.length} file{allFilteredFiles.length !== 1 ? 's' : ''}
          {deepSearchResults.length > 0 && ` (${deepSearchResults.length} from deep search)`}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? `${theme.primaryLight} ${theme.text}` : 'text-gray-400'
              }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? `${theme.primaryLight} ${theme.text}` : 'text-gray-400'
              }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Files Grid/List - Scrollable Area */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-4 pb-20">
        {uploading && (
          <div className="mb-2 p-2 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <p className="text-blue-700 text-xs font-medium truncate flex-1 mr-2">
                {uploadingFile}
              </p>
              <span className="text-blue-600 text-xs font-medium">
                {Math.round(uploadProgress)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {deepSearchResults.length > 0 && (
          <div className={`flex items-center justify-between mb-2 text-[10px] ${theme.text} font-bold px-1`}>
            <span>DATABASE SEARCH ACTIVE</span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live Feed
            </div>
          </div>
        )}
        {allFilteredFiles.length === 0 ? (
          <div className="text-center py-10 px-4 max-w-sm mx-auto">
            <div className="bg-purple-50/50 rounded-2xl p-8 border-2 border-dashed border-purple-100">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <File className="w-full h-full text-purple-200" />
                <Search className="w-8 h-8 text-purple-500 absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-sm" />
              </div>
              <p className="text-sm font-bold text-gray-900 mb-1">Not in local view?</p>
              <p className="text-[10px] text-gray-500 mb-6 leading-relaxed">
                We've only loaded the first 500 files. The item you're looking for might be in our wider storage.
              </p>

              {searchTerm.length >= 2 ? (
                <button
                  onClick={handleDeepSearch}
                  disabled={isDeepSearching}
                  className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 ${isDeepSearching
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : `bg-purple-600 text-white shadow-purple-200 hover:shadow-purple-300`
                    }`}
                >
                  {isDeepSearching ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Scanning Database...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Search Global Database
                    </>
                  )}
                </button>
              ) : (
                <p className="text-[10px] text-purple-400 italic font-medium">Type more to search globally</p>
              )}
            </div>
          </div>
        ) : (
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-4 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 relative'
            : 'space-y-1 relative'
          }>
            {isDeepSearching && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-xl min-h-[300px]">
                <div className="relative">
                  <RefreshCw className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                  <Search className="w-6 h-6 text-purple-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">Searching Deep Storage...</h3>
                <p className="text-[10px] text-gray-500 max-w-[200px] text-center px-4">
                  We're scanning all 2000+ files in the database for "{searchTerm}"
                </p>
              </div>
            )}
            {allFilteredFiles.map((file) => (
              viewMode === 'grid' ? (
                <div
                  key={file.id}
                  className={`group relative bg-white/80 backdrop-blur-sm border rounded-lg transition-all duration-300 hover:shadow-sm ${
                    activeMenuId === file.id ? 'z-30 border-purple-300 shadow-md scale-[1.01]' : 'z-10'
                  } ${selectionMode ? 'cursor-pointer active:scale-95' : ''
                    } ${selectedFile?.id === file.id
                      ? `border-purple-500 ring-1 ring-purple-200 shadow-md`
                      : 'border-gray-100 hover:border-purple-200'
                    }`}
                  onClick={() => handleFileSelect(file)}
                  onDoubleClick={() => handleFileDoubleClick(file)}
                >
                  {/* File Preview/Icon - Smaller on mobile */}
                  <div className="aspect-square bg-gray-50 flex items-center justify-center relative rounded-t-lg overflow-hidden">
                    {file.type === 'image' ? (
                      <img
                        src={file.url}
                        alt={file.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className={`p-2 sm:p-3 rounded-full ${getFileTypeColor(file.type)} transform transition-transform duration-300 group-hover:scale-110`}>
                        {getFileIcon(file.type)}
                      </div>
                    )}

                    {/* Play button for audio files */}
                    {file.type === 'audio' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAudioPlay(file);
                        }}
                        className="absolute top-1 left-1 p-1 text-purple-600 hover:text-purple-700 transition-colors"
                        title={playingAudioId === file.id ? "Pause" : "Play"}
                      >
                        {playingAudioId === file.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 fill-purple-600" />
                        )}
                      </button>
                    )}

                    {/* Selection check mark */}
                    {selectionMode && selectedFile?.id === file.id && (
                      <div className="absolute top-1 right-1 bg-purple-500 text-white rounded-full p-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>

                  {/* File Info - Balanced Compact */}
                  <div className="p-1 sm:p-1.5 bg-white/30 rounded-b-lg">
                    <h3
                      className={`font-semibold text-[9px] sm:text-[10px] text-gray-800 leading-[1.1] break-words cursor-pointer ${expandedFileId === file.id ? '' : 'line-clamp-1'
                        }`}
                      title={file.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedFileId(expandedFileId === file.id ? null : file.id);
                      }}
                    >
                      {file.name}
                    </h3>
                    <div className="flex items-center justify-between mt-0.5 gap-1">
                      <span className="text-[8px] text-gray-400 font-medium truncate">
                        {formatFileSize(file.size)}
                      </span>
                      {file.uploadedAt && (
                        <span className="text-[7px] text-purple-600/70 font-bold truncate" title={new Date(file.uploadedAt).toLocaleString()}>
                          {new Date(file.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions - Only on hover for non-selection mode */}
                  {!selectionMode && (
                    <div className={`absolute top-1 right-1 z-20 transition-opacity ${
                      activeMenuId === file.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(activeMenuId === file.id ? null : file.id);
                        }}
                        className="p-1 text-purple-600 hover:text-purple-700 transition-colors"
                        title="Actions"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {activeMenuId === file.id && (
                        /* Desktop Dropdown - only visible on md screen sizes and larger */
                        <div className="hidden md:block absolute right-0 mt-1 w-28 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              handleDownload(file);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-1.5"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuId(null);
                              handleFileDeleteClick(file);
                            }}
                            className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-2 bg-white/80 border rounded-lg hover:shadow-sm transition-all duration-300 ${
                    activeMenuId === file.id ? 'z-30 border-purple-300 shadow-md bg-purple-50/10' : 'z-10'
                  } ${
                    selectionMode ? 'cursor-pointer active:scale-95' : ''
                  } ${
                    selectedFile?.id === file.id
                      ? `border-purple-500 bg-purple-50/30 ring-1 ring-purple-100 shadow-sm`
                      : 'border-gray-100 hover:border-purple-200'
                  }`}
                  onClick={() => handleFileSelect(file)}
                  onDoubleClick={() => handleFileDoubleClick(file)}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Preview / Icon */}
                    <div className="w-10 h-10 rounded bg-gray-50 flex items-center justify-center relative overflow-hidden flex-shrink-0">
                      {file.type === 'image' ? (
                        <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className={`p-1.5 rounded-full ${getFileTypeColor(file.type)}`}>
                          {getFileIcon(file.type)}
                        </div>
                      )}
                      {file.type === 'audio' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAudioPlay(file);
                          }}
                          className="absolute inset-0 flex items-center justify-center bg-white/70 opacity-0 hover:opacity-100 transition-opacity"
                        >
                          {playingAudioId === file.id ? (
                            <Pause className="w-4 h-4 text-purple-600" />
                          ) : (
                            <Play className="w-4 h-4 text-purple-600 fill-purple-600" />
                          )}
                        </button>
                      )}
                    </div>
                    {/* Name & Size */}
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xs font-bold text-gray-800 truncate" title={file.name}>
                        {file.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-medium">
                          {formatFileSize(file.size)}
                        </span>
                        {file.uploadedAt && (
                          <>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-purple-600/80 font-semibold" title={new Date(file.uploadedAt).toLocaleString()}>
                              {new Date(file.uploadedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4 relative">
                    {file.type === 'audio' && playingAudioId !== file.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAudioPlay(file);
                        }}
                        className="p-1.5 text-purple-600 hover:text-purple-700 transition-colors"
                        title="Play audio"
                      >
                        <Play className="w-4 h-4 fill-purple-600" />
                      </button>
                    )}
                    {file.type === 'audio' && playingAudioId === file.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAudioPlay(file);
                        }}
                        className="p-1.5 text-purple-600 bg-purple-50 rounded-lg transition-colors"
                        title="Pause audio"
                      >
                        <Pause className="w-4 h-4 animate-pulse" />
                      </button>
                    )}
                    
                    {!selectionMode && (
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuId(activeMenuId === file.id ? null : file.id);
                          }}
                          className="p-1.5 text-purple-600 hover:text-purple-700 transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {activeMenuId === file.id && (
                          /* Desktop Dropdown - only visible on md screen sizes and larger */
                          <div className="hidden md:block absolute right-0 mt-1 w-28 bg-white border border-gray-100 rounded-lg shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleDownload(file);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-gray-700 hover:bg-purple-50 hover:text-purple-600 transition-colors flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuId(null);
                                handleFileDeleteClick(file);
                              }}
                              className="w-full px-3 py-1.5 text-left text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    {selectionMode && selectedFile?.id === file.id && (
                      <div className="bg-purple-500 text-white rounded-full p-0.5">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              )
            ))}

            {/* Load More Button */}
            {hasMore && !searchTerm && (
              <div className={viewMode === 'grid' ? 'col-span-full' : ''}>
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                  className="w-full py-2 mt-2 text-purple-600 text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Load More
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast Notifications - Improved UI */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 space-y-2 z-[100] w-[90%] max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl shadow-lg animate-in slide-in-from-top-2 duration-300 ${toast.type === 'success'
              ? 'bg-green-500 text-white'
              : toast.type === 'error'
                ? 'bg-red-500 text-white'
                : toast.type === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-white'
              }`}
          >
            {toast.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
            {toast.type === 'error' && <X className="w-4 h-4 shrink-0" />}
            {toast.type === 'warning' && <RefreshCw className="w-4 h-4 shrink-0" />}
            {toast.type === 'info' && <Music className="w-4 h-4 shrink-0" />}
            <p className="text-sm flex-1 line-clamp-2">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 hover:bg-white/20 rounded-full shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Floating Selection Bar - Compact on mobile */}
      {selectionMode && selectedFile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg px-3 py-2 z-[60]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className={`p-1.5 rounded-lg shrink-0 ${getFileTypeColor(selectedFile.type)}`}>
                <Music className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
            </div>
            <button
              onClick={handleConfirmSelection}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium text-sm shrink-0"
            >
              Select
            </button>
          </div>
        </div>
      )}

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error(' Audio element error:', e);
          setPlayingAudioId(null);
          addToast({
            type: 'error',
            message: 'Audio playback error. The file may be corrupted or inaccessible.'
          });
        }}
        onLoadedData={() => {
        }}
      />

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && fileToDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden transform animate-in scale-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-gray-950 mb-1">Delete Media File?</h3>
              <p className="text-xs text-gray-500 leading-relaxed max-w-[280px] mx-auto">
                Are you sure you want to delete <span className="font-semibold text-gray-800 break-all">"{fileToDelete.name}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setFileToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteFile}
                className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm active:scale-95 shadow-lg shadow-red-100 hover:shadow-red-200 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Sheet Drawer for Actions */}
      {activeMenuId && activeMenuFile && (
        <div 
          className="md:hidden fixed inset-0 z-[120] flex items-end justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            e.stopPropagation();
            setActiveMenuId(null);
          }}
        >
          <div 
            className="w-full bg-white rounded-t-2xl shadow-xl overflow-hidden transform animate-in slide-in-from-bottom duration-250 pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle line */}
            <div className="w-12 h-1 bg-gray-200 rounded-full mx-auto my-3" />
            
            {/* File name header */}
            <div className="px-4 pb-3 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">File Actions</p>
              <p className="text-sm font-bold text-gray-800 truncate mt-1">{activeMenuFile.name}</p>
            </div>

            <div className="p-2 space-y-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                  handleDownload(activeMenuFile);
                }}
                className="w-full px-4 py-3.5 text-left text-sm font-bold text-gray-700 active:bg-purple-50 hover:bg-purple-50 active:text-purple-600 rounded-xl transition-all flex items-center gap-3"
              >
                <Download className="w-5 h-5 text-purple-600" />
                <span>Download File</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                  handleFileDeleteClick(activeMenuFile);
                }}
                className="w-full px-4 py-3.5 text-left text-sm font-bold text-red-600 active:bg-red-50 hover:bg-red-50 rounded-xl transition-all flex items-center gap-3"
              >
                <Trash2 className="w-5 h-5 text-red-500" />
                <span>Delete File</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuId(null);
                }}
                className="w-full px-4 py-3.5 text-center text-sm font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all mt-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
