'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Workflow } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StepImagePlaceholder } from '@/components/landing/StepImagePlaceholder'
import { cn } from '@/lib/utils'

const SECTION_ID = 'how-it-works'
const DEFAULT_SUBSTEP = 'draft-script'

type PhaseStep = {
  id: string
  tabLabel: string
  number: string
  label: string
  headline: string
  narrative: string
  imagePlaceholder: string
  substeps?: Substep[]
}

type Substep = {
  id: string
  number: string
  label: string
  narrative: string
  imagePlaceholder: string
}

function PhaseDetailPanel({ phase }: { phase: PhaseStep }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-sm font-bold text-indigo-300">
            {phase.number}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {phase.label}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-white">{phase.headline}</h3>
        <p className="text-base text-gray-400 leading-relaxed">{phase.narrative}</p>
      </div>
      <StepImagePlaceholder
        stepId={phase.id}
        placeholderText={phase.imagePlaceholder}
        alt={phase.headline}
      />
    </div>
  )
}

function ProductionPhasePanel({
  phase,
  activeSubstep,
  onSubstepChange,
}: {
  phase: PhaseStep
  activeSubstep: string
  onSubstepChange: (id: string) => void
}) {
  const substeps = phase.substeps ?? []
  const active = substeps.find((s) => s.id === activeSubstep) ?? substeps[0]

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-sm font-bold text-indigo-300">
            {phase.number}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {phase.label}
          </span>
        </div>
        <h3 className="text-xl md:text-2xl font-bold text-white">{phase.headline}</h3>
        <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">{phase.narrative}</p>
      </div>

      <div className="lg:hidden -mx-1 overflow-x-auto pb-1">
        <div className="inline-flex gap-1.5 p-1 min-w-max">
          {substeps.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSubstepChange(sub.id)}
              className={cn(
                'shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all',
                activeSubstep === sub.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              )}
            >
              {sub.number}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(200px,240px)_1fr] gap-6 lg:gap-8">
        <nav className="hidden lg:flex flex-col gap-1" aria-label="Production milestones">
          {substeps.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => onSubstepChange(sub.id)}
              className={cn(
                'text-left rounded-xl px-3 py-2.5 text-sm transition-all duration-200',
                activeSubstep === sub.id
                  ? 'bg-indigo-600/20 border border-indigo-500/40 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              )}
            >
              <span className="text-indigo-400/80 font-mono text-xs mr-2">{sub.number}</span>
              <span className="font-medium leading-snug">{sub.label}</span>
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {active && (
            <motion.div
              key={active.id}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="lg:hidden space-y-2">
                <p className="text-indigo-300 font-mono text-sm">{active.number}</p>
                <h4 className="text-lg font-semibold text-white">{active.label}</h4>
              </div>
              <div className="hidden lg:block space-y-2">
                <p className="text-indigo-300 font-mono text-sm">{active.number}</p>
                <h4 className="text-xl font-semibold text-white">{active.label}</h4>
              </div>
              <p className="text-gray-400 leading-relaxed">{active.narrative}</p>
              <StepImagePlaceholder
                stepId={active.id}
                placeholderText={active.imagePlaceholder}
                alt={active.label}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function HowItWorksSteps() {
  const t = useTranslations('guidedSteps')
  const phases = t.raw('phases') as PhaseStep[]
  const [activeSubstep, setActiveSubstep] = useState(DEFAULT_SUBSTEP)

  const productionPhase = phases.find((p) => p.id === 'production')

  const handlePhaseChange = (value: string) => {
    if (value === 'production') {
      setActiveSubstep(DEFAULT_SUBSTEP)
    }
  }

  return (
    <section id={SECTION_ID} className="scroll-mt-20 bg-gray-950 py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 mb-6">
            <Workflow className="w-4 h-4 text-slate-300" />
            <span className="text-sm font-medium text-slate-300">{t('badge')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">{t('title')}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        <Tabs defaultValue="start" onValueChange={handlePhaseChange} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 w-full max-w-2xl mx-auto mb-10 bg-slate-900/60 border-slate-700">
            {phases.map((phase) => (
              <TabsTrigger
                key={phase.id}
                value={phase.id}
                className="flex-1 min-w-[120px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2 py-2.5"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px] font-bold">
                  {phase.number}
                </span>
                {phase.tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          {phases.map((phase) => (
            <TabsContent key={phase.id} value={phase.id} className="mt-0 focus-visible:outline-none">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 lg:p-10"
              >
                {phase.id === 'production' && productionPhase ? (
                  <ProductionPhasePanel
                    phase={productionPhase}
                    activeSubstep={activeSubstep}
                    onSubstepChange={setActiveSubstep}
                  />
                ) : (
                  <PhaseDetailPanel phase={phase} />
                )}
              </motion.div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}

export default HowItWorksSteps
