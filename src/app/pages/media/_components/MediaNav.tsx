"use client";

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Search } from 'lucide-react'

interface MediaNavProps {
  isScrolled: boolean
}

export default function MediaNav({ isScrolled }: MediaNavProps) {
  const router = useRouter()
  const [showSearch, setShowSearch] = useState(false)

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md' : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="flex items-center justify-between h-20 px-4 md:px-8">
        {/* Left Side */}
        <div className="flex items-center gap-8">
          {/* Logo */}
          <Link href="/pages/media" className="flex items-center">
            <div className="text-red-600 font-bold text-2xl md:text-3xl">
              LWSRH
            </div>
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {/* Back to Home */}
          <button
            onClick={() => router.push('/home')}
            className="p-2 text-white hover:text-gray-300 transition-colors"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Search */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 text-white hover:text-gray-300 transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {showSearch && (
        <div className="px-4 md:px-8 pb-4">
          <input
            type="text"
            placeholder="Search for movies, shows, sermons..."
            className="w-full px-4 py-2 bg-black/50 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600"
            autoFocus
          />
        </div>
      )}
    </nav>
  )
}
