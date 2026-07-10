'use client'

import { motion } from 'framer-motion'
import NextImage from 'next/image'
import { useTranslations } from 'next-intl'
import { Layers } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getPipelinePillarMedia } from '@/config/landing/pipelinePillarsMedia'

const SECTION_ID = 'pipeline'

type Pillar = {
  id: string
  tabLabel: string
  number: string
  title: string
  header: string
  body: string
}

function PillarPanel({ pillar }: { pillar: Pillar }) {
  const media = getPipelinePillarMedia(pillar.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-sm font-bold text-indigo-300">
            {pillar.number}
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {pillar.title}
          </span>
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-white">{pillar.header}</h3>
        <p className="text-base text-gray-400 leading-relaxed">{pillar.body}</p>
      </div>

      {media?.imageUrl && (
        <div className="rounded-2xl border border-slate-700/60 bg-slate-950/70 p-3 md:p-4 overflow-hidden shadow-xl">
          <div className="aspect-video rounded-xl border border-white/10 bg-slate-900 overflow-hidden relative">
            <NextImage
              src={media.imageUrl}
              alt={pillar.header}
              width={1920}
              height={1080}
              className="w-full h-full object-top object-contain"
              priority={pillar.id === 'series'}
            />
          </div>
        </div>
      )}
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
          <TabsList className="flex flex-wrap h-auto gap-1 p-1.5 w-full max-w-xl mx-auto mb-10 bg-slate-900/60 border-slate-700">
            {pillars.map((pillar) => (
              <TabsTrigger
                key={pillar.id}
                value={pillar.id}
                className="flex-1 min-w-[100px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white gap-2 py-2.5"
              >
                <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-white/10 text-[10px] font-bold">
                  {pillar.number}
                </span>
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
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 md:p-8 lg:p-10">
                <PillarPanel pillar={pillar} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  )
}

export default PipelinePillarsSection
