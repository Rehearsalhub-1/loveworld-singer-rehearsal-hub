"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, MessageSquare, Trash2, Music, X, Edit2, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useZone } from '@/hooks/useZone';
import { getZoneTheme } from '@/utils/zone-theme';
import { isHQGroup } from '@/config/zones';
import { ScreenHeader } from '@/components/ScreenHeader';
import { apiClient } from '@/lib/api-client';
import { uploadAudioToCloudinary } from '@/lib/cloudinary-storage';

export interface SongSubmissionForm {
  title: string;
  writer: string;
  leadSinger: string;
  lyrics: string;
  key: string;
  notes: string;
  audioFile?: any;
  audioUrl?: any;
}

export interface SongSubmission {
  [key: string]: any;
  id: string;
  title: string;
  writer?: string;
  leadSinger?: string;
  lyrics?: string;
  status: string;
}

const uploadAudio = async (file: File) => {
  return await uploadAudioToCloudinary(file);
};

const deleteUserSubmission = async (submissionId: string, _userId?: string) => {
  try {
    const res = await apiClient.delete<{ success: boolean; error?: string }>(`/submitted-songs/${encodeURIComponent(submissionId)}`);
    return { success: res?.success !== false, error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete submission' };
  }
};

const updateUserSubmission = async (submissionId: string, _userId: string, data: any) => {
  try {
    const res = await apiClient.patch<{ success: boolean; error?: string }>(`/submitted-songs/${encodeURIComponent(submissionId)}`, data);
    return { success: res?.success !== false, error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update submission' };
  }
};

const userReplyToSubmission = async (submissionId: string, _userId: string, message: string, senderName: string) => {
  try {
    const res = await apiClient.post<{ success: boolean; error?: string }>(`/submitted-songs/${encodeURIComponent(submissionId)}/reply`, {
      message,
      senderName,
    });
    return { success: res?.success !== false, error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to send reply' };
  }
};

const submitSong = async (data: any) => {
  try {
    const res = await apiClient.post<{ success: boolean; data?: any; error?: string }>('/submitted-songs', data);
    return { success: res?.success !== false, data: res?.data, error: res?.error };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to submit song' };
  }
};

export default function SubmitSongPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()
  const { currentZone } = useZone()

  // Get zone color and theme for theming
  const zoneColor = currentZone?.themeColor || '#9333EA'
  const zoneTheme = getZoneTheme(zoneColor)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [mySubmissions, setMySubmissions] = useState<SongSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [activeTab, setActiveTab] = useState<'submit' | 'submitted'>('submit')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingSubmission, setEditingSubmission] = useState<SongSubmission | null>(null)
  const [showReplyModal, setShowReplyModal] = useState(false)
  const [replyingTo, setReplyingTo] = useState<SongSubmission | null>(null)
  const [userReplyMessage, setUserReplyMessage] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null)

  // Generate focus ring color based on zone color
  const getFocusClasses = () => {
    return `${zoneTheme.focusRing} ${zoneTheme.focusBorder}`
  }

  const getUserName = () => {
    if (!profile) return ''
    const parts = [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean)
    return parts.join(' ') || user?.email || ''
  }

  const [formData, setFormData] = useState<SongSubmissionForm>({
    title: '',
    writer: getUserName(),
    leadSinger: '',
    lyrics: '',
    key: '',
    notes: '',
    audioFile: null,
    audioUrl: null
  })
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const [audioUploadProgress, setAudioUploadProgress] = useState(0)

  useEffect(() => {
    const userName = getUserName()
    if (userName && !formData.writer) {
      setFormData(prev => ({ ...prev, writer: userName }))
    }
  }, [profile, user])

  // Load user submissions
  const loadMySubmissions = React.useCallback(async () => {
    if (!user?.id) {
      setMySubmissions([]);
      setLoadingSubmissions(false);
      return;
    }

    try {
      setLoadingSubmissions(true);
      const res = await apiClient.get<{ success: boolean; data?: SongSubmission[] }>('/submitted-songs/mine');
      if (res?.success !== false && Array.isArray(res?.data)) {
        setMySubmissions(res.data);
      }
    } catch (err) {
      console.error('Error loading submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadMySubmissions();
  }, [loadMySubmissions]);

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!user?.id) return
    if (!confirm('Are you sure you want to delete this submission?')) return

    setDeletingId(submissionId)
    try {
      // Optimistically remove from local state for instant feedback
      setMySubmissions(prev => prev.filter(sub => sub.id !== submissionId))

      const result = await deleteUserSubmission(submissionId, user.id)
      if (!result.success) {
        // Revert on failure - real-time listener will restore correct state
        alert(result.error || 'Failed to delete submission')
      }
    } catch (error: any) {
      alert('Error deleting submission')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEditSubmission = (submission: SongSubmission) => {
    setEditingSubmission(submission)
    setFormData({
      title: submission.title,
      writer: submission.writer || '',
      leadSinger: submission.leadSinger || '',
      lyrics: submission.lyrics || '',
      key: submission.key || '',
      notes: submission.notes || '',
      audioFile: null,
      audioUrl: submission.audioUrl || null
    })
    setActiveTab('submit')
  }

  const handleUpdateSubmission = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id || !editingSubmission?.id) return

    if (!formData.title.trim() || !formData.lyrics.trim()) {
      alert('Please fill in at least the song title and lyrics')
      return
    }

    setIsSubmitting(true)
    try {
      const updatedData = {
        title: formData.title.trim(),
        lyrics: formData.lyrics.trim(),
        writer: formData.writer.trim() || getUserName() || 'Unknown',
        key: formData.key.trim() || '',
        leadSinger: formData.leadSinger.trim() || '',
        notes: formData.notes.trim() || '',
        audioUrl: formData.audioUrl || ''
      }

      const result = await updateUserSubmission(editingSubmission.id, user.id, updatedData)

      if (result.success) {
        // Optimistically update local state for instant feedback
        setMySubmissions(prev => prev.map(sub =>
          sub.id === editingSubmission.id
            ? { ...sub, ...updatedData, updatedAt: new Date().toISOString() }
            : sub
        ))

        setSubmitStatus('success')
        setEditingSubmission(null)
        setActiveTab('submitted')

        setTimeout(() => {
          setFormData({
            title: '',
            writer: getUserName(),
            leadSinger: '',
            lyrics: '',
            key: '',
            notes: '',
            audioFile: null,
            audioUrl: null
          })
          setSubmitStatus('idle')
        }, 2000)
      } else {
        alert(result.error || 'Failed to update submission')
      }
    } catch (error: any) {
      alert('Error updating submission')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingSubmission(null)
    setFormData({
      title: '',
      writer: getUserName(),
      leadSinger: '',
      lyrics: '',
      key: '',
      notes: '',
      audioFile: null,
      audioUrl: null
    })
  }

  const handleOpenReply = (submission: SongSubmission) => {
    setReplyingTo(submission)
    setUserReplyMessage('')
    setShowReplyModal(true)
  }

  const handleSendUserReply = async () => {
    if (!user?.id || !replyingTo?.id || !userReplyMessage.trim()) return

    setSendingReply(true)
    try {
      const result = await userReplyToSubmission(replyingTo.id, user.id, userReplyMessage.trim(), getUserName())
      if (result.success) {
        // Optimistically update local state with new conversation message
        const newMessage = {
          id: `msg-${Date.now()}`,
          sender: 'user' as const,
          senderName: getUserName() || 'User',
          message: userReplyMessage.trim(),
          timestamp: new Date().toISOString()
        }

        setMySubmissions(prev => prev.map(sub => {
          if (sub.id === replyingTo.id) {
            const existingConversation = (sub as any).conversation || []
            return {
              ...sub,
              conversation: [...existingConversation, newMessage],
              userReply: userReplyMessage.trim()
            } as SongSubmission
          }
          return sub
        }))

        setShowReplyModal(false)
        setReplyingTo(null)
        setUserReplyMessage('')
      } else {
        alert(result.error || 'Failed to send reply')
      }
    } catch (error: any) {
      alert('Error sending reply')
    } finally {
      setSendingReply(false)
    }
  }

  const handleInputChange = (field: keyof SongSubmissionForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type & extension
    const isAudioType = file.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac|wma|aiff|alac|opus|webm)$/i.test(file.name)
    if (!isAudioType) {
      alert('Please select a valid audio file (MP3, WAV, M4A, AAC, OGG, FLAC)')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Audio file must be less than 50MB')
      return
    }

    setFormData(prev => ({ ...prev, audioFile: file, audioUrl: null }))
    setUploadingAudio(true)
    setAudioUploadProgress(0)

    try {
      // Upload to Cloudinary
      const audioUrl = await uploadAudio(file)
      if (audioUrl) {
        setFormData(prev => ({ ...prev, audioUrl, audioFile: null }))
        setSubmitStatus('idle')
      } else {
        alert('Failed to upload audio. Please try again.')
        setFormData(prev => ({ ...prev, audioFile: null }))
      }
    } catch (error: any) {
 console.error('Error uploading audio:', error)
      alert('Failed to upload audio. Please try again.')
      setFormData(prev => ({ ...prev, audioFile: null }))
    } finally {
      setUploadingAudio(false)
      setAudioUploadProgress(0)
    }
  }

  const handleRemoveAudio = () => {
    setFormData(prev => ({ ...prev, audioFile: null, audioUrl: null }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Use cached profile if user is still loading
    const currentUser = user || (profile?.id ? { uid: profile.id } : null)
    if (!currentUser) {
      alert('Please log in to submit a song')
      return
    }

    if (!formData.title.trim() || !formData.lyrics.trim()) {
      alert('Please fill in at least the song title and lyrics')
      return
    }

    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      // CRITICAL: Include zone ID for proper filtering
      if (!currentZone?.id) {
        alert('Please select a zone before submitting')
        setIsSubmitting(false)
        return
      }

      // Use cached profile if user is still loading
      const userId = user?.id || profile?.id
      const userEmail = user?.email || profile?.email || ''

      if (!userId) {
        alert('Please log in to submit a song')
        setIsSubmitting(false)
        return
      }

      const result = await submitSong({
        title: formData.title.trim(),
        lyrics: formData.lyrics.trim(),
        writer: formData.writer.trim() || getUserName() || 'Unknown',
        category: 'Other',
        key: formData.key.trim() || '',
        tempo: '',
        leadSinger: formData.leadSinger.trim() || '',
        conductor: '',
        leadKeyboardist: '',
        leadGuitarist: '',
        drummer: '',
        solfas: '',
        notes: formData.notes.trim() || '',
        audioUrl: formData.audioUrl || '',
        // CRITICAL: Zone tracking
        zoneId: currentZone.id,
        zoneName: currentZone.name,
        submittedBy: {
          userId: userId,
          userName: getUserName() || userEmail || 'Unknown',
          email: userEmail,
          submittedAt: new Date().toISOString()
        }
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit song')
      }

      setSubmitStatus('success')

      // Switch to Submitted tab - real-time listener will show the new submission
      setActiveTab('submitted')

      setTimeout(() => {
        setFormData({
          title: '',
          writer: getUserName(),
          leadSinger: '',
          lyrics: '',
          key: '',
          notes: '',
          audioFile: null,
          audioUrl: null
        })
        setSubmitStatus('idle')
      }, 3000)

    } catch (error: any) {
 console.error('Error submitting song:', error)
      setSubmitStatus('error')
      alert('Failed to submit song. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Only show loading if auth is loading AND no cached profile
  if (authLoading && !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If we have cached profile, show content even if user is still loading

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Header */}
      <ScreenHeader
        title="Submit Song"
        showBackButton={true}
        backPath="/pages/rehearsals"
        rightImageSrc="/logo.png"
      />


      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-32 scroll-smooth">
        {/* Tabs */}
        <div className="px-4 pt-5 pb-3">
          <div className="inline-flex items-center rounded-2xl bg-gray-100 p-1.5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('submit')}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 touch-manipulation ${activeTab === 'submit'
                ? 'bg-white text-gray-900 shadow-md scale-105'
                : 'text-gray-600 active:bg-gray-200'
                }`}
            >
              Submit Song
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('submitted')
                loadMySubmissions()
              }}
              className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200 touch-manipulation ${activeTab === 'submitted'
                ? 'bg-white text-gray-900 shadow-md scale-105'
                : 'text-gray-600 active:bg-gray-200'
                }`}
            >
              Submitted Songs
            </button>
          </div>
        </div>

        <section className="flex flex-col gap-5 px-4 pb-6">
          {/* Status Messages */}
          {submitStatus === 'success' && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-5 flex items-start gap-4 shadow-lg animate-in slide-in-from-top-2">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-green-900 text-base mb-1">Song submitted successfully!</p>
                <p className="text-sm text-green-700 leading-relaxed">Your song is now under review by the admin.</p>
              </div>
            </div>
          )}

          {submitStatus === 'error' && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 rounded-2xl p-5 flex items-start gap-4 shadow-lg animate-in slide-in-from-top-2">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-red-900 text-base mb-1">Submission failed</p>
                <p className="text-sm text-red-700 leading-relaxed">Please check your connection and try again.</p>
              </div>
            </div>
          )}

          {/* Submitted Songs Tab Content */}
          {activeTab === 'submitted' && (
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4 shadow-sm">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: `${zoneColor}15` }}
                >
                  <Clock className="w-6 h-6" style={{ color: zoneColor }} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-gray-900 text-base">Submitted Songs</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {loadingSubmissions
                      ? 'Loading your submissions...'
                      : mySubmissions.length === 0
                        ? 'You have not submitted any songs yet.'
                        : `${mySubmissions.length} song${mySubmissions.length !== 1 ? 's' : ''} submitted`}
                  </p>
                </div>
              </div>

              {mySubmissions.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 shadow-sm overflow-hidden">
                  {mySubmissions.map((submission) => {
                    const isExpanded = expandedSubmissionId === submission.id

                    return (
                      <div key={submission.id} className="transition-colors">
                        {/* Collapsed Header - Always visible */}
                        <button
                          onClick={() => setExpandedSubmissionId(isExpanded ? null : submission.id!)}
                          className="w-full p-4 flex items-center justify-between gap-3 active:bg-gray-50 touch-manipulation"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${submission.status === 'pending'
                              ? 'bg-yellow-100'
                              : submission.status === 'approved'
                                ? 'bg-green-100'
                                : 'bg-red-100'
                              }`}>
                              {submission.status === 'pending' ? (
                                <Clock className={`w-5 h-5 text-yellow-600`} />
                              ) : submission.status === 'approved' ? (
                                <CheckCircle className={`w-5 h-5 text-green-600`} />
                              ) : (
                                <XCircle className={`w-5 h-5 text-red-600`} />
                              )}
                            </div>
                            <div className="text-left min-w-0 flex-1">
                              <h4 className="font-bold text-gray-900 text-sm truncate">{submission.title}</h4>
                              <p className="text-xs text-gray-500">
                                {submission.status.charAt(0).toUpperCase() + submission.status.slice(1)} • {new Date(submission.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Indicators */}
                            {submission.replyMessage && (
                              <span className="w-2 h-2 bg-purple-500 rounded-full" title="Has admin reply" />
                            )}
                            {(submission as any).userReply && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full" title="You replied" />
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400" />
                            )}
                          </div>
                        </button>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3">
                            {/* Show rejection reason if rejected */}
                            {submission.status === 'rejected' && submission.reviewNotes && (
                              <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-xl border border-red-200">
                                <div className="flex items-center gap-2 mb-1.5">
                                  <XCircle className="w-4 h-4 text-red-600" />
                                  <span className="text-xs font-bold text-red-800">Rejection Reason</span>
                                </div>
                                <p className="text-sm text-red-900 leading-relaxed">{submission.reviewNotes}</p>
                              </div>
                            )}

                            {/* Show approval message */}
                            {submission.status === 'approved' && (
                              <div className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="text-sm font-semibold text-green-800">
                                    Added to the collection!
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Chat-like Conversation */}
                            {((submission as any).conversation?.length > 0 || submission.replyMessage || (submission as any).userReply) && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs font-bold text-gray-600">Conversation</span>
                                </div>

                                {/* Show conversation array if exists */}
                                {(submission as any).conversation?.length > 0 ? (
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {(submission as any).conversation.map((msg: any) => (
                                      <div
                                        key={msg.id}
                                        className={`p-3 rounded-xl ${msg.sender === 'admin'
                                          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 ml-0 mr-8'
                                          : 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 ml-8 mr-0'
                                          }`}
                                      >
                                        <div className="flex items-center justify-between mb-1">
                                          <span className={`text-xs font-bold ${msg.sender === 'admin' ? 'text-purple-700' : 'text-blue-700'}`}>
                                            {msg.sender === 'admin' ? `Admin (${msg.senderName})` : 'You'}
                                          </span>
                                          <span className="text-[10px] text-gray-400">
                                            {new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                          </span>
                                        </div>
                                        <p className={`text-sm leading-relaxed ${msg.sender === 'admin' ? 'text-purple-900' : 'text-blue-900'}`}>
                                          {msg.message}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  /* Fallback to legacy fields if no conversation array */
                                  <div className="space-y-2">
                                    {submission.replyMessage && (
                                      <div className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 mr-8">
                                        <span className="text-xs font-bold text-purple-700">Admin</span>
                                        <p className="text-sm text-purple-900 leading-relaxed mt-1">{submission.replyMessage}</p>
                                      </div>
                                    )}
                                    {(submission as any).userReply && (
                                      <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 ml-8">
                                        <span className="text-xs font-bold text-blue-700">You</span>
                                        <p className="text-sm text-blue-900 leading-relaxed mt-1 whitespace-pre-wrap">{(submission as any).userReply}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2 pt-2">
                              {/* Edit button - for pending AND approved submissions */}
                              {(submission.status === 'pending' || submission.status === 'approved') && submission.id && (
                                <button
                                  onClick={() => handleEditSubmission(submission)}
                                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-colors touch-manipulation border"
                                  style={{
                                    color: zoneColor,
                                    borderColor: zoneColor,
                                    backgroundColor: `${zoneColor}10`
                                  }}
                                >
                                  <Edit2 className="w-4 h-4" />
                                  <span>Edit</span>
                                </button>
                              )}

                              {/* Reply button - always show for all statuses */}
                              {submission.id && (
                                <button
                                  onClick={() => handleOpenReply(submission)}
                                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-purple-600 active:bg-purple-50 rounded-xl transition-colors touch-manipulation border border-purple-200 bg-purple-50"
                                >
                                  <MessageSquare className="w-4 h-4" />
                                  <span>Reply</span>
                                </button>
                              )}

                              {/* Delete button - only for pending submissions */}
                              {submission.status === 'pending' && submission.id && (
                                <button
                                  onClick={() => handleDeleteSubmission(submission.id!)}
                                  disabled={deletingId === submission.id}
                                  className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-red-600 active:bg-red-50 rounded-xl transition-colors disabled:opacity-50 touch-manipulation border border-red-200"
                                >
                                  {deletingId === submission.id ? (
                                    <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4" />
                                      <span>Delete</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Submit Song Tab Content */}
          {activeTab === 'submit' && (
            <form onSubmit={editingSubmission ? handleUpdateSubmission : handleSubmit} className="flex flex-col gap-5">
              {/* Edit Mode Banner */}
              {editingSubmission && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit2 className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">Editing: {editingSubmission.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-sm font-medium text-amber-700 hover:text-amber-900"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {/* Song Title */}
              <div className="flex flex-col gap-2.5">
                <label className="text-gray-900 text-sm font-semibold leading-tight">
                  Song Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter the title of the song"
                  className={`w-full rounded-2xl text-gray-900 focus:outline-none focus:ring-4 border-2 ${zoneTheme.border} focus:${zoneTheme.focusBorder.replace('focus:', '')} bg-white h-14 placeholder:text-gray-400 px-5 text-base font-normal leading-normal shadow-sm transition-all duration-200 ${getFocusClasses()} touch-manipulation`}
                  required
                />
              </div>

              {/* Writer */}
              <div className="flex flex-col gap-2.5">
                <label className="text-gray-900 text-sm font-semibold leading-tight">Writer/Composer</label>
                <input
                  type="text"
                  value={formData.writer}
                  onChange={(e) => handleInputChange('writer', e.target.value)}
                  placeholder="Enter writer's name"
                  className={`w-full rounded-2xl text-gray-900 focus:outline-none focus:ring-4 border-2 ${zoneTheme.border} focus:${zoneTheme.focusBorder.replace('focus:', '')} bg-white h-14 placeholder:text-gray-400 px-5 text-base font-normal leading-normal shadow-sm transition-all duration-200 ${getFocusClasses()} touch-manipulation`}
                />
              </div>

              {/* Lead Singer */}
              <div className="flex flex-col gap-2.5">
                <label className="text-gray-900 text-sm font-semibold leading-tight">Lead Singer</label>
                <input
                  type="text"
                  value={formData.leadSinger}
                  onChange={(e) => handleInputChange('leadSinger', e.target.value)}
                  placeholder="Enter lead singer's name"
                  className={`w-full rounded-2xl text-gray-900 focus:outline-none focus:ring-4 border-2 ${zoneTheme.border} focus:${zoneTheme.focusBorder.replace('focus:', '')} bg-white h-14 placeholder:text-gray-400 px-5 text-base font-normal leading-normal shadow-sm transition-all duration-200 ${getFocusClasses()} touch-manipulation`}
                />
              </div>

              {/* Lyrics */}
              <div className="flex flex-col gap-2.5">
                <label className="text-gray-900 text-sm font-semibold leading-tight">
                  Lyrics <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.lyrics}
                  onChange={(e) => handleInputChange('lyrics', e.target.value)}
                  placeholder="Enter the song lyrics..."
                  rows={8}
                  className={`w-full rounded-2xl text-gray-900 focus:outline-none focus:ring-4 border-2 ${zoneTheme.border} focus:${zoneTheme.focusBorder.replace('focus:', '')} bg-white min-h-[180px] placeholder:text-gray-400 p-5 text-base font-normal leading-relaxed shadow-sm transition-all duration-200 resize-y ${getFocusClasses()} touch-manipulation`}
                  required
                />
              </div>

              {/* Key */}
              <div className="flex flex-col gap-2.5">
                <label className="text-gray-900 text-sm font-semibold leading-tight">Key</label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => handleInputChange('key', e.target.value)}
                  placeholder="e.g., C Major, D Minor"
                  className={`w-full rounded-2xl text-gray-900 focus:outline-none focus:ring-4 border-2 ${zoneTheme.border} focus:${zoneTheme.focusBorder.replace('focus:', '')} bg-white h-14 placeholder:text-gray-400 px-5 text-base font-normal leading-normal shadow-sm transition-all duration-200 ${getFocusClasses()} touch-manipulation`}
                />
              </div>

              {/* Audio Upload */}
              <div className="flex flex-col gap-2.5">
                <label className="text-gray-900 text-sm font-semibold leading-tight">Audio File (Optional)</label>

                {!formData.audioUrl && !formData.audioFile && (
                  <label className={`flex flex-col items-center justify-center w-full h-36 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-200 active:scale-[0.98] ${zoneTheme.border} bg-gradient-to-br from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 shadow-sm touch-manipulation`}>
                    <div className="flex flex-col items-center justify-center pt-6 pb-6 px-4">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ backgroundColor: `${zoneColor}15` }}>
                        <Music className="w-7 h-7" style={{ color: zoneColor }} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mb-1 text-center">
                        <span style={{ color: zoneColor }}>Tap to upload</span> audio file
                      </p>
                      <p className="text-xs text-gray-500 text-center">MP3, WAV, M4A • Max 50MB</p>
                    </div>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioChange}
                      className="hidden"
                      disabled={uploadingAudio}
                    />
                  </label>
                )}

                {uploadingAudio && (
                  <div className="flex flex-col items-center justify-center w-full h-36 border-2 rounded-2xl bg-gradient-to-br from-gray-50 to-white border-gray-200 shadow-sm">
                    <div className="w-10 h-10 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mb-3" style={{ borderTopColor: zoneColor }} />
                    <p className="text-sm font-medium text-gray-700 mb-1">Uploading audio...</p>
                    {audioUploadProgress > 0 && (
                      <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${audioUploadProgress}%`,
                            backgroundColor: zoneColor
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {formData.audioUrl && (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl shadow-sm">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-green-900 mb-0.5">Audio uploaded successfully</p>
                      <p className="text-xs text-green-700 truncate">Ready to submit</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAudio}
                      className="flex-shrink-0 p-2.5 active:bg-green-100 rounded-xl transition-colors touch-manipulation"
                    >
                      <X className="w-5 h-5 text-green-600" />
                    </button>
                  </div>
                )}

                {formData.audioFile && !formData.audioUrl && !uploadingAudio && (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl shadow-sm">
                    <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Clock className="w-7 h-7 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-yellow-900 truncate mb-0.5">{formData.audioFile.name}</p>
                      <p className="text-xs text-yellow-700">Ready to upload</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveAudio}
                      className="flex-shrink-0 p-2.5 active:bg-yellow-100 rounded-xl transition-colors touch-manipulation"
                    >
                      <X className="w-5 h-5 text-yellow-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              <div className="flex flex-col gap-2.5">
                <label className="text-gray-900 text-sm font-semibold leading-tight">Additional Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Any other details or instructions..."
                  rows={5}
                  className={`w-full rounded-2xl text-gray-900 focus:outline-none focus:ring-4 border-2 ${zoneTheme.border} focus:${zoneTheme.focusBorder.replace('focus:', '')} bg-white min-h-[120px] placeholder:text-gray-400 p-5 text-base font-normal leading-relaxed shadow-sm transition-all duration-200 resize-y ${getFocusClasses()} touch-manipulation`}
                />
              </div>
            </form>
          )}
        </section>
      </main>

      {/* Fixed Footer with Submit Button */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          type="submit"
          onClick={editingSubmission ? handleUpdateSubmission : handleSubmit}
          disabled={isSubmitting || !formData.title.trim() || !formData.lyrics.trim()}
          className="flex w-full items-center justify-center rounded-2xl h-14 px-6 text-base font-bold text-white shadow-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 touch-manipulation"
          style={{
            backgroundColor: zoneColor,
            boxShadow: `0 8px 24px ${zoneColor}40`,
          }}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3" />
              <span>{editingSubmission ? 'Updating...' : 'Submitting...'}</span>
            </>
          ) : editingSubmission ? (
            <>
              <Edit2 className="w-5 h-5 mr-2.5" />
              <span>Update Song</span>
            </>
          ) : (
            <>
              <Upload className="w-5 h-5 mr-2.5" />
              <span>Submit Song</span>
            </>
          )}
        </button>
      </footer>

      {/* User Reply Modal */}
      {showReplyModal && replyingTo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Conversation</h2>
                <button
                  onClick={() => { setShowReplyModal(false); setReplyingTo(null); setUserReplyMessage(''); }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">Re: {replyingTo.title}</p>
            </div>

            {/* Conversation History */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 max-h-60">
              {(replyingTo as any).conversation?.length > 0 ? (
                (replyingTo as any).conversation.map((msg: any) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl ${msg.sender === 'admin'
                      ? 'bg-purple-50 border border-purple-200 mr-6'
                      : 'bg-blue-50 border border-blue-200 ml-6'
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${msg.sender === 'admin' ? 'text-purple-700' : 'text-blue-700'}`}>
                        {msg.sender === 'admin' ? 'Admin' : 'You'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(msg.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-sm ${msg.sender === 'admin' ? 'text-purple-900' : 'text-blue-900'}`}>
                      {msg.message}
                    </p>
                  </div>
                ))
              ) : (
                /* Fallback to legacy fields */
                <>
                  {replyingTo.replyMessage && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 mr-6">
                      <span className="text-xs font-bold text-purple-700">Admin</span>
                      <p className="text-sm text-purple-900 mt-1">{replyingTo.replyMessage}</p>
                    </div>
                  )}
                  {(replyingTo as any).userReply && (
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 ml-6">
                      <span className="text-xs font-bold text-blue-700">You</span>
                      <p className="text-sm text-blue-900 mt-1 whitespace-pre-wrap">{(replyingTo as any).userReply}</p>
                    </div>
                  )}
                </>
              )}

              {/* Show message if no conversation yet */}
              {!(replyingTo as any).conversation?.length && !replyingTo.replyMessage && !(replyingTo as any).userReply && (
                <p className="text-sm text-gray-400 text-center py-4">No messages yet. Start the conversation!</p>
              )}
            </div>

            {/* Reply Input */}
            <div className="p-5 border-t border-gray-100 flex-shrink-0">
              <textarea
                value={userReplyMessage}
                onChange={(e) => setUserReplyMessage(e.target.value)}
                placeholder="Type your message..."
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-base"
                autoFocus
              />
            </div>

            <div className="p-5 pt-0 flex gap-3">
              <button
                onClick={() => { setShowReplyModal(false); setReplyingTo(null); setUserReplyMessage(''); }}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendUserReply}
                disabled={!userReplyMessage.trim() || sendingReply}
                className="flex-1 px-4 py-3 text-white rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: zoneColor }}
              >
                {sendingReply ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
