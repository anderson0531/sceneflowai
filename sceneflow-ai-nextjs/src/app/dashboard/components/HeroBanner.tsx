'use client'

import { motion } from 'framer-motion'
import { MessageCircle, Sparkles, Download, Video } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'

interface HeroBannerProps {
  userName: string
}

export function HeroBanner({ userName }: HeroBannerProps) {
  const { user } = useEnhancedStore()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-sm rounded-2xl border border-gray-700/50 shadow-2xl p-8"
    >
      {/* Welcome Message */}
      <div className="text-center mb-8">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-4xl md:text-5xl font-bold text-white mb-4"
        >
          Welcome back, {userName} 👋
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-xl text-gray-300 font-medium max-w-3xl mx-auto leading-relaxed"
        >
          Automate your pre-production pipeline with AI-powered analysis, then choose your path: export assets for external filming or generate AI videos with BYOK.
        </motion.p>
      </div>

      {/* Dual Workflow Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Phase 1: Pre-Production Suite */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 p-6 rounded-xl border-2 border-blue-500/40 shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border-2 border-blue-400/40 shadow-lg">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Phase 1: Pre-Production Suite</h3>
              <p className="text-blue-200 text-sm">Uses Analysis Credits</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">Script Analysis & Ideation</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">AI-Powered Storyboarding</span>
            </div>
            <div className="flex items-center gap-3 text-blue-100">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-sm">Scene Direction & Control</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
            <p className="text-xs text-blue-200 text-center">
              <strong>Export Assets:</strong> Download pre-production materials for your filming team
            </p>
          </div>
        </motion.div>

        {/* Phase 2: AI Generation */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 p-6 rounded-xl border-2 border-orange-500/40 shadow-lg backdrop-blur-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center border-2 border-orange-400/40 shadow-lg">
              <Video className="w-6 h-6 text-orange-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-1">Phase 2: AI Generation</h3>
              <p className="text-orange-200 text-sm">🔑 BYOK Required</p>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-orange-100">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-sm">AI Video Generation</span>
            </div>
            <div className="flex items-center gap-3 text-orange-100">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-sm">Quality Review & Assessment</span>
            </div>
            <div className="flex items-center gap-3 text-orange-100">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-sm">Optimization & Finalization</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
            <p className="text-xs text-orange-200 text-center">
              <strong>Just-in-Time Setup:</strong> Configure your API keys when you're ready to generate
            </p>
          </div>
        </motion.div>
      </div>

      {/* Cue AI Assistant Integration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1.0 }}
        className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 p-6 rounded-xl mt-6 border-2 border-blue-500/40 shadow-lg backdrop-blur-sm"
      >
        <div className="flex justify-between items-center">
          {/* Content (Left) */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border-2 border-blue-400/40 shadow-lg">
              <MessageCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Cue AI Assistant</h3>
              <p className="text-blue-200 text-sm">
                Get guidance on workflow, BYOK setup, and export options
              </p>
            </div>
          </div>
          
          {/* Action Button (Right) */}
          <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40">
            Ask Cue
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
