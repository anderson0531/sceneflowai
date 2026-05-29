'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Frame } from 'lucide-react'
import { ONE_TAKE_PIPELINE } from '@/config/landing/valuePropCopy'

export function OneTakePipelineSection() {
  return (
    <section id="beat-first-pipeline" className="py-20 sm:py-24 bg-gradient-to-b from-slate-900 to-slate-950 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-950/30 via-slate-950 to-slate-950 p-8 sm:p-10"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shrink-0">
              <Frame className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-300 mb-1">
                {ONE_TAKE_PIPELINE.subtitle}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold text-white">{ONE_TAKE_PIPELINE.title}</h2>
            </div>
          </div>

          <p className="text-gray-300 leading-relaxed mb-8 max-w-3xl">{ONE_TAKE_PIPELINE.description}</p>

          <ol className="space-y-4">
            {ONE_TAKE_PIPELINE.steps.map((step, index) => (
              <li key={index} className="flex gap-3 text-base text-gray-300">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-violet-200 text-xs font-bold">
                  {index + 1}
                </span>
                <span className="pt-1">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex items-center gap-2 text-base text-violet-300/90">
            <ArrowRight className="w-4 h-4" />
            <span>Fewer slot-machine regenerations — approve visuals before final video spend</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
