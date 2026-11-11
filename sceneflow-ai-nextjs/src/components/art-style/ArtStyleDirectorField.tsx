'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Lock,
  Palette,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { DictationTextarea } from '@/components/ui/DictationTextarea'
import { artStylePresets } from '@/constants/artStylePresets'
import {
  type ArtStyleMedium,
  type ArtStyleSpec,
  type ArtStyleStoryContext,
  buildArtStyleSpecFromPreset,
  buildArtStyleSpecFromValue,
  serializeArtStyleValue,
} from '@/lib/artStyle/globalArtStyle'

const MEDIUM_LABELS: Record<ArtStyleMedium, string> = {
  'live-action': 'Live-Action Cinema',
  '3d-animation': '3D Animation',
  '2d-animation': '2D Animation',
  painterly: 'Painterly Fine Art',
  'graphic-illustration': 'Graphic Illustration',
  'mixed-media': 'Mixed Media',
}

export interface ArtStyleDirectorFieldProps {
  artStyle: string
  artStyleSpec?: ArtStyleSpec | null
  onArtStyleChange: (artStyle: string, spec?: ArtStyleSpec) => void
  /** Optional persistence callback invoked when user clicks Confirm & Save. */
  onConfirmSave?: (artStyle: string, spec: ArtStyleSpec) => Promise<void> | void
  storyContext?: ArtStyleStoryContext
  /** When set, locks editing and displays Series-wide consistency banner. */
  lockedBySeries?: {
    seriesId: string
    seriesTitle?: string
  } | null
  scopeLabel?: 'series' | 'blueprint' | 'production'
  surface?: 'slate' | 'gray'
  className?: string
}

export function ArtStyleDirectorField({
  artStyle,
  artStyleSpec,
  onArtStyleChange,
  onConfirmSave,
  storyContext,
  lockedBySeries,
  scopeLabel = 'blueprint',
  surface = 'slate',
  className,
}: ArtStyleDirectorFieldProps) {
  const resolvedSpec = useMemo(
    () => buildArtStyleSpecFromValue(artStyle, artStyleSpec ?? undefined),
    [artStyle, artStyleSpec]
  )

  const [draftSpec, setDraftSpec] = useState<ArtStyleSpec>(resolvedSpec)
  const [alternatives, setAlternatives] = useState<ArtStyleSpec[]>([])
  const [directionInput, setDirectionInput] = useState<string>(resolvedSpec.userDirection || '')
  const [isRecommending, setIsRecommending] = useState(false)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isEditingConfirmed, setIsEditingConfirmed] = useState(!resolvedSpec.confirmed)
  const [showDirectives, setShowDirectives] = useState(false)
  const [showArchetypes, setShowArchetypes] = useState(false)

  useEffect(() => {
    setDraftSpec(resolvedSpec)
    if (resolvedSpec.confirmed) {
      setIsEditingConfirmed(false)
    }
  }, [resolvedSpec])

  const hasStoryline = Boolean(
    storyContext?.storyline?.trim() || storyContext?.logline?.trim() || storyContext?.title?.trim()
  )

  const panelClass =
    surface === 'gray'
      ? 'border-gray-700 bg-gray-800/50'
      : 'border-slate-700 bg-slate-800/50'

  const subCardClass =
    surface === 'gray'
      ? 'border-gray-700/80 bg-gray-900/60'
      : 'border-slate-700/80 bg-slate-900/60'

  const applyDraftSpec = useCallback(
    (next: ArtStyleSpec) => {
      setDraftSpec(next)
      const serialized = serializeArtStyleValue(next)
      onArtStyleChange(serialized, next)
    },
    [onArtStyleChange]
  )

  const handleRecommendFromStoryline = useCallback(async () => {
    if (isRecommending || isOptimizing) return
    setIsRecommending(true)
    try {
      const res = await fetch('/api/intelligence/art-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'recommend',
          storyContext: {
            ...storyContext,
            isSeries: scopeLabel === 'series' || storyContext?.isSeries,
          },
          currentArtStyle: artStyle,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.recommended) {
        throw new Error(data?.error || 'Could not generate art style recommendation')
      }
      const nextSpec: ArtStyleSpec = {
        ...data.recommended,
        confirmed: false,
      }
      setAlternatives(Array.isArray(data.alternatives) ? data.alternatives : [])
      setIsEditingConfirmed(true)
      applyDraftSpec(nextSpec)
      toast.success(`Recommended: ${nextSpec.title}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to recommend art style')
    } finally {
      setIsRecommending(false)
    }
  }, [
    isRecommending,
    isOptimizing,
    storyContext,
    scopeLabel,
    artStyle,
    applyDraftSpec,
  ])

  const handleOptimizeDirection = useCallback(async () => {
    const trimmed = directionInput.trim()
    if (!trimmed || isOptimizing || isRecommending) return
    setIsOptimizing(true)
    try {
      const res = await fetch('/api/intelligence/art-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'optimize',
          userDirection: trimmed,
          storyContext: {
            ...storyContext,
            isSeries: scopeLabel === 'series' || storyContext?.isSeries,
          },
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.optimized) {
        throw new Error(data?.error || 'Could not optimize art style direction')
      }
      const nextSpec: ArtStyleSpec = {
        ...data.optimized,
        userDirection: trimmed,
        confirmed: false,
      }
      setIsEditingConfirmed(true)
      applyDraftSpec(nextSpec)
      toast.success(`Optimized art style: ${nextSpec.title}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to optimize art style')
    } finally {
      setIsOptimizing(false)
    }
  }, [directionInput, isOptimizing, isRecommending, storyContext, scopeLabel, applyDraftSpec])

  const handleConfirmAndSave = useCallback(async () => {
    if (isSaving) return
    const confirmedSpec: ArtStyleSpec = {
      ...draftSpec,
      userDirection: directionInput.trim() || draftSpec.userDirection,
      confirmed: true,
      confirmedAt: new Date().toISOString(),
      source:
        scopeLabel === 'series'
          ? 'series'
          : scopeLabel === 'production'
            ? 'production'
            : 'blueprint',
    }
    const serialized = serializeArtStyleValue(confirmedSpec)
    setDraftSpec(confirmedSpec)
    onArtStyleChange(serialized, confirmedSpec)

    if (onConfirmSave) {
      setIsSaving(true)
      try {
        await onConfirmSave(serialized, confirmedSpec)
        setIsEditingConfirmed(false)
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save global art style')
      } finally {
        setIsSaving(false)
      }
    } else {
      setIsEditingConfirmed(false)
      toast.success(
        scopeLabel === 'series'
          ? `Locked "${confirmedSpec.title}" across all series episodes`
          : `Locked global art style: ${confirmedSpec.title}`
      )
    }
  }, [isSaving, draftSpec, directionInput, scopeLabel, onArtStyleChange, onConfirmSave])

  const handleSelectArchetype = useCallback(
    (presetId: string) => {
      const next = buildArtStyleSpecFromPreset(presetId, {
        confirmed: false,
        source: 'preset',
      })
      setIsEditingConfirmed(true)
      applyDraftSpec(next)
      setShowArchetypes(false)
    },
    [applyDraftSpec]
  )

  const effectiveSeriesLock =
    lockedBySeries ||
    (resolvedSpec.lockedBySeriesId && scopeLabel !== 'series'
      ? {
          seriesId: resolvedSpec.lockedBySeriesId,
          seriesTitle: resolvedSpec.lockedBySeriesTitle,
        }
      : null)

  // Series-locked read-only card for Episode Blueprints & Episode Production Stage
  if (effectiveSeriesLock) {
    return (
      <div className={cn('space-y-3 rounded-lg border p-3.5', panelClass, className)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-cyan-400" />
            <h4 className="text-sm font-medium text-gray-100">Global Art Style</h4>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
              <Lock className="h-3 w-3" />
              Locked by Series
            </span>
          </div>
          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
            {MEDIUM_LABELS[resolvedSpec.medium]}
          </span>
        </div>

        <div className={cn('rounded-lg border p-3 space-y-1.5', subCardClass)}>
          <div className="text-sm font-semibold text-white">{resolvedSpec.title}</div>
          <p className="text-xs leading-relaxed text-gray-300">{resolvedSpec.stylePrompt}</p>
          {resolvedSpec.rationale ? (
            <p className="text-[11px] text-gray-400">{resolvedSpec.rationale}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-gray-400">
          <span>
            Enforced across all episodes of{' '}
            <strong className="text-gray-200">
              {effectiveSeriesLock.seriesTitle || 'this Series'}
            </strong>{' '}
            for Shared Continuity References, Stills &amp; Clips.
          </span>
          <Link
            href={`/dashboard/series/${effectiveSeriesLock.seriesId}`}
            className="inline-flex items-center gap-1 font-medium text-cyan-300 hover:text-cyan-200"
          >
            Manage in Series Studio
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3 rounded-lg border p-3.5', panelClass, className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-cyan-400" />
          <h4 className="text-sm font-medium text-gray-100">
            Global Art Style
            {scopeLabel === 'series' ? (
              <span className="ml-1.5 text-xs font-normal text-cyan-300/90">
                (Locks across all episodes)
              </span>
            ) : null}
          </h4>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
            {MEDIUM_LABELS[draftSpec.medium]}
          </span>
          {draftSpec.confirmed && !isEditingConfirmed ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              Confirmed
            </span>
          ) : (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-200">
              Unconfirmed
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {scopeLabel === 'series'
          ? 'Establishes the unified visual rule for Shared Continuity References (Cast, Locations, Props), Episode Stills, and Video Clips across every episode.'
          : 'Drives Continuity References (Characters, Locations, Props), Scene Stills, and Video Clips throughout Production.'}
      </p>

      {/* Current / Recommended Style Summary Card */}
      <div className={cn('rounded-lg border p-3 space-y-2', subCardClass)}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="text-sm font-semibold text-white">{draftSpec.title}</div>
            {draftSpec.rationale ? (
              <p className="text-xs leading-relaxed text-cyan-200/90">{draftSpec.rationale}</p>
            ) : null}
            <p className="text-xs leading-relaxed text-gray-300">{draftSpec.stylePrompt}</p>
          </div>
          {draftSpec.confirmed && !isEditingConfirmed ? (
            <button
              type="button"
              onClick={() => setIsEditingConfirmed(true)}
              className="shrink-0 rounded-md border border-gray-600 px-2.5 py-1 text-xs font-medium text-gray-200 hover:bg-gray-800"
            >
              Re-Direct
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setShowDirectives((prev) => !prev)}
          className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-gray-200"
        >
          {showDirectives ? (
            <ChevronUp className="h-3.5 w-3.5" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" />
          )}
          {showDirectives ? 'Hide' : 'Preview'} Continuity &amp; Production Rules
        </button>

        {showDirectives ? (
          <div className="grid grid-cols-1 gap-1.5 pt-1 text-[11px] text-gray-300 border-t border-gray-800">
            <div>
              <span className="font-semibold text-gray-200">Cast References: </span>
              {draftSpec.characterRefDirective}
            </div>
            <div>
              <span className="font-semibold text-gray-200">Location Plates: </span>
              {draftSpec.locationRefDirective}
            </div>
            <div>
              <span className="font-semibold text-gray-200">Key Props: </span>
              {draftSpec.propRefDirective}
            </div>
            <div>
              <span className="font-semibold text-gray-200">Video Clips: </span>
              {draftSpec.videoMotionDirective}
            </div>
            {draftSpec.negativeTerms.length > 0 ? (
              <div className="text-gray-400">
                <span className="font-semibold text-gray-300">Drift Guardrails: </span>
                Avoid {draftSpec.negativeTerms.join(', ')}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Interactive Intelligence & Dictation Controls */}
      {isEditingConfirmed || !draftSpec.confirmed ? (
        <div className="space-y-3 pt-0.5">
          {/* 1. AI Recommend from Storyline */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleRecommendFromStoryline}
              disabled={isRecommending || isOptimizing}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                isRecommending || isOptimizing
                  ? 'cursor-not-allowed border-gray-700 bg-gray-800/40 text-gray-500'
                  : 'border-cyan-500/50 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25'
              )}
            >
              {isRecommending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
              )}
              {isRecommending
                ? 'Analyzing Storyline…'
                : hasStoryline
                  ? 'Recommend from Storyline'
                  : 'AI Recommend Art Style'}
            </button>

            <button
              type="button"
              onClick={() => setShowArchetypes((prev) => !prev)}
              className="text-[11px] font-medium text-gray-400 hover:text-gray-200"
            >
              {showArchetypes ? 'Hide Quick Archetypes' : 'Quick Archetype Starters'}
            </button>
          </div>

          {!hasStoryline ? (
            <p className="text-[11px] text-gray-500">
              Tip: Enter or confirm your storyline first so AI can tailor its art style recommendation to your narrative tone.
            </p>
          ) : null}

          {/* Contrasting AI Alternatives */}
          {alternatives.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-gray-400">
                Alternative AI Directions (click to preview):
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {alternatives.map((alt, idx) => {
                  const isSelected = draftSpec.title === alt.title && draftSpec.stylePrompt === alt.stylePrompt
                  return (
                    <button
                      key={`${alt.title}-${idx}`}
                      type="button"
                      onClick={() => applyDraftSpec({ ...alt, confirmed: false })}
                      className={cn(
                        'text-left rounded-lg border p-2.5 text-xs transition-all',
                        isSelected
                          ? 'border-cyan-500/60 bg-cyan-500/10 text-cyan-100'
                          : 'border-gray-700 bg-gray-900/50 text-gray-300 hover:border-gray-600'
                      )}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-medium text-white truncate">{alt.title}</span>
                        <span className="shrink-0 text-[10px] text-cyan-300/90">
                          {MEDIUM_LABELS[alt.medium]}
                        </span>
                      </div>
                      {alt.rationale ? (
                        <p className="mt-1 text-[11px] text-gray-400 line-clamp-2">{alt.rationale}</p>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Quick Archetype Drawer */}
          {showArchetypes ? (
            <div className="rounded-lg border border-gray-700/80 bg-gray-900/70 p-2.5 space-y-2">
              <p className="text-[11px] font-medium text-gray-400">
                Seed from a classic visual archetype (you can refine &amp; optimize below):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {artStylePresets.map((preset) => {
                  const active = draftSpec.presetId === preset.id
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectArchetype(preset.id)}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors',
                        active
                          ? 'border-cyan-500/60 bg-cyan-500/15 text-cyan-100'
                          : 'border-gray-700 bg-gray-800/70 text-gray-300 hover:border-gray-600 hover:text-white'
                      )}
                    >
                      {preset.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* 2. User Direction (Type or Voice Dictate) + Optimize */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-gray-300">
              Direct Your Art Style Preference{' '}
              <span className="font-normal text-gray-500">(type or use mic to dictate)</span>
            </label>
            <DictationTextarea
              value={directionInput}
              onChange={setDirectionInput}
              rows={2}
              disabled={isOptimizing || isRecommending}
              placeholder="e.g., Warm hand-painted gouache backgrounds with crisp inked characters, twilight amber & teal palette, no photorealism…"
              className="bg-gray-900/80 border-gray-700 text-white text-xs min-h-[60px] focus:border-cyan-500/50"
            />
          </div>

          {/* 3. Optimize + Confirm & Save Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleOptimizeDirection}
              disabled={!directionInput.trim() || isOptimizing || isRecommending}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                !directionInput.trim() || isOptimizing || isRecommending
                  ? 'cursor-not-allowed border-gray-700 bg-gray-800/40 text-gray-500'
                  : 'border-purple-500/50 bg-purple-500/15 text-purple-100 hover:bg-purple-500/25'
              )}
            >
              {isOptimizing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wand2 className="h-3.5 w-3.5 text-purple-300" />
              )}
              {isOptimizing ? 'Optimizing…' : 'Optimize Direction'}
            </button>

            <button
              type="button"
              onClick={handleConfirmAndSave}
              disabled={isSaving || isRecommending || isOptimizing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-3.5 py-1.5 text-xs font-semibold text-emerald-100 hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
              )}
              {isSaving
                ? 'Saving…'
                : scopeLabel === 'series'
                  ? 'Confirm & Lock Across Series'
                  : onConfirmSave
                    ? 'Confirm & Save Global Style'
                    : 'Confirm & Lock Art Style'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
