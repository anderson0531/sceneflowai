'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import {
  COLLAPSIBLE_LANDING_SECTION_IDS,
  LANDING_HASH_TO_SECTION,
  type CollapsibleLandingSectionId,
} from '@/config/landing/landingSectionCollapseCopy'

type ExpandedMap = Record<string, boolean>

type LandingSectionCollapseContextValue = {
  isOpen: (sectionId: string) => boolean
  toggle: (sectionId: string) => void
  expand: (sectionId: string) => void
}

const LandingSectionCollapseContext = createContext<LandingSectionCollapseContextValue | null>(
  null
)

function useLandingSectionCollapseContext() {
  const ctx = useContext(LandingSectionCollapseContext)
  if (!ctx) {
    throw new Error('LandingSectionCollapse components must be used within LandingSectionCollapseProvider')
  }
  return ctx
}

export function useLandingSectionCollapse(sectionId: string) {
  const { isOpen, toggle, expand } = useLandingSectionCollapseContext()
  return {
    isOpen: isOpen(sectionId),
    toggle: () => toggle(sectionId),
    expand: () => expand(sectionId),
  }
}

function resolveSectionFromHash(hash: string): CollapsibleLandingSectionId | undefined {
  const id = hash.replace(/^#/, '')
  if (!id) return undefined
  if (id in LANDING_HASH_TO_SECTION) {
    return LANDING_HASH_TO_SECTION[id]
  }
  if ((COLLAPSIBLE_LANDING_SECTION_IDS as readonly string[]).includes(id)) {
    return id as CollapsibleLandingSectionId
  }
  if (id.startsWith('use-cases-')) return 'use-cases'
  if (id.startsWith('walkthrough-chapter-')) return 'feature-pre-vis'
  return undefined
}

function buildDefaultExpandedMap(): ExpandedMap {
  return Object.fromEntries(COLLAPSIBLE_LANDING_SECTION_IDS.map((id) => [id, false]))
}

export function LandingSectionCollapseProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState<ExpandedMap>(buildDefaultExpandedMap)

  const isOpen = useCallback(
    (sectionId: string) => expanded[sectionId] === true,
    [expanded]
  )

  const toggle = useCallback((sectionId: string) => {
    setExpanded((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }))
  }, [])

  const expand = useCallback((sectionId: string) => {
    setExpanded((prev) => ({ ...prev, [sectionId]: true }))
  }, [])

  useEffect(() => {
    const syncFromHash = () => {
      const sectionId = resolveSectionFromHash(window.location.hash)
      if (sectionId) {
        expand(sectionId)
      }
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [expand])

  const value = useMemo(
    () => ({ isOpen, toggle, expand }),
    [isOpen, toggle, expand]
  )

  return (
    <LandingSectionCollapseContext.Provider value={value}>
      {children}
    </LandingSectionCollapseContext.Provider>
  )
}

export function SectionCollapseToggle({
  sectionId,
  className,
}: {
  sectionId: string
  className?: string
}) {
  const t = useTranslations('landingSections')
  const { isOpen, toggle } = useLandingSectionCollapse(sectionId)
  const panelId = `${sectionId}-collapse-panel`

  return (
    <button
      type="button"
      onClick={toggle}
      aria-expanded={isOpen}
      aria-controls={panelId}
      aria-label={isOpen ? t('collapseSection') : t('expandSection')}
      className={cn(
        'inline-flex items-center justify-center rounded-lg border border-white/10 bg-slate-900/60 p-2 text-slate-400 transition-colors hover:border-white/20 hover:bg-slate-800/80 hover:text-white',
        className
      )}
    >
      <ChevronDown
        className={cn('h-5 w-5 transition-transform duration-300', isOpen && 'rotate-180')}
      />
    </button>
  )
}

export function SectionCollapseBody({
  sectionId,
  children,
}: {
  sectionId: string
  children: ReactNode
}) {
  const { isOpen } = useLandingSectionCollapse(sectionId)
  const panelId = `${sectionId}-collapse-panel`

  return (
    <AnimatePresence initial={false}>
      {isOpen ? (
        <motion.div
          id={panelId}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

export function useExpandLandingSection() {
  const { expand } = useLandingSectionCollapseContext()
  return expand
}
