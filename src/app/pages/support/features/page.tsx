"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ScreenHeader } from '@/components/ScreenHeader';
import SharedDrawer from '@/components/SharedDrawer';
import { getMenuItems } from '@/config/menuItems';
import { useAuth } from '@/hooks/useAuth';
import {
  Lightbulb,
  MessageCircle,
  ArrowLeft,
  Plus,
  Star,
  TrendingUp,
  Music,
  Users,
  Calendar,
  Smartphone,
  Zap,
  Heart
} from 'lucide-react';

export default function FeaturesSupportPage() {
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

  const requestedFeatures = [
    {
      id: 'offline',
      title: 'Offline Mode',
      description: 'Download songs for offline listening',
      icon: Smartphone,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      status: 'planned',
      votes: 127,
      category: 'audio'
    },
    {
      id: 'rehearsal',
      title: 'Virtual Rehearsal Rooms',
      description: 'Real-time collaboration tools for remote rehearsals',
      icon: Users,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      status: 'in-development',
      votes: 89,
      category: 'collaboration'
    },
    {
      id: 'analytics',
      title: 'Performance Analytics',
      description: 'Track your rehearsal attendance and progress',
      icon: TrendingUp,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      status: 'planned',
      votes: 156,
      category: 'analytics'
    },
    {
      id: 'instruments',
      title: 'Instrument Integration',
      description: 'Support for virtual instruments and backing tracks',
      icon: Music,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      status: 'planned',
      votes: 73,
      category: 'music'
    }
  ];

  const upcomingFeatures = [
    {
      id: 'ai-coach',
      title: 'AI Vocal Coach',
      description: 'Personalized feedback on your singing technique',
      icon: Zap,
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      category: 'ai'
    },
    {
      id: 'events',
      title: 'Event Management',
      description: 'Schedule and manage choir events and performances',
      icon: Calendar,
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600',
      category: 'events'
    },
    {
      id: 'social',
      title: 'Social Features',
      description: 'Connect with other choir members and share achievements',
      icon: Heart,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      category: 'social'
    }
  ];

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-hidden">
      <ScreenHeader
        title="Feature Requests"
        onMenuClick={() => setIsMenuOpen(true)}
        leftButtons={
          <button onClick={() => router.push('/pages/support')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-600 rounded-full mb-4">
              <Lightbulb className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Feature Requests
            </h1>
            <p className="text-gray-600">
              Help us build the best choir app by suggesting new features and improvements.
            </p>
          </div>

          {/* How to Request Features */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Plus className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-gray-900">How to Request Features</h3>
            </div>
            <ol className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Describe your feature idea clearly and in detail</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Explain why this feature would be valuable for the choir community</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></span>
                <span>Include examples of how it would work in practice</span>
              </li>
            </ol>
          </div>

          {/* Most Requested Features */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Most Requested Features</h2>
            <div className="space-y-3">
              {requestedFeatures.map((feature) => (
                <div key={feature.id} className="bg-white/70 backdrop-blur-sm border-0 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:bg-white/90 transition-all duration-300 ring-1 ring-black/5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 ${feature.iconBg} rounded-xl flex items-center justify-center`}>
                      <feature.icon className={`w-5 h-5 ${feature.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                          {feature.title}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${feature.status === 'planned' ? 'bg-blue-100 text-blue-700' :
                            feature.status === 'in-development' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                          }`}>
                          {feature.status === 'planned' ? 'Planned' :
                            feature.status === 'in-development' ? 'In Development' :
                              'Coming Soon'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Star className="w-3 h-3" />
                        {feature.votes}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Features */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Coming Soon</h2>
            <div className="grid grid-cols-1 gap-3">
              {upcomingFeatures.map((feature) => (
                <div key={feature.id} className="bg-white/70 backdrop-blur-sm border-0 rounded-xl p-3 shadow-sm hover:shadow-lg hover:bg-white/90 transition-all duration-300 ring-1 ring-black/5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 ${feature.iconBg} rounded-lg flex items-center justify-center`}>
                      <feature.icon className={`w-4 h-4 ${feature.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Feature Request */}
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
            <div className="text-center">
              <Lightbulb className="w-8 h-8 text-yellow-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Have a Feature Idea?</h3>
              <p className="text-gray-600 text-sm mb-4">
                We'd love to hear your suggestions for making the LoveWorld Singers app even better.
              </p>
              <Link
                href="/pages/groups"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Submit Feature Request
              </Link>
            </div>
          </div>
        </div> {/* End Scrollable Content */}
      </div>

      <SharedDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="Menu" items={menuItems} />
    </div>
  );
}
