'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Play, Sparkles, Volume2, VolumeX, Maximize2, User, Briefcase, Target, CheckCircle2, ArrowRight, Quote, X, Users, Store } from 'lucide-react';

import { ProductionComparisonVisual } from './ProductionComparisonVisual';
import { getSignupUrlForTier } from '@/lib/billing/checkoutIntent';
import {
  getAudiencePathByPersonaId,
  getDefaultCategoryIdForPersona,
} from '@/config/landing/valuePropCopy';

type Persona = 'creator' | 'team' | 'productionShop' | 'agency';

interface UseCasePersona {
  id: Persona;
  label: string;
  title: string;
  icon: React.ElementType;
  gradient: string;
  bgGradient: string;
  accentBorder: string;
  accentDot: string;
  accentText: string;
  accentCheck: string;
  accentKeyPhrase: string;
  beforeAfter: { before: string; after: string };
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
  imageUrl?: string;
}

const PERSONA_HASH_MAP: Record<string, Persona> = {
  'use-cases-creator': 'creator',
  'use-cases-team': 'team',
  'use-cases-production-shop': 'productionShop',
  'use-cases-agency': 'agency',
};

const personas: UseCasePersona[] = [
  {
    id: 'creator',
    label: 'Solo Creator',
    title: 'The YouTube Creator',
    icon: Video,
    gradient: 'from-amber-500 to-orange-600',
    bgGradient: 'from-amber-500/10 to-orange-600/10',
    accentBorder: 'border-amber-500/20',
    accentDot: 'bg-amber-500',
    accentText: 'text-amber-400',
    accentCheck: 'text-amber-400',
    accentKeyPhrase: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    beforeAfter: { before: '40 hrs', after: '25 mins' },
    challenge: {
      title: 'The "B-Roll" Bottleneck',
      description: 'You have a strong script, but most of your time goes to finding footage, coordinating edits, and chasing consistency between scenes. That delay slows publishing cadence and weakens audience retention.',
    },
    solution: {
      title: 'The Automated Storyteller',
      description: 'Turn scripts into production-ready visuals quickly while keeping character and style continuity from first scene to publish-ready master.',
      features: [
        'Visuals that map cleanly to script beats',
        'Consistent protagonists across every scene',
        'Scale to episode series with a shared reference library',
      ],
    },
    win: 'Move from occasional uploads to a reliable production cadence with less overhead.',
    keyPhrases: ['Faster Turnaround', 'Consistent Characters', 'Series-Ready Workflow'],
    imageUrl: '/landing/use-cases/youtube-creator.jpg',
  },
  {
    id: 'team',
    label: 'In-house Team',
    title: 'The In-House Video Team',
    icon: Users,
    gradient: 'from-emerald-500 to-teal-600',
    bgGradient: 'from-emerald-500/10 to-teal-600/10',
    accentBorder: 'border-emerald-500/20',
    accentDot: 'bg-emerald-500',
    accentText: 'text-emerald-400',
    accentCheck: 'text-emerald-400',
    accentKeyPhrase: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    beforeAfter: { before: '6 wks', after: 'Same wk' },
    challenge: {
      title: 'Vendor Backlog & Brand Drift',
      description: 'Comms, L&D, and marketing teams wait weeks for agency or vendor video. Every shoot brings inconsistent branding, unpredictable invoices, and approval chains that stall campaigns.',
    },
    solution: {
      title: 'Same-Week In-House Production',
      description: 'Assign staff to produce video on a predictable credit budget — with brand templates, approval before final render, and no crew days or open-ended edit cycles.',
      features: [
        'Replace vendor shoots with guided in-house workflows',
        'Brand-safe templates and reference libraries',
        'Visible credit spend and budget caps per project',
        'Approve storyboards before paying for final video',
      ],
    },
    win: 'Ship training, comms, and campaign video on your timeline — not the vendor\'s backlog.',
    keyPhrases: ['Predictable Cost', 'Brand Control', 'Same-Week Turnaround'],
    imageUrl: '/landing/use-cases/agency-pitch.jpg',
  },
  {
    id: 'productionShop',
    label: 'Production Shop',
    title: 'The Niche Production Shop',
    icon: Store,
    gradient: 'from-violet-500 to-purple-600',
    bgGradient: 'from-violet-500/10 to-purple-600/10',
    accentBorder: 'border-violet-500/20',
    accentDot: 'bg-violet-500',
    accentText: 'text-violet-400',
    accentCheck: 'text-violet-400',
    accentKeyPhrase: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    beforeAfter: { before: '$8K/shoot', after: '$200 credits' },
    challenge: {
      title: 'Custom Verticals, No Repeatable System',
      description: 'Memoir, legacy, real estate, and education clients need fast turnaround — but every project starts from scratch. Uploads, voice clones, and avatars don\'t scale without a templated intake → delivery pipeline.',
    },
    solution: {
      title: 'Productize Your Video Service',
      description: 'Build repeatable workflows for memoir studios and niche verticals. Template uploads, voice clones, avatars, and storyboard approval — customize per client and grow margin on volume.',
      features: [
        'Memoir templates with photo uploads, voice clones, and avatar hosts',
        'Client intake tied to Blueprint and storyboard approval phases',
        'White-label studio packages for legacy, tribute, and subscription video',
        'Margin on credits instead of per-shoot overhead',
      ],
    },
    win: 'Launch a video memoir or niche studio service with repeatable delivery — not a one-off freelance grind.',
    keyPhrases: ['Memoir Templates', 'Voice & Avatar Identity', 'Repeatable Delivery'],
    imageUrl: '/landing/use-cases/youtube-creator.jpg',
  },
  {
    id: 'agency',
    label: 'Agency',
    title: 'The Client Delivery Lead',
    icon: Briefcase,
    gradient: 'from-cyan-500 to-blue-600',
    bgGradient: 'from-cyan-500/10 to-blue-600/10',
    accentBorder: 'border-cyan-500/20',
    accentDot: 'bg-cyan-500',
    accentText: 'text-cyan-400',
    accentCheck: 'text-cyan-400',
    accentKeyPhrase: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30',
    beforeAfter: { before: '3 wk delivery', after: '3 day delivery' },
    challenge: {
      title: 'Client Delivery at Scale',
      description: 'Winning the pitch is only half the battle. Recurring client work needs fast turnaround, clear approval chains, and margin on every deliverable — without rebuilding production from scratch each time.',
    },
    solution: {
      title: 'Throughput + Client Approval',
      description: 'Move from pitch spec to recurring delivery with brand-safe controls, client review before final render, and predictable credit costs per project.',
      features: [
        'Fast pre-visualization for pitches and client sign-off',
        'Reusable templates for recurring client formats',
        'Budget visibility through every iteration',
        'Scalable delivery without adding headcount',
      ],
    },
    win: 'Deliver faster pitch cycles and recurring client work with less production risk and more margin.',
    keyPhrases: ['Client Approvals', 'Delivery Throughput', 'Budget Predictability'],
    imageUrl: '/landing/use-cases/agency-pitch.jpg',
  },
];

const SEGMENT_CTAS: Record<Persona, { label: string; href: string; subtext?: string }> = {
  creator: {
    label: 'Start Your Production Test Flight',
    href: getSignupUrlForTier('explorer'),
    subtext: '$9 one-time • 750 credits • Full platform access',
  },
  team: {
    label: 'Book a Team Walkthrough',
    href: '/early-access',
    subtext: 'See how in-house teams replace vendor cycles',
  },
  productionShop: {
    label: 'Explore Vertical Templates',
    href: '#production-verticals',
    subtext: 'RE, education, docs, and more — see what you can productize',
  },
  agency: {
    label: 'See Team Pricing',
    href: '#pricing',
    subtext: 'Plans for agencies and production shops at scale',
  },
};

// Video Player Component with Controls
const VideoPlayer = ({ 
  persona, 
  onExpandVideo,
  onExpandImage 
}: { 
  persona: UseCasePersona; 
  onExpandVideo: (url: string) => void;
  onExpandImage: (url: string) => void;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (persona.videoUrl) {
      onExpandVideo(persona.videoUrl);
    } else if (persona.imageUrl) {
      onExpandImage(persona.imageUrl);
    }
  };

  if (!persona.videoUrl && !persona.imageUrl) {
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
    <div className="relative w-full mx-auto group">
      <motion.div
        className="relative rounded-2xl overflow-hidden border-2 shadow-2xl cursor-pointer"
        style={{ borderColor: persona.id === 'creator' ? 'rgba(245, 158, 11, 0.3)' : persona.id === 'team' ? 'rgba(16, 185, 129, 0.3)' : persona.id === 'productionShop' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(6, 182, 212, 0.3)' }}
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        onClick={handleExpand}
        layout
      >
        <div className={`absolute -inset-2 bg-gradient-to-r ${persona.bgGradient} rounded-2xl blur-xl -z-10 opacity-50`} />
        
        <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
          {persona.videoUrl ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                preload="auto"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              >
                <source src={`${persona.videoUrl}#t=0.1`} type="video/mp4" />
              </video>
              
              <div className="absolute top-3 right-3">
                <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${persona.gradient} text-white text-xs font-semibold shadow-lg`}>
                  {persona.title}
                </div>
              </div>
              
              {/* Play Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                  <Play className="w-8 h-8 text-white fill-white" />
                </div>
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all text-white border border-white/10"
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleExpand}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all text-white border border-white/10"
                  aria-label="Expand Video"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <>
              <img
                src={persona.imageUrl}
                alt={persona.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute top-3 right-3">
                <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${persona.gradient} text-white text-xs font-semibold shadow-lg`}>
                  {persona.title}
                </div>
              </div>
              
              {/* Expand Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                  <Maximize2 className="w-8 h-8 text-white" />
                </div>
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-2 z-20">
                <button
                  onClick={handleExpand}
                  className="p-2 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md transition-all text-white border border-white/10"
                  aria-label="Expand Image"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// Persona Card Component
const PersonaCard = ({ 
  persona, 
  isActive, 
  onExpandVideo,
  onExpandImage 
}: { 
  persona: UseCasePersona; 
  isActive: boolean; 
  onExpandVideo: (url: string) => void;
  onExpandImage: (url: string) => void;
}) => {
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
              <p className="text-gray-400 text-base leading-relaxed">{persona.challenge.description}</p>
            </div>

            {/* Solution */}
            <div className={`bg-gradient-to-br ${persona.bgGradient} backdrop-blur-sm rounded-xl p-6 border ${persona.accentBorder}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-2 h-2 rounded-full ${persona.accentDot}`} />
                <span className={`text-sm font-semibold uppercase tracking-wide ${persona.accentText}`}>The SceneFlow Solution</span>
              </div>
              <h4 className="text-lg font-bold text-white mb-2">{persona.solution.title}</h4>
              <p className="text-gray-300 text-base leading-relaxed mb-4">{persona.solution.description}</p>
              
              <div className="space-y-2">
                {persona.solution.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${persona.accentCheck}`} />
                    <span className="text-base text-gray-300">
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
                  <span className="text-xs text-gray-500 block mb-1">Before</span>
                  <span className="text-base font-bold text-red-400">{persona.beforeAfter.before}</span>
                </div>
                <div className="p-2 flex items-center justify-center">
                  <span className="text-gray-600">→</span>
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-xs text-gray-500 block mb-1">After</span>
                  <span className="text-base font-bold text-emerald-400">{persona.beforeAfter.after}</span>
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

          {/* Right: Asset + One-Take Badge (Agency only) */}
          <div className="space-y-6">
            <VideoPlayer 
              persona={persona} 
              onExpandVideo={onExpandVideo} 
              onExpandImage={onExpandImage}
            />
            
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
                    <p className="text-sm text-gray-400">
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
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${persona.accentKeyPhrase}`}
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
  const [activeCategoryId, setActiveCategoryId] = useState<string>(
    getDefaultCategoryIdForPersona('creator')
  );
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.slice(1);
      if (PERSONA_HASH_MAP[hash]) {
        setActivePersona(PERSONA_HASH_MAP[hash]);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    setActiveCategoryId(getDefaultCategoryIdForPersona(activePersona));
  }, [activePersona]);

  const activeAudiencePath = getAudiencePathByPersonaId(activePersona);
  const activeCta = SEGMENT_CTAS[activePersona];
  const isExternalSignup = activePersona === 'creator';

  return (
    <section id="use-cases" className="py-24 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header ... (keep same) */}
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
            Real-estate showcases, education, podcasts, news formats, branded campaigns, and cinematic stories — one automated studio from concept to publish-ready master.
          </p>
        </motion.div>

        {/* Use Cases - Moved below the header text and above the toggle */}
        <motion.div 
          id="production-verticals"
          className="mb-20 mt-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {activeAudiencePath && (
            <p className="text-center text-base text-gray-400 mb-4 max-w-2xl mx-auto">
              <span className="text-gray-300 font-medium">Examples for {activeAudiencePath.label}:</span>{' '}
              {activeAudiencePath.useCases.slice(0, 3).join(', ')}, and more.
            </p>
          )}
          <ProductionComparisonVisual initialCategoryId={activeCategoryId} />
        </motion.div>

        {/* Toggle Selector ... (keep same) */}
        <motion.div
          className="flex justify-center mb-12 px-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 max-w-full">
            {personas.map((persona) => {
              const Icon = persona.icon;
              return (
                <button
                  key={persona.id}
                  onClick={() => setActivePersona(persona.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-base font-medium transition-all duration-300
                    ${activePersona === persona.id
                      ? `bg-gradient-to-r ${persona.gradient} text-white shadow-lg`
                      : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{persona.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Active Persona Content */}
        <div className="min-h-[600px]">
          {personas.map((persona) => (
            <PersonaCard 
              key={persona.id} 
              persona={persona} 
              isActive={activePersona === persona.id} 
              onExpandVideo={setExpandedVideo}
              onExpandImage={setExpandedImage}
            />
          ))}
        </div>

        {/* Segment-specific CTA */}
        <motion.div
          className="text-center mt-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {isExternalSignup ? (
            <button
              onClick={() => { window.location.href = activeCta.href }}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
            >
              {activeCta.label}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          ) : (
            <Link
              href={activeCta.href}
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all duration-300"
            >
              {activeCta.label}
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          {activeCta.subtext && (
            <p className="text-gray-500 text-base mt-3">{activeCta.subtext}</p>
          )}
          {activePersona !== 'creator' && (
            <p className="text-gray-600 text-sm mt-2">
              Or{' '}
              <button
                onClick={() => { window.location.href = getSignupUrlForTier('explorer') }}
                className="text-purple-400 hover:text-purple-300 underline-offset-2 hover:underline"
              >
                start with the $9 Explorer plan
              </button>
            </p>
          )}
        </motion.div>
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {expandedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedVideo(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full aspect-video"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpandedVideo(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                Close Preview
              </button>
              
              <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black">
                <video
                  src={expandedVideo}
                  autoPlay
                  controls
                  className="w-full h-full object-contain"
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpandedImage(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 md:p-12 backdrop-blur-md cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-7xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setExpandedImage(null)}
                className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-2 text-sm font-medium transition-colors"
              >
                <X className="w-5 h-5" />
                Close Preview
              </button>
              
              <div className="relative w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src={expandedImage}
                  alt="Expanded view"
                  className="w-full h-full object-contain"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
