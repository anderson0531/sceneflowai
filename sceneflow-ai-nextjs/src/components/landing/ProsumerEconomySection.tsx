'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Briefcase, Camera, Youtube, Building2, GraduationCap, Smartphone, Server, Clapperboard, Sparkles, Volume2, VolumeX } from 'lucide-react';

// Video Illustration Component with Audio Toggle
const ProsumerVideo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto mb-12">
      <motion.div
        className="relative rounded-2xl overflow-hidden border-2 border-purple-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        {/* Glow effect */}
        <div className="absolute -inset-2 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl -z-10" />
        
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
            poster="/demo/prosumer-economy-poster.jpg"
          >
            <source src="/demo/prosumer-economy-illustration.mp4#t=0.1" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Audio toggle button */}
          <button
            onClick={toggleMute}
            className={`absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 backdrop-blur-sm rounded-lg border transition-all ${
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
        </div>
      </motion.div>
    </div>
  );
};

// Column Card Component (simplified without illustration)
const ColumnCard = ({
  title,
  badge,
  badgeColor,
  points,
  delay
}: {
  title: string;
  badge: string;
  badgeColor: string;
  points: { icon: React.ElementType; text: string }[];
  delay: number;
}) => {
  const badgeColors: Record<string, string> = {
    amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
    purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
    cyan: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400',
  };

  return (
    <motion.div
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all duration-300"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
    >
      {/* Badge */}
      <div className="p-6 pb-0">
        <div className={`inline-flex px-3 py-1.5 rounded-full border text-sm font-medium ${badgeColors[badgeColor]}`}>
          {badge}
        </div>
      </div>

      {/* Title */}
      <div className="px-6 pt-4 pb-4">
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      {/* Points */}
      <div className="p-6 pt-4 space-y-3">
        {points.map((point, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center flex-shrink-0">
              <point.icon className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-gray-300 text-sm">{point.text}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default function ProsumerEconomySection() {
  return (
    <section className="py-24 bg-gradient-to-b from-slate-900 to-slate-950 relative overflow-hidden">
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
            <Users className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-sm font-medium text-purple-400">Target Market</span>
          </div>
          <h2 className="landing-section-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            Powering the{' '}
            <span className="bg-gradient-to-r from-amber-400 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
              &apos;Prosumer&apos;
            </span>
            <br className="hidden sm:block" />
            Creator Economy
          </h2>
          <p className="text-lg text-gray-400 max-w-3xl mx-auto">
            Hollywood tools for non-Hollywood budgets. We&apos;re building for the creator
            who demands professional quality without the professional price tag.
          </p>
        </motion.div>

        {/* Video Illustration */}
        <ProsumerVideo />

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ColumnCard
            badge="Target"
            badgeColor="amber"
            title="The 'Mid-Market' Storyteller"
            points={[
              { icon: Camera, text: 'Indie Filmmakers' },
              { icon: Youtube, text: 'YouTubers & Creators' },
              { icon: Building2, text: 'Agencies & Studios' },
              { icon: GraduationCap, text: 'Educators & Trainers' },
            ]}
            delay={0.1}
          />

          <ColumnCard
            badge="The Gap"
            badgeColor="purple"
            title="Between 'TikTok Toys' and 'Hollywood Pipelines'"
            points={[
              { icon: Smartphone, text: 'Simple mobile apps lack control' },
              { icon: Server, text: 'Maya/Unreal require expertise' },
              { icon: Sparkles, text: 'SceneFlow bridges the divide' },
            ]}
            delay={0.2}
          />

          <ColumnCard
            badge="Market Timing"
            badgeColor="cyan"
            title="YouTube is Shifting..."
            points={[
              { icon: TrendingUp, text: 'Long-form content is rising' },
              { icon: Clapperboard, text: 'Cinema-quality is expected' },
              { icon: Briefcase, text: 'Creators need pro tools, not render farms' },
            ]}
            delay={0.3}
          />
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <p className="text-xl text-gray-300 mb-6">
            <span className="text-white font-semibold">Creators need tools that offer Hollywood control</span>
            {' '}without Hollywood render farms.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-2xl">🎬</span>
              <span className="text-gray-300 text-sm">Professional Grade</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-2xl">💰</span>
              <span className="text-gray-300 text-sm">Creator Budget</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-800/50 px-4 py-2 rounded-full border border-slate-700">
              <span className="text-2xl">⚡</span>
              <span className="text-gray-300 text-sm">10x Faster</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
