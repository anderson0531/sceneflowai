'use client'

/**
 * The scene's score, cue by cue.
 *
 * A scene no longer carries one looped track: each cue owns a stretch of beats,
 * the emotion it is placed to trigger, and its own generated audio. Nothing here
 * spends credits on its own — every cue is planned first and generated only when
 * asked for, with the cost shown before the click.
 */

import { Download, Loader, Music, Pause, Play, RefreshCw, Sparkles } from 'lucide-react'
import { AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { formatMusicCueRange, isMusicCueScored } from '@/lib/script/sceneMusicCues'
import type { SceneMusicCue } from '@/lib/script/segmentTypes'

export interface SceneMusicCuePanelProps {
  cues: SceneMusicCue[]
  sceneNumber: number
  playingAudio?: string | null
  onPlayAudio?: (audioUrl: string, label: string, sceneId?: string) => void
  onGenerateCue?: (cueId: string) => void | Promise<void>
  onGenerateAllCues?: () => void | Promise<void>
  onDownloadCue?: (e: React.MouseEvent, cue: SceneMusicCue) => void
  /** Cue currently being generated, or `all` while the batch action runs. */
  generatingCueId?: string | null
  isGeneratingAll?: boolean
}

const MUSIC_CREDITS = AUDIO_CREDITS.MUSIC_TRACK

export function SceneMusicCuePanel({
  cues,
  sceneNumber,
  playingAudio,
  onPlayAudio,
  onGenerateCue,
  onGenerateAllCues,
  onDownloadCue,
  generatingCueId,
  isGeneratingAll,
}: SceneMusicCuePanelProps) {
  if (cues.length === 0) return null

  const unscored = cues.filter((cue) => !isMusicCueScored(cue))
  const scoredCount = cues.length - unscored.length
  const busy = isGeneratingAll || !!generatingCueId

  return (
    <div
      className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
      aria-label={`Music cues for scene ${sceneNumber}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-800 dark:text-purple-200">
            <Music className="w-4 h-4" />
            Score
            <span className="text-xs font-normal text-gray-600 dark:text-gray-400">
              {scoredCount} of {cues.length} {cues.length === 1 ? 'cue' : 'cues'} generated
            </span>
          </div>
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
            Each cue scores the beats it covers. Beats outside a cue play unscored, and the
            per-beat Music switch overrides any cue.
          </p>
        </div>
        {unscored.length > 0 && onGenerateAllCues && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              void onGenerateAllCues()
            }}
            disabled={busy}
            className="text-xs px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            title={`Generate the ${unscored.length} cue${unscored.length === 1 ? '' : 's'} that have no audio yet`}
          >
            {isGeneratingAll ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3" />
            )}
            Generate all cues
            <span className="opacity-80">
              ({unscored.length * MUSIC_CREDITS} credits)
            </span>
          </button>
        )}
      </div>

      <div className="space-y-2">
        {cues.map((cue) => {
          const scored = isMusicCueScored(cue)
          const isGenerating = generatingCueId === cue.cueId
          const isPlaying = !!cue.url && playingAudio === cue.url

          return (
            <div
              key={cue.cueId}
              className="p-2.5 rounded-md bg-white/70 dark:bg-gray-900/40 border border-purple-200/70 dark:border-purple-800/60"
            >
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-200/70 dark:bg-purple-800/60 text-purple-900 dark:text-purple-100 font-medium tabular-nums">
                  {formatMusicCueRange(cue)}
                </span>
                {cue.intent && (
                  <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                    {cue.intent}
                  </span>
                )}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    scored
                      ? 'bg-green-500/20 text-green-700 dark:text-green-400'
                      : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {scored ? 'Audio ready' : 'Not scored yet'}
                </span>

                <div className="ml-auto flex items-center gap-1 shrink-0">
                  {scored && cue.url && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPlayAudio?.(cue.url as string, `music-${cue.cueId}`)
                        }}
                        className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                        title={`Play ${formatMusicCueRange(cue)}`}
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      {onDownloadCue && (
                        <button
                          type="button"
                          onClick={(e) => onDownloadCue(e, cue)}
                          className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded"
                          title="Download cue"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void onGenerateCue?.(cue.cueId)
                        }}
                        disabled={busy}
                        className="p-1 hover:bg-purple-200 dark:hover:bg-purple-800 rounded disabled:opacity-50"
                        title={`Regenerate cue (${MUSIC_CREDITS} credits)`}
                      >
                        {isGenerating ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                  {!scored && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        void onGenerateCue?.(cue.cueId)
                      }}
                      disabled={busy}
                      className="text-xs px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                      title={`Generate this cue (${MUSIC_CREDITS} credits)`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader className="w-3 h-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>Generate ({MUSIC_CREDITS})</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-gray-700 dark:text-gray-300 italic leading-relaxed">
                {cue.description}
              </p>

              {scored && typeof cue.fileDuration === 'number' && cue.fileDuration > 0 && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Clip length: ~{Math.round(cue.fileDuration)}s
                  {typeof cue.duration === 'number' &&
                    cue.duration > cue.fileDuration &&
                    ' — loops to fill the cue'}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
