'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Camera, PlayCircle, Clock3, Maximize2, X } from 'lucide-react';
import NextImage from 'next/image';
import { useState } from 'react';

type FeatureStoryboardItem = {
  id: number;
  title: string;
  description: string;
  videoSlot: string;
  screenshotSlot: string;
  screenshotUrl?: string;
  videoUrl?: string;
};

const FEATURE_STORYBOARD_ITEMS: FeatureStoryboardItem[] = [
  {
    id: 1,
    title: 'Intuitive UX + Full Creator Control',
    description:
      'Start fast with guided automation, then edit every generated output so teams keep creative control without losing speed.',
    screenshotSlot: 'Insert screenshot: Blueprint editor with editable generated sections',
    videoSlot: 'Insert 00:30 clip: UX flow from concept to editable output',
    screenshotUrl: '/landing/storyboard/intuitive-ux.png',
    videoUrl: 'https://storage.googleapis.com/sceneflow-assets/demo/intuitive-ux.mov',
  },
  {
    id: 2,
    title: 'Credit Budget Tracking + Vertex AI BYOK',
    description:
      'Track credit usage in real time, set practical production guardrails, and use Vertex AI BYOK for enterprise governance.',
    screenshotSlot: 'Insert screenshot: credit usage panel and BYOK settings',
    videoSlot: 'Insert 00:30 clip: budget dashboard and key configuration',
  },
  {
    id: 3,
    title: 'Any Concept, One Production Workflow',
    description:
      'Use one reliable pipeline for training, podcasts, news, home sales videos, and cinematic content.',
    screenshotSlot: 'Insert screenshot: project templates and concept examples',
    videoSlot: 'Insert 00:30 clip: create project from multiple concept types',
  },
  {
    id: 4,
    title: 'Concept to Episode Series Automation',
    description:
      'Scale from single concept to episodic production with audience resonance insights guiding each iteration.',
    screenshotSlot: 'Insert screenshot: series and episode workspace with resonance panel',
    videoSlot: 'Insert 00:30 clip: concept converted into episode series',
  },
  {
    id: 5,
    title: 'Concept or Episode to Blueprint',
    description:
      'Build a production-ready blueprint with characters, beats, and constraints, then optimize with resonance recommendations.',
    screenshotSlot: 'Insert screenshot: blueprint sections for characters and story beats',
    videoSlot: 'Insert 00:30 clip: blueprint generation and optimization pass',
  },
  {
    id: 6,
    title: 'Blueprint to Production in One Click',
    description:
      'Generate scene-by-scene script, dialogue, and direction, then refine with script-level and scene-level resonance feedback.',
    screenshotSlot: 'Insert screenshot: generated scene cards and script review',
    videoSlot: 'Insert 00:30 clip: one-click start production and script generation',
  },
  {
    id: 7,
    title: 'Shared Reference Library for Continuity',
    description:
      'Maintain consistent characters, wardrobe, voices, locations, and props across scenes and episodes with reusable references.',
    screenshotSlot: 'Insert screenshot: reference library with characters, voices, and props',
    videoSlot: 'Insert 00:30 clip: reference reuse across multiple scenes',
  },
  {
    id: 8,
    title: '76+ Languages + Adaptive Translation',
    description:
      'Localize content at scale while preserving narrative intent and timeline alignment for multilingual delivery.',
    screenshotSlot: 'Insert screenshot: language selector and translated timeline tracks',
    videoSlot: 'Insert 00:30 clip: generate multilingual output and alignment',
  },
  {
    id: 9,
    title: 'Storyboard to Veo-Aligned Scene Production',
    description:
      'Create a quick audiovisual storyboard, then produce scenes with automated segmentation aligned to Veo 3.1 durations.',
    screenshotSlot: 'Insert screenshot: storyboard preview and segment breakdown',
    videoSlot: 'Insert 00:30 clip: storyboard to segmented scene generation',
  },
  {
    id: 10,
    title: 'Final Cut + Screening Room + Cloud Scale',
    description:
      'Edit with precision in Final Cut, validate with Screening Room feedback, and run on scalable Google Cloud infrastructure.',
    screenshotSlot: 'Insert screenshot: Final Cut timeline and Screening Room feedback',
    videoSlot: 'Insert 00:30 clip: final polish, screening, and publish readiness',
  },
  {
    id: 11,
    title: 'Audience Resonance Editor',
    description:
      'Determine your target audience. Get score, analysis, and recommendations. One-click fixes. Guided Edit to optimize Episodes, Blueprint, and Script.',
    screenshotSlot: 'Insert screenshot: Audience Resonance target selection and scoring panel',
    videoSlot: 'Insert 00:30 clip: AI analysis and guided one-click story fixes',
  },
  {
    id: 12,
    title: 'Sceneflow Express',
    description:
      'Auto generate images and video segments concurrently. Express Storyboard enables you to review and share audio (any available language) video storyboard in minutes vs hours. Express Animatics enables you to view and render a full Ken Burns animatic scene in minutes vs hours. Express Video enables you to view and render a full video scene in minutes vs days.',
    screenshotSlot: 'Insert screenshot: Express generation progress and Ken Burns animatic preview',
    videoSlot: 'Insert 00:30 clip: concurrent image/video generation and rapid animatic playback',
  },
];

function StoryboardCard({ 
  item, 
  onExpand 
}: { 
  item: FeatureStoryboardItem; 
  onExpand: (url: string) => void;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.45 }}
      className="rounded-2xl border border-white/10 bg-slate-900/50 p-5 backdrop-blur-sm"
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-200">
          {item.id}
        </span>
        <h3 className="text-lg font-semibold text-white">{item.title}</h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-300">{item.description}</p>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/70 p-4">
          <p className="mb-2 inline-flex items-center justify-between text-xs font-medium uppercase tracking-wide text-cyan-300">
            <span className="flex items-center gap-2">
              <Camera className="h-3.5 w-3.5" />
              Screenshot
            </span>
            {item.screenshotUrl && (
              <button 
                onClick={() => onExpand(item.screenshotUrl!)}
                className="hover:text-white transition-colors"
                title="Expand Image"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
            )}
          </p>
          <div 
            className={`aspect-video rounded-lg border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group ${item.screenshotUrl ? 'cursor-zoom-in' : ''}`}
            onClick={() => item.screenshotUrl && onExpand(item.screenshotUrl)}
          >
            {item.screenshotUrl ? (
              <>
                <NextImage 
                  src={item.screenshotUrl} 
                  alt={item.title}
                  width={640}
                  height={360}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Maximize2 className="w-6 h-6 text-white drop-shadow-lg" />
                </div>
              </>
            ) : (
              <div className="p-3 text-xs text-slate-400">
                {item.screenshotSlot}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/70 p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-300">
            <PlayCircle className="h-3.5 w-3.5" />
            Feature Video
          </p>
          <div className="aspect-video rounded-lg border border-white/10 bg-slate-900/70 overflow-hidden flex items-center justify-center relative group">
            {item.videoUrl ? (
              <video 
                src={item.videoUrl} 
                className="w-full h-full object-cover bg-black"
                controls
                muted 
                loop 
                playsInline 
                preload="metadata"
              />
            ) : (
              <div className="p-3 text-xs text-slate-400">
                {item.videoSlot}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function FeatureStoryboardSection() {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

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
            Product Walkthrough
          </h2>
          <p className="mt-4 text-base text-slate-300">
            A complete guide to the SceneFlow AI Studio workflow, from initial concept to final cinematic output.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {FEATURE_STORYBOARD_ITEMS.map((item) => (
            <StoryboardCard 
              key={item.id} 
              item={item} 
              onExpand={setExpandedImage} 
            />
          ))}
        </div>
      </div>

      {/* Lightbox / Expand Modal */}
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
    </section>
  );
}
