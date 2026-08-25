"use client";

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft, User, Users, Calendar, CheckCircle, Check, Award, Edit, Camera, 
  X, Loader2, AlertTriangle, Trash2, ChevronDown, MapPin, Phone, Mail, 
  Shield, Briefcase, Music, LogOut, AlertCircle, Sparkles, Crown, Scan, Clock,
  RefreshCw
} from 'lucide-react'

import { ScreenHeader } from '@/components/ScreenHeader'
import { ProfileSaveButton } from '@/components/ProfileSaveButton'
import { useAuth } from '@/stores/authStore'
import { useZone } from '@/stores/zoneStore'
import { apiClient } from '@/lib/api-client'
import { uploadProfileImage, deleteProfileImage, validateImageFile } from '@/utils/imageUpload'

import { isHQGroup } from '@/config/zones'
import { useSubscription } from '@/contexts/SubscriptionContext'
import QRCode from 'qrcode'
import RequestSubGroupForm from '@/components/profile/RequestSubGroupForm'

// Helper function to adjust color brightness for gradient
const adjustColor = (color: string, amount: number) => {
  const hex = (color || '#9333ea').replace('#', '')
  const num = parseInt(hex, 16)
  const r = Math.max(0, Math.min(255, (num >> 16) + amount))
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount))
  const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

function ProfilePage() {
  const router = useRouter()
  const { user, signOut, profile: currentProfile, refreshProfile, isLoading } = useAuth()
  const { userZones, currentZone, isSuperAdmin, isZoneCoordinator, switchZone, refreshZones } = useZone()
  const { isPremiumTier, isIndividualPremium, subscription, isExpiringSoon, daysRemaining } = useSubscription()
  const searchParams = useSearchParams()
  const activeTab = searchParams?.get('tab')

  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    username: '',
    firstName: '',
    lastName: '',
    middleName: '',
    phoneNumber: '',
    gender: '',
    birthday: '',
    region: '',
    zone: '',
    church: '',
    designation: '',
    administration: ''
  })

  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [saveProgress, setSaveProgress] = useState(0)
  const [saveStage, setSaveStage] = useState('')
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    account: false,
    personal: true,
    location: false,
    ministry: false,
    zones: false,
    subgroups: false,
    attendance: false
  })

  // Handle tab from URL
  useEffect(() => {
    if (activeTab === 'subgroups') {
      setExpandedSections(prev => ({ ...prev, subgroups: true }))
      const timer = setTimeout(() => {
        const el = document.getElementById('subgroups-section')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [activeTab])
  
  // Attendance state
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([])
  const [attendanceStats, setAttendanceStats] = useState({ total: 0, present: 0, late: 0, absent: 0, rate: 0 })
  const [loadingAttendance, setLoadingAttendance] = useState(true)

  // Dialog and action states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [isLinkingKingsChat, setIsLinkingKingsChat] = useState(false)
  const [linkingMessage, setLinkingMessage] = useState('')
  const [isLeavingZone, setIsLeavingZone] = useState(false)
  const [showLeaveZoneDialog, setShowLeaveZoneDialog] = useState(false)
  const [zoneToLeave, setZoneToLeave] = useState<{ id: string; name: string } | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ progress: number; stage: string; message: string }>({ progress: 0, stage: '', message: '' })
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  // QR Code State (matches rehearsalhubv2 5-second dynamic rotation)
  const [qrCodeToken, setQrCodeToken] = useState<string>('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')
  const [qrTimeLeft, setQrTimeLeft] = useState<number>(5)

  // Fetch full profile and attendance on mount
  useEffect(() => {
    refreshProfile().catch(() => {})
  }, [refreshProfile])

  const loadAttendance = useCallback(async () => {
    if (!user?.id) return
    setLoadingAttendance(true)
    try {
      const res = await apiClient.get<{ success: boolean; data: any[] }>('/attendance/mine').catch(() => null)
      const records = res?.data || []
      const total = Math.max(records.length, 1)
      const present = records.filter((r: any) => r.status === 'present' || r.status === 'checked-in').length
      const late = records.filter((r: any) => r.status === 'late').length
      const absent = records.filter((r: any) => r.status === 'absent').length
      setAttendanceStats({
        total: records.length,
        present,
        late,
        absent,
        rate: Math.round((present / total) * 100)
      })
      setAttendanceHistory(records)
    } catch (e) {
      console.error('Failed to load attendance:', e)
    } finally {
      setLoadingAttendance(false)
    }
  }, [user?.id])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  // Generate dynamic attendance QR code rotated every 5 seconds (exact parity with rehearsalhubv2)
  useEffect(() => {
    if (!user?.id) return

    const generateQR = async () => {
      try {
        const timestamp = Math.floor(Date.now() / 1000)
        const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase()
        const token = `LW-ATTEND-${user.id}-${timestamp}-${randomCode}`
        setQrCodeToken(token)
        const dataUrl = await QRCode.toDataURL(token, {
          width: 300,
          margin: 2,
          color: {
            dark: currentZone?.themeColor || '#4c1d95',
            light: '#ffffff'
          }
        })
        setQrCodeDataUrl(dataUrl)
        setQrTimeLeft(5)
      } catch (err) {
        console.error('Failed to generate QR:', err)
      }
    }

    generateQR()
    const tokenInterval = setInterval(generateQR, 5000)
    const countdownInterval = setInterval(() => {
      setQrTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => {
      clearInterval(tokenInterval)
      clearInterval(countdownInterval)
    }
  }, [user?.id, currentZone?.themeColor])

  // Initialize edit form from structured profile payload
  useEffect(() => {
    if (currentProfile) {
      setEditForm({
        username: currentProfile.username || (currentProfile as any).user_name || (currentProfile as any).alias || '',
        firstName: currentProfile.firstName || currentProfile.first_name || '',
        lastName: currentProfile.lastName || currentProfile.last_name || '',
        middleName: currentProfile.middleName || (currentProfile as any).middle_name || '',
        phoneNumber: currentProfile.phoneNumber || (currentProfile as any).phone_number || '',
        gender: currentProfile.gender || '',
        birthday: currentProfile.birthday || '',
        region: currentProfile.region || '',
        zone: currentProfile.zoneCode || (currentProfile as any).zone || '',
        church: currentProfile.church || '',
        designation: currentProfile.designation || '',
        administration: currentProfile.administration || ''
      })
      const avatarUrl = currentProfile.avatar || currentProfile.profile_image_url || (currentProfile as any).avatar_url
      if (avatarUrl) {
        setProfileImage(avatarUrl)
      }
    }
  }, [currentProfile])

  // Helper function for input styling
  const getInputClassName = () => {
    return "w-full mt-1 px-3 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:border-transparent transition-all duration-200 outline-none"
  }

  const getInputStyle = () => ({
    '--tw-ring-color': currentZone?.themeColor || '#9333ea',
  } as React.CSSProperties)

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = currentZone?.themeColor || '#9333ea'
    e.target.style.boxShadow = `0 0 0 2px ${currentZone?.themeColor || '#9333ea'}33`
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.target.style.borderColor = '#d1d5db'
    e.target.style.boxShadow = 'none'
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleInputChange = (field: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validation = validateImageFile(file)
    if (!validation.valid) {
      alert(validation.error)
      return
    }

    if (!user?.id) {
      alert('User not authenticated')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setProfileImage(previewUrl)
    setIsUploadingImage(true)

    try {
      const result = await uploadProfileImage(file, user.id)

      if (result.success && result.url) {
        await apiClient.patch(`/profiles/${user.id}`, {
          profile_image_url: result.url
        })
        URL.revokeObjectURL(previewUrl)
        setProfileImage(result.url)
        await refreshProfile()
      } else {
        URL.revokeObjectURL(previewUrl)
        setProfileImage(currentProfile?.avatar || null)
        alert(result.error || 'Failed to upload image')
      }
    } catch (error) {
      URL.revokeObjectURL(previewUrl)
      setProfileImage(currentProfile?.avatar || null)
      alert(`Error uploading image: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsUploadingImage(false)
      setUploadProgress({ stage: '', progress: 0, message: '' })
    }
  }

  // Handle save profile to rehearsalhub-api
  const handleSaveProfile = async () => {
    if (!user?.id) {
      setSaveMessage('User not authenticated')
      return
    }

    setIsSaving(true)
    setSaveProgress(10)
    setSaveStage('Validating...')
    setSaveMessage('')

    try {
      if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
        setSaveMessage('First and Last name are required')
        setIsSaving(false)
        return
      }

      setSaveProgress(40)
      setSaveStage('Saving to cloud...')

      const updates: Record<string, any> = {
        username: editForm.username.trim().toLowerCase().replace(/^@/, ''),
        alias: editForm.username.trim().toLowerCase().replace(/^@/, ''),
        first_name: editForm.firstName.trim(),
        last_name: editForm.lastName.trim(),
        middle_name: editForm.middleName.trim(),
        phone_number: editForm.phoneNumber.trim(),
        gender: editForm.gender.trim(),
        birthday: editForm.birthday.trim(),
        region: editForm.region.trim(),
        zone_code: editForm.zone.trim(),
        church: editForm.church.trim(),
        designation: editForm.designation.trim(),
        administration: editForm.administration.trim(),
      }

      const res = await apiClient.patch<{ success: boolean; message?: string }>(`/profiles/${user.id}`, updates)

      if (res && res.success !== false) {
        setSaveProgress(90)
        setSaveStage('Updating local cache...')
        await refreshProfile()
        setSaveProgress(100)
        setSaveStage('Complete!')
        setSaveMessage('Profile updated successfully ✓')
        setIsEditing(false)
        setTimeout(() => {
          setSaveMessage('')
          setSaveProgress(0)
          setSaveStage('')
        }, 3000)
      } else {
        throw new Error(res?.message || 'Update failed')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      setSaveMessage(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setTimeout(() => {
        setSaveMessage('')
        setSaveProgress(0)
        setSaveStage('')
      }, 4000)
    } finally {
      setIsSaving(false)
    }
  }

  // Leave zone handler
  const handleLeaveZone = async () => {
    if (!zoneToLeave || !user?.id) return
    setIsLeavingZone(true)
    try {
      const isHq = isHQGroup(zoneToLeave.id)
      await apiClient.post('/members/zone-leave', {
        zone_id: zoneToLeave.id,
        is_hq: isHq
      })
      await refreshZones()
      setShowLeaveZoneDialog(false)
      setZoneToLeave(null)
      alert(`You have left ${zoneToLeave.name}.`)
      window.location.reload()
    } catch (err: any) {
      console.error('Failed to leave zone:', err)
      alert(`Failed to leave zone: ${err?.message || 'Please try again.'}`)
    } finally {
      setIsLeavingZone(false)
    }
  }

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      alert('Please type "DELETE" to confirm account deletion')
      return
    }

    setIsDeleting(true)
    try {
      await signOut()
      router.push('/auth')
    } catch (error) {
      console.error('Account deletion error:', error)
      alert('Failed to delete account. Please try again.')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
      setDeleteConfirmation('')
    }
  }

  // Normalized Profile Data for Presentation
  const fullName = currentProfile?.fullName || 
    `${currentProfile?.firstName || ''} ${currentProfile?.lastName || ''}`.trim() || 
    user?.email?.split('@')[0] || 
    'User'

  const displayEmail = currentProfile?.kingschatId 
    ? (currentProfile.email || 'KingsChat Account') 
    : (currentProfile?.email || user?.email || 'No email provided')

  const roleBadge = currentProfile?.administration || currentProfile?.role || 'Member'

  return (
    <div className="h-screen bg-white overflow-hidden flex flex-col">
      {/* Animated Screen Header */}
      <ScreenHeader
        title="Profile"
        showMenuButton={false}
        showBackButton={true}
        backPath="/home"
        rightImageSrc="/logo.png"
      />

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 pb-24">
        
        {/* Edit Mode Banner */}
        {isEditing && (
          <div className="mx-4 mt-4 mb-2">
            <div
              className="bg-white border-l-4 rounded-xl shadow-sm p-4 flex items-center justify-between"
              style={{ borderLeftColor: currentZone?.themeColor || '#9333ea' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${currentZone?.themeColor || '#9333ea'}20` }}
                >
                  <Edit className="w-5 h-5" style={{ color: currentZone?.themeColor || '#9333ea' }} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Edit Mode Active</h3>
                  <p className="text-xs text-gray-500">Update your ministry and contact details below</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full animate-ping"
                  style={{ backgroundColor: currentZone?.themeColor || '#9333ea' }}
                />
                <span className="text-xs font-black uppercase tracking-wider" style={{ color: currentZone?.themeColor || '#9333ea' }}>
                  Editing
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Profile Hero Header */}
        <div
          className="relative px-4 pt-6 pb-8 overflow-hidden shadow-sm"
          style={{
            background: currentZone?.themeColor
              ? `linear-gradient(135deg, ${currentZone.themeColor} 0%, ${adjustColor(currentZone.themeColor, -25)} 60%, ${adjustColor(currentZone.themeColor, 25)} 100%)`
              : 'linear-gradient(135deg, #9333ea 0%, #7e22ce 60%, #3b82f6 100%)'
          }}
        >
          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32 blur-2xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24 blur-2xl"></div>
          </div>

          <div className="relative z-10 w-full flex flex-col items-center">
            {/* Profile Avatar */}
            <div className="relative mb-4">
              <div className="w-28 h-28 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center mx-auto overflow-hidden ring-4 ring-white/40 shadow-2xl">
                {profileImage ? (
                  <>
                    <img
                      src={profileImage}
                      alt={fullName}
                      className="w-full h-full object-cover"
                    />
                    {isEditing && (
                      <button
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete your profile image?')) {
                            try {
                              const success = await deleteProfileImage(profileImage)
                              if (success && user?.id) {
                                await apiClient.patch(`/profiles/${user.id}`, { profile_image_url: '' })
                                setProfileImage(null)
                                await refreshProfile()
                              }
                            } catch (err) {
                              console.error('Error deleting image:', err)
                            }
                          }
                        }}
                        className="absolute top-1 right-1 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg"
                        title="Delete image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </>
                ) : (
                  <User className="w-14 h-14 text-white" />
                )}
              </div>

              {/* Edit Avatar Button */}
              <button
                onClick={() => {
                  const newEditingState = !isEditing
                  setIsEditing(newEditingState)
                  setSaveMessage('')
                  if (newEditingState) {
                    setExpandedSections(prev => ({
                      ...prev,
                      personal: true,
                      location: true,
                      ministry: true
                    }))
                  }
                }}
                className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all text-gray-900"
                style={{ color: currentZone?.themeColor || '#9333ea' }}
                aria-label="Edit Profile"
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>

            {/* User Info */}
            <h2 className="text-2xl font-black text-white mb-0.5 tracking-tight drop-shadow-md text-center">
              {fullName}
            </h2>
            {(currentProfile?.username || (currentProfile as any)?.user_name) && (
              <div className="flex justify-center mb-1.5">
                <span className="text-[11px] font-black text-white/95 bg-white/20 px-2.5 py-0.5 rounded-full backdrop-blur-xs border border-white/25 shadow-xs">
                  @{currentProfile?.username || (currentProfile as any)?.user_name}
                </span>
              </div>
            )}
            <p className="text-xs text-white/90 mb-4 font-medium drop-shadow-sm text-center">
              {displayEmail}
            </p>

            {/* Badges */}
            <div className="flex items-center justify-center gap-2 flex-wrap px-4">
              <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-black uppercase tracking-wider border border-white/30 shadow-md">
                {roleBadge}
              </span>
              {currentProfile?.designation && (
                <span className="text-[10px] bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-white/30 shadow-md">
                  {currentProfile.designation}
                </span>
              )}
              {isPremiumTier && (
                <span className="text-[10px] bg-white text-gray-900 px-3 py-1 rounded-full font-black uppercase tracking-widest shadow-xl flex items-center gap-1">
                  <Crown className="w-3 h-3 text-yellow-500" />
                  PREMIUM
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subscription Status Banner (If expiring soon) */}
        {isExpiringSoon && (
          <div className="mx-4 mt-3">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 text-amber-600">
                <AlertCircle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-black text-amber-900 leading-tight">Subscription Expiring Soon</p>
                <p className="text-[10px] text-amber-700 font-medium">Your premium access ends in {daysRemaining} days. Renew now.</p>
              </div>
              <button
                onClick={() => router.push('/subscription')}
                className="px-3.5 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-md active:scale-95 transition-all"
              >
                Renew
              </button>
            </div>
          </div>
        )}

        {/* Subscription Tier Section */}
        <div className="px-4 mt-3">
          <div className={`bg-white rounded-2xl shadow-sm overflow-hidden border p-4 transition-all ${isPremiumTier ? 'border-yellow-200 bg-gradient-to-r from-white via-amber-50/20 to-white' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${isPremiumTier ? 'bg-gradient-to-br from-yellow-400 to-amber-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-tight">Account Status</h3>
                  <p className={`text-[10px] font-bold ${isPremiumTier ? 'text-amber-600' : 'text-gray-500'}`}>
                    {isPremiumTier ? 'PREMIUM ACCESS' : 'STANDARD ACCOUNT'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push('/subscription')}
                className="px-4 py-2 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-md flex items-center gap-1.5"
                style={{
                  backgroundColor: isPremiumTier ? '#111827' : (currentZone?.themeColor || '#9333ea'),
                }}
              >
                {isIndividualPremium && isExpiringSoon ? 'RENEW' : isPremiumTier ? 'MANAGE' : 'UPGRADE'}
              </button>
            </div>
          </div>
        </div>

        {/* My Zones Section */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <button
              onClick={() => toggleSection('zones')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-gray-900">
                    {isSuperAdmin || currentProfile?.role === 'hq_admin' || currentProfile?.hasHqAccess ? 'Zonal & HQ Access' : 'My Zones & Groups'}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    {isSuperAdmin || currentProfile?.role === 'hq_admin' || currentProfile?.hasHqAccess 
                      ? 'HQ Global Admin' 
                      : `${userZones.length} Membership${userZones.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!(isSuperAdmin || currentProfile?.role === 'hq_admin' || currentProfile?.hasHqAccess) && (
                  <Link
                    href="/pages/join-zone"
                    onClick={(e) => e.stopPropagation()}
                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    + JOIN
                  </Link>
                )}
                <ChevronDown className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${expandedSections.zones ? 'rotate-180' : ''}`} />
              </div>
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${expandedSections.zones ? 'max-h-[2000px]' : 'max-h-0'}`}>
              <div className="px-4 pb-4 space-y-2">
                {isSuperAdmin || currentProfile?.role === 'hq_admin' || currentProfile?.hasHqAccess ? (
                  <div className="space-y-3">
                    <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-xl p-3.5 border border-purple-100 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-md">
                          <Crown className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-black text-purple-900 block">Global HQ Access Active</span>
                          <p className="text-[10px] text-purple-700 font-medium">You have oversight of all 20+ zones across the ministry.</p>
                        </div>
                      </div>
                      <Link
                        href="/admin"
                        className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
                      >
                        Admin Portal →
                      </Link>
                    </div>

                    {currentZone && (
                      <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black shadow-sm"
                            style={{ backgroundColor: currentZone.themeColor || '#9333ea' }}
                          >
                            {currentZone.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-900">Current Scope: {currentZone.name}</p>
                            <p className="text-[10px] text-gray-500 uppercase">{currentZone.region || 'HQ Assigned'}</p>
                          </div>
                        </div>
                        <span className="text-[9px] bg-gray-900 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-tighter flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          PRIMARY
                        </span>
                      </div>
                    )}
                  </div>
                ) : userZones.length > 0 ? (
                  userZones.map((zone) => {
                    const isActive = currentZone?.id === zone.id
                    return (
                      <div
                        key={zone.id}
                        className={`p-3 rounded-xl border transition-all ${
                          isActive
                            ? 'border-gray-300 bg-gray-50 ring-1 ring-gray-200'
                            : 'border-gray-100 bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black shadow-sm flex-shrink-0"
                            style={{ backgroundColor: zone.themeColor || '#9333ea' }}
                          >
                            {zone.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-900 truncate">{zone.name}</p>
                            <p className="text-[10px] text-gray-500 font-medium uppercase">{zone.region || 'ZONAL REGION'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {isActive ? (
                              <span className="text-[9px] bg-gray-900 text-white px-2.5 py-1 rounded-full font-black uppercase tracking-tighter flex items-center gap-1">
                                <Check className="w-2.5 h-2.5" />
                                ACTIVE
                              </span>
                            ) : (
                              <button
                                onClick={async () => {
                                  const success = await switchZone(zone.id)
                                  if (success) {
                                    setTimeout(() => window.location.reload(), 300)
                                  }
                                }}
                                className="text-[9px] font-black uppercase tracking-tighter px-3 py-1 rounded-full border transition-all active:scale-95"
                                style={{
                                  color: zone.themeColor || '#9333ea',
                                  borderColor: (zone.themeColor || '#9333ea') + '40',
                                  backgroundColor: (zone.themeColor || '#9333ea') + '08'
                                }}
                              >
                                Switch
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setZoneToLeave({ id: zone.id, name: zone.name })
                                setShowLeaveZoneDialog(true)
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors p-1"
                              title={`Leave ${zone.name}`}
                            >
                              <LogOut className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-gray-500 font-medium">No zones joined yet</p>
                    <Link
                      href="/pages/join-zone"
                      className="inline-flex items-center gap-2 mt-2 px-4 py-2 text-xs font-bold text-white rounded-xl shadow-md"
                      style={{ backgroundColor: currentZone?.themeColor || '#9333ea' }}
                    >
                      <Users className="w-3.5 h-3.5" />
                      Join a Zone
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <button
              onClick={() => toggleSection('personal')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-gray-900">Personal Information</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
                    {isEditing ? 'Editing Profile Details' : 'Name & Contact Details'}
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${expandedSections.personal ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${expandedSections.personal ? 'max-h-[2000px]' : 'max-h-0'}`}>
              <div className="px-4 pb-4 pt-1">
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Image Picker */}
                    <div className="pb-3 border-b border-gray-100 flex items-center gap-3">
                      <div className="w-14 h-14 bg-purple-100 rounded-full overflow-hidden border border-purple-200 flex-shrink-0 flex items-center justify-center">
                        {profileImage ? (
                          <img src={profileImage} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-7 h-7 text-purple-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={isUploadingImage}
                          className="hidden"
                          id="profile-image-upload"
                        />
                        <label
                          htmlFor="profile-image-upload"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-white rounded-lg cursor-pointer font-bold shadow-sm"
                          style={{ backgroundColor: currentZone?.themeColor || '#9333ea' }}
                        >
                          <Camera className="w-3.5 h-3.5" />
                          {isUploadingImage ? 'Uploading...' : 'Change Photo'}
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1">JPG, PNG or WebP</p>
                      </div>
                    </div>

                    {/* Username Input Field */}
                    <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3">
                      <label className="text-[11px] font-bold text-gray-700 flex items-center justify-between">
                        <span>Username / Handle</span>
                        <span className="text-[10px] text-purple-600 font-bold">Login & Chat Alias</span>
                      </label>
                      <div className="relative mt-1">
                        <span className="absolute inset-y-0 left-3 flex items-center text-gray-400 font-black text-sm select-none">
                          @
                        </span>
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                          className={`${getInputClassName()} pl-8 font-semibold text-gray-800 bg-white`}
                          style={getInputStyle()}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                          placeholder="your_username"
                          maxLength={30}
                        />
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">
                        Choose a unique handle. You can use it to log into the app and search users in chats.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700">First Name *</label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => handleInputChange('firstName', e.target.value)}
                          className={getInputClassName()}
                          style={getInputStyle()}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                          placeholder="First Name"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-700">Middle Name</label>
                        <input
                          type="text"
                          value={editForm.middleName}
                          onChange={(e) => handleInputChange('middleName', e.target.value)}
                          className={getInputClassName()}
                          style={getInputStyle()}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                          placeholder="Middle Name"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700">Last Name *</label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        className={getInputClassName()}
                        style={getInputStyle()}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="Last Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-gray-700">Gender</label>
                        <select
                          value={editForm.gender}
                          onChange={(e) => handleInputChange('gender', e.target.value)}
                          className={getInputClassName()}
                          style={getInputStyle()}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[11px] font-bold text-gray-700">Birthday</label>
                        <input
                          type="date"
                          value={editForm.birthday}
                          onChange={(e) => handleInputChange('birthday', e.target.value)}
                          className={getInputClassName()}
                          style={getInputStyle()}
                          onFocus={handleInputFocus}
                          onBlur={handleInputBlur}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        value={editForm.phoneNumber}
                        onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        className={getInputClassName()}
                        style={getInputStyle()}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="+234..."
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="bg-purple-50/50 rounded-xl p-2.5 border border-purple-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-purple-700 font-bold uppercase">Username / Handle</span>
                        <p className="text-xs font-bold text-gray-900 mt-0.5">
                          {currentProfile?.username || (currentProfile as any)?.user_name ? `@${currentProfile?.username || (currentProfile as any)?.user_name}` : 'Not set (Click edit to add)'}
                        </p>
                      </div>
                      {!(currentProfile?.username || (currentProfile as any)?.user_name) && (
                        <button
                          onClick={() => {
                            setIsEditing(true)
                            setExpandedSections(prev => ({ ...prev, personal: true }))
                          }}
                          className="text-[10px] font-bold text-purple-600 hover:underline"
                        >
                          + Add
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">First Name</span>
                        <p className="text-xs font-bold text-gray-900 mt-0.5">{currentProfile?.firstName || currentProfile?.first_name || '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Middle Name</span>
                        <p className="text-xs font-bold text-gray-900 mt-0.5">{currentProfile?.middleName || (currentProfile as any)?.middle_name || '—'}</p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Last Name</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{currentProfile?.lastName || currentProfile?.last_name || '—'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Gender</span>
                        <p className="text-xs font-bold text-gray-900 mt-0.5">{currentProfile?.gender || '—'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Birthday</span>
                        <p className="text-xs font-bold text-gray-900 mt-0.5">
                          {currentProfile?.birthday ? new Date(currentProfile.birthday).toLocaleDateString() : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Phone Number
                      </span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{currentProfile?.phoneNumber || (currentProfile as any)?.phone_number || '—'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <button
              onClick={() => toggleSection('location')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-gray-900">Ministry Location</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Region & Church</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${expandedSections.location ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${expandedSections.location ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-4 pb-4 pt-1 space-y-2">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700">Region</label>
                      <input
                        type="text"
                        value={editForm.region}
                        onChange={(e) => handleInputChange('region', e.target.value)}
                        className={getInputClassName()}
                        style={getInputStyle()}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="e.g. Lagos Zone 1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-gray-700">Church</label>
                      <input
                        type="text"
                        value={editForm.church}
                        onChange={(e) => handleInputChange('church', e.target.value)}
                        className={getInputClassName()}
                        style={getInputStyle()}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                        placeholder="e.g. Central Church"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Region</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{currentProfile?.region || '—'}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Church</span>
                      <p className="text-xs font-bold text-gray-900 mt-0.5">{currentProfile?.church || '—'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Designation & Role */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <button
              onClick={() => toggleSection('ministry')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-gray-900">Designation & Administration</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">Vocal Part & Responsibilities</p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${expandedSections.ministry ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${expandedSections.ministry ? 'max-h-96' : 'max-h-0'}`}>
              <div className="px-4 pb-4 pt-1 space-y-2">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-gray-700">Vocal Designation</label>
                      <select
                        value={editForm.designation}
                        onChange={(e) => handleInputChange('designation', e.target.value)}
                        className={getInputClassName()}
                        style={getInputStyle()}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      >
                        <option value="">Select Vocal Designation</option>
                        <option value="Soprano">Soprano</option>
                        <option value="Alto">Alto</option>
                        <option value="Tenor">Tenor</option>
                        <option value="Bass">Bass</option>
                        <option value="Instrumentalist">Instrumentalist</option>
                        <option value="Backup Singer">Backup Singer</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-gray-700">Administration Title</label>
                      <select
                        value={editForm.administration}
                        onChange={(e) => handleInputChange('administration', e.target.value)}
                        className={getInputClassName()}
                        style={getInputStyle()}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      >
                        <option value="">Select Administration Role</option>
                        <option value="Coordinator">Coordinator</option>
                        <option value="Assistant Coordinator">Assistant Coordinator</option>
                        <option value="Admin">Admin</option>
                        <option value="Treasurer">Treasurer</option>
                        <option value="Member">Member</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-purple-50/50 rounded-xl p-3 border border-purple-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-purple-700 font-bold uppercase">Vocal Designation</span>
                        <p className="text-xs font-black text-purple-900 mt-0.5">{currentProfile?.designation || 'Not specified'}</p>
                      </div>
                      <Music className="w-5 h-5 text-purple-500" />
                    </div>

                    <div className="bg-blue-50/50 rounded-xl p-3 border border-blue-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-blue-700 font-bold uppercase">Administration Role</span>
                        <p className="text-xs font-black text-blue-900 mt-0.5">{currentProfile?.administration || 'Member'}</p>
                      </div>
                      <Award className="w-5 h-5 text-blue-500" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subgroups Request Form Section */}
        <div id="subgroups-section" className="px-4 mt-3">
          <RequestSubGroupForm />
        </div>

        {/* Live Attendance Scan QR Code (Matches rehearsalhubv2) */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900">Live Attendance QR</h3>
                <p className="text-[10px] text-gray-500 font-medium">Scan to check in for rehearsals & services</p>
              </div>
              <div className="w-9 h-9 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <Scan className="w-4 h-4 text-purple-600" />
              </div>
            </div>

            <div className="p-6 flex flex-col items-center justify-center">
              {qrCodeDataUrl ? (
                <div className="p-3 bg-white border-2 border-gray-100 rounded-2xl shadow-sm">
                  <img src={qrCodeDataUrl} alt="Live QR Code" className="w-44 h-44 object-contain" />
                </div>
              ) : (
                <div className="w-44 h-44 bg-gray-50 flex items-center justify-center rounded-2xl border-2 border-dashed border-gray-200">
                  <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              )}

              <div className="mt-4 text-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                  Code Rotates In
                </span>
                <div className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-gray-700 bg-gray-100 px-3.5 py-1 rounded-full border border-gray-200">
                  <Clock className="w-3.5 h-3.5 text-purple-600" />
                  0:{qrTimeLeft.toString().padStart(2, '0')}s
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Attendance Activity Logs */}
        <div className="px-4 mt-3">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
            <button
              onClick={() => toggleSection('attendance')}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors active:bg-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-bold text-gray-900">Attendance Records</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">
                    {attendanceStats.present} Present • {attendanceStats.rate}% Rate
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transform transition-transform duration-200 ${expandedSections.attendance ? 'rotate-180' : ''}`} />
            </button>

            <div className={`overflow-hidden transition-all duration-300 ${expandedSections.attendance ? 'max-h-[800px]' : 'max-h-0'}`}>
              <div className="px-4 pb-4 pt-1">
                {loadingAttendance ? (
                  <div className="text-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400 mb-1" />
                    <p className="text-xs text-gray-400">Loading attendance history...</p>
                  </div>
                ) : attendanceHistory.length > 0 ? (
                  <div className="space-y-2">
                    {attendanceHistory.slice(0, 10).map((record, index) => (
                      <div key={index} className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            record.status === 'present' || record.status === 'checked-in' ? 'bg-green-500' :
                            record.status === 'late' ? 'bg-yellow-500' : 'bg-red-500'
                          }`} />
                          <div>
                            <p className="text-xs font-bold text-gray-900">{record.event_name || record.eventName || 'Rehearsal / Service'}</p>
                            <p className="text-[10px] text-gray-400">
                              {(() => {
                                const rawD = record.check_in_time || record.checkInTime || record.date_string || record.dateString || record.created_at || record.createdAt || record.timestamp;
                                return rawD ? new Date(rawD).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent';
                              })()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            record.status === 'present' || record.status === 'checked-in' ? 'bg-green-100 text-green-700' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {record.status || 'Present'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100">
                    <Calendar className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-xs font-bold text-gray-700">No attendance logs yet</p>
                    <p className="text-[10px] text-gray-400">Your check-in scans will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <div className="px-4 mt-6 space-y-3">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white text-gray-900 text-xs font-black uppercase tracking-widest rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all active:scale-95 shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>

          <button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-red-500/70 text-[10px] font-black uppercase tracking-widest hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Account
          </button>
        </div>

      </div>

      {/* Floating Save Button */}
      <ProfileSaveButton
        isEditing={isEditing}
        isSaving={isSaving}
        saveStage={saveStage}
        saveProgress={saveProgress}
        saveMessage={saveMessage}
        themeColor={currentZone?.themeColor}
        onSave={handleSaveProfile}
        onCancel={() => {
          setIsEditing(false)
          setSaveMessage('')
          if (currentProfile) {
            setEditForm({
              username: currentProfile.username || (currentProfile as any).user_name || '',
              firstName: currentProfile.firstName || currentProfile.first_name || '',
              lastName: currentProfile.lastName || currentProfile.last_name || '',
              middleName: currentProfile.middleName || (currentProfile as any).middle_name || '',
              phoneNumber: currentProfile.phoneNumber || (currentProfile as any).phone_number || '',
              gender: currentProfile.gender || '',
              birthday: currentProfile.birthday || '',
              region: currentProfile.region || '',
              zone: currentProfile.zoneCode || (currentProfile as any).zone || '',
              church: currentProfile.church || '',
              designation: currentProfile.designation || '',
              administration: currentProfile.administration || ''
            })
          }
        }}
      />

      {/* Sign Out Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLogoutModal(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 transform transition-all border border-gray-100 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-1">Sign Out?</h3>
            <p className="text-xs text-gray-500 mb-6">Are you sure you want to sign out of your account?</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  setShowLogoutModal(false)
                  await signOut()
                }}
                className="w-full py-3 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button
                onClick={() => setShowLogoutModal(false)}
                className="w-full py-3 bg-gray-50 text-gray-500 rounded-xl text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Zone Dialog */}
      {showLeaveZoneDialog && zoneToLeave && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-orange-600">
              <LogOut className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-1">Leave Zone</h3>
            <p className="text-xs text-gray-500 mb-4">Are you sure you want to leave <strong>{zoneToLeave.name}</strong>?</p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowLeaveZoneDialog(false)
                  setZoneToLeave(null)
                }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveZone}
                disabled={isLeavingZone}
                className="flex-1 py-2.5 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
              >
                {isLeavingZone ? 'Leaving...' : 'Leave'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-gray-900">Delete Account</h3>
                <p className="text-[10px] text-gray-500">This action is permanent</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Type <span className="font-mono font-bold bg-gray-100 px-1 rounded text-red-600">DELETE</span> to confirm account deletion:
            </p>
            <input
              type="text"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-xs mb-4 outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDeleteDialog(false)
                  setDeleteConfirmation('')
                }}
                className="flex-1 py-2.5 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                className="flex-1 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl shadow-md disabled:opacity-40"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePageWithAuth() {
  return <ProfilePage />
}
