'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Clapperboard,
  FileText,
  Globe,
  MessageSquare,
  Play,
  Share2,
  Sparkles,
  Star,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import {
  LANDING_SAMPLE,
  getLandingBlueprintShareHref,
  getLandingSampleShareHref,
  getLandingScreeningShareHref,
} from '@/config/landingSamples'
import { LandingStoryboardEmbed } from '@/components/landing/LandingStoryboardEmbed'
import { LandingBlueprintEmbed } from '@/components/landing/LandingBlueprintEmbed'
import { LandingScreeningRoomEmbed } from '@/components/landing/LandingScreeningRoomEmbed'
import { cn } from '@/lib/utils'

const WORKFLOW_BULLETS = [
  { icon: FileText, text: 'Blueprint section feedback and team chat' },
  { icon: Share2, text: 'Shareable pre-vis review links' },
  { icon: Star, text: 'Screening Room reactions from collaborators' },
] as const

const SAMPLE_STEPS = [
  {
    id: 'blueprint' as const,
    step: 1,
    title: 'Blueprint collaboration',
    shortTitle: 'Blueprint',
    caption:
      'Collaborators read the treatment, listen to section audio, and leave structured feedback before production starts.',
    icon: FileText,
    accent: 'purple',
  },
  {
    id: 'storyboard' as const,
    step: 2,
    title: 'Interactive pre-vis',
    shortTitle: 'Pre-vis',
    caption: 'Per-scene audio and dialogue-synced frame cuts in one playable review.',
    icon: Clapperboard,
    accent: 'emerald',
  },
  {
    id: 'screening' as const,
    step: 3,
    title: 'Screening Room',
    shortTitle: 'Screening',
    caption:
      'Watch the Express animatic cut and react like a test audience — the same flow collaborators use before final publish.',
    icon: Play,
    accent: 'cyan',
  },
] as const

type SampleTab = (typeof SAMPLE_STEPS)[number]['id']

function tabActiveClasses(accent: string, isActive: boolean) {
  if (!isActive) return 'text-slate-400 hover:text-white hover:bg-white/5'
  if (accent === 'purple') return 'bg-purple-600 text-white shadow-sm'
  if (accent === 'emerald') return 'bg-emerald-600 text-white shadow-sm'
  if (accent === 'cyan') return 'bg-cyan-600 text-white shadow-sm'
  return 'bg-purple-600 text-white shadow-sm'
}

function accentBadgeClasses(accent: string) {
  if (accent === 'purple') return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
  if (accent === 'emerald') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
  if (accent === 'cyan') return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
  return 'bg-purple-500/15 text-purple-400 border-purple-500/30'
}

export function CollaborationDemosPanel() {
  const [activeTab, setActiveTab] = useState<SampleTab>('blueprint')
  const blueprintHref = getLandingBlueprintShareHref()
  const storyboardHref = getLandingSampleShareHref()
  const screeningHref = getLandingScreeningShareHref()
  const projectTitle = LANDING_SAMPLE.projectTitle
  const activeStep = SAMPLE_STEPS.find((s) => s.id === activeTab) ?? SAMPLE_STEPS[0]
  const ActiveIcon = activeStep.icon

  const renderMedia = (id: SampleTab) => {
    if (id === 'blueprint') {
      return <LandingBlueprintEmbed />
    }
    if (id === 'storyboard') {
      return <LandingStoryboardEmbed />
    }
    return <LandingScreeningRoomEmbed />
  }

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
          Real collaboration · Same project
        </div>
        <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-6">
          Experience the collaborator journey — Blueprint, Pre-vis, Screening Room
        </h3>
        <p className="text-lg text-slate-400 leading-relaxed">
          See how teammates and clients review your work at every stage: structured Blueprint
          feedback, playable pre-vis approval, and Screening Room reactions on the Express
          animatic — all on one sample project before you sign up.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 border border-white/10 text-base text-slate-300">
          <Globe className="w-4 h-4 text-cyan-400" />
          Sample: <span className="font-medium text-white">{projectTitle}</span>
        </div>
      </motion.div>

      <div className="w-full">
        <div
          role="tablist"
          aria-label="Collaboration tool demos"
          className="flex rounded-xl bg-slate-900/80 border border-white/10 p-1 gap-1"
        >
          {SAMPLE_STEPS.map(({ id, title, shortTitle, accent }) => {
            const isActive = activeTab === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`sample-tab-${id}`}
                aria-selected={isActive}
                aria-controls="sample-media-pane"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex-1 py-2.5 px-2 sm:px-4 text-sm sm:text-base font-medium rounded-lg transition-colors capitalize',
                  tabActiveClasses(accent, isActive)
                )}
              >
                <span className="hidden sm:inline">{title}</span>
                <span className="sm:hidden">{shortTitle}</span>
              </button>
            )
          })}
        </div>

        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-4 flex items-start gap-3 px-1"
        >
          <span
            className={cn(
              'flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-sm font-bold',
              accentBadgeClasses(activeStep.accent)
            )}
          >
            {activeStep.step}
          </span>
          <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-2 mb-1">
              <ActiveIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <h4 className="text-base sm:text-lg font-semibold text-white capitalize">
                {activeStep.title}
              </h4>
            </div>
            <p className="text-base text-slate-400 leading-relaxed">{activeStep.caption}</p>
          </div>
        </motion.div>

        <div
          id="sample-media-pane"
          role="tabpanel"
          aria-labelledby={`sample-tab-${activeTab}`}
          className="mt-4 w-full rounded-2xl border border-white/10 overflow-hidden bg-black/40 min-h-[360px] sm:min-h-[420px] lg:min-h-[520px]"
        >
          {renderMedia(activeTab)}
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
          {blueprintHref ? (
            <Link
              href={blueprintHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-base font-medium text-purple-400 hover:text-purple-300 transition-colors"
            >
              Open Blueprint review
              <ExternalLink className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-base text-slate-500">
              Blueprint link — set blueprintShareToken
              <ArrowRight className="w-4 h-4" />
            </span>
          )}
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
          {screeningHref ? (
            <Link
              href={screeningHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-base font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Open Screening Room
              <ExternalLink className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-2 text-base text-slate-500">
              Screening Room link — set premiereScreeningId
              <MessageSquare className="w-4 h-4" />
            </span>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default CollaborationDemosPanel
