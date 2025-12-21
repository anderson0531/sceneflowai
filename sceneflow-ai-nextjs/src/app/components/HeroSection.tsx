'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { Play, ArrowRight, Sparkles, Film, Mic2, Video, Users } from 'lucide-react'

export function HeroSection() {
  const [isDemoOpen, setIsDemoOpen] = useState(false)
  return (
    <motion.section 
      className="relative py-24 md:py-32 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(139,92,246,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.08),transparent_50%)]" />
      </div>
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: '64px 64px'
        }} />
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-20 left-[10%] w-2 h-2 bg-cyan-400 rounded-full"
          animate={{ y: [0, -20, 0], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 4, repeat: Infinity }}
        />
        <motion.div
          className="absolute top-40 right-[15%] w-3 h-3 bg-purple-400 rounded-full"
          animate={{ y: [0, 25, 0], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 5, repeat: Infinity, delay: 1 }}
        />
        <motion.div
          className="absolute bottom-32 left-[20%] w-1.5 h-1.5 bg-amber-400 rounded-full"
          animate={{ y: [0, -15, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          {/* Badge */}
          <motion.div 
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-amber-500/10 border border-cyan-500/20 rounded-full mb-8 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Sparkles className="w-4 h-4 text-cyan-400 mr-2" />
            <span className="text-sm font-medium bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Powered by Gemini 2.5 Pro, Veo 3.1 & ElevenLabs
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            From Idea to
            <span className="block bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Cinematic Reality
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            The AI-powered virtual production studio that transforms your creative vision into 
            professional films. Generate scripts, create consistent characters, produce stunning 
            videos with voice acting—all in one platform.
          </motion.p>

          {/* Key Capabilities Pills */}
          <motion.div 
            className="flex flex-wrap justify-center gap-3 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            {[
              { icon: Film, label: 'AI Script Generation', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10' },
              { icon: Users, label: 'Character Consistency', color: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
              { icon: Video, label: 'Video Generation', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
              { icon: Mic2, label: 'AI Voice Acting', color: 'text-green-400 border-green-500/30 bg-green-500/10' },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-4 py-2 rounded-full border ${item.color} backdrop-blur-sm`}>
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium text-white">{item.label}</span>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <Button
              size="lg"
              onClick={() => window.location.href = '/?signup=1'}
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white px-8 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              Start Creating Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="border-gray-600 text-gray-200 hover:bg-white/10 hover:text-white hover:border-gray-400 px-8 py-4 text-lg font-semibold transition-all duration-200"
              onClick={() => setIsDemoOpen(true)}
            >
              <Play className="w-5 h-5 mr-2 fill-current" />
              Watch Demo
            </Button>
          </motion.div>

          {/* Microcopy */}
          <motion.p 
            className="text-sm text-gray-500 mb-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            No credit card required • 1,000 free credits to start
          </motion.p>
          
          {/* Hero Visual Placeholder */}
          <motion.div 
            className="relative max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
          >
            {/* Browser Frame */}
            <div className="relative rounded-xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/10">
              {/* Browser Top Bar */}
              <div className="bg-slate-800/90 backdrop-blur-sm px-4 py-3 flex items-center gap-2 border-b border-white/5">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-slate-900/50 rounded-md text-xs text-gray-400 font-mono">
                    sceneflow-ai.com/virtual-production
                  </div>
                </div>
              </div>
              
              {/* Screenshot/Video Placeholder */}
              <div className="aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center relative">
                {/* PLACEHOLDER: Replace with actual app screenshot or demo video */}
                <div className="text-center p-8">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6 cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => setIsDemoOpen(true)}
                  >
                    <Play className="w-10 h-10 text-white/80 ml-1" />
                  </div>
                  <p className="text-gray-400 font-medium mb-2">📸 PLACEHOLDER: App Screenshot</p>
                  <p className="text-sm text-gray-600">Recommended: Virtual Production UI screenshot (1920×1080)</p>
                </div>
                
                {/* Decorative overlay elements */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-300">Virtual Production Studio</span>
                </div>
              </div>
            </div>
            
            {/* Glow effect behind */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-amber-500/20 rounded-2xl blur-2xl -z-10" />
          </motion.div>
        </motion.div>
      </div>
      
      <DemoVideoModal 
        open={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
        src="/demo/sceneflow-demo.mp4" 
        poster="/demo/sceneflow-poster.jpg" 
      />
    </motion.section>
  )
}
