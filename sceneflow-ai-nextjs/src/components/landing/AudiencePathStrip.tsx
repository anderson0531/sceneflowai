'use client'

import { motion } from 'framer-motion'
import { Video, Building2, Film, Briefcase, ArrowRight } from 'lucide-react'
import { AUDIENCE_PATHS } from '@/config/landing/valuePropCopy'

const ICONS = {
  video: Video,
  building: Building2,
  film: Film,
  briefcase: Briefcase,
} as const

export function AudiencePathStrip() {
  return (
    <section className="py-10 bg-slate-950 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.p
          className="text-center text-sm font-medium text-gray-400 mb-6"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          Who are you? Pick your path
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {AUDIENCE_PATHS.map((path, index) => {
            const Icon = ICONS[path.icon]
            return (
              <motion.a
                key={path.id}
                href={`#${path.hash}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                className="group flex flex-col rounded-xl border border-white/10 bg-slate-900/60 p-4 hover:border-purple-500/40 hover:bg-slate-900/80 transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-purple-300" />
                  </div>
                  <span className="text-sm font-semibold text-white">{path.label}</span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed flex-1">{path.outcome}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-purple-400 group-hover:text-purple-300">
                  See your path
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </motion.a>
            )
          })}
        </div>
      </div>
    </section>
  )
}
