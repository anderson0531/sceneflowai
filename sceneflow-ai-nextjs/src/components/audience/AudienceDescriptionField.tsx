'use client'

import React, { useCallback, useState } from 'react'
import {
  Sparkles,
  Loader2,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { TargetAudienceSelector } from '@/components/audience/TargetAudienceSelector'
import {
  createAudienceDefinition,
  hasCulturalSignals,
  type AudienceCulturalSignals,
  type AudienceDefinition,
  type AudienceTargetProfile,
} from '@/lib/types/audienceResonance'
import {
  validateAudienceDescription,
  type AudienceRefineContext,
  type AudienceRefineResult,
  type AudienceValidationIssue,
} from '@/lib/audience/refineAudience'

interface AudienceDescriptionFieldProps {
  value: AudienceDefinition
  onChange: (def: AudienceDefinition) => void
  /** Project context passed to the AI refine step for sharper enhancement */
  context?: AudienceRefineContext
  /** Enables the collapsible "fine-tune profile" chip selector */
  showAdvanced?: boolean
  variant?: 'default' | 'compact'
  rows?: number
  placeholder?: string
  className?: string
  /** Optional project id for credit attribution */
  projectId?: string
}

const DEFAULT_PLACEHOLDER =
  'Describe your audience in your own words — culture, age, location, faith, interests, values. e.g. "Thai millennials in Bangkok who love Muay Thai and modern Buddhist-influenced drama."'

function SignalGroup({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {items.map((item) => (
        <span
          key={`${label}-${item}`}
          className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] text-cyan-200"
        >
          {item}
        </span>
      ))}
    </div>
  )
}

function CulturalSignalsDisplay({ signals }: { signals?: AudienceCulturalSignals }) {
  if (!hasCulturalSignals(signals)) return null
  return (
    <div className="space-y-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2">
      <p className="text-[11px] font-medium text-cyan-200">
        Cultural signals the analysis will validate
      </p>
      <SignalGroup label="Cultures" items={signals!.cultures} />
      <SignalGroup label="Locales" items={signals!.locales} />
      <SignalGroup label="Languages" items={signals!.languages} />
      <SignalGroup label="Faith" items={signals!.faith} />
      <SignalGroup label="Communities" items={signals!.subcultures} />
      <SignalGroup label="Values" items={signals!.values} />
      <SignalGroup label="Sensitivities" items={signals!.sensitivities} />
    </div>
  )
}

export function AudienceDescriptionField({
  value,
  onChange,
  context,
  showAdvanced = true,
  variant = 'default',
  rows = 4,
  placeholder,
  className,
  projectId,
}: AudienceDescriptionFieldProps) {
  const [isEnhancing, setIsEnhancing] = useState(false)
  const [issues, setIssues] = useState<AudienceValidationIssue[]>([])
  const [summary, setSummary] = useState<string>('')
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const description = value.description || ''

  const handleDescriptionChange = useCallback(
    (next: string) => {
      setIssues([])
      setEnhanceError(null)
      onChange(
        createAudienceDefinition({
          ...value,
          description: next,
          // A manual edit invalidates the previous AI enhancement
          aiEnhanced: false,
        })
      )
    },
    [onChange, value]
  )

  const handleProfileChange = useCallback(
    (field: keyof AudienceTargetProfile, fieldValue: string) => {
      onChange(
        createAudienceDefinition({
          ...value,
          profile: { ...value.profile, [field]: fieldValue },
        })
      )
    },
    [onChange, value]
  )

  const applyRefineResult = useCallback(
    (result: AudienceRefineResult) => {
      setIssues(result.issues || [])
      setSummary(result.summary || '')
      if (!result.valid) {
        // Keep the user's text; just surface guidance
        return
      }
      onChange(
        createAudienceDefinition({
          ...value,
          description: result.enhancedDescription || description,
          profile: result.derivedProfile || value.profile,
          culturalSignals: result.culturalSignals,
          aiEnhanced: true,
        })
      )
    },
    [onChange, value, description]
  )

  const handleEnhance = useCallback(async () => {
    const trimmed = description.trim()
    const local = validateAudienceDescription(trimmed)
    if (!local.valid) {
      setIssues(local.issues)
      setSummary('')
      return
    }

    setIsEnhancing(true)
    setEnhanceError(null)
    try {
      const response = await fetch('/api/audience/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: trimmed, context, projectId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Could not enhance the audience description.')
      }
      applyRefineResult(data.result as AudienceRefineResult)
    } catch (err) {
      setEnhanceError(err instanceof Error ? err.message : 'Enhancement failed')
    } finally {
      setIsEnhancing(false)
    }
  }, [description, context, projectId, applyRefineResult])

  return (
    <div className={cn('space-y-3', className)}>
      <DictationTextarea
        value={description}
        onChange={handleDescriptionChange}
        placeholder={placeholder || DEFAULT_PLACEHOLDER}
        rows={rows}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleEnhance}
          disabled={isEnhancing || !description.trim()}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
            isEnhancing || !description.trim()
              ? 'cursor-not-allowed border-slate-700/60 bg-slate-800/40 text-slate-500'
              : 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
          )}
        >
          {isEnhancing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {isEnhancing ? 'Enhancing…' : 'Validate & Enhance with AI'}
        </button>

        {value.aiEnhanced ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" /> Enhanced
          </span>
        ) : null}
      </div>

      {summary && value.aiEnhanced ? (
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

      {enhanceError ? (
        <p className="text-[11px] text-red-300">{enhanceError}</p>
      ) : null}

      <CulturalSignalsDisplay signals={value.culturalSignals} />

      {showAdvanced ? (
        <div>
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-200"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Fine-tune audience profile (optional)
            <ChevronDown
              className={cn('h-3.5 w-3.5 transition-transform', advancedOpen && 'rotate-180')}
            />
          </button>
          {advancedOpen ? (
            <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
              <TargetAudienceSelector
                value={value.profile}
                onChange={handleProfileChange}
                variant={variant === 'compact' ? 'compact' : 'default'}
                showSummary={false}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
