'use client'

import { motion } from 'framer-motion'
import { Clapperboard } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'
import { useCueStore } from '@/store/useCueStore'

interface HeroBannerProps {
  userName: string
}

export function HeroBanner({ userName }: HeroBannerProps) {
  const { user } = useEnhancedStore()
  const { setSidebarOpen } = useCueStore()

  const handleAskCue = () => {
    setSidebarOpen(true)
  }

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
          Ready to bring your next video idea to life? Let's create something amazing together.
        </motion.p>
      </div>

      {/* Cue Co-Pilot Integration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 p-6 rounded-xl mt-6 border-2 border-blue-500/40 shadow-lg backdrop-blur-sm"
      >
        <div className="flex justify-between items-center">
          {/* Content (Left) */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border-2 border-blue-400/40 shadow-lg">
              <Clapperboard className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Cue Co-Pilot</h3>
              <p className="text-blue-200 text-sm">
                Get guidance on app features, pricing, and customer support
              </p>
            </div>
          </div>
          
          {/* Action Button (Right) */}
          <button 
            onClick={handleAskCue}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
          >
            Ask Cue
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

