'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Video, Play, Building2, Film, Sparkles, Volume2, VolumeX, Maximize2 } from 'lucide-react';

interface UseCase {
  id: string;
  persona: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  challenge: string;
  solution: string;
  outcome: string;
  videoUrl?: string; // Actual video URL
}

const useCases: UseCase[] = [
  {
    id: 'content-creator',
    persona: 'Content Creator',
    icon: Video,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 to-orange-600/10',
    challenge: 'Creating professional video content requires expensive equipment, editing software, and hours of post-production—limiting output to 2-3 videos per week.',
    solution: 'SceneFlow AI transforms ideas into polished short films with AI-generated scripts, consistent characters, and professional voiceovers in minutes, not days.',
    outcome: '10x content velocity with studio-quality production. One creator now produces daily narrative content that previously required a full production team.',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Jul_16__0705_34s_202512231713_zzqmk.mp4',
  },
  {
    id: 'agency-studio',
    persona: 'Agency / Studio',
    icon: Building2,
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 to-blue-600/10',
    challenge: 'Client pitches require expensive sizzle reels and concept videos. Teams spend weeks on pre-visualization that may never get approved.',
    solution: 'Generate pitch-ready concept videos in hours. Iterate on client feedback instantly with AI-powered revisions and consistent brand styling.',
    outcome: 'Win more pitches with lower upfront investment. Agencies report 60% reduction in pre-production costs and 3x faster turnaround on client concepts.',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Jul_16__0705_24s_202512231746_xzz58.mp4',
  },
  {
    id: 'indie-filmmaker',
    persona: 'Indie Filmmaker',
    icon: Film,
    gradient: 'from-purple-500 to-pink-600',
    bgGradient: 'from-purple-500/10 to-pink-600/10',
    challenge: 'Limited budgets make it impossible to visualize ambitious stories. Traditional pre-vis tools are prohibitively expensive for independent projects.',
    solution: 'Bring your screenplay to life with AI storyboards, character designs, and animatic videos—all maintaining visual consistency across every scene.',
    outcome: 'Festival-quality proof of concepts on indie budgets. Filmmakers use SceneFlow outputs to secure funding, attract talent, and greenlight productions.',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Jul_16__0705_24s_202512231846_2egwk.mp4',
  },
];

// Video Player Component with Controls
const VideoPlayer = ({ useCase }: { useCase: UseCase }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  // If no video URL, show placeholder
  if (!useCase.videoUrl) {
    return (
      <div className="relative aspect-video bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden group">
        {/* Gradient background */}
        <div className={`absolute inset-0 bg-gradient-to-br ${useCase.bgGradient} opacity-50`} />
        
        {/* Play button */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${useCase.gradient} flex items-center justify-center shadow-2xl cursor-pointer`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </motion.div>
        </div>
        
        {/* Coming Soon label */}
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm font-medium">Video Coming Soon</span>
        </div>
        
        {/* Persona label */}
        <div className="absolute top-4 right-4">
          <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${useCase.gradient} text-white text-xs font-semibold`}>
            {useCase.persona}
          </div>
        </div>
      </div>
    );
  }

  // Video player with controls
  return (
    <div className={`relative w-full mx-auto transition-all duration-300 ${isExpanded ? 'max-w-4xl' : ''}`}>
      <motion.div
        className={`relative rounded-2xl overflow-hidden border-2 shadow-2xl`}
        style={{ borderColor: useCase.gradient.includes('amber') ? 'rgba(245, 158, 11, 0.3)' : useCase.gradient.includes('cyan') ? 'rgba(6, 182, 212, 0.3)' : 'rgba(168, 85, 247, 0.3)' }}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        layout
      >
        {/* Glow effect */}
        <div className={`absolute -inset-2 bg-gradient-to-r ${useCase.bgGradient} rounded-2xl blur-xl -z-10 opacity-50`} />
        
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
          >
            <source src={`${useCase.videoUrl}#t=0.1`} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* Persona label */}
          <div className="absolute top-3 right-3">
            <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${useCase.gradient} text-white text-xs font-semibold shadow-lg`}>
              {useCase.persona}
            </div>
          </div>
          
          {/* Video controls */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            {/* Audio toggle button */}
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

// Use Case Card Component
const UseCaseCard = ({ useCase, index }: { useCase: UseCase; index: number }) => {
  const isEven = index % 2 === 0;
  const Icon = useCase.icon;

  return (
    <motion.div
      className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      {/* Content - alternates sides on desktop */}
      <div className={`${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${useCase.gradient} flex items-center justify-center shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-white">
            {useCase.persona}
          </h3>
        </div>

        {/* Challenge / Solution / Outcome */}
        <div className="space-y-6">
          {/* Challenge */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-5 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-red-400 text-sm font-semibold uppercase tracking-wide">Challenge</span>
            </div>
            <p className="text-gray-300 leading-relaxed">{useCase.challenge}</p>
          </div>

          {/* Solution */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-5 border border-cyan-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-cyan-500" />
              <span className="text-cyan-400 text-sm font-semibold uppercase tracking-wide">Solution</span>
            </div>
            <p className="text-gray-300 leading-relaxed">{useCase.solution}</p>
          </div>

          {/* Outcome */}
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-5 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-green-400 text-sm font-semibold uppercase tracking-wide">Outcome</span>
            </div>
            <p className="text-gray-300 leading-relaxed">{useCase.outcome}</p>
          </div>
        </div>
      </div>

      {/* Video Player - alternates sides on desktop */}
      <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
        <VideoPlayer useCase={useCase} />
      </div>
    </motion.div>
  );
};

export default function UseCasesSection() {
  return (
    <section className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_60%)]" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6">
            Built for{' '}
            <span className="bg-gradient-to-r from-amber-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Every Creator
            </span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            From solo creators to enterprise studios—see how SceneFlow AI transforms ideas into production-ready content.
          </p>
        </motion.div>

        {/* Use Case Cards */}
        <div className="space-y-24">
          {useCases.map((useCase, index) => (
            <UseCaseCard key={useCase.id} useCase={useCase} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
