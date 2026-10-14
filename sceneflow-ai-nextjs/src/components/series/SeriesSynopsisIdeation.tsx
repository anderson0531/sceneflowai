'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, RotateCcw, Sparkles, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { AudienceDescriptionField } from '@/components/audience/AudienceDescriptionField'
import { ArtStyleGrid } from '@/components/image-gen/ArtStyleGrid'
import {
  getSeriesProductionProfile,
  seriesProductionFormatsByCategory,
} from '@/config/series/productionFormats'
import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type {
  ClarifySynopsisResult,
  ClarifySynopsisSurface,
  SeriesSynopsisLock,
  SynopsisMessage,
} from '@/lib/series/clarifySynopsis'
import { DEFAULT_ART_STYLE } from '@/lib/treatment/blueprintFoundation'

interface SeriesSynopsisIdeationProps {
  format: string
  onFormatChange: (format: string) => void
  audience: AudienceDefinition
  onAudienceChange: (audience: AudienceDefinition) => void
  artStyle?: string
  onArtStyleChange: (artStyle: string) => void
  episodeCount: number
  /** Quiet “Starts as 5 episodes.” line under the format chips. */
  showEpisodeHint?: boolean
  /** Series bible vs a single blueprint. Defaults to series. */
  surface?: ClarifySynopsisSurface
  /** Project length hint sent with clarify. */
  scope?: string
  audienceHint?: string
  initialDraft?: string
  initialLock?: SeriesSynopsisLock | null
  onLockedChange: (locked: SeriesSynopsisLock | null) => void
  seriesId?: string
  /** Credit attribution for the audience refine call. */
  projectId?: string
}

const FALLBACK_PLACEHOLDER = 'e.g., Describe the series you want to make.'

export function SeriesSynopsisIdeation({
  format,
  onFormatChange,
  audience,
  onAudienceChange,
  artStyle = DEFAULT_ART_STYLE,
  onArtStyleChange,
  episodeCount,
  showEpisodeHint = false,
  surface = 'series',
  scope,
  audienceHint = '(optional, shared across the series)',
  initialDraft = '',
  initialLock = null,
  onLockedChange,
  seriesId,
  projectId,
}: SeriesSynopsisIdeationProps) {
  const [draft, setDraft] = useState(initialLock ? '' : initialDraft)
  const [turns, setTurns] = useState<SynopsisMessage[]>([])
  const [proposed, setProposed] = useState<string | null>(initialLock?.synopsis ?? null)
  const [locked, setLocked] = useState<SeriesSynopsisLock | null>(initialLock)
  const [inferred, setInferred] = useState<{ genre?: string; tone?: string }>({
    genre: initialLock?.genre,
    tone: initialLock?.tone,
  })
  const [readyToLock, setReadyToLock] = useState(Boolean(initialLock))
  const [isClarifying, setIsClarifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contextStale, setContextStale] = useState(false)
  const [typesOpen, setTypesOpen] = useState(false)

  const audienceText = (audience.description || '').trim()
  const contextSignature = `${format}::${audienceText}::${artStyle}`
  const signedRef = useRef<string | null>(initialLock ? contextSignature : null)
  const contextSignatureRef = useRef(contextSignature)
  contextSignatureRef.current = contextSignature
  const onLockedChangeRef = useRef(onLockedChange)
  onLockedChangeRef.current = onLockedChange

  useEffect(() => {
    if (!signedRef.current || signedRef.current === contextSignature) return
    signedRef.current = contextSignature
    setLocked(null)
    setContextStale(true)
    onLockedChangeRef.current(null)
  }, [contextSignature])

  const clearLock = useCallback(() => {
    setLocked(null)
    onLockedChangeRef.current(null)
  }, [])

  const handleClarify = useCallback(async () => {
    const text = draft.trim()
    if (!text || isClarifying) return

    const previousTurns = turns
    const nextMessages: SynopsisMessage[] = [...turns, { role: 'user', content: text }]
    const requestSignature = contextSignatureRef.current
    setTurns(nextMessages)
    setDraft('')
    setError(null)
    setIsClarifying(true)

    try {
      const response = await fetch('/api/series/clarify-synopsis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionFormat: format,
          episodeCount,
          targetAudience: audienceText || undefined,
          artStyle,
          surface,
          scope: surface === 'project' ? scope : undefined,
          messages: nextMessages,
          currentSynopsis: proposed || undefined,
          seriesId,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        const message =
          response.status === 402
            ? 'Not enough credits to clarify this synopsis.'
            : data?.error || 'Could not clarify the synopsis.'
        throw new Error(message)
      }
      const result = data.result as ClarifySynopsisResult
      setTurns([
        ...nextMessages,
        { role: 'assistant', content: result.assistantMessage },
      ])
      setProposed(result.synopsis)
      setInferred({ genre: result.genre, tone: result.tone })
      setReadyToLock(result.readyToLock)
      signedRef.current = requestSignature
      setContextStale(contextSignatureRef.current !== requestSignature)
      clearLock()
    } catch (err) {
      setTurns(previousTurns)
      setDraft(text)
      setError(err instanceof Error ? err.message : 'Could not clarify the synopsis.')
    } finally {
      setIsClarifying(false)
    }
  }, [
    artStyle,
    audienceText,
    clearLock,
    draft,
    episodeCount,
    format,
    isClarifying,
    proposed,
    scope,
    seriesId,
    surface,
    turns,
  ])

  const handleConfirm = useCallback(() => {
    const synopsis = proposed?.trim()
    if (!synopsis) return
    const next: SeriesSynopsisLock = {
      synopsis,
      genre: inferred.genre,
      tone: inferred.tone,
    }
    setLocked(next)
    setContextStale(false)
    onLockedChangeRef.current(next)
  }, [inferred.genre, inferred.tone, proposed])

  const handleRevise = useCallback(() => {
    if (!locked) return
    setProposed(locked.synopsis)
    setReadyToLock(true)
    clearLock()
  }, [clearLock, locked])

  const handleStartOver = useCallback(() => {
    setDraft('')
    setTurns([])
    setProposed(null)
    setInferred({})
    setReadyToLock(false)
    setError(null)
    setContextStale(false)
    signedRef.current = null
    clearLock()
  }, [clearLock])

  const showThread = turns.length > 0
  const selectedType = getSeriesProductionProfile(format)
  const selectedLabel = selectedType?.label ?? 'Narrative'
  const composerPlaceholder = proposed
    ? 'Add a clarification…'
    : selectedType?.placeholder || FALLBACK_PLACEHOLDER
  const typeGroups = seriesProductionFormatsByCategory()

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label className="text-sm font-medium text-gray-300">
            Production Type: <span className="text-white">{selectedLabel}</span>
          </label>
          <button
            type="button"
            onClick={() => setTypesOpen((open) => !open)}
            aria-expanded={typesOpen}
            className="shrink-0 rounded-md border border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-300 hover:bg-gray-800"
          >
            {typesOpen ? 'Hide' : 'Show'}
          </button>
        </div>
        {typesOpen ? (
          <div className="space-y-3">
            {typeGroups.map((group) => (
              <div key={group.id}>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  {group.label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.formats.map((item) => {
                    const selected = format === item.value
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => onFormatChange(item.value)}
                        disabled={isClarifying}
                        className={cn(
                          'text-left rounded-lg border px-3 py-2 transition-colors',
                          selected
                            ? 'border-cyan-500/50 bg-cyan-500/10'
                            : 'border-gray-700 bg-gray-800/50 hover:border-gray-600',
                          isClarifying && 'cursor-not-allowed opacity-60'
                        )}
                      >
                        <p className="text-sm font-medium text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5 max-w-[14rem]">{item.hint}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {showEpisodeHint ? (
          <p className="text-xs text-gray-500 mt-2">Starts as 5 episodes.</p>
        ) : null}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Target Audience{' '}
          <span className="text-gray-500 text-xs font-normal">{audienceHint}</span>
        </label>
        <AudienceDescriptionField
          value={audience}
          onChange={onAudienceChange}
          context={{
            title: proposed || draft || undefined,
            format,
          }}
          projectId={projectId}
          rows={3}
        />
      </div>

      <ArtStyleGrid artStyle={artStyle || DEFAULT_ART_STYLE} onArtStyleChange={onArtStyleChange} />

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Synopsis <span className="text-cyan-400">*</span>
        </label>

        {showThread ? (
          <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {turns.map((turn, index) => (
              <div
                key={`${turn.role}-${index}`}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm leading-relaxed',
                  turn.role === 'user'
                    ? 'bg-gray-800 text-gray-200'
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
        ) : null}

        {proposed && !locked ? (
          <div className="space-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-3">
            <p className="text-xs font-medium text-emerald-200">Proposed synopsis</p>
            <p className="text-sm leading-relaxed text-gray-200">{proposed}</p>
            {readyToLock && !contextStale ? (
              <p className="text-[11px] text-emerald-300/90">
                This synopsis is specific enough to confirm.
              </p>
            ) : null}
            {contextStale ? (
              <p className="text-[11px] text-amber-200">
                Production type, audience, or art style changed. Clarify again so the synopsis
                matches, or confirm this version.
              </p>
            ) : null}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isClarifying}
              className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-100 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Confirm synopsis
            </button>
          </div>
        ) : null}

        {locked ? (
          <div className="space-y-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 px-3 py-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-100">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              Synopsis confirmed
            </div>
            <p className="text-sm leading-relaxed text-gray-100">{locked.synopsis}</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRevise}
                className="rounded-md border border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-gray-800"
              >
                Revise
              </button>
              <button
                type="button"
                onClick={handleStartOver}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-gray-800"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Start over
              </button>
            </div>
          </div>
        ) : (
          <>
            <DictationTextarea
              value={draft}
              onChange={setDraft}
              placeholder={composerPlaceholder}
              rows={proposed ? 3 : 4}
              disabled={isClarifying}
              className="bg-gray-800 border-gray-700 text-white min-h-24 focus:border-cyan-500/50 focus:ring-cyan-500/20"
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleClarify}
                disabled={isClarifying || !draft.trim()}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50',
                  isClarifying || !draft.trim()
                    ? 'cursor-not-allowed border-gray-700 bg-gray-800/40 text-gray-500'
                    : 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
                )}
              >
                {isClarifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                {isClarifying ? 'Clarifying…' : 'Clarify and Confirm'}
              </button>
              {proposed ? (
                <button
                  type="button"
                  onClick={handleStartOver}
                  disabled={isClarifying}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Start over
                </button>
              ) : null}
            </div>
          </>
        )}

        {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
      </div>
    </div>
  )
}
