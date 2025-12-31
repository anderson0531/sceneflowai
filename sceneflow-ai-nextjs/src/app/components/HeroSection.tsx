'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { Play, ArrowRight, Sparkles, Film, Mic2, Video, Users, Volume2, VolumeX } from 'lucide-react'
import { useRef } from 'react'

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
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-amber-500/10 border border-cyan-500/20 rounded-full mb-8 backdrop-blur-sm"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 mr-2" />
            <span className="text-sm md:text-base font-medium bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              Powered by Industry-Leading AI Generation
            </span>
          </motion.div>

          {/* Main Headline */}
          <motion.h1 
            className="mb-8 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white">From Idea to</span>
            <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400">
              Published Video
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            Go from napkin idea to <span className="text-white font-semibold">professional-quality video</span>—at a 
            fraction of traditional production costs. One platform. Zero tool-juggling. Complete creative control.
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
              Start for $9
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
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2 }}
          >
            <p className="text-sm text-gray-400">
              <span className="text-amber-400 font-medium">☕ Less than two coffees</span>
              <span className="text-gray-500 mx-2">•</span>
              <span>Test drive with 1,000 credits</span>
              <span className="text-gray-500 mx-2">•</span>
              <span className="text-gray-500">Explorer • $9</span>
            </p>
          </motion.div>

          {/* Early Access Social Proof (merged from SocialProof section) */}
          <motion.div 
            className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 mb-16 py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-amber-500/5 border border-white/5 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4 }}
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
          
          {/* Hero Visual Placeholder */}
          <motion.div 
            className="relative max-w-5xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.3 }}
          >
            {/* Video Frame */}
            <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-purple-500/20">
              
              {/* Hero Demo Video */}
              <div className="aspect-[16/9] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden group">
                <video
                  ref={videoRef}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  className="w-full h-full object-cover"
                  poster="/demo/hero-poster.jpg"
                >
                  <source src="/demo/hero-demo.mp4#t=0.1" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
                
                {/* Status badge overlay */}
                <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm rounded-lg border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-gray-300">Virtual Production Studio</span>
                </div>
                
                {/* Audio toggle button - minimal transparent icon */}
                <button
                  onClick={toggleMute}
                  className="absolute bottom-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <VolumeX className="w-5 h-5 text-white/80" />
                  ) : (
                    <Volume2 className="w-5 h-5 text-white/80" />
                  )}
                </button>
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
        src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/sceneflow-demo-v2.mp4" 
        poster="/demo/sceneflow-poster.jpg" 
      />
    </motion.section>
  )
}
