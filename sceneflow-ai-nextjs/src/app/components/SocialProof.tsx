'use client'

import { Rocket, Clock, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'

export function SocialProof() {
  return (
    <section className="py-8 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-amber-500/5 border-y border-white/5">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 text-sm">
            <Rocket className="w-4 h-4 text-cyan-400" />
            <span className="text-gray-300">Early Access Available</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-purple-400" />
            <span className="text-gray-300">New features shipping monthly</span>
          </div>
          <div className="hidden md:block w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-gray-300">Built with cutting-edge AI</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}


