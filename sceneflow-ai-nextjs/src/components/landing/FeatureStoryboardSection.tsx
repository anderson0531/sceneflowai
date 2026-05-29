'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, PlayCircle, Clock3, Maximize2, X, Play, Pause, Volume2, VolumeX, Maximize, ChevronDown, ChevronUp, CheckCircle2, ExternalLink } from 'lucide-react';
import NextImage from 'next/image';
import { useState, useRef } from 'react';
import { StudioVideoWatermark } from '@/components/landing/StudioVideoWatermark';
import {
  BEAT_FIRST_CARD,
  SCREENING_ROOM_COPY,
  WORKFLOW_PHASES,
} from '@/config/landing/workflowPhaseCopy';

type FeatureStoryboardItem = {
  id: number;
  title: string;
  description: string;
  keyFeatures: string[];
  videoSlot: string;
  screenshotSlot: string;
  screenshotUrl?: string;
  videoUrl?: string;
};

function MediaAssetLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex items-center gap-1.5 text-sm text-cyan-400/90 hover:text-cyan-300 transition-colors break-all"
      onClick={(e) => e.stopPropagation()}
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      <span>{label}</span>
    </a>
  );
}

function FeatureBulletText({ text }: { text: string }) {
  const parts = text.split('—');
  if (parts.length > 1) {
    return (
      <span className="text-base text-slate-300">
        <strong className="text-white font-medium">{parts[0].trim()}</strong>
        {' — '}
        {parts.slice(1).join('—').trim()}
      </span>
    );
  }
  return <span className="text-base text-slate-300">{text}</span>;
}

const FEATURE_STORYBOARD_ITEMS: FeatureStoryboardItem[] = [
  {
    id: 1,
    title: 'Intuitive UX + Full Creator Control',
    description:
      'Start fast with guided automation, then edit every generated output so teams keep creative control without losing speed.',
    keyFeatures: [
      'Guided Studio workflow — from concept to export in one place',
      'Edit every AI-generated beat, character, and line in place',
      'Treatment variants — side-by-side compare for creative direction',
      'Blueprint Collaborate — share links, section audio, and structured reviewer feedback',
    ],
    screenshotSlot: 'Insert screenshot: Blueprint editor with editable generated sections',
    videoSlot: 'Insert 00:30 clip: UX flow from concept to editable output',
    screenshotUrl: '/landing/storyboard/intuitive-ux-2.png',
    videoUrl: 'https://storage.googleapis.com/sceneflow-assets/demo/intuitive-ux.mp4',
  },
  {
    id: 2,
    title: 'Credit Budget Tracking + Vertex AI BYOK',
    description:
      'Track credit usage in real time, set practical production guardrails, and use Vertex AI BYOK for enterprise governance.',
    keyFeatures: [
      'Real-time credit usage — by project and operation',
      'Production guardrails — before costly generation runs',
      'Vertex AI BYOK — enterprise billing and governance',
      'Transparent rate cards — for TTS, video, and intelligence',
    ],
    screenshotSlot: 'Insert screenshot: credit usage panel and BYOK settings',
    videoSlot: 'Insert 00:30 clip: budget dashboard and key configuration',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-16%20at%2016.40.22.png',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/BYOK.mp4',
  },
  {
    id: 3,
    title: 'Any Concept, One Production Workflow',
    description:
      'Use one reliable pipeline for training, podcasts, news, home sales videos, and cinematic content.',
    keyFeatures: [
      'One pipeline — podcast, news, training, real estate, and cinematic formats',
      'Project templates — Studio adapts to your source material',
      'Same Blueprint → Script → Production path — regardless of genre',
      'No tool-switching — from ideation through delivery',
    ],
    screenshotSlot: 'Insert screenshot: Split-view or grid showing Podcast, News, Real Estate, and Cinematic templates feeding into one unified SceneFlow pipeline UI.',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-16%20at%2021.48.31.png',
    videoSlot: 'Insert 00:30 clip: "Start with any source material..." clicking New Project -> Podcast (UI adapts to audio), then showing split screen of News & Cinematic projects converging into the Blueprint editor.',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/One%20Platform%20.mp4',
  },
  {
    id: 4,
    title: 'Smart Automation with Precision Edit Control',
    description:
      'The SceneFlow platform uses intelligence to automatically generate a professional baseline (series, blueprint, script, production prompts, and edits) while providing intelligent dialogs that give you full edit control with built-in guardrails.',
    keyFeatures: [
      'AI baselines in one pass — series, blueprint, script, and production prompts',
      'Intelligent edit dialogs — guardrails, not blind rewrites',
      'Accept, refine, or reject — every suggestion stays under your control',
      'Human-in-the-loop — at every phase of production',
    ],
    screenshotSlot: 'Insert screenshot: Intelligent dialog showing baseline generation with edit controls',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-17%20at%2011.20.36.png',
    videoSlot: 'Insert 00:30 clip: AI baseline generation followed by user making precise edits',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Automation%202%20.mp4',
  },
  {
    id: 5,
    title: 'Shared Reference Library for Continuity',
    description:
      'Maintain consistent characters, wardrobe, voices, locations, and props across scenes and episodes with reusable references.',
    keyFeatures: [
      'Reusable profiles — characters, wardrobe, voices, locations, and props',
      'Cross-scene application — references flow into every generation',
      'Visual consistency — same faces and tone in Imagen and Veo outputs',
      'Franchise-scale continuity — built for multi-episode series',
    ],
    screenshotSlot: 'Insert screenshot: Reference library showing character and prop continuity',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-17%20at%2014.33.01.png',
    videoSlot: 'Insert 00:30 clip: Applying references across multiple scenes',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Reference.mp4',
  },
  {
    id: 6,
    title: 'Express Generation Engine',
    description:
      'Auto-generate images and video segments concurrently. Express Storyboard lets you review and share audio-visual storyboards in minutes. Express Animatics renders full Ken Burns scenes in minutes, while Express Video delivers final video scenes in minutes instead of days.',
    keyFeatures: [
      'Concurrent generation — images and video across scenes at once',
      'Express Storyboard — shareable audio-visual previews in minutes',
      'Express Animatics — Ken Burns motion from stills',
      'Express Video — scene-level clips in minutes, not days',
    ],
    screenshotSlot: 'Insert screenshot: Express generation dashboard with Animatics and Video progress',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-17%20at%2019.27.52.png',
    videoSlot: 'Insert 00:30 clip: Concurrent generation turning script into animatic then final video',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Express.mp4',
  },
  {
    id: 7,
    title: 'Audience Resonance Editor',
    description:
      'Determine your target audience to get instant scoring, analysis, and recommendations. Apply one-click fixes or use Guided Edits to perfectly optimize your Episodes, Blueprint, and Script for maximum impact.',
    keyFeatures: [
      'Target-audience scoring — with category breakdown',
      'Section-tied recommendations — fix the right part of your story',
      'One-click fixes and Guided Edit — precise rewrites, not guesswork',
      'Production-ready threshold — know when to invest in full render',
    ],
    screenshotSlot: 'Insert screenshot: Resonance Editor with audience scoring and one-click fixes',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2008.22.24.png',
    videoSlot: 'Insert 00:30 clip: Applying guided edits based on audience resonance score',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Audience%20.mp4',
  },
  {
    id: 8,
    title: 'Adaptive Translation (70+ Languages)',
    description:
      'Localize content at scale while preserving narrative intent and timeline alignment for multilingual delivery.',
    keyFeatures: [
      '70+ languages — narration, dialogue, and copy at scale',
      'Narrative intent preserved — meaning and timing stay aligned',
      'Multi-language audio tracks — on the scene timeline',
      'Export-ready packages — per locale for distribution',
    ],
    screenshotSlot: 'Insert screenshot: Multi-language timeline and translation settings',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-20%20at%2011.59.14.png',
    videoSlot: 'Insert 00:30 clip: Instantly localizing a scene into multiple languages',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Multilanguage.mp4',
  },
  {
    id: 15,
    title: BEAT_FIRST_CARD.title,
    description: BEAT_FIRST_CARD.description,
    keyFeatures: [...BEAT_FIRST_CARD.keyFeatures],
    screenshotSlot: BEAT_FIRST_CARD.screenshotSlot,
    videoSlot: BEAT_FIRST_CARD.videoSlot,
  },
  {
    id: 9,
    title: 'Series Automation',
    description: WORKFLOW_PHASES[0].description,
    keyFeatures: [...WORKFLOW_PHASES[0].keyFeatures],
    screenshotSlot: 'Insert screenshot: Series overview with auto-generated episode arcs',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2009.17.05.png',
    videoSlot: 'Insert 00:30 clip: Concept expanding into a multi-episode season',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Series.mp4',
  },
  {
    id: 10,
    title: 'Blueprint Automation',
    description: WORKFLOW_PHASES[1].description,
    keyFeatures: [...WORKFLOW_PHASES[1].keyFeatures],
    screenshotSlot: 'Insert screenshot: Auto-generated Blueprint with story beats and character arcs',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-21%20at%2010.05.03.png',
    videoSlot: 'Insert 00:30 clip: Turning a concept into a structured Blueprint',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/BLUEPRINT.mp4',
  },
  {
    id: 11,
    title: 'Production Automation',
    description: WORKFLOW_PHASES[2].description,
    keyFeatures: [...WORKFLOW_PHASES[2].keyFeatures],
    screenshotSlot: 'Insert screenshot: Production dashboard showing script, Beat Frames, and Mixer',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-27%20at%2011.15.48.png',
    videoSlot: 'Insert 00:30 clip: Foundation, Express storyboard, Beat Frames, and stream export',
  },
  {
    id: 12,
    title: 'Final Cut Assembly',
    description: WORKFLOW_PHASES[3].description,
    keyFeatures: [...WORKFLOW_PHASES[3].keyFeatures],
    screenshotSlot: 'Insert screenshot: Final Cut assembly panel with per-scene stream pickers',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2015.30.48.png',
    videoSlot: 'Insert 00:30 clip: Picking streams, previewing assembly, and exporting master',
  },
  {
    id: 13,
    title: 'Premiere Distribution',
    description: WORKFLOW_PHASES[4].description,
    keyFeatures: [...WORKFLOW_PHASES[4].keyFeatures],
    screenshotSlot: 'Insert screenshot: Premiere dashboard with insights and publish wizard',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2017.09.15.png',
    videoSlot: 'Insert 00:30 clip: Screening insights, YouTube wizard, and export bundles',
  },
  {
    id: 14,
    title: SCREENING_ROOM_COPY.title,
    description: SCREENING_ROOM_COPY.description,
    keyFeatures: [...SCREENING_ROOM_COPY.keyFeatures],
    screenshotSlot: SCREENING_ROOM_COPY.screenshotSlot,
    screenshotUrl: SCREENING_ROOM_COPY.screenshotUrl,
    videoSlot: SCREENING_ROOM_COPY.videoSlot,
  },
];

/** Lead with differentiation; demote BYOK/credits to end */
const FEATURE_DISPLAY_ORDER = [15, 4, 5, 6, 7, 8, 3, 1, 9, 10, 11, 12, 13, 14, 2];

const ORDERED_FEATURE_STORYBOARD_ITEMS: FeatureStoryboardItem[] = FEATURE_DISPLAY_ORDER.map(
  (id) => FEATURE_STORYBOARD_ITEMS.find((item) => item.id === id)
).filter((item): item is FeatureStoryboardItem => !!item);

function FeatureVideoPlayer({ 
  src, 
  onExpand,
  className = "w-full h-full object-cover",
  autoPlay = true,
  showExpand = true
}: { 
  src: string; 
  onExpand?: (e: React.MouseEvent) => void;
  className?: string;
  autoPlay?: boolean;
  showExpand?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full group bg-black cursor-pointer overflow-hidden rounded-lg"
      onClick={togglePlay}
    >
      <video 
        ref={videoRef}
        src={src} 
        className={className}
        autoPlay={autoPlay}
        muted={isMuted}
        loop 
        playsInline 
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onContextMenu={(e) => e.preventDefault()}
        controlsList="nodownload"
      />

      <StudioVideoWatermark />
      
      {/* Controls Overlay */}
      <div className="absolute inset-0 z-20 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-3">
            <button onClick={togglePlay} className="text-white hover:text-cyan-400 transition" aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
            <button onClick={toggleMute} className="text-white hover:text-cyan-400 transition" aria-label={isMuted ? "Unmute" : "Mute"}>
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
          {showExpand && onExpand && (
            <button onClick={onExpand} className="text-white hover:text-cyan-400 transition" aria-label="Expand Video">
              <Maximize className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Play Overlay (Visible when paused) */}
      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30 transition-transform group-hover:scale-110">
            <Play className="w-6 h-6 text-white fill-white" />
          </div>
        </div>
      )}
    </div>
  );
}

function StoryboardCard({ 
  item, 
  onExpand,
  onExpandVideo
}: { 
  item: FeatureStoryboardItem; 
  onExpand: (url: string) => void;
  onExpandVideo: (url: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/10 bg-slate-900/50 backdrop-blur-sm overflow-hidden"
    >
      {/* Header - Always Visible */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-5 md:p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-base font-semibold text-purple-200">
            {item.id}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-xl md:text-2xl font-bold text-white">{item.title}</h3>
            {!isOpen && (
              <>
                <p className="mt-1 text-base text-slate-400 line-clamp-1 max-w-2xl">{item.description}</p>
                <div className="mt-2 hidden sm:flex flex-wrap items-center gap-2 max-w-2xl">
                  {item.keyFeatures.slice(0, 2).map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-slate-300"
                    >
                      <CheckCircle2 className="h-3 w-3 text-purple-400 shrink-0" />
                      <span className="line-clamp-1">{feature.split('—')[0].trim()}</span>
                    </span>
                  ))}
                  {item.screenshotUrl && (
                    <a
                      href={item.screenshotUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm text-cyan-300 hover:text-cyan-200 transition-colors"
                    >
                      <Camera className="h-3 w-3 shrink-0" />
                      Screenshot
                    </a>
                  )}
                  {item.videoUrl && (
                    <a
                      href={item.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-sm text-violet-300 hover:text-violet-200 transition-colors"
                    >
                      <PlayCircle className="h-3 w-3 shrink-0" />
                      Video
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-widest text-slate-500 hidden sm:inline">
            {isOpen ? 'Close' : 'View Details'}
          </span>
          <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
          >
            <div className="p-6 md:p-8 pt-0 border-t border-white/5">
              <p className="mt-4 text-base leading-relaxed text-slate-300 max-w-4xl">{item.description}</p>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* Screenshot Column */}
                <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-5 md:p-6">
                  <p className="mb-4 inline-flex items-center justify-between w-full text-sm font-medium uppercase tracking-wider text-cyan-300">
                    <span className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Screenshot
                    </span>
                    {item.screenshotUrl && (
                      <button 
                        onClick={() => onExpand(item.screenshotUrl!)}
                        className="hover:text-white transition-colors bg-white/5 p-1.5 rounded-lg"
                        title="Expand Image"
                      >
                        <Maximize2 className="h-4 w-4" />
                      </button>
                    )}
                  </p>
                  <div 
                    className={`aspect-video rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group ${item.screenshotUrl ? 'cursor-zoom-in' : ''}`}
                    onClick={() => item.screenshotUrl && onExpand(item.screenshotUrl)}
                  >
                    {item.screenshotUrl ? (
                      <>
                        <NextImage 
                          src={item.screenshotUrl} 
                          alt={item.title}
                          width={1280}
                          height={720}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20">
                            <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-3 text-sm text-slate-400">
                        {item.screenshotSlot}
                      </div>
                    )}
                  </div>
                  {item.screenshotUrl && (
                    <MediaAssetLink href={item.screenshotUrl} label="Open screenshot" />
                  )}
                </div>

                {/* Video Column */}
                <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/70 p-5 md:p-6">
                  <p className="mb-4 inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-violet-300">
                    <PlayCircle className="h-4 w-4" />
                    Feature Video
                  </p>
                  <div className="aspect-video rounded-xl border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group shadow-2xl">
                    {item.videoUrl ? (
                      <FeatureVideoPlayer 
                        src={item.videoUrl} 
                        onExpand={(e) => {
                          e.stopPropagation();
                          onExpandVideo(item.videoUrl!);
                        }}
                      />
                    ) : (
                      <div className="p-3 text-sm text-slate-400">
                        {item.videoSlot}
                      </div>
                    )}
                  </div>
                  {item.videoUrl && (
                    <MediaAssetLink href={item.videoUrl} label="Open feature video" />
                  )}
                </div>
              </div>

              <div className="mt-8 max-w-4xl">
                <p className="text-sm font-medium uppercase tracking-wider text-cyan-300/90 mb-3">
                  Key features
                </p>
                <ul className="space-y-2.5">
                  {item.keyFeatures.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-cyan-400" />
                      <FeatureBulletText text={feature} />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function FeatureStoryboardSection() {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null);

  return (
    <section id="feature-storyboard" className="bg-slate-950 py-20 sm:py-24 relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-purple-200">
            <Clock3 className="h-3.5 w-3.5" />
            Feature Deep Dive
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Platform Walkthrough
          </h2>
          <p className="mt-4 text-base text-slate-300">
            A complete guide to the SceneFlow AI Studio workflow, from initial concept to final cinematic output.
          </p>
        </motion.div>

        <div className="mt-12 space-y-4 max-w-7xl mx-auto">
          {ORDERED_FEATURE_STORYBOARD_ITEMS.map((item) => (
            <StoryboardCard 
              key={item.id} 
              item={item} 
              onExpand={setExpandedImage} 
              onExpandVideo={setExpandedVideo}
            />
          ))}
        </div>
      </div>

      {/* Lightbox / Expand Modal (Image) */}
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
                <NextImage
                  src={expandedImage}
                  alt="Expanded view"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className="relative max-w-7xl w-full aspect-video flex items-center justify-center"
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
                <FeatureVideoPlayer 
                  src={expandedVideo} 
                  autoPlay={true}
                  showExpand={false}
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
