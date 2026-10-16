'use client'

import { useTranslations } from 'next-intl'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/Button'
import { DictationTextarea } from '../ui/DictationTextarea'
import { toast } from 'sonner'
import {
  Loader2,
  Sparkles,
  AlertTriangle,
  CheckSquare,
  Square,
  ChevronDown,
  Wand2,
  Check,
  CheckCircle2,
  RefreshCw,
  RotateCcw,
  Users,
} from 'lucide-react'
import { AudienceDescriptionField } from '@/components/audience/AudienceDescriptionField'
import {
  createAudienceDefinition,
  type AudienceDefinition,
  type BlueprintAudienceRecommendation,
} from '@/lib/types/audienceResonance'
import {
  BLUEPRINT_SECTION_TEMPLATES,
  FIX_SECTION_LABELS,
  type BlueprintSection,
} from '@/lib/constants/blueprint-optimization'
import type { BlueprintChangePlan, FieldDiff } from '@/lib/treatment/blueprintRevisionTypes'
import {
  stripHeavyFieldsFromVariant,
} from '@/lib/treatment/blueprintVariantSanitize'
import {
  mergeRevisionIntoVariant,
} from '@/lib/treatment/blueprintRevisionDiff'
import { trimVariantForPrompt } from '@/lib/treatment/blueprintRevisionPrompts'
import {
  appendFixInstruction,
  fixInstructionForRecommendation,
  formatResonanceFixInstructions,
  removeFixInstruction,
} from '@/lib/treatment/resonanceFixInstructions'
import { readJsonSafe } from '@/lib/readJsonSafe'
import {
  hasBlockingIssue,
  MAX_INTENT_CHARS,
  validateRevisionRequest,
} from '@/lib/treatment/blueprintRequestValidation'
import { ASSISTANT, assistantTitle } from '@/lib/constants/assistant'
import { ASSISTANT_ICON as AssistantIcon } from '@/lib/constants/assistantIcon'
import { useBackgroundJob } from '@/hooks/useBackgroundJob'
import { cn } from '@/lib/utils'
import {
  defaultFormatForIntent,
  resolveContentIntent,
  type ContentIntent,
} from '@/lib/content/contentIntent'
import { resolveVariantArtStyle } from '@/lib/treatment/blueprintFoundation'
import type {
  ClarifySynopsisResult,
  SeriesSynopsisLock,
  SynopsisMessage,
} from '@/lib/series/clarifySynopsis'
import { useContentTranslation } from '@/i18n/content/useContentTranslation'
import {
  buildRefineDiffDisplayFields,
} from '@/i18n/content/buildBlueprintDisplayFields'
import { EMPTY_ENTITY_I18N, type EntityI18n } from '@/i18n/content/entityI18n'

type TreatmentVariant = Record<string, unknown>

type Props = {
  open: boolean
  variant: TreatmentVariant | null
  onClose: () => void
  /** Return false to reject the patch, leaving the dialog open on its preview. */
  onApply: (patch: Record<string, unknown>) => void | boolean
  onRefineApplied?: (diff: FieldDiff[]) => void
  projectId?: string
  resonanceRecommendations?: BlueprintAudienceRecommendation[]
  /** Legacy prop retained for callers; Blueprint Director always balances the full blueprint. */
  initialActiveTab?: string
  onRequestReanalyze?: () => void
  contentIntent?: ContentIntent | null
  contentI18n?: EntityI18n
  /** Language the revision must be authored in. */
  storyLocale?: string
  initialIntent?: string
  rewriteToEnglish?: boolean
  audienceDefinition?: AudienceDefinition | null
  onAudienceDefinitionChange?: (def: AudienceDefinition) => void | Promise<void>
}

const ALL_TEMPLATE_SECTIONS: BlueprintSection[] = [
  'core',
  'story',
  'tone',
  'beats',
  'characters',
]

function DiffPanel({
  diffs,
  contentI18n,
}: {
  diffs: FieldDiff[]
  contentI18n?: EntityI18n
}) {
  const t = useTranslations('blueprint.assistant')
  const fields = useMemo(() => buildRefineDiffDisplayFields(diffs), [diffs])
  const { resolve } = useContentTranslation({
    fields,
    i18n: contentI18n ?? EMPTY_ENTITY_I18N,
    enabled: diffs.length > 0,
  })

  if (diffs.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        {t('noFieldChanges')}
      </p>
    )
  }
  return (
    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
      {diffs.map((d, index) => (
        <div
          key={d.field}
          className="rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5 space-y-1.5"
        >
          <div className="text-xs font-medium text-cyan-300/90">
            {d.label}{' '}
            <span className="text-gray-500 font-normal">({FIX_SECTION_LABELS[d.section] || d.section})</span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-[11px]">
            <div>
              <span className="text-red-400/80">{t('before')}</span>
              <p className="text-gray-500 line-clamp-4 whitespace-pre-wrap">
                {resolve(`refineDiff[${index}].before`).text || d.before || '—'}
              </p>
            </div>
            <div>
              <span className="text-emerald-400/80">{t('after')}</span>
              <p className="text-gray-200 line-clamp-6 whitespace-pre-wrap">
                {resolve(`refineDiff[${index}].after`).text || d.after || '—'}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function BlueprintRefineDialog({
  open,
  variant,
  onClose,
  onApply,
  onRefineApplied,
  projectId,
  resonanceRecommendations,
  onRequestReanalyze,
  contentIntent: contentIntentProp,
  contentI18n,
  storyLocale,
  initialIntent,
  rewriteToEnglish = false,
  audienceDefinition,
  onAudienceDefinitionChange,
}: Props) {
  const t = useTranslations('blueprint.assistant')
  const tc = useTranslations('common')
  const [phase, setPhase] = useState<'intent' | 'preview'>('intent')
  const [userIntent, setUserIntent] = useState('')
  const [selectedRecIds, setSelectedRecIds] = useState<Set<string>>(new Set())
  const [selectedTemplateKeys, setSelectedTemplateKeys] = useState<Set<string>>(new Set())
  const [showResonanceRecs, setShowResonanceRecs] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewVariant, setPreviewVariant] = useState<Record<string, unknown> | null>(null)
  const [changePlan, setChangePlan] = useState<BlueprintChangePlan | null>(null)
  const [diff, setDiff] = useState<FieldDiff[]>([])
  const [jobStatusText, setJobStatusText] = useState<string | null>(null)

  // Target Audience clarification & confirmation state
  const [audienceDef, setAudienceDef] = useState<AudienceDefinition>(() =>
    createAudienceDefinition({ description: '', source: 'blueprint' })
  )
  const [audienceConfirmed, setAudienceConfirmed] = useState(false)

  // Direction clarification & confirmation state (consistent with SeriesSynopsisIdeation)
  const [directionTurns, setDirectionTurns] = useState<SynopsisMessage[]>([])
  const [proposedDirection, setProposedDirection] = useState<string | null>(null)
  const [lockedDirection, setLockedDirection] = useState<SeriesSynopsisLock | null>(null)
  const [directionReadyToLock, setDirectionReadyToLock] = useState(false)
  const [isClarifyingDirection, setIsClarifyingDirection] = useState(false)
  const [directionError, setDirectionError] = useState<string | null>(null)

  const applyRevisionResult = useCallback(
    (
      patch: Record<string, unknown>,
      resultDiff: FieldDiff[],
      plan: BlueprintChangePlan | null
    ) => {
      if (!variant) return
      const audienceText = (audienceDef.description || '').trim()
      const enrichedPatch: Record<string, unknown> = {
        ...patch,
        ...(audienceText
          ? {
              target_audience: audienceText,
              audienceDefinition: audienceDef,
            }
          : {}),
      }
      const merged = mergeRevisionIntoVariant(variant, enrichedPatch)
      setPreviewVariant(merged)
      setChangePlan(plan)
      setDiff(resultDiff)
      setPhase('preview')
      toast.success('Balanced revision ready — review before applying')
    },
    [variant, audienceDef]
  )

  const {
    job: backgroundJob,
    isActive: jobActive,
    track: trackJob,
    cancel: cancelBackgroundJob,
  } = useBackgroundJob({
    projectId: projectId ?? '',
    jobType: 'blueprint_guided_revise',
    enabled: open && !!projectId,
    onCompleted: (job) => {
      setIsGenerating(false)
      setJobStatusText(null)
      const result = job.result as {
        patch?: Record<string, unknown>
        diff?: FieldDiff[]
        changePlan?: BlueprintChangePlan
      } | null
      if (result?.patch) {
        applyRevisionResult(
          result.patch,
          result.diff ?? [],
          result.changePlan ?? null
        )
      } else {
        toast.error('Revision completed but returned no changes')
      }
    },
    onFailed: (job) => {
      setIsGenerating(false)
      setJobStatusText(null)
      toast.error(job.error || 'Blueprint revision failed')
    },
  })

  const fullBalanceJobBlocksGenerate = jobActive

  useEffect(() => {
    if (!jobActive || !backgroundJob) return
    const pct = backgroundJob.progress ?? 0
    setJobStatusText(
      backgroundJob.status === 'queued'
        ? 'Queued…'
        : `Revising blueprint… ${pct > 0 ? `${pct}%` : ''}`.trim()
    )
  }, [jobActive, backgroundJob])

  // Drive the revision forward from the client. Serverless self-invocation can be
  // dropped once a response is sent, which would otherwise leave the job parked at
  // one phase forever. Each tick runs at most one lease-guarded phase server-side.
  const jobId = backgroundJob?.id
  useEffect(() => {
    if (!jobActive || !jobId) return

    let cancelled = false
    let inFlight = false

    const advance = async () => {
      if (cancelled || inFlight) return
      inFlight = true
      try {
        await fetch('/api/treatment/guided-revise/step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ jobId }),
        })
      } catch {
        // The next tick retries; polling still reflects real job state.
      } finally {
        inFlight = false
      }
    }

    void advance()
    const interval = setInterval(advance, 5000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [jobActive, jobId])

  useEffect(() => {
    if (!open) return
    setPhase('intent')
    setUserIntent(initialIntent ?? '')
    setPreviewVariant(null)
    setChangePlan(null)
    setDiff([])
    setJobStatusText(null)
    setSelectedTemplateKeys(new Set())
    setDirectionTurns([])
    setProposedDirection(null)
    setLockedDirection(null)
    setDirectionReadyToLock(false)
    setDirectionError(null)

    const existingAud =
      audienceDefinition ??
      (variant?.audienceDefinition as AudienceDefinition | undefined) ??
      null
    const initialAudText =
      existingAud?.description ||
      (typeof variant?.target_audience === 'string' ? variant.target_audience : '') ||
      ''
    const resolvedAud = createAudienceDefinition({
      ...(existingAud || {}),
      description: initialAudText,
      source: 'blueprint',
    })
    setAudienceDef(resolvedAud)
    setAudienceConfirmed(Boolean(resolvedAud.aiEnhanced || initialAudText.trim()))

    if (resonanceRecommendations?.length) {
      setSelectedRecIds(new Set(resonanceRecommendations.map((r) => r.id)))
      setShowResonanceRecs(true)
      if (!(initialIntent ?? '').trim() && !rewriteToEnglish) {
        setUserIntent(formatResonanceFixInstructions(resonanceRecommendations))
      }
    } else {
      setSelectedRecIds(new Set())
    }
  }, [
    open,
    initialIntent,
    rewriteToEnglish,
    resonanceRecommendations,
    audienceDefinition,
    variant,
  ])

  const templateSections = useMemo(
    () =>
      ALL_TEMPLATE_SECTIONS.map((s) => ({
        section: s,
        templates: BLUEPRINT_SECTION_TEMPLATES[s] || [],
      })),
    []
  )

  const combinedIntent = useMemo(() => {
    const parts: string[] = []
    const baseDirection = lockedDirection?.synopsis?.trim() || userIntent.trim()
    if (baseDirection) parts.push(baseDirection)
    const selectedRecs =
      resonanceRecommendations?.filter((r) => selectedRecIds.has(r.id)) ?? []
    for (const rec of selectedRecs) {
      const fix = fixInstructionForRecommendation(rec)
      if (fix && !baseDirection.includes(fix)) parts.push(fix)
    }
    for (const { section, templates } of templateSections) {
      for (const tpl of templates) {
        const key = `${section}:${tpl.id}`
        if (selectedTemplateKeys.has(key)) {
          parts.push(tpl.instruction)
        }
      }
    }
    const confirmedAud = (audienceDef.description || '').trim()
    const baselineAud =
      typeof variant?.target_audience === 'string' ? variant.target_audience.trim() : ''
    if (confirmedAud && confirmedAud !== baselineAud) {
      parts.push(`Align the blueprint for target audience: ${confirmedAud}`)
    }
    return parts.join('\n')
  }, [
    lockedDirection,
    userIntent,
    templateSections,
    selectedTemplateKeys,
    resonanceRecommendations,
    selectedRecIds,
    audienceDef.description,
    variant?.target_audience,
  ])

  // All validation below is pure and synchronous, so it can run per keystroke.
  const selectedRecCount = useMemo(
    () => resonanceRecommendations?.filter((r) => selectedRecIds.has(r.id)).length ?? 0,
    [resonanceRecommendations, selectedRecIds]
  )

  const requestIssues = useMemo(
    () =>
      validateRevisionRequest({
        intentText: combinedIntent,
        focusScope: 'all',
        variant,
        hasSelectedRecommendations: selectedRecCount > 0,
      }),
    [combinedIntent, variant, selectedRecCount]
  )

  const blockers = requestIssues.filter((i) => i.severity === 'blocker')
  const warnings = requestIssues.filter((i) => i.severity === 'warning')
  const submitBlocked = hasBlockingIssue(requestIssues)

  const handleAudienceChange = useCallback(
    (next: AudienceDefinition) => {
      setAudienceDef(next)
      if (next.aiEnhanced) {
        setAudienceConfirmed(true)
        void onAudienceDefinitionChange?.(next)
      } else {
        setAudienceConfirmed(false)
      }
    },
    [onAudienceDefinitionChange]
  )

  const handleConfirmAudience = useCallback(() => {
    if (!audienceDef.description?.trim()) return
    setAudienceConfirmed(true)
    void onAudienceDefinitionChange?.(audienceDef)
  }, [audienceDef, onAudienceDefinitionChange])

  const handleClarifyDirection = useCallback(async () => {
    if (!variant) return
    const text = userIntent.trim() || combinedIntent.trim()
    if (!text || isClarifyingDirection) return

    const previousTurns = directionTurns
    const nextMessages: SynopsisMessage[] = [
      ...directionTurns,
      { role: 'user', content: text },
    ]
    setDirectionTurns(nextMessages)
    setDirectionError(null)
    setIsClarifyingDirection(true)

    try {
      const resolvedIntent =
        contentIntentProp ?? resolveContentIntent(String(variant?.genre || ''))
      const format = defaultFormatForIntent(resolvedIntent) || 'narrative'
      const audienceText = (audienceDef.description || '').trim()

      const response = await fetch('/api/series/clarify-synopsis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          productionFormat: format,
          episodeCount: 1,
          targetAudience: audienceText || undefined,
          artStyle: resolveVariantArtStyle(variant),
          surface: 'project',
          messages: nextMessages,
          currentSynopsis: proposedDirection || undefined,
          baselineBlueprint: trimVariantForPrompt(variant),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        const message =
          response.status === 402
            ? 'Not enough credits to clarify this direction.'
            : data?.error || 'Could not clarify the direction.'
        throw new Error(message)
      }
      const result = data.result as ClarifySynopsisResult
      setDirectionTurns([
        ...nextMessages,
        { role: 'assistant', content: result.assistantMessage },
      ])
      setProposedDirection(result.synopsis)
      setDirectionReadyToLock(result.readyToLock)
      setLockedDirection(null)
    } catch (err) {
      setDirectionTurns(previousTurns)
      setDirectionError(
        err instanceof Error ? err.message : 'Could not clarify the direction.'
      )
    } finally {
      setIsClarifyingDirection(false)
    }
  }, [
    variant,
    userIntent,
    combinedIntent,
    isClarifyingDirection,
    directionTurns,
    contentIntentProp,
    audienceDef.description,
    proposedDirection,
  ])

  const handleConfirmDirection = useCallback(() => {
    const synopsis = proposedDirection?.trim() || userIntent.trim()
    if (!synopsis) return
    const next: SeriesSynopsisLock = { synopsis }
    setLockedDirection(next)
    setUserIntent(synopsis)
  }, [proposedDirection, userIntent])

  const handleReviseDirection = useCallback(() => {
    if (!lockedDirection) return
    setProposedDirection(lockedDirection.synopsis)
    setUserIntent(lockedDirection.synopsis)
    setDirectionReadyToLock(true)
    setLockedDirection(null)
  }, [lockedDirection])

  const handleStartOverDirection = useCallback(() => {
    setUserIntent('')
    setDirectionTurns([])
    setProposedDirection(null)
    setLockedDirection(null)
    setDirectionReadyToLock(false)
    setDirectionError(null)
  }, [])

  const addRecToIntent = (rec: BlueprintAudienceRecommendation) => {
    const text = fixInstructionForRecommendation(rec)
    setUserIntent((prev) => appendFixInstruction(prev, text))
    setSelectedRecIds((prev) => new Set(prev).add(rec.id))
  }

  const removeRecFromIntent = (rec: BlueprintAudienceRecommendation) => {
    const text = fixInstructionForRecommendation(rec)
    setUserIntent((prev) => removeFixInstruction(prev, text))
    setSelectedRecIds((prev) => {
      const next = new Set(prev)
      next.delete(rec.id)
      return next
    })
  }

  const toggleRec = (rec: BlueprintAudienceRecommendation) => {
    if (selectedRecIds.has(rec.id)) removeRecFromIntent(rec)
    else addRecToIntent(rec)
  }

  const toggleTemplate = (section: string, id: string) => {
    const key = `${section}:${id}`
    setSelectedTemplateKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleGenerate = async () => {
    if (!variant) return
    const recs = resonanceRecommendations?.filter((r) => selectedRecIds.has(r.id)) ?? []
    if (!combinedIntent.trim() && recs.length === 0) {
      toast.error('Describe what should change or select recommendations')
      return
    }
    // The button is disabled in this state; this guards programmatic paths.
    if (submitBlocked) {
      toast.error(blockers[0]?.message || 'Adjust your request before generating')
      return
    }

    if (!projectId) {
      toast.error('Open this project from the studio to run a full-balance revision')
      return
    }

    setIsGenerating(true)
    setJobStatusText(null)

    try {
      const audienceText = (audienceDef.description || '').trim()
      const baselineWithAudience: Record<string, unknown> = {
        ...variant,
        ...(audienceText
          ? {
              target_audience: audienceText,
              audienceDefinition: audienceDef,
            }
          : {}),
      }
      if (audienceText) {
        void onAudienceDefinitionChange?.(audienceDef)
      }

      const { variant: payloadVariant } = stripHeavyFieldsFromVariant(baselineWithAudience)
      const contentIntent =
        contentIntentProp ?? resolveContentIntent(String(variant?.genre || ''))

      const response = await fetch('/api/treatment/guided-revise/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          variant: payloadVariant,
          userIntent: combinedIntent,
          selectedRecommendationIds: [...selectedRecIds],
          resonanceRecommendations: recs,
          focusScope: 'all',
          projectId,
          contentIntent,
          storyLocale,
        }),
      })
      const data = await readJsonSafe(response)
      if (!response.ok && response.status !== 202) {
        const fallback =
          response.status === 503 || response.status === 504 || response.status === 502
            ? 'Revision timed out — please try again.'
            : 'Revision failed'
        throw new Error(String(data.message || fallback))
      }
      if (data.jobId) {
        trackJob(String(data.jobId), {
          status: (data.status as 'queued') ?? 'queued',
          progress: typeof data.progress === 'number' ? data.progress : 0,
        })
        setJobStatusText(data.alreadyRunning ? 'Resuming revision…' : 'Queued…')
        if (!data.alreadyRunning) {
          toast.message('Blueprint regeneration started — you can keep working')
        }
      } else {
        throw new Error(String(data.message || 'Failed to queue revision'))
      }
    } catch (err) {
      setIsGenerating(false)
      setJobStatusText(null)
      toast.error(err instanceof Error ? err.message : 'Failed to generate revision')
    }
  }

  const rewriteStartedRef = useRef(false)
  useEffect(() => {
    if (!open) {
      rewriteStartedRef.current = false
      return
    }
    if (!rewriteToEnglish || rewriteStartedRef.current) return
    if (!userIntent.trim()) return
    rewriteStartedRef.current = true
    void handleGenerate()
    // handleGenerate closes over the just-reset intent; starting once per open.
  }, [open, rewriteToEnglish, userIntent])

  const handleApplyPreview = useCallback(() => {
    if (!previewVariant) return
    // A rejected patch (e.g. beats lost to truncation) must not report success or
    // close the dialog — the user still has the preview and can regenerate.
    if (onApply(previewVariant) === false) return
    if (diff.length > 0 && onRefineApplied) {
      onRefineApplied(diff)
    }
    toast.success('Blueprint updated with balanced revision')
    if (onRequestReanalyze) {
      toast.message('Re-analyze audience resonance to refresh your score', {
        action: {
          label: 'Re-analyze',
          onClick: onRequestReanalyze,
        },
      })
    }
    onClose()
  }, [previewVariant, onApply, onClose, onRequestReanalyze, diff, onRefineApplied])

  const handleDiscardPreview = () => {
    setPreviewVariant(null)
    setChangePlan(null)
    setDiff([])
    setPhase('intent')
  }

  if (!variant) return null

  const resolvedContentIntent =
    contentIntentProp ?? resolveContentIntent(String(variant?.genre || ''))

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden bg-slate-900 border-slate-700">
        {isGenerating && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
            <div className="bg-slate-900 border border-cyan-500/30 rounded-xl p-8 shadow-2xl flex flex-col items-center max-w-sm text-center">
              <Loader2 className="w-12 h-12 animate-spin text-cyan-400 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">
                Balancing full blueprint
              </h3>
              <p className="text-sm text-gray-400">
                {jobStatusText ??
                  'Regenerating blueprint from baseline and new direction across Core, Story, Continuity, Beats, and Tone…'}
              </p>
            </div>
          </div>
        )}

        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AssistantIcon className="w-5 h-5 text-cyan-400" />
            {assistantTitle('Blueprint')}
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-1">
            {t('assistantIntro', { assistant: ASSISTANT.full })}
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-5 pr-1">
          {phase === 'intent' && (
            <>
              {resonanceRecommendations && resonanceRecommendations.length > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowResonanceRecs(!showResonanceRecs)}
                    className="flex items-center justify-between w-full text-sm font-medium text-amber-200/90"
                  >
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      {t('resonanceRecommendations', { count: resonanceRecommendations.length })}
                    </span>
                    <ChevronDown
                      className={cn('w-4 h-4 transition-transform', showResonanceRecs && 'rotate-180')}
                    />
                  </button>
                  {showResonanceRecs && (
                    <div className="space-y-1.5 max-h-[240px] overflow-y-auto">
                      {resonanceRecommendations.map((rec) => {
                        const selected = selectedRecIds.has(rec.id)
                        const heading = rec.intentLabel || rec.title || rec.category
                        const fixText = fixInstructionForRecommendation(rec)
                        const gapText = rec.reason?.trim()
                        return (
                          <div
                            key={rec.id}
                            className={cn(
                              'flex items-start gap-2 p-2 rounded-lg border text-left text-xs',
                              selected
                                ? 'border-cyan-500/40 bg-cyan-500/10'
                                : 'border-slate-700/50 bg-slate-800/40'
                            )}
                          >
                            <button
                              type="button"
                              onClick={() => toggleRec(rec)}
                              className="shrink-0 mt-0.5"
                              aria-pressed={selected}
                            >
                              {selected ? (
                                <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-gray-500" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0 space-y-1">
                              {heading && (
                                <div className="font-medium text-gray-200">
                                  {heading}
                                  <span className="text-red-400/80 ml-1 font-mono font-normal">
                                    {t('minusPoints', { points: rec.pointsDeducted })}
                                  </span>
                                </div>
                              )}
                              {fixText && (
                                <p className="text-gray-300 leading-relaxed">{fixText}</p>
                              )}
                              {gapText && gapText !== fixText && (
                                <p className="text-[10px] text-gray-500 leading-relaxed">
                                  {t('resonanceGap')}: {gapText}
                                </p>
                              )}
                            </div>
                            {selected ? (
                              <button
                                type="button"
                                onClick={() => removeRecFromIntent(rec)}
                                className="flex items-center gap-1 text-cyan-400 text-[10px] font-medium flex-shrink-0 mt-0.5"
                              >
                                <Check className="w-3 h-3" />
                                {t('addedToInstructions')}
                              </button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-[10px] text-cyan-400 hover:text-cyan-300 hover:bg-cyan-900/30 flex-shrink-0"
                                disabled={
                                  !fixText ||
                                  appendFixInstruction(userIntent, fixText) === userIntent
                                }
                                onClick={() => addRecToIntent(rec)}
                              >
                                {t('addToInstructions')}
                              </Button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Direction Clarification & Confirmation */}
              <div className="space-y-3">
                <div className="flex items-baseline justify-between gap-2">
                  <label className="text-sm font-medium text-gray-200">
                    {t('whatShouldChange')} <span className="text-cyan-400">*</span>
                  </label>
                  {userIntent.length > 0 && (
                    <span
                      className={cn(
                        'text-[10px] tabular-nums',
                        userIntent.trim().length > MAX_INTENT_CHARS
                          ? 'text-amber-300'
                          : 'text-gray-500'
                      )}
                    >
                      {userIntent.trim().length} / {MAX_INTENT_CHARS}
                    </span>
                  )}
                </div>

                {directionTurns.length > 0 && (
                  <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {directionTurns.map((turn, index) => (
                      <div
                        key={`${turn.role}-${index}`}
                        className={cn(
                          'rounded-lg px-3 py-2 text-sm leading-relaxed',
                          turn.role === 'user'
                            ? 'bg-slate-800 text-gray-200'
                            : 'border border-cyan-500/20 bg-cyan-500/5 text-gray-200'
                        )}
                      >
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                          {turn.role === 'user' ? 'You' : 'Clarify'}
                        </p>
                        {turn.content}
                      </div>
                    ))}
                  </div>
                )}

                {proposedDirection && !lockedDirection && (
                  <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
                    <p className="text-xs font-medium text-emerald-200">
                      {t('proposedDirection')}
                    </p>
                    <p className="text-sm leading-relaxed text-gray-200">
                      {proposedDirection}
                    </p>
                    {directionReadyToLock && (
                      <p className="text-[11px] text-emerald-300/90">
                        {t('directionReadyToConfirm')}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleConfirmDirection}
                      disabled={isClarifyingDirection}
                      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('confirmDirection')}
                    </button>
                  </div>
                )}

                {lockedDirection && (
                  <div className="space-y-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-3">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-100">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      {t('directionConfirmed')}
                    </div>
                    <p className="text-sm leading-relaxed text-gray-100">
                      {lockedDirection.synopsis}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleReviseDirection}
                        className="rounded-md border border-slate-600 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-slate-800"
                      >
                        {t('reviseDirection')}
                      </button>
                      <button
                        type="button"
                        onClick={handleStartOverDirection}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-600 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-slate-800"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('startOver')}
                      </button>
                    </div>
                  </div>
                )}

                <DictationTextarea
                  value={userIntent}
                  onChange={setUserIntent}
                  placeholder={t('whatShouldChangePlaceholder')}
                  rows={3}
                  disabled={isGenerating}
                  className={cn(
                    'min-h-[88px] bg-slate-800/50 border-slate-700 text-sm',
                    lockedDirection && 'hidden'
                  )}
                />

                {!lockedDirection && (
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleClarifyDirection()}
                      disabled={isClarifyingDirection || isGenerating || !userIntent.trim()}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                        isClarifyingDirection || isGenerating || !userIntent.trim()
                          ? 'cursor-not-allowed border-slate-700/60 bg-slate-800/40 text-slate-500'
                          : 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                      )}
                    >
                      {isClarifyingDirection ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      {isClarifyingDirection ? t('clarifying') : t('clarifyAndConfirm')}
                    </button>
                    {userIntent.trim() && !proposedDirection && (
                      <button
                        type="button"
                        onClick={handleConfirmDirection}
                        disabled={isClarifyingDirection || isGenerating}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {t('confirmDirection')}
                      </button>
                    )}
                    {(proposedDirection || directionTurns.length > 0) && (
                      <button
                        type="button"
                        onClick={handleStartOverDirection}
                        disabled={isClarifyingDirection || isGenerating}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t('startOver')}
                      </button>
                    )}
                  </div>
                )}

                {directionError && (
                  <p className="text-[11px] text-red-300">{directionError}</p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs text-gray-500">{t('guidedRefinements')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {templateSections.flatMap(({ section, templates }) =>
                    templates.map((tpl) => {
                      const key = `${section}:${tpl.id}`
                      const on = selectedTemplateKeys.has(key)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleTemplate(section, tpl.id)}
                          className={cn(
                            'px-2 py-1 text-[10px] rounded-md border transition-colors flex items-center gap-1',
                            on
                              ? 'border-cyan-500/50 bg-cyan-500/15 text-cyan-200'
                              : 'border-slate-700 text-gray-400 hover:border-slate-500'
                          )}
                        >
                          <span>{tpl.icon}</span>
                          {tpl.label}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Target Audience Clarification & Confirmation */}
              <div className="space-y-2 rounded-xl border border-slate-700/60 bg-slate-800/25 p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-200">
                    <Users className="w-4 h-4 text-cyan-400" />
                    {t('targetAudience')}{' '}
                    <span className="text-gray-500 text-xs font-normal">
                      {t('targetAudienceHint')}
                    </span>
                  </label>
                  {audienceConfirmed && audienceDef.description?.trim() ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
                      <CheckCircle2 className="h-3 w-3" />
                      {t('targetAudienceConfirmed')}
                    </span>
                  ) : audienceDef.description?.trim() ? (
                    <button
                      type="button"
                      onClick={handleConfirmAudience}
                      className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/20"
                    >
                      <CheckCircle2 className="h-3 w-3" />
                      {t('confirmTargetAudience')}
                    </button>
                  ) : null}
                </div>
                <AudienceDescriptionField
                  value={audienceDef}
                  onChange={handleAudienceChange}
                  context={{
                    title: String(variant.title || ''),
                    logline: String(variant.logline || ''),
                    genre: String(variant.genre || ''),
                    format: defaultFormatForIntent(resolvedContentIntent) || undefined,
                    contentIntent: resolvedContentIntent,
                  }}
                  projectId={projectId}
                  rows={3}
                />
              </div>
            </>
          )}

          {phase === 'preview' && changePlan && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3 space-y-2">
                <h3 className="text-sm font-semibold text-emerald-200 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  {t('revisionPlan')}
                </h3>
                <p className="text-xs text-gray-300">{changePlan.primaryGoal}</p>
                {changePlan.coherenceActions.length > 0 && (
                  <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                    {changePlan.coherenceActions.map((a, i) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
              <DiffPanel diffs={diff} contentI18n={contentI18n} />
            </div>
          )}
        </div>

        {phase === 'intent' && (blockers.length > 0 || warnings.length > 0) && (
          <div className="flex-shrink-0 space-y-2 pt-3">
            {blockers.map((issue) => (
              <div
                key={issue.code}
                className="rounded-lg border border-red-500/40 bg-red-500/10 p-2.5 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-200/90">{issue.message}</p>
              </div>
            ))}
            {warnings.map((issue) => (
              <div
                key={issue.code}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-200/90">{issue.message}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex-shrink-0 flex items-center justify-between gap-2 pt-3 border-t border-slate-700">
          {fullBalanceJobBlocksGenerate && (
            <p className="text-[11px] text-amber-300/90 flex-1 min-w-0">
              {jobStatusText || 'A full-balance revision is already running.'}{' '}
              <button
                type="button"
                onClick={() => void cancelBackgroundJob()}
                className="underline hover:text-amber-200"
              >
                {t('cancelIt')}
              </button>
            </p>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            {tc('actions.cancel')}
          </Button>
          {phase === 'intent' ? (
            <Button
              size="sm"
              disabled={isGenerating || fullBalanceJobBlocksGenerate || submitBlocked}
              onClick={handleGenerate}
              className="bg-gradient-to-r from-cyan-600 to-blue-600"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {t('generateBalanced')}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDiscardPreview}>
                <RefreshCw className="w-4 h-4 mr-1" />
                {t('reviseIntent')}
              </Button>
              <Button
                size="sm"
                onClick={handleApplyPreview}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('applyRevision')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default BlueprintRefineDialog
