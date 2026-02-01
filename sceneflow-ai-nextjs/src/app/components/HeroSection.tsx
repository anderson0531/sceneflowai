'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { Play, ArrowRight, Sparkles, Film, Mic2, Video, Users, Volume2, VolumeX, Workflow } from 'lucide-react'
import { useRef } from 'react'
import Image from 'next/image'
import { PipelineFlow } from '@/components/landing/PipelineFlow'

export function HeroSection() {
  const [isDemoOpen, setIsDemoOpen] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted
      setIsMuted(!isMuted)
    }
  }
  return (
    <motion.section 
      id="hero"
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
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500/10 via-red-500/10 to-yellow-500/10 border border-white/20 rounded-full mb-8 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Image 
              src="/images/google-cloud-logo.png" 
              alt="Google Cloud" 
              width={24} 
              height={24} 
              className="mr-2"
            />
            <span className="text-sm md:text-base font-medium text-white">
              Powered by Google Cloud
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            className="mb-8 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white">The AI Studio</span>
            <span className="block text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400">
              That Adapts to You
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Use our <span className="text-white font-semibold">specialized tools</span> to solve a single problem, or connect them for a seamless <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-semibold">Concept-to-Publish</span> production workflow—powered by Google&apos;s Veo 3 and Gemini 3.0.
          </motion.p>

          {/* Pipeline Visual - The Living Pipeline */}
          <motion.div
            className="mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            <PipelineFlow 
              className="max-w-5xl mx-auto"
              onModuleClick={(moduleId) => {
                const element = document.getElementById(`module-${moduleId}`)
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' })
                }
              }}
            />
          </motion.div>

          {/* Workflow Toggle Hint */}
          <motion.div 
            className="flex flex-wrap justify-center gap-3 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
          >
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm">
              <Workflow className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-300">Hover modules to explore • Click to learn more</span>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
          >
            <Button
              size="lg"
              onClick={() => window.location.href = '/?signup=1'}
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white px-8 py-4 text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
            >
              Start a Project
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button
              variant="outline"
              size="lg"
              className="border-gray-600 text-gray-200 hover:bg-white/10 hover:text-white hover:border-gray-400 px-8 py-4 text-lg font-semibold transition-all duration-200"
              onClick={() => {
                const element = document.getElementById('pricing')
                if (element) element.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              View Pricing
            </Button>
          </motion.div>

          {/* Microcopy */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.4 }}
          >
            <p className="text-sm text-gray-400">
              <span className="text-emerald-400 font-medium">✓ Pay only for what you use</span>
              <span className="text-gray-500 mx-2">•</span>
              <span>Base access from $29/mo</span>
              <span className="text-gray-500 mx-2">•</span>
              <span className="text-gray-500">Credits for AI generation</span>
            </p>
          </motion.div>

          {/* Early Access Social Proof (merged from SocialProof section) */}
          <motion.div 
            className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-amber-500/5 border border-white/5 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.6 }}
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-gray-300 font-medium">Early Access Available</span>
            </div>
            <div className="hidden md:block w-px h-4 bg-gray-700" />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-300">New features shipping monthly</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      <DemoVideoModal 
        open={isDemoOpen} 
        onClose={() => setIsDemoOpen(false)} 
        src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/sceneflow-demo-v2.mp4" 
        poster="/demo/sceneflow-poster.jpg" 
      />
    </motion.section>
  )
}
