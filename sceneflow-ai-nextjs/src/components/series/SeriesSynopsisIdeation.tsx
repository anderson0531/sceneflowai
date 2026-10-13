'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, RotateCcw, Sparkles, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { AudienceDescriptionField } from '@/components/audience/AudienceDescriptionField'
import { SERIES_PRODUCTION_FORMATS } from '@/config/series/productionFormats'
import type { AudienceDefinition } from '@/lib/types/audienceResonance'
import type {
  ClarifySynopsisResult,
  SeriesSynopsisLock,
  SynopsisMessage,
} from '@/lib/series/clarifySynopsis'

interface SeriesSynopsisIdeationProps {
  format: string
  onFormatChange: (format: string) => void
  audience: AudienceDefinition
  onAudienceChange: (audience: AudienceDefinition) => void
  episodeCount: number
  /** Quiet “Starts as 5 episodes.” line under the format chips. */
  showEpisodeHint?: boolean
  initialDraft?: string
  initialLock?: SeriesSynopsisLock | null
  onLockedChange: (locked: SeriesSynopsisLock | null) => void
  seriesId?: string
}

const DRAFT_PLACEHOLDER =
  'e.g., A comedy about a group of friends who start a haunted house business but discover the house is actually haunted...'

export function SeriesSynopsisIdeation({
  format,
  onFormatChange,
  audience,
  onAudienceChange,
  episodeCount,
  showEpisodeHint = false,
  initialDraft = '',
  initialLock = null,
  onLockedChange,
  seriesId,
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

  const audienceText = (audience.description || '').trim()
  const contextSignature = `${format}::${audienceText}`
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
    audienceText,
    clearLock,
    draft,
    episodeCount,
    format,
    isClarifying,
    proposed,
    seriesId,
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
  const composerPlaceholder = proposed ? 'Add a clarification…' : DRAFT_PLACEHOLDER

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Production Format</label>
        <div className="flex flex-wrap gap-2">
          {SERIES_PRODUCTION_FORMATS.map((item) => {
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
        {showEpisodeHint ? (
          <p className="text-xs text-gray-500 mt-2">Starts as 5 episodes.</p>
        ) : null}
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
          <Users className="w-4 h-4 text-cyan-400" />
          Target Audience{' '}
          <span className="text-gray-500 text-xs font-normal">(optional, shared across the series)</span>
        </label>
        <AudienceDescriptionField
          value={audience}
          onChange={onAudienceChange}
          context={{
            title: proposed || draft || undefined,
            format,
          }}
          rows={3}
        />
      </div>

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
                Production format or audience changed. Clarify again so the synopsis matches, or
                confirm this version.
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
