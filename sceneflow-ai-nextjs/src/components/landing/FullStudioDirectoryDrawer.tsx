'use client'

import type { ReactNode } from 'react'
import { Bot, ChevronDown, Clapperboard, Layers, Volume2 } from 'lucide-react'
import {
  SectionCollapseBody,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { cn } from '@/lib/utils'

export type FocusKeyFeaturePayload = {
  trackId: string
  icon: string
}

declare global {
  interface Window {
    __sceneflowPendingKeyFeature?: FocusKeyFeaturePayload | null
  }
}

export function requestFocusKeyFeature(payload: FocusKeyFeaturePayload) {
  if (typeof window === 'undefined') return
  window.__sceneflowPendingKeyFeature = payload
  window.dispatchEvent(
    new CustomEvent<FocusKeyFeaturePayload>('sceneflow:focus-key-feature', { detail: payload })
  )
}

export function FullStudioDirectoryDrawer({ children }: { children: ReactNode }) {
  const copy = useStudioLandingCopy().directoryDrawer
  const { isOpen, toggle, expand } = useLandingSectionCollapse('key-features')

  const jumpToFeature = (trackId: string, icon: string) => {
    requestFocusKeyFeature({ trackId, icon })
    expand()
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        const el =
          document.getElementById('key-features-feature-stage') ??
          document.getElementById('key-features')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    }
  }

  return (
    <div className="border-t border-slate-800/80 bg-slate-950">
      {/* Persistent scroll target when collapsed so #key-features smooth-scrolls cleanly */}
      {!isOpen ? (
        <span id="key-features" className="block h-0 w-0 scroll-mt-24" aria-hidden />
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-5 sm:p-7">
          <div className="flex flex-col items-start justify-between gap-5 lg:flex-row lg:items-center">
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                <Layers className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="whitespace-normal break-words">{copy.badge}</span>
              </span>
              <h3 className="mt-1.5 text-lg font-bold text-white sm:text-2xl">{copy.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-gray-300 sm:text-sm">
                {copy.subtitle}
              </p>
            </div>

            <button
              type="button"
              title={isOpen ? copy.collapseCta : copy.expandCta}
              onClick={toggle}
              aria-expanded={isOpen}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-emerald-400/45 bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-100 transition-all hover:border-emerald-300/70 hover:text-white sm:text-sm"
            >
              <span className="whitespace-normal text-left leading-snug">
                {isOpen ? copy.collapseCta : copy.expandCta}
              </span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 shrink-0 transition-transform duration-300',
                  isOpen && 'rotate-180'
                )}
                aria-hidden
              />
            </button>
          </div>

          {/* Always-visible Workflow Automation & 5K Narrated Spotlight Jump Cards */}
          <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-800/90 pt-5 md:grid-cols-3">
            <button
              type="button"
              title={`${copy.spotlightFlowDirectorLabel} — ${copy.spotlightFlowDirectorMeta}`}
              onClick={() => jumpToFeature('commercial-training', 'scriptSupervisor')}
              className="group flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3.5 text-left transition-all hover:border-emerald-400/60 hover:bg-emerald-500/[0.13]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                <Clapperboard className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block whitespace-normal break-words text-xs font-bold text-white group-hover:text-emerald-200 sm:text-sm">
                  {copy.spotlightFlowDirectorLabel}
                </span>
                <span className="mt-0.5 block whitespace-normal break-words text-[11px] leading-snug text-gray-300 sm:text-xs">
                  {copy.spotlightFlowDirectorMeta}
                </span>
              </span>
            </button>

            <button
              type="button"
              title={`${copy.spotlightAgentsLabel} — ${copy.spotlightAgentsMeta}`}
              onClick={() => jumpToFeature('commercial-training', 'productionAgent')}
              className="group flex items-start gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/[0.07] p-3.5 text-left transition-all hover:border-cyan-400/60 hover:bg-cyan-500/[0.13]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                <Bot className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block whitespace-normal break-words text-xs font-bold text-white group-hover:text-cyan-200 sm:text-sm">
                  {copy.spotlightAgentsLabel}
                </span>
                <span className="mt-0.5 block whitespace-normal break-words text-[11px] leading-snug text-gray-300 sm:text-xs">
                  {copy.spotlightAgentsMeta}
                </span>
              </span>
            </button>

            <button
              type="button"
              title={`${copy.spotlightNarrated5kLabel} — ${copy.spotlightNarrated5kMeta}`}
              onClick={() => jumpToFeature('commercial-training', 'scriptSupervisor')}
              className="group flex items-start gap-3 rounded-xl border border-indigo-500/30 bg-indigo-500/[0.07] p-3.5 text-left transition-all hover:border-indigo-400/60 hover:bg-indigo-500/[0.13]"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
                <Volume2 className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block whitespace-normal break-words text-xs font-bold text-white group-hover:text-indigo-200 sm:text-sm">
                  {copy.spotlightNarrated5kLabel}
                </span>
                <span className="mt-0.5 block whitespace-normal break-words text-[11px] leading-snug text-gray-300 sm:text-xs">
                  {copy.spotlightNarrated5kMeta}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <SectionCollapseBody sectionId="key-features">{children}</SectionCollapseBody>
    </div>
  )
}

export default FullStudioDirectoryDrawer
