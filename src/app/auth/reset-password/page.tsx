"use client";

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

function ResetPasswordContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    zoneCode: '',
    password: '',
    confirmPassword: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }

      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }

      const result = await apiClient.post<{ success: boolean; error?: string }>('/auth/reset-password', {
        email: formData.email.trim(),
        firstName: formData.firstName.trim(),
        zoneCode: formData.zoneCode.trim(),
        newPassword: formData.password,
      })

      if (!result.success) {
        setError(result.error || 'Verification failed. Please check your details and try again.')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth')
      }, 3000)
    } catch (err: unknown) {
      console.error('Password reset error:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Password Reset Successful!</h1>
            <p className="text-gray-600 mb-6">
              Your password has been successfully updated. You will be redirected to sign in shortly.
            </p>
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      <div className="bg-gray-900 px-8 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900"></div>
        <div className="relative z-10 text-center pt-8">
          <h1 className="text-2xl font-bold text-white mb-2">Reset Your Password</h1>
          <p className="text-gray-300 text-sm">
            Verify your identity with email, first name, and zone code
          </p>
        </div>
      </div>

      <div className="bg-white rounded-t-3xl -mt-8 relative z-20 px-8 py-8 min-h-[70vh]">
        <div className="max-w-md mx-auto w-full">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                required
              />
              <input
                type="text"
                name="firstName"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                required
              />
              <input
                type="text"
                name="zoneCode"
                placeholder="Zone Invitation Code"
                value={formData.zoneCode}
                onChange={handleInputChange}
                className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                required
              />
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="New Password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Confirm New Password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-purple-600 text-white font-semibold rounded-xl shadow-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset Password
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => router.push('/auth')}
              className="text-gray-600 text-sm"
            >
              Remember your password?
              <span className="text-purple-600 font-semibold ml-1">Sign In</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  )
}
