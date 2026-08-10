'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
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
import { Zap, AlertCircle, Loader, Image as ImageIcon, Volume2, FileText, Languages, Brush } from 'lucide-react'
import { IMAGE_CREDITS, AUDIO_CREDITS } from '@/lib/credits/creditCosts'
import { getLanguageName, FLAG_EMOJIS } from '@/constants/languages'
import { artStylePresets } from '@/constants/artStylePresets'
import { getArtStylePresetName } from '@/lib/treatment/blueprintFoundation'
import { countExpressFrameScope, countStoryboardFrameStats } from '@/lib/storyboard/types'
import { isTitleOrCinematicScene } from '@/lib/script/sceneClassification'

export interface ExpressConfirmOptions {
  includeMusic: boolean
  includeSFX: boolean
  regenerate: boolean
  /** Art style preset id for storyboard frames. */
  artStyle?: string
  /** Locale of dialogue / narration to generate. Defaults to 'en' upstream. */
  language?: string
  /** Storyboard frame quality — Express defaults to draft. */
  storyboardQuality?: 'draft' | 'final'
  /** Upgrade pass: regenerate draft frames at final quality only. */
  finalizeOnly?: boolean
  /** When true, Express also generates end frames per beat for FTV motion. */
  includeEndFrames?: boolean
  /** When true, only fill frames with no stored image URL. */
  missingFramesOnly?: boolean
  /** When true, translate + dub dialogue/narration only (reuse music/SFX). */
  dialogueOnly?: boolean
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
  /** When set, art style is locked from Blueprint and cannot be changed here. */
  lockedArtStyle?: string
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
  lockedArtStyle,
  onConfirm,
}: ExpressConfirmDialogProps) {
  const t = useTranslations('production.express')
  const tCommon = useTranslations('common')
  const [includeMusic, setIncludeMusic] = useState(false)
  const [missingFramesOnly, setMissingFramesOnly] = useState(false)
  const [regenerate, setRegenerate] = useState(false)
  const [artStyle, setArtStyle] = useState(lockedArtStyle || 'photorealistic')

  const hasTitleScene = useMemo(
    () => scenes.some((scene) => isTitleOrCinematicScene(scene ?? {})),
    [scenes]
  )

  useEffect(() => {
    if (open) {
      setIncludeMusic(hasTitleScene)
      setMissingFramesOnly(false)
      setRegenerate(false)
      setArtStyle(lockedArtStyle || 'photorealistic')
    }
  }, [open, lockedArtStyle, hasTitleScene])

  const stats = useMemo(() => {
    const total = scenes.length
    let scenesNeedingDirection = 0
    let scenesNeedingImage = 0
    let scenesNeedingDialogueFrames = 0
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

      const missingFrameCount = countExpressFrameScope(scene, { includeEndFrames: false })
      if (missingFrameCount > 0) scenesNeedingDialogueFrames += 1

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
      scenesNeedingDialogueFrames,
      scenesNeedingAudio,
      totalDialogue,
      totalSfxCues,
      scenesWithMusic,
    }
  }, [scenes, language])

  const effectiveEstablishingCount = regenerate
    ? stats.total
    : stats.scenesNeedingImage
  const effectiveDialogueFrameCount = useMemo(() => {
    if (regenerate) {
      return scenes.reduce(
        (sum, scene) =>
          sum +
          countExpressFrameScope(scene, { includeEndFrames: false, regenerate: true }),
        0
      )
    }
    return scenes.reduce(
      (sum, scene) => sum + countExpressFrameScope(scene, { includeEndFrames: false }),
      0
    )
  }, [regenerate, scenes])
  const effectiveAudioScenes = regenerate ? stats.total : stats.scenesNeedingAudio
  const effectiveDirectionScenes = regenerate
    ? stats.total
    : stats.scenesNeedingDirection

  const estimatedCredits = useMemo(() => {
    const imageFrameCount = effectiveDialogueFrameCount
    const image = imageFrameCount * IMAGE_CREDITS.IMAGEN_4
    // Soft estimate for audio: 80 credits per ~1k chars; assume ~250 chars/line.
    // narration counts once per scene; dialogue counts per line.
    const dialoguePerScene = stats.total > 0 ? stats.totalDialogue / stats.total : 0
    const approxCharsPerScene =
      (1 /* narration sentence */ + dialoguePerScene) * 250
    const audio =
      Math.ceil((approxCharsPerScene / 1000) * AUDIO_CREDITS.ELEVENLABS_PER_1K_CHARS) *
      effectiveAudioScenes
    const music = includeMusic ? stats.scenesWithMusic * AUDIO_CREDITS.ELEVENLABS_MUSIC : 0
    return { image, audio, music, sfx: 0, total: image + audio + music }
  }, [
    effectiveDialogueFrameCount,
    effectiveAudioScenes,
    stats.total,
    stats.totalDialogue,
    stats.scenesWithMusic,
    includeMusic,
  ])

  const nothingToRun =
    !regenerate &&
    effectiveDirectionScenes === 0 &&
    effectiveEstablishingCount === 0 &&
    effectiveDialogueFrameCount === 0 &&
    effectiveAudioScenes === 0 &&
    !includeMusic

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] bg-gray-900 border-gray-700 text-white max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-400" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Language banner */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <div className="text-xs text-gray-400 flex items-center gap-2">
              <Languages className="w-3.5 h-3.5 text-indigo-300" />
              <span>{t('audioLanguage')}</span>
            </div>
            <div className="mt-1 text-sm font-medium text-white flex items-center gap-2">
              <span>{FLAG_EMOJIS[language] ?? ''}</span>
              <span>{getLanguageName(language)}</span>
              {language !== 'en' && (
                <span className="ml-1 text-[10px] uppercase tracking-wider text-indigo-300 bg-indigo-900/40 px-1.5 py-0.5 rounded">
                  {t('translateBadge')}
                </span>
              )}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">
              {t('audioLanguageHint', { lang: getLanguageName(language) })}
            </div>
          </div>

          {/* What will run */}
          <div className="rounded-lg border border-gray-800 bg-gray-900/40 p-3 space-y-2">
            <div className="text-sm font-medium text-gray-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              {t('pipelineTitle')}
            </div>
            <ul className="text-xs text-gray-300 space-y-1.5">
              <li className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium">{t('stepDirection')}</span>
                <span className="text-gray-500">
                  · {t('pipelineSceneCount', { done: effectiveDirectionScenes, total: stats.total })}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium">{t('stepAudio')}</span>
                <span className="text-gray-500">
                  · {t('pipelineSceneCount', { done: effectiveAudioScenes, total: stats.total })}
                  {stats.totalDialogue > 0
                    ? ` · ${t('pipelineDialogueLines', { count: stats.totalDialogue })}`
                    : ''}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium">{t('stepImage')}</span>
                <span className="text-gray-500">
                  ·{' '}
                  {t('pipelineImageCount', {
                    establishing: effectiveEstablishingCount,
                    frames: effectiveDialogueFrameCount,
                  })}
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
                <div className="font-medium">{t('backgroundMusic')}</div>
                <div className="text-xs text-gray-400">
                  {stats.scenesWithMusic > 0
                    ? t('musicScenesHaveDescriptions', { count: stats.scenesWithMusic })
                    : t('musicNoDescriptions')}
                </div>
              </label>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/60">
              <Brush className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm text-gray-400">
                <div className="font-medium text-gray-300">{t('storyboardQualityDraft')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('storyboardQualityDraftHint')}
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/60">
              <Volume2 className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
              <div className="flex-1 text-sm text-gray-400">
                <div className="font-medium text-gray-300">{t('soundEffects')}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {t('soundEffectsHint')}
                </div>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-gray-800 rounded-lg">
              <Checkbox
                id="express-missing-frames"
                checked={missingFramesOnly}
                onCheckedChange={(checked) => {
                  const next = !!checked
                  setMissingFramesOnly(next)
                  if (next) setRegenerate(false)
                }}
                disabled={isRunning}
              />
              <label
                htmlFor="express-missing-frames"
                className="flex-1 text-sm text-gray-200 cursor-pointer"
              >
                <div className="font-medium">{t('onlyMissingFrames')}</div>
                <div className="text-xs text-gray-400">
                  {t('onlyMissingFramesHint')}
                </div>
              </label>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-amber-900/20 border border-amber-600/30 rounded-lg">
              <Checkbox
                id="express-regenerate"
                checked={regenerate}
                onCheckedChange={(checked) => {
                  const next = !!checked
                  setRegenerate(next)
                  if (next) setMissingFramesOnly(false)
                }}
                disabled={isRunning}
              />
              <label
                htmlFor="express-regenerate"
                className="flex-1 text-sm text-amber-200 cursor-pointer"
              >
                <div className="font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('regenerateExisting')}
                </div>
                <div className="text-xs text-amber-300/70">
                  {t('regenerateExistingHint')}
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-200">{t('artStyle')}</div>
            <p className="text-xs text-gray-400">
              {lockedArtStyle
                ? t('artStyleLockedHint')
                : t('artStyleUnlockedHint')}
            </p>
            {lockedArtStyle ? (
              <div className="rounded-lg border border-cyan-700/40 bg-cyan-900/20 px-3 py-2 text-sm text-cyan-100">
                {getArtStylePresetName(lockedArtStyle)}
              </div>
            ) : (
              <select
                value={artStyle}
                onChange={(e) => setArtStyle(e.target.value)}
                className="w-full text-sm rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-gray-100"
              >
                {artStylePresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Cost summary */}
          <div className="rounded-lg border border-indigo-700/40 bg-indigo-900/20 p-3 space-y-1">
            <div className="text-sm font-medium text-indigo-200">
              {t('estimatedCost')}
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <div>
                ·{' '}
                {t('costImages', {
                  credits: estimatedCredits.image,
                  frames: effectiveDialogueFrameCount,
                  perFrame: IMAGE_CREDITS.IMAGEN_4,
                })}
              </div>
              <div>· {t('costAudio', { credits: estimatedCredits.audio })}</div>
              {includeMusic && stats.scenesWithMusic > 0 && (
                <div>· {t('costMusic', { credits: estimatedCredits.music })}</div>
              )}
              <div className="text-sm font-semibold text-indigo-200 pt-1">
                {t('costTotal', { credits: estimatedCredits.total })}
              </div>
              <div className="text-[10px] text-gray-500 leading-snug">
                {t('costEstimateDisclaimer')}
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
            {tCommon('actions.cancel')}
          </Button>
          <Button
            onClick={() =>
              onConfirm({
                includeMusic,
                includeSFX: false,
                regenerate,
                language,
                artStyle,
                storyboardQuality: 'draft',
                includeEndFrames: false,
                missingFramesOnly,
              })
            }
            disabled={isRunning || nothingToRun}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isRunning ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                {t('running')}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                {t('generate')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
