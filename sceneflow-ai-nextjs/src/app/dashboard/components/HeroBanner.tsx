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

      {/* Cue AI Assistant Integration - Now with subtle accent border */}
      <div className="bg-sf-surface-light p-4 rounded-lg mt-6 border border-sf-primary/20 shadow-sm">
        <div className="flex justify-between items-center">
          {/* Content (Left) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sf-primary/10 rounded-lg flex items-center justify-center border border-sf-primary/30">
              <MessageCircle className="w-5 h-5 text-sf-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sf-text-primary">Cue AI Assistant</h3>
              <p className="text-sm text-sf-text-secondary font-medium">
                Your creative partner for video production. Ask Cue anything about your project.
              </p>
            </div>
          </div>
          
          {/* CTA (Right) - Now the ONLY solid accent color element */}
          <button
            onClick={handleCueChat}
            className="bg-sf-primary hover:bg-sf-primary-dark text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            Chat with Cue
          </button>
        </div>
      </div>
    </motion.div>
  )
}
