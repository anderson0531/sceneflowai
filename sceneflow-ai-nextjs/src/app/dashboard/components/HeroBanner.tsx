'use client'

import { motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'

interface HeroBannerProps {
  userName: string
}

export function HeroBanner({ userName }: HeroBannerProps) {
  const { setCueAssistantOpen } = useStore()

  const handleCueChat = () => {
    setCueAssistantOpen(true)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-xl p-6 sm:p-8 text-white"
    >
      {/* Personalized Greeting */}
      <h1 className="text-3xl font-bold">
        Welcome back, {userName}! 🎬
      </h1>
      
      <p className="text-lg mt-2 opacity-90">
        Ready to bring your next video idea to life? Let&apos;s create something amazing together.
      </p>

      {/* Cue AI Assistant Integration */}
      <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg mt-6">
        <div className="flex justify-between items-center">
          {/* Content (Left) */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Cue AI Assistant</h3>
              <p className="text-sm text-white/80">
                Your creative partner for video production. Ask Cue anything about your project.
              </p>
            </div>
          </div>
          
          {/* CTA (Right) */}
          <button
            onClick={handleCueChat}
            className="bg-yellow-400 text-gray-900 font-bold px-6 py-3 rounded-lg hover:bg-yellow-500 transition-colors duration-200"
          >
            Chat with Cue
          </button>
        </div>
      </div>
    </motion.div>
  )
}
