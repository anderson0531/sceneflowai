'use client'

import React, { useMemo, useState } from 'react'
import { Loader2, Play, Square, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBlueprintTtsContext } from '@/contexts/BlueprintTtsContext'
import {
  buildBlueprintNarrationText,
  type BlueprintNarrationMode,
} from '@/lib/blueprint/buildBlueprintNarrationText'

type BlueprintNarrationSectionProps = {
  variant: Record<string, unknown> | null | undefined
  playId?: string
  compact?: boolean
}

function narrationProgressLabel(
  progress: { current: number; total: number; phase: 'generating' | 'playing' } | null
): string | null {
  if (!progress) return null
  const action = progress.phase === 'generating' ? 'Generating' : 'Playing'
  return progress.total > 1
    ? `${action} narration (${progress.current}/${progress.total})…`
    : `${action} narration…`
}

export function BlueprintNarrationSection({
  variant,
  playId = 'blueprint-narration',
  compact = false,
}: BlueprintNarrationSectionProps) {
  const tts = useBlueprintTtsContext()
  const [mode, setMode] = useState<BlueprintNarrationMode>('synopsis')

  const narrationText = useMemo(
    () => buildBlueprintNarrationText(variant, mode),
    [variant, mode]
  )

  const isActive = tts.loadingId === playId
  const progressLabel = narrationProgressLabel(tts.generationProgress)
  const progressPct =
    tts.generationProgress && tts.generationProgress.total > 0
      ? Math.round(
          (tts.generationProgress.current / tts.generationProgress.total) * 100
        )
      : 0

  const handlePlay = () => {
    if (!narrationText.trim()) return
    void tts.playText(narrationText, playId)
  }

  if (!tts.enabled || tts.voices.length === 0) {
    return (
      <section className="rounded-lg border border-slate-700/60 bg-slate-800/40 p-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Volume2 className="h-3.5 w-3.5 shrink-0" />
          Voice narration unavailable — configure Google TTS to preview this blueprint.
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-lg border border-purple-500/25 bg-purple-500/10 p-3 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-xs font-semibold text-purple-100 flex items-center gap-1.5">
            <Volume2 className="h-3.5 w-3.5" />
            Voice Narration
          </h4>
          {!compact && (
            <p className="text-[11px] text-purple-200/70 mt-0.5">
              Listen to this blueprint with your selected narrator voice.
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isActive ? (
            <Button
              aria-label="Stop narration"
              title="Stop"
              onClick={tts.stopAny}
              className="h-8 w-8 border border-purple-500/40 text-purple-100 hover:bg-purple-500/20"
              variant="outline"
              size="icon"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              aria-label="Play blueprint narration"
              title="Play narration"
              onClick={handlePlay}
              disabled={!narrationText.trim()}
              className="h-8 w-8 border border-purple-500/40 text-purple-100 hover:bg-purple-500/20"
              variant="outline"
              size="icon"
            >
              {tts.generationProgress?.phase === 'generating' && isActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <div className="text-[11px] text-purple-100/80 truncate" title={tts.selectedVoiceName}>
          Voice: {tts.selectedVoiceName}
        </div>
        <Select value={mode} onValueChange={(value) => setMode(value as BlueprintNarrationMode)}>
          <SelectTrigger className="h-8 bg-slate-900/60 border-purple-500/20 text-xs">
            <SelectValue placeholder="Narration mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="synopsis">Logline + Synopsis</SelectItem>
            <SelectItem value="full">Full Treatment</SelectItem>
            <SelectItem value="beats">Beat-by-Beat</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isActive && progressLabel ? (
        <div className="space-y-1.5" aria-live="polite">
          <div className="flex items-center justify-between gap-2 text-[11px] text-purple-100/90">
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
