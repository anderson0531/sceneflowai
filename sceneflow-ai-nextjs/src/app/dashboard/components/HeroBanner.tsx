'use client'

import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useEnhancedStore } from '@/store/enhancedStore'

interface HeroBannerProps {
  userName: string
}

export function HeroBanner({ userName }: HeroBannerProps) {
  const { setCueAssistantOpen } = useEnhancedStore()

  const handleCueChat = () => {
    setCueAssistantOpen(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-sf-surface rounded-xl shadow-xl p-6 sm:p-8 border border-sf-primary/20"
    >
      {/* Personalized Greeting */}
      <h1 className="text-3xl font-bold text-sf-text-primary">
        Welcome back, {userName}! 🎬
      </h1>
      
      <p className="text-lg mt-2 text-sf-text-secondary font-medium">
        Ready to bring your next video idea to life? Let&apos;s create something amazing together.
      </p>

      {/* Cue AI Assistant Integration - Enhanced with blue accent border and background */}
      <div className="bg-gradient-to-r from-blue-900/20 to-blue-800/10 p-6 rounded-xl mt-6 border-2 border-blue-500/40 shadow-lg backdrop-blur-sm">
        <div className="flex justify-between items-center">
          {/* Content (Left) */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center border-2 border-blue-400/40 shadow-lg">
              <MessageCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Cue AI Assistant</h3>
              <p className="text-base text-blue-100 font-medium">
                Your creative partner for video production. Ask Cue anything about your project.
              </p>
            </div>
          </div>
          
          {/* CTA (Right) - Enhanced with blue accent */}
          <button
            onClick={handleCueChat}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold transition-all duration-200 hover:scale-105 shadow-xl hover:shadow-2xl border-2 border-blue-400/30"
          >
            <MessageCircle className="w-6 h-6 mr-3" />
            Chat with Cue
          </button>
        </div>
      </div>
    </motion.div>
  )
}
