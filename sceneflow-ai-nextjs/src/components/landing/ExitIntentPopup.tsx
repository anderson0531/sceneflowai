'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Gift, ArrowRight } from 'lucide-react'

const STORAGE_KEY = 'sceneflow_exit_intent_shown'
const MIN_TIME_ON_PAGE = 10000 // 10 seconds before showing popup
const COOLDOWN_DAYS = 7 // Don't show again for 7 days after dismissing

interface ExitIntentPopupProps {
  /** URL to redirect to on CTA click */
  ctaUrl?: string
  /** CTA button text */
  ctaText?: string
}

export default function ExitIntentPopup({ 
  ctaUrl = '/dashboard',
  ctaText = 'Start Free for $5'
}: ExitIntentPopupProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [canShow, setCanShow] = useState(false)

  // Check if we should show the popup
  useEffect(() => {
    const checkEligibility = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
          const data = JSON.parse(stored)
          const daysSinceShown = (Date.now() - data.timestamp) / (1000 * 60 * 60 * 24)
          if (daysSinceShown < COOLDOWN_DAYS) {
            return false
          }
        }
        return true
      } catch {
        return true
      }
    }

    // Wait minimum time before enabling popup
    const timer = setTimeout(() => {
      if (checkEligibility()) {
        setCanShow(true)
      }
    }, MIN_TIME_ON_PAGE)

    return () => clearTimeout(timer)
  }, [])

  // Handle exit intent detection
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger on leaving from top of page
    if (e.clientY <= 0 && canShow && !isVisible) {
      setIsVisible(true)
    }
  }, [canShow, isVisible])

  useEffect(() => {
    if (!canShow) return

    document.addEventListener('mouseleave', handleMouseLeave)
    
    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [canShow, handleMouseLeave])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isVisible])

  const handleClose = () => {
    setIsVisible(false)
    // Mark as shown
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        timestamp: Date.now(),
        action: 'dismissed'
      }))
    } catch {
      // Ignore localStorage errors
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || isSubmitting) return

    setIsSubmitting(true)

    try {
      // Submit to waitlist API
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      if (res.ok) {
        setSubmitted(true)
        // Mark as converted
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          timestamp: Date.now(),
          action: 'subscribed',
          email
        }))
      }
    } catch (error) {
      console.error('Failed to submit email:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCTAClick = () => {
    // Mark as converted
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        timestamp: Date.now(),
        action: 'cta_clicked'
      }))
    } catch {
      // Ignore
    }
    setIsVisible(false)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
            onClick={handleClose}
            aria-hidden="true"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-full max-w-md p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exit-intent-title"
          >
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700/50"
                aria-label="Close popup"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header with gradient */}
              <div className="bg-gradient-to-r from-cyan-500/20 via-purple-500/20 to-amber-500/20 px-6 pt-8 pb-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <h2 id="exit-intent-title" className="text-2xl font-bold text-white mb-2">
                  Wait! Don&apos;t leave empty-handed
                </h2>
                <p className="text-gray-300 text-sm">
                  Get exclusive early access and tips for AI-powered filmmaking
                </p>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center py-6"
                  >
                    <Sparkles className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">You&apos;re on the list!</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Check your inbox for exclusive filmmaking tips and early access updates.
                    </p>
                    <a
                      href={ctaUrl}
                      onClick={handleCTAClick}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all"
                    >
                      {ctaText}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </motion.div>
                ) : (
                  <>
                    {/* Benefits */}
                    <div className="space-y-3 my-6">
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-cyan-400 text-xs">✓</span>
                        </div>
                        <span className="text-gray-300">Weekly AI filmmaking tutorials</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-purple-400 text-xs">✓</span>
                        </div>
                        <span className="text-gray-300">Early access to new features</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                          <span className="text-amber-400 text-xs">✓</span>
                        </div>
                        <span className="text-gray-300">Exclusive creator discounts</span>
                      </div>
                    </div>

                    {/* Email form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Enter your email"
                          required
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-semibold rounded-lg hover:from-cyan-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <span className="animate-pulse">Subscribing...</span>
                        ) : (
                          <>
                            Get Early Access
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    {/* Alternative CTA */}
                    <div className="mt-4 text-center">
                      <span className="text-gray-500 text-sm">or</span>
                      <a
                        href={ctaUrl}
                        onClick={handleCTAClick}
                        className="block mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                      >
                        Start creating now for just $5 →
                      </a>
                    </div>

                    {/* Privacy note */}
                    <p className="text-xs text-gray-500 text-center mt-4">
                      No spam, ever. Unsubscribe anytime.
                    </p>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
