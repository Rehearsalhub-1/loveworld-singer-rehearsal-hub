"use client";

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle } from 'lucide-react'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [countdown, setCountdown] = useState(2)

  // Get the action type from URL params
  const action = searchParams?.get('action') || 'login'

  const getMessage = () => {
    switch (action) {
      case 'signup':
        return 'Successful Signup'
      case 'login':
        return 'Successful Login'
      default:
        return 'Success'
    }
  }

  useEffect(() => {
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Separate effect for navigation when countdown reaches 0
  useEffect(() => {
    if (countdown <= 0) {
      const navigateTimer = setTimeout(() => {
        try {
          // Always redirect to home after signup/login - no profile completion required
          router.push('/home')
        } catch (error) {
 console.error('Navigation error:', error)
          // Fallback to window.location if router fails
          window.location.href = '/home'
        }
      }, 100)

      return () => clearTimeout(navigateTimer)
    }
  }, [countdown, router])

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
      {/* Success Content */}
      <div className="text-center px-8 max-w-md mx-auto">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          {getMessage()}
        </h1>
        
        <p className="text-gray-600 text-sm">
          Redirecting in {countdown}s
        </p>
      </div>
    </div>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-center px-8 max-w-md mx-auto">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Loading...</h1>
        </div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
