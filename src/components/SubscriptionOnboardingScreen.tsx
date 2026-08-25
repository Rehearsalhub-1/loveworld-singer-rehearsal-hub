"use client";

import { useState } from 'react'
import { Check, CreditCard, Shield, Star, ChevronRight, X } from 'lucide-react'

interface SubscriptionOnboardingScreenProps {
  onComplete: () => void
  onBack: () => void
}

export default function SubscriptionOnboardingScreen({ onComplete, onBack }: SubscriptionOnboardingScreenProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [isProcessing, setIsProcessing] = useState(false)

  const plans = {
    monthly: {
      name: 'Monthly Plan',
      price: '1.2 ESPEES',
      nairaPrice: '₦2,460',
      period: 'per month',
      savings: null,
      features: [
        'Access to all rehearsal songs',
        'Download offline content',
        'Priority support',
        'Exclusive updates'
      ]
    },
    yearly: {
      name: 'Yearly Plan',
      price: '12 ESPEES',
      nairaPrice: '₦24,600',
      period: 'per year',
      savings: 'Save 2.4 ESPEES (₦4,920)',
      features: [
        'Access to all rehearsal songs',
        'Download offline content',
        'Priority support',
        'Exclusive updates',
        'Early access to new features',
        'Premium audio quality'
      ]
    }
  }

  const handlePayment = async () => {
    setIsProcessing(true)
    
    // Simulate ESPEES payment integration
    try {
      // In a real app, you would integrate with ESPEES API here
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate successful payment
      onComplete()
    } catch (error) {
 console.error('Payment failed:', error)
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-y-auto">
      {/* Back Button */}
      <div className="absolute top-6 left-6 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors touch-target"
        >
          <ChevronRight className="w-6 h-6 rotate-180" />
          <span className="text-sm font-medium">Back</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col justify-center px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="LoveWorld Praise Logo" 
              className="object-contain w-[120px] h-[120px]"
            />
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Unlock the full LoveWorld Singers Rehearsal Hub experience with our premium subscription
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="max-w-4xl mx-auto w-full mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Monthly Plan */}
            <div 
              className={`relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                selectedPlan === 'monthly' 
                  ? 'border-purple-500 bg-purple-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
              onClick={() => setSelectedPlan('monthly')}
            >
              {selectedPlan === 'monthly' && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plans.monthly.name}</h3>
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-purple-600">{plans.monthly.price}</span>
                    <span className="text-gray-600">{plans.monthly.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">≈ {plans.monthly.nairaPrice}</p>
                </div>
                
                <ul className="space-y-3 text-left">
                  {plans.monthly.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Yearly Plan */}
            <div 
              className={`relative p-8 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                selectedPlan === 'yearly' 
                  ? 'border-purple-500 bg-purple-50 shadow-lg' 
                  : 'border-gray-200 bg-white hover:border-purple-300'
              }`}
              onClick={() => setSelectedPlan('yearly')}
            >
              {selectedPlan === 'yearly' && (
                <div className="absolute top-4 right-4">
                  <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900">{plans.yearly.name}</h3>
                  <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded-full">
                    {plans.yearly.savings}
                  </span>
                </div>
                <div className="mb-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-4xl font-bold text-purple-600">{plans.yearly.price}</span>
                    <span className="text-gray-600">{plans.yearly.period}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">≈ {plans.yearly.nairaPrice}</p>
                </div>
                
                <ul className="space-y-3 text-left">
                  {plans.yearly.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Section */}
        <div className="max-w-md mx-auto w-full">
          <div className="bg-gray-50 rounded-2xl p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Payment Method
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 font-bold text-sm">ES</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">ESPEES</p>
                    <p className="text-sm text-gray-600">Secure payment platform</p>
                  </div>
                </div>
                <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Your payment is secure and encrypted</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">{plans[selectedPlan].name}</span>
                <span className="font-medium">{plans[selectedPlan].price}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Naira equivalent</span>
                <span>{plans[selectedPlan].nairaPrice}</span>
              </div>
              {plans[selectedPlan].savings && (
                <div className="flex justify-between text-green-600">
                  <span>Savings</span>
                  <span className="font-medium">{plans[selectedPlan].savings}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-purple-600">{plans[selectedPlan].price}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Subscribe Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full py-4 bg-purple-600 text-white font-semibold rounded-xl transition-colors duration-200 shadow-lg hover:shadow-xl touch-target hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Subscribe with ESPEES
              </>
            )}
          </button>

          {/* Trust Indicators */}
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>4.9/5 Rating</span>
            </div>
            <div className="flex items-center gap-1">
              <Shield className="w-4 h-4 text-green-500" />
              <span>Secure Payment</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
