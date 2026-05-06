'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Checkbox } from '@/components/ui/checkbox'
import { Zap, AlertCircle, Loader, Image as ImageIcon, Volume2, FileText, Languages } from 'lucide-react'
import { IMAGE_CREDITS, AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { getLanguageName, FLAG_EMOJIS } from '@/constants/languages'

export interface ExpressConfirmOptions {
  includeMusic: boolean
  includeSFX: boolean
  regenerate: boolean
  /** Locale of dialogue / narration to generate. Defaults to 'en' upstream. */
  language?: string
}

interface ExpressConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scenes: any[]
  isRunning?: boolean
  /** Locale to generate audio in (e.g., 'en', 'th'). Drives "needs audio"
   *  calculation and is forwarded to the orchestrator so dialogue/narration
   *  are synthesized in this language. */
  language?: string
  onConfirm: (options: ExpressConfirmOptions) => void
}

/**
 * Confirmation dialog for the Storyboard Express button. Shows:
 *  - Scene count and what will be done.
 *  - Estimated credit cost (image + audio + optional music/SFX).
 *  - Toggles for music, SFX, and "regenerate existing" mode.
 */
export function ExpressConfirmDialog({
  open,
  onOpenChange,
  scenes,
  isRunning = false,
  language = 'en',
  onConfirm,
}: ExpressConfirmDialogProps) {
  const [includeMusic, setIncludeMusic] = useState(false)
  const [includeSFX, setIncludeSFX] = useState(false)
  const [regenerate, setRegenerate] = useState(false)

  useEffect(() => {
    if (open) {
      setIncludeMusic(false)
      setIncludeSFX(false)
      setRegenerate(false)
    }
  }, [open])

  const stats = useMemo(() => {
    const total = scenes.length
    let scenesNeedingDirection = 0
    let scenesNeedingImage = 0
    let scenesNeedingAudio = 0
    let totalDialogue = 0
    let totalSfxCues = 0
    let scenesWithMusic = 0

    for (const scene of scenes) {
      if (
        !scene?.sceneDirection ||
        !scene.sceneDirection.camera ||
        !scene.sceneDirection.scene
      ) {
        scenesNeedingDirection += 1
      }
      if (!scene?.imageUrl) scenesNeedingImage += 1

      const dialogue = Array.isArray(scene?.dialogue) ? scene.dialogue : []
      totalDialogue += dialogue.length

      const dialogueAudio = scene?.dialogueAudio?.[language]
      const dialogueOk =
        dialogue.length === 0 ||
        (Array.isArray(dialogueAudio) &&
          dialogueAudio.length >= dialogue.length &&
          dialogueAudio.every((d: any) => d && d.audioUrl))
      const narrationOk =
        !scene?.narration ||
        !!scene?.narrationAudio?.[language]?.url ||
        (language === 'en' && !!scene?.narrationAudioUrl)
      if (!(narrationOk && dialogueOk)) scenesNeedingAudio += 1

      if (scene?.music) scenesWithMusic += 1
      if (Array.isArray(scene?.sfx)) totalSfxCues += scene.sfx.length
    }

    return {
      total,
      scenesNeedingDirection,
      scenesNeedingImage,
      scenesNeedingAudio,
      totalDialogue,
      totalSfxCues,
      scenesWithMusic,
    }
  }, [scenes, language])

  const effectiveImageScenes = regenerate
    ? stats.total
    : stats.scenesNeedingImage
  const effectiveAudioScenes = regenerate ? stats.total : stats.scenesNeedingAudio
  const effectiveDirectionScenes = regenerate
    ? stats.total
    : stats.scenesNeedingDirection

  const estimatedCredits = useMemo(() => {
    const image = effectiveImageScenes * IMAGE_CREDITS.IMAGEN_4
    // Soft estimate for audio: 80 credits per ~1k chars; assume ~250 chars/line.
    // narration counts once per scene; dialogue counts per line.
    const dialoguePerScene = stats.total > 0 ? stats.totalDialogue / stats.total : 0
    const approxCharsPerScene =
      (1 /* narration sentence */ + dialoguePerScene) * 250
    const audio =
      Math.ceil((approxCharsPerScene / 1000) * AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS) *
      effectiveAudioScenes
    const music = includeMusic ? stats.scenesWithMusic * AUDIO_CREDITS.ELEVENLABS_MUSIC : 0
    const sfx = includeSFX ? stats.totalSfxCues * AUDIO_CREDITS.ELEVENLABS_SFX : 0
    return { image, audio, music, sfx, total: image + audio + music + sfx }
  }, [
    effectiveImageScenes,
    effectiveAudioScenes,
    stats.total,
    stats.totalDialogue,
    stats.scenesWithMusic,
    stats.totalSfxCues,
    includeMusic,
    includeSFX,
  ])

  const nothingToRun =
    !regenerate &&
    effectiveDirectionScenes === 0 &&
    effectiveImageScenes === 0 &&
    effectiveAudioScenes === 0 &&
    !includeMusic &&
    !includeSFX

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-gray-900 border-gray-700 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            Run Express
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Generate Direction, Audio, and Image for every scene with up to 3 scenes
            in parallel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Language banner */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-indigo-300" />
              <span>Audio language</span>
            </div>
            <div className="mt-1 text-sm font-medium text-white flex items-center gap-2">
              <span>{FLAG_EMOJIS[language] ?? ''}</span>
              <span>{getLanguageName(language)}</span>
              {language !== 'en' && (
                <span className="ml-1 text-[10px] uppercase tracking-wider text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                  translate
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              Dialogue and narration will be generated in {getLanguageName(language)}.
              Existing audio in other languages is left untouched.
            </div>
          </div>

          {/* What will run */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
            <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Pipeline (per scene)
            </div>
            <ul className="text-xs text-gray-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">1. Direction</span>
                <span className="text-gray-500">
                  · {effectiveDirectionScenes}/{stats.total} scenes
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">2. Audio</span>
                <span className="text-gray-500">
                  · {effectiveAudioScenes}/{stats.total} scenes
                  {stats.totalDialogue > 0 ? ` · ${stats.totalDialogue} dialogue lines` : ''}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium">3. Image</span>
                <span className="text-gray-500">
                  · {effectiveImageScenes}/{stats.total} scenes
                </span>
              </li>
            </ul>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
              <Checkbox
                id="express-music"
                checked={includeMusic}
                onCheckedChange={(checked) => setIncludeMusic(!!checked)}
                disabled={isRunning || stats.scenesWithMusic === 0}
              />
              <label
                htmlFor="express-music"
                className={`flex-1 text-sm cursor-pointer ${
                  stats.scenesWithMusic === 0 ? 'text-gray-500' : 'text-gray-200'
                }`}
              >
                <div className="font-medium">Background Music</div>
                <div className="text-xs text-gray-400">
                  {stats.scenesWithMusic > 0
                    ? `${stats.scenesWithMusic} scenes have music descriptions`
                    : 'No scenes have music descriptions'}
                </div>
              </label>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
              <Checkbox
                id="express-sfx"
                checked={includeSFX}
                onCheckedChange={(checked) => setIncludeSFX(!!checked)}
                disabled={isRunning || stats.totalSfxCues === 0}
              />
              <label
                htmlFor="express-sfx"
                className={`flex-1 text-sm cursor-pointer ${
                  stats.totalSfxCues === 0 ? 'text-gray-500' : 'text-gray-200'
                }`}
              >
                <div className="font-medium">Sound Effects (~15 credits each)</div>
                <div className="text-xs text-gray-400">
                  {stats.totalSfxCues > 0
                    ? `${stats.totalSfxCues} SFX cue${stats.totalSfxCues === 1 ? '' : 's'} across all scenes`
                    : 'No SFX cues yet'}
                </div>
              </label>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
              <Checkbox
                id="express-regenerate"
                checked={regenerate}
                onCheckedChange={(checked) => setRegenerate(!!checked)}
                disabled={isRunning}
              />
              <label
                htmlFor="express-regenerate"
                className="flex-1 text-sm text-amber-200 cursor-pointer"
              >
                <div className="font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Regenerate Existing
                </div>
                <div className="text-xs text-amber-300/70">
                  Recompute every phase even if direction, audio, or image is already
                  present.
                </div>
              </label>
            </div>
          </div>

          {/* Cost summary */}
          <div className="rounded-lg border border-indigo-700/40 bg-indigo-900/20 p-3 space-y-1">
            <div className="text-sm font-medium text-indigo-200">
              Estimated cost
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <div>· Images: {estimatedCredits.image} credits ({effectiveImageScenes} × {IMAGE_CREDITS.IMAGEN_4})</div>
              <div>· Audio: ~{estimatedCredits.audio} credits</div>
              {includeMusic && stats.scenesWithMusic > 0 && (
                <div>· Music: {estimatedCredits.music} credits</div>
              )}
              {includeSFX && stats.totalSfxCues > 0 && (
                <div>· SFX: {estimatedCredits.sfx} credits</div>
              )}
              <div className="text-sm font-semibold text-indigo-200 pt-1">
                Total: ~{estimatedCredits.total} credits
              </div>
              <div className="text-[10px] text-gray-500 leading-snug">
                Estimates only. Actual usage depends on dialogue length and the number of
                phases that actually need to run.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRunning}
            className="border-gray-700 hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConfirm({ includeMusic, includeSFX, regenerate, language })}
            disabled={isRunning || nothingToRun}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Running…
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Run Express
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
