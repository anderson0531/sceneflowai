'use client'

import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'
import { 
  Pen, 
  Image as ImageIcon, 
  Film, 
  BarChart3,
  ArrowRight,
  Sparkles,
  FileText,
  Users,
  Palette,
  Mic,
  Clock,
  Globe,
  TrendingUp,
  MessageSquare,
  CheckCircle2,
  Zap
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

// Module definitions with standalone and ecosystem features
const modules = [
  {
    id: 'writer',
    name: "Writer's Room",
    phase: 'Blueprint',
    icon: Pen,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    glowColor: 'shadow-violet-500/30',
    textColor: 'text-violet-400',
    accentColor: 'violet',
    standaloneValue: 'AI that knows the Hero\'s Journey',
    standaloneDescription: 'Transform rough ideas into structured screenplays with genre-aware AI that understands narrative arcs, character development, and dramatic tension.',
    standaloneFeatures: [
      { icon: FileText, text: 'Beat sheet & outline generation' },
      { icon: Users, text: 'Deep character backstory development' },
      { icon: Sparkles, text: 'Genre-aware dialogue polish' },
      { icon: CheckCircle2, text: 'Industry-standard formatting' },
    ],
    ecosystemBonus: 'One-Click Export: Your script tags are automatically formatted into Prompts for the Visualizer.',
    ecosystemDetail: 'Character descriptions, scene settings, and mood tags flow directly into image prompts—no copy-pasting required.',
    videoPlaceholder: '/demo/writer-room.mp4',
    alignment: 'left' as const,
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    phase: 'Production',
    icon: ImageIcon,
    color: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: 'shadow-cyan-500/30',
    textColor: 'text-cyan-400',
    accentColor: 'cyan',
    standaloneValue: 'Text-to-Animatic in minutes',
    standaloneDescription: 'Generate consistent storyboards and animatics using Google\'s Imagen 4 and Veo 3. Maintain character consistency across every frame.',
    standaloneFeatures: [
      { icon: Palette, text: 'Imagen 4 & Veo 3 generation' },
      { icon: Users, text: 'Character consistency library' },
      { icon: Film, text: 'Scene-by-scene animatics' },
      { icon: CheckCircle2, text: '4K cinematic output' },
    ],
    ecosystemBonus: 'Scene Consistency: Uses the character profiles saved in The Writer\'s Room to ensure perfect face continuity.',
    ecosystemDetail: 'Your character descriptions become visual references. Generate once, reuse across every scene automatically.',
    videoPlaceholder: '/demo/visualizer.mp4',
    alignment: 'right' as const,
  },
  {
    id: 'editor',
    name: 'Smart Editor',
    phase: 'Post',
    icon: Film,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowColor: 'shadow-emerald-500/30',
    textColor: 'text-emerald-400',
    accentColor: 'emerald',
    standaloneValue: 'Auto-lip sync and translation',
    standaloneDescription: 'Professional post-production with AI-powered audio synthesis, automated lip-sync, and one-click localization to 32 languages.',
    standaloneFeatures: [
      { icon: Mic, text: '32-language AI voiceover' },
      { icon: Clock, text: 'Automated lip-sync technology' },
      { icon: Globe, text: 'One-click localization' },
      { icon: CheckCircle2, text: 'Professional audio mixing' },
    ],
    ecosystemBonus: 'Smart Assembly: Automatically places clips on the timeline based on your Writer\'s Room beat sheet.',
    ecosystemDetail: 'Your script structure becomes your timeline. Scenes, beats, and transitions auto-arrange for faster editing.',
    videoPlaceholder: '/demo/smart-editor.mp4',
    alignment: 'left' as const,
  },
  {
    id: 'analyst',
    name: 'Screening Room',
    phase: 'Analytics',
    icon: BarChart3,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/30',
    textColor: 'text-amber-400',
    accentColor: 'amber',
    standaloneValue: 'Predict audience drop-off',
    standaloneDescription: 'Behavioral analytics that reveal what resonates. Understand engagement patterns, predict retention, and optimize before you publish.',
    standaloneFeatures: [
      { icon: TrendingUp, text: 'Engagement heatmaps' },
      { icon: MessageSquare, text: 'Sentiment analysis' },
      { icon: BarChart3, text: 'Retention predictions' },
      { icon: CheckCircle2, text: 'A/B testing framework' },
    ],
    ecosystemBonus: 'Feedback Loop: Auto-updates your Script in the Writer\'s Room based on engagement data.',
    ecosystemDetail: 'Low engagement on a scene? Get AI suggestions to revise dialogue or pacing—directly in your script.',
    videoPlaceholder: '/demo/screening-room.mp4',
    alignment: 'right' as const,
  },
]

interface ModuleCardProps {
  module: typeof modules[0]
  index: number
}

function ModuleCard({ module, index }: ModuleCardProps) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px' })
  const Icon = module.icon
  const isLeft = module.alignment === 'left'

  return (
    <motion.div
      id={`module-${module.id}`}
      ref={ref}
      className="scroll-mt-24"
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1 }}
    >
      <div className={cn(
        'grid lg:grid-cols-2 gap-8 lg:gap-16 items-center',
        !isLeft && 'lg:[direction:rtl]'
      )}>
        {/* Content Side */}
        <div className={cn('lg:[direction:ltr]', !isLeft && 'lg:pl-8')}>
          {/* Phase Badge */}
          <div className="flex items-center gap-3 mb-6">
            <div className={cn(
              'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
              module.color
            )}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  'text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full',
                  module.bgColor,
                  module.textColor
                )}>
                  {module.phase}
                </span>
                <span className="text-xs text-gray-500">Step {index + 1} of 4</span>
              </div>
              <h3 className="dashboard-widget-title text-2xl font-bold text-white mt-1">
                {module.name}
              </h3>
            </div>
          </div>

          {/* Standalone Value Prop */}
          <div className="mb-6">
            <p className={cn('text-xl font-semibold mb-3', module.textColor)}>
              {module.standaloneValue}
            </p>
            <p className="text-gray-400 leading-relaxed">
              {module.standaloneDescription}
            </p>
          </div>

          {/* Standalone Features Grid */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {module.standaloneFeatures.map((feature, fIndex) => {
              const FeatureIcon = feature.icon
              return (
                <div 
                  key={fIndex}
                  className="flex items-center gap-2 p-3 rounded-lg bg-gray-800/40 border border-gray-700/50"
                >
                  <FeatureIcon className={cn('w-4 h-4 shrink-0', module.textColor)} />
                  <span className="text-sm text-gray-300">{feature.text}</span>
                </div>
              )
            })}
          </div>

          {/* Ecosystem Synergy Badge */}
          <div className={cn(
            'rounded-xl p-5 border backdrop-blur-sm mb-6',
            module.bgColor,
            module.borderColor
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={cn('w-5 h-5', module.textColor)} />
              <span className={cn('text-sm font-bold uppercase tracking-wider', module.textColor)}>
                Ecosystem Synergy
              </span>
            </div>
            <p className="text-white font-medium mb-2">
              {module.ecosystemBonus}
            </p>
            <p className="text-sm text-gray-400">
              {module.ecosystemDetail}
            </p>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <Button
              onClick={() => window.location.href = '/?signup=1'}
              className={cn(
                'bg-gradient-to-r text-white px-6 py-3 font-medium',
                module.color
              )}
            >
              Try {module.name}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <button 
              className="text-gray-400 hover:text-white transition-colors text-sm font-medium"
              onClick={() => {
                const el = document.getElementById('pricing')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              View Pricing →
            </button>
          </div>
        </div>

        {/* Visual Side - Video/Demo Placeholder */}
        <div className="lg:[direction:ltr]">
          <div className={cn(
            'relative rounded-2xl overflow-hidden border aspect-[4/3]',
            'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900',
            module.borderColor,
            `shadow-2xl ${module.glowColor}`
          )}>
            {/* Demo Visual Placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center p-8">
                <div className={cn(
                  'w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-gradient-to-br',
                  module.color
                )}>
                  <Icon className="w-10 h-10 text-white" />
                </div>
                <p className="text-lg font-semibold text-white mb-2">{module.name} Demo</p>
                <p className="text-sm text-gray-400">Interactive preview coming soon</p>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-gray-800/80 backdrop-blur-sm rounded-lg border border-white/10">
              <div className={cn('w-2 h-2 rounded-full animate-pulse', 
                module.accentColor === 'violet' && 'bg-violet-400',
                module.accentColor === 'cyan' && 'bg-cyan-400',
                module.accentColor === 'emerald' && 'bg-emerald-400',
                module.accentColor === 'amber' && 'bg-amber-400'
              )} />
              <span className="text-xs text-gray-300">{module.phase} Module</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export function ModularShowcase() {
  const headerRef = useRef(null)
  const isHeaderInView = useInView(headerRef, { once: true })

  return (
    <section id="modular-showcase" className="relative py-24 md:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08),transparent_70%)]" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          ref={headerRef}
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={isHeaderInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-400">Modular by Design</span>
          </div>
          
          <h2 className="landing-section-heading text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            Four Tools. One Vision.
          </h2>
          
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Each module solves a specific creative challenge. Use them standalone, or connect them for an integrated workflow that eliminates busywork.
          </p>
        </motion.div>

        {/* Module Cards */}
        <div className="space-y-24 lg:space-y-32">
          {modules.map((module, index) => (
            <ModuleCard key={module.id} module={module} index={index} />
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-24"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex flex-col items-center p-8 rounded-2xl bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-amber-500/10 border border-white/10">
            <p className="text-lg text-gray-300 mb-4">
              Want the complete workflow?
            </p>
            <Button
              size="lg"
              onClick={() => {
                const el = document.getElementById('unified-workflow')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-amber-500 text-white px-8 py-4 font-semibold"
            >
              See the Full Pipeline
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

export default ModularShowcase
