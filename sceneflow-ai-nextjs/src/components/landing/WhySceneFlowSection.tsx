'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { WHY_SCENEFLOW } from '@/config/landing/valuePropCopy'

export function WhySceneFlowSection() {
  return (
    <section id="why-sceneflow" className="py-20 sm:py-24 bg-slate-950 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">{WHY_SCENEFLOW.title}</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">{WHY_SCENEFLOW.subtitle}</p>
        </motion.div>

        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <div className="hidden sm:grid sm:grid-cols-2 bg-slate-900/80 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="px-5 py-3">Typical clip-generation tools</div>
            <div className="px-5 py-3 text-cyan-400/90">SceneFlow bundles</div>
          </div>
          {WHY_SCENEFLOW.rows.map((row, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="grid sm:grid-cols-2 border-b border-white/5 last:border-b-0"
            >
              <div className="px-5 py-4 text-sm text-gray-400 border-b sm:border-b-0 sm:border-r border-white/5">
                {row.them}
              </div>
              <div className="px-5 py-4 text-sm text-gray-200 flex gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{row.us}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
