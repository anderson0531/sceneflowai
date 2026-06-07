'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  X,
  ChevronRight,
  ChevronLeft,
  FileText,
  Volume2,
  Frame,
  Film,
  Clapperboard,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  SkipForward,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  workflowStep?: string
  tip?: string
}

const PRODUCTION_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Production',
    description:
      'SceneFlow is one continuous pipeline: Foundation → Pre-vis → Production → Final Cut. You work in two tabs — Script and Action — with a clear next step at every stage.',
    icon: <Sparkles className="w-6 h-6" />,
    tip: 'The Production Progress dashboard and co-pilot always show where you are and what is next.',
  },
  {
    id: 'script-tab',
    title: 'Step 1 - Foundation (Script tab)',
    description:
      'Write and refine your script, run Audience Resonance (85+ target), generate audio, and assign voices. Lock the script when ready — Express stays disabled until Foundation is complete.',
    icon: <FileText className="w-6 h-6" />,
    workflowStep: 'dialogueAction',
    tip: 'Script Status: Draft → Reviewed → Locked. Production Ready checks voices and references.',
  },
  {
    id: 'storyboard',
    title: 'Step 2 - Pre-vis',
    description:
      'Use Build Pre-vis (Express) for Direction → Audio → pre-vis frames in ~10 minutes. Review in the gallery, share for approval, and preview in Screening Room — Preview (live).',
    icon: <Frame className="w-6 h-6" />,
    workflowStep: 'dialogueAction',
    tip: 'Pre-vis Frame = still image per beat. Screening Room is live preview — not an exported MP4.',
  },
  {
    id: 'action-tab',
    title: 'Step 3 - Production (Action tab)',
    description:
      'Beat Frames (start/end pairs for F2V) → Director Console video beats → Production Mixer → Production Streams — Export (MP4). One Output control syncs Animatic, Video, and language.',
    icon: <Clapperboard className="w-6 h-6" />,
    workflowStep: 'callAction',
    tip: 'Do video work only in Action — the pre-vis gallery no longer embeds a duplicate production panel.',
  },
  {
    id: 'mixer-streams',
    title: 'Step 4 - Mixer & Streams',
    description:
      'Mixer previews with elastic timing; baseline language drives the timeline. Render Stream opens one export dialog (Fast WebM / Broadcast MP4 / Cloud). Finished files live in Production Streams.',
    icon: <Volume2 className="w-6 h-6" />,
    tip: 'After render: Play in Streams or Send to Final Cut — not auto-download.',
  },
  {
    id: 'final-cut',
    title: 'Step 5 - Final Cut',
    description:
      'Pick a stream version per scene (Animatic or Video × language), assemble in Final Cut, and export your premiere. The workflow guide lists each step.',
    icon: <Film className="w-6 h-6" />,
    tip: 'Stale streams show “Update available” when beats or audio change.',
  },
  {
    id: 'progress',
    title: 'Step 6 - Track Progress',
    description:
      'The dashboard tracks Script, Audio, Direction, Beat Frames, Video, and Render using beat-first rules. Click any scene to jump to it.',
    icon: <CheckCircle2 className="w-6 h-6" />,
    tip: 'Share pre-vis links early — approval converts to faster video production.',
  },
]

const TOUR_STORAGE_KEY = 'sceneflow-production-tour-complete'
const TOUR_DISMISSED_KEY = 'sceneflow-production-tour-dismissed'

interface ProductionOnboardingProps {
  onComplete?: () => void
  className?: string
}

export function ProductionOnboarding({ onComplete, className }: ProductionOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const totalSteps = PRODUCTION_TOUR_STEPS.length
  const step = PRODUCTION_TOUR_STEPS[currentStep]
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
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }, [isLastStep])

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const handleComplete = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true')
    }
    setIsVisible(false)
    onComplete?.()
  }, [onComplete])

  const handleDismiss = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_DISMISSED_KEY, 'true')
    }
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={cn(
            'relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden',
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="h-1 bg-gray-800">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
              animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="px-8 pt-8 pb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              {step.icon}
            </div>

            <div className="text-xs text-gray-500 mb-2">
              Step {currentStep + 1} of {totalSteps}
            </div>

            <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>

            <p className="text-sm text-gray-300 leading-relaxed mb-4">{step.description}</p>

            {step.tip && (
              <div className="flex items-start gap-2 p-3 bg-cyan-900/20 border border-cyan-700/30 rounded-lg">
                <Lightbulb className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-cyan-300 leading-relaxed">{step.tip}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-8 py-4 border-t border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              {PRODUCTION_TOUR_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    idx === currentStep ? 'bg-purple-400' : 'bg-gray-700'
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button variant="ghost" size="sm" onClick={handlePrev} className="text-gray-400">
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleDismiss} className="text-gray-500">
                <SkipForward className="w-4 h-4 mr-1" />
                Skip
              </Button>
              <Button size="sm" onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white">
                {isLastStep ? (
                  <>
                    <Share2 className="w-4 h-4 mr-1" />
                    Start Production
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export function resetProductionTour() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOUR_STORAGE_KEY)
    localStorage.removeItem(TOUR_DISMISSED_KEY)
  }
}
