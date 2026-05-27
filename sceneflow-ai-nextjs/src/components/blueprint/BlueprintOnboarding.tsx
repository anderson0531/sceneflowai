'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Eye,
  PencilLine,
  Clapperboard,
  Radar,
  SkipForward,
  CheckCircle2,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { BLUEPRINT_COPY } from '@/lib/blueprint/blueprintGlossary'

export interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  tip?: string
}

const BLUEPRINT_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Blueprint',
    description:
      'Blueprint is your creative foundation: Generate → Review → Iterate → Start Production. One continuous workflow — not scattered editors.',
    icon: <Sparkles className="w-6 h-6" />,
    tip: 'The sidebar workflow guide and co-pilot show your next step at every stage.',
  },
  {
    id: 'generate',
    title: 'Step 1 — Generate',
    description:
      'Start from a series episode, concept, or imported script. Generate a structured treatment with logline, beats, characters, and tone.',
    icon: <Sparkles className="w-6 h-6" />,
    tip: 'Use Regenerate Blueprint for a full reset; Edit Blueprint for scoped changes.',
  },
  {
    id: 'review',
    title: 'Step 2 — Review',
    description:
      'Read each section in the treatment card. Open Audience Resonance in the side panel — save your target audience, then analyze.',
    icon: <Eye className="w-6 h-6" />,
    tip: BLUEPRINT_COPY.audienceResonance + ' target is 80+ before Production.',
  },
  {
    id: 'iterate',
    title: 'Step 3 — Iterate',
    description:
      'Apply AR recommendations or edit sections directly. Re-analyze after changes to track score improvement.',
    icon: <PencilLine className="w-6 h-6" />,
    tip: 'Click a category deduction to jump to the matching Blueprint section.',
  },
  {
    id: 'collaborate',
    title: 'Collaborate',
    description:
      'Share a collaborate link from the side panel for reviewer feedback, section audio, and structured synthesis.',
    icon: <Users className="w-6 h-6" />,
    tip: 'One canonical Collaborate home — the side panel tab.',
  },
  {
    id: 'resonance',
    title: 'Audience Resonance strip',
    description:
      'The header strip shows your AR score and points to 80+. Use “Improve weakest category” to focus your next edit.',
    icon: <Radar className="w-6 h-6" />,
  },
  {
    id: 'start-production',
    title: 'Step 4 — Start Production',
    description:
      'When your Blueprint is ready, Start Production hands off to script generation and the Production pipeline.',
    icon: <Clapperboard className="w-6 h-6" />,
    tip: 'A soft gate warns below 80 — you can override with confirmation.',
  },
]

const TOUR_STORAGE_KEY = 'sceneflow-blueprint-tour-complete'
const TOUR_DISMISSED_KEY = 'sceneflow-blueprint-tour-dismissed'

interface BlueprintOnboardingProps {
  onComplete?: () => void
  className?: string
}

export function BlueprintOnboarding({ onComplete, className }: BlueprintOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const totalSteps = BLUEPRINT_TOUR_STEPS.length
  const step = BLUEPRINT_TOUR_STEPS[currentStep]
  const isLastStep = currentStep === totalSteps - 1

  useEffect(() => {
    if (typeof window === 'undefined') return
    const completed = localStorage.getItem(TOUR_STORAGE_KEY)
    const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY)
    if (!completed && !dismissed) {
      const timer = setTimeout(() => setIsVisible(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true')
      setIsVisible(false)
      onComplete?.()
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [isLastStep, onComplete])

  const handlePrev = useCallback(() => {
    setCurrentStep((s) => Math.max(0, s - 1))
  }, [])

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true')
    setIsVisible(false)
    onComplete?.()
  }, [onComplete])

  if (!isVisible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={cn(
          'fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4',
          className
        )}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500" />
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-white"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6 pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400">{step.icon}</div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  {currentStep + 1} of {totalSteps}
                </p>
                <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mb-4">{step.description}</p>
            {step.tip && (
              <div className="flex gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                {step.tip}
              </div>
            )}

            <div className="flex gap-1.5 mt-6 justify-center">
              {BLUEPRINT_TOUR_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === currentStep ? 'w-6 bg-cyan-400' : 'w-1.5 bg-slate-700'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center justify-between mt-6 gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-400 hover:text-white"
              >
                <SkipForward className="w-4 h-4 mr-1" />
                Skip tour
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="bg-cyan-600 hover:bg-cyan-500">
                  {isLastStep ? 'Get started' : 'Next'}
                  {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default BlueprintOnboarding
