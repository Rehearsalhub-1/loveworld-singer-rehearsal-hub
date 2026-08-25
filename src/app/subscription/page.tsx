"use client";

const cancelSubscription = async (..._args: any[]): Promise<any> => ({ success: true });

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useZone } from '@/hooks/useZone'
import { Check, CreditCard, Shield, Crown, X, Upload, Copy, CheckCircle, AlertCircle, Home as HomeIcon, User as UserIcon, Sparkles, Calendar, Trash2, Info, RefreshCw } from 'lucide-react'
import { ScreenHeader } from '@/components/ScreenHeader'
import { useSubscription } from '@/contexts/SubscriptionContext'

import { apiClient } from '@/lib/api-client';
const SubscriptionService = {
  getUserSubscription: async () => ({ status: 'active', tier: 'premium' }),
  initializePayment: async (data: any) => await apiClient.post('/payments/initialize', data)
};

import { useEffect } from 'react'



export default function SubscriptionPage() {
  const router = useRouter()
  const { user, profile } = useAuth()
  const { currentZone } = useZone()
  const {
    subscription,
    isIndividualPremium,
    isPremiumTier,
    isOfficialAccess,
    daysRemaining,
    refreshSubscription,
    isLoading: subLoading
  } = useSubscription()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isCancelling, setIsCancelling] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'plans' | 'success' | 'manage'>('plans')
  const [paymentHistory, setPaymentHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Load payment history when on manage view
  const loadPaymentHistory = async () => {
    if (!user) return

    setLoadingHistory(true)
    try {
      const response = await fetch(`/api/payments/history?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentHistory(data.payments || [])
      }
    } catch (error) {
 console.error('Error loading payment history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  // Keep state in sync with premium status
  useEffect(() => {
    if (!subLoading && isPremiumTier && step === 'plans') {
      setStep('manage')
    }
    // Load payment history when entering manage view
    if (step === 'manage' && isPremiumTier) {
      loadPaymentHistory()
    }
  }, [isPremiumTier, step, subLoading])

  const handlePayWithKingsPay = async () => {
    if (!user || !currentZone) {
      setError('Please sign in to continue')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const amount = 100 // Fixed 1 Espee for Individual

      // Initialize payment with KingsPay
      const payload = {
        amount,
        description: `LWSRH Premium Individual Subscription`,
        userId: user.id,
        userEmail: user.email,
        duration: 'monthly',
        type: 'individual_subscription'
      }



      const response = await fetch('/api/kingspay/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })



      let data
      const responseText = await response.text()


      try {
        data = JSON.parse(responseText)
      } catch (parseErr) {
 console.error('Failed to parse API response:', parseErr)
        setError('Server returned an invalid response. Please check your connection.')
        setIsProcessing(false)
        return
      }

      if (data.success && data.payment_id) {
        // Redirect to KingsPay payment page
        const paymentUrl = `https://kingspay-gs.com/payment?id=${data.payment_id}`
        window.location.href = paymentUrl
      } else {
        const errorMsg = data.instruction
          ? `${data.error}. ${data.instruction}`
          : (data.error || 'Failed to initialize payment')
        setError(errorMsg)
        setIsProcessing(false)
      }
    } catch (err) {
 console.error('Payment error:', err)
      setError('An error occurred. Please try again.')
      setIsProcessing(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!user || !confirm('Are you sure you want to cancel your Premium subscription? Your access will be revoked immediately.')) {
      return
    }

    setIsCancelling(true)
    try {
      const result = await cancelSubscription(user.id)
      if (result.success) {
        await refreshSubscription()
        setStep('plans')
        alert('Your subscription has been cancelled.')
      } else {
        setError(result.error || 'Failed to cancel subscription')
      }
    } catch (err) {
 console.error('Cancellation error:', err)
      setError('An error occurred while cancelling. Please contact support.')
    } finally {
      setIsCancelling(false)
    }
  }

  if (!currentZone || subLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-bold animate-pulse">Syncing Subscription...</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Header - Minimalist & Integrated */}
      <div className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/home')}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter font-outfit">Subscription Hub</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100/50">
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Secure & Verified</span>
            </div>
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6">
        {step === 'plans' && (
          <div className="max-w-4xl mx-auto py-12">
            {/* Header Section */}
            <div className="text-center mb-16 px-6">
              <h2 className="text-5xl font-black text-slate-950 mb-6 tracking-tighter uppercase font-outfit">Go Premium</h2>
              <p className="text-slate-500 text-lg max-w-xl mx-auto leading-relaxed font-medium">
                Unlock the full power of Loveworld Singers Rehearsal Hub.
              </p>
            </div>

            {/* Pricing Card: Premium Individual */}
            <div className="max-w-[480px] mx-auto px-6 mb-16">
              <div className="relative rounded-[3rem] p-12 bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 border-2 border-white/10 shadow-[0_32px_64px_-16px_rgba(79,70,229,0.3)] flex flex-col group transition-all hover:border-purple-500/50">
                {/* Badge */}
                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
                  <div className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-full text-[10px] font-black tracking-[0.25em] text-white shadow-2xl flex items-center gap-2 border-2 border-white/10">
                    <Crown className="w-4 h-4" />
                    PREMIUM INDIVIDUAL
                  </div>
                </div>

                <div className="text-center mb-12 pt-6">
                  <h3 className="text-3xl font-black text-white mb-3 tracking-tighter uppercase font-outfit">Full Access</h3>
                  <p className="text-purple-200/40 text-sm leading-relaxed font-medium">Everything you need to grow as a Loveworld Singer.</p>
                </div>

                <div className="text-center mb-12">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-8xl font-black text-white tracking-tighter font-outfit">1</span>
                    <div className="text-left">
                      <span className="block text-2xl font-black text-amber-400 leading-none uppercase font-outfit">ESPEE</span>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Per Month</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 flex-1 mb-12 px-2">
                  {[
                    'AudioLab',
                    'Unlimited Account Access',
                    'Full Rehearsal Access',
                    'Custom Song Submission',
                    'Advanced Admin Analytics'
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-7 h-7 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 border border-purple-500/30">
                        <Check className="w-4 h-4 text-purple-400" />
                      </div>
                      <span className="text-gray-300 font-bold text-sm tracking-tight">{feature}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handlePayWithKingsPay}
                  disabled={isProcessing}
                  className="w-full h-20 bg-white text-gray-950 rounded-[2rem] font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-purple-900/40 flex items-center justify-center gap-4 group-hover:bg-purple-500 group-hover:text-white uppercase tracking-widest"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-7 h-7" />
                      PAY WITH ESPEES
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="max-w-md mx-auto mb-12 p-5 bg-red-50/50 border border-red-200/50 rounded-[2rem] flex items-start gap-4 backdrop-blur-sm">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-red-700 text-sm font-bold mb-1">Payment Initialization Failed</p>
                  <p className="text-red-600/70 text-xs leading-relaxed">{error}</p>
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div className="flex justify-center items-center gap-10 text-slate-400 opacity-60">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Secure</span>
              </div>
              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Instant</span>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-24 px-6 max-w-xl mx-auto">
            <div className="relative mb-12">
              <div className="w-32 h-32 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/30 rotate-12 transition-transform hover:rotate-0 duration-500">
                <CheckCircle className="w-16 h-16 text-white" />
              </div>
              <Sparkles className="absolute -top-4 -right-4 w-12 h-12 text-yellow-400 animate-pulse" />
            </div>

            <h2 className="text-6xl font-black text-slate-950 mb-6 tracking-tighter uppercase font-outfit">
              ACTIVE
            </h2>

            <p className="text-slate-500 mb-12 text-lg leading-relaxed font-medium">
              Your premium subscription is now active.
            </p>

            <div className="bg-gradient-to-br from-indigo-50 to-slate-50 border border-slate-100 rounded-[3rem] p-10 mb-12 flex flex-col items-center text-center shadow-inner relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl" />
                <div className="w-20 h-20 bg-white border border-slate-100 rounded-[1.5rem] flex items-center justify-center shadow-xl mb-6 rotate-3">
                  <Crown className="w-10 h-10 text-indigo-600" />
                </div>
                <div>
                  <h4 className="font-black text-slate-950 text-xl tracking-tight uppercase mb-3 font-outfit">Premium Active</h4>
                  <p className="text-slate-500 text-sm leading-relaxed font-medium">
                    Enjoy full access to the AudioLab, Custom Song Submission, and all professional Rehearsal Hubs.
                  </p>
                </div>
            </div>

            <button
              onClick={() => router.push('/home')}
              className="w-full max-w-sm mx-auto h-20 bg-slate-950 text-white rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-emerald-600 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-4"
            >
              <HomeIcon className="w-6 h-6" />
              TAKE ME HOME
            </button>
          </div>
        )}

        {step === 'manage' && isPremiumTier && (
          <div className="max-w-5xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
            <div className="flex flex-col md:flex-row items-baseline justify-between gap-8 mb-16 px-2">
              <div>
                <h2 className="text-4xl font-black text-slate-100 tracking-tighter font-outfit uppercase leading-none mb-4">Subscription</h2>
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* Left Column - Membership Info */}
              <div className="lg:col-span-2 space-y-8">
                {/* Dashboard Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 group transition-all">
                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100/50 rounded-2xl flex items-center justify-center mb-6">
                      <Crown className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Plan</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">Active Member</h3>
                    <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                      <CheckCircle className="w-3 h-3" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Premium Access</span>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 group transition-all hover:border-indigo-100">
                    <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110">
                      <Calendar className="w-6 h-6 text-slate-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Next Payment</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none uppercase">
                      {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'No Expiry'}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 mt-4 uppercase tracking-widest">
                      {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString('en-US', { year: 'numeric' }) : 'Full Access'}
                    </p>
                  </div>
                </div>

                {/* Billing History Integrated */}
                {paymentHistory.length > 0 && (
                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Payment Records</h3>
                      <CreditCard className="w-4 h-4 text-slate-300" />
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <tbody className="divide-y divide-slate-50">
                          {paymentHistory.map((payment) => (
                            <tr key={payment.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="px-8 py-5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Reference</p>
                                <p className="text-sm font-bold text-slate-900 tracking-tight">#{payment.paymentCode?.substring(0, 8) || payment.id.substring(0, 8)}</p>
                              </td>
                              <td className="px-8 py-5">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Amount</p>
                                <p className="text-sm font-black text-slate-950 tracking-tight">{payment.amount / 100} ESPEE</p>
                              </td>
                              <td className="px-8 py-5 text-right">
                                <div className="w-10 h-10 border border-slate-100 rounded-xl flex items-center justify-center text-slate-300 ml-auto">
                                  <Info className="w-5 h-5" />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column - Actions & Details */}
              <div className="space-y-8">
                <div className="p-8 rounded-[2.5rem] bg-slate-950 text-white shadow-2xl shadow-indigo-900/10">
                  <p className="text-sm text-slate-300 leading-relaxed font-medium mb-8">
                    Your account has full access. All professional instruments and rehearsal hubs are unlocked.
                  </p>
                  
                  <button
                    onClick={() => router.push('/home')}
                    className="w-full h-14 bg-white text-slate-950 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-500 hover:text-white transition-all active:scale-95 shadow-xl"
                  >
                    <HomeIcon className="w-4 h-4" />
                    Home
                  </button>
                </div>

                {isIndividualPremium && (
                  <div className="p-8 rounded-[2.5rem] border border-rose-100 bg-rose-50/30">
                    <button
                      onClick={handleCancelSubscription}
                      disabled={isCancelling}
                      className="w-full h-12 border border-rose-200 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isCancelling ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Cancel Premium
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

