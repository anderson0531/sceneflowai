'use client'

import React, { useMemo, useState } from 'react'
import { Loader2, Volume2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBlueprintTtsContext } from '@/contexts/BlueprintTtsContext'
import type { BlueprintTtsGenerationProgress } from '@/hooks/useBlueprintTts'
import {
  buildBlueprintNarrationText,
  type BlueprintNarrationMode,
} from '@/lib/blueprint/buildBlueprintNarrationText'
import {
  buildNarrativeReasoningNarrationText,
  type NarrativeReasoningNarrationInput,
} from '@/lib/blueprint/buildNarrativeReasoningNarrationText'
import { BlueprintListenButton } from '@/components/blueprint/BlueprintListenButton'
import { useTranslations } from 'next-intl'

type BlueprintNarrationSectionProps = {
  variant?: Record<string, unknown> | null | undefined
  reasoning?: NarrativeReasoningNarrationInput | null
  playId?: string
  compact?: boolean
}

function narrationProgressLabel(
  progress: BlueprintTtsGenerationProgress | null
): string | null {
  if (!progress) return null
  if (progress.phase === 'translating') return 'Translating narration…'
  const action = progress.phase === 'generating' ? 'Generating' : 'Playing'
  return progress.total > 1
    ? `${action} narration (${progress.current}/${progress.total})…`
    : `${action} narration…`
}

export function BlueprintNarrationSection({
  variant,
  reasoning,
  playId = 'blueprint-narration',
  compact = false,
}: BlueprintNarrationSectionProps) {
  const t = useTranslations('blueprint.audio')
  const tts = useBlueprintTtsContext()
  const [mode, setMode] = useState<BlueprintNarrationMode>('synopsis')
  const isReasoningMode = reasoning !== undefined

  const narrationText = useMemo(() => {
    if (isReasoningMode) {
      return buildNarrativeReasoningNarrationText(reasoning)
    }
    return buildBlueprintNarrationText(variant, mode)
  }, [isReasoningMode, reasoning, variant, mode])

  const isActive = tts.loadingId === playId
  const isLoading =
    isActive &&
    tts.generationProgress != null &&
    tts.generationProgress.phase !== 'playing'
  const progressLabel = narrationProgressLabel(tts.generationProgress)
  const progressPct =
    tts.generationProgress && tts.generationProgress.total > 0
      ? Math.round(
          (tts.generationProgress.current / tts.generationProgress.total) * 100
        )
      : 0

  if (!tts.enabled || tts.voices.length === 0) {
    return (
      <section className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Volume2 className="h-4 w-4 shrink-0" />
          {t('configureTtsDetailed')}
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-purple-500/25 bg-purple-500/10 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          {!compact && (
            <>
              <h4 className="text-sm font-semibold text-purple-100 flex items-center gap-1.5">
                <Volume2 className="h-4 w-4" />
                {t('narration')}
              </h4>
              <p className="text-sm text-purple-200/70 mt-0.5">
                {isReasoningMode
                  ? t('reasoningListenHint')
                  : t('blueprintListenHint')}
              </p>
            </>
          )}
        </div>
        <BlueprintListenButton
          variant="purple"
          isPlaying={isActive && !isLoading}
          isLoading={isLoading}
          disabled={!narrationText.trim()}
          onPlay={() => void tts.playText(narrationText, playId)}
          onStop={tts.stopAny}
        />
      </div>

      {!isReasoningMode ? (
        <Select value={mode} onValueChange={(value) => setMode(value as BlueprintNarrationMode)}>
          <SelectTrigger className="h-8 bg-slate-900/60 border-purple-500/20 text-sm">
            <SelectValue placeholder={t('narrationMode')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="synopsis">{t('modeSynopsis')}</SelectItem>
            <SelectItem value="full">{t('modeFull')}</SelectItem>
            <SelectItem value="beats">{t('modeBeats')}</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {isActive && progressLabel ? (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-sm text-purple-100/90">
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin shrink-0" />
              {progressLabel}
            </span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-900/80 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-[width] duration-300 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      ) : null}
    </section>
  )
}
