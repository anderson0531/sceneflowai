'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Play, Gift } from 'lucide-react'

export function EvolutionCTA() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-amber-500/20" />
      <div className="absolute inset-0 bg-gray-950/90" />
      
      {/* Animated Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full border border-amber-500/30 bg-amber-500/10 mb-8">
            <Gift className="w-4 h-4 text-amber-400 mr-2" />
            <span className="text-sm font-medium text-amber-400">Early Access: Start Free Today</span>
          </div>

          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Your next viral video{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400">
              starts with an idea
            </span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-4 max-w-3xl mx-auto">
            Stop stacking tabs. Stop watching tutorials. Stop wishing you had time.
          </p>
          <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
            SceneFlow AI transforms your ideas into professional short-form videos in minutes—not days. 
            The tools you need, the quality you want, the speed you deserve.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <motion.a
              href="/signup"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all group"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Start Creating for Free
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </motion.a>
            
            <motion.a
              href="/demo"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center px-8 py-4 rounded-xl border border-gray-600 text-white font-semibold text-lg hover:border-purple-500/50 hover:bg-purple-500/10 transition-all group"
            >
              <Play className="w-5 h-5 mr-2" />
              Watch Platform Demo
            </motion.a>
          </div>

          {/* Trust Line */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <p className="text-sm text-gray-500 mb-4">No credit card required · Cancel anytime · Full platform access</p>
            
            {/* Microcopy */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-400">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Ships production-ready MP4s
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse" />
                Powered by Imagen 3 + ElevenLabs
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                Google Cloud infrastructure
              </span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
