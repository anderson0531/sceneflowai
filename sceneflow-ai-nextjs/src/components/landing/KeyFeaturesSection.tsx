'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import {
  Sparkles,
  PenLine,
  Gauge,
  Library,
  Compass,
  Zap,
  Clapperboard,
  Languages,
  GitBranch,
  MonitorPlay,
  Youtube,
  KeyRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const SECTION_ID = 'key-features'

type CategoryId = 'create' | 'direct' | 'ship'

type FeatureData = {
  icon: string
  title: string
  description: string
}

type CategoryData = {
  id: CategoryId
  label: string
  features: FeatureData[]
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  writer: PenLine,
  ara: Gauge,
  referenceLibrary: Library,
  workflowAssistant: Compass,
  express: Zap,
  iad: Clapperboard,
  multilanguage: Languages,
  versionControl: GitBranch,
  screeningRoom: MonitorPlay,
  autoPublish: Youtube,
  byok: KeyRound,
  budget: Wallet,
}

const CATEGORY_GRADIENTS: Record<CategoryId, string> = {
  create: 'from-indigo-500 to-violet-600',
  direct: 'from-emerald-500 to-teal-600',
  ship: 'from-amber-500 to-orange-600',
}

export default function KeyFeaturesSection() {
  const t = useTranslations('keyFeatures')
  const [activeCategory, setActiveCategory] = useState<CategoryId>('create')

  const categories = useMemo(
    () => t.raw('categories') as CategoryData[],
    [t]
  )

  const active = categories.find((c) => c.id === activeCategory) ?? categories[0]

  return (
    <section
      id={SECTION_ID}
      className="scroll-mt-20 bg-gradient-to-b from-gray-950 via-slate-950 to-gray-950 py-20 md:py-28 overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-300 text-sm font-medium">{t('badge')}</span>
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t('title')}
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">{t('subtitle')}</p>
        </motion.div>

        <motion.div
          className="flex justify-center mb-10 px-2"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <div className="inline-flex flex-wrap justify-center gap-1 p-1.5 rounded-2xl bg-slate-800/50 border border-slate-700/50 max-w-full">
            {categories.map((category) => {
              const gradient = CATEGORY_GRADIENTS[category.id]
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300',
                    activeCategory === category.id
                      ? `bg-gradient-to-r ${gradient} text-white shadow-lg`
                      : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                  )}
                >
                  <span className="whitespace-nowrap">{category.label}</span>
                </button>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          key={activeCategory}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2"
        >
          {active?.features.map((feature, index) => {
            const Icon = FEATURE_ICONS[feature.icon] ?? Sparkles
            const gradient = CATEGORY_GRADIENTS[active.id]

            return (
              <motion.div
                key={feature.icon}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 hover:border-slate-700/80 hover:bg-slate-900/60 transition-colors"
              >
                <div
                  className={cn(
                    'mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br shadow-lg',
                    gradient
                  )}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
