"use client";

import { useState, useEffect } from 'react'
import { Bell, Mic, X, Shield, CheckCircle2 } from 'lucide-react'

type PermissionType = 'notification' | 'microphone'

interface PermissionModalProps {
  type: PermissionType
  isOpen: boolean
  onClose: () => void
  onGranted?: () => void
  onDenied?: () => void
}

const permissionConfig = {
  notification: {
    icon: Bell,
    title: 'Enable Notifications',
    description: 'Get notified when you receive new messages, announcements, and updates from your zone.',
    benefits: [
      'New chat messages',
      'Zone announcements', 
      'Missed calls',
      'Song updates'
    ],
    buttonText: 'Enable Notifications',
    color: '#6366f1' // indigo
  },
  microphone: {
    icon: Mic,
    title: 'Enable Microphone',
    description: 'Allow microphone access to make voice calls and participate in live sessions.',
    benefits: [
      'Voice calls with members',
      'Live recording sessions',
      'AudioLab features',
      'Real-time collaboration'
    ],
    buttonText: 'Enable Microphone',
    color: '#8b5cf6' // violet
  }
}

export default function PermissionModal({ 
  type, 
  isOpen, 
  onClose, 
  onGranted, 
  onDenied 
}: PermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied'>('idle')
  
  const config = permissionConfig[type]
  const Icon = config.icon

  const requestPermission = async () => {
    setIsRequesting(true)
    
    try {
      if (type === 'notification') {
        const result = await Notification.requestPermission()
        if (result === 'granted') {
          setStatus('granted')
          onGranted?.()
          setTimeout(() => onClose(), 1500)
        } else {
          setStatus('denied')
          onDenied?.()
        }
      } else if (type === 'microphone') {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        // Stop the stream immediately - we just needed permission
        stream.getTracks().forEach(track => track.stop())
        setStatus('granted')
        onGranted?.()
        setTimeout(() => onClose(), 1500)
      }
    } catch (error) {
      setStatus('denied')
      onDenied?.()
    } finally {
      setIsRequesting(false)
    }
  }

  // Reset status when modal opens
  useEffect(() => {
    if (isOpen) {
      setStatus('idle')
    }
  }, [isOpen])

  const colorClass = type === 'notification' ? 'indigo' : 'violet';

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
        {/* Success state */}
        {status === 'granted' ? (
          <div className="p-8 text-center">
            <div 
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-${colorClass}-500/15`}
            >
              <CheckCircle2 className={`w-8 h-8 text-${colorClass}-600`} />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Permission Granted!</h3>
            <p className="text-gray-500">You're all set.</p>
          </div>
        ) : (
          <>
            {/* Header with icon */}
            <div className="pt-8 pb-4 px-6 text-center">
              <div 
                className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-${colorClass}-500/15`}
              >
                <Icon className={`w-8 h-8 text-${colorClass}-600`} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{config.title}</h3>
              <p className="text-gray-500 text-sm">{config.description}</p>
            </div>

            {/* Benefits list */}
            <div className="px-6 pb-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    What you'll get
                  </span>
                </div>
                <ul className="space-y-2">
                  {config.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                      <div 
                        className={`w-1.5 h-1.5 rounded-full bg-${colorClass}-500`}
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Denied message */}
            {status === 'denied' && (
              <div className="px-6 pb-4">
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                  <p className="text-sm text-red-600">
                    Permission was denied. You can enable it later in your browser settings.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-6 pt-2 space-y-3">
              <button
                onClick={requestPermission}
                disabled={isRequesting}
                className={`w-full py-3 px-4 rounded-xl text-white font-medium transition-all active:scale-[0.98] disabled:opacity-70 bg-${colorClass}-600 hover:bg-${colorClass}-700`}
              >
                {isRequesting ? 'Requesting...' : config.buttonText}
              </button>
              <button
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
