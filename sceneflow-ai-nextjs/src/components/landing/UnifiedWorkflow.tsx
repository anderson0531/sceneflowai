'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { 
  ArrowRight,
  Sparkles,
  Zap,
  X,
  Check,
  MessageSquare,
  Palette,
  Film,
  FileSpreadsheet,
  Copy,
  Clock,
  Brain,
  Workflow
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Old way tools
const fragmentedTools = [
  { name: 'ChatGPT', icon: MessageSquare, category: 'Script' },
  { name: 'Midjourney', icon: Palette, category: 'Images' },
  { name: 'Premiere', icon: Film, category: 'Edit' },
  { name: 'Excel', icon: FileSpreadsheet, category: 'Track' },
]

// Pain points of fragmented workflow
const painPoints = [
  'Copy-paste between 5+ apps',
  'Manual character consistency',
  'Lost context between tools',
  'Hours of reformatting',
  'Version control chaos',
]

// Benefits of unified workflow
const unifiedBenefits = [
  'Script becomes prompt automatically',
  'Characters stay consistent',
  'One project file, zero exports',
  'AI handles the busywork',
  'Real-time collaboration',
]

export function UnifiedWorkflow() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })

  return (
    <section 
      id="unified-workflow" 
      className="relative py-24 md:py-32 overflow-hidden scroll-mt-20"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(6,182,212,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(139,92,246,0.1),transparent_50%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={ref}
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-cyan-400">Better Together</span>
          </div>
          
          <h2 className="landing-section-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            The &quot;Concept-to-Publish&quot; Engine
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Stop copy-pasting between 5 different apps. In SceneFlow, your Script becomes your Prompt, which becomes your Timeline.
          </p>
        </motion.div>

        {/* Split Comparison */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 mb-16">
          {/* Left: The Old Way */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-950/30 via-gray-900 to-gray-900 p-8 h-full">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <X className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="dashboard-widget-title text-xl font-bold text-white">The Old Way</h3>
                  <p className="text-sm text-red-400">Fragmented. Manual. Slow.</p>
                </div>
              </div>

              {/* Tool Icons */}
              <div className="grid grid-cols-4 gap-3 mb-8">
                {fragmentedTools.map((tool, index) => {
                  const Icon = tool.icon
                  return (
                    <motion.div
                      key={tool.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      className="flex flex-col items-center p-4 rounded-xl bg-gray-800/50 border border-gray-700/50"
                    >
                      <Icon className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-xs text-gray-500 font-medium">{tool.name}</span>
                    </motion.div>
                  )
                })}
              </div>

              {/* Connector Chaos Visual */}
              <div className="relative h-16 mb-8">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 60">
                  <defs>
                    <linearGradient id="chaosGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  {/* Chaotic lines */}
                  <path d="M 50 10 Q 100 50, 150 20 T 250 40 T 350 10" stroke="url(#chaosGradient)" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                  <path d="M 50 30 Q 120 10, 180 50 T 280 20 T 350 40" stroke="url(#chaosGradient)" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                  <path d="M 50 50 Q 90 20, 160 40 T 260 10 T 350 30" stroke="url(#chaosGradient)" strokeWidth="2" fill="none" strokeDasharray="4 4" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                    <Copy className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400 font-medium">Manual Copy-Paste</span>
                  </div>
                </div>
              </div>

              {/* Pain Points */}
              <div className="space-y-3">
                {painPoints.map((point, index) => (
                  <motion.div
                    key={point}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.5 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <X className="w-4 h-4 text-red-400 shrink-0" />
                    <span className="text-sm text-gray-400">{point}</span>
                  </motion.div>
                ))}
              </div>

              {/* Time Indicator */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-red-400" />
                    <span className="text-sm text-gray-400">Average project time</span>
                  </div>
                  <span className="text-lg font-bold text-red-400">2-4 weeks</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right: The SceneFlow Way */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-gray-900 to-gray-900 p-8 h-full shadow-2xl shadow-emerald-500/10">
              {/* Header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center">
                  <Workflow className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="dashboard-widget-title text-xl font-bold text-white">The SceneFlow Way</h3>
                  <p className="text-sm text-emerald-400">Integrated. Automated. Flow.</p>
                </div>
              </div>

              {/* Unified Flow Visual */}
              <div className="relative mb-8">
                <div className="flex items-center justify-between">
                  {['Script', 'Prompt', 'Timeline', 'Publish'].map((stage, index) => (
                    <motion.div
                      key={stage}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={isInView ? { opacity: 1, scale: 1 } : {}}
                      transition={{ duration: 0.4, delay: 0.5 + index * 0.1 }}
                      className="flex flex-col items-center"
                    >
                      <div className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center mb-2',
                        index === 0 && 'bg-violet-500/20',
                        index === 1 && 'bg-cyan-500/20',
                        index === 2 && 'bg-emerald-500/20',
                        index === 3 && 'bg-amber-500/20'
                      )}>
                        <Brain className={cn(
                          'w-6 h-6',
                          index === 0 && 'text-violet-400',
                          index === 1 && 'text-cyan-400',
                          index === 2 && 'text-emerald-400',
                          index === 3 && 'text-amber-400'
                        )} />
                      </div>
                      <span className="text-xs text-gray-400 font-medium">{stage}</span>
                    </motion.div>
                  ))}
                </div>

                {/* Flowing connection line */}
                <div className="absolute top-6 left-8 right-8 h-0.5">
                  <motion.div
                    className="h-full bg-gradient-to-r from-violet-500 via-cyan-500 via-emerald-500 to-amber-500 rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : {}}
                    transition={{ duration: 1, delay: 0.8 }}
                    style={{ transformOrigin: 'left' }}
                  />
                  {/* Animated glow */}
                  <motion.div
                    className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full"
                    animate={isInView ? { x: ['-100%', '500%'] } : {}}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 1, delay: 1.5 }}
                  />
                </div>
              </div>

              {/* Auto-sync badge */}
              <div className="flex justify-center mb-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-400 font-medium">Automatic Data Sync</span>
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                {unifiedBenefits.map((benefit, index) => (
                  <motion.div
                    key={benefit}
                    initial={{ opacity: 0, x: 10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.7 + index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-sm text-gray-300">{benefit}</span>
                  </motion.div>
                ))}
              </div>

              {/* Time Indicator */}
              <div className="mt-8 pt-6 border-t border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-gray-400">Average project time</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400">2-4 days</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-6 rounded-2xl bg-gray-900/50 border border-gray-800">
            <p className="text-gray-300">
              Ready to streamline your creative workflow?
            </p>
            <Button
              size="lg"
              onClick={() => window.location.href = '/?signup=1'}
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 text-white px-8 py-3 font-semibold"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default UnifiedWorkflow
