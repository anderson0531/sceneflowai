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
  ImageIcon,
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

interface BackdropGeneratorModalProps {
  open: boolean
  onClose: () => void
  scenes: SceneForBackdrop[]
  characters?: CharacterForBackdrop[]
  onGenerated: (reference: {
    name: string
    description?: string
    imageUrl: string
    sourceSceneNumber?: number
    backdropMode: BackdropMode
  }) => void
}

function getSceneLabel(scene: SceneForBackdrop): string {
  const num = scene.scene_number
  const name = scene.scene_name || (typeof scene.heading === 'string' ? scene.heading : scene.heading?.text) || 'Scene'
  return `Scene ${num}: ${name}`
}

export function BackdropGeneratorModal({
  open,
  onClose,
  scenes,
  characters = [],
  onGenerated,
}: BackdropGeneratorModalProps) {
  const [selectedMode, setSelectedMode] = useState<BackdropMode>('master')
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0)
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [usedFields, setUsedFields] = useState<string[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  // Sort scenes - prioritize those with scene direction
  const sortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => {
      const aHasDirection = !!a.sceneDirection
      const bHasDirection = !!b.sceneDirection
      if (aHasDirection && !bHasDirection) return -1
      if (!aHasDirection && bHasDirection) return 1
      return (a.scene_number || 0) - (b.scene_number || 0)
    })
  }, [scenes])

  const selectedScene = sortedScenes[selectedSceneIndex]
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId)
  const modeConfig = BACKDROP_MODES[selectedMode]
  const showCharacterSelect = selectedMode === 'portrait'

  // Regenerate prompt when mode, scene, or character changes
  useEffect(() => {
    if (selectedScene) {
      const result = buildBackdropPrompt(
        selectedMode,
        selectedScene.sceneDirection,
        selectedCharacter?.name,
        selectedCharacter?.appearance || selectedCharacter?.description
      )
      setPrompt(result.prompt)
      setUsedFields(result.usedFields)
    }
  }, [selectedMode, selectedScene, selectedCharacter])

  // Reset prompt from scene
  const handleResetPrompt = () => {
    if (!selectedScene) return
    const result = buildBackdropPrompt(
      selectedMode,
      selectedScene.sceneDirection,
      selectedCharacter?.name,
      selectedCharacter?.appearance || selectedCharacter?.description
    )
    setPrompt(result.prompt)
    setUsedFields(result.usedFields)
  }

  // Handle generate
  const handleGenerate = async () => {
    if (!selectedScene || !prompt.trim()) {
      toast.error('Please select a scene and provide a prompt')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading('Generating backdrop image...', {
      description: 'This may take 15-30 seconds',
    })

    try {
      const response = await fetch('/api/vision/generate-backdrop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          mode: selectedMode,
          sourceSceneNumber: selectedScene.scene_number,
          characterId: selectedCharacterId || undefined,
          aspectRatio: '16:9',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate backdrop')
      }

      const data = await response.json()
      
      toast.success('Backdrop generated!', { id: toastId })
      
      const modeName = BACKDROP_MODES[selectedMode].name
      onGenerated({
        name: `${modeName} - Scene ${selectedScene.scene_number}`,
        description: `Generated using ${modeName} mode from ${getSceneLabel(selectedScene)}`,
        imageUrl: data.imageUrl,
        sourceSceneNumber: selectedScene.scene_number,
        backdropMode: selectedMode,
      })
      
      onClose()
    } catch (error: any) {
      console.error('[BackdropGenerator] Error:', error)
      toast.error(`Generation failed: ${error.message}`, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isGenerating && !value && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-sf-primary" />
            Generate Backdrop
          </DialogTitle>
          <DialogDescription>
            Create a visual backdrop from your scene direction. Choose a mode that fits your narrative needs.
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

          {/* Scene and Character Selection */}
          <div className={cn("grid gap-4", showCharacterSelect ? "grid-cols-2" : "grid-cols-1")}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Source Scene</label>
              <Select
                value={String(selectedSceneIndex)}
                onValueChange={(val) => setSelectedSceneIndex(parseInt(val, 10))}
                disabled={isGenerating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a scene..." />
                </SelectTrigger>
                <SelectContent>
                  {sortedScenes.map((scene, idx) => (
                    <SelectItem key={scene.id || idx} value={String(idx)}>
                      <div className="flex items-center gap-2">
                        {scene.sceneDirection ? (
                          <Wand2 className="w-3 h-3 text-green-500" />
                        ) : (
                          <ImageIcon className="w-3 h-3 text-gray-400" />
                        )}
                        <span>{getSceneLabel(scene)}</span>
                        {scene.sceneDirection && (
                          <span className="text-xs text-green-600 dark:text-green-400">(has direction)</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedScene && !selectedScene.sceneDirection && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  ⚠️ This scene has no Scene Direction. Generate direction first for better results.
                </p>
              )}
            </div>

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
          </div>

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
              Edit the prompt to refine the generated backdrop. Optimized for {modeConfig.name}.
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
            disabled={isGenerating || !prompt.trim() || !selectedScene}
            className="min-w-[160px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Backdrop
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
