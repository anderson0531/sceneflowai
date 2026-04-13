'use client';

import { motion } from 'framer-motion';
import { Camera, PlayCircle, Clock3 } from 'lucide-react';

type FeatureStoryboardItem = {
  id: number;
  title: string;
  description: string;
  videoPlaceholder: string;
  screenshotPlaceholder: string;
};

const FEATURE_STORYBOARD_ITEMS: FeatureStoryboardItem[] = [
  {
    id: 1,
    title: 'Intuitive UX + Full Creator Control',
    description:
      'Start fast with guided automation, then edit every generated output so teams keep creative control without losing speed.',
    screenshotPlaceholder: 'Screenshot: Blueprint editor with editable generated sections',
    videoPlaceholder: 'Video Placeholder (00:30): UX flow from concept to editable output',
  },
  {
    id: 2,
    title: 'Credit Budget Tracking + Vertex AI BYOK',
    description:
      'Track credit usage in real time, set practical production guardrails, and use Vertex AI BYOK for enterprise governance.',
    screenshotPlaceholder: 'Screenshot: credit usage panel and BYOK settings screen',
    videoPlaceholder: 'Video Placeholder (00:30): budget dashboard and key configuration',
  },
  {
    id: 3,
    title: 'Any Concept, One Production Workflow',
    description:
      'Use one reliable pipeline for training, podcasts, news, home sales videos, and cinematic content.',
    screenshotPlaceholder: 'Screenshot: project templates and concept examples',
    videoPlaceholder: 'Video Placeholder (00:30): create project from multiple concept types',
  },
  {
    id: 4,
    title: 'Concept to Episode Series Automation',
    description:
      'Scale from single concept to episodic production with audience resonance insights guiding each iteration.',
    screenshotPlaceholder: 'Screenshot: series and episode workspace with resonance panel',
    videoPlaceholder: 'Video Placeholder (00:30): concept converted into episode series',
  },
  {
    id: 5,
    title: 'Concept or Episode to Blueprint',
    description:
      'Build a production-ready blueprint with characters, beats, and constraints, then optimize with resonance recommendations.',
    screenshotPlaceholder: 'Screenshot: blueprint sections for characters and story beats',
    videoPlaceholder: 'Video Placeholder (00:30): blueprint generation and optimization pass',
  },
  {
    id: 6,
    title: 'Blueprint to Production in One Click',
    description:
      'Generate scene-by-scene script, dialogue, and direction, then refine with script-level and scene-level resonance feedback.',
    screenshotPlaceholder: 'Screenshot: generated scene cards and script review',
    videoPlaceholder: 'Video Placeholder (00:30): one-click start production and script generation',
  },
  {
    id: 7,
    title: 'Shared Reference Library for Continuity',
    description:
      'Maintain consistent characters, wardrobe, voices, locations, and props across scenes and episodes with reusable references.',
    screenshotPlaceholder: 'Screenshot: reference library with characters, voices, and props',
    videoPlaceholder: 'Video Placeholder (00:30): reference reuse across multiple scenes',
  },
  {
    id: 8,
    title: '76+ Languages + Adaptive Translation',
    description:
      'Localize content at scale while preserving narrative intent and timeline alignment for multilingual delivery.',
    screenshotPlaceholder: 'Screenshot: language selector and translated timeline tracks',
    videoPlaceholder: 'Video Placeholder (00:30): generate multilingual output and alignment',
  },
  {
    id: 9,
    title: 'Storyboard to Veo-Aligned Scene Production',
    description:
      'Create a quick audiovisual storyboard, then produce scenes with automated segmentation aligned to Veo 3.1 durations.',
    screenshotPlaceholder: 'Screenshot: storyboard preview and segment breakdown',
    videoPlaceholder: 'Video Placeholder (00:30): storyboard to segmented scene generation',
  },
  {
    id: 10,
    title: 'Final Cut + Screening Room + Cloud Scale',
    description:
      'Edit with precision in Final Cut, validate with Screening Room feedback, and run on scalable Google Cloud infrastructure.',
    screenshotPlaceholder: 'Screenshot: Final Cut timeline, Screening Room feedback metrics',
    videoPlaceholder: 'Video Placeholder (00:30): final polish, screening, and publish readiness',
  },
];

function StoryboardCard({ item }: { item: FeatureStoryboardItem }) {
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
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-cyan-300">
            <Camera className="h-3.5 w-3.5" />
            Screenshot
          </p>
          <div className="aspect-video rounded-lg border border-white/10 bg-slate-900/70 p-3 text-xs text-slate-400">
            {item.screenshotPlaceholder}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-white/20 bg-slate-950/70 p-4">
          <p className="mb-2 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-violet-300">
            <PlayCircle className="h-3.5 w-3.5" />
            Feature Video
          </p>
          <div className="aspect-video rounded-lg border border-white/10 bg-slate-900/70 p-3 text-xs text-slate-400">
            {item.videoPlaceholder}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export default function FeatureStoryboardSection() {
  return (
    <section id="feature-storyboard" className="bg-slate-950 py-20 sm:py-24">
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
            5-Minute Product Walkthrough
          </p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Feature Storyboard (10 x 30s Blocks)
          </h2>
          <p className="mt-4 text-base text-slate-300">
            A practical, screen-capture-ready structure with dedicated placeholders for screenshot proof and feature demo clips.
          </p>
        </motion.div>

        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          {FEATURE_STORYBOARD_ITEMS.map((item) => (
            <StoryboardCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
