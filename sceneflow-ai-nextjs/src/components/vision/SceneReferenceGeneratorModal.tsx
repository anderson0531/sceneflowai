'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Wand2, Sparkles, RefreshCw, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'
import { DetailedSceneDirection } from '@/types/scene-direction'

export interface SceneForReferenceGeneration {
  id?: string
  scene_number?: number
  scene_name?: string
  heading?: string | { text: string }
  description?: string
  visualDescription?: string
  sceneDirection?: DetailedSceneDirection
}

interface SceneReferenceGeneratorModalProps {
  open: boolean
  onClose: () => void
  scenes: SceneForReferenceGeneration[]
  onGenerated: (reference: {
    name: string
    description?: string
    imageUrl: string
    sourceSceneNumber?: number
  }) => void
}

/**
 * Build a prompt for scene reference generation from scene direction data.
 * Focuses on environment only - no people, no characters.
 */
function buildScenePromptFromDirection(
  scene: SceneForReferenceGeneration,
  sceneDirection?: DetailedSceneDirection
): string {
  const parts: string[] = []

  // Start with scene name/heading
  const heading = typeof scene.heading === 'string' 
    ? scene.heading 
    : scene.heading?.text
  if (heading) {
    parts.push(heading)
  }

  // Add scene direction details if available
  if (sceneDirection) {
    const { scene: sceneInfo, lighting } = sceneDirection

    // Location and atmosphere
    if (sceneInfo?.location) {
      parts.push(sceneInfo.location)
    }
    if (sceneInfo?.atmosphere) {
      parts.push(`${sceneInfo.atmosphere} atmosphere`)
    }

    // Key props
    if (sceneInfo?.keyProps && sceneInfo.keyProps.length > 0) {
      parts.push(`Key props: ${sceneInfo.keyProps.join(', ')}`)
    }

    // Lighting
    if (lighting) {
      if (lighting.timeOfDay) {
        parts.push(`Time: ${lighting.timeOfDay}`)
      }
      if (lighting.overallMood) {
        parts.push(`Mood: ${lighting.overallMood}`)
      }
      if (lighting.colorTemperature) {
        parts.push(`Color: ${lighting.colorTemperature}`)
      }
    }
  } else {
    // Fall back to description if no sceneDirection
    const description = scene.visualDescription || scene.description
    if (description) {
      // Extract environment-focused content, remove character mentions
      const envDescription = description
        .replace(/\b(he|she|they|the character|the protagonist|the hero|the villain)\b/gi, '')
        .replace(/\s{2,}/g, ' ')
        .trim()
      if (envDescription) {
        parts.push(envDescription)
      }
    }
  }

  // Always append the environment-only instruction
  parts.push('Empty environment only. No people, no characters, no human figures.')

  return parts.filter(Boolean).join('. ').replace(/\.\./g, '.')
}

function getSceneLabel(scene: SceneForReferenceGeneration): string {
  const num = scene.scene_number
  const name = scene.scene_name || (typeof scene.heading === 'string' ? scene.heading : scene.heading?.text) || 'Scene'
  return `Scene ${num}: ${name}`
}

export function SceneReferenceGeneratorModal({
  open,
  onClose,
  scenes,
  onGenerated,
}: SceneReferenceGeneratorModalProps) {
  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number>(0)
  const [prompt, setPrompt] = useState('')
  const [name, setName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  // Scenes that have sceneDirection get priority, but all scenes are available
  const sortedScenes = useMemo(() => {
    return [...scenes].sort((a, b) => {
      // Sort by scene number, but put scenes with direction first
      const aHasDirection = !!a.sceneDirection
      const bHasDirection = !!b.sceneDirection
      if (aHasDirection && !bHasDirection) return -1
      if (!aHasDirection && bHasDirection) return 1
      return (a.scene_number || 0) - (b.scene_number || 0)
    })
  }, [scenes])

  const selectedScene = sortedScenes[selectedSceneIndex]

  // Auto-generate prompt when scene changes
  useEffect(() => {
    if (selectedScene) {
      const generatedPrompt = buildScenePromptFromDirection(
        selectedScene,
        selectedScene.sceneDirection
      )
      setPrompt(generatedPrompt)
      
      // Auto-generate name
      const sceneLabel = selectedScene.scene_name 
        || (typeof selectedScene.heading === 'string' ? selectedScene.heading : selectedScene.heading?.text)
        || `Scene ${selectedScene.scene_number || selectedSceneIndex + 1}`
      setName(`${sceneLabel} - Reference`)
    }
  }, [selectedScene, selectedSceneIndex])

  const handleRegenerate = () => {
    if (selectedScene) {
      const generatedPrompt = buildScenePromptFromDirection(
        selectedScene,
        selectedScene.sceneDirection
      )
      setPrompt(generatedPrompt)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || !name.trim()) {
      toast.error('Please provide both a name and prompt')
      return
    }

    setIsGenerating(true)
    const toastId = toast.loading('Generating scene reference image...', {
      description: 'This may take 15-30 seconds',
    })

    try {
      const response = await fetch('/api/vision/generate-scene-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          name: name.trim(),
          description: `Generated from ${getSceneLabel(selectedScene)}`,
          sourceSceneNumber: selectedScene?.scene_number,
          aspectRatio: '16:9',
          negativePrompt: 'people, characters, faces, crowds, humans, persons, figures, silhouettes',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate image')
      }

      const data = await response.json()
      
      toast.success('Scene reference generated!', { id: toastId })
      
      onGenerated({
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        sourceSceneNumber: data.sourceSceneNumber,
      })
      
      onClose()
    } catch (error: any) {
      console.error('[SceneReferenceGenerator] Error:', error)
      toast.error(`Generation failed: ${error.message}`, { id: toastId })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !isGenerating && !value && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sf-primary" />
            Generate Scene Reference
          </DialogTitle>
          <DialogDescription>
            Create an environment-only reference image from scene direction data. 
            No people will be generated — only locations, props, and atmosphere.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Scene Selector */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Source Scene
            </label>
            <Select
              value={String(selectedSceneIndex)}
              onValueChange={(val) => setSelectedSceneIndex(parseInt(val, 10))}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a scene" />
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
                        <span className="text-xs text-green-600 dark:text-green-400 ml-1">(has direction)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedScene?.sceneDirection && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                ⚠️ This scene has no Scene Direction. Generate direction first for better results.
              </p>
            )}
          </div>

          {/* Reference Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
              Reference Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Downtown Office Lobby"
              disabled={isGenerating}
            />
          </div>

          {/* Prompt Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Generation Prompt
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="text-xs"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Reset from Scene
              </Button>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the environment, location, props, lighting, and atmosphere..."
              rows={6}
              disabled={isGenerating}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Edit the prompt to refine the image. "No people" is automatically enforced.
            </p>
          </div>
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim() || !name.trim()}
            className="min-w-[140px]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Reference
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
