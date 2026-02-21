/**
 * Content Policy Alert Component
 * 
 * Displays inline warnings when prompts may trigger content safety filters.
 * Provides auto-fix functionality and AI regeneration options.
 * 
 * @module ContentPolicyAlert
 */

'use client'

import React, { useState } from 'react'
import { AlertTriangle, Wand2, RefreshCw, ChevronDown, ChevronUp, Check, X, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { ModerationResult, getContentPolicyMessage, buildRegenerationSystemPrompt, buildRegenerationUserPrompt } from '@/utils/promptModerator'

interface ContentPolicyAlertProps {
  moderationResult: ModerationResult
  onApplyFix: (fixedPrompt: string) => void
  onDismiss?: () => void
  className?: string
  /** Optional: Enable AI regeneration using Gemini */
  enableAIRegeneration?: boolean
  /** Optional: Custom regeneration function */
  onRegenerateWithAI?: (originalPrompt: string) => Promise<string>
}

export function ContentPolicyAlert({
  moderationResult,
  onApplyFix,
  onDismiss,
  className,
  enableAIRegeneration = false,
  onRegenerateWithAI,
}: ContentPolicyAlertProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [regenerationError, setRegenerationError] = useState<string | null>(null)

  if (moderationResult.isClean) {
    return null
  }

  const severityStyles = {
    low: {
      container: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
      icon: 'text-amber-500 dark:text-amber-400',
      text: 'text-amber-800 dark:text-amber-200',
      badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
    },
    medium: {
      container: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
      icon: 'text-orange-500 dark:text-orange-400',
      text: 'text-orange-800 dark:text-orange-200',
      badge: 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300',
    },
    high: {
      container: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
      icon: 'text-red-500 dark:text-red-400',
      text: 'text-red-800 dark:text-red-200',
      badge: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    },
    none: {
      container: '',
      icon: '',
      text: '',
      badge: '',
    },
  }

  const styles = severityStyles[moderationResult.severity]
  const message = getContentPolicyMessage(moderationResult)

  const handleApplyFix = () => {
    onApplyFix(moderationResult.suggestedPrompt)
  }

  const handleRegenerateWithAI = async () => {
    if (!onRegenerateWithAI) return
    
    setIsRegenerating(true)
    setRegenerationError(null)
    
    try {
      const regenerated = await onRegenerateWithAI(moderationResult.suggestedPrompt)
      onApplyFix(regenerated)
    } catch (error) {
      setRegenerationError(error instanceof Error ? error.message : 'Failed to regenerate prompt')
    } finally {
      setIsRegenerating(false)
    }
  }

  return (
    <div className={cn(
      'rounded-lg border p-3 transition-all',
      styles.container,
      className
    )}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('w-5 h-5 flex-shrink-0 mt-0.5', styles.icon)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-sm font-medium', styles.text)}>
              Content Safety Warning
            </span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded font-medium', styles.badge)}>
              {moderationResult.severity === 'high' ? 'High Risk' : 
               moderationResult.severity === 'medium' ? 'Medium Risk' : 'Low Risk'}
            </span>
          </div>
          <p className={cn('text-xs mt-1', styles.text, 'opacity-80')}>
            {message}
          </p>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={cn('p-1 rounded hover:bg-black/5 dark:hover:bg-white/5', styles.icon)}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyFix}
          className={cn(
            'h-8 text-xs gap-1.5',
            'bg-white dark:bg-gray-900',
            'border-current/20 hover:bg-current/5'
          )}
        >
          <Wand2 className="w-3.5 h-3.5" />
          Auto-Fix
        </Button>

        {enableAIRegeneration && onRegenerateWithAI && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateWithAI}
            disabled={isRegenerating}
            className={cn(
              'h-8 text-xs gap-1.5',
              'bg-white dark:bg-gray-900',
              'border-current/20 hover:bg-current/5'
            )}
          >
            {isRegenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Rephrasing...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                AI Rephrase
              </>
            )}
          </Button>
        )}

        <button
          onClick={() => setShowDetails(!showDetails)}
          className={cn(
            'ml-auto flex items-center gap-1 text-xs',
            styles.text, 'opacity-70 hover:opacity-100'
          )}
        >
          {showDetails ? 'Hide' : 'Show'} details
          {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Regeneration error */}
      {regenerationError && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-700 dark:text-red-300">
          {regenerationError}
        </div>
      )}

      {/* Details expandable */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-current/10">
          <div className="text-xs font-medium mb-2 opacity-80">
            Flagged terms ({moderationResult.flaggedTerms.length}):
          </div>
          <div className="space-y-1.5">
            {moderationResult.flaggedTerms.map((ft, idx) => (
              <div key={idx} className="flex items-center gap-2 text-xs">
                <span className={cn(
                  'px-1.5 py-0.5 rounded bg-current/10 font-mono',
                  styles.text
                )}>
                  {ft.term}
                </span>
                <span className="opacity-50">→</span>
                <span className="text-green-700 dark:text-green-400 font-medium">
                  {ft.alternatives.slice(0, 2).join(' / ')}
                </span>
              </div>
            ))}
          </div>
          
          {/* Suggested prompt preview */}
          <div className="mt-3">
            <div className="text-xs font-medium mb-1 opacity-80">Suggested prompt:</div>
            <div className={cn(
              'p-2 rounded bg-white/50 dark:bg-black/20 text-xs',
              styles.text, 'opacity-90 max-h-24 overflow-y-auto'
            )}>
              {moderationResult.suggestedPrompt}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact inline version for use in prompt textareas
 */
interface InlinePolicyWarningProps {
  flaggedCount: number
  onShowFull: () => void
  className?: string
}

export function InlinePolicyWarning({ flaggedCount, onShowFull, className }: InlinePolicyWarningProps) {
  if (flaggedCount === 0) return null

  return (
    <button
      onClick={onShowFull}
      className={cn(
        'inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full',
        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
        'hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors',
        className
      )}
    >
      <AlertTriangle className="w-3 h-3" />
      {flaggedCount} term{flaggedCount > 1 ? 's' : ''} may be flagged
    </button>
  )
}

/**
 * Success banner when prompt is fixed
 */
interface PolicyFixedBannerProps {
  onDismiss: () => void
  className?: string
}

export function PolicyFixedBanner({ onDismiss, className }: PolicyFixedBannerProps) {
  return (
    <div className={cn(
      'flex items-center gap-2 p-2 rounded-lg',
      'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800',
      'text-green-700 dark:text-green-300',
      className
    )}>
      <Check className="w-4 h-4" />
      <span className="text-xs">Prompt updated with safe alternatives</span>
      <button
        onClick={onDismiss}
        className="ml-auto p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}
