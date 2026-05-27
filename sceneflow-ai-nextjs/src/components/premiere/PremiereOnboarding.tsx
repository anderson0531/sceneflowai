'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronRight, ChevronLeft, Film, Share2, BarChart3, Youtube, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const TOUR_STEPS = [
  {
    id: 'master',
    title: 'Master from Final Cut',
    description: 'Your stitched master arrives here from Final Cut. Upload an external file if needed.',
    icon: <Film className="w-6 h-6" />,
  },
  {
    id: 'screen',
    title: 'Screen with reviewers',
    description: 'Create a screening and share the /s/ link. Collect scores, biometrics, and visual reactions.',
    icon: <Share2 className="w-6 h-6" />,
  },
  {
    id: 'insights',
    title: 'Review insights',
    description: 'Use Scoring, Biometric, and Visual tabs before you publish.',
    icon: <BarChart3 className="w-6 h-6" />,
  },
  {
    id: 'publish',
    title: 'Publish or export',
    description: 'YouTube wizard, short-form cuts, and export bundles — all from Premiere.',
    icon: <Youtube className="w-6 h-6" />,
  },
]

const TOUR_KEY = 'sceneflow-premiere-tour-complete'
const DISMISS_KEY = 'sceneflow-premiere-tour-dismissed'

export function PremiereOnboarding() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const current = TOUR_STEPS[step]
  const isLast = step === TOUR_STEPS.length - 1

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!localStorage.getItem(TOUR_KEY) && !localStorage.getItem(DISMISS_KEY)) {
      const t = setTimeout(() => setVisible(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true')
    setVisible(false)
  }, [])

  const next = useCallback(() => {
    if (isLast) {
      localStorage.setItem(TOUR_KEY, 'true')
      setVisible(false)
    } else {
      setStep((s) => s + 1)
    }
  }, [isLast])

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <motion.div className="relative w-full max-w-lg rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden">
          <button type="button" onClick={dismiss} className="absolute top-4 right-4 text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="p-6 pt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-violet-500/15 text-violet-400">{current.icon}</div>
              <div>
                <p className="text-xs text-zinc-500">{step + 1} of {TOUR_STEPS.length}</p>
                <h2 className="text-lg font-semibold text-white">{current.title}</h2>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed mb-6">{current.description}</p>
            <div className="flex justify-between">
              <Button variant="ghost" size="sm" onClick={dismiss}>
                <SkipForward className="w-4 h-4 mr-1" /> Skip
              </Button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                )}
                <Button size="sm" onClick={next} className="bg-violet-600 hover:bg-violet-500">
                  {isLast ? 'Get started' : 'Next'}
                  {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
