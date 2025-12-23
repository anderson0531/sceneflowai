'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Target, Image, Brain, Edit3, Volume2, VolumeX, Maximize2 } from 'lucide-react';

// Video Illustration Component with Audio Toggle
const OneTakeVideo = () => {
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
        className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl -z-10" />
        
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
            poster="/demo/one-take-frame-anchored-poster.jpg"
          >
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/one-take-frame-anchored.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Audio toggle button */}
            <button
              onClick={toggleMute}
              className={`flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-lg border transition-all ${
                isMuted 
                  ? 'bg-cyan-600/90 border-cyan-400/30 hover:bg-cyan-500/90' 
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
      <div className="w-10 h-10 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-cyan-400" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg mb-1">{title}</h4>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};

export default function OneTakeSection() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 70% 30%, rgba(6, 182, 212, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 30% 70%, rgba(59, 130, 246, 0.08) 0%, transparent 40%)
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
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
            <Target className="w-4 h-4 text-cyan-400 mr-2" />
            <span className="text-sm font-medium text-cyan-400">Precision Generation</span>
          </div>
          <h2 className="landing-section-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
              One Take
            </span>
            {' '}Frame-Anchored
            <br className="hidden sm:block" />
            Precision Video Generation
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            High-quality anchor frames eliminate AI hallucinations and character drift.
          </p>
        </motion.div>

        {/* Two Column Layout: Video Left, Features Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Video */}
          <OneTakeVideo />

          {/* Right: Feature Cards + Thought Question */}
          <div className="space-y-8">
            <FeatureCard
              icon={Image}
              title="High-Quality Anchor Frames"
              description="Uses precisely crafted starting and ending frame images to guide video generation. The AI knows exactly where to begin and end."
              delay={0.2}
            />
            <FeatureCard
              icon={Brain}
              title="Eliminates Hallucinations & Drift"
              description="Anchor frames prevent model drift, ensuring characters and scenes remain consistent throughout the entire video segment."
              delay={0.4}
            />
            <FeatureCard
              icon={Edit3}
              title="Edit vs. Regenerate"
              description="Built-in video editor allows frame-level refinements without costly full regeneration cycles. Fix issues surgically, not destructively."
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
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 rounded-xl p-6">
                <p className="text-cyan-400 font-semibold text-lg mb-2">
                  💡 What if you could get it right in one take?
                </p>
                <p className="text-gray-400 text-sm">
                  Frame-anchored generation reduces wasted attempts from 20+ takes down to just 1-3 takes—an 85% cost reduction that transforms video production economics.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
