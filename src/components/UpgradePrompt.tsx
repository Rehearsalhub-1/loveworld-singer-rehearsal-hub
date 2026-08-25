"use client";

import { useRouter } from 'next/navigation'
import { Crown, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { canSeeUpgradePrompts } from '@/lib/user-role-utils'

interface UpgradePromptProps {
  feature: string;
  description?: string;
  onClose?: () => void;
}

export default function UpgradePrompt({ feature, description, onClose }: UpgradePromptProps) {
  const router = useRouter()
  const { profile } = useAuth()
  const [isVisible, setIsVisible] = useState(true)

  // Boss bypasses all upgrade prompts
  const isBoss = (profile?.role as string) === 'boss'
  if (isBoss) {
    return null
  }

  // Only show upgrade prompts to Zone Leaders (ZNL prefix)
  if (!canSeeUpgradePrompts(profile)) {
    return null
  }

  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-yellow-400 to-amber-400 p-6 relative">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-yellow-900 hover:text-yellow-950 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-900/20 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-yellow-900" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-yellow-900">Premium Feature</h3>
              <p className="text-sm text-yellow-800">Upgrade to unlock</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <h4 className="text-lg font-bold text-gray-900 mb-2">{feature}</h4>
          <p className="text-gray-600 mb-4">
            {description || 'This feature is only available on the Premium plan. Upgrade now to unlock full access.'}
          </p>

          {/* Zone Leader Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-900">
              <strong>Zone Leader:</strong> Visit your admin dashboard to manage your zone subscription and unlock premium features.
            </p>
          </div>

          {/* Benefits */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-gray-900 mb-3">Premium includes:</p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-green-600"></span>
                Up to 500 members
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600"></span>
                AudioLab access
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600"></span>
                Rehearsal tracking
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600"></span>
                Advanced analytics
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/subscription')}
              className="w-full py-3 bg-gradient-to-r from-yellow-400 to-amber-400 text-yellow-900 rounded-xl font-bold hover:from-yellow-500 hover:to-amber-500 transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Upgrade to Premium
            </button>
            <button
              onClick={handleClose}
              className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
