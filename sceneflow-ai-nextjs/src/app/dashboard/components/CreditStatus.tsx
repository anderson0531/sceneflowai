'use client'

import { motion } from 'framer-motion'
import { CreditCard, Key, Zap, Download, Video } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'

export function CreditStatus() {
  const { user, byokSettings } = useEnhancedStore()

  if (!user) return null

  const hasValidBYOK = byokSettings.videoGenerationProvider.isConfigured

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.6 }}
      className="bg-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Credits & Access</h2>
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-gray-400" />
          <span className="text-sm text-gray-400">Account Status</span>
        </div>
      </div>

      {/* Credits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Analysis Credits - Phase 1 */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-5 rounded-xl border-2 border-blue-500/40 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/40">
              <Zap className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Analysis Credits</h3>
              <p className="text-blue-200 text-sm">Phase 1: Pre-Production Suite</p>
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
          
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-xs text-blue-200 text-center">
              <strong>Export Assets:</strong> Download pre-production materials for external filming
            </p>
          </div>
        </div>

        {/* BYOK Status - Phase 2 */}
        <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 p-5 rounded-xl border-2 border-orange-500/40 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-500/40">
              <Key className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">BYOK Status</h3>
              <p className="text-orange-200 text-sm">Phase 2: AI Generation</p>
            </div>
          </div>
          
          <div className="text-center mb-4">
            <div className={`text-2xl font-bold mb-1 ${hasValidBYOK ? 'text-green-400' : 'text-orange-400'}`}>
              {hasValidBYOK ? '✅ Configured' : '🔑 Required'}
            </div>
            <div className="text-orange-200 text-sm">
              {hasValidBYOK ? 'Ready for AI Generation' : 'Setup Required'}
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-orange-100">
              <span>Video Generation:</span>
              <span className={hasValidBYOK ? 'text-green-400' : 'text-orange-400'}>
                {hasValidBYOK ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            <div className="flex justify-between text-orange-100">
              <span>Quality Review:</span>
              <span className={hasValidBYOK ? 'text-green-400' : 'text-orange-400'}>
                {hasValidBYOK ? '✅ Available' : '❌ Locked'}
              </span>
            </div>
            <div className="flex justify-between text-orange-100">
              <span>Optimization:</span>
              <span className={hasValidBYOK ? 'text-green-400' : 'text-orange-400'}>
                {hasValidBYOK ? '✅ Available' : '❌ Locked'}
              </span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
            <p className="text-xs text-orange-200 text-center">
              <strong>Just-in-Time:</strong> Configure API keys when ready to generate
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Info */}
      <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-1">
              Subscription Plan
            </h4>
            <p className="text-white font-medium">{user.subscriptionTier}</p>
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-400">Monthly Credits</p>
            <p className="text-white font-semibold">{user.monthlyCredits}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <button className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 flex items-center justify-center gap-2">
          <Download className="w-4 h-4" />
          Manage Credits
        </button>
        
        <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 flex items-center justify-center gap-2">
          <Key className="w-4 h-4" />
          {hasValidBYOK ? 'Update BYOK' : 'Setup BYOK'}
        </button>
      </div>
    </motion.div>
  )
}
