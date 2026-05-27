'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  X,
  ChevronRight,
  ChevronLeft,
  Film,
  Layers,
  Clapperboard,
  Sparkles,
  SkipForward,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Final Cut',
    description:
      'Final Cut stitches finished Production streams into one master video. Edit beats, audio, and visuals in the Production Mixer — not here.',
    icon: <Film className="w-6 h-6" />,
  },
  {
    id: 'streams',
    title: 'Streams from Production',
    description:
      'Each scene has Animatic and Video streams per language. Render them in Production Streams before assembling.',
    icon: <Clapperboard className="w-6 h-6" />,
  },
  {
    id: 'assembly',
    title: 'Pick streams per scene',
    description:
      'Use a preset (All Video, Hybrid) or Custom mix to combine Animatic and Video — or English and Spanish — scene by scene.',
    icon: <Layers className="w-6 h-6" />,
  },
  {
    id: 'export',
    title: 'Preview and export',
    description:
      'Scenes auto-align in script order. Preview the full program, then Render Final Cut for a single MP4 ready for Premiere.',
    icon: <Sparkles className="w-6 h-6" />,
  },
]

const TOUR_STORAGE_KEY = 'sceneflow-final-cut-tour-complete'
const TOUR_DISMISSED_KEY = 'sceneflow-final-cut-tour-dismissed'

export function FinalCutOnboarding({ className }: { className?: string }) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const step = TOUR_STEPS[currentStep]
  const isLastStep = currentStep === TOUR_STEPS.length - 1

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(TOUR_STORAGE_KEY) && !localStorage.getItem(TOUR_DISMISSED_KEY)) {
      const t = setTimeout(() => setIsVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_DISMISSED_KEY, 'true')
    setIsVisible(false)
  }, [])

  const handleNext = useCallback(() => {
    if (isLastStep) {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true')
      setIsVisible(false)
    } else {
      setCurrentStep((s) => s + 1)
    }
  }, [isLastStep])

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
        <motion.div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500" />
          <button
            type="button"
            onClick={handleSkip}
            className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            aria-label="Close tour"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="p-6 pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400">{step.icon}</div>
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">
                  {currentStep + 1} of {TOUR_STEPS.length}
                </p>
                <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">{step.description}</p>
            {step.id === 'assembly' && (
              <div className="flex gap-2 p-3 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-xs text-zinc-400">
                <CheckCircle2 className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
                Example: Scene 1 Animatic EN + Scene 2 Video ES in one export.
              </div>
            )}
            <div className="flex items-center justify-between mt-6 gap-2">
              <Button variant="ghost" size="sm" onClick={handleSkip} className="text-zinc-400">
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setCurrentStep((s) => s - 1)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="bg-violet-600 hover:bg-violet-500">
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
