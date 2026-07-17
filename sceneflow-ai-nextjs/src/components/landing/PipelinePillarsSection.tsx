'use client'

import { motion } from 'framer-motion'
import NextImage from 'next/image'
import { useTranslations } from 'next-intl'
import { Layers } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StepImagePlaceholder } from '@/components/landing/StepImagePlaceholder'
import { getPipelinePillarMedia } from '@/config/landing/pipelinePillarsMedia'

const SECTION_ID = 'pipeline'

type Step = {
  id: string
  number: string
  title: string
  description: string
  imagePlaceholder: string
}

type Pillar = {
  id: string
  tabLabel: string
  number: string
  title: string
  header: string
  body: string
  steps?: Step[]
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

function PillarHeader({ pillar }: { pillar: Pillar }) {
  return (
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
  )
}

function PillarSteps({ steps, label }: { steps: Step[]; label: string }) {
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300">{label}</p>

      <ol className="space-y-8 list-none pl-0">
        {steps.map((step, index) => (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.2) }}
            className="grid gap-5 md:grid-cols-2 md:gap-8 md:items-center"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                  {step.number}
                </span>
                <h4 className="text-lg sm:text-xl font-semibold text-white">{step.title}</h4>
              </div>
              <p className="text-sm sm:text-base text-gray-400 leading-relaxed">{step.description}</p>
            </div>

            <StepImagePlaceholder
              stepId={step.id}
              placeholderText={step.imagePlaceholder}
              alt={step.title}
            />
          </motion.li>
        ))}
      </ol>
    </div>
  )
}

function PillarTabContent({ pillar }: { pillar: Pillar }) {
  const tUi = useTranslations('pipeline.ui')

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-10"
    >
      <PillarHeader pillar={pillar} />

      {pillar.steps && pillar.steps.length > 0 && (
        <PillarSteps steps={pillar.steps} label={tUi('howItWorksLabel')} />
      )}

      <PillarMedia pillarId={pillar.id} alt={pillar.header} eager={pillar.id === 'series'} />
    </motion.div>
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
