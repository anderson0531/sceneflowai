'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Cloud, Cpu, Layers, Anchor, Sparkles, Film, Clapperboard, Check, Zap, Image, Brain, Edit3, Volume2, VolumeX, Maximize2, Target } from 'lucide-react';

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
            poster="/demo/one-take-frame-anchored-poster.jpg"
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

// Google Cloud Architecture Illustration
const GoogleCloudIllustration = () => {
  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <motion.div
        className="relative"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Google Cloud at Top */}
        <div className="flex justify-center mb-8">
          <motion.div
            className="relative"
            animate={{ 
              y: [0, -5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            {/* Cloud glow */}
            <div className="absolute inset-0 bg-blue-500/30 blur-3xl rounded-full" />
            
            {/* Cloud container */}
            <div className="relative bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-sm px-8 py-4 rounded-2xl border border-blue-500/30">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg">
                  {/* Google Cloud Logo Colors */}
                  <Cloud className="w-7 h-7 text-blue-500" />
                </div>
                <div>
                  <p className="text-white font-bold text-base md:text-lg lg:text-xl">Google Cloud</p>
                  <p className="text-blue-300 text-xs md:text-sm">Vertex AI Platform</p>
                </div>
              </div>
            </div>

            {/* Connection lines coming down */}
            <div className="absolute left-1/2 -bottom-8 transform -translate-x-1/2 flex flex-col items-center">
              <motion.div 
                className="w-0.5 h-8 bg-gradient-to-b from-blue-500 to-cyan-500"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <div className="w-3 h-3 bg-cyan-500 rounded-full" />
            </div>
          </motion.div>
        </div>

        {/* Orchestration Label */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-600 flex items-center gap-2">
            <Cpu className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
            <span className="text-gray-300 text-sm md:text-base font-medium">Orchestration</span>
          </div>
        </motion.div>

        {/* Main Architecture Components */}
        <div className="grid grid-cols-3 gap-6">
          {/* The Brain - Gemini 2.5 Pro */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm p-6 rounded-2xl border border-blue-500/30 text-center">
              {/* Icon Container */}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              
              <h4 className="text-white font-bold text-base md:text-lg lg:text-xl mb-1">Gemini 2.5 Pro</h4>
              <p className="text-blue-300 text-xs md:text-sm mb-3">The Brain</p>
              <p className="text-gray-400 text-xs md:text-sm">Script & Logic Generation</p>
              
              {/* Connection dots */}
              <motion.div
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
          </motion.div>

          {/* The Visualizer - Imagen 3 */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 backdrop-blur-sm p-6 rounded-2xl border border-purple-500/30 text-center">
              {/* Icon Container with laptop visual */}
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg relative">
                <Film className="w-8 h-8 text-white" />
                {/* Small grid dots to represent storyboard */}
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-purple-300 rounded grid grid-cols-2 gap-0.5 p-0.5">
                  <div className="bg-purple-600 rounded-sm" />
                  <div className="bg-purple-600 rounded-sm" />
                  <div className="bg-purple-600 rounded-sm" />
                  <div className="bg-purple-600 rounded-sm" />
                </div>
              </div>
              
              <h4 className="text-white font-bold text-base md:text-lg lg:text-xl mb-1">Imagen 3</h4>
              <p className="text-purple-300 text-xs md:text-sm mb-3">The Visualizer</p>
              <p className="text-gray-400 text-xs md:text-sm">Storyboards & Style Reference</p>
              
              {/* Connection dots */}
              <motion.div
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-purple-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
              />
            </div>
          </motion.div>

          {/* The Engine - Veo 3.1 */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-600/10 backdrop-blur-sm p-6 rounded-2xl border border-amber-500/30 text-center">
              {/* Icon Container with gears */}
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                >
                  <Clapperboard className="w-8 h-8 text-white" />
                </motion.div>
                {/* Film strip effect */}
                <motion.div
                  className="absolute -bottom-2 -right-2 w-8 h-8 bg-slate-800 rounded-lg border border-amber-500/50 flex items-center justify-center"
                  animate={{ x: [0, 2, 0], y: [0, -2, 0] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  <Anchor className="w-4 h-4 text-amber-400" />
                </motion.div>
              </div>
              
              <h4 className="text-white font-bold text-base md:text-lg lg:text-xl mb-1">Veo 3.1</h4>
              <p className="text-amber-300 text-xs md:text-sm mb-3">The Engine</p>
              <p className="text-gray-400 text-xs md:text-sm">Final Render</p>
              
              {/* Connection dots */}
              <motion.div
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-amber-500 rounded-full"
                animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
              />
              
              {/* Frame Anchoring label */}
              <motion.div
                className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.8 }}
              >
                <span className="text-amber-400 text-xs font-medium flex items-center gap-1">
                  <Anchor className="w-3 h-3" />
                  Frame Anchoring
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Connecting circuit lines */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: -1 }}>
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(6, 182, 212, 0.5)" />
              <stop offset="50%" stopColor="rgba(168, 85, 247, 0.5)" />
              <stop offset="100%" stopColor="rgba(245, 158, 11, 0.5)" />
            </linearGradient>
          </defs>
        </svg>
      </motion.div>
    </div>
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
            <Cloud className="w-4 h-4 md:w-5 md:h-5 text-blue-400 mr-2" />
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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-slate-700">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center mb-4">
              <Cpu className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h4 className="text-white font-semibold text-base md:text-lg mb-2">Orchestration</h4>
            <p className="text-gray-400 text-sm md:text-base">Cloud Functions & Vertex AI Agents coordinate the entire pipeline.</p>
          </div>

          <div className="bg-slate-800/50 backdrop-blur p-6 rounded-xl border border-slate-700">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h4 className="text-white font-semibold text-base md:text-lg mb-2">The Brain</h4>
            <p className="text-gray-400 text-sm md:text-base">Gemini 2.5 Pro handles all script generation and creative logic.</p>
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

        {/* Architecture Illustration */}
        <div className="mb-16">
          <GoogleCloudIllustration />
        </div>

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
