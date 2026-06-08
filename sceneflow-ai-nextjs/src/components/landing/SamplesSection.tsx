'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Globe,
  Share2,
  Sparkles,
  Volume2,
  Clapperboard,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import {
  LANDING_SAMPLE,
  getLandingSampleShareHref,
} from '@/config/landingSamples'
import { LandingStoryboardEmbed } from '@/components/landing/LandingStoryboardEmbed'

const WORKFLOW_BULLETS = [
  { icon: Share2, text: 'Shareable pre-vis review links' },
  { icon: Volume2, text: 'Per-scene audio and narration' },
  { icon: Clapperboard, text: 'Dialogue-synced frame cuts in one playable review' },
] as const

export function CollaborationDemosPanel() {
  const storyboardHref = getLandingSampleShareHref()
  const projectTitle = LANDING_SAMPLE.projectTitle

  return (
    <div id="collaboration" className="scroll-mt-20">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="max-w-3xl mx-auto text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Live demo · Same sample project
        </div>
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
          Interactive Pre-Visualization
        </h3>
        <p className="text-lg text-slate-400 leading-relaxed">
          Play through a real pre-vis with per-scene audio, dialogue-synced frame cuts, and
          shareable review links — the same interactive experience collaborators use before
          production starts.
        </p>
        <p className="mt-4 text-base text-slate-500 leading-relaxed">
          Per-scene audio and dialogue-synced frame cuts in one playable review.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/10 text-base text-slate-300">
          <Globe className="w-4 h-4 text-cyan-400" />
          Sample: <span className="font-medium text-white">{projectTitle}</span>
        </div>
      </motion.div>

      <div className="w-full">
        <div className="w-full rounded-2xl border border-white/10 overflow-hidden bg-black/40 min-h-[360px] sm:min-h-[420px] lg:min-h-[520px]">
          <LandingStoryboardEmbed />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-12 flex flex-col gap-6 pt-8 border-t border-white/10"
      >
        <ul className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-8">
          {WORKFLOW_BULLETS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-2 text-base text-slate-400">
              <Icon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              {text}
            </li>
          ))}
        </ul>

        <div className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6">
          {storyboardHref ? (
            <Link
              href={storyboardHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-base font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Open interactive pre-vis
              <ExternalLink className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-base text-slate-500">
              Pre-vis link unavailable
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default CollaborationDemosPanel
