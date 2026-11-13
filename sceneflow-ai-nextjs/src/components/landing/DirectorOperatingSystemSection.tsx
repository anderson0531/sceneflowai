'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Bot,
  CheckCircle2,
  FileText,
  Globe2,
  Mic,
  Play,
  Share2,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { TwoModesTheaterModal } from '@/components/landing/TwoModesTheaterModal'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import type { SuperpowerMicroVisualsCopy } from '@/config/landing/worldClassLandingCopy'
import { getPrimaryValueMedia } from '@/config/landing/primaryValueMedia'
import { getTwoModesMedia, type TwoModesMediaEntry } from '@/config/landing/twoModesMedia'
import { cn } from '@/lib/utils'

export const FIVE_SUPERPOWERS_SECTION_ID = 'five-superpowers'

const SUPERPOWER_HASH_ALIASES = [
  'two-modes',
  'core-capabilities',
  'audience-resonance',
  'pre-vis-engine',
  'direct-control',
  'production-agent',
  'publish-cut',
] as const

type ClipKey = 'comparison' | 'direction' | 'agent' | 'publish'

const STEP_ACCENTS = [
  'border-indigo-500/35 bg-indigo-500/10 text-indigo-200',
  'border-violet-500/35 bg-violet-500/10 text-violet-200',
  'border-cyan-500/35 bg-cyan-500/10 text-cyan-200',
] as const

function BaselineMicroVisual({ copy }: { copy: SuperpowerMicroVisualsCopy['baseline'] }) {
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
        <span className="inline-flex items-center gap-1.5 font-medium text-cyan-300">
          <Mic className="h-3.5 w-3.5" aria-hidden />
          {copy.intakePrompt}
        </span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          {copy.autoBadge}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {copy.steps.map((item, idx) => (
          <div
            key={item.step}
            className={cn(
              'rounded-lg border px-3 py-2.5 text-start',
              STEP_ACCENTS[idx] ?? STEP_ACCENTS[0]
            )}
          >
            <p className="text-xs font-bold text-white">{item.step}</p>
            <p className="mt-0.5 text-[11px] opacity-90">{item.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function DialogControlMicroVisual({ copy }: { copy: SuperpowerMicroVisualsCopy['dialog'] }) {
  return (
    <div className="mt-5 space-y-2.5 rounded-xl border border-white/10 bg-slate-950/80 p-4">
      <div className="flex items-start gap-2.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2">
        <Mic className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
        <p className="text-xs italic leading-relaxed text-cyan-100">{copy.quote}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 pt-0.5">
        <span className="rounded-md border border-purple-500/30 bg-purple-500/15 px-2 py-1 text-[11px] font-medium text-purple-200">
          {copy.chipCast}
        </span>
        <span className="rounded-md border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-[11px] font-medium text-amber-200">
          {copy.chipWardrobe}
        </span>
      </div>
    </div>
  )
}

function ReviewAssistanceMicroVisual({ copy }: { copy: SuperpowerMicroVisualsCopy['review'] }) {
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/80 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-500/15 text-xs font-extrabold text-emerald-300">
            92
          </span>
          <div>
            <p className="text-xs font-semibold text-white">{copy.arLabel}</p>
            <p className="text-[11px] text-emerald-300">{copy.arStatus}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-gray-200">{copy.gateSeries}</span>
          <span className="rounded bg-slate-800 px-1.5 py-0.5 text-gray-200">
            {copy.gateBlueprint}
          </span>
          <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-200">
            {copy.gateScript}
          </span>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-indigo-500/25 bg-indigo-500/10 px-2.5 py-1.5 text-[11px] text-indigo-200">
        <Wand2 className="h-3.5 w-3.5 shrink-0 text-indigo-300" aria-hidden />
        <span>{copy.flowDirectorNote}</span>
      </div>
    </div>
  )
}

function AutonomousAgentsMicroVisual({ copy }: { copy: SuperpowerMicroVisualsCopy['agents'] }) {
  return (
    <div className="mt-5 space-y-2 rounded-xl border border-white/10 bg-slate-950/80 p-3.5">
      {copy.rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-2 rounded-lg bg-slate-900/90 px-2.5 py-1.5 text-[11px]"
        >
          <span className="flex items-center gap-1.5 text-gray-200">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            <span>{row.label}</span>
          </span>
          <span className="shrink-0 font-semibold text-emerald-300">{row.status}</span>
        </div>
      ))}
    </div>
  )
}

function CollaborationMicroVisual({
  copy,
}: {
  copy: SuperpowerMicroVisualsCopy['collaboration']
}) {
  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/80 p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-semibold text-amber-200">
          <Share2 className="h-3.5 w-3.5 text-amber-400" aria-hidden />
          /share/screening-room/client-cut
        </span>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          {copy.approvedBadge}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {['EN', 'ES', 'PT', 'ZH', 'HI', 'AR', 'TH', copy.dubsChip].map((lang) => (
          <span
            key={lang}
            className="rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 text-[10px] font-medium text-gray-300"
          >
            {lang}
          </span>
        ))}
      </div>
    </div>
  )
}

const PILLAR_ICONS = {
  baseline: FileText,
  dialog: Mic,
  review: Target,
  agents: Bot,
  collaboration: Globe2,
} as const

export function DirectorOperatingSystemSection() {
  const locale = useLocale()
  const tCommon = useTranslations('common')
  const copy = useStudioLandingCopy().superpowers
  const [activeClip, setActiveClip] = useState<{
    title: string
    media: TwoModesMediaEntry
  } | null>(null)

  const openClip = (key: ClipKey, title: string) => {
    const media =
      key === 'comparison'
        ? getTwoModesMedia('comparison', locale)
        : getPrimaryValueMedia(key, locale)
    if (media.webmUrl || media.mp4Url) {
      setActiveClip({ title, media })
    }
  }

  return (
    <section
      id={FIVE_SUPERPOWERS_SECTION_ID}
      className="relative scroll-mt-20 overflow-hidden bg-slate-950 py-20 sm:py-28"
    >
      {SUPERPOWER_HASH_ALIASES.map((alias) => (
        <span
          key={alias}
          id={alias}
          className="absolute top-0 left-0 h-0 w-0 scroll-mt-20"
          aria-hidden
        />
      ))}

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.09),transparent_65%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-14 max-w-3xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/10 px-4 py-1.5">
            <Sparkles className="h-4 w-4 text-indigo-400" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
              {copy.eyebrow}
            </span>
          </div>

          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {copy.title}{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-cyan-300 to-emerald-300 bg-clip-text text-transparent">
              {copy.titleAccent}
            </span>
          </h2>

          <p className="mt-4 text-base leading-relaxed text-gray-300 sm:text-lg">
            {copy.subtitle}
          </p>
        </motion.div>

        {/* 12-Column Interactive Bento Grid: Row 1 = 6 + 6, Row 2 = 4 + 4 + 4 */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {copy.pillars.map((pillar, index) => {
            const Icon = PILLAR_ICONS[pillar.id]
            const colSpan = index < 2 ? 'lg:col-span-6' : 'lg:col-span-4'

            return (
              <motion.div
                key={pillar.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.06 }}
                className={cn(
                  'flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 to-slate-900/60 p-6 shadow-xl transition-colors hover:border-indigo-500/40 sm:p-7',
                  colSpan
                )}
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-300">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="text-xs font-bold tracking-wider text-cyan-300/90 uppercase">
                        {pillar.number} · {pillar.badge}
                      </span>
                    </div>

                    {pillar.videoClipKey ? (
                      <button
                        type="button"
                        onClick={() => openClip(pillar.videoClipKey!, pillar.title)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold text-gray-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-500/15 hover:text-white"
                      >
                        <Play className="h-3 w-3 fill-current text-cyan-300" aria-hidden />
                        <span>{copy.watchClipLabel}</span>
                      </button>
                    ) : null}
                  </div>

                  <h3 className="mt-4 text-xl font-bold leading-snug text-white">
                    {pillar.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-300">
                    {pillar.description}
                  </p>
                </div>

                <div>
                  {pillar.id === 'baseline' && (
                    <BaselineMicroVisual copy={copy.microVisuals.baseline} />
                  )}
                  {pillar.id === 'dialog' && (
                    <DialogControlMicroVisual copy={copy.microVisuals.dialog} />
                  )}
                  {pillar.id === 'review' && (
                    <ReviewAssistanceMicroVisual copy={copy.microVisuals.review} />
                  )}
                  {pillar.id === 'agents' && (
                    <AutonomousAgentsMicroVisual copy={copy.microVisuals.agents} />
                  )}
                  {pillar.id === 'collaboration' && (
                    <CollaborationMicroVisual copy={copy.microVisuals.collaboration} />
                  )}

                  <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs text-gray-400">
                    <span className="font-medium text-slate-300">{pillar.outcomeTag}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {activeClip ? (
        <TwoModesTheaterModal
          open={Boolean(activeClip)}
          onClose={() => setActiveClip(null)}
          media={activeClip.media}
          caption={activeClip.title}
          pauseLabel={tCommon('pause')}
          playLabel={tCommon('play')}
          muteLabel={tCommon('mute')}
          unmuteLabel={tCommon('unmute')}
        />
      ) : null}
    </section>
  )
}

export default DirectorOperatingSystemSection
