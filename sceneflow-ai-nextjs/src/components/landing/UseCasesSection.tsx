'use client';

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Play, Building2, Film, Sparkles, Volume2, VolumeX, Maximize2, User, Briefcase, Clock, DollarSign, Target, CheckCircle2, ArrowRight, Quote } from 'lucide-react';

// Toggle personas for "Choose Your Path"
type Persona = 'creator' | 'agency';

interface UseCasePersona {
  id: Persona;
  label: string;
  title: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  challenge: {
    title: string;
    description: string;
  };
  solution: {
    title: string;
    description: string;
    features: string[];
  };
  win: string;
  keyPhrases: string[];
  videoUrl?: string;
}

const personas: UseCasePersona[] = [
  {
    id: 'creator',
    label: 'I am a Solo Creator',
    title: 'The YouTube Documentarian',
    icon: Video,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 to-orange-600/10',
    challenge: {
      title: 'The "B-Roll" Bottleneck',
      description: 'You have a strong script, but most of your time goes to finding footage, coordinating edits, and chasing consistency between scenes. That delay slows publishing cadence and weakens audience retention.',
    },
    solution: {
      title: 'The Automated Storyteller',
      description: 'Turn scripts into production-ready visuals quickly while keeping character and style continuity from first scene to final cut.',
      features: [
        'Visuals that map cleanly to script beats',
        'Consistent Protagonists across every scene',
        'Scale to episode series with a shared reference library',
      ],
    },
    win: 'Move from occasional uploads to a reliable production cadence with less overhead.',
    keyPhrases: ['Faster Turnaround', 'Consistent Characters', 'Series-Ready Workflow'],
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Jul_16__0705_34s_202512231713_zzqmk.mp4',
  },
  {
    id: 'agency',
    label: 'I am an Agency/Studio',
    title: 'The Agency Pitch Lead',
    icon: Briefcase,
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 to-blue-600/10',
    challenge: {
      title: 'High-Stakes Spec Work',
      description: 'Pitch deadlines are tight, and pre-production costs can escalate before a client approves direction. Teams need speed while still keeping brand and quality controls.',
    },
    solution: {
      title: 'The "Locked" Concept Engine',
      description: 'Build pitch-ready treatments with practical brand controls, iterate quickly with client feedback, and push to high-resolution outputs once direction is approved.',
      features: [
        'Budget visibility through every iteration',
        'Brand-safe visual controls',
        'Fast pre-visualization for short approval windows',
      ],
    },
    win: 'Deliver faster pitch cycles and reduce up-front production risk for client work.',
    keyPhrases: ['Budget Predictability', 'Brand Consistency', 'Faster Approvals'],
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Jul_16__0705_24s_202512231746_xzz58.mp4',
  },
];

// Video Player Component with Controls
const VideoPlayer = ({ persona }: { persona: UseCasePersona }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  if (!persona.videoUrl) {
    return (
      <div className="relative aspect-video bg-slate-800/50 rounded-2xl border border-white/10 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${persona.bgGradient} opacity-50`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            className={`w-20 h-20 rounded-full bg-gradient-to-br ${persona.gradient} flex items-center justify-center shadow-2xl`}
            whileHover={{ scale: 1.1 }}
          >
            <Play className="w-8 h-8 text-white ml-1" fill="white" />
          </motion.div>
        </div>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-gray-400" />
          <span className="text-gray-400 text-sm font-medium">Demo Coming Soon</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-full mx-auto transition-all duration-300 ${isExpanded ? 'max-w-4xl' : ''}`}>
      <motion.div
        className="relative rounded-2xl overflow-hidden border-2 shadow-2xl"
        style={{ borderColor: persona.id === 'creator' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.3)' }}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        layout
      >
        <div className={`absolute -inset-2 bg-gradient-to-r ${persona.bgGradient} rounded-2xl blur-xl -z-10 opacity-50`} />
        
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
            <source src={`${persona.videoUrl}#t=0.1`} type="video/mp4" />
          </video>
          
          <div className="absolute top-3 right-3">
            <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${persona.gradient} text-white text-xs font-semibold shadow-lg`}>
              {persona.title}
            </div>
          </div>
          
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-white/80" /> : <Volume2 className="w-4 h-4 text-white/80" />}
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-all opacity-60 hover:opacity-100"
            >
              <Maximize2 className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Persona Card Component
const PersonaCard = ({ persona, isActive }: { persona: UseCasePersona; isActive: boolean }) => {
  const Icon = persona.icon;

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          key={persona.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start"
        >
          {/* Left: Content */}
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${persona.gradient} flex items-center justify-center shadow-lg`}>
                <Icon className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-400 uppercase tracking-wider">Target Persona</p>
                <h3 className="text-2xl md:text-3xl font-bold text-white">{persona.title}</h3>
              </div>
            </div>

            {/* Challenge */}
            <div className="bg-red-500/5 backdrop-blur-sm rounded-xl p-6 border border-red-500/20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-400 text-sm font-semibold uppercase tracking-wide">The Challenge</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{persona.challenge.title}</h4>
              <p className="text-gray-400 text-sm leading-relaxed">{persona.challenge.description}</p>
            </div>

            {/* Solution */}
            <div className={`bg-gradient-to-br ${persona.bgGradient} backdrop-blur-sm rounded-xl p-6 border ${persona.id === 'creator' ? 'border-amber-500/20' : 'border-cyan-500/20'}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${persona.id === 'creator' ? 'bg-amber-500' : 'bg-cyan-500'}`} />
                <span className={`text-sm font-semibold uppercase tracking-wide ${persona.id === 'creator' ? 'text-amber-400' : 'text-cyan-400'}`}>The SceneFlow Solution</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{persona.solution.title}</h4>
              <p className="text-gray-300 text-sm leading-relaxed mb-4">{persona.solution.description}</p>
              
              <div className="space-y-2">
                {persona.solution.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${persona.id === 'creator' ? 'text-amber-400' : 'text-cyan-400'}`} />
                    <span className="text-sm text-gray-300">
                      {feature.split('—').map((part, i) => 
                        i === 0 ? <strong key={i} className="text-white">{part}</strong> : <span key={i}>—{part}</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Before/After ROI Table */}
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-4 border border-gray-700/30">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-amber-400 text-xs font-semibold uppercase tracking-wide">Before vs After</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                  <span className="text-[10px] text-gray-500 block mb-1">Before</span>
                  <span className="text-sm font-bold text-red-400">{persona.id === 'creator' ? '40 hrs' : '$5K risk'}</span>
                </div>
                <div className="p-2 flex items-center justify-center">
                  <span className="text-gray-600">→</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] text-gray-500 block mb-1">After</span>
                  <span className="text-sm font-bold text-emerald-400">{persona.id === 'creator' ? '25 mins' : '$0 risk'}</span>
                </div>
              </div>
            </div>

            {/* The Win - Quote Style */}
            <div className="relative p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Quote className="absolute top-4 left-4 w-8 h-8 text-emerald-500/30" />
              <div className="pl-8">
                <p className="text-emerald-400 text-sm font-semibold uppercase tracking-wide mb-2">The "Win"</p>
                <p className="text-white text-lg font-medium italic leading-relaxed">"{persona.win}"</p>
              </div>
            </div>
          </div>

          {/* Right: Video + One-Take Badge (Agency only) */}
          <div className="space-y-6">
            <VideoPlayer persona={persona} />
            
            {/* One-Take Social Proof - Agency Only */}
            {persona.id === 'agency' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20"
              >
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-purple-300 font-medium mb-1">Frame-Anchored Continuity</p>
                    <p className="text-xs text-gray-400">
                      SceneFlow is the only tool that allows <span className="text-purple-400 font-semibold">Frame-Anchored</span> continuity, ensuring your client's product or character remains identical across every scene segment.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Key Phrases */}
            <div className="flex flex-wrap gap-2">
              {persona.keyPhrases.map((phrase, idx) => (
                <span
                  key={idx}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    persona.id === 'creator' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  }`}
                >
                  {phrase}
                </span>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default function UseCasesSection() {
  const [activePersona, setActivePersona] = useState<Persona>('creator');

  return (
    <section id="use-cases" className="py-24 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
            <User className="w-4 h-4 text-purple-400 mr-2" />
            <span className="text-purple-300 text-sm font-medium">Production Applications</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            Whatever Video You Can Imagine,{' '}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-cyan-400 bg-clip-text text-transparent">
              Build It in SceneFlow
            </span>
          </h2>
          
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Real-estate showcases, education, podcasts, news formats, branded campaigns, and cinematic stories all run through one production workflow.
          </p>
        </motion.div>

        {/* Toggle Selector */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-800/50 border border-slate-700/50">
            {personas.map((persona) => {
              const Icon = persona.icon;
              return (
                <button
                  key={persona.id}
                  onClick={() => setActivePersona(persona.id)}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300
                    ${activePersona === persona.id
                      ? `bg-gradient-to-r ${persona.gradient} text-white shadow-lg`
                      : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span>{persona.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Active Persona Content */}
        <div className="min-h-[600px]">
          {personas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} isActive={activePersona === persona.id} />
          ))}
        </div>

        {/* CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <button
            onClick={() => window.location.href = '/?signup=explorer'}
            className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
          >
            Start Your Production Test Flight
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-gray-500 text-sm mt-3">$9 one-time • 750 credits • Full platform access</p>
        </motion.div>
      </div>
    </section>
  );
}
