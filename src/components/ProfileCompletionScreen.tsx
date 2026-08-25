"use client";

import { useState } from 'react'
import { Eye, EyeOff, ChevronLeft } from 'lucide-react'

interface ProfileCompletionScreenProps {
  onComplete: () => void
  onBack: () => void
  socialData: {
    socialProvider: string
    socialId: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function ProfileCompletionScreen({ onComplete, onBack, socialData }: ProfileCompletionScreenProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    // Pre-filled from social login
    firstName: socialData.firstName,
    lastName: socialData.lastName,
    email: socialData.email,
    socialProvider: socialData.socialProvider,
    socialId: socialData.socialId,
    
    // Additional fields to complete
    middleName: '',
    gender: '',
    birthday: '',
    region: '',
    zone: '',
    church: '',
    designation: '',
    administration: '',
    phoneNumber: '',
    password: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // For now, just complete the profile setup
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto relative">
    
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors touch-target"
        >
          <ChevronLeft className="w-6 h-6" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col justify-center px-8 py-8 relative z-10">
        {/* App Branding */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="LoveWorld Praise Logo" 
              className="object-contain w-[120px] h-[120px]"
            />
          </div>
          
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600 text-sm">
            We&apos;ve pre-filled some information from your {socialData.socialProvider} account
          </p>
        </div>

        {/* Profile Completion Form */}
        <div className="max-w-md mx-auto w-full">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-6">
              {/* Social Account Info */}
              <div className="space-y-4">
                <h3 className="text-gray-900 text-lg font-semibold mb-4">Account Information</h3>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      socialData.socialProvider === 'google' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}>
                      {socialData.socialProvider === 'google' ? (
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        </svg>
                      ) : (
                        <img 
                          src="/kingschat.jpeg" 
                          alt="KingsChat" 
                          className="w-4 h-4 rounded-full object-cover"
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-gray-900 text-sm font-medium">
                        {socialData.socialProvider === 'google' ? 'Google Account' : 'KingsChat Account'}
                      </p>
                      <p className="text-gray-600 text-xs">{socialData.email}</p>
                    </div>
                  </div>
                  
                  <input
                    type="text"
                    name="socialId"
                    value={formData.socialId}
                    onChange={handleInputChange}
                    placeholder={`Your ${socialData.socialProvider === 'google' ? 'Google ID' : 'KingsChat Handle'}`}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="space-y-4">
                <h3 className="text-gray-900 text-lg font-semibold mb-4">Personal Information</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                  <input
                    type="text"
                    name="middleName"
                    placeholder="Middle Name"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last Name"
                  value={formData.lastName}
                  onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  >
                    <option value="" className="bg-white text-gray-900">Gender</option>
                    <option value="male" className="bg-white text-gray-900">Male</option>
                    <option value="female" className="bg-white text-gray-900">Female</option>
                  </select>
                  <input
                    type="date"
                    name="birthday"
                    value={formData.birthday}
                    onChange={handleInputChange}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Location Information Section */}
              <div className="space-y-4">
                <h3 className="text-gray-900 text-lg font-semibold mb-4">Location Information</h3>
                
                <input
                  type="text"
                  name="region"
                  placeholder="Region"
                  value={formData.region}
                  onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    name="zone"
                    placeholder="Zone"
                    value={formData.zone}
                    onChange={handleInputChange}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                  <input
                    type="text"
                    name="church"
                    placeholder="Church"
                    value={formData.church}
                    onChange={handleInputChange}
                    className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    required
                  />
                </div>
              </div>

              {/* Ministry Information Section */}
              <div className="space-y-4">
                <h3 className="text-gray-900 text-lg font-semibold mb-4">Ministry Information</h3>
                
                <select
                  name="designation"
                  value={formData.designation}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="" className="bg-white text-gray-900">Designation</option>
                  <option value="soprano" className="bg-white text-gray-900">Soprano</option>
                  <option value="tenor" className="bg-white text-gray-900">Tenor</option>
                  <option value="alto" className="bg-white text-gray-900">Alto</option>
                  <option value="bass" className="bg-white text-gray-900">Bass</option>
                  <option value="sound" className="bg-white text-gray-900">Sound</option>
                  <option value="media" className="bg-white text-gray-900">Media</option>
                  <option value="usher" className="bg-white text-gray-900">Usher</option>
                  <option value="other" className="bg-white text-gray-900">Other</option>
                </select>
                
                <select
                  name="administration"
                  value={formData.administration}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                >
                  <option value="" className="bg-white text-gray-900">Administration</option>
                  <option value="coordinator" className="bg-white text-gray-900">Coordinator</option>
                  <option value="asst-coordinator" className="bg-white text-gray-900">Assistant Coordinator</option>
                  <option value="admin-manager" className="bg-white text-gray-900">Admin Manager</option>
                  <option value="member" className="bg-white text-gray-900">Member</option>
                  <option value="other" className="bg-white text-gray-900">Other</option>
                </select>
              </div>

              {/* Contact Information Section */}
              <div className="space-y-4">
                <h3 className="text-gray-900 text-lg font-semibold mb-4">Contact Information</h3>
                
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
                
                <input
                  type="tel"
                  name="phoneNumber"
                  placeholder="Phone Number"
                  value={formData.phoneNumber}
                  onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  required
                />
                
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Create Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-4 bg-purple-600 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl touch-target hover:bg-purple-700"
            >
              Complete Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
