'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'
import { DemoVideoModal } from './DemoVideoModal'
import { Play, ArrowRight, Sparkles, Film, Mic2, Video, Users, Volume2, VolumeX, Workflow } from 'lucide-react'
import { useRef } from 'react'
import Image from 'next/image'
import { PipelineFlow } from '@/components/landing/PipelineFlow'

// Hero Quality Reel - Character Consistency Demo
const HeroQualityReel = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <motion.div
      className="relative max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.8 }}
    >
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-amber-500/20 rounded-3xl blur-2xl" />
      
      <div className="relative rounded-2xl overflow-hidden border-2 border-white/10 shadow-2xl">
        {/* Video placeholder - Shows character consistency */}
        <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            poster="/demo/quality-reel-poster.jpg"
          >
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/one-take-frame-anchored.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Character Consistency Badge */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-medium text-white">Same Character, 3 Settings</span>
            </div>
          </div>

          {/* Scene indicator */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2">
            <div className="flex gap-1">
              <span className="px-2 py-1 text-xs rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Medieval</span>
              <span className="px-2 py-1 text-xs rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Modern</span>
              <span className="px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Cinematic</span>
            </div>
          </div>
          
          {/* Video controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-all"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/80" />
              ) : (
                <Volume2 className="w-4 h-4 text-white/80" />  
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Quality indicators */}
      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Veo 3.1 4K Output</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Film className="w-4 h-4 text-purple-400" />
          <span>Frame-Anchored</span>
        </div>
      </div>
    </motion.div>
  );
};

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
            <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white">Stop Gambling on AI Video.</span>
            <span className="block text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400">
              Direct Your Vision with Frame-Anchored Precision™
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p 
            className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            The only production suite that decouples <span className="text-white font-semibold">Creative Direction</span> from <span className="text-white font-semibold">Expensive Rendering</span>. Use Gemini 3.0 and Veo 3.1 to script, storyboard, and iterate for free—then render once with <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-semibold">100% character consistency</span>.
          </motion.p>

          {/* Quality Reel - Character Consistency Demo */}
          <div className="mb-12">
            <HeroQualityReel />
          </div>

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

          {/* Frame-Anchored Precision Badge */}
          <motion.div
            className="flex justify-center mb-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 1.2 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-sm font-semibold text-amber-300">Powered by Frame-Anchored Precision™</span>
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
              Start Your Production
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
            
            <Button
              variant="ghost"
              size="lg"
              className="text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 px-6 py-4 text-base font-medium transition-all duration-200"
              onClick={() => setIsDemoOpen(true)}
            >
              <Play className="w-4 h-4 mr-2" />
              Watch 2-Min Walkthrough
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
              <span className="text-emerald-400 font-medium">✓ 7-Day Money-Back Guarantee</span>
              <span className="text-gray-500 mx-2">•</span>
              <span>Explorer: $9 one-time</span>
              <span className="text-gray-500 mx-2">•</span>
              <span className="text-gray-500">No CC required for free tier</span>
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
