'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Video, Play, Building2, Film, Sparkles } from 'lucide-react';

interface UseCase {
  id: string;
  persona: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  challenge: string;
  solution: string;
  outcome: string;
  videoPlaceholder?: string; // Future: actual video URL
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
  },
];

// Video Placeholder Component
const VideoPlaceholder = ({ useCase }: { useCase: UseCase }) => (
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

      {/* Video Placeholder - alternates sides on desktop */}
      <div className={`${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
        <VideoPlaceholder useCase={useCase} />
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
