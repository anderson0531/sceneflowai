'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Play, 
  Zap, 
  Clock, 
  Youtube, 
  Mic, 
  Film,
  Sparkles,
  TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type CreatorMode = 'cinematic' | 'fasttrack'

interface ModeConfig {
  badge: { icon: React.ElementType; text: string; colors: string }
  headline: { line1: string; line2: string; gradient: string }
  subtitle: string
  features: Array<{ icon: React.ElementType; text: string }>
  cta: { text: string; gradient: string }
  social: string
}

const modeConfigs: Record<CreatorMode, ModeConfig> = {
  fasttrack: {
    badge: {
      icon: Youtube,
      text: 'Built for Faceless Channels & Narrators',
      colors: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
    },
    headline: {
      line1: 'Script to Screen',
      line2: 'Under 30 Minutes',
      gradient: 'from-amber-400 via-orange-500 to-red-500'
    },
    subtitle: 'Replace expensive video editors with AI-generated Ken Burns visuals. Perfect for True Crime, History, Stoicism, and educational content.',
    features: [
      { icon: Clock, text: 'Full video in 30 min' },
      { icon: Mic, text: 'Audio-first workflow' },
      { icon: TrendingUp, text: 'Publish daily' }
    ],
    cta: {
      text: 'Try Storyteller Mode Free',
      gradient: 'from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-orange-500/25'
    },
    social: 'Join 2,500+ faceless channel creators'
  },
  cinematic: {
    badge: {
      icon: Sparkles,
      text: 'Professional Virtual Production Suite',
      colors: 'bg-purple-500/10 border-purple-500/30 text-purple-300'
    },
    headline: {
      line1: 'AI-Powered',
      line2: 'Virtual Production',
      gradient: 'from-purple-400 via-pink-500 to-purple-600'
    },
    subtitle: 'From concept to cinematic video with consistent characters, professional voiceover, and full scene control.',
    features: [
      { icon: Film, text: 'Cinematic quality' },
      { icon: Sparkles, text: 'Character consistency' },
      { icon: Zap, text: 'AI scene generation' }
    ],
    cta: {
      text: 'Start Full Production',
      gradient: 'from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 shadow-purple-500/25'
    },
    social: 'Trusted by studios and indie filmmakers'
  }
}

export function CreatorFastTrackHero() {
  const [activeMode, setActiveMode] = useState<CreatorMode>('fasttrack')
  const config = modeConfigs[activeMode]
  const BadgeIcon = config.badge.icon

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Ambient Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent" />
      
      <div className="container mx-auto px-4 py-16 relative z-10">
        {/* Mode Selector */}
        <nav className="flex justify-center mb-10">
          <div className="inline-flex bg-gray-800/60 backdrop-blur rounded-full p-1.5 border border-gray-700/50">
            {(['cinematic', 'fasttrack'] as const).map((mode) => {
              const isActive = activeMode === mode
              const label = mode === 'fasttrack' ? 'Creator Fast-Track' : 'Full Production'
              const Icon = mode === 'fasttrack' ? Zap : Film
              
              return (
                <button
                  key={mode}
                  onClick={() => setActiveMode(mode)}
                  aria-pressed={isActive}
                  className={`
                    px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                    flex items-center gap-2
                    ${isActive 
                      ? mode === 'fasttrack'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg'
                        : 'bg-purple-600 text-white shadow-lg'
                      : 'text-gray-400 hover:text-gray-200'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </nav>

        <AnimatePresence mode="wait">
          <motion.article
            key={activeMode}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border mb-8 ${config.badge.colors}`}>
              <BadgeIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{config.badge.text}</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight leading-tight">
              {config.headline.line1}
              <br />
              <span className={`bg-gradient-to-r ${config.headline.gradient} bg-clip-text text-transparent`}>
                {config.headline.line2}
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              {config.subtitle}
            </p>

            {/* Feature Pills */}
            <ul className="flex flex-wrap justify-center gap-4 mb-10" role="list">
              {config.features.map((feat, idx) => {
                const FeatureIcon = feat.icon
                return (
                  <li 
                    key={idx}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-800/50 border border-gray-700/50 text-gray-300"
                  >
                    <FeatureIcon className="w-4 h-4 text-amber-400" />
                    <span className="text-sm">{feat.text}</span>
                  </li>
                )
              })}
            </ul>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button 
                size="lg"
                className={`bg-gradient-to-r ${config.cta.gradient} text-white px-8 py-6 text-lg shadow-2xl`}
              >
                <Play className="w-5 h-5 mr-2" />
                {config.cta.text}
              </Button>
              <Button 
                size="lg"
                variant="outline"
                className="border-gray-600 text-white hover:bg-gray-800/80 px-8 py-6 text-lg"
              >
                See How It Works
              </Button>
            </div>

            {/* Social Proof */}
            <p className="text-gray-500 text-sm">{config.social}</p>
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  )
}
