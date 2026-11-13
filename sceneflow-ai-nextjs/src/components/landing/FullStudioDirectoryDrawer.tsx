'use client'

import type { ReactNode } from 'react'
import { ChevronDown, Layers } from 'lucide-react'
import {
  SectionCollapseBody,
  useLandingSectionCollapse,
} from '@/components/landing/LandingSectionCollapse'
import { useStudioLandingCopy } from '@/components/landing/useStudioLandingCopy'
import { cn } from '@/lib/utils'

export function FullStudioDirectoryDrawer({ children }: { children: ReactNode }) {
  const copy = useStudioLandingCopy().directoryDrawer
  const { isOpen, toggle } = useLandingSectionCollapse('key-features')

  return (
    <div className="border-t border-slate-800/80 bg-slate-950">
      {/* Persistent scroll target when collapsed so #key-features smooth-scrolls cleanly */}
      {!isOpen ? (
        <span id="key-features" className="block h-0 w-0 scroll-mt-24" aria-hidden />
      ) : null}

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:flex-row sm:items-center sm:p-7">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-300">
              <Layers className="h-3.5 w-3.5" aria-hidden />
              {copy.badge}
            </span>
            <h3 className="mt-1.5 text-lg font-bold text-white sm:text-xl">{copy.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-gray-400 sm:text-sm">
              {copy.subtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={toggle}
            aria-expanded={isOpen}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-indigo-400/40 bg-indigo-500/15 px-4 py-2.5 text-xs font-semibold text-indigo-200 transition-all hover:bg-indigo-500/25 hover:text-white sm:text-sm"
          >
            <span>{isOpen ? copy.collapseCta : copy.expandCta}</span>
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-300', isOpen && 'rotate-180')}
              aria-hidden
            />
          </button>
        </div>
      </div>

      <SectionCollapseBody sectionId="key-features">{children}</SectionCollapseBody>
    </div>
  )
}

export default FullStudioDirectoryDrawer
