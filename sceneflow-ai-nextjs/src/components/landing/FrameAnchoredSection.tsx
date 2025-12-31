'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Layers, Anchor, Sparkles, Film, Clapperboard, Check, Zap, Image, Brain, Edit3, Volume2, VolumeX, Maximize2, Target } from 'lucide-react';

// Frame-Anchored Precision Video Component
const FrameAnchoredVideo = () => {
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
        className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        layout
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
          >
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/one-take-frame-anchored.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white/80" />
              ) : (
                <Volume2 className="w-4 h-4 text-white/80" />
              )}
            </button>
            
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
              title={isExpanded ? 'Shrink' : 'Expand'}
            >
              <Maximize2 className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Feature Card Component for precision features
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
      <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
      </div>
      <div>
        <h4 className="text-white font-semibold text-lg md:text-xl mb-1">{title}</h4>
        <p className="text-gray-400 text-sm md:text-base leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
};


export default function FrameAnchoredSection() {
  return (
    <section id="architecture" className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 50% 0%, rgba(59, 130, 246, 0.15) 0%, transparent 40%),
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '100% 100%, 64px 64px, 64px 64px'
          }}
        />
        {/* Circuit pattern on corners */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-20">
          <div 
            className="w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(45deg, transparent 45%, rgba(59, 130, 246, 0.3) 45%, rgba(59, 130, 246, 0.3) 55%, transparent 55%),
                linear-gradient(-45deg, transparent 45%, rgba(59, 130, 246, 0.3) 45%, rgba(59, 130, 246, 0.3) 55%, transparent 55%)
              `,
              backgroundSize: '20px 20px'
            }}
          />
        </div>
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
          <div className="inline-flex items-center px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
            <Anchor className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-blue-400">Technical Architecture</span>
          </div>
          <h2 className="landing-section-heading text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6">
            Built for{' '}
            <span className="landing-gradient-text bg-gradient-to-r from-blue-400 via-purple-500 to-amber-500 bg-clip-text text-transparent">
              Frame-Anchored Precision
            </span>
            <span className="landing-gradient-text block text-4xl sm:text-5xl md:text-6xl lg:text-7xl">on Google Cloud</span>
          </h2>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto">
            A purpose-built architecture that leverages Google&apos;s most advanced AI models 
            to deliver professional-grade video production.
          </p>
        </motion.div>

        {/* Core Concept Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-slate-700">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h4 className="text-white font-semibold text-base md:text-lg mb-2">The Brain</h4>
            <p className="text-gray-400 text-sm md:text-base">Gemini 3.0 Pro handles all script generation and creative logic.</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-slate-700">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4">
              <Layers className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h4 className="text-white font-semibold text-base md:text-lg mb-2">The Visualizer</h4>
            <p className="text-gray-400 text-sm md:text-base">Imagen 3 creates storyboards and style-consistent visual assets.</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-slate-700">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mb-4">
              <Anchor className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h4 className="text-white font-semibold text-base md:text-lg mb-2">The Engine</h4>
            <p className="text-gray-400 text-sm md:text-base">Veo 3.1 renders final video with frame-anchored precision.</p>
          </div>
        </motion.div>

        {/* Why Veo? Callout */}
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-blue-500/20 rounded-2xl blur-2xl" />
            
            {/* Card */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl border border-amber-500/20">
              <div className="flex items-start gap-6">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3">
                    Why <span className="text-amber-400">Veo 3.1</span>?
                  </h3>
                  <p className="text-gray-300 text-base md:text-lg lg:text-xl leading-relaxed mb-4">
                    It is the only model capable of precise <span className="text-amber-400 font-semibold">Frame Anchoring</span>—essential for professional continuity.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300 text-xs md:text-sm">Scene-to-scene consistency</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300 text-xs md:text-sm">Character continuity</span>
                    </div>
                    <div className="flex items-center gap-2 bg-slate-700/50 px-3 py-2 rounded-lg">
                      <Check className="w-4 h-4 text-green-400" />
                      <span className="text-gray-300 text-xs md:text-sm">Style persistence</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Frame-Anchored Precision: Video + Features (merged from OneTakeSection) */}
        <motion.div
          className="mt-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Subsection Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
              <Target className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 mr-2" />
              <span className="text-sm md:text-base font-medium text-cyan-400">Precision Generation</span>
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
              <span className="landing-gradient-text bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-500 bg-clip-text text-transparent">
                One Take
              </span>
              {' '}Precision
            </h3>
            <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
              High-quality anchor frames eliminate AI hallucinations and character drift.
            </p>
          </div>

          {/* Two Column Layout: Video Left, Features Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Video */}
            <FrameAnchoredVideo />

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
                  <p className="text-cyan-400 font-semibold text-base md:text-lg lg:text-xl mb-2">
                    💡 What if you could get it right in one take?
                  </p>
                  <p className="text-gray-400 text-sm md:text-base">
                    Frame-anchored generation reduces wasted attempts from 20+ takes down to just 1-3 takes—an 85% cost reduction that transforms video production economics.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  );
}
