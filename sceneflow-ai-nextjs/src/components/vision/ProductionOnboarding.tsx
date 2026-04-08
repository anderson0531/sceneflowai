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
  Compass,
  Frame,
  Film,
  Clapperboard,
  Sparkles,
  Lightbulb,
  CheckCircle2,
  SkipForward,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ============================================================================
// Tour Step Configuration
// ============================================================================

export interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  /** Which workflow step this maps to */
  workflowStep?: string
  /** Tip for this step */
  tip?: string
}

const PRODUCTION_TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Production',
    description: 'This is where your screenplay comes to life. Each scene goes through a structured workflow — from script refinement to final rendered video. Let\'s walk through the steps.',
    icon: <Sparkles className="w-6 h-6" />,
    tip: 'You can work on scenes in any order, but completing them sequentially gives the best results.',
  },
  {
    id: 'script-tab',
    title: '1. Script — Write & Refine',
    description: 'Start with your AI-generated scene script. Use Insights & Direction to make specific revisions with AI assistance. Generate audio narration and dialogue in 13+ languages.',
    icon: <FileText className="w-6 h-6" />,
    workflowStep: 'dialogueAction',
    tip: 'The Audience Resonance score (shown on each scene) measures quality across Dialogue, Pacing, Emotion, and Visual dimensions. Aim for 85+.',
  },
  {
    id: 'direction',
    title: '2. Scene Direction — Auto-Generated',
    description: 'Scene Direction is automatically generated from your script, providing camera angles, lighting, atmosphere, and key props. You can review and edit it anytime.',
    icon: <Compass className="w-6 h-6" />,
    workflowStep: 'directorsChair',
    tip: 'Scene Direction feeds into keyframe image generation for better visual consistency.',
  },
  {
    id: 'storyboard',
    title: '3. Storyboard Builder — Keyframes',
    description: 'Generate start and end keyframe images for each segment. These keyframes define your scene composition and enable Frame-to-Video (FTV) generation — the most reliable video mode.',
    icon: <Frame className="w-6 h-6" />,
    workflowStep: 'segmentBuilder',
    tip: 'FTV mode interpolates between your Start and End keyframes, giving you precise control over the video output.',
  },
  {
    id: 'storyboard-editor',
    title: '4. Storyboard Editor — Preview & Align',
    description: 'Align audio tracks with your keyframe images and add text overlays. Preview as an animatic with multiple language audio tracks. For many productions, the animatic is the final output.',
    icon: <Film className="w-6 h-6" />,
    tip: 'You can render animatic MP4/WebM streams directly from here — great for storyboard reviews and presentations.',
  },
  {
    id: 'video-generation',
    title: '5. Video Generation — AI Segments',
    description: 'Generate AI video for each segment. The default FTV mode uses your keyframes for the most reliable results. You also have I2V, T2V, Reference, and Extend modes for full creative control.',
    icon: <Clapperboard className="w-6 h-6" />,
    workflowStep: 'callAction',
    tip: 'Video segments are up to 8 seconds each to align with AI generation limits. The system auto-segments your scene for optimal results.',
  },
  {
    id: 'mixer',
    title: '6. Scene Production Mixer — Compose',
    description: 'Combine segment videos into a single scene render with audio mixing, text overlays, and watermarks. Render in 720p, 1080p, or 4K.',
    icon: <Volume2 className="w-6 h-6" />,
    tip: 'The mixer supports "Elastic Timing" — audio can extend beyond video by freezing the last frame, ensuring narration is never cut short.',
  },
  {
    id: 'progress',
    title: '7. Track Progress — Dashboard',
    description: 'The Production Progress dashboard shows all scenes at a glance with color-coded status for each step: Script, Audio, Direction, Keyframes, Video, and Render. Click any scene to jump to it.',
    icon: <CheckCircle2 className="w-6 h-6" />,
    tip: 'When all scenes are complete, continue to Final Cut to assemble and export your full production.',
  },
]

// ============================================================================
// LocalStorage Key
// ============================================================================

const TOUR_STORAGE_KEY = 'sceneflow-production-tour-completed'
const TOUR_DISMISSED_KEY = 'sceneflow-production-tour-dismissed'

// ============================================================================
// Component
// ============================================================================

interface ProductionOnboardingProps {
  /** Force show even if previously dismissed */
  forceShow?: boolean
  onComplete?: () => void
  className?: string
}

export function ProductionOnboarding({ forceShow, onComplete, className }: ProductionOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  // Check if user has already seen the tour
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true)
      return
    }
    if (typeof window !== 'undefined') {
      const dismissed = localStorage.getItem(TOUR_DISMISSED_KEY)
      const completed = localStorage.getItem(TOUR_STORAGE_KEY)
      if (!dismissed && !completed) {
        // Show tour for first-time users after a short delay
        const timer = setTimeout(() => setIsVisible(true), 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [forceShow])

  const step = PRODUCTION_TOUR_STEPS[currentStep]
  const totalSteps = PRODUCTION_TOUR_STEPS.length
  const isLastStep = currentStep === totalSteps - 1
  const isFirstStep = currentStep === 0

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleComplete()
    } else {
      setCurrentStep(prev => prev + 1)
    }
  }, [isLastStep])

  const handlePrev = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1))
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
            "relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress bar */}
          <div className="h-1 bg-gray-800">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
              animate={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="px-8 pt-8 pb-6">
            {/* Icon */}
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4">
              {step.icon}
            </div>

            {/* Step counter */}
            <div className="text-xs text-gray-500 mb-2">
              Step {currentStep + 1} of {totalSteps}
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-white mb-3">
              {step.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-300 leading-relaxed mb-4">
              {step.description}
            </p>

            {/* Tip */}
            {step.tip && (
              <div className="flex items-start gap-2 p-3 bg-cyan-900/20 border border-cyan-700/30 rounded-lg">
                <Lightbulb className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-cyan-300 leading-relaxed">
                  {step.tip}
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between px-8 py-4 border-t border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              {/* Step dots */}
              {PRODUCTION_TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "w-2 h-2 rounded-full transition-all duration-200",
                    idx === currentStep
                      ? "bg-purple-500 w-6"
                      : idx < currentStep
                      ? "bg-purple-500/50"
                      : "bg-gray-600"
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  className="text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}

              {isFirstStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-gray-500 hover:text-white"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip Tour
                </Button>
              )}

              <Button
                size="sm"
                onClick={handleNext}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isLastStep ? (
                  <>
                    Get Started
                    <Sparkles className="w-4 h-4 ml-1" />
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

// ============================================================================
// Restart Tour Button — for settings/help
// ============================================================================

export function RestartTourButton({ className }: { className?: string }) {
  const [showTour, setShowTour] = useState(false)

  const handleRestart = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOUR_STORAGE_KEY)
      localStorage.removeItem(TOUR_DISMISSED_KEY)
    }
    setShowTour(true)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRestart}
        className={cn("text-gray-400 hover:text-white", className)}
      >
        <Lightbulb className="w-4 h-4 mr-2" />
        Restart Tour
      </Button>
      {showTour && (
        <ProductionOnboarding
          forceShow
          onComplete={() => setShowTour(false)}
        />
      )}
    </>
  )
}
