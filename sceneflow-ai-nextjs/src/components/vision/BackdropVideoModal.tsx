'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Sparkles, 
  User, 
  MapPin, 
  Pencil, 
  Loader2, 
  RotateCcw,
  Check,
  Info,
  Wand2,
  Film,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { 
  BackdropMode, 
  BACKDROP_MODES, 
  buildBackdropPrompt,
} from '@/lib/vision/backdropGenerator'
import { DetailedSceneDirection } from '@/types/scene-direction'

// Icon mapping
const MODE_ICONS: Record<BackdropMode, React.ReactNode> = {
  atmospheric: <Sparkles className="h-5 w-5" />,
  portrait: <User className="h-5 w-5" />,
  master: <MapPin className="h-5 w-5" />,
  animatic: <Pencil className="h-5 w-5" />,
}

export interface SceneForBackdrop {
  id?: string
  scene_number?: number
  scene_name?: string
  heading?: string | { text: string }
  description?: string
  sceneDirection?: DetailedSceneDirection
}

export interface CharacterForBackdrop {
  id: string
  name: string
  description?: string
  appearance?: string
}

interface BackdropVideoModalProps {
  open: boolean
  onClose: () => void
  scene: SceneForBackdrop
  characters?: CharacterForBackdrop[]
  /** Called when video is generated successfully - receives video URL to insert as segment */
  onGenerated: (result: {
    videoUrl: string
    prompt: string
    backdropMode: BackdropMode
    duration: number
  }) => void
  /** Currently selected segment index (new segment will be inserted before this) */
  currentSegmentIndex?: number
}

function getSceneLabel(scene: SceneForBackdrop): string {
  const num = scene.scene_number
  const name = scene.scene_name || (typeof scene.heading === 'string' ? scene.heading : scene.heading?.text) || 'Scene'
  return `Scene ${num}: ${name}`
}

export function BackdropVideoModal({
  open,
  onClose,
  scene,
  characters = [],
  onGenerated,
  currentSegmentIndex = 0,
}: BackdropVideoModalProps) {
  const [selectedMode, setSelectedMode] = useState<BackdropMode>('master')
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [usedFields, setUsedFields] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId)
  const modeConfig = BACKDROP_MODES[selectedMode]
  const showCharacterSelect = selectedMode === 'portrait'

  // Regenerate prompt when mode or character changes
  useEffect(() => {
    if (scene) {
      const result = buildBackdropPrompt(
        selectedMode,
        scene.sceneDirection,
        selectedCharacter?.name,
        selectedCharacter?.appearance || selectedCharacter?.description
      )
      setPrompt(result.prompt)
      setUsedFields(result.usedFields)
    }
  }, [selectedMode, scene, selectedCharacter])

  // Reset prompt from scene
  const handleResetPrompt = () => {
    if (!scene) return
    const result = buildBackdropPrompt(
      selectedMode,
      scene.sceneDirection,
      selectedCharacter?.name,
      selectedCharacter?.appearance || selectedCharacter?.description
    )
    setPrompt(result.prompt)
    setUsedFields(result.usedFields)
  }

  // Handle video generation
  const handleGenerate = async () => {
    if (!scene || !prompt.trim()) {
      toast.error('Please provide a prompt')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading('Generating backdrop video with Veo 3.1...', {
      description: 'This may take 1-2 minutes',
    })

    try {
      // Call video generation API directly
      const response = await fetch('/api/vision/generate-backdrop-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: selectedMode,
          sourceSceneNumber: scene.scene_number,
          negativePrompt: modeConfig.negativePrompt,
          duration: 5, // Default 5 seconds for backdrop videos
          aspectRatio: '16:9',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate backdrop video')
      }

      const data = await response.json()
      
      toast.success('Backdrop video generated!', { id: toastId })
      
      onGenerated({
        videoUrl: data.videoUrl,
        prompt: prompt.trim(),
        backdropMode: selectedMode,
        duration: data.duration || 5,
      })
      
      onClose()
    } catch (error: any) {
      console.error('[BackdropVideoModal] Error:', error)
      toast.error(`Video generation failed: ${error.message}`, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isGenerating && !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Film className="h-5 w-5 text-sf-primary" />
            Generate Backdrop Video
          </DialogTitle>
          <DialogDescription>
            Create a cinematic backdrop video from your scene direction. The video will be inserted before segment #{currentSegmentIndex + 1}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mode Selection Cards */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Backdrop Mode</label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(BACKDROP_MODES) as BackdropMode[]).map((mode) => {
                const config = BACKDROP_MODES[mode]
                const isSelected = selectedMode === mode
                return (
                  <button
                    key={mode}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setSelectedMode(mode)}
                    className={cn(
                      'p-4 rounded-xl border text-left transition-all',
                      isSelected 
                        ? 'border-sf-primary bg-sf-primary/10' 
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 hover:border-sf-primary/50'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'p-2 rounded-lg',
                        isSelected ? 'bg-sf-primary/20 text-sf-primary' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                      )}>
                        {MODE_ICONS[mode]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{config.name}</h4>
                          {isSelected && <Check className="h-4 w-4 text-sf-primary" />}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{config.subtitle}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {config.bestFor.slice(0, 2).map((tag) => (
                            <span 
                              key={tag} 
                              className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Mode Description */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-blue-700 dark:text-blue-300">{modeConfig.description}</p>
          </div>

          {/* Source Scene Info */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source Scene</label>
            <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {scene.sceneDirection ? (
                <Wand2 className="w-4 h-4 text-green-500" />
              ) : (
                <Film className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-sm font-medium">{getSceneLabel(scene)}</span>
              {scene.sceneDirection && (
                <span className="text-xs text-green-600 dark:text-green-400">(has direction)</span>
              )}
            </div>
            {!scene.sceneDirection && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠️ This scene has no Scene Direction. Generate direction first for better results.
              </p>
            )}
          </div>

          {/* Character Selection for Portrait Mode */}
          {showCharacterSelect && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Character (for Portrait)</label>
              <Select
                value={selectedCharacterId}
                onValueChange={setSelectedCharacterId}
                disabled={isGenerating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a character..." />
                </SelectTrigger>
                <SelectContent>
                  {characters.map((char) => (
                    <SelectItem key={char.id} value={char.id}>
                      {char.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Used Fields Info */}
          {usedFields.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">Fields Used from Scene Direction</label>
              <div className="flex flex-wrap gap-1">
                {usedFields.map((field) => (
                  <span 
                    key={field} 
                    className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {field}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Prompt Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Generated Prompt</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetPrompt}
                disabled={isGenerating}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset from Scene
              </Button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="The backdrop prompt will be generated based on your scene direction..."
              rows={5}
              disabled={isGenerating}
              className="font-mono text-sm resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Edit the prompt to refine the generated video. Optimized for {modeConfig.name}.
            </p>
          </div>

          {/* Style Notes */}
          <div className="space-y-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Style Modifiers Applied</label>
            <div className="flex flex-wrap gap-1">
              {modeConfig.styleModifiers.map((modifier) => (
                <span 
                  key={modifier} 
                  className="text-[10px] px-2 py-0.5 rounded border border-sf-primary/30 text-sf-primary bg-sf-primary/5"
                >
                  {modifier}
                </span>
              ))}
              {!modeConfig.allowPeople && (
                <span 
                  className="text-[10px] px-2 py-0.5 rounded border border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
                >
                  No people
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim()}
            className="min-w-[180px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating Video...
              </>
            ) : (
              <>
                <Film className="w-4 h-4 mr-2" />
                Generate Video
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
