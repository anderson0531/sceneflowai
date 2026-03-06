'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Film, Presentation, BookOpen, ArrowRight, Sparkles, Users, Target } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TemplateCard {
  id: string;
  title: string;
  subtitle: string;
  duration: string;
  icon: React.ElementType;
  color: {
    bg: string;
    border: string;
    icon: string;
    badge: string;
  };
  steps: string[];
  idealFor: string;
  credits: string;
}

const templates: TemplateCard[] = [
  {
    id: 'documentary',
    title: 'The Historical Documentary',
    subtitle: 'Archival footage meets AI narration',
    duration: '30 min',
    icon: BookOpen,
    color: {
      bg: 'from-amber-500/10 to-orange-500/5',
      border: 'border-amber-500/30',
      icon: 'text-amber-400',
      badge: 'bg-amber-500/20 text-amber-400',
    },
    steps: [
      'Paste your research & outline',
      'AI generates narrator script',
      'Add reference images or generate',
      'Preview with Ken Burns animation',
    ],
    idealFor: 'Educators, History channels, Museum content',
    credits: '~150 credits',
  },
  {
    id: 'pitch',
    title: 'The Agency Pitch',
    subtitle: 'Concept-to-client in 30 minutes',
    duration: '20 min',
    icon: Presentation,
    color: {
      bg: 'from-purple-500/10 to-violet-500/5',
      border: 'border-purple-500/30',
      icon: 'text-purple-400',
      badge: 'bg-purple-500/20 text-purple-400',
    },
    steps: [
      'Input client brief & brand guidelines',
      'Generate 3 concept variations',
      'Create mood boards automatically',
      'Export pitch deck + animatic',
    ],
    idealFor: 'Agencies, Freelancers, Brand managers',
    credits: '~200 credits',
  },
  {
    id: 'essay',
    title: 'The Video Essay',
    subtitle: 'YouTube-ready thought leadership',
    duration: '25 min',
    icon: Film,
    color: {
      bg: 'from-cyan-500/10 to-blue-500/5',
      border: 'border-cyan-500/30',
      icon: 'text-cyan-400',
      badge: 'bg-cyan-500/20 text-cyan-400',
    },
    steps: [
      'Outline your argument structure',
      'AI expands into full script',
      'Generate B-roll suggestions',
      'Record or use AI voiceover',
    ],
    idealFor: 'YouTubers, Thought leaders, Course creators',
    credits: '~175 credits',
  },
];

const TemplateCardComponent = ({ template, index }: { template: TemplateCard; index: number }) => {
  const Icon = template.icon;
  
  return (
    <motion.div
      className={`relative p-6 rounded-2xl bg-gradient-to-br ${template.color.bg} border ${template.color.border} backdrop-blur-sm group hover:scale-[1.02] transition-transform duration-300`}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
    >
      {/* Duration Badge */}
      <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${template.color.badge} flex items-center gap-1`}>
        <Clock className="w-3 h-3" />
        {template.duration}
      </div>
      
      {/* Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gray-900/50 flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${template.color.icon}`} />
        </div>
        <div>
          <h4 className="text-lg font-bold text-white mb-1">{template.title}</h4>
          <p className="text-sm text-gray-400">{template.subtitle}</p>
        </div>
      </div>
      
      {/* Steps */}
      <div className="space-y-2 mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Your first 30 minutes</p>
        <ol className="space-y-2">
          {template.steps.map((step, stepIndex) => (
            <li key={stepIndex} className="flex items-start gap-2 text-sm">
              <span className={`w-5 h-5 rounded-full ${template.color.badge} flex items-center justify-center text-xs font-bold flex-shrink-0`}>
                {stepIndex + 1}
              </span>
              <span className="text-gray-300">{step}</span>
            </li>
          ))}
        </ol>
      </div>
      
      {/* Footer */}
      <div className="pt-4 border-t border-white/10 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">Ideal for</p>
          <p className="text-sm text-gray-300">{template.idealFor}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Est. cost</p>
          <p className={`text-sm font-semibold ${template.color.icon}`}>{template.credits}</p>
        </div>
      </div>
      
      {/* Hover CTA */}
      <div className="absolute inset-0 bg-gray-900/90 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
        <Button
          onClick={() => window.location.href = `/?signup=1&template=${template.id}`}
          className={`bg-gradient-to-r ${template.color.bg.replace('/10', '')} ${template.color.bg.replace('/5', '')} text-white px-6 py-3`}
        >
          Start with this template
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
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-purple-400 mr-2" />
            <span className="text-sm md:text-base font-medium text-purple-400">Quick Start Templates</span>
          </div>
          <h2 className="landing-section-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Your First 30 Minutes
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Pick a template that matches your goal. SceneFlow guides you from blank page to preview in one session.
          </p>
        </motion.div>

        {/* Template Cards Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {templates.map((template, index) => (
            <TemplateCardComponent key={template.id} template={template} index={index} />
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
          <div className="inline-flex items-center gap-6 p-4 rounded-xl bg-gray-800/50 border border-gray-700/50">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-300">No experience required</span>
            </div>
            <div className="w-px h-6 bg-gray-700" />
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-300">AI guides every step</span>
            </div>
            <div className="w-px h-6 bg-gray-700" />
            <Button
              variant="outline"
              onClick={() => window.location.href = '/?signup=1'}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              Browse all templates
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
