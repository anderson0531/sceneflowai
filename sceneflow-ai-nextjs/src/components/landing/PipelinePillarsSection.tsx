'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import NextImage from 'next/image'
import { useTranslations } from 'next-intl'
import { Layers, ChevronDown } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPipelinePillarMedia } from '@/config/landing/pipelinePillarsMedia'
import { cn } from '@/lib/utils'

const SECTION_ID = 'pipeline'

type GuidedStep = {
  headline: string
  narrative: string
}

type Pillar = {
  id: string
  tabLabel: string
  number: string
  title: string
  header: string
  body: string
  guidedStep?: GuidedStep
}

function PillarMedia({ pillarId, alt, eager }: { pillarId: string; alt: string; eager?: boolean }) {
  const media = getPipelinePillarMedia(pillarId)
  if (!media?.imageUrl && !media?.videoUrl) return null

  return (
    <div className="w-full overflow-hidden rounded-xl md:rounded-2xl border border-white/10 bg-slate-900 shadow-xl">
      <div className="aspect-video w-full">
        {media.videoUrl ? (
          <video
            className="h-full w-full object-cover"
            controls
            playsInline
            preload="metadata"
            poster={media.imageUrl}
            aria-label={alt}
          >
            <source src={media.videoUrl} type="video/mp4" />
          </video>
        ) : (
          <NextImage
            src={media.imageUrl}
            alt={alt}
            width={1920}
            height={1080}
            className="h-full w-full object-cover"
            priority={eager}
          />
        )}
      </div>
    </div>
  )
}

function PillarPanel({ pillar }: { pillar: Pillar }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex w-full flex-col gap-6"
    >
      <div className="space-y-3 sm:space-y-4 max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-sm font-bold text-indigo-300">
            {pillar.number}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {pillar.title}
          </span>
        </div>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">{pillar.header}</h3>
        <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{pillar.body}</p>
      </div>

      <PillarMedia pillarId={pillar.id} alt={pillar.header} eager={pillar.id === 'series'} />
    </motion.div>
  )
}

function GuidedStepPanel({ step }: { step: GuidedStep }) {
  return (
    <div className="max-w-3xl space-y-3 sm:space-y-4">
      <h4 className="text-lg sm:text-xl md:text-2xl font-bold text-white">{step.headline}</h4>
      <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{step.narrative}</p>
    </div>
  )
}

function PillarTabContent({ pillar }: { pillar: Pillar }) {
  const tUi = useTranslations('pipeline.ui')
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)

  return (
    <div className="space-y-8">
      <PillarPanel pillar={pillar} />

      {pillar.guidedStep && (
        <div className="border-t border-slate-800 pt-6">
          <button
            type="button"
            onClick={() => setHowItWorksOpen((open) => !open)}
            aria-expanded={howItWorksOpen}
            className="inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold uppercase tracking-wider text-indigo-300 transition-colors hover:text-indigo-200"
          >
            <ChevronDown
              className={cn('h-4 w-4 transition-transform duration-300', howItWorksOpen && 'rotate-180')}
            />
            {howItWorksOpen ? tUi('hideHowItWorks') : tUi('showHowItWorks')}
          </button>

          <AnimatePresence initial={false}>
            {howItWorksOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
              >
                <div className="pt-6">
                  <GuidedStepPanel step={pillar.guidedStep} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export function PipelinePillarsSection() {
  const t = useTranslations('pipeline')
  const pillars = t.raw('pillars') as Pillar[]

  return (
    <section
      id={SECTION_ID}
      className="relative scroll-mt-20 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 py-20 md:py-28"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-6">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-indigo-300">{t('badge')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">{t('subtitle')}</p>
        </motion.div>

        <Tabs defaultValue="series" className="w-full">
          <TabsList className="flex h-auto gap-1 p-1 w-full max-w-md mx-auto mb-10 bg-slate-900/60 border-slate-700">
            {pillars.map((pillar) => (
              <TabsTrigger
                key={pillar.id}
                value={pillar.id}
                className="flex-1 min-w-0 px-2 sm:px-4 text-xs sm:text-sm data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-2.5 truncate"
              >
                {pillar.tabLabel}
              </TabsTrigger>
            ))}
          </TabsList>

          {pillars.map((pillar) => (
            <TabsContent
              key={pillar.id}
              value={pillar.id}
              className="mt-0 focus-visible:outline-none"
            >
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 sm:p-6 md:p-8 lg:p-10">
                <PillarTabContent pillar={pillar} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}

export default PipelinePillarsSection
