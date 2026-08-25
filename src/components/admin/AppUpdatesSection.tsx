"use client";

import React, { useState, useEffect } from 'react';
import {
  Smartphone, Save, RefreshCw, AlertTriangle, CheckCircle2,
  Sparkles, Download, ExternalLink, ShieldAlert, ArrowUpCircle,
  HelpCircle, Globe, Radio, Layers, Check, Copy
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ToastContainer, Toast } from '../Toast';

interface AppUpdateConfig {
  latestVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  iosDownloadUrl?: string;
  androidDownloadUrl?: string;
  releaseNotes: string;
  forceUpdate?: boolean;
}

export default function AppUpdatesSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [config, setConfig] = useState<AppUpdateConfig>({
    latestVersion: '2.4.0',
    minRequiredVersion: '2.0.0',
    downloadUrl: 'https://rehearsalhub.app/download',
    iosDownloadUrl: '',
    androidDownloadUrl: '',
    releaseNotes: '• Major performance enhancements & offline caching\n• AudioLab Stem Player v2 with pitch shifting\n• Instant push notifications for scheduled rehearsals\n• Fixed playback glitch in background audio',
    forceUpdate: true,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { ...toast, id }]);
  };

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<any>('/settings/version_control');
      if (res?.data) {
        setConfig((prev) => ({
          ...prev,
          ...res.data,
        }));
      }
    } catch (error) {
      console.error('[AppUpdatesSection] Error loading version control settings:', error);
      addToast({ type: 'error', message: 'Failed to load app updates configuration.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await apiClient.patch('/settings/version_control', config);
      addToast({
        type: 'success',
        message: 'Mobile App Version Control published! Users will receive the update prompt immediately.',
      });
    } catch (error) {
      console.error('[AppUpdatesSection] Error saving version config:', error);
      addToast({ type: 'error', message: 'Failed to save app update settings.' });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLink = () => {
    if (!config.downloadUrl) return;
    navigator.clipboard.writeText(config.downloadUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="w-full flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden relative font-sans">
      {/* ── Dynamic Purple / Indigo Studio Glows ── */}
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-purple-200/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 -left-40 w-[600px] h-[600px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative flex-1 flex flex-col h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 lg:p-8 space-y-6 w-full">

        {/* ── 1. STUDIO HEADER & ACTIONS ── */}
        <div className="bg-white rounded-3xl p-5 lg:p-6 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5 w-full">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-lg shadow-purple-200 shrink-0">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Mobile App Version Control</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 text-purple-700 border border-purple-200">
                  OTA Dispatch
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Control mandatory updates, release notes, and OTA download targets for iOS and Android mobile singers.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={fetchConfig}
              disabled={loading || saving}
              title="Refresh configuration"
              className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
            </button>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-purple-200 transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Publishing Updates...' : 'Publish Version Updates'}</span>
            </button>
          </div>
        </div>

        {/* ── 2. TWO-COLUMN STUDIO LAYOUT (SETTINGS + LIVE SIMULATOR) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full items-start">

          {/* LEFT COLUMN: Version Form Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-5">
            
            {/* Version Thresholds Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                    <ArrowUpCircle className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Version Thresholds</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Semantic Versioning</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Latest Version */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wide">
                    Latest App Version <span className="text-purple-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={config.latestVersion}
                      onChange={(e) => setConfig({ ...config, latestVersion: e.target.value })}
                      placeholder="e.g. 2.4.0"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Singers below this version will see a friendly upgrade notification.
                  </p>
                </div>

                {/* Minimum Required Version */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <span>Minimum Required</span>
                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded text-[9px] font-black">MANDATORY</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={config.minRequiredVersion}
                      onChange={(e) => setConfig({ ...config, minRequiredVersion: e.target.value })}
                      placeholder="e.g. 2.0.0"
                      className="w-full px-4 py-2.5 bg-rose-50/50 border border-rose-200 rounded-xl text-xs font-bold text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all font-mono"
                    />
                  </div>
                  <p className="text-[11px] text-rose-500 font-medium">
                    Singers below this version will be locked out until updated.
                  </p>
                </div>
              </div>
            </div>

            {/* Download Links Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Distribution Channels</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">Direct Download & Stores</span>
              </div>

              {/* Primary Universal Download URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  Universal Download URL / APK Link <span className="text-purple-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={config.downloadUrl}
                    onChange={(e) => setConfig({ ...config, downloadUrl: e.target.value })}
                    placeholder="https://rehearsalhub.app/download/rehearsalhub-v2.apk"
                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    title="Copy URL"
                    className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-xl transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {config.downloadUrl && (
                    <a
                      href={config.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2.5 text-slate-500 hover:text-purple-700 hover:bg-purple-50 border border-slate-200 rounded-xl transition-all"
                      title="Open Download Link"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Where the "Download Update Now" button directs mobile singers.
                </p>
              </div>
            </div>

            {/* Release Notes Card */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-black text-slate-900">Release Notes & Changelog</h3>
                </div>
                <span className="text-[11px] font-bold text-slate-400">What's New Prompt</span>
              </div>

              <div className="space-y-1.5">
                <textarea
                  value={config.releaseNotes}
                  onChange={(e) => setConfig({ ...config, releaseNotes: e.target.value })}
                  placeholder="• Added new offline AudioLab caching&#10;• Faster multitrack synchronization&#10;• Bug fixes and stability improvements"
                  rows={5}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all custom-scrollbar leading-relaxed"
                />
                <p className="text-[11px] text-slate-400">
                  Displayed directly to singers in their update modal before downloading.
                </p>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Mobile Simulator Mockup (5 cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs w-full mb-4">
              <div className="flex items-center gap-2 text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
                <Radio className="w-3.5 h-3.5 text-purple-600" />
                <span>Live App Simulator</span>
              </div>
              <p className="text-xs text-slate-500">
                Real-time preview of how this update prompt renders on singer devices.
              </p>
            </div>

            {/* Smartphone Frame */}
            <div className="w-full max-w-[340px] bg-slate-900 rounded-[48px] p-3.5 shadow-2xl border-4 border-slate-800 relative">
              {/* Speaker notch */}
              <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-700 mr-2" />
                <div className="w-10 h-1 bg-slate-700 rounded-full" />
              </div>

              {/* Phone Screen Canvas */}
              <div className="bg-slate-950 rounded-[36px] overflow-hidden min-h-[500px] flex flex-col justify-between p-5 relative text-white">
                
                {/* Background Glow inside mockup */}
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-purple-600/30 rounded-full blur-2xl pointer-events-none" />

                {/* Status Bar */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-4">
                  <span>9:41 AM</span>
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>5G</span>
                  </div>
                </div>

                {/* Update Modal Preview Card */}
                <div className="bg-slate-900/95 border border-purple-500/30 rounded-3xl p-5 shadow-2xl space-y-4 my-auto backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-purple-900/50">
                    <ArrowUpCircle className="w-6 h-6 text-white" />
                  </div>

                  <div className="text-center space-y-1">
                    <h4 className="text-sm font-black text-white">Update Available!</h4>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold border border-purple-500/30">
                      <span>Version {config.latestVersion || '2.4.0'}</span>
                    </div>
                  </div>

                  {/* Release Notes Box in Mockup */}
                  <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 text-[11px] text-slate-300 space-y-1 max-h-36 overflow-y-auto">
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-wider">What's New:</p>
                    <p className="whitespace-pre-line text-slate-400 leading-relaxed font-sans">
                      {config.releaseNotes || 'Bug fixes and performance improvements.'}
                    </p>
                  </div>

                  {/* CTA Buttons in Mockup */}
                  <div className="space-y-2 pt-1">
                    <button
                      type="button"
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Update</span>
                    </button>

                    <button
                      type="button"
                      className="w-full py-2 text-[11px] font-bold text-slate-400 hover:text-white transition-colors text-center"
                    >
                      Remind Me Later
                    </button>
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-4" />
              </div>
            </div>

          </div>

        </div>

      </div>

      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
    </div>
  );
}
