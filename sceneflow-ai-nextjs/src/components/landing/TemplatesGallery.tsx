'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Film, Presentation, BookOpen, ArrowRight, Sparkles, Users, Target, Clapperboard, Mic, GraduationCap, Palette } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ProductionCard {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
  color: {
    bg: string;
    border: string;
    icon: string;
    badge: string;
  };
  workflow: string[];
  tools: string;
  benefit: string;
}

const productions: ProductionCard[] = [
  {
    id: 'drama',
    title: 'The Cinematic Drama',
    subtitle: '10-episode thriller with locked characters',
    badge: 'Series-Ready',
    icon: Clapperboard,
    color: {
      bg: 'from-purple-500/10 to-cyan-500/5',
      border: 'border-purple-500/30',
      icon: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-400',
    },
    workflow: [
      'Series Studio locks protagonist across 10 episodes',
      'Designer Mode: Photorealistic or Cinematic Noir',
      'Production Bible ensures visual continuity',
      'Export 4K Widescreen or 9:16 Social Thrillers',
    ],
    tools: 'Series Studio → Writer\'s Room → Visualizer',
    benefit: 'No character drift across episodes',
  },
  {
    id: 'animation',
    title: 'The Animated Comedy',
    subtitle: 'Stylized art with perfect face recognition',
    badge: 'Multi-Style',
    icon: Palette,
    color: {
      bg: 'from-amber-500/10 to-orange-500/5',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-400',
    },
    workflow: [
      'Writer\'s Room: Genre-aware dialogue polishing',
      'Toggle: Anime (90s), Ghibli-esque, Comic Book',
      'Character recognition works across art styles',
      'Audience Resonance™ optimizes comedic timing',
    ],
    tools: 'Writer\'s Room → Visualizer → Screening Room',
    benefit: 'Consistent characters in any style',
  },
  {
    id: 'podcast',
    title: 'The AI-First Podcast',
    subtitle: '20-episode educational series',
    badge: 'Multi-Episode',
    icon: Mic,
    color: {
      bg: 'from-cyan-500/10 to-blue-500/5',
      border: 'border-cyan-500/30',
      icon: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-400',
    },
    workflow: [
      'Shared Production Bible for 20 episodes',
      'Resonance tool identifies pacing issues',
      'Concept Art or Digital Illustration backgrounds',
      '800+ voices with cloning for your host',
    ],
    tools: 'Series Studio → Smart Editor → Screening Room',
    benefit: 'One voice, 20 episodes, zero drift',
  },
  {
    id: 'training',
    title: 'The Corporate Training',
    subtitle: 'Research outline to 15-part series',
    badge: 'Global Deploy',
    icon: GraduationCap,
    color: {
      bg: 'from-emerald-500/10 to-teal-500/5',
      border: 'border-emerald-500/30',
      icon: 'text-emerald-400',
      badge: 'bg-emerald-500/20 text-emerald-400',
    },
    workflow: [
      'Convert research outline into training modules',
      'Series Studio manages 15-part curriculum',
      '32-language dubbing with automated lip-sync',
      'One-click global deployment',
    ],
    tools: 'Series Studio → Smart Editor → Export',
    benefit: 'Train worldwide teams instantly',
  },
];

const ProductionCardComponent = ({ production, index }: { production: ProductionCard; index: number }) => {
  const Icon = production.icon;
  
  return (
    <motion.div
      className={`relative p-6 rounded-2xl bg-gradient-to-br ${production.color.bg} border ${production.color.border} backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${production.color.badge} flex items-center gap-1`}>
        <Sparkles className="w-3 h-3" />
        {production.badge}
      </div>
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gray-900/50 flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${production.color.icon}`} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-white mb-1">{production.title}</h4>
          <p className="text-sm text-gray-400">{production.subtitle}</p>
        </div>
      </div>
      
      {/* Steps */}
      {/* Workflow */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Production Workflow</p>
        <ol className="space-y-2">
          {production.workflow.map((step, stepIndex) => (
            <li key={stepIndex} className="flex items-start gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full ${production.color.badge} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                {stepIndex + 1}
              </span>
              <span className="text-gray-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      
      {/* Tools Flow */}
      <div className="mb-4 px-3 py-2 rounded-lg bg-gray-900/50 border border-gray-700/30">
        <p className="text-xs text-gray-500 mb-1">Tools</p>
        <p className={`text-xs font-medium ${production.color.icon}`}>{production.tools}</p>
      </div>
      
      {/* Footer - Benefit */}
      <div className="pt-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <Target className={`w-4 h-4 ${production.color.icon}`} />
          <p className={`text-sm font-medium ${production.color.icon}`}>{production.benefit}</p>
        </div>
      </div>
      
      {/* Hover CTA */}
      <div className="absolute inset-0 bg-gray-900/90 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <Button
          onClick={() => window.location.href = `/?signup=1&production=${production.id}`}
          className={`bg-gradient-to-r ${production.color.bg.replace('/10', '')} ${production.color.bg.replace('/5', '')} text-white px-6 py-3`}
        >
          Start This Production
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );
};

export default function TemplatesGallery() {
  return (
    <section id="templates" className="py-24 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.06) 0%, transparent 40%),
              radial-gradient(circle at 80% 50%, rgba(6, 182, 212, 0.06) 0%, transparent 40%)
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
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <Clapperboard className="w-4 h-4 md:w-5 md:h-5 text-purple-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-purple-400">Production Showcase</span>
          </div>
          <h2 className="landing-section-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Start Any Production Style
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            From cinematic dramas to corporate training—choose your format, style, and resolution. The Series Studio adapts to your vision.
          </p>
        </motion.div>

        {/* Production Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {productions.map((production, index) => (
            <ProductionCardComponent key={production.id} production={production} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="inline-flex flex-wrap items-center justify-center gap-4 md:gap-6 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Clapperboard className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-gray-300">Series Studio manages continuity</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-gray-700" />
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              <span className="text-sm text-gray-300">Audience Resonance™ optimizes scripts</span>
            </div>
            <div className="hidden md:block w-px h-6 bg-gray-700" />
            <Button
              variant="outline"
              onClick={() => window.location.href = '/?signup=1'}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              Start Your Production
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
