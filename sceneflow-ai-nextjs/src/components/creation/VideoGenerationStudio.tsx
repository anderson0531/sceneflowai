'use client'

import React, { useMemo, useState } from 'react'
import { calculateVideoCost, VIDEO_PRICING } from '@/lib/cost/videoCalculator'
import { usdToCredits } from '@/lib/cost/creditUtils'
import { VideoGenerationRequest, CreationSceneData, CreationSceneAsset, VideoModelKey } from './types'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

interface CharacterSummary {
  id: string
  name: string
  referenceImage?: string
}

interface VideoGenerationStudioProps {
  scene: CreationSceneData
  projectId: string
  characters: CharacterSummary[]
  onSubmit: (request: VideoGenerationRequest) => Promise<void>
  costConfig: {
    providerKey: VideoModelKey
    markupPercent: number
    fixedFeePerClip: number
  }
  existingAssets?: CreationSceneAsset[]
  isGenerating?: boolean
}

const MODEL_OPTIONS: Array<keyof typeof VIDEO_PRICING> = [
  'google_veo_standard',
  'google_veo_fast',
  'runway_gen4',
]

function buildInitialPrompt(scene: CreationSceneData): string {
  const segments = [scene.heading, scene.description]
  if (scene.storyboardUrl) {
    segments.push('Reference storyboard available for continuity.')
  }
  return segments.filter(Boolean).join('\n\n') || 'Describe the visual direction for this scene.'
}

export function VideoGenerationStudio({
  scene,
  projectId,
  characters,
  onSubmit,
  costConfig,
  existingAssets = [],
  isGenerating = false,
}: VideoGenerationStudioProps) {
  const [prompt, setPrompt] = useState(() => buildInitialPrompt(scene))
  const [durationSec, setDurationSec] = useState<number>(10)
  const [modelKey, setModelKey] = useState<VideoModelKey>(costConfig.providerKey)
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<string[]>([])
  const [useStoryboard, setUseStoryboard] = useState<boolean>(Boolean(scene.storyboardUrl))
  const [useContinuity, setUseContinuity] = useState<boolean>(false)
  const [continuityAssetId, setContinuityAssetId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const clipCount = Math.max(1, Math.ceil(durationSec / 10))
  const costPreview = useMemo(() => {
    const breakdown = calculateVideoCost(clipCount, modelKey, costConfig.markupPercent, costConfig.fixedFeePerClip)
    return {
      usd: breakdown.totalUserCost,
      credits: usdToCredits(breakdown.totalUserCost),
    }
  }, [clipCount, modelKey, costConfig.markupPercent, costConfig.fixedFeePerClip])

  const characterOptions = useMemo(
    () => characters.map((character) => ({ value: character.id, label: character.name })),
    [characters]
  )

  const continuityOptions = useMemo(
    () => existingAssets.filter((asset) => asset.type === 'generated_video' || asset.type === 'uploaded_video'),
    [existingAssets]
  )

  const handleToggleCharacter = (characterId: string) => {
    setSelectedCharacterIds((prev) =>
      prev.includes(characterId) ? prev.filter((id) => id !== characterId) : [...prev, characterId]
    )
  }

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return
    }
    setIsSubmitting(true)
    try {
      const request: VideoGenerationRequest = {
        prompt,
        durationSec,
        modelKey,
        sceneId: scene.sceneId,
        projectId,
        references: {
          characterIds: selectedCharacterIds,
          storyboardUrl: useStoryboard ? scene.storyboardUrl : undefined,
          continuityFrameUrl: useContinuity && continuityAssetId
            ? existingAssets.find((asset) => asset.id === continuityAssetId)?.previewUrl || existingAssets.find((asset) => asset.id === continuityAssetId)?.sourceUrl
            : undefined,
        },
        characterMetadata: characters
          .filter((character) => selectedCharacterIds.includes(character.id))
          .map((character) => ({ id: character.id, name: character.name })),
        continuity: {
          usePreviousClip: useContinuity,
          previousAssetId: continuityAssetId || undefined,
        },
      }
      await onSubmit(request)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-4">
      <header>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Video Generation Studio</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400">Craft Veo prompts with character and storyboard continuity.</p>
      </header>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Prompt</label>
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={6}
          className="resize-vertical"
          placeholder="Describe the shot, movement, lighting, and emotional tone for Veo."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Model</span>
          <Select value={modelKey} onValueChange={(value) => setModelKey(value as VideoModelKey)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODEL_OPTIONS.map((key) => (
                <SelectItem key={key} value={key}>
                  {VIDEO_PRICING[key].name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration (seconds)</span>
          <input
            type="number"
            min={4}
            max={30}
            step={2}
            value={durationSec}
            onChange={(event) => setDurationSec(Math.min(30, Math.max(4, Number(event.target.value))))}
            className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
          />
        </label>
        <div className="flex flex-col justify-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold text-gray-600 dark:text-gray-300">Estimated Cost</span>
          <span>{costPreview.credits.toLocaleString()} credits • ≈ ${costPreview.usd.toFixed(2)}</span>
          <span className="text-[11px]">Includes markup and platform fees.</span>
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Character Consistency</span>
        {characterOptions.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">No characters detected in this project. Generate or import characters in Vision.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {characterOptions.map((option) => {
              const selected = selectedCharacterIds.includes(option.value)
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleToggleCharacter(option.value)}
                  className={cn(
                    'px-3 py-1 rounded-full border text-xs transition-colors',
                    selected
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-400'
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500 dark:text-gray-400">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useStoryboard}
            onChange={(event) => setUseStoryboard(event.target.checked)}
          />
          Use storyboard frame for visual guidance
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useContinuity}
            onChange={(event) => setUseContinuity(event.target.checked)}
            disabled={continuityOptions.length === 0}
          />
          Continue from previous clip
        </label>
      </div>

      {useContinuity && (
        <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="font-semibold uppercase tracking-wide">Link to previous clip</span>
          <select
            value={continuityAssetId ?? ''}
            onChange={(event) => setContinuityAssetId(event.target.value || null)}
            className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1"
          >
            <option value="">Select prior clip</option>
            {continuityOptions.map((asset) => (
              <option value={asset.id} key={asset.id}>
                {asset.name || asset.id}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
        <div>
          <p>Generation requests are queued per scene. You can continue sequencing while clips render.</p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || isGenerating || !prompt.trim()}
          className="self-start sm:self-auto"
        >
          {isSubmitting || isGenerating ? 'Submitting…' : 'Generate with Veo'}
        </Button>
      </div>
    </section>
  )
}

export default VideoGenerationStudio
