'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Eye, Sparkles, Check, Monitor, Film, Mic2, Play, Volume2, VolumeX } from 'lucide-react';

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
    <div className="relative w-full max-w-2xl mx-auto">
      <motion.div
        className="relative rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-cyan-500/20 to-amber-500/20 rounded-2xl blur-xl -z-10" />
        
        {/* Video */}
        <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
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
          
          {/* Audio toggle button */}
          <button
            onClick={toggleMute}
            className={`absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-lg border transition-all ${
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
        </div>
      </motion.div>
    </div>
  );
};

// Feature Item Component
const FeatureItem = ({ 
  icon: Icon, 
  title, 
  description, 
  color,
  delay 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string; 
  color: string;
  delay: number;
}) => {
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600 border-blue-500/30',
    purple: 'from-purple-500 to-purple-600 border-purple-500/30',
    green: 'from-green-500 to-green-600 border-green-500/30',
    cyan: 'from-cyan-500 to-cyan-600 border-cyan-500/30',
  };

  return (
    <motion.div
      className="flex items-start gap-4"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorClasses[color]} flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-6 h-6 text-white" />
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
            <span className="text-white font-semibold">Core Concept:</span> Decouple Direction (inexpensive) from Rendering (expensive).
          </p>
        </motion.div>

        {/* Video Illustration */}
        <div className="mb-16">
          <FirewallVideo />
        </div>

        {/* Screening Room Engine Features */}
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">
            <span className="text-amber-400">&apos;Screening Room&apos;</span> Engine
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureItem
              icon={Sparkles}
              title="Logic"
              description="Gemini 2.5 Pro generates scripts and scene descriptions at minimal cost."
              color="blue"
              delay={0.1}
            />
            <FeatureItem
              icon={Film}
              title="Visuals"
              description="Imagen 3 generates static storyboards and character-consistent assets."
              color="purple"
              delay={0.2}
            />
            <FeatureItem
              icon={Eye}
              title="Preview"
              description="Client-side animation (Ken Burns) allows directors to 'watch' the film at near-zero cost."
              color="green"
              delay={0.3}
            />
            <FeatureItem
              icon={Play}
              title="Render"
              description="Only finalized, approved scenes trigger expensive Veo 3.1 video generation."
              color="cyan"
              delay={0.4}
            />
          </div>
        </motion.div>

        {/* Key Metric Badge */}
        <motion.div
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl blur-xl opacity-30" />
            
            {/* Badge */}
            <div className="relative bg-gradient-to-r from-amber-500 to-orange-600 px-8 py-6 rounded-2xl border-2 border-amber-400/50 shadow-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">Key Metric</p>
                  <p className="text-white text-2xl font-bold">
                    Reduces the &apos;Prompt-to-Video&apos; ratio from <span className="text-slate-900">20:1</span> to <span className="text-slate-900">3:1</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
