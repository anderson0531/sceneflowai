'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Building2, ArrowRight, CheckCircle2 } from 'lucide-react'
import { INSTITUTIONAL_ROI } from '@/config/landing/valuePropCopy'

export function InstitutionalRoiSection() {
  return (
    <section id="institutional-roi" className="py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 p-8 lg:p-10"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-emerald-300">For in-house teams & institutions</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{INSTITUTIONAL_ROI.title}</h2>
          <p className="text-gray-400 mb-8 max-w-2xl">{INSTITUTIONAL_ROI.subtitle}</p>

          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {INSTITUTIONAL_ROI.comparisons.map((row, idx) => (
              <div
                key={row.label}
                className={`rounded-xl p-5 border ${
                  idx === 0
                    ? 'bg-red-500/5 border-red-500/20'
                    : 'bg-emerald-500/5 border-emerald-500/20'
                }`}
              >
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">{row.label}</p>
                <div className="flex flex-wrap gap-6">
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Typical cost</p>
                    <p className={`text-lg font-bold ${idx === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {row.cost}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500 mb-0.5">Timeline</p>
                    <p className={`text-lg font-bold ${idx === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {row.timeline}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <ul className="space-y-2 mb-8">
            {INSTITUTIONAL_ROI.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-sm text-gray-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                {bullet}
              </li>
            ))}
          </ul>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/early-access"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:opacity-90 transition-opacity"
            >
              {INSTITUTIONAL_ROI.ctaPrimary}
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="#pricing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              {INSTITUTIONAL_ROI.ctaSecondary}
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
