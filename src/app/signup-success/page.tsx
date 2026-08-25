"use client";

import { useRouter } from 'next/navigation'
import { CheckCircle, Home, User } from 'lucide-react'

export default function SignupSuccessPage() {
  const router = useRouter()

  const handleGoToApp = () => {
    // Always redirect to home after signup - no profile completion required
    router.push('/home')
  }

  const handleBackToAuth = () => {
    router.push('/auth')
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Dark Header Section */}
      <div className="bg-gray-900 px-8 py-12 relative overflow-hidden min-h-screen flex items-center justify-center">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900"></div>
        
        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-10 left-10 w-32 h-32 bg-gray-600 rounded-full blur-3xl"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-gray-500 rounded-full blur-2xl"></div>
          <div className="absolute bottom-10 left-1/3 w-28 h-28 bg-gray-400 rounded-full blur-2xl"></div>
        </div>
        
        {/* Success Content */}
        <div className="relative z-10 text-center max-w-md mx-auto px-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          
          {/* Success Message */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Welcome to the Team!
          </h1>
          <h2 className="text-xl font-semibold text-white mb-6">
            Your account has been created successfully
          </h2>
          
          <p className="text-gray-300 text-base mb-8 leading-relaxed">
            Your profile has been set up and you're now part of the LoveWorld Singers Rehearsal Hub. 
            You can now access all rehearsal materials, song lists, and connect with fellow singers.
          </p>
          
          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleGoToApp}
              className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Go to App
            </button>
            
            <button
              onClick={handleBackToAuth}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}