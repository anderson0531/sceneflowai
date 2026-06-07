'use client'

import React from 'react'
import { X, Clapperboard, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ScriptImportOnboardingBannerProps {
  onOpenScriptReview: () => void
  onOpenStoryboard: () => void
  onDismiss: () => void
  isDismissing?: boolean
}

export function ScriptImportOnboardingBanner({
  onOpenScriptReview,
  onOpenStoryboard,
  onDismiss,
  isDismissing = false,
}: ScriptImportOnboardingBannerProps) {
  return (
    <div className="mb-4 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/60 to-slate-900/80 p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-cyan-500/15 p-2 shrink-0">
          <Sparkles className="h-5 w-5 text-cyan-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Your script is loaded</h3>
          <p className="mt-1 text-sm text-slate-300">
            Run <strong className="font-medium text-cyan-300">Script Review</strong> to score
            audience resonance, then open <strong className="font-medium text-cyan-300">Storyboard</strong>{' '}
            to optimize scenes before generating video.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={onOpenScriptReview}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              <Sparkles className="h-4 w-4 mr-1.5" />
              Script Review
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenStoryboard}
              className="border-slate-600 text-slate-200 hover:bg-slate-800"
            >
              <Clapperboard className="h-4 w-4 mr-1.5" />
              Open Storyboard
            </Button>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          disabled={isDismissing}
          className="shrink-0 rounded-md p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

export default ScriptImportOnboardingBanner
