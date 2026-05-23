'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Clapperboard,
  Film,
  Globe,
  Languages,
  Layers,
  Share2,
  Sparkles,
  Video,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { LANDING_SAMPLE, getLandingSampleShareHref } from '@/config/landingSamples'
import { LandingStoryboardEmbed } from '@/components/landing/LandingStoryboardEmbed'
import { LandingSampleVideo } from '@/components/landing/LandingSampleVideo'
import { cn } from '@/lib/utils'

const WORKFLOW_BULLETS = [
  { icon: Share2, text: 'Shareable storyboard review links' },
  { icon: Languages, text: '70+ language audio and localization' },
  { icon: Layers, text: 'One output stream or many — scale reach without re-editing' },
] as const

const SAMPLE_STEPS = [
  {
    id: 'storyboard' as const,
    step: 1,
    title: 'Interactive storyboard',
    caption: 'Per-scene audio and dialogue-synced frame cuts in one playable review.',
    icon: Clapperboard,
    accent: 'emerald',
  },
  {
    id: 'animatic' as const,
    step: 2,
    title: 'Express animatic',
    caption: 'Fast, low-cost motion preview — ideal for JIT news, education, and documentary.',
    icon: Film,
    accent: 'cyan',
  },
  {
    id: 'full' as const,
    step: 3,
    title: 'Full lipsync video',
    caption: 'Express concurrent generation from storyboard frames — 70+ languages.',
    icon: Video,
    accent: 'purple',
  },
] as const

type SampleTab = (typeof SAMPLE_STEPS)[number]['id']

function SampleCard({
  step,
  title,
  caption,
  icon: Icon,
  accent,
  children,
  className,
}: {
  step: number
  title: string
  caption: string
  icon: typeof Clapperboard
  accent: string
  children: React.ReactNode
  className?: string
}) {
  const accentBorder =
    accent === 'emerald'
      ? 'border-emerald-500/20'
      : accent === 'cyan'
        ? 'border-cyan-500/20'
        : 'border-purple-500/20'
  const accentBadge =
    accent === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      : accent === 'cyan'
        ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
        : 'bg-purple-500/15 text-purple-400 border-purple-500/30'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: step * 0.08 }}
      className={cn(
        'flex flex-col rounded-2xl border bg-slate-900/50 backdrop-blur-sm overflow-hidden',
        accentBorder,
        className
      )}
    >
      <div className="px-4 pt-4 pb-3 flex items-start gap-3">
        <span
          className={cn(
            'flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold',
            accentBadge
          )}
        >
          {step}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <h3 className="text-base font-semibold text-white">{title}</h3>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{caption}</p>
        </div>
      </div>
      <div className="flex-1 min-h-[220px] lg:min-h-[280px] border-t border-white/5 bg-black/40">
        {children}
      </div>
    </motion.div>
  )
}

export function SamplesSection() {
  const [mobileTab, setMobileTab] = useState<SampleTab>('storyboard')
  const shareHref = getLandingSampleShareHref()
  const projectTitle = LANDING_SAMPLE.projectTitle

  const renderMedia = (id: SampleTab) => {
    if (id === 'storyboard') {
      return <LandingStoryboardEmbed />
    }
    if (id === 'animatic') {
      return (
        <LandingSampleVideo
          src={LANDING_SAMPLE.animaticVideoUrl}
          placeholderTitle="Express animatic sample — configure animaticVideoUrl"
        />
      )
    }
    return (
      <LandingSampleVideo
        src={LANDING_SAMPLE.fullVideoUrl}
        placeholderTitle="Full lipsync video sample — configure fullVideoUrl"
      />
    )
  }

  return (
    <section
      id="samples"
      className="py-24 bg-slate-950 relative overflow-hidden scroll-mt-20"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(16,185,129,0.08),transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(6,182,212,0.06),transparent_45%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            Real outputs · Same project
          </div>
          <h2 className="landing-section-heading text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            From storyboard to broadcast — one project, three outputs
          </h2>
          <p className="text-lg text-slate-400 leading-relaxed">
            Start with a full audio-visual storyboard — scene images, dialogue-synced frames, and
            narration in one playable review. Share it with teammates or customers for feedback and
            approval. When you&apos;re ready, render the same project as a fast, low-cost animatic
            (ideal for JIT news, education, and documentary). Then use your storyboard frames to
            drive Express concurrent generation of full lipsync video — in 70+ languages, as one
            stream or multiple streams to expand your reach.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/10 text-sm text-slate-300">
            <Globe className="w-4 h-4 text-cyan-400" />
            Sample: <span className="font-medium text-white">{projectTitle}</span>
          </div>
        </motion.div>

        {/* Mobile: tabs */}
        <div className="lg:hidden mb-4">
          <div className="flex rounded-xl bg-slate-900/80 border border-white/10 p-1 gap-1">
            {SAMPLE_STEPS.map(({ id, title }) => (
              <button
                key={id}
                type="button"
                onClick={() => setMobileTab(id)}
                className={cn(
                  'flex-1 py-2 px-2 text-xs sm:text-sm font-medium rounded-lg transition-colors',
                  mobileTab === id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                {title.replace('Interactive ', '').replace('Express ', '').replace('Full ', '')}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 overflow-hidden min-h-[300px]">
            {renderMedia(mobileTab)}
          </div>
        </div>

        {/* Desktop: 3-column grid */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {SAMPLE_STEPS.map(({ id, ...item }) => (
            <SampleCard key={id} {...item}>
              {renderMedia(id)}
            </SampleCard>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 border-t border-white/10"
        >
          <ul className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-8">
            {WORKFLOW_BULLETS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2 text-sm text-slate-400">
                <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                {text}
              </li>
            ))}
          </ul>
          {shareHref ? (
            <Link
              href={shareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors whitespace-nowrap"
            >
              Open interactive storyboard review
              <ExternalLink className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-sm text-slate-500">
              Full review link available when share slug is configured
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export default SamplesSection
