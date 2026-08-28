"use client";

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music, Settings, Home, Menu, X, Mic, Radio } from 'lucide-react'
import { useState } from 'react'
import OrganizationSwitcher from './OrganizationSwitcher'
import { useOrganizationStore } from '@/stores/organizationStore'

export default function Navigation() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { capabilities } = useOrganizationStore()

  const navItems = [
    { href: '/home', label: 'Home', icon: Home },
    { href: '/pages/praise-night', label: 'Program', icon: Music },
    { href: '/pages/audiolab', label: 'AudioLab', icon: Mic },
    { href: '/pages/status', label: 'Status', icon: Radio },
    ...(capabilities.canManageOrganization || capabilities.canManagePlatform
      ? [{ href: '/pages/admin', label: 'Admin', icon: Settings }]
      : []),
  ]

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex justify-between items-center h-16 sm:h-20 gap-4">
          <div className="flex items-center gap-4">
            <Link href="/home" className="flex items-center gap-3 group transition-all">
              <div className="w-9 h-9 sm:w-11 sm:h-11 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform duration-300">
                <Music className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-black text-slate-900 tracking-tight">LWSRHP</span>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">Rehearsal Hub</p>
              </div>
            </Link>

            <OrganizationSwitcher />
          </div>

          <div className="hidden md:flex items-center space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm transition-all duration-300 ${isActive
                    ? 'bg-indigo-50 text-indigo-700 font-black shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-bold'
                    }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-900'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-3.5 bg-slate-50 border border-slate-200/50 rounded-2xl text-slate-500 hover:text-indigo-600 hover:bg-white transition-all active:scale-95 shadow-sm"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden animate-in slide-in-from-top-4 duration-300 overflow-hidden">
            <div className="px-4 pt-4 pb-10 space-y-3 bg-white/40 backdrop-blur-2xl border-t border-slate-100/50">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center gap-4 px-6 py-5 rounded-[1.5rem] text-base transition-all active:scale-95 ${isActive
                      ? 'bg-white text-indigo-700 font-extrabold shadow-lg shadow-indigo-600/5 ring-1 ring-indigo-500/5'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-900 font-bold'
                      }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
