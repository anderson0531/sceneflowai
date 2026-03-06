'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Sparkles, Film, Eye, Volume2, VolumeX, Maximize2, FileText, Play, Target, DollarSign, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Video Illustration Component with Audio Toggle
const FirewallVideo = () => {
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
        className="relative rounded-2xl overflow-hidden border-2 border-amber-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        layout
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
          >
            <source src="https://xxavfkdhdebrqida.public.blob.vercel-storage.com/demo/financial-firewall-illustration.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Audio toggle button - minimal and transparent */}
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
            
            {/* Expand/Fullscreen button */}
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

// Three-Layer Defense Card Component
const LayerCard = ({ 
  layer,
  icon: Icon, 
  title, 
  subtitle,
  description, 
  outcome,
  costLabel,
  delay 
}: { 
  layer: number;
  icon: React.ElementType; 
  title: string;
  subtitle: string;
  description: string;
  outcome: string;
  costLabel: string;
  delay: number;
}) => {
  const colors = [
    { bg: 'from-cyan-500/20 to-cyan-600/10', border: 'border-cyan-500/30', icon: 'text-cyan-400', badge: 'bg-cyan-500/20 text-cyan-400' },
    { bg: 'from-purple-500/20 to-purple-600/10', border: 'border-purple-500/30', icon: 'text-purple-400', badge: 'bg-purple-500/20 text-purple-400' },
    { bg: 'from-amber-500/20 to-amber-600/10', border: 'border-amber-500/30', icon: 'text-amber-400', badge: 'bg-amber-500/20 text-amber-400' },
  ];
  const color = colors[layer - 1];

  return (
    <motion.div
      className={`relative p-6 rounded-2xl bg-gradient-to-br ${color.bg} border ${color.border} backdrop-blur-sm`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
    >
      <div className={`absolute top-4 right-4 px-2 py-1 rounded-full text-xs font-semibold ${color.badge}`}>
        {costLabel}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gray-900/50 flex items-center justify-center mb-4`}>
        <Icon className={`w-6 h-6 ${color.icon}`} />
      </div>
      <h4 className="text-lg font-bold text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-400 mb-3">{subtitle}</p>
      <p className="text-sm text-gray-300 mb-4">{description}</p>
      <div className="pt-3 border-t border-white/10">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Outcome</p>
        <p className={`text-sm font-medium ${color.icon}`}>{outcome}</p>
      </div>
    </motion.div>
  );
};

export default function FinancialFirewallSection() {
  return (
    <section id="solution" className="py-24 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
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
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <Shield className="w-4 h-4 md:w-5 md:h-5 text-amber-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-amber-400">Non-Destructive AI Editing</span>
          </div>
          <h2 className="landing-section-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4">
            The{' '}
            <span className="landing-gradient-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
              Financial Firewall™
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto mb-2">
            Precision Over &quot;Rerolls&quot;
          </p>
          <p className="text-base md:text-lg text-gray-400 max-w-2xl mx-auto">
            Why SceneFlow costs 85% less than a &quot;Prompt-and-Pray&quot; workflow.
          </p>
        </motion.div>

        {/* Three-Layer Defense Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <LayerCard
            layer={1}
            icon={FileText}
            title="The Blueprint"
            subtitle="Script & Audience Analysis"
            description="Iterate on your story using Gemini 3.0. Get Audience Resonance™ scores and 'Director' feedback before a single pixel is generated."
            outcome="Narrative Logic"
            costLabel="Free / Cheap"
            delay={0.1}
          />
          <LayerCard
            layer={2}
            icon={Play}
            title="The Preview"
            subtitle="The Kinetic Animatic"
            description="Watch your film as an animated storyboard with Ken Burns motion and ElevenLabs audio. Perfect your pacing without spending credits."
            outcome="Timing & Flow"
            costLabel="Near-Zero Cost"
            delay={0.2}
          />
          <LayerCard
            layer={3}
            icon={Target}
            title="The Engine"
            subtitle="Frame-Anchored Rendering"
            description="Only when the edit is 'Locked' do you trigger Veo 3.1. Our Anchor Frames ensure the AI hits your marks exactly."
            outcome="Final Cinematic Render"
            costLabel="Precision"
            delay={0.3}
          />
        </div>

        {/* Cost Comparison Section */}
        <motion.div
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h3 className="text-2xl font-bold text-white text-center mb-8">Show Your Math</h3>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Slot Machine Model */}
            <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">The &quot;Slot Machine&quot; Model</h4>
                  <p className="text-sm text-gray-400">Runway / Sora / Luma</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">20+ &quot;Rerolls&quot; for consistency</span>
                  <span className="text-red-400 font-semibold">$45.00+</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Manual editing & color matching</span>
                  <span className="text-red-400 font-semibold">4 Hours</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-300 font-medium">Total Risk</span>
                  <span className="text-red-400 font-bold">High (No guarantee)</span>
                </div>
              </div>
            </div>

            {/* SceneFlow Way */}
            <div className="p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-lg font-bold text-white">The SceneFlow Way</h4>
                  <p className="text-sm text-gray-400">Frame-Anchored Precision™</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Infinite Blueprint iterations</span>
                  <span className="text-emerald-400 font-semibold">$0.00</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-white/5">
                  <span className="text-gray-400 text-sm">Frame-Anchored &quot;One-Take&quot; generation</span>
                  <span className="text-emerald-400 font-semibold">$2.50</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-300 font-medium">Total Risk</span>
                  <span className="text-emerald-400 font-bold">Zero (AI follows your storyboard)</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Video + Thought Question */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Video */}
          <FirewallVideo />

          {/* Right: Key Points + Thought Question */}
          <div className="space-y-6">
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-1">85% Cost Reduction</h4>
                  <p className="text-gray-400 text-sm">From 20:1 prompt-to-video ratio down to 3:1 with non-destructive editing.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg mb-1">4x Faster Production</h4>
                  <p className="text-gray-400 text-sm">Preview and iterate instantly. Only render when 100% confident.</p>
                </div>
              </div>
            </motion.div>

            {/* Thought Question Box */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-6">
                <p className="text-amber-400 font-semibold text-lg mb-2">
                  💡 What if video rendering only happened once—when you&apos;re 100% ready?
                </p>
                <p className="text-gray-400 text-sm">
                  Professional editors call this &quot;Non-Destructive Editing.&quot; SceneFlow brings this workflow to AI video, ensuring expensive Veo 3.1 generation only triggers on finalized, approved scenes.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
