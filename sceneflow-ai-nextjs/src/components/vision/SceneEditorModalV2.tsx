'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/Button'
import { Loader, Eye, Check, Undo, Redo } from 'lucide-react'
import { InstructionsPanel } from './InstructionsPanel'
import { PreviewPanel } from './PreviewPanel'
import { SceneComparisonPanel } from './SceneComparisonPanel'
import { useOverlayStore } from '@/store/useOverlayStore'
import type { PreserveElement } from '@/lib/audio/cleanupAudio'
import {
  applyDeselectedSceneChanges,
  countSelectedChanges,
  diffSceneChanges,
} from '@/lib/script/sceneDiffChanges'

interface SceneEditorApplyOptions {
  preserveElements?: PreserveElement[]
}

interface SceneEditorModalProps {
  isOpen: boolean
  onClose: () => void
  scene: any
  sceneIndex: number
  projectId: string
  characters: any[]
  previousScene?: any
  nextScene?: any
  onApplyChanges: (sceneIndex: number, revisedScene: any, options?: SceneEditorApplyOptions) => void
  initialInstructions?: string
}

export function SceneEditorModal({
  isOpen,
  onClose,
  scene,
  sceneIndex,
  projectId,
  characters,
  previousScene,
  nextScene,
  onApplyChanges,
  initialInstructions = ''
}: SceneEditorModalProps) {
  const [customInstruction, setCustomInstruction] = useState(initialInstructions)
  const [previewScene, setPreviewScene] = useState<any | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [revisionHistory, setRevisionHistory] = useState<any[]>([])
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1)
  const [showPreview, setShowPreview] = useState(false)

  const [preserveDialogueBeats, setPreserveDialogueBeats] = useState(false)
  const [preserveActionBeats, setPreserveActionBeats] = useState(false)
  const [preserveMusic, setPreserveMusic] = useState(false)
  const [preserveSceneDirection, setPreserveSceneDirection] = useState(false)
  const [preserveBeatFrames, setPreserveBeatFrames] = useState(false)

  const [deselectedChanges, setDeselectedChanges] = useState<Set<string>>(() => new Set())

  const [optimizedScene, setOptimizedScene] = useState<any | null>(null)
  const [changesSummary, setChangesSummary] = useState<any[]>([])
  const [showComparison, setShowComparison] = useState(false)

  const [appliedRecommendationIds, setAppliedRecommendationIds] = useState<string[]>([])

  const MAX_INSTRUCTIONS = 5

  const countInstructions = (text: string): number => {
    if (text.trim() === '') return 0
    const numberedLines = text.match(/^\d+\.\s/gm)
    return numberedLines ? numberedLines.length : (text.trim() ? 1 : 0)
  }

  const instructionCount = countInstructions(customInstruction)
  const canAddMoreInstructions = instructionCount < MAX_INSTRUCTIONS

  const buildPreserveElements = useCallback((): PreserveElement[] => {
    const preserveElements: PreserveElement[] = []
    if (preserveDialogueBeats) preserveElements.push('dialogueBeats')
    if (preserveActionBeats) preserveElements.push('actionBeats')
    if (preserveMusic) preserveElements.push('music')
    if (preserveSceneDirection) preserveElements.push('sceneDirection')
    if (preserveBeatFrames) preserveElements.push('beatFrames')
    return preserveElements
  }, [
    preserveDialogueBeats,
    preserveActionBeats,
    preserveMusic,
    preserveSceneDirection,
    preserveBeatFrames,
  ])

  const appendInstruction = (newText: string, recommendationId?: string) => {
    if (!canAddMoreInstructions) return

    if (recommendationId || newText) {
      const idToTrack = recommendationId || `rec-${Date.now()}-${newText.substring(0, 20).replace(/\s+/g, '-')}`
      setAppliedRecommendationIds(prev => [...new Set([...prev, idToTrack])])
    }

    if (customInstruction.trim() === '') {
      setCustomInstruction(`1. ${newText}`)
    } else {
      const nextNum = instructionCount + 1
      setCustomInstruction(`${customInstruction}\n\n${nextNum}. ${newText}`)
    }
  }

  useEffect(() => {
    if (isOpen && scene) {
      setRevisionHistory([scene])
      setCurrentHistoryIndex(0)
      setShowPreview(false)
      setPreviewScene(null)
      setCustomInstruction(initialInstructions || '')
      setAppliedRecommendationIds([])
      setPreserveDialogueBeats(false)
      setPreserveActionBeats(false)
      setPreserveMusic(false)
      setPreserveSceneDirection(false)
      setPreserveBeatFrames(false)
      setDeselectedChanges(new Set())
    }
  }, [isOpen, scene, initialInstructions])

  const handleGeneratePreview = async () => {
    if (!customInstruction.trim()) {
      return
    }

    const overlayStore = useOverlayStore.getState()

    setIsGenerating(true)

    overlayStore.show(`Revising Scene ${sceneIndex + 1}...`, 20, 'scene-revision')

    try {
      const preserveElements = buildPreserveElements()

      overlayStore.setProgress(15)
      overlayStore.setStatus('Analyzing direction...')

      const response = await fetch('/api/vision/revise-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          sceneIndex,
          currentScene: scene,
          revisionMode: 'instruction',
          selectedRecommendations: [],
          customInstruction,
          preserveElements,
          context: {
            characters,
            previousScene,
            nextScene
          }
        })
      })

      overlayStore.setProgress(60)
      overlayStore.setStatus('Revising scene content...')

      if (!response.ok) {
        throw new Error('Failed to revise scene')
      }

      overlayStore.setProgress(85)
      overlayStore.setStatus('Polishing details...')

      const data = await response.json()
      setPreviewScene(data.revisedScene)
      setDeselectedChanges(new Set())

      const newHistory = [...revisionHistory.slice(0, currentHistoryIndex + 1), data.revisedScene]
      setRevisionHistory(newHistory)
      setCurrentHistoryIndex(newHistory.length - 1)

      overlayStore.setProgress(100)
      overlayStore.setStatus('Revision complete!')

      setShowPreview(true)
    } catch (error) {
      console.error('[Scene Editor] Failed to generate preview:', error)
    } finally {
      setIsGenerating(false)
      overlayStore.hide()
    }
  }

  const handleToggleChange = (key: string) => {
    setDeselectedChanges((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleApplyChanges = () => {
    if (!previewScene) return

    const revisedSceneWithMetadata = applyDeselectedSceneChanges(
      scene,
      previewScene,
      deselectedChanges
    )

    const newHistory = [...revisionHistory.slice(0, currentHistoryIndex + 1), revisedSceneWithMetadata]
    setRevisionHistory(newHistory)
    setCurrentHistoryIndex(newHistory.length - 1)

    onApplyChanges(sceneIndex, revisedSceneWithMetadata, {
      preserveElements: buildPreserveElements(),
    })
    onClose()
  }

  const handleUndo = () => {
    if (currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1
      setCurrentHistoryIndex(newIndex)
      setPreviewScene(revisionHistory[newIndex])
    }
  }

  const handleRedo = () => {
    if (currentHistoryIndex < revisionHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1
      setCurrentHistoryIndex(newIndex)
      setPreviewScene(revisionHistory[newIndex])
    }
  }

  const hasDirection = customInstruction.trim().length > 0
  const previewChangeKeys = previewScene ? diffSceneChanges(scene, previewScene) : []
  const { selected: selectedPreviewChanges } = countSelectedChanges(
    previewChangeKeys,
    deselectedChanges
  )
  const canApplyPreview = Boolean(previewScene) && selectedPreviewChanges > 0
  const changeStatusMessage = showPreview
    ? `${selectedPreviewChanges} change${selectedPreviewChanges !== 1 ? 's' : ''} selected`
    : hasDirection
      ? 'Direction ready — generate preview to review changes'
      : 'Enter direction to revise this scene'

  const sceneRecommendations: string[] = (scene?.audienceAnalysis?.recommendations || []).map(
    (rec: string | { text: string }) => typeof rec === 'string' ? rec : rec?.text || String(rec)
  )

  if (!scene) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Edit Scene {sceneIndex + 1}</DialogTitle>
              <DialogDescription>
                {typeof scene.heading === 'string' ? scene.heading : (scene.heading?.text || 'Untitled Scene')}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUndo}
                disabled={currentHistoryIndex <= 0}
              >
                <Undo className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRedo}
                disabled={currentHistoryIndex >= revisionHistory.length - 1}
              >
                <Redo className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {!showPreview ? (
          <div className="h-[calc(90vh-200px)] overflow-y-auto">
            <div className="space-y-4 max-w-3xl mx-auto">
              <InstructionsPanel
                instruction={customInstruction}
                onInstructionChange={setCustomInstruction}
                recommendations={sceneRecommendations}
                appliedRecommendationIds={appliedRecommendationIds}
                onApplyRecommendation={(recText, recId) => {
                  appendInstruction(recText, recId)
                }}
                canAddMoreInstructions={canAddMoreInstructions}
              />

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Preserve Elements
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveDialogueBeats}
                        onChange={(e) => setPreserveDialogueBeats(e.target.checked)}
                        className="rounded"
                      />
                      Dialogue beats (+ audio)
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveActionBeats}
                        onChange={(e) => setPreserveActionBeats(e.target.checked)}
                        className="rounded"
                      />
                      Action beats (+ SFX audio)
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveMusic}
                        onChange={(e) => setPreserveMusic(e.target.checked)}
                        className="rounded"
                      />
                      Music
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preserveSceneDirection}
                        onChange={(e) => setPreserveSceneDirection(e.target.checked)}
                        className="rounded"
                      />
                      Scene direction
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer sm:col-span-2">
                      <input
                        type="checkbox"
                        checked={preserveBeatFrames}
                        onChange={(e) => setPreserveBeatFrames(e.target.checked)}
                        className="rounded"
                      />
                      Beat frames (start/end storyboard images)
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Preserved items keep their script text, audio, direction, and frame images unchanged through the edit.
                  </p>
                </div>
            </div>
          </div>
        ) : (
          <div className="h-[calc(90vh-200px)] overflow-y-auto overflow-x-hidden max-w-full">
            <div className="mb-4">
              <Button
                variant="outline"
                onClick={() => setShowPreview(false)}
              >
                ← Back to Edit
              </Button>
            </div>

            {showComparison && optimizedScene ? (
              <SceneComparisonPanel
                originalScene={scene}
                optimizedScene={optimizedScene}
                changesSummary={changesSummary}
              />
            ) : (
              <PreviewPanel
                originalScene={scene}
                previewScene={previewScene}
                isGenerating={isGenerating}
                changes={[]}
                deselectedChanges={deselectedChanges}
                onToggleChange={handleToggleChange}
                preserveSceneDirection={preserveSceneDirection}
                preserveBeatFrames={preserveBeatFrames}
              />
            )}
          </div>
        )}

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {changeStatusMessage}
            </span>

            <div className="flex items-center gap-2">
              {!showPreview ? (
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!hasDirection || isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Generate Preview
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={handleApplyChanges}
                  disabled={!canApplyPreview || isGenerating}
                  className="bg-sf-primary"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Apply Changes
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
