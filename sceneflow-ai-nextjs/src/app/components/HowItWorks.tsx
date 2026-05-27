'use client'

import { motion } from 'framer-motion'
import { Lightbulb, Film, Scissors, Rocket, ArrowRight, Clapperboard } from 'lucide-react'
import { WORKFLOW_PHASES } from '@/config/landing/workflowPhaseCopy'
import { HOW_IT_WORKS_HEADER } from '@/config/landing/valuePropCopy'

const PHASE_ICONS = [Clapperboard, Lightbulb, Film, Scissors, Rocket]
const PHASE_COLORS = [
  { color: 'from-purple-500 to-cyan-600', borderColor: 'border-purple-500/30' },
  { color: 'from-cyan-500 to-cyan-600', borderColor: 'border-cyan-500/30' },
  { color: 'from-amber-500 to-amber-600', borderColor: 'border-amber-500/30' },
  { color: 'from-emerald-500 to-teal-600', borderColor: 'border-emerald-500/30' },
  { color: 'from-amber-500 to-orange-600', borderColor: 'border-amber-500/30' },
]

export function HowItWorks() {
  const steps = WORKFLOW_PHASES.map((phase, index) => ({
    icon: PHASE_ICONS[index],
    title: phase.optional ? `${phase.stepLabel} (optional)` : phase.stepLabel,
    subtitle: phase.subtitle,
    description: phase.description,
    optional: phase.optional,
    ...PHASE_COLORS[index],
  }))
  
  return (
    <section id="how-it-works" className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.05),transparent_70%)]" />
      
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="landing-section-heading text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            {HOW_IT_WORKS_HEADER.title}{' '}
            <span className="landing-gradient-text bg-gradient-to-r from-cyan-400 via-purple-400 to-amber-400 bg-clip-text text-transparent">
              {HOW_IT_WORKS_HEADER.titleAccent}
            </span>
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto mb-4">
            {HOW_IT_WORKS_HEADER.subtitle}
          </p>
          <p className="text-cyan-400 font-medium text-sm md:text-base">
            {HOW_IT_WORKS_HEADER.tagline}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 xl:gap-5">
          {steps.map((step, index) => {
            const Icon = step.icon
            return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className="relative group"
            >
              <div className={`relative h-full bg-slate-900/50 backdrop-blur-sm rounded-2xl p-5 border ${step.borderColor} hover:border-opacity-60 transition-all duration-300`}>
                {step.optional ? (
                  <div className="absolute -top-3 -left-3 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-[10px] font-semibold text-purple-200 uppercase tracking-wide">
                    Optional
                  </div>
                ) : null}
                <div className={`absolute -top-3 -right-3 w-7 h-7 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-xs font-bold shadow-lg`}>
                  {index + 1}
                </div>
                
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-10 h-10" />
                </div>
                
                <h3 className="text-base md:text-lg font-bold text-white mb-1">{step.title}</h3>
                <p className="text-xs text-gray-500 mb-2">{step.subtitle}</p>
                <p className="text-gray-400 text-xs md:text-sm leading-relaxed">{step.description}</p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </motion.div>
            )
          })}
        </div>

        <motion.div 
          className="text-center mt-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-gray-400 mb-4">
            Ready to test the full pipeline?
          </p>
          <a 
            href="/?signup=1"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 hover:from-cyan-400 hover:via-purple-400 hover:to-amber-400 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg shadow-purple-500/25"
          >
            Start with Explorer — $9
            <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>
      </div>
    </section>
  )
}
