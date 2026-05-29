'use client'

import { motion } from 'framer-motion'
import { Layers, Frame, Target, Rocket } from 'lucide-react'
import { VP_STRIP_PILLS } from '@/config/landing/valuePropCopy'

const ICONS = [Layers, Frame, Target, Rocket]

export function ValuePropStrip() {
  return (
    <section className="py-12 bg-gradient-to-b from-slate-950 to-slate-900 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VP_STRIP_PILLS.map((pill, index) => {
            const Icon = ICONS[index] ?? Layers
            return (
              <motion.div
                key={pill.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-xl border border-white/10 bg-slate-900/60 p-5 text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-5 h-5 text-cyan-400" />
                </div>
                <p className="text-base font-semibold text-white mb-1">{pill.label}</p>
                <p className="text-sm text-gray-400 leading-relaxed">{pill.detail}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
