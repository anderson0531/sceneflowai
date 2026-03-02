'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { ArrowRight, Play, Sparkles, Zap, Film, Mic2, Video, Wand2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export function EvolutionHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.08),transparent_50%)]" />
      </div>

      {/* Animated Grid */}
      <div className="absolute inset-0 opacity-20">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
          }} 
        />
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-2 h-2 rounded-full ${
              i % 3 === 0 ? 'bg-cyan-400' : i % 3 === 1 ? 'bg-purple-400' : 'bg-amber-400'
            }`}
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            animate={{ 
              y: [0, -20, 0], 
              opacity: [0.3, 0.8, 0.3] 
            }}
            transition={{ 
              duration: 3 + Math.random() * 2, 
              repeat: Infinity, 
              delay: Math.random() * 2 
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <motion.div 
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/10 via-red-500/10 to-yellow-500/10 border border-white/20 rounded-full mb-8 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Image 
              src="/images/google-cloud-logo.png" 
              alt="Google Cloud" 
              width={24} 
              height={24} 
              className="mr-2"
            />
            <span className="text-sm md:text-base font-medium text-white">
              Powered by Gemini, Imagen 4 & Veo 3.1
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            className="mb-6 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-2">
              From Idea to Viral Video
            </span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400">
              Without the Friction
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            SceneFlow AI transforms your creative vision into production-ready YouTube videos 
            using the same AI technology powering Hollywood&apos;s virtual production studios.
          </motion.p>

          {/* Value Props */}
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mb-10 text-gray-400"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
              <Video className="w-4 h-4 text-cyan-400" />
              <span className="text-sm">No camera crew</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
              <Film className="w-4 h-4 text-purple-400" />
              <span className="text-sm">No editing suite</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-sm">No $10K equipment</span>
            </div>
          </motion.div>

          {/* Emphasis */}
          <motion.p
            className="text-lg text-gray-400 italic mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Just your imagination.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.8 }}
          >
            <Link href="/signup">
              <Button 
                size="lg" 
                className="group bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white font-semibold px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 hover:shadow-purple-500/40 hover:scale-105"
              >
                <Zap className="mr-2 h-5 w-5" />
                Start Creating Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button 
              size="lg" 
              variant="outline"
              className="group border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 px-8 py-6 text-lg rounded-xl transition-all duration-300"
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Credit Offer */}
          <motion.p
            className="mt-6 text-sm text-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1.0 }}
          >
            🎬 1,500 free credits to bring your first video to life
          </motion.p>
        </motion.div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-950 to-transparent" />
    </section>
  )
}
