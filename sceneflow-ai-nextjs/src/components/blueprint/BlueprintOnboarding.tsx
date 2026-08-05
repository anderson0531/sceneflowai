'use client'

import { useTranslations } from 'next-intl'

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

export interface TourStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  tip?: string
}

/**
 * Step order and iconography only. Titles, descriptions and tips come from the
 * catalog keyed by id, because a module-level const cannot call a hook and the
 * copy interpolates product names that are themselves translated.
 */
const BLUEPRINT_TOUR_STEPS: Array<{ id: string; icon: React.ReactNode; hasTip: boolean }> = [
  { id: 'welcome', icon: <Sparkles className="w-6 h-6" />, hasTip: true },
  { id: 'generate', icon: <Sparkles className="w-6 h-6" />, hasTip: true },
  { id: 'review', icon: <Eye className="w-6 h-6" />, hasTip: true },
  { id: 'iterate', icon: <PencilLine className="w-6 h-6" />, hasTip: true },
  { id: 'collaborate', icon: <Users className="w-6 h-6" />, hasTip: true },
  { id: 'resonance', icon: <Radar className="w-6 h-6" />, hasTip: false },
  { id: 'startProduction', icon: <Clapperboard className="w-6 h-6" />, hasTip: true },
]

const TOUR_STORAGE_KEY = 'sceneflow-blueprint-tour-complete'
const TOUR_DISMISSED_KEY = 'sceneflow-blueprint-tour-dismissed'

interface BlueprintOnboardingProps {
  onComplete?: () => void
  className?: string
}

export function BlueprintOnboarding({ onComplete, className }: BlueprintOnboardingProps) {
  const t = useTranslations('blueprint.tour')
  const tp = useTranslations('blueprint.studio')
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
                  {t('stepCounter', { current: currentStep + 1, total: totalSteps })}
                </p>
                <h2 className="text-lg font-semibold text-white">{t(`${step.id}.title`)}</h2>
              </div>
            </div>

            <p className="text-sm text-gray-300 leading-relaxed mb-4">{t(`${step.id}.description`)}</p>
            {step.hasTip && (
              <div className="flex gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs text-gray-400">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                {t(`${step.id}.tip`)}
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
                {t('skip')}
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    {t('back')}
                  </Button>
                )}
                <Button size="sm" onClick={handleNext} className="bg-cyan-600 hover:bg-cyan-500">
                  {isLastStep ? t('getStarted') : t('next')}
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
