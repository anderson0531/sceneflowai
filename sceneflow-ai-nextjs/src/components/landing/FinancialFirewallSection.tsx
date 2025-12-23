'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Film, Eye, Volume2, VolumeX, Maximize2 } from 'lucide-react';

// Video Illustration Component with Audio Toggle
const FirewallVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      <motion.div
        className="relative rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-2xl blur-xl -z-10" />
        
        {/* Video */}
        <div className="aspect-[4/3] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover"
            poster="/demo/financial-firewall-poster.jpg"
          >
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/financial-firewall-illustration.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Audio toggle button */}
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-lg border transition-all ${
                isMuted 
                  ? 'bg-amber-600/90 border-amber-400/30 hover:bg-amber-500/90' 
                  : 'bg-slate-800/90 border-cyan-400/30 hover:bg-slate-700/90'
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-white" />
                  <span className="text-xs font-medium text-white">🎵 Unmute</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-xs font-medium text-cyan-300">Sound On</span>
                </>
              )}
            </button>
            
            {/* Expand/Fullscreen button */}
            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              className="flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-lg border transition-all bg-slate-800/90 border-slate-600/30 hover:bg-slate-700/90"
              title="Fullscreen"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Feature Card Component (matches SlotMachineSection pattern)
const FeatureCard = ({ 
  icon: Icon, 
  title, 
  description, 
  delay 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  delay: number;
}) => {
  return (
    <motion.div
      className="flex items-start gap-4"
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-amber-400" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg mb-1">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function FinancialFirewallSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, rgba(245, 158, 11, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 70% 70%, rgba(6, 182, 212, 0.08) 0%, transparent 40%)
            `
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <Shield className="w-4 h-4 text-amber-400 mr-2" />
            <span className="text-sm font-medium text-amber-400">The Solution</span>
          </div>
          <h2 className="landing-section-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            The{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              &apos;Financial Firewall&apos;
            </span>
            <br className="hidden sm:block" />
            for Video Production
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Decouple Direction (inexpensive) from Rendering (expensive).
          </p>
        </motion.div>

        {/* Two Column Layout: Video Left, Features Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Video */}
          <FirewallVideo />

          {/* Right: Feature Cards + Thought Question */}
          <div className="space-y-8">
            <FeatureCard
              icon={Sparkles}
              title="Logic Layer (Cheap)"
              description="Gemini 2.5 Pro generates scripts and scene descriptions at minimal cost. Iterate on your story infinitely without touching your video budget."
              delay={0.2}
            />
            <FeatureCard
              icon={Film}
              title="Visual Layer (Cheap)"
              description="Imagen 3 generates static storyboards and character-consistent assets. Preview your entire film as an animated storyboard."
              delay={0.4}
            />
            <FeatureCard
              icon={Eye}
              title="Preview Layer (Free)"
              description="Client-side Ken Burns animation lets directors 'watch' the film at near-zero cost. Refine pacing, cuts, and timing before spending a dime."
              delay={0.6}
            />

            {/* Thought Question Box */}
            <motion.div 
              className="pt-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
                <p className="text-amber-400 font-semibold text-lg mb-2">
                  💡 What if video rendering only happened once—when you&apos;re 100% ready?
                </p>
                <p className="text-gray-400 text-sm">
                  SceneFlow&apos;s Financial Firewall ensures expensive Veo 3.1 generation only triggers on finalized, approved scenes—reducing the prompt-to-video ratio from 20:1 to 3:1.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
