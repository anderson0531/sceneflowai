'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Users, 
  Image, 
  Package, 
  Volume2, 
  Film, 
  Play, 
  Coffee,
  Sparkles,
  MousePointerClick,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';

interface AutomationCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  highlight: string;
  delay: number;
  gradient: string;
}

const AutomationCard = ({ 
  icon: Icon, 
  title, 
  description, 
  highlight,
  delay,
  gradient
}: AutomationCardProps) => {
  return (
    <motion.div
      className="group relative bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/10"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4 }}
    >
      {/* Glow effect on hover */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/0 to-blue-500/0 group-hover:from-cyan-500/5 group-hover:to-blue-500/5 transition-all duration-300" />
      
      {/* Icon with gradient background */}
      <div className={`relative w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4 shadow-lg`}>
        <Icon className="w-7 h-7 text-white" />
        {/* One-click badge */}
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg">
          <MousePointerClick className="w-3 h-3 text-white" />
        </div>
      </div>
      
      {/* Content */}
      <h3 className="relative text-xl font-bold text-white mb-2">{title}</h3>
      <p className="relative text-gray-400 text-sm leading-relaxed mb-3">{description}</p>
      
      {/* Highlight tag */}
      <div className="relative inline-flex items-center px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
        <Zap className="w-3 h-3 text-cyan-400 mr-1.5" />
        <span className="text-xs text-cyan-300 font-medium">{highlight}</span>
      </div>
    </motion.div>
  );
};

const automationFeatures: Omit<AutomationCardProps, 'delay'>[] = [
  {
    icon: Users,
    title: 'Character References',
    description: 'Automatically build character portraits with selected voice profiles and wardrobe. Ready for your review and AI-assisted revisions.',
    highlight: 'Ready in seconds',
    gradient: 'from-violet-500 to-violet-600'
  },
  {
    icon: Image,
    title: 'Scene References',
    description: 'Generate complete scene compositions with proper lighting, framing, and atmosphere. Review and refine with AI guidance.',
    highlight: 'Visual consistency',
    gradient: 'from-blue-500 to-blue-600'
  },
  {
    icon: Package,
    title: 'Object References',
    description: 'Build key object references that maintain visual identity across all scenes. Props, vehicles, and story-critical items.',
    highlight: 'Continuity ensured',
    gradient: 'from-indigo-500 to-indigo-600'
  },
  {
    icon: Volume2,
    title: 'Audio Generation',
    description: 'Generate professional audio with ElevenLabs voices for a single scene or your entire screenplay. Character-matched voices.',
    highlight: 'Full cast in minutes',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  {
    icon: Film,
    title: 'Scene Segments',
    description: 'Build 8-second video segments with anchor frames and optimized prompts. Perfect for Screening Room review and distribution.',
    highlight: 'Pitch-ready output',
    gradient: 'from-amber-500 to-amber-600'
  },
  {
    icon: Play,
    title: 'Batch Video Rendering',
    description: 'Generate all video scenes in batch mode. Take a 30-minute break and return to review your complete film in the Screening Room.',
    highlight: 'Hands-free production',
    gradient: 'from-rose-500 to-rose-600'
  }
];

export default function AutomationSection() {
  return (
    <section id="automation" className="py-24 bg-slate-950 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(6, 182, 212, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 80% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)
            `
          }}
        />
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
            backgroundSize: '64px 64px'
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
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
            <Zap className="w-4 h-4 md:w-5 md:h-5 text-cyan-400 mr-2" />
            <span className="text-cyan-300 text-sm md:text-base font-medium">Effortless Production</span>
          </div>
          
          {/* Headline */}
          <h2 className="landing-section-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6">
            <span className="text-white">One Click.</span>{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Full Production.
            </span>
          </h2>
          
          {/* Subtitle */}
          <p className="text-base md:text-lg lg:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Stop copy-pasting between AI tools. SceneFlow AI automates every generation step—
            from character portraits to final video—so you focus on <span className="text-white font-medium">creative direction</span>, not tedious workflows.
          </p>
        </motion.div>

        {/* Automation Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {automationFeatures.map((feature, index) => (
            <AutomationCard
              key={feature.title}
              {...feature}
              delay={0.1 + index * 0.1}
            />
          ))}
        </div>

        {/* Bottom Callout */}
        <motion.div
          className="relative bg-gradient-to-r from-slate-800/80 via-slate-800/60 to-slate-800/80 rounded-2xl p-8 md:p-10 border border-slate-700/50 overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* Background accent */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Left: Message */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                <Coffee className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold text-white mb-1">
                  The "Coffee Break" Workflow
                </h3>
                <p className="text-gray-400 text-sm md:text-base">
                  Click <span className="text-cyan-300 font-medium">Generate All</span>, take a break, return to your complete film.
                  <br className="hidden md:block" />
                  <span className="text-gray-500">Perfect for agency pitches, studio contracts, and indie filmmaker funding decks.</span>
                </p>
              </div>
            </div>
            
            {/* Right: CTA */}
            <Link 
              href="/?signup=1"
              className="group inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/25 transition-all duration-300 whitespace-nowrap"
            >
              Start Automating
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
