"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import SharedDrawer from '@/components/SharedDrawer';
import { getMenuItems } from '@/config/menuItems';
import { useAuth } from '@/hooks/useAuth';
import {
  User,
  MessageCircle,
  ArrowLeft,
  Edit,
  Shield,
  Key,
  Camera,
  Users,
  AlertCircle
} from 'lucide-react';

export default function AccountSupportPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut();
      // Don't use router.push - signOut already handles redirect
    } catch (error) {
 console.error('Logout error:', error);
    }
  };

  const menuItems = getMenuItems(handleLogout);

  const accountTopics = [
    {
      id: 'profile',
      title: 'Updating Profile Information',
      description: 'How to edit your personal details',
      icon: Edit,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      steps: [
        'Go to your Profile page',
        'Tap the edit button (pencil icon)',
        'Update any information you want to change',
        'Tap "Save Changes" to confirm',
        'Your profile will be updated immediately'
      ]
    },
    {
      id: 'password',
      title: 'Password Reset',
      description: 'How to reset your password',
      icon: Key,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      steps: [
        'Go to the login page',
        'Click "Forgot Password"',
        'Enter your email address',
        'Check your email for reset instructions',
        'Follow the link to create a new password'
      ]
    },
    {
      id: 'photo',
      title: 'Profile Picture',
      description: 'Adding or changing your profile photo',
      icon: Camera,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      steps: [
        'Go to your Profile page',
        'Tap the edit button',
        'Click on your profile picture',
        'Select a new photo from your device',
        'The photo will be uploaded and saved automatically'
      ]
    },
    {
      id: 'groups',
      title: 'Managing Groups',
      description: 'Joining or leaving choir groups',
      icon: Users,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      steps: [
        'Go to the Groups section',
        'Browse available groups',
        'Tap "Join Group" on groups you want to join',
        'Your group membership will be updated',
        'You can leave groups anytime from the same section'
      ]
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      description: 'Account security and privacy settings',
      icon: Shield,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      steps: [
        'Your data is protected with encryption',
        'Profile information is only visible to authorized users',
        'We never share your personal information',
        'You can delete your account anytime',
        'Contact support if you have security concerns'
      ]
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-hidden">
      <ScreenHeader
        title="Account Support"
        onMenuClick={() => setIsMenuOpen(true)}
        leftButtons={
          <button
            onClick={() => router.push('/pages/support')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
        }
        rightImageSrc="/logo.png"
      />

      {/* Scrollable Content Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
              <User className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Account Support
            </h1>
            <p className="text-gray-600">
              Get help with your account settings, profile management, and security.
            </p>
          </div>

          {/* Account Topics */}
          <div className="space-y-4">
            {accountTopics.map((topic) => (
              <div key={topic.id} className="bg-white/70 backdrop-blur-sm border-0 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:bg-white/90 transition-all duration-300 ring-1 ring-black/5">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 ${topic.iconBg} rounded-xl flex items-center justify-center`}>
                    <topic.icon className={`w-5 h-5 ${topic.iconColor}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                      {topic.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {topic.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">How to:</h4>
                  <ol className="space-y-1">
                    {topic.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2 text-xs text-gray-600">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-1.5 flex-shrink-0"></span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            ))}
          </div>

          {/* Common Account Issues */}
          <div className="mt-8 p-4 bg-purple-50 border border-purple-200 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-gray-900">Common Account Issues</h3>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-gray-900">Can't edit profile?</p>
                  <p className="text-gray-600 text-xs">Make sure you're logged in and have editing permissions.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-gray-900">Profile picture not uploading?</p>
                  <p className="text-gray-600 text-xs">Check file size (max 10MB) and format (JPG, PNG, WebP).</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <p className="font-medium text-gray-900">Group not appearing?</p>
                  <p className="text-gray-600 text-xs">Contact your choir administrator to be added to groups.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Still Need Help */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm mb-4">
              Need help with something specific? Our account support team is here for you.
            </p>
            <Link
              href="/pages/groups"
              className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Chat with Account Support
            </Link>
          </div>
        </div> {/* End Scrollable Content */}
      </div>

      <SharedDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="Menu" items={menuItems} />
    </div>
  );
}
