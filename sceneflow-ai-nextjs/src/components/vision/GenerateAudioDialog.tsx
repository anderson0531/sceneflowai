'use client'

import React, { useState, useMemo, useEffect } from 'react'
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
import { GroupedLanguageSelector } from '@/components/vision/GroupedLanguageSelector'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckCircle2, AlertCircle, XCircle, Loader, Sparkles, Globe } from 'lucide-react'
import { getAvailableLanguages, hasLanguageAudio } from '@/lib/audio/languageDetection'
import { SUPPORTED_LANGUAGES } from '@/constants/languages'

interface GenerationProgress {
  status: 'idle' | 'running' | 'completed' | 'error'
  phase: 'narration' | 'dialogue' | 'music' | 'sfx' | 'characters' | 'images'
  currentScene: number
  totalScenes: number
  currentDialogue: number
  totalDialogue: number
  currentMusic: number
  totalMusic: number
  currentSfx: number
  totalSfx: number
  currentCharacter: number
  totalCharacters: number
  currentImage: number
  totalImages: number
  completedSteps: number
  totalSteps: number
  message: string
}

interface GenerateAudioDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  script: any
  onGenerate: (
    language: string,
    audioTypes: { narration: boolean; dialogue: boolean; music: boolean; sfx: boolean },
    options?: {
      stayOpen: boolean
      generateCharacters?: boolean
      generateSceneImages?: boolean
      forceRegenerateImages?: boolean
    }
  ) => Promise<void>
  characters?: Array<{ name?: string; referenceImage?: string | null }>
  isGenerating?: boolean
  generationProgress?: GenerationProgress | null
  mode?: 'foreground' | 'background'
  onRunInBackground?: () => void
}

export function GenerateAudioDialog({
  open,
  onOpenChange,
  script,
  onGenerate,
  characters = [],
  isGenerating = false,
  generationProgress = null,
  mode = 'foreground',
  onRunInBackground,
}: GenerateAudioDialogProps) {
  const t = useTranslations('production.audio.generateAssets')
  const tc = useTranslations('common')
  // Language selection for multi-language TTS support
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [audioTypes, setAudioTypes] = useState({
    narration: true,
    dialogue: true,
    music: false,
    /** SFX are generated via ElevenLabs sound-generation (per-cue ~15 credits). */
    sfx: false,
  })
  const [includeCharacters, setIncludeCharacters] = useState(false)
  const [includeSceneImages, setIncludeSceneImages] = useState(false)
  const [regenerateAllImages, setRegenerateAllImages] = useState(false) // Force regenerate existing images
  const [stayOpen, setStayOpen] = useState(true)

  useEffect(() => {
    if (open) {
      setStayOpen(true)
      setIncludeCharacters(false)
      setIncludeSceneImages(false)
      setRegenerateAllImages(false)
      // Reset to English when dialog opens (user can change)
      setSelectedLanguage('en')
    }
  }, [open])

  const scenes = script?.script?.scenes || []
  const characterCount = Array.isArray(characters) ? characters.length : 0
  const charactersWithAssets = Array.isArray(characters)
    ? characters.filter(char => !!char?.referenceImage).length
    : 0
  const scenesWithImages = scenes.filter((scene: any) => !!scene?.imageUrl).length

  // Calculate audio status for English only
  const audioStatus = useMemo(() => {
    let narrationCount = 0
    let dialogueCount = 0
    let musicCount = 0
    let sfxCount = 0

    scenes.forEach((scene: any) => {
      // Check narration
      if (scene.narrationAudioUrl || scene.narrationAudio?.en?.url) narrationCount++

      // Check dialogue
      const dialogueArray = (scene.dialogueAudio?.en || scene.dialogueAudio || []).filter?.(Boolean) || []
      if (Array.isArray(dialogueArray) && dialogueArray.length > 0) {
        dialogueCount += dialogueArray.filter((d: any) => d?.audioUrl).length
      }

      // Check music - use musicAudio (primary) or music.url (legacy)
      if (scene.musicAudio || scene.music?.url) musicCount++

      // Check SFX - use sfxAudio array (primary) or sfx with audioUrl (legacy)
      if (Array.isArray(scene.sfxAudio) && scene.sfxAudio.length > 0) {
        sfxCount += scene.sfxAudio.filter((url: any) => !!url).length
      } else if (Array.isArray(scene.sfx)) {
        sfxCount += scene.sfx.filter((sfx: any) => 
          (typeof sfx === 'object' && sfx && (sfx.audioUrl || sfx.url))
        ).length
      }
    })

    return { narrationCount, dialogueCount, musicCount, sfxCount }
  }, [scenes])

  // Calculate what will be generated
  const totalScenes = scenes.length
  const totalDialogueLines = scenes.reduce((sum: number, scene: any) => {
    const dialogue = scene.dialogue || []
    return sum + dialogue.length
  }, 0)

  const totalSFXCount = scenes.reduce((sum: number, scene: any) => {
    const sfx = scene.sfx || []
    return sum + sfx.length
  }, 0)

  const willGenerateNarration = audioTypes.narration
  const willGenerateDialogue = audioTypes.dialogue
  const willGenerateMusic = audioTypes.music
  const willGenerateSFX = audioTypes.sfx

  const narrationCount = willGenerateNarration ? totalScenes : 0
  const dialogueCount = willGenerateDialogue ? totalDialogueLines : 0
  const musicCount = willGenerateMusic ? totalScenes : 0
  const sfxRenderCount = willGenerateSFX ? Math.max(0, totalSFXCount - audioStatus.sfxCount) : 0

  const willOverwrite = (
    (willGenerateNarration && audioStatus.narrationCount > 0) ||
    (willGenerateDialogue && audioStatus.dialogueCount > 0) ||
    (willGenerateMusic && audioStatus.musicCount > 0)
  )

  const handleGenerate = async () => {
    if (effectiveIsGenerating) return
    await onGenerate(selectedLanguage, audioTypes, {
      stayOpen,
      generateCharacters: includeCharacters,
      generateSceneImages: includeSceneImages,
      forceRegenerateImages: regenerateAllImages,
    })
  }

  const handleToggleAll = (checked: boolean) => {
    setAudioTypes({
      narration: checked,
      dialogue: checked,
      music: checked,
      sfx: checked,
    })
  }

  const allSelected = audioTypes.narration && audioTypes.dialogue && audioTypes.music && audioTypes.sfx
  const noneSelected = !audioTypes.narration && !audioTypes.dialogue && !audioTypes.music && !audioTypes.sfx

  const showProgress = mode === 'foreground' && generationProgress !== null && generationProgress.status !== 'idle'
  const isRunning = showProgress && generationProgress?.status === 'running'
  const isCompleted = showProgress && generationProgress?.status === 'completed'
  const progressPercent = showProgress && generationProgress
    ? (generationProgress.totalSteps > 0
        ? Math.min(100, Math.round((generationProgress.completedSteps / generationProgress.totalSteps) * 100))
        : 0)
    : 0
  const effectiveIsGenerating = Boolean(isGenerating || isRunning)
  const secondaryProgressText = (() => {
    if (!generationProgress) return null
    switch (generationProgress.phase) {
      case 'dialogue':
        return generationProgress.totalDialogue > 0
          ? t('secondaryDialogue', {
              current: generationProgress.currentDialogue,
              total: generationProgress.totalDialogue,
            })
          : null
      case 'music':
        return generationProgress.totalMusic > 0
          ? t('secondaryMusic', {
              current: generationProgress.currentMusic,
              total: generationProgress.totalMusic,
            })
          : null
      case 'sfx':
        return generationProgress.totalSfx > 0
          ? t('secondarySfx', {
              current: generationProgress.currentSfx,
              total: generationProgress.totalSfx,
            })
          : null
      case 'characters':
        return generationProgress.totalCharacters > 0
          ? t('secondaryCharacter', {
              current: generationProgress.currentCharacter,
              total: generationProgress.totalCharacters,
            })
          : null
      case 'images':
        return generationProgress.totalImages > 0
          ? t('secondaryImage', {
              current: generationProgress.currentImage,
              total: generationProgress.totalImages,
            })
          : null
      default:
        return null
    }
  })()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-gray-900 border-gray-700 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-400" />
            {t('title')}
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {showProgress && generationProgress && (
            <div className="space-y-3 rounded-lg border border-blue-800 bg-blue-900/20 p-4">
              <div className="flex items-center justify-between text-sm text-blue-200">
                <span>
                  {generationProgress.phase === 'narration' && t('narrationProgress')}
                  {generationProgress.phase === 'dialogue' && t('dialogueProgress')}
                  {generationProgress.phase === 'music' && t('musicProgress')}
                  {generationProgress.phase === 'sfx' && t('sfxProgress')}
                  {generationProgress.phase === 'characters' && t('characterProgress')}
                  {generationProgress.phase === 'images' && t('imageProgress')}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-blue-950/50">
                <div
                  className="h-2 rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="space-y-1 text-xs text-gray-300">
                <p>{generationProgress.message}</p>
                <div className="flex flex-wrap gap-3 text-gray-400">
                  {(generationProgress.totalScenes > 0 && (generationProgress.phase === 'narration' || generationProgress.phase === 'dialogue' || generationProgress.phase === 'music' || generationProgress.phase === 'sfx' || generationProgress.phase === 'images')) && (
                    <span>
                      {t('sceneProgress', {
                        current: Math.max(1, generationProgress.currentScene),
                        total: generationProgress.totalScenes,
                      })}
                    </span>
                  )}
                  {secondaryProgressText && <span>{secondaryProgressText}</span>}
                </div>
              </div>
              {isRunning && onRunInBackground && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRunInBackground}
                    className="border-blue-500 text-blue-300 hover:bg-blue-900/40"
                  >
                    {t('runInBackground')}
                  </Button>
                </div>
              )}
              {isCompleted && (
                <div className="text-sm font-medium text-green-400">{t('generationComplete')}</div>
              )}
            </div>
          )}

          {/* Language Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              <label className="text-sm font-medium text-gray-200">{t('targetLanguage')}</label>
            </div>
            <GroupedLanguageSelector
              value={selectedLanguage}
              onValueChange={setSelectedLanguage}
              size="md"
              intent="generate"
            />
            {selectedLanguage !== 'en' && (
              <p className="text-xs text-amber-400">
                ⚡ {t('translateBeforeAudio', {
                  language: SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name ?? selectedLanguage,
                })}
              </p>
            )}
          </div>

          {/* Audio Types Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-200">{t('audioTypes')}</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleAll(!allSelected)}
                className="text-xs h-7 text-blue-400 hover:text-blue-300"
                disabled={isRunning}
              >
                {allSelected ? t('deselectAll') : t('selectAll')}
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="narration"
                  checked={audioTypes.narration}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, narration: !!checked })
                  }
                  disabled={isRunning}
                />
                <label
                  htmlFor="narration"
                  className="flex-1 text-sm text-gray-200 cursor-pointer"
                >
                  <div className="font-medium">{t('narration')}</div>
                  <div className="text-xs text-gray-400">
                    {t('scenesCount', { count: totalScenes })} • {audioStatus.narrationCount === totalScenes 
                      ? `✅ ${t('statusComplete')}` 
                      : audioStatus.narrationCount > 0 
                      ? `⚠️ ${t('statusPartial', { current: audioStatus.narrationCount, total: totalScenes })}` 
                      : `❌ ${t('statusNotGenerated')}`}
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="dialogue"
                  checked={audioTypes.dialogue}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, dialogue: !!checked })
                  }
                  disabled={isRunning}
                />
                <label
                  htmlFor="dialogue"
                  className="flex-1 text-sm text-gray-200 cursor-pointer"
                >
                  <div className="font-medium">{t('dialogue')}</div>
                  <div className="text-xs text-gray-400">
                    {t('linesCount', { count: totalDialogueLines })} • {audioStatus.dialogueCount === totalDialogueLines 
                      ? `✅ ${t('statusComplete')}` 
                      : audioStatus.dialogueCount > 0 
                      ? `⚠️ ${t('statusPartial', { current: audioStatus.dialogueCount, total: totalDialogueLines })}` 
                      : `❌ ${t('statusNotGenerated')}`}
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="music"
                  checked={audioTypes.music}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, music: !!checked })
                  }
                  disabled={isRunning}
                />
                <label
                  htmlFor="music"
                  className="flex-1 text-sm text-gray-200 cursor-pointer"
                >
                  <div className="font-medium">{t('backgroundMusic')}</div>
                  <div className="text-xs text-gray-400">
                    {t('scenesCount', { count: totalScenes })} • {audioStatus.musicCount > 0 
                      ? `✅ ${t('statusGeneratedCount', { count: audioStatus.musicCount })}` 
                      : `❌ ${t('statusNotGenerated')}`}
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="sfx"
                  checked={audioTypes.sfx}
                  onCheckedChange={(checked) =>
                    setAudioTypes({ ...audioTypes, sfx: !!checked })
                  }
                  disabled={isRunning || totalSFXCount === 0}
                />
                <label
                  htmlFor="sfx"
                  className={`flex-1 text-sm cursor-pointer ${totalSFXCount === 0 ? 'text-gray-500' : 'text-gray-200'}`}
                >
                  <div className="font-medium">{t('soundEffects')}</div>
                  <div className="text-xs text-gray-400">
                    {totalSFXCount > 0
                      ? `${t('sfxCues', { count: totalSFXCount })} • ${
                          audioStatus.sfxCount === 0
                            ? t('statusNoneGenerated')
                            : audioStatus.sfxCount === totalSFXCount
                            ? t('statusComplete')
                            : t('statusPartial', { current: audioStatus.sfxCount, total: totalSFXCount })
                        }`
                      : t('noSfxCues')}
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Generation Summary */}
          <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 space-y-2">
            <div className="text-sm font-medium text-blue-300">{t('generationSummary')}</div>
            <div className="text-xs text-gray-300 space-y-1">
              {willGenerateNarration && (
                <div>• {t('summaryNarration', { count: narrationCount })}</div>
              )}
              {willGenerateDialogue && (
                <div>• {t('summaryDialogue', { count: dialogueCount })}</div>
              )}
              {willGenerateMusic && (
                <div>• {t('summaryMusic', { count: musicCount })}</div>
              )}
              {willGenerateSFX && sfxRenderCount > 0 && (
                <div>• {t('summarySfx', { count: sfxRenderCount })}</div>
              )}
              {includeCharacters && (
                <div>
                  • {t('summaryCharacters', { count: characterCount })}
                  {characterCount > 0 && charactersWithAssets > 0 && (
                    <span className="text-gray-500"> {t('summaryAlreadyGenerated', { count: charactersWithAssets })}</span>
                  )}
                </div>
              )}
              {includeSceneImages && (
                <div>
                  • {t('summarySceneImages', { count: totalScenes })}
                  {totalScenes > 0 && scenesWithImages > 0 && (
                    <span className="text-gray-500"> {t('summaryAlreadyGenerated', { count: scenesWithImages })}</span>
                  )}
                </div>
              )}
            </div>
            {willOverwrite && (
              <div className="text-xs text-yellow-400 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3 h-3" />
                <span>{t('overwriteWarning')}</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-200">{t('additionalAssets')}</label>
            </div>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="characters"
                  checked={includeCharacters}
                  onCheckedChange={(checked) => setIncludeCharacters(!!checked)}
                  disabled={isRunning || characterCount === 0}
                />
                <label
                  htmlFor="characters"
                  className={`flex-1 text-sm ${characterCount === 0 ? 'text-gray-500' : 'text-gray-200'} cursor-pointer`}
                >
                  <div className="font-medium">{t('characterRefs')}</div>
                  <div className="text-xs text-gray-400">
                    {characterCount > 0
                      ? t('charactersReady', { count: characterCount, ready: charactersWithAssets })
                      : t('noCharacters')}
                  </div>
                </label>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-800 rounded-lg hover:bg-gray-750">
                <Checkbox
                  id="scene-images"
                  checked={includeSceneImages}
                  onCheckedChange={(checked) => {
                    setIncludeSceneImages(!!checked)
                    if (!checked) setRegenerateAllImages(false)
                  }}
                  disabled={isRunning || totalScenes === 0}
                />
                <label
                  htmlFor="scene-images"
                  className={`flex-1 text-sm ${totalScenes === 0 ? 'text-gray-500' : 'text-gray-200'} cursor-pointer`}
                >
                  <div className="font-medium">{t('sceneImages')}</div>
                  <div className="text-xs text-gray-400">
                    {t('sceneImagesReady', { count: totalScenes, ready: scenesWithImages })}
                  </div>
                </label>
              </div>
              
              {/* Regenerate All option - only shown when scene images is selected */}
              {includeSceneImages && (
                <div className="flex items-center space-x-3 p-3 ml-6 bg-amber-900/20 border border-amber-600/30 rounded-lg">
                  <Checkbox
                    id="regenerate-all-images"
                    checked={regenerateAllImages}
                    onCheckedChange={(checked) => setRegenerateAllImages(!!checked)}
                    disabled={isRunning}
                  />
                  <label
                    htmlFor="regenerate-all-images"
                    className="flex-1 text-sm text-amber-200 cursor-pointer"
                  >
                    <div className="font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {t('regenerateAllImages')}
                    </div>
                    <div className="text-xs text-amber-300/70">
                      {t('regenerateAllImagesHint')}
                    </div>
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-gray-800 bg-gray-900/40 p-3">
            <Checkbox
              id="stay-open"
              checked={stayOpen}
              onCheckedChange={(checked) => setStayOpen(!!checked)}
              disabled={isRunning}
            />
            <label htmlFor="stay-open" className="text-xs leading-5 text-gray-300">
              {t('stayOpenHint')}
            </label>
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={Boolean(isRunning)}
            className="border-gray-700 hover:bg-gray-800"
          >
            {isCompleted ? tc('actions.close') : tc('actions.cancel')}
          </Button>
          {!isCompleted ? (
            <Button
              onClick={handleGenerate}
              disabled={effectiveIsGenerating || noneSelected}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {effectiveIsGenerating ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  {t('generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('generate')}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={noneSelected}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {t('generateAgain')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

