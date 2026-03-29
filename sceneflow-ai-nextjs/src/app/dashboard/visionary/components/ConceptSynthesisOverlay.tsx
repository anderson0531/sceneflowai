'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Brain, Globe, Film, Loader2, X, AlertTriangle, RefreshCcw } from 'lucide-react'

interface OverlayProps {
  isVisible: boolean
  error: string | null
  onCancel: () => void
  onRetry: () => void
}

const loadingSteps = [
  { text: "Analyzing Market Gaps...", icon: Brain },
  { text: "Synthesizing Global Demand...", icon: Globe },
  { text: "Architecting Narrative Arcs...", icon: Film },
  { text: "Polishing Series Blueprints...", icon: Sparkles },
]

export function ConceptSynthesisOverlay({ isVisible, error, onCancel, onRetry }: OverlayProps) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!isVisible || error) return
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 4)
    }, 2500)
    return () => clearInterval(interval)
  }, [isVisible, error])

  const CurrentIcon = loadingSteps[step].icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-950/98 backdrop-blur-2xl"
        >
          <div className="max-w-md w-full px-8 text-center">
            <AnimatePresence mode="wait">
              {!error ? (
                /* --- PROCESSING STATE --- */
                <motion.div
                  key="loading"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  className="space-y-8"
                >
                  <div className="relative h-24 w-24 mx-auto flex items-center justify-center">
                    <motion.div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
                    <Loader2 className="w-12 h-12 text-emerald-400 animate-spin" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white">Synthesizing Options...</h3>
                    <p className="text-xs text-gray-500 font-mono uppercase tracking-widest">
                      Running SceneFlow Logic v2.5
                    </p>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 3 }}
                    className="pt-4"
                  >
                    <button
                      onClick={onCancel}
                      className="group flex items-center gap-2 mx-auto px-4 py-2 text-xs font-semibold text-gray-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-400/20 rounded-full"
                    >
                      <X className="w-3 h-3 transition-transform group-hover:rotate-90" />
                      Abort Synthesis
                    </button>
                  </motion.div>
                </motion.div>
              ) : (
                /* --- ERROR RECOVERY STATE --- */
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="relative h-24 w-24 mx-auto flex items-center justify-center">
                    <motion.div className="absolute inset-0 bg-red-500/20 rounded-full blur-3xl" />
                    <AlertTriangle className="w-12 h-12 text-red-500" />
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold text-red-500">Synthesis Interrupted</h3>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                      <p className="text-sm text-red-200/80 leading-relaxed">
                        {error || "The AI encountered an unexpected narrative divergence. Please try again."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={onRetry}
                      className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Retry Synthesis
                    </button>
                    <button
                      onClick={onCancel}
                      className="text-sm text-gray-500 hover:text-white transition-colors"
                    >
                      Return to Report
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
