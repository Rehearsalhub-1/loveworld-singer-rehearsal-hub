"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  Loader2, 
  Search, 
  Check, 
  Building, 
  Lock, 
  Mail, 
  User, 
  ChevronRight, 
  X, 
  ShieldCheck,
  Music,
  ArrowRight,
  Globe,
  Key
} from 'lucide-react';
import { ZONES, Zone, getZoneByInvitationCode, isHQGroup } from '@/config/zones';
import { KingsChatAuthService } from '@/lib/kingschat-auth';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import CustomLoader from '@/components/CustomLoader';
import { apiClient } from '@/lib/api-client';

function sanitizeError(error: string): string {
  if (!error) return 'An unexpected error occurred. Please try again.';
  const lower = error.toLowerCase();
  if (lower.includes('invalid credential') || lower.includes('invalid login') || lower.includes('wrong password') || lower.includes('invalid credentials')) {
    return 'Invalid email or password. Please check your credentials and try again.';
  }
  if (lower.includes('user not found') || lower.includes('no account found')) {
    return 'No account found with this email. Please check your email or create an account.';
  }
  if (lower.includes('network') || lower.includes('failed to fetch')) {
    return 'Network connection issue. Please check your internet and try again.';
  }
  if (lower.includes('too many') || lower.includes('rate limit')) {
    return 'Too many attempts. Please try again in a few minutes.';
  }
  return error;
}

const DESIGNATIONS = ['Soprano', 'Alto', 'Tenor', 'Bass', 'Backup Singer', 'Instrumentalist'];

function AuthPageContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    zoneCode: '',
    kingschatId: '',
    designation: 'Soprano',
  });

  // KingsChat State
  const [isKingsChatActive, setIsKingsChatActive] = useState(false);
  const [kingsChatProfile, setKingsChatProfile] = useState<any>(null);
  const [multipleAccounts, setMultipleAccounts] = useState<any[] | null>(null);
  const [savedKcAuth, setSavedKcAuth] = useState<{ accessToken: string; kingschatUserId?: string; profile?: any } | null>(null);
  const [accountSelectLoading, setAccountSelectLoading] = useState(false);

  // Zone Picker State
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [zoneSearchQuery, setZoneSearchQuery] = useState('');
  const [selectedZoneTab, setSelectedZoneTab] = useState<'all' | 'hq' | 'regional'>('all');
  const [useManualZoneCode, setUseManualZoneCode] = useState(false);

  // Forgot Password Modal State
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotStep, setForgotStep] = useState<'email' | 'otp' | 'password'>('email');
  const [forgotLoading, setForgotLoading] = useState(false);

  // Redirect observer
  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const returnUrl = urlParams.get('returnUrl') || '/home';
      window.location.href = returnUrl;
    }
  }, [user]);

  // Modal Tab Mode & Invitation Code lookup
  const [zoneModalTab, setZoneModalTab] = useState<'browse' | 'code'>('browse');
  const [invitationCodeInput, setInvitationCodeInput] = useState('');

  // Regional zones for "Browse" tab
  const filteredRegionalZones = useMemo(() => {
    const list = ZONES.filter((z) => z.region !== 'Headquarters' && !isHQGroup(z.id) && z.id !== 'zone-boss');
    if (!zoneSearchQuery.trim()) return list;
    const q = zoneSearchQuery.toLowerCase().trim();
    return list.filter(
      (z) =>
        z.name.toLowerCase().includes(q) ||
        z.region.toLowerCase().includes(q) ||
        z.invitationCode.toLowerCase().includes(q) ||
        z.slug.toLowerCase().includes(q)
    );
  }, [zoneSearchQuery]);

  // Invitation code lookup for "Invitation Code" tab
  const matchedInvitationZone = useMemo(() => {
    const code = invitationCodeInput.trim().toUpperCase();
    if (!code || code.length < 4) return null;
    return getZoneByInvitationCode(code);
  }, [invitationCodeInput]);

  const selectedZoneObj = useMemo(() => {
    if (!formData.zoneCode) return null;
    return getZoneByInvitationCode(formData.zoneCode);
  }, [formData.zoneCode]);

  // 1-Tap KingsChat Authentication
  const handleKingsChatLogin = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const authTokens = await KingsChatAuthService.login();
      if (!authTokens) {
        setIsLoading(false);
        return;
      }

      setSuccess('Connecting to KingsChat...');
      
      const res = await apiClient.post<{
        success: boolean;
        data?: { accessToken: string; refreshToken: string; user?: any };
        code?: string;
        accounts?: any[];
        profile?: any;
        kingschatUserId?: string;
        error?: string;
      }>('/auth/kingschat-login', {
        accessToken: authTokens.accessToken,
      });

      if (res.success && res.data) {
        apiClient.setAccessToken(res.data.accessToken);
        if (res.data.user) {
          useAuthStore.getState().setUser(res.data.user);
          if (res.data.user.id) {
            localStorage.setItem('userId', res.data.user.id);
          }
        }
        if (typeof window !== 'undefined') {
          document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax";
          localStorage.setItem('lwsrh_has_user', 'true');
          localStorage.setItem('userAuthenticated', 'true');
          localStorage.setItem('authProvider', 'kingschat');
        }
        setSuccess('Login successful! Welcome back...');
        const urlParams = new URLSearchParams(window.location.search);
        const destination = urlParams.get('returnUrl') || '/home';
        if (typeof window !== 'undefined') {
          window.location.href = destination;
        }
        return;
      }

      // Multiple accounts linked to this KingsChat ID -> show Account Chooser Modal
      if (res.code === 'MULTIPLE_ACCOUNTS' && res.accounts && res.accounts.length > 1) {
        setMultipleAccounts(res.accounts);
        setSavedKcAuth({
          accessToken: authTokens.accessToken,
          kingschatUserId: res.kingschatUserId,
          profile: res.profile,
        });
        setIsLoading(false);
        return;
      }

      // If new KingsChat user, auto-fill profile details & switch to signup
      if (res.code === 'NO_ACCOUNT' || res.code === 'NEW_USER') {
        const kcUser = res.profile || {};
        setIsKingsChatActive(true);
        setKingsChatProfile(kcUser);
        setFormData((prev) => ({
          ...prev,
          kingschatId: res.kingschatUserId || kcUser.kingschatId || '',
          firstName: kcUser.firstName || prev.firstName,
          lastName: kcUser.lastName || prev.lastName,
          email: kcUser.email || prev.email,
          password: 'KC-' + Math.random().toString(36).substring(2, 10) + '!',
        }));
        setIsLogin(false);
        setSuccess('KingsChat verified! Select your choir zone below to finish.');
        setIsLoading(false);
        return;
      }

      throw new Error(res.error || 'KingsChat authentication failed');
    } catch (err: any) {
      console.error('KingsChat Error:', err);
      setError(sanitizeError(err?.message || 'KingsChat login failed'));
      setIsLoading(false);
    }
  };

  // Multiple Accounts Selector Action
  const handleSelectAccount = async (targetEmail: string) => {
    if (!savedKcAuth) return;
    setAccountSelectLoading(true);
    setError('');
    try {
      const res = await apiClient.post<{
        success: boolean;
        data?: { accessToken: string; refreshToken: string; user?: any };
        error?: string;
      }>('/auth/kingschat-login', {
        accessToken: savedKcAuth.accessToken,
        selectedEmail: targetEmail,
        email: targetEmail,
        kingschatUserId: savedKcAuth.kingschatUserId,
        profile: savedKcAuth.profile,
      });

      if (res.success && res.data) {
        apiClient.setAccessToken(res.data.accessToken);
        if (res.data.user) {
          useAuthStore.getState().setUser(res.data.user);
          if (res.data.user.id) {
            localStorage.setItem('userId', res.data.user.id);
          }
        }
        if (typeof window !== 'undefined') {
          document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax";
          localStorage.setItem('lwsrh_has_user', 'true');
          localStorage.setItem('userAuthenticated', 'true');
          localStorage.setItem('authProvider', 'kingschat');
        }
        setMultipleAccounts(null);
        setSuccess('Login successful! Welcome back...');
        const urlParams = new URLSearchParams(window.location.search);
        const destination = urlParams.get('returnUrl') || '/home';
        if (typeof window !== 'undefined') {
          window.location.href = destination;
        }
        return;
      }

      throw new Error(res.error || 'Failed to sign in with selected account');
    } catch (err: any) {
      setError(sanitizeError(err?.message || 'Failed to sign in with selected account'));
    } finally {
      setAccountSelectLoading(false);
    }
  };

  // Regular Email/Password Login & Register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      if (isLogin) {
        // Sign In
        const res = await apiClient.post<{
          success: boolean;
          data?: { accessToken: string; refreshToken: string; user?: any };
          error?: string;
        }>('/auth/login', {
          identifier: formData.email.trim(),
          password: formData.password,
        });

        if (!res.success || !res.data) {
          setError(sanitizeError(res.error || 'Invalid credentials'));
          setIsLoading(false);
          return;
        }

        apiClient.setAccessToken(res.data.accessToken);
        if (res.data.user) {
          useAuthStore.getState().setUser(res.data.user);
          if (res.data.user.id) {
            localStorage.setItem('userId', res.data.user.id);
          }
        }
        if (typeof window !== 'undefined') {
          document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax";
          localStorage.setItem('lwsrh_has_user', 'true');
          localStorage.setItem('userAuthenticated', 'true');
        }
        setSuccess('Signed in successfully! Redirecting...');
        const urlParams = new URLSearchParams(window.location.search);
        const destination = urlParams.get('returnUrl') || '/home';
        if (typeof window !== 'undefined') {
          window.location.href = destination;
        }
        return;
      } else {
        // Sign Up
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          setError('Please provide your full name');
          setIsLoading(false);
          return;
        }
        if (!formData.email.trim() || !formData.email.includes('@')) {
          setError('Please provide a valid email address');
          setIsLoading(false);
          return;
        }
        if (!formData.password || formData.password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }
        if (!formData.zoneCode || formData.zoneCode.length < 6) {
          setError('Please select your Choir Zone');
          setIsLoading(false);
          return;
        }

        const res = await apiClient.post<{
          success: boolean;
          data?: { accessToken: string; refreshToken: string; user?: any };
          pendingApproval?: boolean;
          error?: string;
        }>('/auth/register', {
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          first_name: formData.firstName.trim(),
          last_name: formData.lastName.trim(),
          zone_code: formData.zoneCode.trim().toUpperCase(),
          designation: formData.designation,
          kingschat_id: formData.kingschatId || undefined,
        });

        if (!res.success) {
          setError(sanitizeError(res.error || 'Failed to create account'));
          setIsLoading(false);
          return;
        }

        if (res.pendingApproval) {
          setSuccess('Account submitted! Awaiting HQ admin approval.');
          setIsLoading(false);
          return;
        }

        if (res.data) {
          apiClient.setAccessToken(res.data.accessToken);
          if (typeof window !== 'undefined') {
            document.cookie = "lwsrh_is_logged_in=true; path=/; max-age=31536000; SameSite=Lax";
            localStorage.setItem('lwsrh_has_user', 'true');
            localStorage.setItem('userAuthenticated', 'true');
          }
          setSuccess('Account created! Welcome to Rehearsal Hub...');
          const urlParams = new URLSearchParams(window.location.search);
          router.replace(urlParams.get('returnUrl') || '/home');
        }
      }
    } catch (err: any) {
      console.error('Auth submit error:', err);
      setError(sanitizeError(err?.message || 'Authentication error'));
      setIsLoading(false);
    }
  };

  // Forgot Password Steps
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setError('Please enter a valid email');
      return;
    }
    setForgotLoading(true);
    setError('');
    try {
      const res = await apiClient.post<{ success: boolean; error?: string }>('/auth/forgot-password/send-otp', {
        email: forgotEmail.trim().toLowerCase(),
      });
      if (res.success) {
        setForgotStep('otp');
        setSuccess(`Verification code sent to ${forgotEmail}`);
      } else {
        setError(res.error || 'Failed to send OTP code');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send verification code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }
    setForgotLoading(true);
    setError('');
    try {
      const res = await apiClient.post<{ success: boolean; error?: string }>('/auth/forgot-password/verify-otp', {
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
      });
      if (res.success) {
        setForgotStep('password');
        setSuccess('Code verified! Enter your new password.');
      } else {
        setError(res.error || 'Invalid verification code');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setForgotLoading(true);
    setError('');
    try {
      const res = await apiClient.post<{ success: boolean; error?: string }>('/auth/reset-password', {
        email: forgotEmail.trim().toLowerCase(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      if (res.success) {
        setSuccess('Password reset successfully! Please sign in.');
        setShowForgotModal(false);
        setForgotStep('email');
        setForgotEmail('');
        setForgotOtp('');
        setForgotNewPassword('');
      } else {
        setError(res.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err?.message || 'Password reset failed');
    } finally {
      setForgotLoading(false);
    }
  };

  // If already authenticated, show clean loader while Next.js routes to /home
  if (user) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-4">
        <CustomLoader message="Entering Rehearsal Hub..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto bg-slate-50 flex items-start justify-center p-4 sm:p-6 font-outfit">
      {/* Background Soft Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl" />
      </div>

      {/* Main Authentication Card */}
      <div className="relative z-10 my-auto w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 sm:p-8 flex flex-col">
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center p-2 mb-3 shadow-xs">
            <img
              src="/logo.png"
              alt="Loveworld Singers Rehearsal Hub"
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            LoveWorld Singers
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isLogin ? 'Sign in to your choir portal' : 'Join the LoveWorld Singers Rehearsal Hub'}
          </p>
        </div>

        {/* 1-Tap KingsChat Button */}
        <button
          type="button"
          onClick={handleKingsChatLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center py-3 px-4 rounded-2xl bg-[#007AFF] hover:bg-[#0069DB] active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all mb-4 disabled:opacity-60"
        >
          <span>Continue with KingsChat</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-2 mb-4">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            or with email
          </span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Mode Switch Tabs */}
        <div className="flex p-1 bg-slate-100 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              isLogin ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              !isLogin ? 'bg-white text-purple-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Messages */}
        {error ? (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 flex-shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        ) : null}

        {success ? (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <p className="flex-1">{success}</p>
          </div>
        ) : null}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {!isLogin && (
            <>
              {/* KingsChat Verified Badge if active */}
              {isKingsChatActive && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-800 font-medium">
                  <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>KingsChat verified: <strong>{formData.firstName} {formData.lastName}</strong></span>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
                  />
                </div>
              </div>
            </>
          )}

          {/* Email / Identifier */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              {isLogin ? 'Email or Username' : 'Email Address'}
            </label>
            <div className="relative">
              <input
                type={isLogin ? 'text' : 'email'}
                required
                placeholder={isLogin ? 'singer@loveworld.org' : 'yourname@gmail.com'}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
              />
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-slate-700">Password</label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSuccess('');
                    setShowForgotModal(true);
                  }}
                  className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition"
              />
              <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Signup Zone Picker & Vocal Designation */}
          {!isLogin && (
            <>
              {/* Zone Picker Button */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Choir Zone / Group
                </label>
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(true)}
                  className="w-full flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 hover:border-purple-300 rounded-xl text-left transition"
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center flex-shrink-0">
                      <Building className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      {selectedZoneObj ? (
                        <>
                          <p className="text-xs font-bold text-slate-900 truncate">{selectedZoneObj.name}</p>
                          <p className="text-[10px] text-slate-500">{selectedZoneObj.region} • {selectedZoneObj.invitationCode}</p>
                        </>
                      ) : (
                        <p className="text-xs text-slate-500 font-medium">Select your Choir Zone...</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                </button>
              </div>

              {/* Designation Pills */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Vocal Part / Role
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DESIGNATIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setFormData({ ...formData, designation: role })}
                      className={`py-1.5 px-2 rounded-xl text-[11px] font-bold truncate transition ${
                        formData.designation === role
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 mt-2 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* ZONE PICKER MODAL */}
      {/* ========================================================================= */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 flex flex-col max-h-[85vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Select Your Choir Zone</h3>
                <p className="text-xs text-slate-500">Choose the zonal group or choir you rehearse with</p>
              </div>
              <button
                onClick={() => setIsZoneModalOpen(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Tab Toggle */}
            <div className="p-3 border-b border-slate-100 bg-slate-50 flex gap-1.5">
              <button
                type="button"
                onClick={() => setZoneModalTab('browse')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  zoneModalTab === 'browse'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Regional Zones</span>
              </button>

              <button
                type="button"
                onClick={() => setZoneModalTab('code')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  zoneModalTab === 'code'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>Invitation Code</span>
              </button>
            </div>

            {/* TAB 1: BROWSE REGIONAL CHAPTERS */}
            {zoneModalTab === 'browse' && (
              <>
                <div className="p-3 sm:p-4 border-b border-slate-100 bg-white">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search by city, zone name, or code..."
                      value={zoneSearchQuery}
                      onChange={(e) => setZoneSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 divide-y divide-slate-50">
                  {filteredRegionalZones.map((z) => {
                    const isSelected = formData.zoneCode === z.invitationCode;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, zoneCode: z.invitationCode });
                          setIsZoneModalOpen(false);
                          setZoneSearchQuery('');
                        }}
                        className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between transition ${
                          isSelected
                            ? 'bg-purple-50 border border-purple-200'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="truncate pr-2">
                          <p className="text-xs font-bold text-slate-900 truncate">{z.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {z.region} • <span className="font-mono font-semibold">{z.invitationCode}</span>
                          </p>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-purple-600 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* TAB 2: INVITATION CODE ENTRY */}
            {zoneModalTab === 'code' && (
              <div className="p-5 flex flex-col">
                <p className="text-xs text-slate-500 mb-3">
                  Enter the secret invitation code provided by your coordinator or leadership.
                </p>

                <div className="relative mb-4">
                  <Key className="w-4 h-4 text-purple-500 absolute left-3 top-3.5" />
                  <input
                    type="text"
                    placeholder="e.g. ZONEPRES, ZONE001"
                    value={invitationCodeInput}
                    onChange={(e) => setInvitationCodeInput(e.target.value.toUpperCase())}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-purple-200 rounded-xl text-xs font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    autoFocus
                  />
                </div>

                {matchedInvitationZone ? (
                  <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 mb-4">
                    <p className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                      <span>👑</span>
                      <span>{matchedInvitationZone.name}</span>
                    </p>
                    <p className="text-[11px] text-purple-600 mt-1">
                      {matchedInvitationZone.region} • {matchedInvitationZone.invitationCode}
                      {isHQGroup(matchedInvitationZone.id) || matchedInvitationZone.region === 'Headquarters'
                        ? ' • Admin Approval Required'
                        : ''}
                    </p>

                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, zoneCode: matchedInvitationZone.invitationCode });
                        setIsZoneModalOpen(false);
                        setInvitationCodeInput('');
                      }}
                      className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm & Select Zone</span>
                    </button>
                  </div>
                ) : invitationCodeInput.trim().length >= 4 ? (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                    Code not recognized. Please check with your coordinator.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORGOT PASSWORD MODAL (OTP DISPATCH VIA NODEMAILER) */}
      {/* ========================================================================= */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900">Reset Password</h3>
              <button
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotStep('email');
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotStep === 'email' && (
              <form onSubmit={handleSendOtp} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Enter your registered account email to receive a 6-digit verification code.
                </p>
                <div>
                  <input
                    type="email"
                    required
                    placeholder="your-email@loveworld.org"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition flex items-center justify-center"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Verification Code'}
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Enter the 6-digit OTP code sent to <strong>{forgotEmail}</strong>.
                </p>
                <div>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center text-base tracking-widest font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition flex items-center justify-center"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify Code'}
                </button>
              </form>
            )}

            {forgotStep === 'password' && (
              <form onSubmit={handleResetPassword} className="space-y-3">
                <p className="text-xs text-slate-500">
                  Create a new secure password for your account.
                </p>
                <div>
                  <input
                    type="password"
                    required
                    placeholder="New password (min. 6 characters)"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition flex items-center justify-center"
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* KingsChat Multi-Account Chooser Modal */}
      {multipleAccounts && multipleAccounts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100 animate-scaleUp">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Select Account</h3>
                  <p className="text-xs text-slate-500">Multiple accounts found for this KingsChat ID</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMultipleAccounts(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-4">
              Choose the profile you would like to sign into for this session:
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {multipleAccounts.map((acc, idx) => {
                const fullName = `${acc.firstName || ''} ${acc.lastName || ''}`.trim() || 'Singer';
                const roleBadge =
                  acc.role === 'super_admin' || acc.role === 'hq_admin' || acc.hasHqAccess
                    ? 'HQ Admin'
                    : acc.role === 'zone_coordinator'
                    ? 'Zonal Coordinator'
                    : acc.role === 'church_coordinator'
                    ? 'Church Coordinator'
                    : acc.role === 'subgroup_coordinator'
                    ? 'Group Coordinator'
                    : 'Choir Member';

                return (
                  <button
                    key={acc.id || idx}
                    type="button"
                    disabled={accountSelectLoading}
                    onClick={() => handleSelectAccount(acc.email)}
                    className="w-full p-4 rounded-2xl border border-slate-200 hover:border-purple-500 bg-slate-50 hover:bg-purple-50/50 transition-all flex items-center justify-between text-left group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
                        {acc.firstName ? acc.firstName[0].toUpperCase() : 'S'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900">{fullName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            {roleBadge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">{acc.email}</p>
                        {acc.zoneCode && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Zone: {acc.zoneCode}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                  </button>
                );
              })}
            </div>

            {accountSelectLoading && (
              <div className="mt-4 flex items-center justify-center gap-2 text-xs text-purple-600 font-semibold">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
          <CustomLoader message="Loading..." />
        </div>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
