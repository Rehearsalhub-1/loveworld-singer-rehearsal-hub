"use client";

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react'

import { apiClient } from '@/lib/api-client';
const KingsPayService = {
  verifyPayment: async (ref: string) => await apiClient.post('/kingspay/verify', { reference: ref })
};

import { useSubscription } from '@/contexts/SubscriptionContext'

function SubscriptionCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'pending'>('checking')
  const [message, setMessage] = useState('Verifying your payment...')
  const { refreshSubscription } = useSubscription()

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentId = searchParams?.get('id')

      if (!paymentId) {
        setStatus('failed')
        setMessage('Invalid payment reference')
        return
      }

      try {
        // Verify the payment with the backend; the backend owns provider credentials.
        const verification = await KingsPayService.verifyPayment(paymentId) as {
          success?: boolean;
          data?: { status?: string };
          error?: string;
        }

        if (!verification?.success) {
          setStatus('failed')
          setMessage(verification?.error || 'Could not verify payment status')
          return
        }

        const paymentStatus = verification.data || {}

        switch (String(paymentStatus.status || '').toUpperCase()) {
          case 'SUCCESS':
            setStatus('success')
            setMessage('Payment successful! Your subscription has been activated.')
            // Refresh subscription context
            await refreshSubscription()
            // Redirect to home after 3 seconds
            setTimeout(() => router.push('/home?subscribed=true'), 3000)
            break

          case 'WAITING':
            setStatus('pending')
            setMessage('Payment is being processed. Please wait...')
            // Check again after 5 seconds
            setTimeout(verifyPayment, 5000)
            break

          case 'FAILED':
            setStatus('failed')
            setMessage('Payment failed. Please try again.')
            break

          case 'INITIALIZED':
            setStatus('pending')
            setMessage('Payment initialized. Waiting for completion...')
            setTimeout(verifyPayment, 5000)
            break

          default:
            setStatus('failed')
            setMessage('Unknown payment status')
        }
      } catch (error) {
 console.error('Error verifying payment:', error)
        setStatus('failed')
        setMessage('Error verifying payment. Please contact support.')
      }
    }

    verifyPayment()
  }, [searchParams, router])

  return (
    <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {status === 'checking' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Verifying Payment</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'pending' && (
          <>
            <Loader2 className="w-16 h-16 text-yellow-600 animate-spin mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Processing Payment</h2>
            <p className="text-gray-600">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
              <p className="text-green-800 text-sm">
                 Your account has been upgraded to Premium! Redirecting to home...
              </p>
            </div>
            <button
              onClick={() => router.push('/home?subscribed=true')}
              className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
            >
              Go to Home
              <ArrowRight className="w-5 h-5" />
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/subscription')}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/home')}
                className="w-full py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
              >
                Go to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function SubscriptionCallbackPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Loading...</h2>
          <p className="text-gray-600">Please wait</p>
        </div>
      </div>
    }>
      <SubscriptionCallbackContent />
    </Suspense>
  )
}
