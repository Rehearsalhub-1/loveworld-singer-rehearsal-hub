"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScreenHeader } from '@/components/ScreenHeader';
import SharedDrawer from '@/components/SharedDrawer';
import { getMenuItems } from '@/config/menuItems';
import { useAuth } from '@/hooks/useAuth';
import {
  ChevronRight,
  Search,
  BookOpen,
  HelpCircle,
  ArrowLeft
} from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
}

// Pre-made FAQ data
const faqData: FAQ[] = [
  {
    id: '1',
    question: 'What is AudioLab and how do I use it?',
    answer: 'AudioLab is a practice tool where you can listen to songs and switch between different vocal parts (Soprano, Alto, Tenor, Bass). Navigate to AudioLab from the menu, select a song, and tap the part buttons to practice your specific vocal part.',
    category: 'features'
  },
  {
    id: '2',
    question: 'How do I access premium features?',
    answer: 'Premium features require an active subscription. Go to Settings > Subscription to view available plans and subscribe using Espees payment.',
    category: 'subscription'
  },
  {
    id: '3',
    question: 'How do I join a live classroom session?',
    answer: 'Go to AudioLab > Classroom. You can either create a new classroom or join an existing one using the 6-digit code shared by the host. Make sure to allow microphone and camera permissions.',
    category: 'features'
  },
  {
    id: '4',
    question: 'Can I view songs from different Praise Nights?',
    answer: 'Yes! Use the Calendar to browse upcoming and past Praise Nights. Tap on any event to see the song list. Songs are organized by categories like Pre-Rehearsal, Ongoing, and Archive.',
    category: 'features'
  },
  {
    id: '5',
    question: 'How do I chat with other singers in my group?',
    answer: 'Go to Groups from the menu. Select or create a group, then use the chat feature to communicate with other members. You can send text messages, voice notes, and files.',
    category: 'groups'
  },
  {
    id: '6',
    question: 'What\'s the difference between zones?',
    answer: 'The app supports multiple zones (regions). Your zone determines which songs and events you see. You can switch zones from your profile settings.',
    category: 'general'
  },
  {
    id: '7',
    question: 'How do I update my profile information?',
    answer: 'Tap the menu icon, go to Profile, then tap Edit Profile. You can update your name, designation (Soprano/Alto/Tenor/Bass), church, zone, and profile picture.',
    category: 'account'
  },
  {
    id: '8',
    question: 'Why can\'t I hear audio in songs?',
    answer: 'Check your device volume and internet connection. Make sure your browser allows audio playback. For AudioLab, ensure you\'ve selected a vocal part and the song has audio uploaded.',
    category: 'technical'
  },
  {
    id: '9',
    question: 'How do I view song lyrics and solfas?',
    answer: 'Open any song from the song list. Tap on the song card to view details including lyrics, solfas, personnel, and comments. You can also see the rehearsal history.',
    category: 'features'
  },
  {
    id: '10',
    question: 'What are the different subscription plans?',
    answer: 'We offer Monthly (1 Espee) and Yearly (12 Espees) premium plans. Subscriptions unlock premium features like AudioLab, advanced practice tools, and full access to all songs.',
    category: 'subscription'
  },
  {
    id: '11',
    question: 'How do I cancel my subscription?',
    answer: 'Go to Settings > Subscription > Manage Subscription. You can cancel anytime. Your access will continue until the end of your current billing period.',
    category: 'subscription'
  },
  {
    id: '12',
    question: 'Can I download songs for offline use?',
    answer: 'Currently, songs are only available for streaming to ensure you always have the latest versions. Offline downloads may be available in a future update.',
    category: 'features'
  },
  {
    id: '13',
    question: 'How do I report a bug or request a feature?',
    answer: 'Go to Support > Contact Us to send feedback, report bugs, or request new features. We review all submissions and appreciate your input!',
    category: 'support'
  },
  {
    id: '14',
    question: 'What devices are supported?',
    answer: 'The app works on smartphones, tablets, and desktop computers with modern web browsers (Chrome, Safari, Edge, Firefox). For best experience, use the latest browser version.',
    category: 'technical'
  },
  {
    id: '15',
    question: 'How do I reset my password?',
    answer: 'On the login page, tap "Forgot Password". Enter your email address and check your inbox for reset instructions. Follow the link to create a new password.',
    category: 'account'
  }
];

export default function FAQPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredFAQs = faqData.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
 console.error('Logout error:', error);
    }
  };

  const menuItems = getMenuItems(handleLogout);

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-gray-50 via-white to-slate-50">
      {/* Fixed Header */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100/50">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/pages/support')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors active:scale-95"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">FAQ & Help Center</h1>
          </div>
          <img src="/logo.png" alt="Logo" className="w-10 h-10 rounded-xl" />
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide content-bottom-safe pt-16" style={{
        height: '100vh',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div className="mx-auto max-w-2xl px-3 sm:px-4 py-4 sm:py-6 pb-24">
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/70 backdrop-blur-sm rounded-2xl ring-1 ring-black/5 shadow-sm focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          {/* FAQ List */}
          <div>
            {filteredFAQs.length > 0 ? (
              <div className="space-y-3">
                {filteredFAQs.map((faq) => (
                  <div key={faq.id} className="bg-white/70 backdrop-blur-sm border-0 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:bg-white/90 transition-all duration-300 active:scale-[0.97] group ring-1 ring-black/5">
                    <button
                      onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                      className="w-full text-left flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 text-sm leading-tight">
                          {faq.question}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${faq.category === 'features' ? 'bg-purple-100 text-purple-700' :
                            faq.category === 'subscription' ? 'bg-green-100 text-green-700' :
                              faq.category === 'account' ? 'bg-blue-100 text-blue-700' :
                                faq.category === 'technical' ? 'bg-orange-100 text-orange-700' :
                                  faq.category === 'groups' ? 'bg-pink-100 text-pink-700' :
                                    faq.category === 'support' ? 'bg-indigo-100 text-indigo-700' :
                                      'bg-gray-100 text-gray-700'
                            }`}>
                            {faq.category}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-5 h-5 text-gray-400 transition-transform ml-3 ${expandedFAQ === faq.id ? 'rotate-90' : ''
                          }`}
                      />
                    </button>
                    {expandedFAQ === faq.id && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-gray-600 text-sm leading-relaxed">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium mb-2">No results found</p>
                <p className="text-gray-400 text-sm">Try searching with different keywords</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SharedDrawer open={isMenuOpen} onClose={() => setIsMenuOpen(false)} title="Menu" items={menuItems} />
    </div>
  );
}