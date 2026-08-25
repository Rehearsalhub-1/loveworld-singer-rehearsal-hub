"use client";

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Upload, Film, Image, Loader2, Link } from 'lucide-react'
import { mediaService } from '@/app/pages/media/_lib'
import { CONTENT_TYPES } from '@/config/contentTypes'
import { isYouTubeUrl, getYouTubeThumbnail } from '@/utils/youtube'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useZone } from '@/hooks/useZone'
import { isHQGroup } from '@/config/zones'

export default function AdminMediaUploadPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { currentZone } = useZone()

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [sourceType, setSourceType] = useState<'upload' | 'youtube'>('upload')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'praise' as 'praise' | 'medley' | 'healing' | 'gfap',
    genre: [] as string[],
    videoUrl: '',
    youtubeUrl: '',
    thumbnail: '',
    backdropImage: '',
    duration: 0,
    releaseYear: new Date().getFullYear(),
    featured: false,
    isYouTube: false
  })

  const handleSourceChange = (type: 'upload' | 'youtube') => {
    setSourceType(type)
    setFormData(prev => ({
      ...prev,
      videoUrl: type === 'upload' ? prev.videoUrl : '',
      youtubeUrl: type === 'youtube' ? prev.youtubeUrl : '',
      duration: type === 'upload' ? prev.duration : 0,
      isYouTube: type === 'youtube' ? prev.isYouTube : false
    }))
  }

  const handleYouTubeUrlChange = (url: string) => {
    setFormData(prev => {
      const valid = isYouTubeUrl(url)
      const thumbnail = valid ? getYouTubeThumbnail(url) : null
      return {
        ...prev,
        youtubeUrl: url,
        videoUrl: valid ? url : '',
        isYouTube: valid,
        thumbnail: prev.thumbnail || thumbnail || '',
        backdropImage: prev.backdropImage || thumbnail || ''
      }
    })
  }

  // Cloudinary upload widget
  const openCloudinaryWidget = (type: 'video' | 'image' | 'backdrop') => {
    // @ts-ignore - Cloudinary widget
    if (typeof window !== 'undefined' && window.cloudinary) {
      // @ts-ignore
      const widget = window.cloudinary.createUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          folder: type === 'video' ? 'media/videos' : 'media/images',
          resourceType: type === 'video' ? 'video' : 'image',
          maxFileSize: type === 'video' ? 500000000 : 10000000, // 500MB for video, 10MB for images
          sources: ['local', 'url'],
          showUploadMoreButton: false,
          styles: {
            palette: {
              window: '#000000',
              windowBorder: '#DC2626',
              tabIcon: '#DC2626',
              menuIcons: '#FFFFFF',
              textDark: '#000000',
              textLight: '#FFFFFF',
              link: '#DC2626',
              action: '#DC2626',
              inactiveTabIcon: '#555555',
              error: '#F44235',
              inProgress: '#DC2626',
              complete: '#22C55E',
              sourceBg: '#000000'
            }
          }
        },
        (error: any, result: any) => {
          if (!error && result && result.event === 'success') {
            const url = result.info.secure_url

            if (type === 'video') {
              setFormData(prev => ({
                ...prev,
                videoUrl: url,
                duration: Math.round(result.info.duration || 0),
                isYouTube: false
              }))
            } else if (type === 'image') {
              setFormData(prev => ({ ...prev, thumbnail: url }))
            } else if (type === 'backdrop') {
              setFormData(prev => ({ ...prev, backdropImage: url }))
            }
          }
        }
      )
      widget.open()
    } else {
      alert('Cloudinary widget not loaded. Please refresh the page.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert('You must be logged in')
      return
    }

    const hasVideoSource = sourceType === 'upload'
      ? Boolean(formData.videoUrl)
      : Boolean(formData.youtubeUrl && isYouTubeUrl(formData.youtubeUrl))

    if (!formData.title || !hasVideoSource || !formData.thumbnail) {
      alert('Please fill in all required fields')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    let progressInterval: NodeJS.Timeout | null = null

    try {
      if (sourceType === 'upload') {
        progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90))
        }, 200)
      }

      // Create media item in Firebase
      await mediaService.createMedia({
        title: formData.title,
        description: formData.description,
        type: formData.type,
        genre: formData.genre,
        videoUrl: sourceType === 'youtube' ? formData.youtubeUrl : formData.videoUrl,
        youtubeUrl: sourceType === 'youtube' ? formData.youtubeUrl : undefined,
        thumbnail: formData.thumbnail,
        backdropImage: formData.backdropImage || formData.thumbnail,
        duration: formData.duration,
        releaseYear: formData.releaseYear,
        featured: formData.featured,
        views: 0,
        likes: 0,
        isYouTube: sourceType === 'youtube',
        forHQ: isHQGroup(currentZone?.id)
      })

      setUploadProgress(100)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('mediaUploaded'))
      }

      alert('Media uploaded successfully!')

      setFormData({
        title: '',
        description: '',
        type: 'praise',
        genre: [],
        videoUrl: '',
        youtubeUrl: '',
        thumbnail: '',
        backdropImage: '',
        duration: 0,
        releaseYear: new Date().getFullYear(),
        featured: false,
        isYouTube: false
      })
      setSourceType('upload')

      router.push('/pages/media')
    } catch (error) {
 console.error('Upload error:', error)
      alert('Failed to upload media')
    } finally {
      if (progressInterval) {
        clearInterval(progressInterval)
      }
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-4xl mx-auto">
        <ScreenHeader
          title="Upload Media"
          subtitle="Add new videos to the media library"
          showBackButton={true}
          backPath="/admin"
          darkMode={true}
        />
        <div className="mt-8" />

        {/* Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-red-600"
              placeholder="Enter media title"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-red-600 h-32"
              placeholder="Enter description"
            />
          </div>

          {/* Type & Year */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-red-600"
              >
                {CONTENT_TYPES.map(type => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <input
                type="number"
                value={formData.releaseYear}
                onChange={(e) => setFormData({ ...formData, releaseYear: parseInt(e.target.value) })}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          {/* Video Source */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Video Source <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleSourceChange('upload')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-colors ${sourceType === 'upload'
                  ? 'border-red-500 bg-red-600 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-gray-300 hover:border-red-500'
                  }`}
              >
                <Upload className="w-5 h-5" />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => handleSourceChange('youtube')}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border transition-colors ${sourceType === 'youtube'
                  ? 'border-blue-500 bg-blue-600 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-gray-300 hover:border-blue-500'
                  }`}
              >
                <Link className="w-5 h-5" />
                YouTube URL
              </button>
            </div>
          </div>

          {/* Upload Flow */}
          {sourceType === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => openCloudinaryWidget('video')}
                  className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  <Film className="w-5 h-5" />
                  Upload Video
                </button>
                {formData.videoUrl && !formData.isYouTube && (
                  <span className="text-sm text-green-500"> Video uploaded</span>
                )}
              </div>
              {formData.videoUrl && !formData.isYouTube && (
                <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg text-sm text-green-200">
                  Your video is uploaded to Cloudinary and ready to publish.
                </div>
              )}
            </div>
          )}

          {/* YouTube Flow */}
          {sourceType === 'youtube' && (
            <div className="space-y-3">
              <input
                type="url"
                value={formData.youtubeUrl}
                onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-400">
                We will stream directly from YouTube. You can still upload a custom thumbnail/backdrop below.
              </p>
              {formData.youtubeUrl && !formData.isYouTube && (
                <p className="text-sm text-red-400">Enter a valid YouTube link.</p>
              )}
              {formData.youtubeUrl && formData.isYouTube && (
                <div className="p-4 bg-blue-900/40 border border-blue-700 rounded-lg text-sm text-blue-100">
                  YouTube link captured. Thumbnail will auto-fill if available.
                </div>
              )}
            </div>
          )}

          {/* Thumbnail Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Thumbnail <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => openCloudinaryWidget('image')}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Image className="w-5 h-5" />
                Upload Thumbnail
              </button>
              {formData.thumbnail && (
                <img src={formData.thumbnail} alt="Thumbnail" className="h-16 rounded" />
              )}
            </div>
          </div>

          {/* Backdrop Upload */}
          <div>
            <label className="block text-sm font-medium mb-2">Backdrop Image (Optional)</label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => openCloudinaryWidget('backdrop')}
                className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <Image className="w-5 h-5" />
                Upload Backdrop
              </button>
              {formData.backdropImage && (
                <img src={formData.backdropImage} alt="Backdrop" className="h-16 rounded" />
              )}
            </div>
          </div>

          {/* Featured */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="featured"
              checked={formData.featured}
              onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
              className="w-5 h-5 bg-zinc-900 border-zinc-800 rounded"
            />
            <label htmlFor="featured" className="text-sm font-medium">
              Mark as Featured
            </label>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-2">
              <div className="w-full bg-zinc-800 rounded-full h-2">
                <div
                  className="bg-red-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400 text-center">{uploadProgress}%</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isUploading}
            className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5" />
                Upload Media
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  )
}
