'use client'

import React, { useCallback, useState } from 'react'
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import {
  validateConceptDescription,
  type ConceptRefineContext,
  type ConceptRefineResult,
  type ConceptValidationIssue,
} from '@/lib/blueprint/refineConcept'

interface ConceptDescriptionFieldProps {
  value: string
  onChange: (value: string) => void
  /** Project context passed to the AI refine step for sharper guidance */
  context?: ConceptRefineContext
  rows?: number
  placeholder?: string
  className?: string
  /** Optional project id for credit attribution */
  projectId?: string
}

const DEFAULT_PLACEHOLDER =
  'Describe your project. Include the main topic, subjects or characters, and what you want the audience to take away...'

export function ConceptDescriptionField({
  value,
  onChange,
  context,
  rows = 6,
  placeholder,
  className,
  projectId,
}: ConceptDescriptionFieldProps) {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [issues, setIssues] = useState<ConceptValidationIssue[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [summary, setSummary] = useState<string>('')
  const [enhancedDescription, setEnhancedDescription] = useState<string>('')
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [aiEnhanced, setAiEnhanced] = useState(false)

  const handleDescriptionChange = useCallback(
    (next: string) => {
      setIssues([])
      setEnhanceError(null)
      setAiEnhanced(false)
      onChange(next)
    },
    [onChange]
  )

  const handleEnhance = useCallback(async () => {
    const trimmed = value.trim()
    const local = validateConceptDescription(trimmed)
    if (!local.valid) {
      setIssues(local.issues)
      setQuestions([])
      setSummary('')
      setEnhancedDescription('')
      return
    }

    setIsEnhancing(true)
    setEnhanceError(null)
    try {
      const response = await fetch('/api/blueprint/refine-concept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: trimmed, context, projectId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Could not enhance the project description.')
      }
      const result = data.result as ConceptRefineResult
      setIssues(result.issues || [])
      setQuestions(result.clarifyingQuestions || [])
      setSummary(result.summary || '')
      setEnhancedDescription(
        result.enhancedDescription && result.enhancedDescription !== trimmed
          ? result.enhancedDescription
          : ''
      )
      setAiEnhanced(result.valid)
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Enhancement failed')
    } finally {
      setIsEnhancing(false)
    }
  }, [value, context, projectId])

  const applyEnhanced = useCallback(() => {
    if (!enhancedDescription) return
    onChange(enhancedDescription)
    setEnhancedDescription('')
    setAiEnhanced(true)
  }, [enhancedDescription, onChange])

  return (
    <div className={cn('space-y-3', className)}>
      <DictationTextarea
        value={value}
        onChange={handleDescriptionChange}
        placeholder={placeholder || DEFAULT_PLACEHOLDER}
        rows={rows}
        className="bg-slate-800/50 border-slate-700 focus:ring-cyan-500/50"
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleEnhance}
          disabled={isEnhancing || !value.trim()}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
            isEnhancing || !value.trim()
              ? 'cursor-not-allowed border-slate-700/60 bg-slate-800/40 text-slate-500'
              : 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
          )}
        >
          {isEnhancing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isEnhancing ? 'Analyzing…' : 'Validate & Enhance with AI'}
        </button>

        {aiEnhanced ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Looks good
          </span>
        ) : null}
      </div>

      {summary ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-2 text-[11px] leading-relaxed text-slate-300">
          <span className="font-medium text-slate-200">Summary: </span>
          {summary}
        </p>
      ) : null}

      {issues.length > 0 ? (
        <div className="space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          {issues.map((issue, idx) => (
            <p
              key={`${issue.code}-${idx}`}
              className="flex items-start gap-1.5 text-[11px] leading-relaxed text-amber-200"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{issue.message}</span>
            </p>
          ))}
        </div>
      ) : null}

      {questions.length > 0 ? (
        <div className="space-y-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
          <p className="text-[11px] font-medium text-cyan-200">
            Answering these in your description will sharpen the Blueprint:
          </p>
          {questions.map((q, idx) => (
            <p
              key={`q-${idx}`}
              className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-300"
            >
              <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-300/80" />
              <span>{q}</span>
            </p>
          ))}
        </div>
      ) : null}

      {enhancedDescription ? (
        <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
          <p className="text-[11px] font-medium text-emerald-200">Suggested enhanced description</p>
          <p className="text-[11px] leading-relaxed text-slate-300">{enhancedDescription}</p>
          <button
            type="button"
            onClick={applyEnhanced}
            className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/25"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Use this description
          </button>
        </div>
      ) : null}

      {enhanceError ? <p className="text-[11px] text-red-300">{enhanceError}</p> : null}
    </div>
  )
}
