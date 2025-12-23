'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Sparkles, Camera, Volume2, VolumeX, Maximize2 } from 'lucide-react';

// Video Illustration Component with Audio Toggle
const ProsumerVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className={`relative w-full mx-auto transition-all duration-300 ${isExpanded ? 'max-w-3xl' : 'max-w-md'}`}>
      <motion.div
        className="relative rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        layout
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl -z-10" />
        
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
            poster="/demo/prosumer-economy-poster.jpg"
          >
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Create_an_effective_1080p_202512231445.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Audio toggle button */}
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-lg border transition-all ${
                isMuted 
                  ? 'bg-purple-600/90 border-purple-400/30 hover:bg-purple-500/90' 
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
              onClick={() => setIsExpanded(!isExpanded)}
              className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-lg border transition-all ${isExpanded ? 'bg-purple-600/90 border-purple-400/30' : 'bg-slate-800/90 border-slate-600/30 hover:bg-slate-700/90'}`}
              title={isExpanded ? 'Shrink' : 'Expand'}
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
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-purple-400" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg md:text-xl mb-1">{title}</h4>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function ProsumerEconomySection() {
  return (
    <section id="creators" className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 50%, rgba(245, 158, 11, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 75% 50%, rgba(168, 85, 247, 0.08) 0%, transparent 40%)
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
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <Users className="w-4 h-4 md:w-5 md:h-5 text-purple-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-purple-400">Target Market</span>
          </div>
          <h2 className="landing-section-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6">
            Powering the{' '}
            <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-amber-400 bg-clip-text text-transparent">
              &apos;Prosumer&apos;
            </span>
            <br className="hidden sm:block" />
            <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl">Creator Economy</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto">
            Hollywood tools for non-Hollywood budgets.
          </p>
        </motion.div>

        {/* Two Column Layout: Video Left, Features Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Video */}
          <ProsumerVideo />

          {/* Right: Feature Cards + Thought Question */}
          <div className="space-y-8">
            <FeatureCard
              icon={Camera}
              title="The 'Mid-Market' Storyteller"
              description="Indie filmmakers, YouTubers, agencies, and educators who demand professional quality without the professional price tag. You're not amateur—you're prosumer."
              delay={0.2}
            />
            <FeatureCard
              icon={Sparkles}
              title="Bridging the Gap"
              description="Simple mobile apps lack control. Maya and Unreal require expertise. SceneFlow bridges the divide—offering Hollywood-grade direction tools without the Hollywood learning curve."
              delay={0.4}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Perfect Market Timing"
              description="YouTube is shifting to long-form. Cinema-quality is expected. Creators need professional tools, not render farms. The prosumer moment is now."
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
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-6">
                <p className="text-purple-400 font-semibold text-base md:text-lg lg:text-xl mb-2">
                  💡 What if Hollywood-grade tools were accessible to every creator?
                </p>
                <p className="text-gray-400 text-sm md:text-base">
                  SceneFlow delivers professional control without professional complexity—so the next generation of storytellers can compete on vision, not budget.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
