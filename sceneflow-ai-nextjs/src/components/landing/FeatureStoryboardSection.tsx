'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, PlayCircle, Clock3, Maximize2, X, Play, Pause, Volume2, VolumeX, Maximize, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import NextImage from 'next/image';
import { useState, useRef } from 'react';

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

function FeatureBulletText({ text }: { text: string }) {
  const parts = text.split('—');
  if (parts.length > 1) {
    return (
      <span className="text-sm text-slate-300">
        <strong className="text-white font-medium">{parts[0].trim()}</strong>
        {' — '}
        {parts.slice(1).join('—').trim()}
      </span>
    );
  }
  return <span className="text-sm text-slate-300">{text}</span>;
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
      'Same Blueprint → Script → Vision path — regardless of genre',
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
    id: 9,
    title: 'Series Automation',
    description:
      'Scale your narrative effortlessly. Define your universe once, and let the AI instantly generate cohesive multi-episode arcs, ensuring character development and overarching plotlines stay perfectly aligned across the entire season.',
    keyFeatures: [
      'Define your universe once — characters, tone, and season arc',
      'Cohesive episode outlines — auto-generated across the season',
      'Continuity tracking — up to 40 episodes in alignment',
      "Series-to-episode sync — into Writer's Room and Production",
    ],
    screenshotSlot: 'Insert screenshot: Series overview with auto-generated episode arcs',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2009.17.05.png',
    videoSlot: 'Insert 00:30 clip: Concept expanding into a multi-episode season',
    videoUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Series.mp4',
  },
  {
    id: 10,
    title: 'Blueprint Automation',
    description:
      'Transform raw concepts into structured, production-ready architectures. Automatically generate complete story beats, character arcs, and scene-by-scene structural outlines that serve as the flawless foundation for your project.',
    keyFeatures: [
      'Concept to structure in minutes — logline, beats, characters, and tone',
      'Production-ready beat sheets — with runtime estimates',
      'Treatment variants — A/B creative direction before you commit',
      'Collaborator share links — feedback synthesis into guided revision',
    ],
    screenshotSlot: 'Insert screenshot: Auto-generated Blueprint with story beats and character arcs',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-21%20at%2010.05.03.png',
    videoSlot: 'Insert 00:30 clip: Turning a concept into a structured Blueprint',
  },
  {
    id: 11,
    title: 'Production Automation',
    description:
      'Go from script to screen without the friction. Instantly automate your script formatting, storyboard visualization, dynamic voice casting, and spatial audio mixing, seamlessly orchestrating reference libraries and keyframes into a unified video edit.',
    keyFeatures: [
      'Script formatting — scene breakdown from your blueprint',
      'Storyboard and keyframes — with reference locking',
      'AI voice casting — and spatial audio mixing',
      'Full scene timeline — narration, dialogue, music, and SFX',
    ],
    screenshotSlot: 'Insert screenshot: Production dashboard showing script, voice, and video orchestration',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2010.47.26.png',
    videoSlot: 'Insert 00:30 clip: Orchestrating script, storyboards, and audio into the Mixer',
  },
  {
    id: 12,
    title: 'Final Cut Automation',
    description:
      'Polish your project with intelligent precision. Automatically assemble generated segments, sync audio tracks, and apply smart transitions for a broadcast-ready final cut that requires zero manual timeline scrubbing.',
    keyFeatures: [
      'Auto-assemble segments — on the edit timeline',
      'Multi-track audio sync — locked to picture',
      'Smart transitions — and pacing suggestions',
      'Broadcast-ready cut — without manual timeline scrubbing',
    ],
    screenshotSlot: 'Insert screenshot: Final Cut timeline with auto-assembled segments',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2015.30.48.png',
    videoSlot: 'Insert 00:30 clip: AI assembling and polishing the final timeline',
  },
  {
    id: 13,
    title: 'Premiere Automation',
    description:
      'Launch with a splash. Effortlessly automate your distribution prep, generating localized metadata, optimized thumbnails, and release-ready packages tailored for any platform or screening format.',
    keyFeatures: [
      'Platform-specific metadata — and thumbnail packages',
      'Localized titles and descriptions — for every distribution channel',
      'Release-ready export bundles — tailored to your platform',
      'Screening and social cuts — from one master project',
    ],
    screenshotSlot: 'Insert screenshot: Premiere dashboard with metadata and package prep',
    screenshotUrl: 'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-18%20at%2017.09.15.png',
    videoSlot: 'Insert 00:30 clip: Auto-generating platform-specific packages and thumbnails',
  },
  {
    id: 14,
    title: 'Screening Room',
    description:
      'Validate your vision with real behavioral analytics. Host interactive review sessions to capture audience feedback, track engagement metrics, and use data-driven insights to refine your content before it goes public.',
    keyFeatures: [
      'Private review sessions — secure share links for stakeholders',
      'Structured audience feedback — and engagement signals',
      'Behavioral analytics — before public launch',
      'Iterate from real data — refine blueprint and script from reviewer insights',
    ],
    screenshotSlot: 'Insert screenshot: Screening Room analytics and reviewer feedback panel',
    screenshotUrl:
      'https://xxavfkdhdebrqida.public.blob.vercel-storage.com/Screenshot%202026-05-19%20at%2018.29.48.png',
    videoSlot: 'Insert 00:30 clip: Hosting a review session and gathering engagement data',
  },
];

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
      
      {/* Controls Overlay */}
      <div className="absolute inset-0 flex items-end opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
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
                <p className="mt-1 text-sm text-slate-400 line-clamp-1 max-w-2xl">{item.description}</p>
                <div className="mt-2 hidden sm:flex flex-wrap gap-2 max-w-2xl">
                  {item.keyFeatures.slice(0, 2).map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs text-slate-300"
                    >
                      <CheckCircle2 className="h-3 w-3 text-purple-400 shrink-0" />
                      <span className="line-clamp-1">{feature.split('—')[0].trim()}</span>
                    </span>
                  ))}
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

              <div className="mt-6 max-w-4xl">
                <p className="text-xs font-medium uppercase tracking-wider text-cyan-300/90 mb-3">
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
                      <div className="p-3 text-xs text-slate-400">
                        {item.screenshotSlot}
                      </div>
                    )}
                  </div>
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
                      <div className="p-3 text-xs text-slate-400">
                        {item.videoSlot}
                      </div>
                    )}
                  </div>
                </div>
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
          {FEATURE_STORYBOARD_ITEMS.map((item) => (
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
