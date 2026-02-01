'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Pen, 
  Image, 
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
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Module definitions with standalone and ecosystem features
const modules = [
  {
    id: 'writer',
    name: "Writer's Room",
    shortName: 'Writer',
    icon: Pen,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500/10',
    borderColor: 'border-violet-500/30',
    glowColor: 'shadow-violet-500/20',
    textColor: 'text-violet-400',
    tagline: 'AI that knows the Hero\'s Journey',
    description: 'Transform ideas into structured screenplays with AI-powered story intelligence.',
    standaloneFeatures: [
      { icon: FileText, text: 'Beat sheet & outline generation' },
      { icon: Users, text: 'Deep character development' },
      { icon: Sparkles, text: 'Genre-aware dialogue polish' },
    ],
    ecosystemBonus: 'One-Click Export: Script tags auto-format into Prompts for the Visualizer.',
  },
  {
    id: 'visualizer',
    name: 'Visualizer',
    shortName: 'Visualizer',
    icon: Image,
    color: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/30',
    glowColor: 'shadow-cyan-500/20',
    textColor: 'text-cyan-400',
    tagline: 'Text-to-Animatic in minutes',
    description: 'Generate consistent storyboards and animatics from your screenplay.',
    standaloneFeatures: [
      { icon: Palette, text: 'Imagen 4 & Veo 3 generation' },
      { icon: Users, text: 'Character consistency library' },
      { icon: Film, text: 'Scene-by-scene animatics' },
    ],
    ecosystemBonus: 'Scene Consistency: Uses character profiles from Writer\'s Room for perfect face continuity.',
  },
  {
    id: 'editor',
    name: 'Smart Editor',
    shortName: 'Editor',
    icon: Film,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    glowColor: 'shadow-emerald-500/20',
    textColor: 'text-emerald-400',
    tagline: 'Auto-lip sync and translation',
    description: 'Professional post-production with AI-powered audio and video tools.',
    standaloneFeatures: [
      { icon: Mic, text: '32-language AI voiceover' },
      { icon: Clock, text: 'Automated lip-sync' },
      { icon: Globe, text: 'One-click localization' },
    ],
    ecosystemBonus: 'Smart Assembly: Auto-places clips on timeline based on Writer\'s Room beat sheet.',
  },
  {
    id: 'analyst',
    name: 'Screening Room',
    shortName: 'Analyst',
    icon: BarChart3,
    color: 'from-amber-500 to-orange-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    glowColor: 'shadow-amber-500/20',
    textColor: 'text-amber-400',
    tagline: 'Predict audience drop-off',
    description: 'Behavioral analytics to understand what resonates with your audience.',
    standaloneFeatures: [
      { icon: TrendingUp, text: 'Engagement heatmaps' },
      { icon: MessageSquare, text: 'Sentiment analysis' },
      { icon: BarChart3, text: 'Retention predictions' },
    ],
    ecosystemBonus: 'Feedback Loop: Auto-updates your Script in Writer\'s Room based on engagement data.',
  },
]

interface PipelineFlowProps {
  className?: string
  onModuleClick?: (moduleId: string) => void
}

export function PipelineFlow({ className, onModuleClick }: PipelineFlowProps) {
  const [hoveredModule, setHoveredModule] = useState<string | null>(null)
  const [isFlowing, setIsFlowing] = useState(true)

  const handleModuleHover = useCallback((moduleId: string | null) => {
    setHoveredModule(moduleId)
    setIsFlowing(moduleId === null)
  }, [])

  return (
    <div className={cn('relative w-full', className)}>
      {/* Desktop Pipeline View */}
      <div className="hidden lg:block">
        <div className="relative max-w-5xl mx-auto">
          {/* Connection Lines - SVG */}
          <svg 
            className="absolute inset-0 w-full h-full pointer-events-none" 
            viewBox="0 0 1000 200"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              {/* Animated gradient for flowing data */}
              <linearGradient id="flowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8">
                  <animate 
                    attributeName="offset" 
                    values="-0.5;1" 
                    dur="2s" 
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="25%" stopColor="#06B6D4" stopOpacity="1">
                  <animate 
                    attributeName="offset" 
                    values="-0.25;1.25" 
                    dur="2s" 
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="50%" stopColor="#10B981" stopOpacity="1">
                  <animate 
                    attributeName="offset" 
                    values="0;1.5" 
                    dur="2s" 
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="75%" stopColor="#F59E0B" stopOpacity="0.8">
                  <animate 
                    attributeName="offset" 
                    values="0.25;1.75" 
                    dur="2s" 
                    repeatCount="indefinite"
                  />
                </stop>
              </linearGradient>

              {/* Static gradient for hover states */}
              <linearGradient id="staticGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6B7280" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#6B7280" stopOpacity="0.3" />
              </linearGradient>

              {/* Glow filter */}
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Connection paths between modules */}
            {[0, 1, 2].map((i) => {
              const x1 = 125 + i * 250 + 100
              const x2 = 125 + (i + 1) * 250
              const isActive = isFlowing || hoveredModule === modules[i].id || hoveredModule === modules[i + 1].id
              
              return (
                <g key={i}>
                  {/* Background line */}
                  <path
                    d={`M ${x1} 100 L ${x2} 100`}
                    stroke="url(#staticGradient)"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="8 4"
                  />
                  
                  {/* Animated flowing line */}
                  <motion.path
                    d={`M ${x1} 100 L ${x2} 100`}
                    stroke={isActive ? "url(#flowGradient)" : "transparent"}
                    strokeWidth="3"
                    fill="none"
                    filter={isActive ? "url(#glow)" : undefined}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ 
                      pathLength: isActive ? 1 : 0, 
                      opacity: isActive ? 1 : 0 
                    }}
                    transition={{ duration: 0.5 }}
                  />

                  {/* Arrow indicator */}
                  <motion.polygon
                    points={`${x2 - 8},95 ${x2},100 ${x2 - 8},105`}
                    fill={isActive ? "#10B981" : "#6B7280"}
                    animate={{ 
                      opacity: isActive ? 1 : 0.3,
                      scale: isActive ? 1 : 0.8
                    }}
                    style={{ transformOrigin: `${x2}px 100px` }}
                  />
                </g>
              )
            })}
          </svg>

          {/* Module Cards */}
          <div className="relative grid grid-cols-4 gap-6 py-8">
            {modules.map((module, index) => {
              const Icon = module.icon
              const isHovered = hoveredModule === module.id
              const isDimmed = hoveredModule !== null && !isHovered

              return (
                <motion.div
                  key={module.id}
                  className="relative"
                  onMouseEnter={() => handleModuleHover(module.id)}
                  onMouseLeave={() => handleModuleHover(null)}
                  onClick={() => onModuleClick?.(module.id)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: isDimmed ? 0.4 : 1, 
                    y: 0,
                    scale: isHovered ? 1.02 : 1
                  }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.1
                  }}
                >
                  {/* Card */}
                  <div 
                    className={cn(
                      'relative rounded-2xl border backdrop-blur-sm p-6 cursor-pointer transition-all duration-300',
                      'bg-gray-900/60 hover:bg-gray-900/80',
                      module.borderColor,
                      isHovered && `shadow-2xl ${module.glowColor}`
                    )}
                  >
                    {/* Step number */}
                    <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-400">{index + 1}</span>
                    </div>

                    {/* Icon */}
                    <div className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center mb-4 bg-gradient-to-br',
                      module.color
                    )}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-semibold text-white mb-1">
                      {module.name}
                    </h3>

                    {/* Tagline */}
                    <p className={cn('text-sm font-medium mb-3', module.textColor)}>
                      {module.tagline}
                    </p>

                    {/* Description (shown on hover) */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <p className="text-sm text-gray-400 mb-4">
                            {module.description}
                          </p>

                          {/* Standalone Features */}
                          <div className="space-y-2 mb-4">
                            {module.standaloneFeatures.map((feature, fIndex) => {
                              const FeatureIcon = feature.icon
                              return (
                                <div key={fIndex} className="flex items-center gap-2">
                                  <FeatureIcon className="w-4 h-4 text-gray-500" />
                                  <span className="text-xs text-gray-400">{feature.text}</span>
                                </div>
                              )
                            })}
                          </div>

                          {/* Ecosystem Bonus Badge */}
                          <div className={cn(
                            'rounded-lg p-3 border',
                            module.bgColor,
                            module.borderColor
                          )}>
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className={cn('w-4 h-4', module.textColor)} />
                              <span className={cn('text-xs font-semibold', module.textColor)}>
                                Ecosystem Bonus
                              </span>
                            </div>
                            <p className="text-xs text-gray-300">
                              {module.ecosystemBonus}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Arrow to next module (mobile hidden) */}
                  {index < modules.length - 1 && (
                    <div className="absolute -right-5 top-1/2 -translate-y-1/2 hidden lg:block">
                      <ArrowRight className={cn(
                        'w-4 h-4 transition-colors duration-300',
                        isFlowing ? 'text-emerald-500' : 'text-gray-600'
                      )} />
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Flow Status Indicator */}
        <div className="flex justify-center mt-6">
          <motion.div 
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-full border backdrop-blur-sm transition-all duration-300',
              isFlowing 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-gray-800/60 border-gray-700 text-gray-400'
            )}
            animate={{ 
              boxShadow: isFlowing 
                ? '0 0 20px rgba(16, 185, 129, 0.2)' 
                : 'none' 
            }}
          >
            <motion.div
              className={cn(
                'w-2 h-2 rounded-full',
                isFlowing ? 'bg-emerald-400' : 'bg-gray-500'
              )}
              animate={isFlowing ? { 
                scale: [1, 1.3, 1],
                opacity: [1, 0.7, 1]
              } : {}}
              transition={{ 
                duration: 1.5, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            <span className="text-sm font-medium">
              {isFlowing 
                ? 'All-in-One Pipeline Active' 
                : `Viewing: ${modules.find(m => m.id === hoveredModule)?.name || 'Module'}`
              }
            </span>
          </motion.div>
        </div>
      </div>

      {/* Mobile Pipeline View - Vertical Stack */}
      <div className="lg:hidden">
        <div className="space-y-4">
          {modules.map((module, index) => {
            const Icon = module.icon
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => onModuleClick?.(module.id)}
                className={cn(
                  'relative rounded-xl border backdrop-blur-sm p-4 cursor-pointer',
                  'bg-gray-900/60',
                  module.borderColor
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Step indicator */}
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
                      module.color
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    {index < modules.length - 1 && (
                      <div className="w-0.5 h-8 bg-gradient-to-b from-gray-600 to-transparent mt-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-base font-semibold text-white">
                        {module.name}
                      </h3>
                      <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                        Step {index + 1}
                      </span>
                    </div>
                    <p className={cn('text-sm mb-2', module.textColor)}>
                      {module.tagline}
                    </p>
                    <p className="text-xs text-gray-500">
                      {module.ecosystemBonus}
                    </p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Mobile Pipeline Status */}
        <div className="flex justify-center mt-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <motion.div
              className="w-2 h-2 rounded-full bg-emerald-400"
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-sm font-medium text-emerald-400">
              Concept-to-Publish Pipeline
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PipelineFlow
