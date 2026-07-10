'use client'

import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { Workflow } from 'lucide-react'

const SECTION_ID = 'how-it-works'

export function HowItWorksSteps() {
  const t = useTranslations('guidedSteps')
  const steps = t.raw('steps') as Array<{ label: string; body: string }>

  return (
    <section
      id={SECTION_ID}
      className="scroll-mt-20 bg-gray-950 py-20 md:py-28"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <p className="text-gray-400">{t('subtitle')}</p>
        </motion.div>

        <ol className="space-y-4">
          {steps.map((step, index) => (
            <motion.li
              key={step.label}
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="flex gap-4 items-start rounded-xl border border-slate-800/80 bg-slate-900/40 px-5 py-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-sm font-bold text-indigo-300">
                {index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="font-semibold text-white">{step.label}</p>
                <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{step.body}</p>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export default HowItWorksSteps
