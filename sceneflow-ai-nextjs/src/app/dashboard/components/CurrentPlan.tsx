'use client'

import { motion } from 'framer-motion'
import { CreditCard, Key, Zap, Plus, CheckCircle, XCircle } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import Link from 'next/link'

export function CurrentPlan() {
  const { user, byokSettings } = useEnhancedStore()

  if (!user) return null

  const hasValidBYOK = Boolean(byokSettings?.videoGenerationProvider?.isConfigured)

  // BYOK provider status
  const byokProviders = [
    {
      name: 'Google Gemini Veo',
      status: byokSettings?.videoGenerationProvider?.name === 'google-veo' && byokSettings?.videoGenerationProvider?.isConfigured,
      icon: '🤖',
      description: 'AI Video Generation'
    },
    {
      name: 'Runway',
      status: String(byokSettings?.videoGenerationProvider?.name) === 'runway' && Boolean(byokSettings?.videoGenerationProvider?.isConfigured),
      icon: '🎬',
      description: 'Creative AI Platform'
    },
    {
      name: 'OpenAI Sora',
      status: byokSettings?.videoGenerationProvider?.name === 'openai' && byokSettings?.videoGenerationProvider?.isConfigured,
      icon: '✨',
      description: 'Advanced Video AI'
    },
    {
      name: 'Anthropic Claude',
      status: byokSettings?.llmProvider?.name === 'anthropic' && byokSettings?.llmProvider?.isConfigured,
      icon: '🧠',
      description: 'LLM & Analysis'
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Current Plan & Access</h2>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-400">Account Overview</span>
        </div>
      </div>

      {/* Plan & Credits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Current Plan */}
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 p-5 rounded-xl border-2 border-purple-500/40 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center border border-purple-500/40">
              <CreditCard className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Current Plan</h3>
              <p className="text-purple-200 text-sm">Subscription Tier</p>
            </div>
          </div>
          
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-purple-300 mb-1 capitalize">{user.subscriptionTier}</div>
            <div className="text-purple-200 text-sm">Active Plan</div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-purple-100">
              <span>Monthly Credits:</span>
              <span className="font-semibold">{user.monthlyCredits}</span>
            </div>
            <div className="flex justify-between text-purple-100">
              <span>Available Credits:</span>
              <span className="font-semibold">{user.credits}</span>
            </div>
          </div>
        </div>

        {/* Project Credits */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-5 rounded-xl border-2 border-blue-500/40 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/40">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Project Credits</h3>
              <p className="text-blue-200 text-sm">Available for Analysis</p>
            </div>
          </div>
          
          <div className="text-center mb-4">
            <div className="text-3xl font-bold text-blue-300 mb-1">{user.credits}</div>
            <div className="text-blue-200 text-sm">Credits Available</div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-blue-100">
              <span>Script Analysis:</span>
              <span>150 credits</span>
            </div>
            <div className="flex justify-between text-blue-100">
              <span>Storyboarding:</span>
              <span>150 credits</span>
            </div>
            <div className="flex justify-between text-blue-100">
              <span>Scene Direction:</span>
              <span>150 credits</span>
            </div>
          </div>
        </div>
      </div>

      {/* BYOK Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">BYOK Status</h3>
          <Link href="/dashboard/settings/byok">
            <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add BYOK
            </button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {byokProviders.map((provider, index) => (
            <div
              key={provider.name}
              className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                provider.status
                  ? 'bg-green-500/10 border-green-500/40'
                  : 'bg-gray-800/50 border-gray-600/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{provider.icon}</span>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-white">{provider.name}</h4>
                  <p className="text-xs text-gray-400">{provider.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {provider.status ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Active</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-400">Not Configured</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/dashboard/settings/billing" className="flex-1">
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" />
            Manage Plan
          </button>
        </Link>
        
        <Link href="/dashboard/settings/byok" className="flex-1">
          <button className="w-full bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center justify-center gap-2">
            <Key className="w-4 h-4" />
            Manage BYOK
          </button>
        </Link>
      </div>
    </motion.div>
  )
}
