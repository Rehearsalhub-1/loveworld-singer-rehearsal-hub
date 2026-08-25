"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SubmittedSongsContent } from '@/components/admin/SubmittedSongsContent';
import { AdminZoneProvider } from '@/contexts/AdminZoneContext';
import { AdminThemeProvider } from '@/components/admin/AdminThemeProvider';

interface SubmittedSongsPageProps {
  embedded?: boolean;
}

export default function SubmittedSongsPage({ embedded = false }: SubmittedSongsPageProps) {
  const router = useRouter();

  return (
    <AdminZoneProvider>
      <AdminThemeProvider>
        <div className="min-h-screen bg-slate-100 flex flex-col">
          {!embedded && (
            <div className="bg-white border-b border-slate-200/80 px-4 md:px-8 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push('/admin')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-2xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Admin</span>
                </button>
                <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                <span className="text-xs font-black uppercase text-purple-600 tracking-wider hidden sm:inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> Repertoire Submissions Review Studio
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 overflow-hidden">
            <SubmittedSongsContent embedded={embedded} />
          </div>
        </div>
      </AdminThemeProvider>
    </AdminZoneProvider>
  );
}
