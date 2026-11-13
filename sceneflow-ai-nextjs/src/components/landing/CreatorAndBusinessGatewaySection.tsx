'use client'

import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  Briefcase,
  CheckCircle2,
  Clapperboard,
  Sparkles,
} from 'lucide-react'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { cn } from '@/lib/utils'

export const WHO_ITS_FOR_SECTION_ID = 'who-its-for'

const CARD_THEMES = {
  services: {
    icon: Briefcase,
    border: 'border-emerald-500/35 hover:border-emerald-400/60',
    glow: 'from-emerald-500/15 via-teal-500/5 to-transparent',
    badgeBg: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300',
    iconBox: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
    check: 'text-emerald-400',
    cta: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 hover:text-white',
  },
  aspiring: {
    icon: Sparkles,
    border: 'border-cyan-500/30 hover:border-cyan-400/55',
    glow: 'from-cyan-500/12 via-sky-500/5 to-transparent',
    badgeBg: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-300',
    iconBox: 'border-cyan-400/30 bg-cyan-500/15 text-cyan-300',
    check: 'text-cyan-400',
    cta: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 hover:text-white',
  },
  experienced: {
    icon: Clapperboard,
    border: 'border-violet-500/30 hover:border-violet-400/55',
    glow: 'from-violet-500/12 via-indigo-500/5 to-transparent',
    badgeBg: 'border-violet-400/30 bg-violet-500/10 text-violet-300',
    iconBox: 'border-violet-400/30 bg-violet-500/15 text-violet-300',
    check: 'text-violet-400',
    cta: 'border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 hover:text-white',
  },
} as const

export function CreatorAndBusinessGatewaySection() {
  const copy = useStudioLandingCopy().audienceGateway

  const scrollToTarget = (anchor: string) => {
    document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section
      id={WHO_ITS_FOR_SECTION_ID}
      className="relative scroll-mt-20 overflow-hidden border-t border-white/10 bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 py-20 sm:py-24"
    >
      {/* Legacy hash alias for bookmarks that pointed at #hero-video */}
      <span id="hero-video" className="absolute top-0 left-0 h-0 w-0 scroll-mt-20" aria-hidden />

      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.08),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mx-auto mb-14 max-w-4xl text-center"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            {copy.title}{' '}
            <span className="bg-gradient-to-r from-emerald-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent">
              {copy.titleAccent}
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-gray-300 sm:text-lg">
            {copy.subtitle}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {copy.cards.map((card, index) => {
            const theme = CARD_THEMES[card.id]
            const Icon = theme.icon
            return (
              <motion.article
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className={cn(
                  'group relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-slate-900/75 p-6 shadow-xl backdrop-blur-sm transition-all sm:p-7',
                  theme.border
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b',
                    theme.glow
                  )}
                  aria-hidden
                />

                <div className="relative">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                        theme.iconBox
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <span
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide',
                        theme.badgeBg
                      )}
                    >
                      {card.badge}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold leading-snug text-white sm:text-2xl">
                    {card.title}
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-gray-300">
                    {card.description}
                  </p>

                  <ul className="mt-5 space-y-2.5 border-t border-white/10 pt-5">
                    {card.highlights.map((bullet) => (
                      <li
                        key={bullet}
                        className="flex items-start gap-2.5 text-xs leading-relaxed text-gray-200 sm:text-sm"
                      >
                        <CheckCircle2
                          className={cn('mt-0.5 h-4 w-4 shrink-0', theme.check)}
                          aria-hidden
                        />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="relative mt-6 pt-2">
                  <button
                    type="button"
                    onClick={() => scrollToTarget(card.targetAnchor)}
                    className={cn(
                      'inline-flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-xs font-semibold transition-all sm:text-sm',
                      theme.cta
                    )}
                  >
                    <span>{card.ctaLabel}</span>
                    <ArrowDownRight className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                </div>
              </motion.article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default CreatorAndBusinessGatewaySection
